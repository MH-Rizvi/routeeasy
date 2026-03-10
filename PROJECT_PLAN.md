# Project Plan — RoutAura v2.0
## Phased Task Breakdown (Agentic AI Edition)

**Version:** 2.0  
**Date:** March 2026
**Status:** Phase 0-26 Complete

---

## Build Philosophy
Ship the agentic AI core natively first — establishing absolute structural stability using local variables before deploying enterprise identities. Next, upgrade and solidify cloud environments using Supabase Postgres and Auth clusters to prepare the deployment layers, wrapping the functionality within premium Glassmorphism dashboards spanning 23 carefully orchestrated architectural phases.

---

## Phase 0 — Project Setup
*Goal: Skeleton running locally, both services start without errors.*

- [x] **T001** — Create monorepo: `RoutAura/frontend/` and `RoutAura/backend/`
- [x] **T002** — Init React + Vite frontend
- [x] **T003** — Install frontend deps: `react-router-dom tailwindcss zustand axios leaflet react-leaflet`
- [x] **T004** — Configure Tailwind CSS
- [x] **T005** — Init FastAPI backend, create `requirements.txt`
- [x] **T006** — Install all Python deps: `pip install -r requirements.txt`
- [x] **T007** — Create `.env` mappings
- [x] **T008** — Create `backend/app/config.py` using `pydantic-settings`
- [x] **T009** — Create `backend/app/main.py`
- [x] **T010** — Verify execution

---

## Phase 1 — Local Database Setup (SQLite MVP + ChromaDB)
*Goal: Base databases initialized locally for fast testing validation.*

- [x] **T011** — Create SQLAlchemy SQLite MVP engine
- [x] **T012** — Model initial `Trip`, `Stop`, `TripHistory`, `LLMLog` models
- [x] **T013** — Support PRAGMA mappings
- [x] **T014** — Configure Startup event logic
- [x] **T015** — Bootstrap ChromaDB collections: `trip_history` (strictly for RAG)
- [x] **T016** — Standardize `schemas.py` Pydantic models
- [x] **T017** — Validate offline read-writes

---

## Phase 2 — Embedding Service
*Goal: Text can be embedded locally without heavy PyTorch servers.*

- [x] **T018** — Orchestrate `backend/app/services/vector_service.py`
- [x] **T019** — Load `TextEmbedding("BAAI/bge-small-en-v1.5")` via `fastembed` natively 
- [x] **T020** — Implement root `embed(text: str)` hook
- [x] **T021** — Configure string concatenations natively into cosine arrays
- [x] **T022** — Implement multi-dimensional `add_trip` definitions
- [x] **T023** — Expand logic into QA semantic mapping logs via `add_history_entry`

---

## Phase 3 — Geocoding Service
*Goal: Dynamic, localized LLM state detection resolving native maps endpoints.*

- [x] **T028** — Structure `geocoding_service.py`
- [x] **T029** — Interface Google Maps Geocoding API against the fast `DEFAULT_CITY` bounds
- [x] **T030** — Establish explicit State Dictionaries preventing LLM coordinate hallucinations
- [x] **T031** — Support graceful failure fallbacks on un-parseable domains
- [x] **T032** — Stress test exact landmark vs remote intersection parsing

---

## Phase 4 — LangChain Agent Core
*Goal: The Zero-Shot ReAct agent processes complex logical permutations autonomously.*

- [x] **T033** — Define System Prompt mappings restricting AI to single-bound routing rules
- [x] **T034** — Expose 5 native agent tools bridging SQL bounds and Vector memory
- [x] **T035** — Inject `LLMOpsCallbackHandler` tracking multi-stage processing performance
- [x] **T036** — Bind `ChatGroq` parameters targeting 70B intensive logical arrays
- [x] **T037** — Test tool fallback extraction structures internally
- [x] **T038** — Verify multi-stop asynchronous LLM generation tracking correctly 

---

## Phase 5 — Input Moderation (Responsible AI)
*Goal: AI interfaces cannot be broken via native injection tactics.*

- [x] **T042** — Formulate `moderation_service.py`
- [x] **T043** — Expose `is_safe()` boolean checks globally 
- [x] **T044** — Execute strict routing domain checks throwing hard 400 responses dynamically
- [x] **T045** — Test valid queries 
- [x] **T046** — Test rejection queries

---

## Phase 6 — RAG Pipeline
*Goal: Drivers parse massive data lakes natively via voice text prompts.*

- [x] **T047** — Initialize `rag_service.py` context vectors
- [x] **T048** — Isolate generic LLM processing via the `RAG_SYSTEM_PROMPT` bounding logic
- [x] **T049** — Integrate top-k retrieving bounds preventing conversational dilution
- [x] **T050** — Verify semantic tracking across edge cases

