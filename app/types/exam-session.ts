export const EXAM_SESSION_SCHEMA_VERSION = 1;

export interface PersistedExamState {
  schemaVersion: number;
  activeQuestions: ExamQuestion[];
  userAnswers: Record<string, any>;
  feedbacks: Record<string, any>;
  insertContent: any | null;
  currentQIndex: number;
  skippedQuestions: string[];
  followUpChats: Record<string, any[]>;
  paperFilePaths: PaperFilePaths | null;
  paperId: string | null;
  parsedMarkScheme: Record<string, any>;
  quoteDrafts: Record<string, string>;
  timestamp: number;
}

export interface PaperFilePaths {
  paper: string;
  scheme?: string;
  insert?: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  marks: number;
  type: string;
  section?: string;
  pageNumber?: number;
  figurePage?: number;
  relatedFigure?: string;
  options?: string[];
  listCount?: number;
  tableStructure?: any;
  graphConfig?: any;
}

export function serializeSession(state: {
  activeQuestions: ExamQuestion[];
  userAnswers: Record<string, any>;
  feedbacks: Record<string, any>;
  insertContent: any | null;
  currentQIndex: number;
  skippedQuestions: Set<string>;
  followUpChats: Record<string, any[]>;
  paperFilePaths: PaperFilePaths | null;
  paperId: string | null;
  parsedMarkScheme: Record<string, any>;
  quoteDrafts: Record<string, string>;
}): PersistedExamState {
  return {
    schemaVersion: EXAM_SESSION_SCHEMA_VERSION,
    activeQuestions: state.activeQuestions,
    userAnswers: state.userAnswers,
    feedbacks: state.feedbacks,
    insertContent: state.insertContent,
    currentQIndex: state.currentQIndex,
    skippedQuestions: Array.from(state.skippedQuestions),
    followUpChats: state.followUpChats,
    paperFilePaths: state.paperFilePaths,
    paperId: state.paperId,
    parsedMarkScheme: state.parsedMarkScheme,
    quoteDrafts: state.quoteDrafts,
    timestamp: Date.now(),
  };
}

export function deserializeSession(raw: any): PersistedExamState | null {
  if (!raw || !raw.activeQuestions || !Array.isArray(raw.activeQuestions) || raw.activeQuestions.length === 0) {
    return null;
  }
  return {
    schemaVersion: raw.schemaVersion ?? 0,
    activeQuestions: raw.activeQuestions,
    userAnswers: raw.userAnswers ?? {},
    feedbacks: raw.feedbacks ?? {},
    insertContent: raw.insertContent ?? null,
    currentQIndex: raw.currentQIndex ?? 0,
    skippedQuestions: raw.skippedQuestions ?? [],
    followUpChats: raw.followUpChats ?? {},
    paperFilePaths: raw.paperFilePaths ?? null,
    paperId: raw.paperId ?? null,
    parsedMarkScheme: raw.parsedMarkScheme ?? {},
    quoteDrafts: raw.quoteDrafts ?? {},
    timestamp: raw.timestamp ?? 0,
  };
}
