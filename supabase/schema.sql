-- supabase/schema.sql
-- 
-- PostgreSQL Database Schema for Rubato Guitar Academy
-- This script safely drops existing tables and recreates the full schema
-- with Row Level Security (RLS) enabled.

-------------------------------------------------------------------------------
-- 0. Cleanup (Safe Drops)
-------------------------------------------------------------------------------
DROP TABLE IF EXISTS "public"."practice_sessions" CASCADE;
DROP TABLE IF EXISTS "public"."lesson_progress" CASCADE;
DROP TABLE IF EXISTS "public"."user_progress" CASCADE;
DROP TABLE IF EXISTS "public"."user_settings" CASCADE;
DROP TABLE IF EXISTS "public"."profiles" CASCADE;

-------------------------------------------------------------------------------
-- 1. Profiles Table
-- Managed via Supabase Auth triggers and updated by Stripe webhooks
-------------------------------------------------------------------------------
CREATE TABLE "public"."profiles" (
  "id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "display_name" TEXT,
  "subscription_tier" TEXT DEFAULT 'free',      -- 'free', 'pro', etc.
  "subscription_status" TEXT DEFAULT 'inactive',  -- 'active', 'canceled', etc.
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON "public"."profiles" FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile (display name, etc.)
CREATE POLICY "Users can update own profile" 
ON "public"."profiles" FOR UPDATE 
USING (auth.uid() = id);

-- Trigger: Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-------------------------------------------------------------------------------
-- 2. User Settings Table
-------------------------------------------------------------------------------
CREATE TABLE "public"."user_settings" (
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "theme" TEXT DEFAULT 'dark',
  "preferred_root" TEXT DEFAULT 'C',
  "preferred_voicing_type" TEXT DEFAULT 'drop2',
  "show_intervals" BOOLEAN DEFAULT true,
  "metronome_volume" REAL DEFAULT 0.5,
  "default_bpm" INTEGER DEFAULT 80,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY ("user_id")
);

ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" 
ON "public"."user_settings" FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 3. User Progress (Global aggregates)
-------------------------------------------------------------------------------
CREATE TABLE "public"."user_progress" (
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "modules_unlocked" INTEGER[] DEFAULT ARRAY[1, 2]::INTEGER[],
  "current_streak" INTEGER DEFAULT 0,
  "last_practice_date" BIGINT, -- Stored as Unix epoch milliseconds to match Zustand
  "total_practice_minutes" INTEGER DEFAULT 0,
  "overall_accuracy" REAL DEFAULT 0.0,
  "sessions_completed" INTEGER DEFAULT 0,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY ("user_id")
);

ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress" 
ON "public"."user_progress" FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 4. Lesson Progress (Per-lesson granular tracking)
-------------------------------------------------------------------------------
CREATE TABLE "public"."lesson_progress" (
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "lesson_key" TEXT NOT NULL, -- Format: "mod1_lesson0"
  "completed" BOOLEAN DEFAULT false,
  "accuracy" REAL,
  "practice_time" INTEGER,
  "last_accessed" TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY ("user_id", "lesson_key")
);

ALTER TABLE "public"."lesson_progress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson progress" 
ON "public"."lesson_progress" FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- 5. Practice Sessions (Append-only historical log)
-------------------------------------------------------------------------------
CREATE TABLE "public"."practice_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "duration_minutes" REAL NOT NULL,
  "accuracy" REAL,
  "chords_practiced" TEXT[],
  "bpm" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY ("id")
);

ALTER TABLE "public"."practice_sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions" 
ON "public"."practice_sessions" FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" 
ON "public"."practice_sessions" FOR SELECT 
USING (auth.uid() = user_id);

-------------------------------------------------------------------------------
-- Trigger to set updated_at
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON "public"."user_settings"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_user_progress_updated_at
  BEFORE UPDATE ON "public"."user_progress"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
