-- ============================================================
-- Supabase Migration: mood_checkins table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood       SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy     SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  stress     SMALLINT NOT NULL CHECK (stress BETWEEN 1 AND 5),
  note       TEXT,
  tags       TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_created
  ON public.mood_checkins (user_id, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — users can only access their own rows
CREATE POLICY "Users can insert own mood checkins"
  ON public.mood_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own mood checkins"
  ON public.mood_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own mood checkins"
  ON public.mood_checkins
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood checkins"
  ON public.mood_checkins
  FOR DELETE
  USING (auth.uid() = user_id);
