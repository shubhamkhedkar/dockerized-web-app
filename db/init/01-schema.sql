-- Runs once, the first time the Postgres data volume is initialised.
CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL CHECK (char_length(title) > 0),
    done        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);

INSERT INTO tasks (title, done) VALUES
    ('Containerise the API with a multi-stage Dockerfile', TRUE),
    ('Add healthchecks to every service', TRUE),
    ('Isolate the database on an internal network', FALSE);
