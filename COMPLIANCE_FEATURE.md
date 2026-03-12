# COMPLIANCE_FEATURE.md
## CDL Compliance Assistant — Full Technical Specification
### RoutAura v2.0 — Agentic AI Edition

---

## Overview

A RAG-powered conversational compliance assistant embedded in the RoutAura agent. Professional drivers ask plain-English questions about CDL rules, hours of service, vehicle inspections, railroad crossings, school bus protocols, and emergency procedures. The agent retrieves answers grounded in official regulatory documents and returns cited, accurate responses.

**This feature must never hallucinate safety-critical information.** If the answer is not in the documents, the system explicitly says so.

---

## Example Conversations

**Railroad Crossing Protocol**
> **Driver:** "What's the protocol when approaching a railroad crossing with passengers?"
>
> **Agent:** "According to the NY CDL Manual, Chapter 9, you must stop between 15–50 feet before the nearest rail, turn off all noisy equipment, open the door and window, listen and look in both directions before proceeding. Never shift gears while crossing the tracks."
>
> *📚 Source: NY CDL Manual — Railroad Crossings, p.109*

**Hours of Service**
> **Driver:** "How many hours can I drive before I need a break?"
>
> **Agent:** "Regarding driving limits, under federal HOS rules, you may drive a maximum of 11 hours after 10 consecutive hours off duty. New York follows federal regulations for CMV operators with no additional state restrictions."
>
> *📚 Source: NY CDL Manual — Hours of Service, p.43*

**Air Brake Inspection**
> **Driver:** "What do I check on air brakes during pre-trip inspection?"
>
> **Agent:** "When inspecting your air brakes, you must check: air pressure build-up rate, low air warning signal, spring brakes, air leakage rate, brake pedal travel, and parking brake."
>
> *📚 Source: NY CDL Manual — Air Brakes, p.76*

---

## Why RAG — Not SQL

| Problem | Why SQL Fails | Why RAG Works |
|---|---|---|
| Unstructured PDF content | No columns to query against | Handles raw regulatory paragraphs natively |
| Semantic queries ("what do I check on air brakes?") | `ILIKE '%air brakes%'` misses meaning | Understands "check" = "inspect", finds related sections |
| Answers require surrounding context | Returns isolated rows | Retrieves full chunks with context preserved |
| Safety-critical hallucination prevention | Cannot enforce "I don't know" | Similarity threshold enables honest refusals |

---

## Vector Storage — pgvector on Supabase

**No ChromaDB. No Pinecone. No separate vector database.**

Compliance chunks are stored directly in Supabase PostgreSQL using the `pgvector` extension — the same database already used for trips, stops, auth, and history.

**Why pgvector over ChromaDB:**
- No ephemeral filesystem issues on Railway — data persists across every deploy
- No startup sync logic needed — SQL and vectors live in the same database
- No separate service, no extra dependency, no extra memory overhead
- Account deletion cascade is automatic via `ON DELETE CASCADE`

**Why pgvector over Pinecone:**
- Already on Supabase — zero new API keys, zero new billing
- Compliance docs are ingested once, queried read-only — Pinecone's scale is irrelevant here
- One consolidated database is a more mature engineering decision

**pgvector extension:** Already enabled on Supabase dashboard.

---

## Tech Stack (No New Dependencies Except pypdf)

| Component | Technology | Notes |
|---|---|---|
| Vector storage | pgvector on Supabase PostgreSQL | Same DB already in use |
| Embeddings | `fastembed` `BAAI/bge-small-en-v1.5` | Same model already in `vector_service.py` |
| PDF loading | `pypdf` | Lightweight, no LangChain loader needed |
| Text splitting | `langchain.text_splitter.RecursiveCharacterTextSplitter` | Already in requirements |
| LLM | `groq_rotator.async_chat_completion` | Same pattern as `rag_service.py` |
| DB session | `SessionLocal()` | Same pattern used throughout codebase |

**Add to `requirements.txt`:** `pypdf`

---

## Document Sources

Documents are stored in `backend/documents/` and committed to the repo.

| File | Jurisdiction | Coverage |
|---|---|---|
| `ny_cdl_manual.pdf` (multiple section PDFs) | `NY` | CDL rules, HOS, inspections, railroad crossings |
| `ny_article_19a_guide.pdf` | `NY` | School bus protocols, Article 19-A |
| `ny_driver_manual.pdf` | `NY` | General driving rules, emergencies |

