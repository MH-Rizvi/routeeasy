# Technical Specification — RoutAura v2.0
## Architecture & Implementation Blueprint (Agentic AI Edition)

**Version:** 2.0  
**Date:** March 2026
**Status:** Deployed via Railway/Vercel

---

## 1. Technology Stack

### Current Implementation Layout

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| **Frontend** | React 18 + Vite | Latest | Fast, component-based, PWA-configured |
| **Styling** | Tailwind CSS | v3 | Mobile-first utility classes built explicitly integrating Glassmorphism designs |
| **State** | Zustand | v4 | Lightweight synchronous context arrays |
| **Backend** | FastAPI (Python) | 0.110+ | Async, fast endpoints supporting native LLM chains |
| **AI Orchestration** | LangChain | 0.2+ | Single-parameter ReAct logic arrays |
| **Primary LLMs** | Groq API (`llama-3.3-70b`) | Latest | Intensive reasoning capabilities executing logic natively around <800ms API bounds |
| **Fallback LLMs** | Google Gemini (`gemini-2.5-flash`) | Latest | `groq_rotator` implementation preventing system crashes processing 429 logic blocks |
| **Embeddings** | fastembed (`BAAI/bge-small-en-v1.5`) | Latest | Lightweight ONNX, natively embedded directly across Railway |
| **Vector DB** | ChromaDB | 0.6+ | Local-first semantic arrays for History RAG and QA |
| **Search Engine** | PostgreSQL SQL `ILIKE` | — | Fuzzy pattern matching for trips and stops |
| **Relational DB** | Supabase PostgreSQL | Latest | Cloud persistence, identity brokering, robust relational binding queries natively |
| **Auth Contexts** | Supabase Auth + `python-jose` | v2 | Full PKCE OAuth configurations processed with 0ms Backend network validation arrays explicitly |
| **Deployment** | Railway (backend) + Vercel (frontend) | — | Built-in seamless CI/CD pushing full containerized arrays to production securely |

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        User's Device (PWA)                        │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │   Chat UI    │  │  Trips Library │  │    Map Preview        │  │
│  │ (agent chat) │  │ (semantic srch)│  │  (Leaflet/OSM)       │  │
│  └──────────────┘  └────────────────┘  └──────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP REST (axios) + Supabase Context Headers
┌───────────────────────────▼──────────────────────────────────────┐
│                      FastAPI Backend                               │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              LangChain ReAct Agent Core                      │  │
│  │                                                              │  │
│  │   Driver message → Moderation check → Agent loop:           │  │
│  │   THOUGHT → ACTION (tool call) → OBSERVATION → repeat       │  │
│  │                                                              │  │
│  │   Tools:                                                     │  │
│  │   ┌──────────────────┐  ┌──────────────────────────────┐   │  │
│  │   │  geocode_stop    │  │  search_trips_by_stop        │   │  │
│  │   │  (Google API)    │  │  (Postgres SQL ILIKE)        │   │  │
│  │   └──────────────────┘  └──────────────────────────────┘   │  │
│  │   ┌──────────────────┐  ┌──────────────────────────────┐   │  │
│  │   │ search_saved_    │  │  get_trip_by_id              │   │  │
│  │   │ trips (SQL ILIKE)│  │  (PostgreSQL)                │   │  │
│  │   └──────────────────┘  └──────────────────────────────┘   │  │
│  │   ┌──────────────────┐  ┌──────────────────────────────┐   │  │
│  │   │ get_recent_      │  │  modify_route (Atomic Array) │   │  │
│  │   │ history (Postgres)  │  (Add/Remove/Replace python) │   │  │
│  │   └──────────────────┘  └──────────────────────────────┘   │  │
│  │   LangChain Callback Handler logs every LLM call → llm_logs│  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              RAG Pipeline (History Q&A)                      │  │
│  │  Question → embed → ChromaDB retrieve → Fallback API logic   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  Supabase    │  │   ChromaDB     │  │  fastembed           │  │
│  │ PostgreSQL   │  │  (History Q&A  │  │  BAAI/bge-small-en  │  │
│  │  (trips,     │  │   embeddings,  │  │  (local embeddings)  │  │
│  │  UUIDs,      │  │   history)     │  │                      │  │
│  │  llm_logs)   │  │                │  │                      │  │
│  └──────────────┘  └────────────────┘  └──────────────────────┘  │
│                                                                    │
│  External APIs: Google Geocoding API, Groq API, Gemini API         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### PostgreSQL Tables (Relational / Structured Data - Supabase)

_Note: All user relationships map directly to standard string definitions targeting Postgres UUID properties inherited dynamically via Supabase User assignments natively._

