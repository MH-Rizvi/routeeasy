# Technical Migration Log: SQLite + Custom JWT to Supabase

This document details the complete migration of the routaura backend infrastructure from a local, single-node SQLite stack to a cloud-native Supabase PostgreSQL and Supabase Auth implementation. This is designated as **Phase 20: Supabase Migration**.

---

## 1. What We Had Before (Original Stack)
Initially, routaura was built for rapid prototyping and local development validation:
- **Relational Database**: A local `routaura.db` file (SQLite) managed via SQLAlchemy.
- **Vector Database**: A local `./chroma_db` dictionary for embedding semantic search.
- **Authentication**: A custom JWT authentication system built completely from scratch:
  - `bcrypt` handled password hashing prior to SQL injection.
  - `python-jose` forged custom JSON Web Tokens specifying claims and expiration limits.
  - Generated an short-lived _Access Token_ (30 mins) and a long-lived _Refresh Token_ (7 days).
  - Tokens were returned inside HTTP Response payloads and assigned into `httpOnly` secure cookies.
  - The `get_current_user()` FastAPI dependency intercepted headers, unsnapped the signature via a local `SECRET_KEY`, extracted the payload, and checked SQLite.
- **Infrastructure limits**: All data was fundamentally housed on the ephemeral machine disk. It assumed single-node, single-instance execution.

## 2. Problems with the Old Approach
While perfect for the MVP phase, shipping a consumer Progressive Web App (PWA) on this foundation introduced major structural drawbacks:
- **Ephemeral Storage**: In standard cloud hosting environments (GCP Cloud Run, Render, Railway without custom volume claims), the local filesystem resets on every deployment. Our SQLite database and custom Auth store would be continuously purged.
- **Frictionless Auth Limitations**: The custom JWT login schema offered zero out-of-the-box support for:
  - Google / Social OAuth protocols.
  - Mandatory Email Verification loops.
  - "Forgot Password" resetting architectures.
  - Magic Link authentication flows.
- **Enterprise-Grade Typing**: Implementing proper Multi-Tenancy usually involves `UUID` tracking for distributed system partitioning, mapping string objects instead of autoincremented `INTEGER` primary keys.

## 3. What We Migrated To (New Stack)
To transition to a robust Production-Ready architecture, we adopted **Supabase**:
- **Relational DB Replacement**: Migrated from SQLite to **Supabase PostgreSQL** (cloud, persistent, free-tier scale). 
- **Auth Provider Replacement**: Removed custom JWT encoding libraries, migrating strictly to **Supabase Auth** for full user lifecycle management. 
  - Token creation, refreshing, and validation are now natively executed by Supabase's managed service using GoTrue.
  - The `/api/v1/auth/google` endpoint now successfully invokes `supabase.auth.sign_in_with_oauth({"provider": "google"})`.
  - The core FastAPI Auth Dependency now asks `supabase.auth.get_user(token)` to instantly validate active token strings against the active Keycloak-esque Supabase dashboard context.
- **Structural Upgrades**:
  - `user_id` types were shifted from `Integer` types to Postgres `UUID` types (Strings). This cascades across all internal tables.
  - Auth models were stripped from our local SQLAlchemy. Supabase autonomously manages the root `auth.users` instances, and we strictly maintain a `user_profiles` mapping table referencing their core ID.

## 4. Files Changed and Why

### Backend Environment Configuration
- **`pyproject.toml` (managed via `uv`)**:
  - Removals: `python-jose`, `bcrypt` (No longer self-managing crypto-signatures).
  - Additions: `supabase`, `gotrue` (Official SDKs), `psycopg2-binary`, `asyncpg` (Postgres drivers for SQLAlchemy).
- **`app/config.py`**: Added parameter mapping fields to load `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` respectively from `.env`.

### Database Schema Operations
- **`migrations/001_initial.sql`**: Created raw SQL commands to define our new tables since SQLite syntax does not cross-compile equivalently (particularly `SERIAL`, `TIMESTAMP WITH TIME ZONE`, and referencing `auth.users`).
- **`app/database.py`**: Adjusted `create_engine` parameters to inject the unified `DATABASE_URL` (mapped differently from the hardcoded `sqlite:///`) while passing `connect_args={"sslmode": "require"}` to authorize Supabase remote TLS connections. Removed SQLite-specific `PRAGMA` cascade injections.
- **`app/models.py`**: 
  - Erased the `User` class mapping. 
  - Mapped foreign `user_id` types to `String` (representing UUID objects) for `UserProfile`, `Trip`, `Stop`, `TripHistory`, and `LLMLog`. 
  - Nullified `User` cyclic relationship definitions.

