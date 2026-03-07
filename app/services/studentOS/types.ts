export interface PerformanceStatsBase {
  earned: number;
  total: number;
  count: number;
}

export interface AIPreferences {
  parsing: { enabled: boolean; provider: string; model: string };
  grading: { enabled: boolean; provider: string; model: string };
  tutor: { enabled: boolean; provider: string; model: string };
  planning: { enabled: boolean; provider: string; model: string };
  hints: { enabled: boolean; provider: string; model: string };
  verification: { enabled: boolean; provider: string; model: string };
}

export interface CustomAPIConfig {
  openai_endpoint?: string;
  openai_key?: string;
  gemini_key?: string;
  search_strategy?: string;
  hackclub_search_key?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  label?: string;
}

export interface StudentSettings {
  id?: string;
  student_id: string;
  student_name?: string; // from schema?
  hackclub_key?: string; // from schema?
  exam_year: number;
  timezone: string | null;
  session_length: number;
  max_sessions_per_day: number;
  unavailable_days: string[];
  light_week: boolean;
  study_techniques_feed: boolean;
  nightly_verification: boolean;
  openrouter_enabled: boolean;
  hackclub_enabled: boolean;
  custom_api_config: CustomAPIConfig;
  ai_preferences: AIPreferences;
  dark_mode: boolean;
  name: string | null;
  target_grade: string;
  notifications: boolean;
  preferred_study_time: 'morning' | 'afternoon' | 'evening' | 'any';
  preferred_time_slots: string[];
  busy_periods: TimeSlot[];
  updated_at?: string;
  created_at?: string;
}

export interface Subject {
  id: string; // Made required for read operations
  student_id: string;
  name: string;
  exam_board: string | null;
  target_grade: string | null;
  weekly_minutes: number | null;
  tier: string | null;
  created_at?: string;
}

export interface QuestionAttempt {
  id?: string;
  student_id: string;
  subject_id: string | null;
  question_id?: string;
  marks_awarded: number;
  marks_total: number;
  primary_flaw: string | null;
  question_type: string | null;
  attempted_at: string;
  answer_text?: string;
  feedback_text?: string;
}

export interface StudySession {
  id?: string;
  student_id: string;
  subject_id: string | null;
  session_type: 'daily5' | 'scheduled' | 'ai_planned';
  planned_for: string; // ISO Date (YYYY-MM-DD)
  duration_minutes: number;
  status: 'planned' | 'done' | 'skipped';
  items: any[];
  notes: string | null;
  topic: string | null;
  start_time: string | null;
  reflection?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryItem {
  id?: string;
  student_id: string;
  content: string;
  tags?: string[];
  archived: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssessmentAttachment {
  name: string;
  path: string;
  type?: string;
}

export interface Assessment {
  id?: string;
  student_id: string;
  subject_id: string | null;
  kind: string; // 'mock', 'real', etc.
  date: string | null;
  score: number | null;
  total: number | null;
  notes: string | null;
  attachments: AssessmentAttachment[];
  created_at?: string;
}

export interface UpcomingExam {
  id?: string;
  student_id: string;
  subject_id: string | null;
  title: string;
  exam_date: string;
  exam_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
  topics: string[];
  source: 'manual' | 'ai_parsed';
  type: 'real' | 'mock';
  created_at?: string;
  updated_at?: string;
}
