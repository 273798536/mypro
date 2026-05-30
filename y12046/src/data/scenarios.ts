export type AuthStatus = 'valid' | 'expired' | 'none'
export type NoticeType = 'warning' | 'info' | 'alert'
export type NodeStatus = 'unexplored' | 'confirmed' | 'conflict'
export type CorrectAnswer = 'compliant' | 'non-compliant' | 'needs-review'
export type OperationType = 'verify-auth' | 'check-sample' | 'compare-track' | 'submit'
export type GamePhase = 'intro' | 'playing' | 'judging' | 'reveal' | 'finished'

export interface ClueCard {
  id: string
  songName: string
  author: string
  sampleSource?: string
  sampleDuration?: number
  originalDuration?: number
  authStatus: AuthStatus
  authExpiryDate?: string
  isrc?: string
  hasConflictingTrack?: boolean
  conflictingTrackAuthor?: string
  conflictingTrackIsrc?: string
}

export interface PlatformNotice {
  id: string
  type: NoticeType
  title: string
  content: string
  isDistracting?: boolean
}

export interface ReasoningNode {
  id: string
  label: string
  status: NodeStatus
  detail?: string
  connectedTo: string[]
  lawReference?: string
}

export interface ErrorEntry {
  type: string
  lawReference: string
  explanation: string
}

export interface Scenario {
  id: string
  title: string
  description: string
  clueCards: ClueCard[]
  notices: PlatformNotice[]
  timeLimit: number
  reasoningChain: ReasoningNode[]
  correctAnswer: CorrectAnswer
  correctOperations: OperationType[]
  errorAnalysis: Record<string, ErrorEntry>
}

export interface OperationLog {
  timestamp: number
  scenarioId: string
  scenarioIndex: number
  operationType: OperationType
  result: string
  reasoningImpact: string[]
  scoreDelta: number
  isCorrect: boolean
}

