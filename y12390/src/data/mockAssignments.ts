import type { Assignment } from '../types';

export const mockAssignments: Assignment[] = [
  {
    id: 'assign-001',
    title: '贝斯音色设计练习 - Dubstep风格',
    description: '使用提供的Serum贝斯预设，调整detune参数使音色更厚实，提交修改后的参数快照和音频作品。',
    studentId: 'student-001',
    studentName: '学生A',
    teacherId: 'teacher-001',
    teacherName: '张老师',
    snapshotId: 'snap-001',
    presetVersionId: 'pv-serum-bass-100',
    audioFileId: 'audio-001',
    createdAt: Date.now() - 86400000 * 12,
    submittedAt: Date.now() - 86400000 * 10,
    status: 'approved',
    annotations: [
      {
        id: 'annot-001',
        assignmentId: 'assign-001',
        parameterId: 'param-osc1-detune',
        parameterPath: 'Oscillators/Osc1/Detune',
        authorId: 'teacher-001',
        authorName: '张老师',
        authorRole: 'teacher',
        content: 'detune从7调整到15是一个很好的尝试，音色确实更加厚实了。建议可以尝试再增加一些，或者配合sub oscillator使用。',
        createdAt: Date.now() - 86400000 * 9,
        isResolved: true,
      },
      {
        id: 'annot-002',
        assignmentId: 'assign-001',
        authorId: 'student-001',
        authorName: '学生A',
        authorRole: 'student',
        content: '谢谢老师的建议！我尝试将detune增加到20后发现音色有些浑浊，所以最后还是选择了15。下次我会尝试加入sub oscillator。',
        createdAt: Date.now() - 86400000 * 8.5,
        isResolved: true,
      },
    ],
    grade: 92,
    feedback: '整体完成得很好！对detune参数的理解很到位，音色调整有明显的改善。继续保持，下次可以尝试更多参数的组合调整。',
  },
  {
    id: 'assign-002',
    title: '主音音色设计练习 - EDM风格',
    description: '使用Massive合成器设计一个适合EDM Drop段落的主音音色，注意参数范围不要越界，提交参数快照和音频。',
    studentId: 'student-002',
    studentName: '学生B',
    teacherId: 'teacher-002',
    teacherName: '李老师',
    snapshotId: 'snap-002',
    presetVersionId: 'pv-massive-lead-100',
    audioFileId: 'audio-002',
    createdAt: Date.now() - 86400000 * 10,
    submittedAt: Date.now() - 86400000 * 8,
    status: 'reviewing',
    annotations: [
      {
        id: 'annot-003',
        assignmentId: 'assign-002',
        parameterId: 'param-osc1-detune',
        parameterPath: 'Oscillators/Osc1/Detune',
        authorId: 'teacher-002',
        authorName: '李老师',
        authorRole: 'teacher',
        content: 'detune参数设置为120，超出了合理范围(0-100)。这会导致音高偏离严重，影响整体和声。请将其调整到合理范围内。',
        createdAt: Date.now() - 86400000 * 7,
        isResolved: false,
      },
      {
        id: 'annot-004',
        assignmentId: 'assign-002',
        parameterId: 'param-filt-cutoff',
        parameterPath: 'Filters/Main/Cutoff',
        authorId: 'teacher-002',
        authorName: '李老师',
        authorRole: 'teacher',
        content: '滤波器截止频率设置为25000Hz，超出了人耳可听范围上限(20000Hz)。这不仅没有实际意义，还可能造成CPU资源浪费。',
        createdAt: Date.now() - 86400000 * 7,
        isResolved: false,
      },
      {
        id: 'annot-005',
        assignmentId: 'assign-002',
        parameterId: 'param-lfo-rate',
        parameterPath: 'LFOs/Main/Rate',
        authorId: 'teacher-002',
        authorName: '李老师',
        authorRole: 'teacher',
        content: 'LFO速率设置为-1Hz，这是一个无效值。LFO速率不能为负数，请检查你的参数设置。',
        createdAt: Date.now() - 86400000 * 7,
        isResolved: false,
      },
      {
        id: 'annot-006',
        assignmentId: 'assign-002',
        authorId: 'student-002',
        authorName: '学生B',
        authorRole: 'student',
        content: '老师好！这些参数是我在插件里直接复制的，没有注意到范围限制。我会马上修正这些问题，然后重新提交。',
        createdAt: Date.now() - 86400000 * 6.5,
        isResolved: false,
      },
    ],
  },
  {
    id: 'assign-003',
    title: '鼓组音色调整练习 - Trap风格',
    description: '使用提供的808鼓组预设，调整底鼓的音高和衰减时间，使其更适合Trap风格。需要提交参数快照和混音后的音频。',
    studentId: 'student-003',
    studentName: '学生C',
    teacherId: 'teacher-001',
    teacherName: '张老师',
    snapshotId: 'snap-003',
    presetVersionId: 'pv-serum-drums-110',
    createdAt: Date.now() - 86400000 * 5,
    submittedAt: Date.now() - 86400000 * 3,
    status: 'submitted',
    annotations: [],
  },
];

export const getAssignmentById = (id: string): Assignment | undefined => {
  return mockAssignments.find(a => a.id === id);
};

export const getAssignmentsByStudentId = (studentId: string): Assignment[] => {
  return mockAssignments.filter(a => a.studentId === studentId);
};

export const getAssignmentsByTeacherId = (teacherId: string): Assignment[] => {
  return mockAssignments.filter(a => a.teacherId === teacherId);
};

export const getAssignmentsByStatus = (status: string): Assignment[] => {
  return mockAssignments.filter(a => a.status === status);
};
