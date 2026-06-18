import type { SampleEvidence, WorkOrder } from '@/types'

export const workOrders: WorkOrder[] = [
  {
    orderId: 'WO-2026-0601-014',
    source: '学情大模型-作文流',
    status: 'conflict',
    importedAt: '2026-06-15 09:42:11',
    importer: '老唐',
    subject: '高三语文·议论文·以"坚持"为题',
    rawFields: {
      工单编号: 'WO-2026-0601-014',
      来源系统: '学情大模型-作文流',
      批次: 'B-0601',
      处理状态: '冲突待处理',
      '学生ID': 'S-3302',
    },
  },
  {
    orderId: 'WO-2026-0602-021',
    source: '在线作业平台',
    status: 'needs_evidence',
    importedAt: '2026-06-16 10:05:33',
    importer: '老唐',
    subject: '高二语文·记叙文·难忘的一件事',
    rawFields: {
      ticket_id: 'WO-2026-0602-021',
      channel: '在线作业平台',
      batch: 'B-0602',
      state: '待补证据',
      student_uid: 'S-1188',
    },
  },
  {
    orderId: 'WO-2026-0603-007',
    source: 'AI批改开放接口',
    status: 'processed',
    importedAt: '2026-06-16 14:21:50',
    importer: '老唐',
    subject: '初三语文·议论文·谈自律',
    rawFields: {
      工单ID: 'WO-2026-0603-007',
      source: 'AI批改开放接口',
      批次号: 'B-0603',
      处理状态: '已处理',
      学号: 'S-7741',
    },
  },
  {
    orderId: 'WO-2026-0604-033',
    source: '学情大模型-作文流',
    status: 'pending',
    importedAt: '2026-06-17 08:11:02',
    importer: '老唐',
    subject: '高三语文·材料作文·快与慢',
    rawFields: {
      订单号: 'WO-2026-0604-033',
      来源: '学情大模型-作文流',
      批次: 'B-0604',
      状态: '待处理',
      学生编号: 'S-9920',
    },
  },
  {
    orderId: 'WO-2026-0604-051',
    source: '在线作业平台',
    status: 'needs_evidence',
    importedAt: '2026-06-17 11:38:27',
    importer: '老唐',
    subject: '高一语文·议论文·论韧劲',
    rawFields: {
      工单编号: 'WO-2026-0604-051',
      来源系统: '在线作业平台',
      批次: 'B-0604',
      处理状态: '待补证据',
      student_id: 'S-2046',
    },
  },
]

const essayA = `坚持，是穿越漫长冬夜的那束微光。很多人把坚持理解为咬牙硬撑，但真正的坚持更像是一种缓慢的燃烧——它不喧哗，却从未熄灭。

回望历史，司马迁受宫刑而作《史记》，屈原放逐乃赋《离骚》。他们的坚持并非源自天赋的优越，而是源自对意义的笃信。当我们把目标拆解为每一天的微小动作，所谓坚持就不再是悬崖边的纵身一跃，而是台阶上的拾级而上。

当然，坚持不等于固执。方向错了的坚持，只是在错误里加深刻痕。适时校准，是坚持的另一种成熟。`

const essayB = `我最难忘的一件事，是去年冬天陪奶奶去医院的那天。

那天雪很大，奶奶却坚持要先给我买一个烤红薯。她说："手里暖着，心里就不慌。"后来在走廊上，她攥着我的手，像是在安慰我，又像是在安慰她自己。`

const essayC = `自律不是对欲望的围剿，而是对自由的重新定义。一个人若能掌控自己的时间，便能掌控自己的命运。但自律若沦为表演，它便成了新的枷锁。`

const essayD = `快与慢，是时代给我们的两道考题。一味求快，会丢失沿途风景；一味求慢，会被时代抛弃。真正的智慧，是在该快时如箭，该慢时如河。`

const essayE = `韧劲，是竹子弯而不折的力量。生活中每一次被打倒又重新站起，都在为韧劲镀层。韧劲不是天生的，是被生活反复捶打后长出来的茧。`

