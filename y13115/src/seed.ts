import { store, genId, now } from './store';
import {
  WrongQuestion,
  JudgmentRecord,
  Note,
  ExtrapolationAlert,
  AuditEntry,
} from './types';

export function seedData(): void {
  const t1 = now();

  const wq1: WrongQuestion = {
    id: genId('WQ'),
    studentId: 'S001',
    studentName: '张小明',
    questionId: 'Q_C_001',
    questionText: '从5个不同元素中取3个的排列数是多少？',
    studentAnswer: '60 种',
    formulaUsed: 'A(n,k) = n!/(n-k)!',
    unitInAnswer: '种',
    standardUnit: '个',
    standardAnswer: 60,
    studentNumericAnswer: 60,
    createdAt: t1,
  };

  const wq2: WrongQuestion = {
    id: genId('WQ'),
    studentId: 'S002',
    studentName: '李华',
    questionId: 'Q_C_002',
    questionText: '从8人中选3人排队，有多少种排法？',
    studentAnswer: '56 种',
    formulaUsed: 'C(n,k) = n!/(k!(n-k)!)',
    unitInAnswer: '种',
    standardUnit: '种',
    standardAnswer: 336,
    studentNumericAnswer: 56,
    createdAt: t1,
  };

  const wq3: WrongQuestion = {
    id: genId('WQ'),
    studentId: 'S003',
    studentName: '王芳',
    questionId: 'Q_C_003',
    questionText: '用0-9组成无重复数字的三位数，有多少个？',
    studentAnswer: '648 个',
    formulaUsed: '9×9×8 = 648',
    unitInAnswer: '个',
    standardUnit: '个',
    standardAnswer: 648,
    studentNumericAnswer: 648,
    createdAt: t1,
  };

  store.wrongQuestions = [wq1, wq2, wq3];

  const j1: JudgmentRecord = {
    id: genId('J'),
    wrongQuestionId: wq1.id,
    status: 'wrong',
    previousStatus: undefined,
    score: 0,
    previousScore: undefined,
    operator: 'auto_grader',
    operatedAt: t1,
    sources: [
      {
        type: 'unit_conversion',
        id: 'UC_001',
        description: '标准答案单位"个" vs 学生答案单位"种"，单位不一致判定错误',
        lineNumber: 42,
      },
    ],
    noteIds: [],
    isTemporary: false,
    comment: '自动判分：单位不匹配',
  };

  const j2: JudgmentRecord = {
    id: genId('J'),
    wrongQuestionId: wq2.id,
    status: 'wrong',
    previousStatus: undefined,
    score: 0,
    previousScore: undefined,
    operator: 'auto_grader',
    operatedAt: t1,
    sources: [
      {
        type: 'formula',
        id: 'FORM_002',
        description: '学生使用组合公式 C(8,3)=56，但题目要求排列 A(8,3)=336',
        lineNumber: 18,
      },
    ],
    noteIds: [],
    isTemporary: false,
    comment: '自动判分：公式用错，应为排列',
  };

  const j3: JudgmentRecord = {
    id: genId('J'),
    wrongQuestionId: wq3.id,
    status: 'correct',
    previousStatus: undefined,
    score: 5,
    previousScore: undefined,
    operator: 'auto_grader',
    operatedAt: t1,
    sources: [
      {
        type: 'formula',
        id: 'FORM_003',
        description: '9×9×8 = 648 正确，首位9种、十位9种、个位8种',
        lineNumber: 25,
      },
    ],
    noteIds: [],
    isTemporary: false,
    comment: '自动判分：正确',
  };

  store.judgments = [j1, j2, j3];

  const note1: Note = {
    id: genId('N'),
    wrongQuestionId: wq1.id,
    content: '老叶备注：排列单位"种"与"个"在组合计数中语义等价，应改判为正确。数值60与标准答案一致。',
    operator: 'teacher_ye',
    createdAt: t1,
    updatedAt: t1,
    affectedJudgmentIds: [],
  };

  store.notes = [note1];

  const j1_rejudged: JudgmentRecord = {
    id: genId('J'),
    wrongQuestionId: wq1.id,
    status: 'rejudged',
    previousStatus: 'wrong',
    score: 5,
    previousScore: 0,
    operator: 'teacher_ye',
    operatedAt: t1,
    sources: [
      {
        type: 'note',
        id: note1.id,
        description: '根据老师备注改判：单位"种"与"个"在此题中等价',
      },
      {
        type: 'manual',
        id: 'MANUAL_001',
        description: '人工复核：数值60正确，单位差异不影响计数正确性',
        lineNumber: 42,
      },
    ],
    noteIds: [note1.id],
    isTemporary: true,
    comment: '老叶临时改判：单位等价，数值正确，给满分',
  };

  store.judgments.push(j1_rejudged);
  note1.affectedJudgmentIds.push(j1_rejudged.id);

  const alert1: ExtrapolationAlert = {
    id: genId('EA'),
    wrongQuestionId: wq2.id,
    judgmentId: j2.id,
    sourceLine: 18,
    formula: 'C(n,k) = n!/(k!(n-k)!)',
    inputRange: [1, 20],
    actualInput: 8,
    impactScope: [
      '题Q_C_002判错学生人数',
      '章节"排列组合"平均分统计',
      '李华(S002)个人错题率',
    ],
    severity: 'warning',
    detectedAt: t1,
    resolved: false,
  };

  store.extrapolationAlerts = [alert1];

  const audit: AuditEntry[] = [
    {
      id: genId('AUD'),
      operationType: 'create',
      operator: 'system',
      wrongQuestionId: wq1.id,
      targetId: wq1.id,
      timestamp: t1,
      afterState: { studentAnswer: wq1.studentAnswer, status: 'pending' },
    },
    {
      id: genId('AUD'),
      operationType: 'judge',
      operator: 'auto_grader',
      wrongQuestionId: wq1.id,
      targetId: j1.id,
      timestamp: t1,
      beforeState: { status: 'pending', score: null },
      afterState: { status: 'wrong', score: 0 },
    },
    {
      id: genId('AUD'),
      operationType: 'judge',
      operator: 'auto_grader',
      wrongQuestionId: wq2.id,
      targetId: j2.id,
      timestamp: t1,
      beforeState: { status: 'pending', score: null },
      afterState: { status: 'wrong', score: 0 },
    },
    {
      id: genId('AUD'),
      operationType: 'judge',
      operator: 'auto_grader',
      wrongQuestionId: wq3.id,
      targetId: j3.id,
      timestamp: t1,
      beforeState: { status: 'pending', score: null },
      afterState: { status: 'correct', score: 5 },
    },
    {
      id: genId('AUD'),
      operationType: 'add_note',
      operator: 'teacher_ye',
      wrongQuestionId: wq1.id,
      targetId: note1.id,
      timestamp: t1,
      note: '老叶补充单位等价说明',
    },
    {
      id: genId('AUD'),
      operationType: 'rejudge',
      operator: 'teacher_ye',
      wrongQuestionId: wq1.id,
      targetId: j1_rejudged.id,
      timestamp: t1,
      beforeState: { status: 'wrong', score: 0 },
      afterState: { status: 'rejudged', score: 5, isTemporary: true },
      note: '根据备注N_* 改判',
    },
    {
      id: genId('AUD'),
      operationType: 'extrapolation_check',
      operator: 'system',
      wrongQuestionId: wq2.id,
      targetId: alert1.id,
      timestamp: t1,
      note: '检测到公式使用范围可能越界',
    },
  ];

  store.auditLog = audit;
}