**Jurisdiction values stored in metadata:**
- `"NY"` — NY-specific documents (current ingestion)
- `"TX"`, `"CA"`, `"FL"` — added later, same ingestion script, different jurisdiction value

---

## Database Schema

### Migration file: `backend/migrations/002_pgvector.sql`

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

-- For future history RAG migration (pgvector replaces ChromaDB for history too)
CREATE TABLE IF NOT EXISTS trip_history_vectors (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  trip_history_id INTEGER REFERENCES trip_history(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  embedding       vector(384)
);

CREATE INDEX IF NOT EXISTS trip_history_vectors_embedding_idx
ON trip_history_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Compliance chunks table (used immediately)
CREATE TABLE IF NOT EXISTS compliance_chunks (
  id           SERIAL PRIMARY KEY,
  content      TEXT NOT NULL,
  embedding    vector(384),
  jurisdiction VARCHAR(20),   -- 'NY', 'TX', 'CA', 'FL', 'federal', 'all'
  source       VARCHAR(200),  -- e.g. 'NY CDL Manual'
  chapter      VARCHAR(200),  -- e.g. 'Air Brakes'
  section      VARCHAR(100),  -- e.g. 'Section 4'
  page         INTEGER,
  doc_type     VARCHAR(50),   -- 'manual'
  state        VARCHAR(10)    -- state code or 'all'
);

CREATE INDEX IF NOT EXISTS compliance_chunks_embedding_idx
ON compliance_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;
```

**Run this manually in Supabase Dashboard → SQL Editor before any code is deployed.**

---

## SQLAlchemy Model

Add to `backend/app/models.py`:

```python
class ComplianceChunk(Base):
    __tablename__ = "compliance_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[str | None] = mapped_column(Text, nullable=True)  # stored as text, cast in raw SQL
    jurisdiction: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    chapter: Mapped[str | None] = mapped_column(String(200), nullable=True)
    section: Mapped[str | None] = mapped_column(String(100), nullable=True)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    doc_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    state: Mapped[str | None] = mapped_column(String(10), nullable=True)
```

**Note:** `embedding` is stored as `Text` in SQLAlchemy because SQLAlchemy does not natively understand `vector(384)`. The actual column type in Postgres is `vector(384)` (created by the SQL migration). All vector queries use `db.execute(text(...))` with raw SQL — never through the ORM.

---

## New File: `backend/app/services/compliance_service.py`

### Functions

**`ingest_document(file_path, jurisdiction, source, doc_type, db)`**
- Loads PDF using `pypdf`
- Splits into chunks using `RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)`
- Embeds each chunk using `embed()` from `vector_service.py`
- Bulk inserts into `compliance_chunks` table via SQLAlchemy
- Extracts page numbers from pypdf metadata per chunk

**`query_compliance(question, user_state, db, top_k=5)`**
- Embeds question using `embed()` from `vector_service.py`
- Queries `compliance_chunks` with pgvector cosine similarity
- Filters by `jurisdiction IN ('NY', :state)` — adjust based on ingested docs
- Checks best similarity score against threshold (0.65)
- Returns formatted context string with citations, or refusal message

### Full Implementation

```python
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
                (:content, :embedding::vector, :jurisdiction, :source, :chapter, :section, :page, :doc_type, :state)
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
                1 - (embedding <=> :embedding::vector) AS similarity
            FROM compliance_chunks
            WHERE jurisdiction IN ('federal', 'all', :state)
            ORDER BY embedding <=> :embedding::vector
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
        context_blocks.append(f"📚 Source: {citation}\n{row.content}")

    return "\n\n".join(context_blocks)
```

---

## New File: `backend/app/routers/compliance.py`

```python
from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.compliance_service import ingest_document, query_compliance

router = APIRouter(prefix="/compliance", tags=["compliance"])
logger = logging.getLogger(__name__)

DOCUMENTS_BASE_PATH = os.getenv("DOCUMENTS_PATH", "./documents")

