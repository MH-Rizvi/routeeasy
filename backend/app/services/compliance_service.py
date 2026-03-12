from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import pypdf
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.services.vector_service import embed

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.65

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ".", " "],
)


def ingest_document(
    file_path: str,
    jurisdiction: str,
    source: str,
    doc_type: str,
    db: Session,
) -> dict[str, Any]:
    """
    Load a PDF, chunk it, embed each chunk, and store in compliance_chunks.
    Skips ingestion if chunks from this source already exist (idempotent).
    """
    # Idempotency check — don't re-ingest same document
    existing = db.execute(
        text("SELECT COUNT(*) FROM compliance_chunks WHERE source = :source AND jurisdiction = :jurisdiction"),
        {"source": source, "jurisdiction": jurisdiction}
    ).scalar()

    if existing and existing > 0:
        logger.info("ingest_document | Skipping %s — %d chunks already exist", source, existing)
        return {"skipped": True, "existing_chunks": existing, "source": source}

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")

    logger.info("ingest_document | Loading %s", file_path)

    # Extract text per page using pypdf
    reader = pypdf.PdfReader(str(path))
    page_texts = []
    for page_num, page in enumerate(reader.pages, start=1):
        text_content = page.extract_text() or ""
        if text_content.strip():
            page_texts.append((page_num, text_content))

    logger.info("ingest_document | Extracted %d pages from %s", len(page_texts), source)

    # Chunk and embed
    rows_to_insert = []
    for page_num, page_text in page_texts:
        chunks = splitter.split_text(page_text)
        for chunk in chunks:
            if not chunk.strip():
                continue
            embedding = embed(chunk)
            rows_to_insert.append({
                "content": chunk,
                "embedding": str(embedding),
                "jurisdiction": jurisdiction,
                "source": source,
                "chapter": None,
                "section": None,
                "page": page_num,
                "doc_type": doc_type,
                "state": jurisdiction if jurisdiction not in ("federal", "all") else "all",
            })

    if not rows_to_insert:
        logger.warning("ingest_document | No chunks extracted from %s", source)
        return {"inserted": 0, "source": source}

    # Bulk insert
    db.execute(
        text("""
            INSERT INTO compliance_chunks
                (content, embedding, jurisdiction, source, chapter, section, page, doc_type, state)
            VALUES
                (:content, CAST(:embedding AS vector), :jurisdiction, :source, :chapter, :section, :page, :doc_type, :state)
        """),
        rows_to_insert,
    )
    db.commit()

    logger.info("ingest_document | Inserted %d chunks from %s", len(rows_to_insert), source)
    return {"inserted": len(rows_to_insert), "source": source}


def query_compliance(question: str, user_state: str, db: Session, top_k: int = 5) -> str:
    """
    Embed the question, search compliance_chunks with pgvector cosine similarity,
    apply confidence threshold, return formatted context string with citations.
    If confidence is too low, return a safe refusal message.
    """
    question_embedding = embed(question)

    # Normalize state to uppercase
    state = (user_state or "NY").upper()

    results = db.execute(
        text("""
            SELECT
                content,
                source,
                chapter,
                section,
                page,
                1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM compliance_chunks
            WHERE jurisdiction IN ('federal', 'all', :state)
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """),
        {
            "embedding": str(question_embedding),
            "state": state,
            "top_k": top_k,
        }
    ).fetchall()

    if not results:
        return (
            "I cannot find a specific answer to this in the official manuals. "
            "Please consult your supervisor or the official CDL manual directly."
        )

    best_similarity = float(results[0].similarity) if results[0].similarity is not None else 0.0

    logger.info("query_compliance | best_similarity=%.3f | question=%s", best_similarity, question[:60])

    if best_similarity < SIMILARITY_THRESHOLD:
        return (
            "I cannot find a specific answer to this in the official manuals. "
            "Please consult your supervisor or the official CDL manual directly."
        )

    context_blocks = []
    for row in results:
        citation_parts = [row.source]
        if row.chapter:
            citation_parts.append(row.chapter)
        if row.section:
            citation_parts.append(f"§{row.section}")
        if row.page:
            citation_parts.append(f"p.{row.page}")
        citation = " — ".join(citation_parts)
        context_blocks.append(f"[{citation}]\n{row.content}")

    context_str = "\n\n".join(context_blocks)
    return f"Here is what the official CDL manual says. Use this to answer the driver's question directly and concisely:\n\n{context_str}"
