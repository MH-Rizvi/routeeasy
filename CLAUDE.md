# CLAUDE.md — RoutAura v2.0
## Context File for AI Coding Agents (Claude Code, Cursor, etc.)

---

## What This Project Is

**RoutAura** is a Progressive Web App for bus and professional drivers. Drivers describe their routes in plain conversational language, a **LangChain ReAct agent** orchestrates the AI logic (geocoding, vector search, semantic recall), and the app launches navigation in Google Maps or Apple Maps. Trips are saved to both SQLite and ChromaDB for structured retrieval and semantic fuzzy recall.

This project is simultaneously a **useful real-world app** and a **portfolio showcase** for GenAI / Agentic AI engineering roles. Every architectural decision is intentional and maps to skills in the target job descriptions (LangChain, ChromaDB, RAG, LLMOps, Responsible AI).

**Primary end user:** A non-technical school bus driver in his 50s. UI must be extremely simple, large-text, and mobile-first.  
**Portfolio audience:** Engineering hiring managers evaluating GenAI / Agentic AI skills.

---

## Project Structure

```
RoutAura/
├── frontend/          # React 18 + Vite + Tailwind CSS PWA
├── backend/           # FastAPI + Python (LangChain agent + all AI services)
├── PRD.md
├── TECHNICAL_SPEC.md
├── PROJECT_PLAN.md
└── CLAUDE.md          # This file
```

Always read `TECHNICAL_SPEC.md` before creating new files. It contains the authoritative database schema, API contract, agent architecture, and folder structure. Always check `PROJECT_PLAN.md` for the current task and tick off completed tasks.

---

## Architecture — Non-Negotiable Decisions

These decisions must not be changed without explicit user instruction:

**1. LangChain ReAct Agent is the core AI layer.**  
Do NOT call the Groq API directly for trip parsing. ALL AI orchestration goes through the LangChain `AgentExecutor` in `backend/app/agent/core.py`. The agent decides which tools to call. This is the most important architectural decision in the project.

**2. ChromaDB + fastembed for all vector operations.**  
Do NOT use OpenAI embeddings (costs money per call). Use `BAAI/bge-small-en-v1.5` from `fastembed` — it runs locally via ONNX runtime with zero API cost and low RAM requirements. Do NOT use Pinecone or any hosted vector DB for V1 — ChromaDB persists to disk locally.

**3. Hybrid storage: SQLite for structured data, ChromaDB for semantic data.**  
Every trip and stop is stored in BOTH databases. SQLite holds the authoritative structured record (IDs, coordinates, timestamps). ChromaDB holds the embeddings for semantic search. The `chroma_id` field on SQLite records links the two. When deleting, always delete from both.

**4. No custom navigation.**  
We do NOT build turn-by-turn navigation. We build Google Maps / Apple Maps deep link URLs and open them with `window.open()`. The navigation happens entirely in external apps.

**5. Moderation before agent.**  
Every user message must pass through `moderation_service.is_safe()` before reaching the agent. This is non-negotiable — it's part of the responsible AI showcase.

**6. Every LLM call must be logged.**  
The `LLMOpsCallbackHandler` is always attached to the `AgentExecutor`. RAG pipeline calls must also be logged. The `llm_logs` table must have a row for every LLM call made by the system.

**7. User authentication and data isolation is required (Phase 17+).**  
All users must sign up/login. JWTs use a 30m access/7d refresh format and are stored in memory, not localStorage. All SQLite queries and ChromaDB collections (`saved_trips_{user_id}`, etc.) must be dynamically scoped/namespaced to the logged-in user.

**8. Public Landing Page vs Authenticated App.**  
The root route `/` is a public marketing Landing Page. The authenticated app begins at `/home` (and includes `/chat`, `/trips`, etc). Logged-in users visiting `/` are redirected to `/home`. 
A special unauthenticated demo endpoint (`POST /api/v1/agent/demo-chat`) allows visitors to try the AI chat from the Landing Page with strict rate limiting and save-gating (users must sign up to save).

---

## Code Style

### General
- Clarity over cleverness. Write code a junior engineer can understand.
- Comment above any non-obvious business logic block.
- Functions over 40 lines should be split.
- Meaningful names: `resolvedStops` not `rs`, `tripId` not `id2`.

### Python (Backend)
- Python 3.11+, PEP 8 throughout.
- Type hints on every function signature.
- Pydantic models for all request/response shapes — never raw dicts in API layer.
- `async def` for all FastAPI route handlers.
- Business logic lives in `services/` — route handlers only call services, never contain logic directly.
- Catch specific exceptions, not bare `except:`.
- Use `logging.getLogger(__name__)` at top of every service file.

