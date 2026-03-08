# Project Plan — RoutAura v2.0
## Phased Task Breakdown (Agentic AI Edition)

**Version:** 2.0  
**Date:** February 2026

---

## Build Philosophy
Ship the agentic AI core first — it's the most impressive part for a showcase. The UI is secondary. An interviewer who sees a working LangChain agent with ChromaDB vector search and a RAG pipeline will be far more impressed than someone who sees a pretty interface over a basic LLM call.

---

## Phase 0 — Project Setup
*Goal: Skeleton running locally, both services start without errors.*

- [ ] **T001** — Create monorepo: `RoutAura/frontend/` and `RoutAura/backend/`
- [ ] **T002** — Init React + Vite frontend: `npm create vite@latest frontend -- --template react`
- [ ] **T003** — Install frontend deps: `react-router-dom tailwindcss zustand axios leaflet react-leaflet react-beautiful-dnd`
- [ ] **T004** — Configure Tailwind CSS (`tailwind.config.js`, add directives to `index.css`)
- [ ] **T005** — Init FastAPI backend, create `requirements.txt` (see Technical Spec §13)
- [ ] **T006** — Install all Python deps: `pip install -r requirements.txt`
- [ ] **T007** — Create `backend/.env` and `frontend/.env` with placeholder values
- [ ] **T008** — Create `backend/app/config.py` using `pydantic-settings` to load all env vars
- [ ] **T009** — Create `backend/app/main.py` with FastAPI app, CORS middleware, and health check endpoint `GET /health`
- [ ] **T010** — Verify: `uvicorn app.main:app --reload` starts, `npm run dev` starts, `/health` returns 200

---

## Phase 1 — Database Setup (SQLite + ChromaDB)
*Goal: Both databases initialised and ready to store data.*

- [ ] **T011** — Create `backend/app/database.py`: SQLAlchemy engine for SQLite + ChromaDB persistent client initialisation
- [ ] **T012** — Create `backend/app/models.py`: `Trip`, `Stop`, `TripHistory`, `LLMLog` SQLAlchemy models (see Technical Spec §3)
- [ ] **T013** — Add `PRAGMA foreign_keys = ON` to SQLite engine via SQLAlchemy event listener
- [ ] **T014** — Add `Base.metadata.create_all(bind=engine)` in FastAPI startup event
- [ ] **T015** — Create ChromaDB collections in startup: `saved_stops`, `saved_trips`, `trip_history` (all with cosine similarity)
- [ ] **T016** — Create `backend/app/schemas.py`: all Pydantic request/response models
- [ ] **T017** — Write a quick test script to insert a trip into SQLite and a document into ChromaDB, then query both — verify it works

---

## Phase 2 — Embedding Service
*Goal: Text can be embedded locally with sentence-transformers and stored/queried in ChromaDB.*

- [ ] **T018** — Create `backend/app/services/vector_service.py`
- [ ] **T019** — Load `BAAI/bge-small-en-v1.5` at module level (runs locally, no PyTorch, no API): `TextEmbedding("BAAI/bge-small-en-v1.5")` via `fastembed`
- [ ] **T020** — Implement `embed(text: str) -> list[float]`
- [ ] **T021** — Implement `add_stop(stop_id, trip_id, label, resolved, lat, lng) -> str` — embeds label+resolved, stores in `saved_stops` collection
- [ ] **T022** — Implement `add_trip(trip_id, name, stops) -> str` — embeds name + all stop labels, stores in `saved_trips` collection
- [ ] **T023** — Implement `add_history_entry(history_id, trip_id, trip_name, stops, launched_at)` — creates natural language summary, embeds, stores in `trip_history` collection
- [ ] **T024** — Implement `search_stops(query, top_k=3) -> list[dict]` — embed query, ChromaDB similarity search, format with similarity scores
- [ ] **T025** — Implement `search_trips(query, top_k=3) -> list[dict]`
- [ ] **T026** — Implement `search_history(query, top_k=5) -> list[dict]`
- [ ] **T027** — Test: embed "the school", add "Hillside Primary School NY" as a stop, verify `search_stops("school")` returns it with >0.7 similarity

