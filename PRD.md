# Product Requirements Document (PRD)
## RoutAura — Agentic AI Trip Planner for Bus Drivers
### Portfolio Showcase Edition — Built for GenAI / Agentic AI Engineer Roles

**Version:** 2.0  
**Date:** March 2026  
**Status:** Deployed to Production (Railway Backend + Vercel Frontend)

---

## 1. Project Overview

### 1.1 Problem Statement
School bus drivers and professional drivers manually re-enter the same routes and stops into Google Maps every single day. There is no tool that lets them describe a route in plain language, save it permanently, and re-launch it with a single tap. Existing tools require exact addresses and have zero memory of past trips.

### 1.2 Solution
RoutAura is a Progressive Web App powered by a **LangChain-orchestrated AI agent** that lets drivers describe their trips in plain, conversational language. The agent uses specialised tools to geocode stops, perform semantic similarity search against saved trips, and answer natural language questions about trip history via a RAG pipeline. Every saved stop and trip is embedded and stored in **ChromaDB**, enabling intelligent fuzzy recall — so saying "the usual school run" retrieves the right saved trip automatically, even if those exact words were never used. Trips are additionally saved to **Supabase PostgreSQL** for structured relational storage.

### 1.3 Why This Is a True Agentic AI System
RoutAura is not a chatbot that calls an LLM and formats the output. It is a **true agentic AI system** where the LLM reasons about which tools to call, in what order, based on the driver's intent — and loops until the task is complete. This mirrors production Agentic AI engineering patterns found in enterprise systems.

The agent reasoning chain for a typical request:
```
Driver says: "do my usual monday morning run"

Agent Step 1 → THOUGHT: This sounds like a recalled saved trip.
Agent Step 1 → ACTION: search_saved_trips("monday morning school run")
Agent Step 1 → OBSERVATION: Found "Morning School Run", similarity 0.91

Agent Step 2 → THOUGHT: High confidence match. Confirm with driver before proceeding.
Agent Step 2 → ACTION: [return confirmation message to driver]

Driver confirms → Agent Step 3 → ACTION: get_trip_by_id(3)
Agent Step 3 → OBSERVATION: Trip with 5 stops returned.
Agent Step 3 → THOUGHT: Task complete. Return stop list.
```

### 1.4 Project Goals
- Eliminate daily friction of re-entering routes for bus drivers
- Demonstrate production-grade GenAI engineering: LangChain agents, RAG, vector databases, embeddings, LLMOps, and responsible AI
- Ship a working product — not a Jupyter notebook or a demo script

---

## 2. Target Users

| User Type | Description |
|-----------|-------------|
| **Primary** | School bus drivers with fixed daily routes |
| **Secondary** | Private hire drivers doing repeated runs |
| **Secondary** | Care workers doing daily home visit rounds |
| **Showcase Audience** | Engineering hiring managers evaluating GenAI / Agentic AI skills |

**Primary Persona — "Dave the Bus Driver"**  
Age 45–60, not highly technical, uses a smartphone daily but hates complex apps. Drives the same 3–4 routes most days. Needs to start navigating within seconds of opening the app.

---

## 3. Core Features

### 3.1 Feature List

