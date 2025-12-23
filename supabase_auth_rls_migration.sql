-- Supabase Auth RLS Migration
-- This enables Row Level Security on all Student OS tables
-- Run this in your Supabase SQL Editor or via migrations

-- ============================================
-- Enable Row Level Security on all tables
-- ============================================
ALTER TABLE student_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_bank_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- student_settings Policies
-- ============================================
CREATE POLICY "Users can view own settings" ON student_settings
  FOR SELECT USING (
    student_id = auth.uid() OR 
    student_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own settings" ON student_settings
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR 
    auth.uid() IS NULL  -- Allow anonymous inserts
  );

CREATE POLICY "Users can update own settings" ON student_settings
  FOR UPDATE USING (student_id = auth.uid());

-- ============================================
-- subjects Policies
-- ============================================
CREATE POLICY "Users can view own subjects" ON subjects
  FOR SELECT USING (
    student_id = auth.uid() OR
    student_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own subjects" ON subjects
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR 
    auth.uid() IS NULL
  );

CREATE POLICY "Users can update own subjects" ON subjects
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Users can delete own subjects" ON subjects
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- assessments Policies
-- ============================================
CREATE POLICY "Users can view own assessments" ON assessments
  FOR SELECT USING (
    student_id = auth.uid() OR
    student_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own assessments" ON assessments
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR 
    auth.uid() IS NULL
  );

CREATE POLICY "Users can update own assessments" ON assessments
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Users can delete own assessments" ON assessments
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- question_attempts Policies
-- ============================================
CREATE POLICY "Users can view own attempts" ON question_attempts
  FOR SELECT USING (
    student_id = auth.uid() OR
    student_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own attempts" ON question_attempts
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR 
    auth.uid() IS NULL
  );

-- ============================================
-- study_sessions Policies
-- ============================================
CREATE POLICY "Users can view own sessions" ON study_sessions
  FOR SELECT USING (
    student_id = auth.uid() OR
    student_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own sessions" ON study_sessions
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR 
    auth.uid() IS NULL
  );

CREATE POLICY "Users can update own sessions" ON study_sessions
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Users can delete own sessions" ON study_sessions
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- memory_bank_items Policies
-- ============================================
CREATE POLICY "Users can view own memory items" ON memory_bank_items
  FOR SELECT USING (
    student_id = auth.uid() OR
    student_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can insert own memory items" ON memory_bank_items
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR 
    auth.uid() IS NULL
  );

CREATE POLICY "Users can update own memory items" ON memory_bank_items
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Users can delete own memory items" ON memory_bank_items
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- Notes:
-- ============================================
-- 1. These policies allow authenticated users to access only their own data
-- 2. Anonymous inserts are allowed (auth.uid() IS NULL) for guest users
-- 3. SELECT policies also check the JWT sub claim for localStorage UUID fallback
-- 4. For production, consider tightening the anonymous policies
-- 5. Run this AFTER enabling Email Auth in Supabase dashboard
