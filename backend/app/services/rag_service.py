
from __future__ import annotations

import logging
import time
from typing import Any, Dict

from app.config import settings
from app.database import SessionLocal
from app import models
from app.services.vector_service import _get_history_collection, _get_trips_collection, embed
from app.services.groq_client import groq_rotator


logger = logging.getLogger(__name__)


RAG_SYSTEM_PROMPT_v1 = """
You are a helpful AI assistant for the driver mapping app RoutAura.
You answer the driver's questions based ONLY on the context provided.
The context includes their past trip history, currently saved routes, and overall driving statistics.
If the context does not contain the answer or you don't know, say so clearly.
Keep your answers conversational, friendly, and helpful. Aim for 1-3 short sentences.
""".strip()


async def answer_history_question(question: str, user_id: str) -> Dict[str, Any]:
    """
    Full RAG pipeline:
    1. Embed the question with the same model used for trip history.
    2. Query ChromaDB history_collection for top-k relevant entries.
    3. Format context and call Groq for a grounded answer.
    4. Log the LLM call to llm_logs table.
    5. Return { answer, sources_used }.
    """
    logger.info("RAG query | user_id=%s | question=%s", user_id, question[:80])

    # Step 1: Embed the question
    question_embedding = embed(question)

    # Step 2: Retrieve top-k relevant history entries and saved trips from ChromaDB
    hist_collection = _get_history_collection(user_id)
    hist_count = hist_collection.count()
    logger.info("RAG | collection=%s | doc_count=%d", hist_collection.name, hist_count)

    if hist_count > 0:
        hist_results = hist_collection.query(
            query_embeddings=[question_embedding],
            n_results=min(4, hist_count),
        )
        hist_docs = hist_results.get("documents", [[]])[0]
        logger.info("RAG | history docs returned: %s", hist_docs)
    else:
        hist_docs = []

    trips_collection = _get_trips_collection(user_id)
    trips_count = trips_collection.count()
    logger.info("RAG | trips collection=%s | doc_count=%d", trips_collection.name, trips_count)

    if trips_count > 0:
        trips_results = trips_collection.query(
            query_embeddings=[question_embedding],
            n_results=min(4, trips_count),
        )
        trip_docs = trips_results.get("documents", [[]])[0]
        logger.info("RAG | trip docs returned: %s", trip_docs)
    else:
        trip_docs = []

    # Step 3: Fetch Quick Overall Stats from SQL (source of truth)
    db = SessionLocal()
    try:
        histories = db.query(models.TripHistory).filter(models.TripHistory.user_id == user_id).all()
        total_trips = len(histories)
        total_miles = sum(h.total_miles or 0.0 for h in histories)

        saved_trips_count = db.query(models.Trip).filter(models.Trip.user_id == user_id).count()
    except Exception as exc:
        logger.error("Failed to fetch stats for RAG: %s", exc)
        total_trips = 0
        total_miles = 0.0
        saved_trips_count = 0
    finally:
        db.close()

    logger.info("RAG | SQL truth: total_trips=%d, saved_trips=%d", total_trips, saved_trips_count)

    # CRITICAL: If SQL has no data for this user, ChromaDB data is stale — ignore it.
    # The SQL database is the source of truth. ChromaDB may contain orphaned vectors
    # from a previous database wipe that was not synced to vector store.
    if total_trips == 0 and saved_trips_count == 0:
        # Purge stale ChromaDB data if any exists
        if hist_count > 0:
            logger.warning("RAG | Purging %d stale history vectors for user_id=%d", hist_count, user_id)
            all_ids = hist_collection.get()["ids"]
            if all_ids:
                hist_collection.delete(ids=all_ids)
        if trips_count > 0:
            logger.warning("RAG | Purging %d stale trip vectors for user_id=%d", trips_count, user_id)
            all_ids = trips_collection.get()["ids"]
            if all_ids:
                trips_collection.delete(ids=all_ids)

        return {
            "answer": "You haven't completed any trips yet. Once you save and launch routes, I'll be able to answer questions about your driving history!",
            "sources_used": 0,
        }

    if not hist_docs and not trip_docs and total_trips == 0:
        return {
            "answer": "I don't have any saved routes or trip history to answer that question yet.",
            "sources_used": 0,
        }

    # Step 4: Format and truncate retrieved context
    context_lines = [f"Driver Stats: Total Lifetime Trips: {total_trips}, Total Lifetime Miles: {total_miles:.2f}"]
    if trip_docs:
        context_lines.append("\nRelevant Saved Routes:")
        context_lines.extend([f"- {doc[:200]}" for doc in trip_docs])
    if hist_docs:
        context_lines.append("\nRelevant Past Driven Trip History:")
        context_lines.extend([f"- {doc[:200]}" for doc in hist_docs])

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
            user_id=user_id,
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
        "sources_used": len(hist_docs) + len(trip_docs),
    }
