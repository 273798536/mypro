import type {
  Student,
  KnowledgePoint,
  WrongQuestion,
  ScoringRecord,
  ConstraintRule,
  DPTransitionTable,
  Conclusion,
  SampleDataset,
} from '../types';

const PREFIX = 'dp_table_';

const KEYS = {
  STUDENT: `${PREFIX}student`,
  KNOWLEDGE_POINTS: `${PREFIX}knowledge_points`,
  WRONG_QUESTIONS: `${PREFIX}wrong_questions`,
  SCORING_RECORDS: `${PREFIX}scoring_records`,
  CONSTRAINT_RULES: `${PREFIX}constraint_rules`,
  TRANSITION_TABLE: `${PREFIX}transition_table`,
  CONCLUSIONS: `${PREFIX}conclusions`,
  CURRENT_SAMPLE_ID: `${PREFIX}current_sample_id`,
};

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const storage = {
  getStudent: (): Student | null =>
    safeParse<Student | null>(localStorage.getItem(KEYS.STUDENT), null),
  setStudent: (s: Student | null) => {
    if (s) localStorage.setItem(KEYS.STUDENT, JSON.stringify(s));
    else localStorage.removeItem(KEYS.STUDENT);
  },

  getKnowledgePoints: (): KnowledgePoint[] =>
    safeParse<KnowledgePoint[]>(localStorage.getItem(KEYS.KNOWLEDGE_POINTS), []),
  setKnowledgePoints: (kps: KnowledgePoint[]) =>
    localStorage.setItem(KEYS.KNOWLEDGE_POINTS, JSON.stringify(kps)),

  getWrongQuestions: (): WrongQuestion[] =>
    safeParse<WrongQuestion[]>(localStorage.getItem(KEYS.WRONG_QUESTIONS), []),
  setWrongQuestions: (wqs: WrongQuestion[]) =>
    localStorage.setItem(KEYS.WRONG_QUESTIONS, JSON.stringify(wqs)),

  getScoringRecords: (): ScoringRecord[] =>
    safeParse<ScoringRecord[]>(localStorage.getItem(KEYS.SCORING_RECORDS), []),
  setScoringRecords: (srs: ScoringRecord[]) =>
    localStorage.setItem(KEYS.SCORING_RECORDS, JSON.stringify(srs)),

  getConstraintRules: (): ConstraintRule[] =>
    safeParse<ConstraintRule[]>(localStorage.getItem(KEYS.CONSTRAINT_RULES), []),
  setConstraintRules: (rules: ConstraintRule[]) =>
    localStorage.setItem(KEYS.CONSTRAINT_RULES, JSON.stringify(rules)),

  getTransitionTable: (): DPTransitionTable | null =>
    safeParse<DPTransitionTable | null>(localStorage.getItem(KEYS.TRANSITION_TABLE), null),
  setTransitionTable: (table: DPTransitionTable | null) => {
    if (table) localStorage.setItem(KEYS.TRANSITION_TABLE, JSON.stringify(table));
    else localStorage.removeItem(KEYS.TRANSITION_TABLE);
  },

  getConclusions: (): Conclusion[] =>
    safeParse<Conclusion[]>(localStorage.getItem(KEYS.CONCLUSIONS), []),
  setConclusions: (cs: Conclusion[]) =>
    localStorage.setItem(KEYS.CONCLUSIONS, JSON.stringify(cs)),

  getCurrentSampleId: (): string | null => localStorage.getItem(KEYS.CURRENT_SAMPLE_ID),
  setCurrentSampleId: (id: string | null) => {
    if (id) localStorage.setItem(KEYS.CURRENT_SAMPLE_ID, id);
    else localStorage.removeItem(KEYS.CURRENT_SAMPLE_ID);
  },

  loadSample: (sample: SampleDataset) => {
    storage.setStudent(sample.student);
    storage.setKnowledgePoints(sample.knowledgePoints);
    storage.setWrongQuestions(sample.wrongQuestions);
    storage.setScoringRecords(sample.scoringRecords);
    storage.setConstraintRules(sample.constraintRules);
    storage.setCurrentSampleId(sample.id);
    storage.setTransitionTable(null);
    storage.setConclusions([]);
  },

  clear: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