---

## Phase 3 — Geocoding Service
*Goal: Address strings resolve to lat/lng via Google Geocoding API.*

- [ ] **T028** — Create `backend/app/services/geocoding_service.py`
- [ ] **T029** — Implement `geocode(query: str) -> dict` — calls Google Maps Geocoding API with `DEFAULT_CITY` region bias
- [ ] **T030** — Handle geocoding failure gracefully: return `{ success: false, error: "..." }` not a 500
- [ ] **T031** — Add caching: if the same query string is geocoded twice in a session, return cached result
- [ ] **T032** — Test with 5 sample addresses from different formats (full address, partial address, landmark name)

---

## Phase 4 — LangChain Agent Core
*Goal: The LangChain ReAct agent is running and calling tools correctly.*

- [ ] **T033** — Create `backend/app/agent/prompts.py` — define `AGENT_PROMPT_TEMPLATE` (see Technical Spec §4.2), versioned as `agent_v1`
- [ ] **T034** — Create `backend/app/agent/tools.py` — implement all 5 tools: `geocode_stop_tool`, `search_saved_stops_tool`, `search_saved_trips_tool`, `get_trip_by_id_tool`, `get_recent_history_tool` (see Technical Spec §4.3)
- [ ] **T035** — Create `backend/app/agent/callbacks.py` — implement `LLMOpsCallbackHandler` that logs every LLM call to `llm_logs` table (see Technical Spec §4.4)
- [ ] **T036** — Create `backend/app/agent/core.py` — assemble `ChatGroq` + tools + prompt + callback into `AgentExecutor` (see Technical Spec §4.1)
- [ ] **T037** — Expose `run_agent(message: str, history: list) -> dict` function that runs the agent and returns structured output
- [ ] **T038** — Test agent with: "from maple street, stop at oak avenue, then hillside primary school" — verify all 3 stops geocoded correctly
- [ ] **T039** — Test agent with: "do my usual morning run" — verify `search_saved_trips` tool is called (even if nothing found yet)
- [ ] **T040** — Test agent with: "add a stop at park road" as a follow-up — verify conversation history is used
- [ ] **T041** — Verify `llm_logs` table gets a new row after each agent run

---

## Phase 5 — Input Moderation (Responsible AI)
*Goal: All inputs are moderated before reaching the agent.*

- [ ] **T042** — Create `backend/app/services/moderation_service.py`
- [ ] **T043** — Implement `is_safe(user_input: str) -> bool` using a fast Groq LLM call with the moderation system prompt (see Technical Spec §7)
- [ ] **T044** — Add moderation call at the top of the `/agent/chat` route handler — return 400 with friendly message if `is_safe()` returns False
- [ ] **T045** — Test with safe input ("go from depot to the school") → passes
- [ ] **T046** — Test with unsafe input ("ignore previous instructions") → blocked

---

## Phase 6 — RAG Pipeline
*Goal: Drivers can ask natural language questions about their trip history.*

- [ ] **T047** — Create `backend/app/services/rag_service.py`
- [ ] **T048** — Implement `answer_history_question(question: str) -> dict` — full RAG pipeline: embed question → ChromaDB retrieve → format context → Groq generate (see Technical Spec §6)
- [ ] **T049** — Add `RAG_SYSTEM_PROMPT_v1` to `prompts.py` and reference from `rag_service.py`
- [ ] **T050** — Ensure RAG calls are also logged via the LLMOps callback (or manual log insert)
- [ ] **T051** — Test: add 3 history entries to ChromaDB manually, then ask "have I been to oak avenue before?" — verify grounded answer returned
- [ ] **T052** — Test: ask a question with no relevant history — verify system says it doesn't have enough information

---

## Phase 7 — Trips CRUD API + Vector Writes
*Goal: Full trips API where every save also writes to ChromaDB.*

