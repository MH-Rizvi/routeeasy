# RoutAura

**An Agentic AI route planner for professional drivers using LangChain, Fastembed, PostgreSQL, and Supabase.**

![RoutAura Interface UI](./frontend/public/icon.png)

RoutAura is a full-stack Progressive Web App (PWA) built specifically to solve the daily friction of manual route generation for delivery contractors and professional drivers. Instead of typing dozens of addresses repetitively into navigation platforms, drivers can chat conversationally with an advanced AI Agent ("Route me to the Co-Op, then the primary school, and finish at the depot"). The agent autonomously geocodes locations, parses driver intent, retrieves localized context using vector memory, and generates deep link structures to launch external navigation apps.

This implementation acts fundamentally as a robust portfolio benchmark reflecting modern **Agentic AI Engineering, LLMOps Observability, and Full-Stack Cloud Deployment Protocols.**

---

## 🛠️ Technology Stack (v2.0 Architecture)

**Frontend Layer:**
- **React 18 + Vite** (Configured tightly as an installable PWA)
- **Tailwind CSS v3** (Mobile-first dynamic Glassmorphism styling)
- **Zustand** (Rapid synchronous global state persistence)
- **Leaflet.js** (Dynamic embedded routing sequence mapping)

**AI Orchestration & Infrastructure:**
- **LangChain** (Intelligent single-parameter ReAct Agent Core)
- **Groq API** (`llama-3.3-70b-versatile` operating at high token-per-second constraints) 
- **Google Gemini API** (`gemini-2.5-flash` natively integrated fallback pipeline for zero-downtime routing processing)
- **Fastembed** ONNX framework (`BAAI/bge-small-en-v1.5` for local, cost-free vector execution devoid of heavy PyTorch instances)
- **pgvector** (Supabase native vector storage for CDL Compliance Assistant RAG)

**Backend & Data Layer:**
- **FastAPI** (Python 3.12+ concurrent asyncio API handling)
- **Supabase Auth** (Natively handling PKCE OAuth flows, verification pipelines, and identity issuance)
- **Supabase PostgreSQL** (Cloud-scalable persistent structural mapping tables and metrics)
- **python-jose** (Secure zero-latency inner-network JSON Web Token decryption)

**Cloud Deployment Architecture:**
- **Vercel** (Frontend static caching logic)
- **Railway** (Containerized backend processing clusters)

---

## 🏗️ System Architecture & Logic Capabilities

1. **ReAct Agent Autonomy**: User inputs are mathematically structured via ReAct heuristics rather than blindly passed to static generation frameworks. The Agent sequences `Thought` → `Action` → `Observation` loops internally, picking from 5 distinct tool clusters (Database indexing, vector indexing, Google Maps Live APIs, etc.) until it constructs a confident mapping package.
2. **Fuzzy Search Memory**: Every saved trip and stop is indexed in PostgreSQL. The Agent uses advanced SQL `ILIKE` pattern matching with automatic plural handling and root-word expansion. Typing "The high school" or "hospitals" finds the specific historically referenced coordinates without generic Google Maps noise.
3. **Retrieval-Augmented Generation (RAG)**: Drivers inquiring "When did I last perform a Sunday run?" invoke an isolated History Q&A pipeline (powered by pure SQL) that strictly answers natural language questions using fact-grounded `trip_history` and `trips` retrievals natively.
4. **CDL Compliance Assistant**: To answer regulatory and safety questions natively, the agent intercepts compliance requests via a PRE-ANSWER COMPLIANCE GATE and queries `pgvector` stored chunks of official CDL Manuals using high-confidence cosine similarity matching (0.65 threshold) with explicit code citations perfectly eliminating hallucinations.
5. **Resilient Rate Rotation Engines**: Heavy LangChain workloads easily trip commercial API limits. RoutAura leverages a `groq_rotator` hook to intercept HTTP 503 Overloads or 429 Statuses, transferring inference seamlessly to Google Gemini clusters on the fly so the end user never visualizes a failure state.
6. **Contextual LLMOps Tracking**: A specialized LangChain callback layer captures payload latencies, API prompt variations, success metrics, and token consumption statistics routing them directly into PostgreSQL arrays.
7. **Deterministic Route State Mutation**: Rather than trusting the LLM to remember and rewrite the user's entire multi-stop route array on every correction, RoutAura maintains strict deterministic state. Frontends inject the `current_route` into the backend context continuously, and the LLM merely interfaces with an atomic Python `@tool("modify_route")` to surgically alter precise positions without risking array drop-offs or hallucinated coordinates natively.
8. **Conversational Edge-Case Hardening**: The Agent utilizes strict systemic guardrails isolating hallucination events. Missing geography on brand-swaps triggers interactive clarifiers ("Which city should I look for Target in?"). Dedicated duplicate request deduplication applies `session_id` MD5 caching with 5-second TTL auto-expirations, preventing cross-session blocking natively.

---

## 📚 Technical Reference Sheets

Explore deep-dive technical reasoning and architectural workflows within the dedicated engineering specifications:

- **[Technical Specification & DB Schema](./TECHNICAL_SPEC.md)**: Master schema modeling definitions, LangChain structural deployments, state fallback diagrams, and explicit API endpoint contract payloads.
- **[Product Requirements Document (PRD)](./PRD.md)**: Targeted personas, exhaustive user impact variables, product featuresets, and hiring-showcase alignment.
- **[Project Plan & Roadmap](./PROJECT_PLAN.md)**: The iterative phased mapping of the complete software lifecycle tracking the monolith across all exactly completed 27 phases.
- **[Agent Control & Workflow Definitions](./CLAUDE.md)**: Standardized developer heuristics aligning collaborative toolings logic variables.

---

## 🚀 Running Locally

*Requires active API payloads across Supabase, Groq, and Google.*

### 1. Backend (FastAPI + PostgreSQL)
```bash
cd backend
uv install
source .venv/scripts/activate
# Required .env config overrides: GROQ_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY, DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
uvicorn app.main:app --reload --host 0.0.0.0
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev -- --host
```

Both environments bind seamlessly onto authenticated localports. Traffic is mediated securely through CORS pipelines against upstream Vercel/Railway instances matching your exact `CORS_ORIGINS` definitions.

---

*Mission complete. Ready for production usage.*