### Authentication Routing Layer
- **`app/supabase_client.py``: New file. Initializes the uninstantiated backend `Client()` using the service-role key (to permit backend admin actions mapping custom JWT validation pipelines).
- **`app/auth.py`**: Pulled out the `get_password_hash()`, `verify_password()`, and `create_access_token()` boilerplate. Simplified `get_current_user` to rely solely on the native `supabase.auth.get_user(token)` API mapping.
- **`app/routers/auth.py`**: Rewrote the 5 primary endpoints (`/signup`, `/login`, `/google`, `/refresh`, `/me`) to be simple proxy requests firing payloads straight against the initialized `supabase.auth` client mappings.

### Type Hints & Service Dependencies
- **`app/agent/tools.py`**, **`app/agent/callbacks.py`**, **`app/agent/core.py`**: Swapped internal ContextVar typings for `user_id` parameters from `int` to `str`.
- **`app/services/trips_service.py`**, **`app/services/vector_service.py`**, **`app/services/rag_service.py`**, **`app/services/chroma_sync.py`**: Replaced all subroutines fetching matching values based on `user_id` parameters to type-hint `str` securely. Handled internal SQLite verifications referring back to `UserProfile` instead of `User`.
- **`app/routers/*.py` (Assorted)**: Changed dependency definitions from `current_user: models.User = Depends...` to `current_user: Any = Depends...` as the wrapper now natively invokes `gotrue.types.User` properties instead of SQLAlchemy mappings.

## 5. New Environment Variables Added
The local `.env` file requires population of four new attributes targeting the cloud PostgreSQL deployment:
1. `SUPABASE_URL`: The unique root API gateway provisioned for our tenant deployment.
2. `SUPABASE_ANON_KEY`: The anonymous REST access identity key used natively for standard non-elevated tasks on the public schemas. 
3. `SUPABASE_SERVICE_ROLE_KEY`: The elevated backend "God Mode" identifier enabling our FastAPI instance full CRUD capability ignoring Row Level Security (RLS) policies.
4. `DATABASE_URL`: Formatted as `postgresql://...`, defining our unpooled standard DSN protocol string the SQLAlchemy worker attaches into.

## 6. Database Schema
Executed manually via the Supabase Admin SQL Panel, these structured queries initialized the core routaura schema on Postgres:

```sql
-- User Profile metadata attached to the Root Supabase Auth system
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  full_location VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Core user saved route definitions
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_launched_at TIMESTAMP
);

-- Specific stops correlated sequentially to a parent Trip
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

-- LLM conversational launch sequences feeding RAG QA logic context
CREATE TABLE IF NOT EXISTS trip_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  trip_name VARCHAR(200),
  stop_count INTEGER DEFAULT 0,
  launched_at TIMESTAMP DEFAULT NOW(),
  total_miles FLOAT
);

-- LLMOps Telemetry / Tracking Model consumption
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

## 7. Auth Flow Comparison

### Before (Custom JWT via `bcrypt` / `python-jose`):
- Frontend submits JSON `{email, password}` to FastAPI application layer.
- Backend initiates Database query to SQLite, checking identical Email presence.
- `bcrypt.checkpw()` executes hash-against-hash validation locally on-disk.
- `python-jose` fires `jwt.encode` to cryptographically sign a localized `ACCESS_TOKEN` injected via the `.env` `SECRET_KEY`.
- Backend configures payload with Set-Cookie (`httpOnly`) bindings.
- Consequent API requests: FastAPI `verify_token` strips header, locally runs `jwt.decode()`, extracts the embedded ID property, and allows Request passing.

### After (Cloud Managed Supabase Auth):
- Frontend submits JSON `{email, password}` to FastAPI application layer.
- Backend wraps variables, performing HTTP POST upstream against `supabase.auth.sign_in_with_password()`.
- Supabase Core verifies identity mappings and immediately answers with cryptographically signed JSON Web Tokens native bounds.
- Backend streams the pre-constructed GoTrue JSON string identically to frontend context listeners.
- Consequent API requests: FastAPI `get_current_user()` hits `supabase.auth.get_user(token)`. A quick REST invocation asserts that the JWT corresponds securely with the active cloud tenancy. Passed through.

## 8. What Stayed the Same
Not every subcomponent needed refactoring:
- The **ChromaDB Vector Datastore** continues operating locally. Data persistence strategies will leverage remote Docker Volumes targeting physical node space limits vs offloading to Pinecone/Qdrant logic schemas.
- The **LangChain AI architecture** (Agent definitions, Tool call execution matrices, Prompt arrays).
- **Endpoint Structure**: None of our actual API endpoints (`/api/v1/auth/*`) drifted from their prior specifications.
- **Frontend Source Code**: Fully unmodified; the React application continues sending parameters matching identical keys to the identical domains.
- **FastAPI Routing Paradigm**: All dependencies resolving `Depends(get_db)` and similar contextual patterns continued serving exactly identically.

## 9. Lessons Learned
- **Type Cascading**: Moving from incremental `<Integer>` ids to complex `<UUID>` identifiers mandated recursive `str` type alterations spreading heavily through our secondary layer Service code components and Router parameter matrices.
- **SQLAlchemy Class Defections**: Wiping a core definition class like `models.User` heavily forces changes in all models pointing backward structurally (removing `relationships()`). This mandates cleaning Router type hints asserting against custom `User` properties.
- **ChromaDB Drift**: Wiping backend records mandates ensuring `vector_service` code logic purges corresponding embedding documents effectively. `sync_chroma_with_sql()` had to be refactored to verify valid UUID allocations inside directory namespaces and switch validation logic exclusively against the secondary `models.UserProfile`, ensuring robust garbage collection logic execution.