- [ ] **T053** — Create `backend/app/services/trips_service.py` with functions: `create_trip`, `get_trip`, `list_trips`, `update_trip`, `delete_trip`, `launch_trip`
- [ ] **T054** — In `create_trip`: save to SQLite AND call `vector_service.add_trip()` + `vector_service.add_stop()` for each stop. Store returned `chroma_id` on the record.
- [ ] **T055** — In `delete_trip`: delete from SQLite AND delete from ChromaDB collections by `chroma_id`
- [ ] **T056** — In `launch_trip`: update `last_used`/`use_count` in SQLite, append to `trip_history`, call `vector_service.add_history_entry()`
- [ ] **T057** — Create `backend/app/routers/trips.py` with all CRUD endpoints (see Technical Spec §8)
- [ ] **T058** — Add `GET /trips/search?q=...` endpoint that calls `vector_service.search_trips()` and enriches results with SQLite data
- [ ] **T059** — Create `backend/app/routers/agent.py` — `POST /agent/chat` endpoint (moderation → agent → return structured response)
- [ ] **T060** — Create `backend/app/routers/rag.py` — `POST /rag/query` endpoint
- [ ] **T061** — Create `backend/app/routers/history.py` — `GET /history` endpoint
- [ ] **T062** — Create `backend/app/routers/admin.py` — `GET /admin/llm-logs` endpoint with pagination
- [ ] **T063** — Register all routers in `main.py`
- [ ] **T064** — End-to-end test: create trip → verify in SQLite → verify in ChromaDB → search by semantic query → verify result returned

---

## Phase 8 — Frontend API Client + Stores
*Goal: Frontend can talk to backend, state is managed cleanly.*

- [ ] **T065** — Create `frontend/src/api/client.js` — axios instance with `VITE_API_BASE_URL` base URL, request/response interceptors for error handling
- [ ] **T066** — Add API functions: `sendChatMessage()`, `queryHistory()`, `getTrips()`, `searchTrips()`, `saveTrip()`, `getTrip()`, `updateTrip()`, `deleteTrip()`, `launchTrip()`, `getLLMLogs()`
- [ ] **T067** — Create `frontend/src/store/chatStore.js` (Zustand): `messages`, `currentStops`, `isLoading`, `sessionId`, `sendMessage()`, `resetChat()`
- [ ] **T068** — Create `frontend/src/store/tripStore.js` (Zustand): `trips`, `searchResults`, `fetchTrips()`, `searchTrips()`, `deleteTrip()`
- [ ] **T069** — Set up React Router in `App.jsx` with all routes (see Technical Spec §10)
- [ ] **T070** — Create `Layout.jsx` with bottom tab bar: Home | New Trip | My Trips | History

---

## Phase 9 — Chat Screen (Agent Interface)
*Goal: Driver can chat with the LangChain agent and see parsed stops.*

- [ ] **T071** — Build `ChatScreen.jsx`
- [ ] **T072** — Build `MessageBubble.jsx` — driver messages right (blue), agent messages left (grey), agent steps shown as small grey text if verbose mode on
- [ ] **T073** — Build `ChatInput.jsx` — full-width text input + send button, disabled while loading
- [ ] **T074** — On send: call `chatStore.sendMessage()` → `POST /agent/chat` → display agent reply in chat
- [ ] **T075** — If response contains `stops` array: show "Preview Route →" button in chat that navigates to PreviewScreen with stop data
- [ ] **T076** — If `needs_confirmation: true`: show trip name in agent message with "Yes, use this" / "No, create new" buttons
- [ ] **T077** — Add example prompt chips on empty chat: "Morning school run", "My usual Monday route", "What did I drive last week?"
- [ ] **T078** — If user message looks like a history question (contains "last", "before", "ever", "when"): route to RAG endpoint instead of agent
- [ ] **T079** — Build `VoiceInputButton.jsx` using `window.SpeechRecognition`, show animated recording indicator, transcribe to input field

---

## Phase 10 — Preview Screen
*Goal: Driver can review, edit, and launch their route.*