export const scenarios: Scenario[] = [
  {
    id: 's1',
    title: '顺利样例：合规歌曲',
    description: '一首原创歌曲，无采样，授权状态正常。请确认其合规性。',
    clueCards: [
      {
        id: 'c1',
        songName: '晚风轻拂',
        author: '陈明',
        authStatus: 'valid',
        isrc: 'CN-A01-25-00123',
      },
    ],
    notices: [
      {
        id: 'n1',
        type: 'info',
        title: '上架通知',
        content: '歌曲《晚风轻拂》已提交上架审核，请确认版权状态。',
      },
    ],
    timeLimit: 30,
    reasoningChain: [
      { id: 'r1', label: '曲目信息', status: 'confirmed', detail: '歌曲《晚风轻拂》，作者：陈明', connectedTo: ['r2'] },
      { id: 'r2', label: '授权状态', status: 'unexplored', connectedTo: ['r3'] },
      { id: 'r3', label: '采样来源', status: 'unexplored', detail: '未标注采样来源', connectedTo: ['r4'] },
      { id: 'r4', label: '合规判断', status: 'unexplored', connectedTo: [] },
    ],
    correctAnswer: 'compliant',
    correctOperations: ['verify-auth', 'submit'],
    errorAnalysis: {
      'skip-verify': {
        type: '操作遗漏',
        lawReference: '《著作权法》第24条',
        explanation: '未验证授权状态就提交结论，即使结果正确也属于审核流程不规范。合规作品仍需走完验证流程。',
      },
      'wrong-judgment': {
        type: '判断错误',
        lawReference: '《著作权法》第24条',
        explanation: '该歌曲授权有效且无采样，应判定为合规。错误判断说明对基本审核流程不熟悉。',
      },
    },
  },
  {
    id: 's2',
    title: '授权过期',
    description: '一首使用了采样的歌曲，采样授权看似有效，但请仔细核查。',
    clueCards: [
      {
        id: 'c2',
        songName: '夜色温柔',
        author: '李华',
        sampleSource: '经典老歌《月光》',
        sampleDuration: 8,
        originalDuration: 210,
        authStatus: 'expired',
        authExpiryDate: '2025-12-31',
        isrc: 'CN-A01-25-00456',
      },
    ],
    notices: [
      {
        id: 'n2a',
        type: 'info',
        title: '上架请求',
        content: '歌曲《夜色温柔》提交上架，标注采样来源《月光》，已获采样授权。',
      },
      {
        id: 'n2b',
        type: 'warning',
        title: '授权到期提醒',
        content: '《月光》采样授权已于2025-12-31到期，请及时续约或下架相关作品。',
        isDistracting: false,
      },
      {
        id: 'n2c',
        type: 'info',
        title: '系统通知',
        content: '本周平台新增歌曲1,247首，版权审核任务已分配。',
        isDistracting: true,
      },
    ],
    timeLimit: 30,
    reasoningChain: [
      { id: 'r1', label: '曲目信息', status: 'confirmed', detail: '歌曲《夜色温柔》，作者：李华', connectedTo: ['r2', 'r3'] },
      { id: 'r2', label: '授权状态', status: 'unexplored', detail: '表面标注"已获采样授权"', connectedTo: ['r4'] },
      { id: 'r3', label: '采样来源', status: 'unexplored', detail: '采样来源：《月光》，8秒/210秒=3.8%', connectedTo: ['r4'] },
      { id: 'r4', label: '合规判断', status: 'unexplored', connectedTo: [] },
    ],
    correctAnswer: 'non-compliant',
    correctOperations: ['verify-auth', 'submit'],
    errorAnalysis: {
      'auth-expired': {
        type: '授权过期未发现',
        lawReference: '《著作权法》第24条、第26条',
        explanation: '采样授权已于2025-12-31到期。授权过期后继续使用采样构成侵权，需重新续约或下架。未主动验证授权状态是日常对账中最常见的疏漏——合同卡上写的"已授权"可能已经过期，必须与时间限制对齐核查。',
      },
      'skip-verify': {
        type: '操作遗漏',
        lawReference: '《著作权法》第24条',
        explanation: '仅凭表面标注"已获采样授权"就放行，未验证授权是否仍在有效期。这正是合同卡与时间限制"打架"的典型情况：授权文件存在但已过期。',
      },
      'wrong-judgment': {
        type: '判断错误',
        lawReference: '《著作权法》第24条',
        explanation: '授权过期后继续使用采样属于侵权行为，应判定为不合规。这是版权审核中"对账"环节的核心——授权状态必须实时核查，不能仅依赖历史记录。',
      },
    },
  },
  {
    id: 's3',
    title: '采样比例超限',
    description: '一首歌曲使用了较大比例的采样，版权方已发起投诉。',
    clueCards: [
      {
        id: 'c3',
        songName: '城市脉搏',
        author: '王磊',
        sampleSource: '《街头节拍》',
        sampleDuration: 12,
        originalDuration: 45,
        authStatus: 'valid',
        isrc: 'CN-A01-25-00789',
      },
    ],
    notices: [
      {
        id: 'n3a',
        type: 'alert',
        title: '版权方投诉',
        content: '《街头节拍》版权方投诉：歌曲《城市脉搏》未经完整授权使用采样，请核查。',
      },
      {
        id: 'n3b',
        type: 'info',
        title: '授权记录',
        content: '《街头节拍》采样授权类型：简化授权（适用于15%以下采样比例）。',
      },
    ],
    timeLimit: 25,
    reasoningChain: [
      { id: 'r1', label: '曲目信息', status: 'confirmed', detail: '歌曲《城市脉搏》，作者：王磊', connectedTo: ['r2', 'r3'] },
      { id: 'r2', label: '授权状态', status: 'unexplored', detail: '持有简化采样授权', connectedTo: ['r4'] },
      { id: 'r3', label: '采样比例', status: 'unexplored', detail: '需计算采样占比', connectedTo: ['r4'] },
      { id: 'r4', label: '合规判断', status: 'unexplored', connectedTo: [] },
    ],
    correctAnswer: 'non-compliant',
    correctOperations: ['check-sample', 'submit'],
    errorAnalysis: {
      'sample-exceeded': {
        type: '采样比例超限',
        lawReference: '《著作权法》第24条、行业惯例采样比例上限15%',
        explanation: '采样时长12秒占原曲45秒的26.7%，远超行业惯例15%上限。简化授权仅适用于15%以下采样，超限需获取完整授权。这是"对齐"问题的核心——授权类型必须与实际采样比例匹配，不能仅看"有授权"就放行。',
      },
      'skip-check': {
        type: '操作遗漏',
        lawReference: '《著作权法》第24条',
        explanation: '未检查采样比例就提交结论。仅凭"有授权"就放行，忽略了授权类型与采样比例的对应关系。版权审核中"对账"的关键在于核对授权范围是否覆盖实际使用量。',
      },
      'wrong-judgment': {
        type: '判断错误',
        lawReference: '《著作权法》第24条',
        explanation: '采样比例超限时，简化授权不足以覆盖使用范围，应判定为不合规并要求补办完整授权。',
      },
    },
  },
  {
    id: 's4',
    title: '同名曲混淆',
    description: '平台上同时出现两首同名歌曲的上架请求，请仔细比对。',
    clueCards: [
      {
        id: 'c4a',
        songName: '追光',
        author: '张薇',
        authStatus: 'valid',
        isrc: 'CN-A01-25-01001',
        hasConflictingTrack: true,
        conflictingTrackAuthor: '刘洋',
        conflictingTrackIsrc: 'CN-A01-25-01002',
      },
      {
        id: 'c4b',
        songName: '追光',
        author: '刘洋',
        authStatus: 'none',
        isrc: 'CN-A01-25-01002',
        hasConflictingTrack: true,
        conflictingTrackAuthor: '张薇',
        conflictingTrackIsrc: 'CN-A01-25-01001',
      },
    ],
    notices: [
      {
        id: 'n4a',
        type: 'warning',
        title: '同名曲目提醒',
        content: '检测到两首同名歌曲《追光》同时提交上架，请核实是否为同一作品。',
      },
      {
        id: 'n4b',
        type: 'info',
        title: '授权查询结果',
        content: '歌曲《追光》（张薇）已获得完整授权；歌曲《追光》（刘洋）无授权记录。',
      },
    ],
    timeLimit: 20,
    reasoningChain: [
      { id: 'r1', label: '曲目信息', status: 'confirmed', detail: '两首同名歌曲《追光》', connectedTo: ['r2'] },
      { id: 'r2', label: '曲目身份', status: 'unexplored', detail: '需确认是否为同一作品', connectedTo: ['r3', 'r4'] },
      { id: 'r3', label: '授权匹配', status: 'unexplored', detail: '需确认授权对应哪首作品', connectedTo: ['r5'] },
      { id: 'r4', label: '同名区分', status: 'unexplored', detail: 'ISRC不同，确为不同作品', connectedTo: ['r5'] },
      { id: 'r5', label: '合规判断', status: 'unexplored', connectedTo: [] },
    ],
    correctAnswer: 'needs-review',
    correctOperations: ['compare-track', 'submit'],
    errorAnalysis: {
      'name-confusion': {
        type: '同名曲主体混淆',
        lawReference: '《著作权法》第11条、第24条',
        explanation: '两首《追光》是不同作品（ISRC不同），张薇的作品已授权而刘洋的未授权。若将刘洋的未授权作品误认为张薇的已授权作品放行，将构成侵权。这是版权审核中"对账"的典型难点——同名不同曲需通过ISRC编码精确区分。',
      },
      'skip-compare': {
        type: '操作遗漏',
        lawReference: '《著作权法》第11条',
        explanation: '未比对同名曲目就提交结论。面对同名作品，必须逐一核实身份与授权，不能假设同名即同一作品。',
      },
      'wrong-judgment': {
        type: '判断错误',
        lawReference: '《著作权法》第11条、第24条',
        explanation: '存在同名未授权作品，应判定"需进一步核实"而非直接放行。批量审核中同名混淆是最容易导致错误放行的情况。',
      },
    },
  },
]
