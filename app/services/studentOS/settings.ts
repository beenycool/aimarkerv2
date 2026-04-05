import { AIPreferences, StudentSettings } from './types';
import { clientOrDefault, type StudentOSSupabase } from './getSupabase';


// Default AI preferences for per-feature configuration
export const DEFAULT_AI_PREFERENCES: AIPreferences = {
  parsing: { enabled: true, provider: "openrouter", model: "google/gemini-2.0-flash-001" },
  grading: { enabled: true, provider: "hackclub", model: "moonshotai/kimi-k2-thinking" },
  tutor: { enabled: true, provider: "openrouter", model: "google/gemini-2.0-flash-001" },
  planning: { enabled: true, provider: "hackclub", model: "moonshotai/kimi-k2-thinking" },
  hints: { enabled: true, provider: "hackclub", model: "qwen/qwen3-32b" },
  verification: { enabled: true, provider: "openrouter", model: "google/gemini-2.0-flash-001" },
};

export const DEFAULT_SETTINGS: Omit<StudentSettings, 'student_id'> = {
  exam_year: 2026,
  timezone: null,
  session_length: 25,
  max_sessions_per_day: 2,
  unavailable_days: [],
  light_week: false,
  study_techniques_feed: false,
  nightly_verification: false,
  // AI API settings (legacy toggles)
  openrouter_enabled: true,
  hackclub_enabled: true,
  // Custom API Configuration
  custom_api_config: {
    openai_endpoint: "",
    openai_key: ""
  },
  // New per-feature AI preferences
  ai_preferences: DEFAULT_AI_PREFERENCES,
  dark_mode: false,
  name: null,
  target_grade: '7',
  notifications: true,
  // Time slot scheduling preferences
  preferred_study_time: 'afternoon', // 'morning', 'afternoon', 'evening', 'any'
  preferred_time_slots: [], // e.g., ['09:00', '14:00', '16:00', '19:00']
  busy_periods: [], // e.g., [{start: '12:00', end: '13:00', label: 'Lunch'}]
};

export async function getOrCreateSettings(
  studentId: string,
  client?: StudentOSSupabase
): Promise<StudentSettings> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);

  const { data, error } = await supabase
    .from('student_settings')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116: No rows returned for maybeSingle
    throw error;
  }

  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from('student_settings')
    .insert({ student_id: studentId, ...DEFAULT_SETTINGS } as any)
    .select('*')
    .single();

  if (insertError) throw insertError;
  return inserted;
}

export async function updateSettings(
  studentId: string,
  patch: Partial<StudentSettings>,
  client?: StudentOSSupabase
): Promise<StudentSettings> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const { data, error } = await (supabase.from('student_settings') as any)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
