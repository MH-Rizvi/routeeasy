CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  full_location VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_launched_at TIMESTAMP
);
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
CREATE TABLE IF NOT EXISTS trip_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  trip_name VARCHAR(200),
  stop_count INTEGER DEFAULT 0,
  launched_at TIMESTAMP DEFAULT NOW(),
  total_miles FLOAT
);
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