| # | Feature | Priority | GenAI Tech Demonstrated |
|---|---------|----------|--------------------------|
| F1 | Chat-style trip input (conversational UI) | Must Have | — |
| F2 | LangChain ReAct Agent orchestrating all AI logic | Must Have | LangChain Agents |
| F3 | Geocoding Tool (agent calls Google Geocoding API as a tool) | Must Have | Agentic Tool Use |
| F4 | Semantic Stop Search Tool (vector similarity lookup) | Must Have | ChromaDB, Embeddings |
| F5 | Semantic Trip Search Tool (fuzzy trip recall) | Must Have | Semantic Search |
| F6 | RAG Trip History Q&A ("what route did I do last Friday?") | Must Have | RAG Pipeline |
| F7 | Stop preview list — editable, drag-to-reorder | Must Have | — |
| F8 | Google Maps / Apple Maps deep link navigation launch | Must Have | — |
| F9 | Save trip to Supabase PostgreSQL (structured) + ChromaDB (vector) | Must Have | Hybrid Vector Storage |
| F10 | Saved trips library with semantic search bar | Must Have | Semantic Search UI |
| F11 | Quick-launch home screen (big tap cards) | Should Have | — |
| F12 | Voice input (Web Speech API) | Should Have | — |
| F13 | Per-stop notes and trip notes | Should Have | — |
| F14 | Trip history log | Should Have | — |
| F15 | Agent clarification dialogue (asks follow-up if ambiguous) | Should Have | Agentic Reasoning |
| F16 | LLMOps: token usage logging + prompt version tracking | Should Have | LLMOps |
| F17 | Responsible AI: input moderation before agent invocation | Could Have | AI Governance |
| F18 | User Authentication: Multi-step signup, JWT tokens, bcrypt | Must Have | Security & Auth |
| F19 | User Data Isolation: Per-user PostgreSQL & ChromaDB namespacing | Must Have | Data Privacy |
| F20 | Stats Dashboard: Daily/weekly mileage & trip metrics | Should Have | Data Visualization |
| F21 | Public Landing Page: Live AI demo, features, FAQ, footer | Must Have | Product Marketing |
| F22 | Demo Mode Agent: Unauthenticated rate-limited agent chat | Must Have | API Rate Limiting |

---

## 4. Agentic AI Features — Detailed

### F2 — LangChain ReAct Agent

The heart of the system. A **LangChain ReAct (Reasoning + Acting) agent** powered by Groq (Llama 3.3 70b). Instead of a single structured LLM call, the agent iterates through Thought → Action → Observation cycles until it resolves the driver's request. This is the canonical pattern for production agentic systems.

**Agent tools registered:**

| Tool Name | Description | Showcases |
|-----------|-------------|-----------|
| `geocode_stop` | Resolves a place name or address to lat/lng via Google Geocoding API | Tool use, external API integration |
| `search_saved_stops` | Semantic similarity search over ChromaDB stop embeddings | Vector DB, embeddings, semantic search |
| `search_saved_trips` | Semantic similarity search over ChromaDB trip embeddings | RAG-adjacent retrieval |
| `get_trip_by_id` | Fetches a full trip with all stops from PostgreSQL | Structured data retrieval |
| `get_recent_history` | Returns recent trip launches for RAG context | History retrieval |

### F4 + F5 — Vector Semantic Search (ChromaDB)