- [ ] **T080** — Build `PreviewScreen.jsx`
- [ ] **T081** — Receive stops from router state (set by chat screen) or from a saved trip
- [ ] **T082** — Build `StopList.jsx` with drag-to-reorder using `react-beautiful-dnd`
- [ ] **T083** — Build `StopItem.jsx` — position number, resolved address, per-stop note button, delete button
- [ ] **T084** — Build `MapPreview.jsx` using Leaflet + OpenStreetMap — numbered pins for each stop, polyline connecting them in order. Fix Vite + Leaflet icon bug (see CLAUDE.md)
- [ ] **T085** — Add "Open in Google Maps" button → call `buildGoogleMapsUrl(stops)` → `window.open(url, '_blank')`
- [ ] **T086** — Add "Open in Apple Maps" button — show only on iOS via `isIOS()` utility
- [ ] **T087** — Add "Save This Trip" button → open `SaveTripModal.jsx`
- [ ] **T088** — On navigation launch: if trip has saved `trip_id`, call `POST /trips/{id}/launch`

---

## Phase 11 — Save Trip Modal
*Goal: Trips can be named and saved to SQLite + ChromaDB.*

- [ ] **T089** — Build `SaveTripModal.jsx`
- [ ] **T090** — Pre-fill name with: "first stop → last stop" (e.g., "Depot → Hillside Primary")
- [ ] **T091** — Add optional notes textarea
- [ ] **T092** — On save: call `POST /trips` with stops array, show success toast, offer "Go to My Trips" link
- [ ] **T093** — Verify trip appears in ChromaDB by immediately running a semantic search for it

---

## Phase 12 — Home Screen (Quick Launch)
*Goal: Saved trips launchable from home screen in one tap.*

- [ ] **T094** — Build `HomeScreen.jsx`
- [ ] **T095** — On mount: fetch trips sorted by `last_used` descending, show top 6 as large cards
- [ ] **T096** — Build `TripCard.jsx` — large, mobile-friendly card: trip name (20px+), stop count, last used date, "Navigate Now" button
- [ ] **T097** — "Navigate Now": fetch full trip → build Google Maps URL → open → call launch endpoint
- [ ] **T098** — Empty state: "No trips yet — tap + to describe your first route"
- [ ] **T099** — Floating "+" button → navigate to `/chat`

---

## Phase 13 — Saved Trips Library (with Semantic Search)
*Goal: Driver can browse, search, and manage all saved trips.*

- [ ] **T100** — Build `TripsScreen.jsx`
- [ ] **T101** — Build `SemanticSearchBar.jsx` — debounced input (300ms) that calls `GET /trips/search?q=...` and updates results
- [ ] **T102** — Show trips as cards — all trips when no search query, semantic search results when typing
- [ ] **T103** — Show similarity score badge on search results (e.g., "92% match") so the showcase value of semantic search is visible
- [ ] **T104** — Swipe-to-delete gesture on trip cards
- [ ] **T105** — Build `TripDetailScreen.jsx` — full stop list, notes, edit name/notes, navigate + re-save
- [ ] **T106** — Allow stop reordering and deletion within a saved trip, with update call to backend

---

## Phase 14 — History Screen + RAG Panel
*Goal: Driver can see past launches and ask questions about history.*

- [ ] **T107** — Build `HistoryScreen.jsx` — two sections: recent launches list + RAG Q&A panel
- [ ] **T108** — Recent launches: chronological list, trip name, date/time, stop count
- [ ] **T109** — RAG Q&A panel: text input with example questions: "What route did I do last Friday?", "Have I been to Oak Avenue?", "How many stops does my morning run have?"
- [ ] **T110** — On RAG query submit: call `POST /rag/query`, display grounded answer in a distinct "AI Answer" card with a "Based on your history" label

---

## Phase 15 — LLM Logs Dashboard (Showcase Screen)
*Goal: Demonstrate LLMOps awareness — visible proof of token usage tracking.*

