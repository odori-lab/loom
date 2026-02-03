-- Loom MVP Database Schema
-- Run this in Supabase SQL Editor

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Looms table
CREATE TABLE IF NOT EXISTS public.looms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  thread_username TEXT NOT NULL,
  thread_display_name TEXT,
  post_count INTEGER NOT NULL DEFAULT 0,
  pdf_path TEXT NOT NULL,
  cover_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS looms_user_id_idx ON public.looms(user_id);
CREATE INDEX IF NOT EXISTS looms_created_at_idx ON public.looms(created_at DESC);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.looms ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Looms policies
CREATE POLICY "Users can view own looms" ON public.looms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own looms" ON public.looms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own looms" ON public.looms
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for PDFs (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('looms-pdf', 'looms-pdf', false);

-- Storage policies
-- CREATE POLICY "Users can upload own PDFs" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'looms-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own PDFs" ON storage.objects
--   FOR SELECT USING (bucket_id = 'looms-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own PDFs" ON storage.objects
--   FOR DELETE USING (bucket_id = 'looms-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);