Every saved stop and saved trip is embedded using **fastembed** (`BAAI/bge-small-en-v1.5`) via ONNX runtime (to stay within Railway's tight RAM limits by avoiding PyTorch) and stored in ChromaDB. Two collections are maintained: `stops_collection` and `trips_collection`.

This replaces the naive aliases/keyword-matching approach with **true semantic memory**. The driver never has to set up shortcuts — the system learns what they mean from context and similarity.

Examples of what this enables:
- "the co-op" → retrieves "Co-operative Food, 14 Elm Road, NY" (saved stop) via cosine similarity
- "the long afternoon route" → retrieves "Extended PM School Run" trip with 0.87 similarity
- "school" in the search bar → returns all trips involving any school, even if named differently

### F6 — RAG Trip History Q&A

Drivers can ask natural language questions about their trip history directly in chat. The system uses a full **Retrieval-Augmented Generation pipeline**:

1. Driver asks: "Have I been to Oak Avenue before?"
2. System embeds the question with `fastembed`
3. ChromaDB retrieves top-k most relevant history entries by cosine similarity
4. Retrieved entries are formatted as a context block
5. Groq (Llama 3.3 70b) generates a grounded answer from the retrieved context
6. Answer is returned to driver in chat

This is genuine RAG — not keyword search, not hallucination. The LLM's answer is grounded in real retrieved data.

### F16 — LLMOps: Token Usage Logging and Prompt Versioning

Every LLM call is intercepted by a LangChain callback handler that logs: timestamp, model name, prompt version tag, input token count, output token count, latency in ms, and success/failure status. All logs are stored in a `llm_logs` table in PostgreSQL and exposed via a `/admin/llm-logs` endpoint.

Prompt templates are stored as versioned strings (e.g., `SYSTEM_PROMPT_v1`, `SYSTEM_PROMPT_v2`) with the active version configurable via environment variable. This enables A/B testing of prompts without code changes.

### F17 — Responsible AI: Input Moderation

Before any user message reaches the LangChain agent, it passes through a lightweight **moderation check** — a fast Groq LLM call with a safety-focused system prompt that classifies the input as safe or unsafe. If flagged, the system returns a polite decline without invoking the agent. This adds a responsible AI governance layer and demonstrates awareness of AI safety practices expected in enterprise GenAI roles.

---

## 5. User Stories

**Trip Creation**
- As a driver, I want to describe my route in plain words and have the AI work out the stops, so I never have to type an exact address.
- As a driver, I want the AI to ask me one clear question if it's unsure about a stop, rather than guessing.
- As a driver, I want to say "do my usual Monday run" and have the system find it automatically without me searching.

**Semantic Search and Memory**
- As a driver, I want to type "school" in the trips list and see all trips that go to any school, even if the trip name doesn't include the word "school".
- As a driver, I want the system to recognise "the co-op" as the Co-operative store I've stopped at before, without any manual alias setup.

**RAG History**
- As a driver, I want to ask "what route did I do last Friday?" and get a real answer based on my actual launch history.
- As a driver, I want to ask "have I been to Park Road before?" and get a definitive yes or no grounded in my history.

**Navigation and Saving**
- As a driver, I want to tap one button to open Google Maps with all stops pre-loaded, so I can start driving immediately.
- As a driver, I want to save a trip I just created so I can re-launch it tomorrow in one tap.
- As a driver, I want to add a note to a saved trip like "wait 5 mins at Oak Ave — child is slow."

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Full agent reasoning chain (including tool calls) within 8 seconds |
| **Vector Search** | Semantic stop/trip retrieval within 500ms |
| **Offline** | Saved trips viewable and launchable without internet |
| **Accessibility** | Min 48x48px touch targets, min 16px body text, high contrast |
| **Platform** | Mobile-first PWA — iOS Safari + Android Chrome |
| **Observability** | 100% of LLM calls logged with token count and latency |
| **Responsible AI** | All user inputs pass moderation before reaching agent |

---

## 7. Out of Scope (V1)

- Custom turn-by-turn navigation
- Fleet manager dashboard (admin override)
- Fine-tuning or custom model training
- Real-time traffic data or ETA prediction
- Payments or subscriptions

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Time to create first trip via chat | < 2 minutes |
| Time to re-launch a saved trip | < 10 seconds |
| Semantic stop match accuracy on previously seen stops | > 85% |
| Agent correct tool selection on first reasoning step | > 90% |
| RAG: grounded answer returned for history queries | > 80% |
| LLM calls successfully logged | 100% |

---

## 9. Portfolio / Showcase Mapping

This project demonstrates every required and nice-to-have skill from the target job description:

| Job Description Requirement | RoutAura Implementation |
|-----------------------------|--------------------------|
| Strong Python | Entire backend in Python 3.12+ |
| LLM experience (Anthropic, OpenAI, HuggingFace) | Groq API (Llama 3.3 70b) via LangChain; Fastembed ONNX embeddings |
| LangChain / LlamaIndex / CrewAI | LangChain ReAct agent with 5 registered custom tools |
| Vector databases + embeddings + semantic search | ChromaDB with `BAAI/bge-small-en-v1.5` embeddings, cosine similarity search |
| RAG pipelines | Trip history Q&A with full retrieve → augment → generate pipeline |
| Cloud deployment | Railway (Backend) + Vercel (Frontend) |
| Building production GenAI applications | End-to-end working product with real users |
| Product & Growth Engineering | Public marketing Landing Page with interactive unauthenticated live agent demo |
| LLMOps / MLOps | Token logging, prompt versioning, LangChain callback handlers |
| AI security / governance / responsible AI | Input moderation layer before agent invocation |