**Route handler pattern (always follow this):**
```python
@router.post("/agent/chat", response_model=AgentChatResponse)
async def chat(request: AgentChatRequest, db: Session = Depends(get_db)):
    if not moderation_service.is_safe(request.message):
        raise HTTPException(status_code=400, detail="Message not related to route planning.")
    result = await agent_service.run_agent(request.message, request.conversation_history, db)
    return AgentChatResponse(**result)
```

**Service function pattern:**
```python
# services/trips_service.py
async def create_trip(db: Session, trip_data: TripCreate) -> Trip:
    # 1. Write to SQLite
    db_trip = models.Trip(name=trip_data.name, notes=trip_data.notes)
    db.add(db_trip)
    db.flush()  # Get ID before committing
    
    # 2. Write stops to SQLite
    for stop_data in trip_data.stops:
        db_stop = models.Stop(trip_id=db_trip.id, **stop_data.dict())
        db.add(db_stop)
        db.flush()
        
        # 3. Write each stop to ChromaDB
        chroma_id = vector_service.add_stop(db_stop.id, db_trip.id, ...)
        db_stop.chroma_id = chroma_id
    
    # 4. Write trip to ChromaDB
    chroma_id = vector_service.add_trip(db_trip.id, trip_data.name, trip_data.stops)
    db_trip.chroma_id = chroma_id
    
    db.commit()
    db.refresh(db_trip)
    return db_trip
```

### JavaScript / React (Frontend)
- Functional components with hooks only — no class components.
- `const` by default, `let` only when reassignment is needed.
- `async/await` not `.then()` chains.
- One component per file. PascalCase for components (`TripCard.jsx`), camelCase for utilities (`mapsLinks.js`).
- All API calls go through `src/api/client.js` — never call `fetch()` or `axios` directly in components.
- Zustand for shared state, local `useState` for component-only state.
- Always handle loading AND error states in every component that makes an API call.

**Async component pattern (always follow this):**
```jsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

const handleAction = async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await api.someCall();
    setData(result);
  } catch (err) {
    setError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

---

## UI / Design Rules (Non-Negotiable)

The primary user is a non-technical older driver using a phone in a hurry. These rules exist for that reason:

1. **Minimum touch target: 48x48px** on all tappable elements.
2. **Minimum font size: 16px** for body text. Important labels and buttons: 18–20px.
3. **High contrast** — dark text on light bg or white text on coloured buttons.
4. **Bottom tab bar** for main navigation — never a sidebar or hamburger menu.
5. **Maximum one modal open at a time.**
6. **Minimum 16px padding** on all content edges.
7. **Always show a loading spinner or disabled state** on any button that triggers async work.
8. **Error messages in plain English** — never show raw error objects, stack traces, or technical language.

**Colour palette:**
```
Primary blue:     #2563EB  (Tailwind blue-600)
Success green:    #16A34A  (Tailwind green-600)
Danger red:       #DC2626  (Tailwind red-600)
Background:       #F9FAFB  (Tailwind gray-50)
Card background:  #FFFFFF
Body text:        #111827  (Tailwind gray-900)
Secondary text:   #6B7280  (Tailwind gray-500)
```

**The LLM Logs screen and semantic search similarity scores** should be shown prominently — these demonstrate the agentic AI and LLMOps capabilities to interviewers. Don't hide them.

---

## LangChain Agent — Important Implementation Notes

**Tool inputs must be strings.** LangChain ReAct agents pass tool inputs as strings from the LLM output. Parse them appropriately in each tool function.

**Max iterations:** Set `max_iterations=8` on `AgentExecutor`. This prevents infinite loops while allowing enough steps for multi-tool chains.

**Conversation history format for LangChain:**
```python
from langchain.schema import HumanMessage, AIMessage

def format_history(raw_history: list[dict]) -> list:
    messages = []
    for msg in raw_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    return messages