---

## Phase 7 — APIs + Internal Database Binding
*Goal: Establish robust multi-state persistence endpoints handling complex UUID routing queries.*

- [x] **T053** — Define robust generic CRUD routing clusters securely passing database arguments
- [x] **T054** — Hook logical bindings deleting orphaned Vector definitions dynamically 
- [x] **T055** — Bind user context headers implicitly preventing cross-tenant leakage 
- [x] **T056** — Verify RAG logging architectures successfully process active JSON variables
- [x] **T057** — Expose `/api/v1` routes matching exact frontend signatures

---

## Phase 8 — Frontend Stores (Zustand)
*Goal: Highly stable UX decoupled entirely from slow asynchronous state fetches.*

- [x] **T065** — Setup global Axios bindings targeting dynamic backend URLs 
- [x] **T066** — Hydrate explicit URL endpoints mapping explicit functionality matrices 
- [x] **T067** — Create decoupled API state tracking contexts (`chatStore`, `tripStore`, `authStore`)
- [x] **T068** — Bridge component hierarchies natively

---

## Phase 9 — Interactive Agent Chat UI
*Goal: Fluid iOS-like conversation design showcasing granular LangChain step processing.*

- [x] **T071** — Rebuild Chat grids mapping multi-role flex arrays 
- [x] **T072** — Support prompt injection UI bounding targets
- [x] **T073** — Integrate voice interfaces targeting generic inputs
- [x] **T074** — Bind deep visual routing configurations tracking LLM context cycles
- [x] **T075** — Verify UX constraints under intensive mobile scrolling behaviors

---

## Phase 10 — Mapping Grid Preview Architectures
*Goal: Driver can review, edit, and natively launch external polyline domains out via the PWA architecture.*

- [x] **T080** — Boot interactive `PreviewScreen` UI logic
- [x] **T081** — Link React-Leaflet geometries via interactive mapping arrays 
- [x] **T082** — Implement multi-touch Drag-n-Drop functionality targeting list elements
- [x] **T083** — Generate dynamic Maps sequences launching internal iOS URL Scheme arrays (`dirflg=d`) vs generic Google links natively.
- [x] **T084** — Launch `history_history` array records directly upon external window mapping triggers 

---

## Phase 11 & 12 — Cloud State Saves & Home Dashboard Quick-Launch
*Goal: Trips dynamically synchronize against explicit Cloud environments and immediately cache rendering bounds.*

- [x] **T089** — Finalize Modal bounding components 
- [x] **T090** — Build generic Home layout targets pointing actively to recently queried objects
- [x] **T091** — Resolve UI layout grids executing semantic array displays
- [x] **T092** — Sync floating button elements bridging the PWA framework 

---

## Phase 13 & 14 — Semantic Search + Embedded History Q&A 
*Goal: Vector architectures mapped explicitly against human-readable GUI elements.*

- [x] **T100** — Construct global Library parameters executing real-time similarity clustering
- [x] **T101** — Process search delays protecting API bounds through custom Debounce algorithms 
- [x] **T102** — Visually broadcast cosine mapping scores natively on rendering cards
- [x] **T103** — Integrate active RAG QA input domains onto user history arrays rendering formatted responses instantly

---

## Phase 15 — LLMOps Analytics Showcase
*Goal: Live LLM parameter monitoring actively projecting underlying Cloud operations safely.* 

- [x] **T111** — Intersect `admin/llm-logs` queries mapping token variations against model architectures
- [x] **T112** — Design simple grid metrics outlining token density parameters vs overall application lag instances
- [x] **T113** — Showcase agent tool configurations dynamically 

---

## Phase 16 — Standardized PWA Polish
*Goal: Natively functional App properties mimicking baseline App Store definitions seamlessly.*

- [x] **T116** — Publish explicit URL Manifest logic allowing iOS dynamic cache assignments
- [x] **T117** — Refine button metrics guaranteeing >48px active hitboxes guaranteeing zero-error interactions 
- [x] **T118** — Secure error boundary toasts catching asynchronous URL timeouts 

---

## Phase 17 — Supabase User Identity
*Goal: Shift application architectures entirely toward true persistent identity providers targeting robust deployments.*

- [x] **T124** — Bind Supabase configurations capturing backend API variables natively
- [x] **T125** — Connect local FastAPI parameters mapping specific JWT injection hooks bypassing external latency calls
- [x] **T126** — Eradicate custom User logic transferring explicitly to Postgres Auth relationships
- [x] **T127** — Expose PKCE Google OAuth boundaries bypassing manual Auth input screens 

---

