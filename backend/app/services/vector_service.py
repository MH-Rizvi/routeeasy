
from __future__ import annotations

from typing import Any, Dict, List

import chromadb  # pyright: ignore[reportMissingImports]
from chromadb.config import Settings as ChromaSettings  # pyright: ignore[reportMissingImports]
from sentence_transformers import SentenceTransformer  # pyright: ignore[reportMissingImports]

from app.config import settings


# Load embedding model once at module import time (local, no API calls).
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# Persistent ChromaDB client. Path is relative to where uvicorn is run (backend/).
chroma_client = chromadb.PersistentClient(
    path=settings.chroma_db_path,
    settings=ChromaSettings(anonymized_telemetry=False),
)


def _get_stops_collection(user_id: str):
    return chroma_client.get_or_create_collection(
        name=f"stops_{user_id}",
        metadata={"hnsw:space": "cosine"},
    )

def _get_trips_collection(user_id: str):
    return chroma_client.get_or_create_collection(
        name=f"trips_{user_id}",
        metadata={"hnsw:space": "cosine"},
    )

def _get_history_collection(user_id: str):
    return chroma_client.get_or_create_collection(
        name=f"history_{user_id}",
        metadata={"hnsw:space": "cosine"},
    )


def delete_user_collections(user_id: str) -> None:
    """Completely delete all vector collections for a user during account deletion."""
    try:
        chroma_client.delete_collection(name=f"stops_{user_id}")
    except Exception:
        pass
    try:
        chroma_client.delete_collection(name=f"trips_{user_id}")
    except Exception:
        pass
    try:
        chroma_client.delete_collection(name=f"history_{user_id}")
    except Exception:
        pass


def embed(text: str) -> List[float]:
    """Return embedding vector for a single text string."""
    return embedding_model.encode(text).tolist()


def add_stop(
    stop_id: int,
    trip_id: int,
    label: str,
    resolved: str,
    lat: float,
    lng: float,
    user_id: str,
) -> str:
    """
    Embed and store a stop.

    Document = resolved address.
    Metadata = { stop_id, trip_id, label, lat, lng }.
    Returns the ChromaDB document ID.
    """
    doc_id = f"stop_{stop_id}"
    text = f"{label} {resolved}"

    _get_stops_collection(user_id).upsert(
        ids=[doc_id],
        embeddings=[embed(text)],
        documents=[resolved],
        metadatas=[
            {
                "stop_id": stop_id,
                "trip_id": trip_id,
                "label": label,
                "lat": lat,
                "lng": lng,
            }
        ],
    )
    return doc_id


def add_trip(trip_id: int, name: str, stops: List[Dict[str, Any]], user_id: str) -> str:
    """
    Embed and store a trip.

    Document = trip name + all stop labels concatenated.
    """
    doc_id = f"trip_{trip_id}"
    stop_labels = " ".join(str(s.get("label", "")) for s in stops)
    document = f"{name} {stop_labels}".strip()

    _get_trips_collection(user_id).upsert(
        ids=[doc_id],
        embeddings=[embed(document)],
        documents=[document],
        metadatas=[
            {
                "trip_id": trip_id,
                "name": name,
                "stop_count": len(stops),
            }
        ],
    )
    return doc_id


def add_history_entry(
    history_id: int,
    trip_id: int | None,
    trip_name: str,
    stops: List[Dict[str, Any]],
    launched_at: str,
    user_id: str,
) -> str:
    """
    Create a natural language summary of a launched trip and embed it for RAG.
    """
    stop_labels = " → ".join(str(s.get("label", "")) for s in stops)
    document = f"On {launched_at}, drove {trip_name}: {stop_labels}".strip()
    doc_id = f"history_{history_id}"

    _get_history_collection(user_id).upsert(
        ids=[doc_id],
        embeddings=[embed(document)],
        documents=[document],
        metadatas=[
            {
                "history_id": history_id,
                "trip_id": trip_id,
                "trip_name": trip_name,
                "launched_at": launched_at,
            }
        ],
    )
    return doc_id


def search_stops(query: str, user_id: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Semantic search over saved stops."""
    results = _get_stops_collection(user_id).query(
        query_embeddings=[embed(query)],
        n_results=top_k,
    )
    return _format_results(results)


def search_trips(query: str, user_id: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Semantic search over saved trips."""
    results = _get_trips_collection(user_id).query(
        query_embeddings=[embed(query)],
        n_results=top_k,
    )
    return _format_results(results)


def search_history(query: str, user_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Semantic search over trip history entries for the RAG pipeline."""
    results = _get_history_collection(user_id).query(
        query_embeddings=[embed(query)],
        n_results=top_k,
    )
    return _format_results(results)


def delete_stop(chroma_id: str, user_id: str) -> None:
    """Delete a stop document from the saved_stops collection."""
    if chroma_id:
        _get_stops_collection(user_id).delete(ids=[chroma_id])


def delete_trip(chroma_id: str, user_id: str) -> None:
    """Delete a trip document from the saved_trips collection."""
    if chroma_id:
        _get_trips_collection(user_id).delete(ids=[chroma_id])


def delete_history_entry(chroma_id: str, user_id: str) -> None:
    """Delete a history document from the trip_history collection."""
    if chroma_id:
        _get_history_collection(user_id).delete(ids=[chroma_id])


def clear_history(user_id: str) -> None:
    """Delete all history documents."""
    collection = _get_history_collection(user_id)
    results = collection.get()
    if results and results.get("ids"):
        collection.delete(ids=results["ids"])


def _format_results(chroma_results: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Convert ChromaDB query results into a list of dicts with similarity scores.

    Chroma returns cosine distances (lower = more similar).
    We convert to similarity via: similarity = 1 - distance.
    """
    if not chroma_results.get("ids"):
        return []

    formatted: List[Dict[str, Any]] = []
    ids = chroma_results.get("ids", [[]])[0]
    documents = chroma_results.get("documents", [[]])[0]
    metadatas = chroma_results.get("metadatas", [[]])[0]
    distances = chroma_results.get("distances", [[]])[0]

    for idx, doc_id in enumerate(ids):
        distance = distances[idx] if idx < len(distances) else None
        similarity: float | None = None
        if distance is not None:
            similarity = 1 - float(distance)

        formatted.append(
            {
                "id": doc_id,
                "document": documents[idx] if idx < len(documents) else None,
                "metadata": metadatas[idx] if idx < len(metadatas) else None,
                "similarity": similarity,
            }
        )

    return formatted