```sql
-- Core users table natively tracked via Supabase's hidden `auth.users` container
-- We track metadata explicitly mapped to the generated UUID mapping targets.

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  full_location VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Core trips table
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_launched_at TIMESTAMP
);

-- Ordered stops per trip
CREATE TABLE IF NOT EXISTS stops (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
  label VARCHAR(200),
  address TEXT,
  lat FLOAT,
  lng FLOAT,
  order_index INTEGER DEFAULT 0,
  notes TEXT
);

-- Trip launch history QA logic (Feeds RAG)
CREATE TABLE IF NOT EXISTS trip_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  trip_name VARCHAR(200),
  stop_count INTEGER DEFAULT 0,
  launched_at TIMESTAMP DEFAULT NOW(),
  total_miles FLOAT,
  chroma_id TEXT UNIQUE
);

-- LLMOps usage arrays
CREATE TABLE IF NOT EXISTS llm_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  model VARCHAR(100),
  prompt_version VARCHAR(50),
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### ChromaDB Collections (Vector Storage Architecture)

Collections dynamically implement user namespaces using string allocations: `trip_history_{user_id}`.
Each Vector Collection tracks `metadata={"hnsw:space": "cosine"}` mappings targeting history QA logic.

**Note:** Trip and stop searches use high-performance SQL `ILIKE` pattern matching in PostgreSQL, ensuring 100% search reliability in ephemeral cloud environments. ChromaDB is strictly reserved for semantic history retrieval (RAG).

---

## 4. Single-Parameter Geocoding Extractor Logic

Since ReAct agents aggressively drop secondary keyword parameters within JSON logic payloads, the Tool interface expects a single integrated string combining both generic addresses AND explicit states natively.

Example: `Action Input: The High School, Dallas, TX`.

The backend `_extract_state_from_query()` intercepts the String input dynamically reading 50 States + DC checking for explicit bindings natively prior to executing Google parameters. It uses hardcoded Lat/Lng state-center arrays overriding the driver's local geographic preferences securely mitigating all invalid geographic routing behaviors seamlessly avoiding Google fallback errors completely.

---

## 4.5. Deterministic Route State Mutation

Since LLMs are highly prone to index-drift and hallucinations when rewriting complex JSON lists from fading multi-turn memory windows, RoutAura actively strips state-management authorization away from the AI agent. The frontend pushes the exact active route array into the `current_route` backend payload on every request.

This array is injected into the LLM context. When the user requests a modification (e.g., "Change stop 2 to Walmart"), the LLM executes the atomic `@tool("modify_route", action="replace", position=2)`. The Python backend deterministically edits the array, performs isolated single-stop geocoding, recalculates index mapping perfectly, and returns the strictly enforced state back to the UI, completely eliminating array drift.

---

## 4.6. Conversational Edge-Case Hardening & Deduplication TTL

RoutAura implements systemic logic bindings to defensively process human edge-cases:
1. **Interactive Consent Loops:** Tools encountering logical geography collisions (e.g., "Target MN" instead of "Target NY") natively throw `CITY MISMATCH` approvals back to the driver. The agent re-queries the tools dynamically only after receiving user confirmation via a `confirmed: true` flag payload.
2. **Missing-Geography Clarifications:** To prevent context hallucination where the LLM guesses the wrong target city based on the previous stop's address, strict rules mandate the AI asks "Which city?" whenever a bare-brand replacement is requested natively.
3. **Session-Aware MD5 TTLs:** Identical queries issued actively across independent clients ("Home") bypass blocking mechanisms by binding the unique frontend `session_id` directly into the MD5 collision hash. Local dictionaries enforce strict 5-second garbage-collection expiration TTLs on active request lockouts, securing identical multi-tab processes globally.

---

## 5. RAG Pipeline Implementation Flow

1. The user asks "Have I been to Oak Street?".
2. The `rag_service.py` targets the question parsing string domains.
3. It creates explicit text vectors passing directly to `trip_history_{user_id}` retrieving the top 5 historical log summaries mathematically ranked nearest to that embedded domain string natively.
4. It converts the retrieved String payloads natively into generic Context parameters injected directly inside a restricted Prompt instructing the Groq/Gemini array target answering based only natively based on provided Context.
5. The User receives a formatted markdown answer referencing retrieved data directly natively safely.

---

## 6. Authentication Workflows (Supabase Local Validation Strategy)

While standard Supabase calls involve executing `supabase.auth.get_user(token)` triggering network validations natively, this imposes 300ms delays checking REST paths iteratively causing race conditions rendering the app. 

### Secure Interceptor Bypass:
Instead of querying the Supabase GoTrue server continuously natively on every API parameter, `auth.py` invokes explicit `python-jose` decoding logic verifying `JWT_SECRET` signatures natively mapping valid payloads instantly passing context directly saving extreme latency parameters implicitly safely out of bounds entirely securely.

---

## 7. Configuration Specifications (Environment Deployment Contexts)

### Backend Deployment Variables (`.env`)
```bash
# LLM Providers
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...

# Identity + Postgres Layers
SUPABASE_URL=https://[...].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...
JWT_SECRET=super_secret_jwt_string

# Native Integrations
GOOGLE_MAPS_API_KEY=AI...

# Application Environment Definitions
CHROMA_DB_PATH=./chroma_db
DEFAULT_CITY=Dallas, TX
CORS_ORIGINS=https://routeeasy-production.vercel.app  # Dynamic frontend definitions securely overriding default localhost targets
ACTIVE_PROMPT_VERSION=agent_v1
```

### Frontend Configuration Variables
```bash
VITE_API_BASE_URL=https://backend-production.up.railway.app/api/v1
```
