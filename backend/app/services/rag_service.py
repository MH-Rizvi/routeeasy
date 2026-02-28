
from __future__ import annotations

import logging
import time
from typing import Any, Dict

from app.config import settings
from app.database import SessionLocal
from app import models
from app.services.vector_service import history_collection, embed
from app.services.groq_client import groq_rotator


logger = logging.getLogger(__name__)


RAG_SYSTEM_PROMPT_v1 = """
You are a helpful assistant answering questions about a bus driver's trip history.
You will be given retrieved trip history records as context.
Answer ONLY based on what is in the context. If the context doesn't contain the answer, say so clearly.
Be brief and direct — the driver is busy.
""".strip()


async def answer_history_question(question: str) -> Dict[str, Any]:
    """
    Full RAG pipeline:
    1. Embed the question with the same model used for trip history.
    2. Query ChromaDB history_collection for top-k relevant entries.
    3. Format context and call Groq for a grounded answer.
    4. Log the LLM call to llm_logs table.
    5. Return { answer, sources_used }.
    """

    # Step 1: Embed the question
    question_embedding = embed(question)

    # Step 2: Retrieve top-k relevant history entries from ChromaDB
    results = history_collection.query(
        query_embeddings=[question_embedding],
        n_results=5,
    )

    documents = results.get("documents", [[]])[0]

    if not documents:
        return {
            "answer": "I don't have any trip history to answer that question yet.",
            "sources_used": 0,
        }

    # Step 3: Format retrieved context
    context_lines = [f"- {doc}" for doc in documents]
    context = "\n".join(context_lines)

    # Step 4: Generate grounded answer via Groq (with key rotation)
    start_time = time.time()
    error_message = None

    try:
        response = await groq_rotator.async_chat_completion(
            model="llama-3.3-70b-versatile",
            max_tokens=300,
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT_v1},
                {
                    "role": "user",
                    "content": f"Context (trip history):\n{context}\n\nQuestion: {question}",
                },
            ],
        )
        answer = response.choices[0].message.content
        success = True
        usage = getattr(response, "usage", None)
        input_tokens = getattr(usage, "prompt_tokens", None) if usage else None
        output_tokens = getattr(usage, "completion_tokens", None) if usage else None
    except Exception as exc:
        logger.error("RAG Groq call failed: %s", exc)
        answer = "Sorry, I couldn't process that question right now. Please try again."
        success = False
        error_message = str(exc)
        input_tokens = None
        output_tokens = None

    latency_ms = int((time.time() - start_time) * 1000)

    # Step 5: Log the RAG LLM call to llm_logs (manual log since not going through agent)
    db = SessionLocal()
    try:
        log = models.LLMLog(
            model="llama-3.3-70b-versatile",
            prompt_version="rag_v1",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            success=success,
            error_message=error_message,
            run_id=None,
        )
        db.add(log)
        db.commit()
    except Exception as exc:
        logger.error("Failed to persist RAG LLM log: %s", exc)
        db.rollback()
    finally:
        db.close()

    return {
        "answer": answer,
        "sources_used": len(documents),
    }
