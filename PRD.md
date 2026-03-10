# Product Requirements Document (PRD)
## RoutAura — Agentic AI Trip Planner for Professional Drivers
### Portfolio Showcase Edition — Built for GenAI / Agentic AI Engineer Roles

**Version:** 2.0  
**Date:** March 2026  
**Status:** Deployed via Railway/Vercel (Production)

---

## 1. Project Overview

### 1.1 Problem Statement
School bus drivers and professional logistics contractors manually re-enter identical routes into generic navigation platforms continuously. There exists no persistent navigation assistant that allows drivers to express routes natively via conversational prompts, securely binding those parameters, and actively retrieving them later. Common platforms demand strict inputs and possess zero long-term memory of distinct routing patterns.

### 1.2 Solution
RoutAura is a robust Progressive Web App powered by a **LangChain-orchestrated Zero-Shot ReAct AI agent** empowering users to command routes conversationally natively. The deployed Agent isolates intent, engages custom backend toolkits to geocode ambiguous addresses via dynamic state-biasing parameters, and semantically assesses historical similarities using embedded cosine logic against historic domains natively. 

Every route config is explicitly embedded locally within **ChromaDB** enabling ultra-fast deep semantic fuzzy recall (e.g. "The usual PM run"). Master domain data is secured via **Supabase PostgreSQL** offering relational indexing natively.

### 1.3 Agentic Engineering Architectures
RoutAura avoids archaic direct-LLM generation paradigms representing naive Chatbot workflows. It simulates enterprise agentic system deployments safely:

```
Driver says: "do my usual monday morning run"

Agent Step 1 → THOUGHT: The driver wants to load a saved trip.
Agent Step 1 → ACTION: search_saved_trips("monday morning school run")
Agent Step 1 → OBSERVATION: Found "Morning School Run", similarity 0.91

Agent Step 2 → THOUGHT: High confidence match. I must confirm first.
Agent Step 2 → ACTION: [Returns a formatted confirmation payload implicitly natively]

Driver confirms → Agent Step 3 → ACTION: get_trip_by_id(UUID_XYZ)
Agent Step 3 → OBSERVATION: Trip array successfully parsed.
Agent Step 3 → THOUGHT: Task complete. Output the coordinates for routing endpoints natively.
```

### 1.4 Core Objectives
- Annihilate manual geographic data-entry friction for professional operators.
- Construct a pristine portfolio explicitly demonstrating complex Agentic Engineering, RAG indexing schemas, Vector embeddings natively over Cloud architectures, and Deep Multi-LLM Routing constraints.
- Maintain a premium, aesthetically fluid Glassmorphism UI ensuring maximum accessibility globally natively.

---

## 2. Target Users

| User Type | Description |
|-----------|-------------|
| **Primary** | School bus operators assigned rigid daily sequence parameters natively |
| **Secondary** | Medical transport professionals engaging repetitive regional runs |
| **Showcase Audience** | Senior Engineering Hiring Managers evaluating LLMOps, Cloud deployments, and secure Auth frameworks natively |

---

## 3. Core Featuresets

| # | Feature | GenAI Tech Demonstrated |
|---|---------|--------------------------|
| F1 | Multi-Model LLM Rotation Fallbacks (`groq_rotator`) | Intelligent rate-limit mitigation (Groq to Gemini) |
| F2 | LangChain Zero-Shot ReAct Orchestration | Autonomous tool looping logic natively |
| F3 | Single-Parameter Geocoding Extractor Logic | LLM State disambiguation parsing natively |
| F4 | Semantic Stop Search (Vector cosine similarity) | Local AI embeddings (`fastembed`), ChromaDB |
| F5 | Semantic Trip Recall (Fuzzy historical searching) | Advanced Context Parsing |
| F6 | RAG Trip History QA System | True Retrieval-Augmented Generation execution globally natively |
| F7 | Supabase PostgreSQL Identity Persistence | Hybrid local/cloud Auth + SQL architectures |
| F8 | Local JWT Validation Pipelines (`python-jose`) | Zero-latency Auth processing architectures natively |
| F9 | Premium Glassmorphism UI Grids | Modern Frontend Architecture parameters |
| F10 | LLMOps Tracking Dashboards | Native tracing parameters (Latency, Version parameters) explicitly |
| F11 | Public/Secure Hybrid Landing Page Logic | Dynamic React routing definitions natively |
| F12 | Deterministic Route State Mutation | Python managed atomic array swaps via `modify_route` natively |
| F13 | Conversational Edge-Case Hardening | Interactive tool confirmation loops, anti-hallucination prompts, session hashing |

