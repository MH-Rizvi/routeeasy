BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS trip_history_vectors (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  trip_history_id INTEGER REFERENCES trip_history(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  embedding       vector(384)
);

CREATE INDEX IF NOT EXISTS trip_history_vectors_embedding_idx
ON trip_history_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE TABLE IF NOT EXISTS compliance_chunks (
  id           SERIAL PRIMARY KEY,
  content      TEXT NOT NULL,
  embedding    vector(384),
  jurisdiction VARCHAR(20),
  source       VARCHAR(200),
  chapter      VARCHAR(200),
  section      VARCHAR(100),
  page         INTEGER,
  doc_type     VARCHAR(50),
  state        VARCHAR(10)
);

CREATE INDEX IF NOT EXISTS compliance_chunks_embedding_idx
ON compliance_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMIT;