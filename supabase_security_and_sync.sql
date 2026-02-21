-- Security Patch: Fix insecure INSERT policies
-- Enforce student_id = auth.uid() for all inserts

-- Drop insecure policies from supabase_fix_rls.sql
DROP POLICY IF EXISTS "insert_own_settings" ON student_settings;
DROP POLICY IF EXISTS "insert_own_sessions" ON study_sessions;
DROP POLICY IF EXISTS "insert_own_subjects" ON subjects;
DROP POLICY IF EXISTS "insert_own_attempts" ON question_attempts;
DROP POLICY IF EXISTS "insert_own_assessments" ON assessments;
DROP POLICY IF EXISTS "insert_own_memory" ON memory_bank_items;

-- Create secure policies enforcing student_id ownership
CREATE POLICY "insert_own_settings" ON student_settings
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "insert_own_sessions" ON study_sessions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "insert_own_subjects" ON subjects
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "insert_own_attempts" ON question_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "insert_own_assessments" ON assessments
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "insert_own_memory" ON memory_bank_items
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- New Feature: Sync Exam Sessions
CREATE TABLE IF NOT EXISTS active_exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paper_id TEXT NOT NULL,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, paper_id)
);

ALTER TABLE active_exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own active sessions" ON active_exam_sessions
    FOR ALL USING (student_id = auth.uid());