export const samples: SampleEvidence[] = [
  {
    sampleId: 'SMP-3302-A',
    orderId: 'WO-2026-0601-014',
    studentName: '林同学',
    prompt: '以"坚持"为题，写一篇不少于800字的议论文。',
    essay: essayA,
    machineScore: 88,
    impact: 9.4,
    hasLabelConflict: true,
    conflictNote: '机器标签「论点不清晰」与人工「论点鲜明」冲突；同时人工修正分 82 与机器分 88 差距超阈值。',
    evidenceUrl: 'dossier://evidence/SMP-3302-A?trace=0601',
    manualCorrection: {
      correctionId: 'COR-3302-A',
      sampleId: 'SMP-3302-A',
      originalScore: 88,
      manualScore: 82,
      reason: '论据虽有，但"适时校准"段论述单薄，且结尾未回扣"坚持"的微光意象，扣分。',
      reviewer: '负责人·周',
      createdAt: '2026-06-15 10:12:40',
      overwritten: true,
      overwriteByNewResult: true,
    },
    response: {
      sampleId: 'SMP-3302-A',
      score: 88,
      labels: ['论点不清晰', '论据充分', '结构完整'],
      modelVersion: 'essay-grader-v3.2',
      returnedAt: '2026-06-15 09:40:02',
      payload: {
        request_id: 'req_8f3a0601',
        model: 'essay-grader-v3.2',
        score: 88,
        dimensions: { 论点: 17, 论据: 23, 结构: 24, 语言: 24 },
        labels: ['论点不清晰', '论据充分', '结构完整'],
        latency_ms: 412,
      },
    },
  },
  {
    sampleId: 'SMP-1188-B',
    orderId: 'WO-2026-0602-021',
    studentName: '陈同学',
    prompt: '以"难忘的一件事"为题，写一篇记叙文。',
    essay: essayB,
    machineScore: 76,
    impact: 6.1,
    hasLabelConflict: false,
    evidenceUrl: 'dossier://evidence/SMP-1188-B?trace=0602',
    response: {
      sampleId: 'SMP-1188-B',
      score: 76,
      labels: ['细节生动', '篇幅偏短'],
      modelVersion: 'essay-grader-v3.2',
      returnedAt: '2026-06-16 10:03:11',
      payload: {
        request_id: 'req_9c1b0602',
        model: 'essay-grader-v3.2',
        score: 76,
        dimensions: { 内容: 18, 结构: 19, 语言: 20, 书写: 19 },
        labels: ['细节生动', '篇幅偏短'],
        latency_ms: 388,
      },
    },
  },
  {
    sampleId: 'SMP-7741-C',
    orderId: 'WO-2026-0603-007',
    studentName: '赵同学',
    prompt: '以"谈自律"为题，写一篇议论文。',
    essay: essayC,
    machineScore: 91,
    impact: 2.2,
    hasLabelConflict: false,
    evidenceUrl: 'dossier://evidence/SMP-7741-C?trace=0603',
    manualCorrection: {
      correctionId: 'COR-7741-C',
      sampleId: 'SMP-7741-C',
      originalScore: 91,
      manualScore: 90,
      reason: '观点准确，仅语言略显凝练不足，微调。',
      reviewer: '负责人·周',
      createdAt: '2026-06-16 14:40:20',
      overwritten: false,
    },
    response: {
      sampleId: 'SMP-7741-C',
      score: 91,
      labels: ['观点深刻', '语言凝练'],
      modelVersion: 'essay-grader-v3.2',
      returnedAt: '2026-06-16 14:20:50',
      payload: {
        request_id: 'req_2d4e0603',
        model: 'essay-grader-v3.2',
        score: 91,
        dimensions: { 论点: 22, 论据: 23, 结构: 23, 语言: 23 },
        labels: ['观点深刻', '语言凝练'],
        latency_ms: 401,
      },
    },
  },
  {
    sampleId: 'SMP-9920-D',
    orderId: 'WO-2026-0604-033',
    studentName: '吴同学',
    prompt: '以"快与慢"为题，写一篇材料作文。',
    essay: essayD,
    machineScore: 83,
    impact: 7.8,
    hasLabelConflict: false,
    evidenceUrl: 'dossier://evidence/SMP-9920-D?trace=0604',
    response: {
      sampleId: 'SMP-9920-D',
      score: 83,
      labels: ['立意新颖', '论证略浅'],
      modelVersion: 'essay-grader-v3.2',
      returnedAt: '2026-06-17 08:09:44',
      payload: {
        request_id: 'req_7a900604',
        model: 'essay-grader-v3.2',
        score: 83,
        dimensions: { 论点: 19, 论据: 20, 结构: 22, 语言: 22 },
        labels: ['立意新颖', '论证略浅'],
        latency_ms: 455,
      },
    },
  },
  {
    sampleId: 'SMP-2046-E',
    orderId: 'WO-2026-0604-051',
    studentName: '何同学',
    prompt: '以"论韧劲"为题，写一篇议论文。',
    essay: essayE,
    machineScore: 79,
    impact: 8.6,
    hasLabelConflict: true,
    conflictNote: '机器标签「论据不足」与人工认为"比喻贴切、论据够用"冲突，且结尾仓促，机器未识别。',
    evidenceUrl: 'dossier://evidence/SMP-2046-E?trace=0604',
    response: {
      sampleId: 'SMP-2046-E',
      score: 79,
      labels: ['论据不足', '语言有灵气'],
      modelVersion: 'essay-grader-v3.2',
      returnedAt: '2026-06-17 11:36:09',
      payload: {
        request_id: 'req_5b210604',
        model: 'essay-grader-v3.2',
        score: 79,
        dimensions: { 论点: 18, 论据: 19, 结构: 21, 语言: 21 },
        labels: ['论据不足', '语言有灵气'],
        latency_ms: 433,
      },
    },
  },
]
