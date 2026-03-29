-- Optional: run in Supabase SQL Editor to create schema matching PRIME API models.
-- Skip if you let the API create tables on startup (Base.metadata.create_all).

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    gender VARCHAR(50),
    security_q1 TEXT,
    security_q2 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    address TEXT NOT NULL,
    day VARCHAR(50) NOT NULL,
    month VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_appointments_user_id ON public.appointments (user_id);