```

**Handle parsing errors gracefully:** Always set `handle_parsing_errors=True` on `AgentExecutor`. When the LLM produces malformed output, this prevents a crash and retries.

**Structured output from agent:** After the agent returns its final answer, parse the stop list from the response using a secondary Groq call with a strict JSON prompt, or use output parsers. Do not rely on regex to extract stop lists from the agent's natural language response.

---

## ChromaDB — Important Implementation Notes

**Chroma persistent client path:** Always use `./chroma_db` as the path, relative to where uvicorn is run (the `backend/` directory). The `chroma_db/` folder is created automatically.

**Collection similarity metric:** Always create collections with `metadata={"hnsw:space": "cosine"}`. The default is L2 distance, which gives misleading scores for text similarity.

**Similarity score from distances:** ChromaDB returns `distances` (lower = more similar for cosine). Convert to similarity: `similarity = 1 - distance`. Scores above 0.7 are usually good matches; below 0.5 are likely noise.

**Deleting documents:** When a trip is deleted, call `collection.delete(ids=[chroma_id])` on both `saved_trips` and `saved_stops` collections. Use the `chroma_id` stored in SQLite.

**Embedding at startup:** The fastembed model takes a few seconds to load on first import. Load it once at module level in `vector_service.py`, not inside each function call. FastAPI startup will be slightly slow but subsequent calls will be fast.

---

## RAG Pipeline — Implementation Notes

The RAG pipeline in `rag_service.py` must:
1. Embed the question with the same `embedding_model` from `vector_service.py` — **not a separate model instance**
2. Query `history_collection` not `trips_collection` (history entries are the RAG knowledge base)
3. Pass retrieved documents as a formatted context block, clearly labelled, to Groq
4. Instruct the LLM explicitly in the system prompt to answer only from context, not from general knowledge
5. Return the answer AND the number of sources used (shown in the UI as credibility signal)

---

## Common Gotchas

**Leaflet + Vite icon bug** — the default Leaflet marker icons break when bundled with Vite. Add this to `MapPreview.jsx` before rendering any map:
```javascript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

**SQLite foreign key cascades** require explicit enablement. Add this to `database.py`:
```python
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
```

**FastAPI startup event** for creating tables and ChromaDB collections:
```python
@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    # ChromaDB collections are created in vector_service.py module init
    # so just importing it is enough
    from app.services import vector_service  # noqa
```

**React Router v6** uses `<Routes>` not `<Switch>`, and `element={<Component />}` not `component={Component}`.

**Semantic search bar debounce** — use a 300ms debounce on the search input before calling the API. Don't call on every keystroke.

**Google Maps URL — max 8 waypoints** on the free tier. If a trip has more than 10 stops, warn the driver that Google Maps may not support all waypoints and suggest splitting the route.

---

## Testing Checklist (Before Marking Any Task Done)

**Backend tasks:**
- [ ] Endpoint returns correct HTTP status code
- [ ] Pydantic schema validation catches bad input (test with a missing required field)
- [ ] SQLite write succeeded (query the table after)
- [ ] ChromaDB write succeeded where applicable (query the collection after)
- [ ] LLM call is logged in `llm_logs` table
- [ ] No unhandled exceptions in uvicorn output

**Frontend tasks:**
- [ ] Works on 375px wide screen (iPhone SE size)
- [ ] Loading state shown during async operations
- [ ] Error state shown and readable (plain English)
- [ ] No console errors or warnings
- [ ] All buttons meet 48x48px touch target

---

## Environment Variables Reference

```bash
# Backend (.env)
GROQ_API_KEY=gsk_...          # console.groq.com — free, no credit card
GOOGLE_MAPS_API_KEY=         # Google Cloud Console, Geocoding API enabled
SUPABASE_URL=                # Supabase project URL
SUPABASE_ANON_KEY=           # Supabase anonymous anon key
SUPABASE_SERVICE_ROLE_KEY=   # Supabase service role key (for backend admin tasks)
DATABASE_URL=postgresql://... # Supabase PostgreSQL connection string
CHROMA_DB_PATH=./chroma_db
DEFAULT_CITY=New York, NY
CORS_ORIGINS=http://localhost:5173
ACTIVE_PROMPT_VERSION=agent_v1

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Never hardcode keys. Never commit `.env` files. Add `.env` to `.gitignore`.

---

## References

- `PRD.md` — Features, user stories, portfolio showcase mapping
- `TECHNICAL_SPEC.md` — Full schema, API contracts, agent code, service implementations
- `PROJECT_PLAN.md` — 130 tasks across 17 phases with checkboxes
- LangChain docs: https://python.langchain.com/docs/
- ChromaDB docs: https://docs.trychroma.com/
- fastembed: https://qdrant.github.io/fastembed/
- Groq API docs: https://console.groq.com/docs/openai
- Google Maps URL scheme: https://developers.google.com/maps/documentation/urls/get-started
- Leaflet docs: https://leafletjs.com/reference.html