---

## 4. Agentic Integrations (Detailed)

### F1 + F2 — Multi-Model LLM Fleets & LangChain ReAct
The Agent core operates principally on the **Groq API (`llama-3.3-70b-versatile`)**. Should inferencing thresholds peak (HTTP 429 / 503 limits), requests are natively diverted through a custom `groq_rotator` array, migrating parameters gracefully against equivalent **Google Gemini (`gemini-2.5-flash`)** models silently natively guaranteeing continuous operational stability. 

### F4 + F5 — Vector Semantic Memory (`fastembed` + ChromaDB)
Identities are mapped locally into persistent nested Chroma namespaces mapping explicitly over dynamic `fastembed` (`BAAI/bge-small-en-v1.5`) models. No API keys are consumed to embed documents natively over Railway containers.

Example operations:
- "The farm" → Embeds naturally resolving to "185 Rural Dr, TX" with a >0.87 cosine score explicitly.

### F6 — RAG Deep Historical QA 
Drivers query their log archives verbally.
1. User: "When did I last perform the East Side Route?"
2. System embeds string converting logic seamlessly against historic domain targets natively retrieving top-K entries mathematically.
3. System injects historic blocks dynamically inside restricted generic templates.
4. Llama 3.3 isolated instance generates purely grounded answers cleanly avoiding massive LLM hallucinations effectively natively.

### F10 — Deep LLMOps Tracing
System configurations explicitly track token expenditure inputs/outputs, iteration latency metrics natively over `llm_logs` PostgreSQL containers exposed through native visualization bounds explicitly.

---

## 5. Non-Functional Architecture Traits

| Category | Requirement |
|----------|-------------|
| **System Resiliency** | Sub-system fallback APIs engaged silently upon core inferencing delays >10s |
| **Response Latency** | Local JWT mappings executed at 0ms. Vector searches <500ms natively |
| **Cross-Platform** | Fluid operations bounding across native iOS rendering cores + Apple Maps hooks explicitly |
| **Accessibility** | 16-20px body sizing parameters featuring deep Dark Mode aesthetic mapping natively |
| **Platform CI/CD** | Dynamic Git commits triggering instantaneous isolated backend containerization securely matching CDN edge deployments globally |

---

## 6. Real-World Engineering Showcase Alignment

RoutAura natively illustrates direct experience matrices heavily required against elite AI engineering deployments specifically:

| Job Description Expectation | RoutAura Deployment Paradigm |
|-----------------------------|--------------------------|
| Complex Backend Orchestration natively | Python 3.12+ FastAPI |
| Deep Multi-LLM API Integrations | Groq APIs gracefully bridging Google Gemini endpoints defensively |
| Robust Semantic AI Integrations | Single-node explicit `fastembed` bounding ChromaDB namespaces |
| Genuine RAG application deployment | Functional user-interactive QA log architectures natively |
| Production Container Cloud scaling | Railway App clusters binding generic Supabase endpoints natively |
| UI/UX Consumer Architectures | Dynamic CSS Grid manipulations building active Glassmorphism logic arrays natively |
| Secure API Identity brokering | Deep native Supabase OAuth setups bypassing manual data-entry limits |  
| LLMOps Analytical processing | Explicit LangChain callback handlers injecting metrics implicitly logging over PostgreSQL matrices | 

_RoutAura is production ready._