- [ ] **T111** — Build `LLMLogsScreen.jsx` (accessible via `/admin/logs`)
- [ ] **T112** — Fetch from `GET /admin/llm-logs`
- [ ] **T113** — Display as a table: timestamp, model, prompt version, input tokens, output tokens, latency ms, success/fail
- [ ] **T114** — Add summary row: total calls, total tokens used, average latency, success rate
- [ ] **T115** — Add note on screen: "This dashboard tracks every AI call made by the system for cost monitoring and performance observability"

---

## Phase 16 — PWA & Polish
*Goal: App installable on phone, looks professional, feels native.*

- [ ] **T116** — Create `public/manifest.json`: name, short_name, icons (192x192, 512x512), `display: standalone`, theme_color `#2563EB`
- [ ] **T117** — Create app icons (use a simple bus + route icon, generate with any image tool)
- [ ] **T118** — Add service worker for basic offline caching of static assets
- [ ] **T119** — Ensure all buttons are minimum 48x48px touch target
- [ ] **T120** — Add loading skeletons on trips list and chat
- [ ] **T121** — Add toast notifications: save success, navigation launched, delete confirmed, error messages
- [ ] **T122** — Test full flow on real mobile device (iOS Safari + Android Chrome)
- [ ] **T123** — Fix any layout issues on 375px and 390px screen widths

---

## Phase 17 — User Authentication & Per-User Data
*Goal: Secure multi-user system with data isolation.*

- [ ] **T124** — Update SQLite schema: add `users` and `user_profiles` tables, and `user_id` foreign keys to all existing tables
- [ ] **T125** — Build `backend/app/services/auth_service.py` for JWT (access/refresh) generation and bcrypt hashing
- [ ] **T126** — Create authentication middleware/dependency to parse and validate JWTs and protect existing endpoints
- [ ] **T127** — Create `/api/v1/auth/signup` and `/api/v1/auth/login` endpoints
- [ ] **T128** — Update frontend `api/client.js` to handle tokens in memory and auto-handle refresh flows
- [ ] **T129** — Update ChromaDB collections to be dynamically namespaced per user (`saved_trips_{user_id}`, etc.)
- [ ] **T130** — Update geocoding queries to use the logged-in user's `full_location` (from `user_profiles`) instead of `DEFAULT_CITY`
- [ ] **T131** — Build `AuthScreen.jsx` with multi-step signup (Step 1: credentials, Step 2: location profile)
- [ ] **T132** — Implement logout button and clear tokens from memory
- [ ] **T133** — Update backend `trips_service.py`, `vector_service.py` and `rag_service.py` to filter all operations by `user_id`

---

## Phase 18 — Stats Dashboard
*Goal: Replace Logs tab with a user-specific driving statistics dashboard.*