## Phase 18 — Supabase Postgres Architecture Matrix 
*Goal: Core schema variables completely separated eliminating localized `.db` instances from memory natively.*

- [x] **T134** — Update Model targets executing `UUID` explicit string arrays bounding relational queries natively 
- [x] **T135** — Alter local FastAPI engine executing remote PGSQL parameters securely mapping external DSN variables
- [x] **T136** — Remap all internal `service` definitions targeting `str` variables replacing raw integers completely 
- [x] **T137** — Support asynchronous user cascade drops triggering ChromaDB isolation logic flawlessly 

---

## Phase 19 — Landing Page Rewrite 
*Goal: Distinct Public API scopes mapping Demo Logic separated securely from restricted application logic.*

- [x] **T149** — Generate isolated `LandingPage` bounds capturing core feature sets safely
- [x] **T150** — Bind rate-limited endpoint queries executing raw Agent chat demonstrations preventing application hijacking 
- [x] **T151** — Structure Route parameters trapping destructive DOM calls securely inside React `<Link>` arrays natively.

---

## Phase 20 — Production Cloud Architecture 
*Goal: Fully stable CI/CD environment binding explicit Docker logic bridging frontend CDN boundaries.*

- [x] **T157** — Migrate core operations toward Vercel targets securing base frontends
- [x] **T158** — Implement backend configuration profiles matching Railway executing targets successfully 
- [x] **T159** — Pass rigorous Environment variables protecting Supabase identity parameters

---

## Phase 21 & 22 — Scale-Out Rate Limit Engines
*Goal: Intercept massive LLM payload requirements transferring traffic limits flawlessly natively.* 

- [x] **T168** — Code logic explicitly catching server side 503 limits triggering `groq_rotator` array targets natively
- [x] **T169** — Secure fallback chains transferring generation requirements towards identical Gemini models bridging `gemini-2.5-flash` natively

---

## Phase 23 — Master Dashboard UI/UX Polish
*Goal: Premium Aesthetic architectures driving final project presentations across multiple hardware variations flawlessly.*

- [x] **T170** — Refactor pure `Trips Screen` execution grids converting row values targeting true Glass Card aesthetics. 
- [x] **T171** — Update CSS keyframes natively generating sub-second interface navigation logic
- [x] **T172** — Enhance deep scroll behavior fixing Mobile container overrides securely executing inputs explicitly matching software keyboards. 

---

## Phase 24 — Deterministic Route State Migration
*Goal: Remove JSON array management from the LLM to prevent hallucinations during partial route updates.*

- [x] **T173** — Add `current_route` payload to `AgentChatRequest` and frontend `client.js`.
- [x] **T174** — Implement deterministic `@tool("modify_route")` for add/remove/replace actions natively in Python.
- [x] **T175** — Inject active route arrays dynamically into the LLM system prompt context on every conversational turn.
- [x] **T176** — Remove brittle route array reconstruction and fuzzy-matching fallbacks from frontend UI stores.

---

## Phase 25 — Agentic Edge-Case Hardening (Production Ready)
*Goal: Ensure the agent gracefully handles complex human prompt variations without hallucinating or breaking state.*

- [x] **T177** — Implement City Mismatch Detection in `modify_route` alerting users when a geocoded brand location differs from the requested city.
- [x] **T178** — Build Interactive Confirmation Loops allowing the agent to re-query tools dynamically post-user-consent (`confirmed: true` flag).
- [x] **T179** — Fix semantic loop route deletion by hardening contextual retry detection against immediate prior stops exclusively natively.
- [x] **T180** — Attach explicit `session_id` structures to backend MD5 hashing preventing duplicate request false-positives across manual page refreshes seamlessly.
- [x] **T181** — Apply strict System Prompts preventing bare-brand context hallucinations (e.g., "Target" without a city) detached from explicit geographical bounds.

## Phase 26 — SQL Search Migration (Architectural Hardening)
*Goal: Remove dependency on local vector storage for business-critical trip and stop searches.*

- [x] **T182** — Rewrite `search_saved_trips` to use PostgreSQL SQL `ILIKE` pattern matching.
- [x] **T183** — Implement `search_trips_by_stop` tool using SQL `ILIKE` on labels and resolved addresses.
- [x] **T184** — Build server-side plural handling (singular root normalization) for stop searches.
- [x] **T185** — Stub out trip/stop embedding logic in `vector_service.py` to end dual-write complexity.
- [x] **T186** — Fix agent stop extraction priority to resolve back-to-back saved trip loading bugs.
- [x] **T187** — Update all documentation (README, Spec, PRD) to reflect SQL fuzzy matching architecture.

---
_END OF ROADMAP_
