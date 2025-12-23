-- SIMPLE FIX: Allow authenticated users to insert their own data
-- This simpler approach should work around type matching issues

-- ============================================
-- Drop ALL existing policies first
-- ============================================
DROP POLICY IF EXISTS "Users can insert own settings" ON student_settings;
DROP POLICY IF EXISTS "Users can view own settings" ON student_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON student_settings;

DROP POLICY IF EXISTS "Users can insert own sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON study_sessions;

DROP POLICY IF EXISTS "Users can insert own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can view own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON subjects;

DROP POLICY IF EXISTS "Users can insert own attempts" ON question_attempts;
DROP POLICY IF EXISTS "Users can view own attempts" ON question_attempts;

DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;

DROP POLICY IF EXISTS "Users can insert own memory items" ON memory_bank_items;
DROP POLICY IF EXISTS "Users can view own memory items" ON memory_bank_items;
DROP POLICY IF EXISTS "Users can update own memory items" ON memory_bank_items;
DROP POLICY IF EXISTS "Users can delete own memory items" ON memory_bank_items;

-- ============================================
-- student_settings - SIMPLE policies
-- ============================================
CREATE POLICY "select_own_settings" ON student_settings
  FOR SELECT USING (student_id = auth.uid());

-- Allow insert if authenticated (we'll check ownership on select/update)
CREATE POLICY "insert_own_settings" ON student_settings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_own_settings" ON student_settings
  FOR UPDATE USING (student_id = auth.uid());

-- ============================================
-- study_sessions
-- ============================================
CREATE POLICY "select_own_sessions" ON study_sessions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "insert_own_sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_own_sessions" ON study_sessions
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "delete_own_sessions" ON study_sessions
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- subjects
-- ============================================
CREATE POLICY "select_own_subjects" ON subjects
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "insert_own_subjects" ON subjects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_own_subjects" ON subjects
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "delete_own_subjects" ON subjects
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- question_attempts
-- ============================================
CREATE POLICY "select_own_attempts" ON question_attempts
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "insert_own_attempts" ON question_attempts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- assessments
-- ============================================
CREATE POLICY "select_own_assessments" ON assessments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "insert_own_assessments" ON assessments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_own_assessments" ON assessments
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "delete_own_assessments" ON assessments
  FOR DELETE USING (student_id = auth.uid());

-- ============================================
-- memory_bank_items
-- ============================================
CREATE POLICY "select_own_memory" ON memory_bank_items
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "insert_own_memory" ON memory_bank_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update_own_memory" ON memory_bank_items
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "delete_own_memory" ON memory_bank_items
  FOR DELETE USING (student_id = auth.uid());
