export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string
          student_id: string
          name: string
          exam_board: string | null
          target_grade: string | null
          weekly_minutes: number | null
          tier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          name: string
          exam_board?: string | null
          target_grade?: string | null
          weekly_minutes?: number | null
          tier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          name?: string
          exam_board?: string | null
          target_grade?: string | null
          weekly_minutes?: number | null
          tier?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      question_attempts: {
        Row: {
          id: string
          student_id: string
          subject_id: string
          assessment_id: string | null
          question_id: string | null
          question_text: string | null
          answer_text: string | null
          marks_awarded: number | null
          marks_total: number | null
          primary_flaw: string | null
          mistake_tags: string[] | null
          feedback_md: string | null
          model_answer_md: string | null
          source: string | null
          attempted_at: string
          question_type: string | null
        }
        Insert: {
          id?: string
          student_id: string
          subject_id: string
          assessment_id?: string | null
          question_id?: string | null
          question_text?: string | null
          answer_text?: string | null
          marks_awarded?: number | null
          marks_total?: number | null
          primary_flaw?: string | null
          mistake_tags?: string[] | null
          feedback_md?: string | null
          model_answer_md?: string | null
          source?: string | null
          attempted_at?: string
          question_type?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string
          assessment_id?: string | null
          question_id?: string | null
          question_text?: string | null
          answer_text?: string | null
          marks_awarded?: number | null
          marks_total?: number | null
          primary_flaw?: string | null
          mistake_tags?: string[] | null
          feedback_md?: string | null
          model_answer_md?: string | null
          source?: string | null
          attempted_at?: string
          question_type?: string | null
        }
      }
      assessments: {
        Row: {
          id: string
          student_id: string
          subject_id: string | null
          date: string | null
          score: number | null
          total: number | null
          notes: string | null
          kind: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          subject_id?: string | null
          date?: string | null
          score?: number | null
          total?: number | null
          notes?: string | null
          kind?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string | null
          date?: string | null
          score?: number | null
          total?: number | null
          notes?: string | null
          kind?: string
          created_at?: string
          updated_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          student_id: string
          subject_id: string | null
          session_type: string
          planned_for: string
          duration_minutes: number | null
          reflection: Json | null
          completed_at: string | null
          status: string
          items: Json
          created_at: string
          updated_at: string
          notes: string | null
          topic: string | null
          start_time: string | null
        }
        Insert: {
          id?: string
          student_id: string
          subject_id?: string | null
          session_type: string
          planned_for: string
          duration_minutes?: number | null
          reflection?: Json | null
          completed_at?: string | null
          status?: string
          items?: Json
          created_at?: string
          updated_at?: string
          notes?: string | null
          topic?: string | null
          start_time?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          subject_id?: string | null
          session_type?: string
          planned_for?: string
          duration_minutes?: number | null
          reflection?: Json | null
          completed_at?: string | null
          status?: string
          items?: Json
          created_at?: string
          updated_at?: string
          notes?: string | null
          topic?: string | null
          start_time?: string | null
        }
      }
      student_settings: {
        Row: {
          student_id: string
          timezone: string | null
          created_at: string
          updated_at: string
          exam_year: number
          session_length: number
          max_sessions_per_day: number
          unavailable_days: number[]
          light_week: boolean
          study_techniques_feed: boolean
          nightly_verification: boolean
          hackclub_enabled: boolean | null
          name: string | null
          target_grade: string | null
          notifications: boolean | null
          dark_mode: boolean | null
          openrouter_enabled: boolean | null
          study_hours_per_day: number | null
          preferred_study_time: string | null
          ai_preferences: Json | null
          custom_ai_profiles: Json | null
          custom_api_config: Json | null
        }
        Insert: {
          student_id: string
          timezone?: string | null
          created_at?: string
          updated_at?: string
          exam_year?: number
          session_length?: number
          max_sessions_per_day?: number
          unavailable_days?: number[]
          light_week?: boolean
          study_techniques_feed?: boolean
          nightly_verification?: boolean
          hackclub_enabled?: boolean | null
          name?: string | null
          target_grade?: string | null
          notifications?: boolean | null
          dark_mode?: boolean | null
          openrouter_enabled?: boolean | null
          study_hours_per_day?: number | null
          preferred_study_time?: string | null
          ai_preferences?: Json | null
          custom_ai_profiles?: Json | null
          custom_api_config?: Json | null
        }
        Update: {
          student_id?: string
          timezone?: string | null
          created_at?: string
          updated_at?: string
          exam_year?: number
          session_length?: number
          max_sessions_per_day?: number
          unavailable_days?: number[]
          light_week?: boolean
          study_techniques_feed?: boolean
          nightly_verification?: boolean
          hackclub_enabled?: boolean | null
          name?: string | null
          target_grade?: string | null
          notifications?: boolean | null
          dark_mode?: boolean | null
          openrouter_enabled?: boolean | null
          study_hours_per_day?: number | null
          preferred_study_time?: string | null
          ai_preferences?: Json | null
          custom_ai_profiles?: Json | null
          custom_api_config?: Json | null
        }
      }
      upcoming_exams: {
        Row: {
          id: string
          source: string
          created_at: string
          updated_at: string
          student_id: string
          subject_id: string | null
          title: string
          exam_date: string
          exam_time: string | null
          duration_minutes: number | null
          location: string | null
          notes: string | null
          topics: string[] | null
          type: string | null
        }
        Insert: {
          id?: string
          source?: string
          created_at?: string
          updated_at?: string
          student_id: string
          subject_id?: string | null
          title: string
          exam_date: string
          exam_time?: string | null
          duration_minutes?: number | null
          location?: string | null
          notes?: string | null
          topics?: string[] | null
          type?: string | null
        }
        Update: {
          id?: string
          source?: string
          created_at?: string
          updated_at?: string
          student_id?: string
          subject_id?: string | null
          title?: string
          exam_date?: string
          exam_time?: string | null
          duration_minutes?: number | null
          location?: string | null
          notes?: string | null
          topics?: string[] | null
          type?: string | null
        }
      }
      memory_bank_items: {
        Row: {
          id: string
          student_id: string
          category: string | null
          content: string
          last_confirmed: string | null
          confidence: number
          source: string
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          category?: string | null
          content: string
          last_confirmed?: string | null
          confidence?: number
          source?: string
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          category?: string | null
          content?: string
          last_confirmed?: string | null
          confidence?: number
          source?: string
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_: string]: {
        Row: {
          [key: string]: Json
        }
      }
    }
    Functions: {
      [_: string]: {
        Args: {
          [key: string]: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_: string]: string
    }
  }
}
