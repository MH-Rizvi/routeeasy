# RoutAura

**An Agentic AI route planner for professional drivers using LangChain, Fastembed, and Supabase.**

![RoutAura Interface UI](./frontend/public/icon.png)

RoutAura is a full-stack Progressive Web App (PWA) designed to solve the daily friction of manual route entry for professional drivers. Instead of typing addresses into Maps, drivers can simply chat with an AI Agent ("Do my usual morning school run"). The agent dynamically geocodes, parses intent, searches its local vector memory for past patterns, and generates deep links to automatically launch external navigation platforms.

Beyond utility, this repository is built to serve as a comprehensive portfolio showcase of modern **Agentic AI Engineering, LLMOps, and Full-Stack Development.**

---

## 🛠️ Technology Stack

**Frontend Layer:**
- **React 18 + Vite** (PWA configured)
- **Tailwind CSS v3** (Mobile-first dynamic styling)
- **Zustand** (Global state management)
- **Leaflet.js + OpenStreetMap** (Embedded previews)

**AI Orchestration & Infrastructure:**
- **LangChain** (ReAct Agent Core)
- **Groq API** (`llama-3.3-70b-versatile` for extremely fast inference) 
- **Fastembed** ONNX framework (`BAAI/bge-small-en-v1.5` for local, cost-free vector embeddings without bulky PyTorch dependencies)
- **ChromaDB** (Local semantic vector storage)

**Backend & Data Layer:**
- **FastAPI** (Python 3.12 async backend)
- **Supabase PostgreSQL** (Relational state & identity)
- **Supabase Auth** (Tokens & IAM)

**Cloud Deployment Architecture:**
- **Vercel** (Frontend static hosting & CD)
- **Railway** (Backend scalable containerized logic)

---

## 🏗️ System Architecture & Logic Flow

1. **ReAct Agent Core**: User inputs ("Go to the Co-Op then the hospital") are not blindly forwarded to an LLM. A true LangChain ReAct agent orchestrates multiple tools (semantic stops search, SQL database trip matching, and live Google Maps geocoding).
2. **True Semantic Memory**: Every driver's saved stop is embedded locally and stored in ChromaDB. "The Co-Op" instantly matches the specific lat/lng they usually go to, rather than generic web results.
3. **Retrieval-Augmented Generation (RAG)**: Drivers can ask historical questions ("What route did I do last Friday?"). The application seamlessly isolates the question, queries ChromaDB's history logs, and answers safely grounded purely on facts.
4. **Responsible AI Governance**: System input moderation blocks out-of-bounds agent queries immediately, reducing unauthorized LLM usage.
5. **LLMOps**: Granular telemetry on LangChain traces. Every invocation is tracked by token counts and execution latencies directly in the Postgres database layer.

---

## 📚 Technical Documentation (The Spokes)

Instead of overloading this README, the deep-dive technical reasoning and product specifications can be explored in the engineering documents below:

- **[Technical Specification & DB Schema](./TECHNICAL_SPEC.md)**: Full architecture definitions, Supabase schema diagrams, LangChain configurations, and HTTP API endpoint contracts.
- **[Product Requirements Document (PRD)](./PRD.md)**: Target user personas, User Stories, edge cases, feature prioritization, and engineering showcase mapping.
- **[Project Plan & Roadmap](./PROJECT_PLAN.md)**: The iterative phased approach of how this complex monolith was systematically deployed correctly.
- **[Agent Control & Workflow Definitions](./CLAUDE.md)**: Context document built explicitly to corral and standardize instructions for AI collaborative engineering tools.

---

## 🚀 Running Locally

### 1. Backend (FastAPI + ChromaDB)
```bash
cd backend
uv sync # Ensure uv is installed to handle fast dependency constraints
source .venv/scripts/activate
# Make sure .env has your GROQ_API_KEY, SUPABASE parameters, and GOOGLE_MAPS keys
uvicorn app.main:app --reload --host 0.0.0.0
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev -- --host
```

Both local environments will sync up instantly with the external Supabase and Groq pipelines.

---

*Open Source & Showcase Built.*