- [ ] **T134** — Add `total_miles` float column to the `trip_history` table in SQLite
- [ ] **T135** — Integrate Google Directions API to calculate real-world mileage during trip launch, and store in `total_miles`
- [ ] **T136** — Create `GET /api/v1/stats/summary` endpoint returning trips/stops/miles for today and week
- [ ] **T137** — Create `GET /api/v1/stats/daily?days=30` endpoint for charting array data
- [ ] **T138** — Build `StatsScreen.jsx` in frontend (replaces the old Logs tab)
- [ ] **T139** — Implement 4 top-row stat cards (Today's trips, Week trips, Today miles, Week miles)
- [ ] **T140** — Build line chart using `recharts` for daily miles driven, with Weekly/Monthly toggle
- [ ] **T141** — Ensure all stats endpoints strictly scope data to the authenticated `user_id`

---

## Phase 19 — Landing Page & Frontend Architecture Revamp
*Goal: Separate public marketing page from authenticated app experience.*

- [ ] **T149** — Update routing architecture (`/` public, `/home` authenticated).
- [ ] **T150** — Create `LandingPage.jsx` with all sections (Hero, How It Works, Features, etc).
- [ ] **T151** — Add live demo chat widget in the hero section.
- [ ] **T152** — Add `POST /api/v1/agent/demo-chat` backend endpoint.
- [ ] **T153** — Add rate limiting to demo endpoint.
- [ ] **T154** — Add signup gate modal when demo user tries to save.
- [ ] **T155** — Ensure logged-in users redirected from `/` to `/home`.
- [ ] **T156** — Mobile responsiveness on landing page.

---

## Phase 20 — Supabase Migration
*Goal: Migrate from SQLite + custom JWT to Supabase PostgreSQL + Supabase Auth.*

- [x] **T157** — Create Supabase project and get URL, anon key, and service role key
- [x] **T158** — Create `backend/app/supabase_client.py` to initialize Supabase python client
- [x] **T159** — Update `backend/app/config.py` with the 4 new environment variables
- [ ] **T160** — Update `backend/app/models.py`: id fields on Users to UUID, `user_id` foreign keys to UUID
- [ ] **T161** — Create `backend/migrations/001_initial.sql` for PostgreSQL schema creation
- [ ] **T162** — Replace SQLite connection string in `backend/app/database.py` with PostgreSQL
- [ ] **T163** — Refactor `backend/app/auth.py` and `backend/app/routers/auth.py` to use Supabase Auth instead of local bcrypt/JWT
- [ ] **T164** — Update `get_current_user()` dependency to authenticate Supabase JWTs
- [ ] **T165** — Update all service files where `user_id` types changed from `int` to `str/UUID`
- [ ] **T166** — Test End-to-End: Signup, Login, Agent chat, Trip save (PostgreSQL + ChromaDB), and History

---

## Phase 21 — Deployment
*Goal: App live on the internet, accessible via URL.*

- [x] **T167** — Create `runtime.txt` to enforce `python-3.12` and `.railwayignore`
- [x] **T168** — Deploy backend to Railway, replacing bulky pytorch/sentence-transformers with `fastembed` for memory limits
- [x] **T169** — Build frontend test: `npm run build` → deploy `dist/` to Vercel
- [x] **T170** — Set `VITE_API_BASE_URL` in Vercel to production backend URL from Railway
- [x] **T171** — Set `CORS_ORIGINS` in backend to Vercel deployment URL
- [x] **T172** — Test full production flow: chat → agent runs → stops previewed → trip saved → semantic search finds it → RAG query answers question about it
- [x] **T173** — Share URL — give to your father and use as portfolio showcase link

---

## Build Order Summary

```
Phase 0 (Setup)
→ Phase 1 (Databases)
→ Phase 2 (Embeddings)          ← fastembed ONNX bge-small-en-v1.5
→ Phase 3 (Geocoding)           ← Google API integration
→ Phase 4 (LangChain Agent)     ← THE CORE — most impressive part
→ Phase 5 (Moderation)          ← Responsible AI
→ Phase 6 (RAG Pipeline)        ← RAG
→ Phase 7 (CRUD API)            ← Hybrid SQLite + ChromaDB writes
→ Phase 8 (Frontend Setup)
→ Phase 9 (Chat Screen)
→ Phase 10 (Preview Screen)
→ Phase 11 (Save Trip)
→ [STOP HERE FOR WORKING MVP — Phases 0–11]
→ Phase 12 (Home Screen)
→ Phase 13 (Trips Library + Semantic Search UI)
→ Phase 14 (History + RAG Panel)
→ Phase 15 (LLMOps Dashboard)
→ Phase 16 (PWA + Polish)
→ Phase 17 (User Auth & Per-User Data)
→ Phase 18 (Stats Dashboard)
→ Phase 19 (Landing Page Revamp)
→ Phase 20 (Supabase Migration)
→ Phase 21 (Deploy)
```

**Estimated time with AI coding agent:**
- Phases 0–11 (MVP): 3–5 days
- Full build (Phases 0–20): 2–2.5 weeks

**What you have after Phases 0–7 (backend only):**
A working, demonstrable agentic AI backend that you can showcase via Postman or curl — the agent runs, tools are called, ChromaDB does semantic search, the RAG pipeline answers questions. This alone is interview-worthy.
