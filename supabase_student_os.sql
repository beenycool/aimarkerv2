-- Student OS tables (Supabase / Postgres)
-- MVP identity model: student_id is a device UUID stored in localStorage.
-- NOTE: This is not authentication. If you want multi-device + accounts, add Supabase Auth later.

create extension if not exists "pgcrypto";

-- =========================
-- Settings
-- =========================
create table if not exists student_settings (
  student_id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  exam_year int not null default 2026,
  timezone text,

  session_length int not null default 25,
  max_sessions_per_day int not null default 2,
  unavailable_days int[] not null default '{}'::int[],

  light_week boolean not null default false,
  study_techniques_feed boolean not null default false,
  nightly_verification boolean not null default false,

  -- New Profile & Preference Fields
  name text,
  target_grade text default '7',
  notifications boolean default true,
  dark_mode boolean default false,
  study_hours_per_day integer default 2,
  preferred_study_time text default 'evening',

  -- AI API settings
  openrouter_enabled boolean default true,
  hackclub_enabled boolean default true
);

-- =========================
-- Subjects
-- =========================
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,

  name text not null,
  exam_board text,
  target_grade text,
  weekly_minutes int,
  tier text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subjects_student_name_unique unique (student_id, name)
);

create index if not exists subjects_student_id_idx on subjects(student_id);

-- =========================
-- Assessments (mocks, papers, quizzes)
-- =========================
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  subject_id uuid references subjects(id) on delete set null,

  kind text not null default 'mock', -- mock | past_paper | quiz
  date date,
  score int,
  total int,
  notes text,
  attachments jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_student_id_idx on assessments(student_id);
create index if not exists assessments_date_idx on assessments(date);

-- =========================
-- Question attempts (the main insight engine)
-- =========================
create table if not exists question_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  subject_id uuid not null references subjects(id) on delete cascade,
  assessment_id uuid references assessments(id) on delete set null,

  question_id text,
  question_text text,
  answer_text text,

  marks_awarded numeric,
  marks_total numeric,

  primary_flaw text,
  mistake_tags text[],

  feedback_md text,
  model_answer_md text,
  source text, -- ai | auto_regex | fallback

  attempted_at timestamptz not null default now()
);

create index if not exists question_attempts_student_time_idx on question_attempts(student_id, attempted_at desc);
create index if not exists question_attempts_subject_time_idx on question_attempts(subject_id, attempted_at desc);

-- =========================
-- Study sessions (planned vs completed)
-- =========================
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  subject_id uuid references subjects(id) on delete set null,

  session_type text not null, -- daily5 | block
  planned_for date not null,
  duration_minutes int,

  status text not null default 'planned', -- planned | done | missed
  items jsonb not null default '[]'::jsonb,
  reflection jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists study_sessions_student_planned_for_idx on study_sessions(student_id, planned_for);

-- =========================
-- Memory bank (editable personalization)
-- =========================
create table if not exists memory_bank_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,

  category text,
  content text not null,

  confidence int not null default 50,
  source text not null default 'user', -- user | ai
  last_confirmed timestamptz,

  archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_bank_items_student_idx on memory_bank_items(student_id);

-- =========================
-- Upcoming Exams (future exam tracking)
-- =========================
create table if not exists upcoming_exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  subject_id uuid references subjects(id) on delete set null,

  title text not null,
  exam_date date not null,
  exam_time time,
  duration_minutes int,
  location text,
  notes text,
  topics text[],

  source text not null default 'manual', -- manual | ai_parsed

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upcoming_exams_student_idx on upcoming_exams(student_id);
create index if not exists upcoming_exams_date_idx on upcoming_exams(exam_date);