DOCUMENT_MANIFEST = [
    {
        "filename": "ny_driver_manual.pdf",
        "jurisdiction": "NY",
        "source": "NY Driver Manual",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec02.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — Driving Safely",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec03.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — Transporting Cargo",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec04.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — Air Brakes",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec05.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — Combination Vehicles",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec06.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — Doubles and Triples",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec09.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — Pre-Trip Inspection",
        "doc_type": "manual",
    },
    {
        "filename": "cdl10sec10.pdf",
        "jurisdiction": "NY",
        "source": "NY CDL Manual — School Bus",
        "doc_type": "manual",
    },
    {
        "filename": "cdl15.pdf",
        "jurisdiction": "NY",
        "source": "NY Article 19-A Guide",
        "doc_type": "manual",
    },
]


@router.post("/ingest")
async def ingest_all_documents(db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Admin endpoint — ingests all documents in DOCUMENT_MANIFEST into compliance_chunks.
    Idempotent — skips documents already ingested.
    """
    results = []
    errors = []

    for doc in DOCUMENT_MANIFEST:
        file_path = os.path.join(DOCUMENTS_BASE_PATH, doc["filename"])
        try:
            result = ingest_document(
                file_path=file_path,
                jurisdiction=doc["jurisdiction"],
                source=doc["source"],
                doc_type=doc["doc_type"],
                db=db,
            )
            results.append(result)
            logger.info("Ingested: %s", doc["source"])
        except FileNotFoundError:
            error_msg = f"File not found: {file_path}"
            logger.warning(error_msg)
            errors.append(error_msg)
        except Exception as exc:
            error_msg = f"Failed to ingest {doc['source']}: {str(exc)}"
            logger.error(error_msg)
            errors.append(error_msg)

    total_inserted = sum(r.get("inserted", 0) for r in results)
    total_skipped = sum(1 for r in results if r.get("skipped"))

    return {
        "status": "complete",
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "results": results,
        "errors": errors,
    }


@router.get("/query")
async def query_compliance_endpoint(
    question: str,
    state: str = "NY",
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Test endpoint — query compliance docs directly without going through the agent.
    """
    answer = query_compliance(question=question, user_state=state, db=db)
    return {"question": question, "state": state, "answer": answer}


@router.get("/status")
async def compliance_status(db: Session = Depends(get_db)) -> dict[str, Any]:
    """
    Returns how many chunks are ingested per source — useful for verifying ingestion.
    """
    from sqlalchemy import text
    rows = db.execute(
        text("SELECT source, jurisdiction, COUNT(*) as chunk_count FROM compliance_chunks GROUP BY source, jurisdiction ORDER BY source")
    ).fetchall()

    return {
        "total_chunks": sum(r.chunk_count for r in rows),
        "breakdown": [
            {"source": r.source, "jurisdiction": r.jurisdiction, "chunks": r.chunk_count}
            for r in rows
        ]
    }
```

---

## Modified File: `backend/app/agent/tools.py`

Add this tool at the bottom of the existing `tools.py`. Do not modify any existing tools.

```python
@tool("check_compliance")
def check_compliance_tool(question: str) -> str:
    """
    Use this tool for ANY question about CDL rules, driving regulations,
    hours of service, vehicle inspections, pre-trip inspection, railroad crossings,
    school bus protocols, Article 19-A, emergency procedures, or any safety or
    legal question related to professional driving.
    
    ALWAYS call this tool before answering compliance questions.
    NEVER answer compliance questions from memory.
    
    Input: the driver's compliance question as a plain string.
    Output: grounded answer with source citations, or a message saying it cannot be found.
    """
    from app.database import SessionLocal
    from app.services.compliance_service import query_compliance

    user_id = user_id_ctx.get()
    db = SessionLocal()
    try:
        # Get user's state from profile for jurisdiction filtering
        from sqlalchemy import text
        row = db.execute(
            text("SELECT state FROM user_profiles WHERE user_id = :uid"),
            {"uid": user_id}
        ).fetchone()
        user_state = row.state if row else "NY"

        return query_compliance(
            question=question,
            user_state=user_state,
            db=db,
        )
    finally:
        db.close()
```

---

## Modified File: `backend/app/agent/prompts.py`

Add this block to the agent system prompt rules section:

```
COMPLIANCE QUESTIONS:
If the user asks about ANY of the following topics, you MUST call check_compliance before answering.
Never answer these from memory — always retrieve from the official manuals:
- CDL rules or requirements
- Hours of service or driving time limits
- Pre-trip or vehicle inspection procedures
- Air brakes or brake systems
- Railroad crossing procedures
- School bus protocols or Article 19-A
- Emergency procedures
- Cargo securement rules
- Any safety or legal question about professional driving

If check_compliance returns "I cannot find a specific answer", relay that message
honestly. Do NOT attempt to answer from memory as a fallback.

You MUST follow these response formatting rules for compliance answers:
1. Vary your opening phrase (e.g., "For air brakes, you must...", "Regarding driving limits..."). Do NOT start every answer with the driver's name.
2. ALWAYS end your answer with the citation provided in the context, formatted exactly like this: `📚 Source: [citation here]`.
```

### PRE-ANSWER COMPLIANCE GATE

The prompt was additionally hardened by placing a direct gate order above the JSON generation output format instructing the agent to never answer compliance queries without executing a tool call first.

---

## Modified File: `backend/app/main.py`

Add compliance router registration. Add these two lines in the imports and router registration sections:

```python
# In imports section — add:
from app.routers import compliance

# In router registration section — add:
app.include_router(compliance.router, prefix="/api/v1")
```

---

## Modified File: `backend/app/config.py`

Add one field to the `Settings` class:

```python
documents_path: str = Field(
    default="./documents",
    env="DOCUMENTS_PATH",
)
```

Add to `.env`:
```
DOCUMENTS_PATH=./documents
```

---

## Implementation Order

**Do these steps strictly in order. Verify each step before moving to the next.**

```
Step 1 — Run 002_pgvector.sql in Supabase SQL Editor
         Verify: compliance_chunks table exists in Supabase dashboard

Step 2 — Add ComplianceChunk model to models.py
         Verify: no import errors

Step 3 — Create compliance_service.py
         Verify: can import without errors

Step 4 — Create compliance router
         Verify: server starts, /api/v1/compliance/status returns 200

Step 5 — Register compliance router in main.py + add DOCUMENTS_PATH to config
         Verify: GET /api/v1/compliance/status returns {"total_chunks": 0}

Step 6 — Run ingestion: POST /api/v1/compliance/ingest
         Verify: GET /api/v1/compliance/status shows chunks > 0 per source

Step 7 — Test raw query: GET /api/v1/compliance/query?question=air+brakes&state=NY
         Verify: returns relevant content, not "Cannot find in manual"

Step 8 — Add check_compliance_tool to tools.py
         Verify: server starts, tool appears in agent tool list

Step 9 — Update prompts.py with compliance rules
         Verify: ask agent "what do I check on air brakes" → agent calls check_compliance tool

Step 10 — End to end test in chat UI
          Ask: "What's the railroad crossing protocol?"
          Ask: "How many hours can I drive before a break?"
          Ask: "What do I check on air brakes?"
          Verify: all return cited answers, not hallucinations
```

---

## Interview Talking Points

**Simple version:**
> "I built a RAG-powered compliance assistant embedded in the RoutAura agent. Drivers ask plain-English questions and get cited answers grounded in official NY CDL manuals and regulatory documents."

**Technical version:**
> "I implemented a multi-jurisdiction RAG knowledge base using pgvector on Supabase — consolidating vector and relational storage into a single managed database rather than running a separate vector store like ChromaDB or Pinecone. NY CDL manuals are chunked with RecursiveCharacterTextSplitter at 512 tokens with 50-token overlap to preserve regulatory context, embedded with fastembed BAAI/bge-small-en-v1.5 into 384-dimension vectors, and stored with jurisdiction metadata. The ReAct agent reads the user's state from their profile, filters compliance chunks using a SQL IN clause combining jurisdiction tiers, and applies a 0.70 cosine similarity threshold — refusing to answer rather than hallucinate safety-critical information. Each answer is grounded with source and page citations from the official document."

---

## Adding More States Later

The architecture is already multi-state. To add TX, CA, or FL:

1. Download the state CDL manual PDF
2. Add an entry to `DOCUMENT_MANIFEST` in `compliance.py` with `"jurisdiction": "TX"`
3. Hit `POST /api/v1/compliance/ingest`
4. Done — the query filter `jurisdiction IN ('federal', 'all', :state)` handles it automatically