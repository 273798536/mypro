import dayjs from 'dayjs'
import { openDB, IDBPDatabase } from 'idb'
import type {
  Registration,
  Material,
  Repertoire,
  Payment,
  Document,
  TeacherNote,
  HistoryRecord,
  Snapshot,
} from '@/types'
import { RegistrationStatus, AnomalyType } from '@/types'

export interface MockData {
  registrations: Registration[]
  materials: Material[]
  repertoires: Repertoire[]
  payments: Payment[]
  documents: Document[]
  teacherNotes: TeacherNote[]
  historyRecords: HistoryRecord[]
  snapshots: Snapshot[]
}

const DB_CONFIG = {
  name: 'ExamRegistrationDB',
  version: 1,
  stores: {
    registrations: { keyPath: 'id', indexes: ['status', 'examLevel', 'createdAt'] },
    materials: { keyPath: 'id', indexes: ['registrationId', 'type'] },
    repertoires: { keyPath: 'id', indexes: ['registrationId', 'source'] },
    payments: { keyPath: 'id', indexes: ['registrationId', 'status'] },
    documents: { keyPath: 'id', indexes: ['registrationId', 'type', 'status'] },
    teacherNotes: { keyPath: 'id', indexes: ['registrationId', 'createdAt'] },
    historyRecords: { keyPath: 'id', indexes: ['registrationId', 'createdAt'] },
    snapshots: { keyPath: 'id', indexes: ['registrationId', 'version'] },
  },
} as const

const LAST_NAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '郑']
const FIRST_NAMES_MALE = ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '超', '明', '刚', '平', '辉', '鹏', '华', '飞', '林', '鑫', '宇', '浩']
const FIRST_NAMES_FEMALE = ['芳', '娜', '敏', '静', '丽', '艳', '娟', '莉', '玲', '桂', '娣', '红', '春', '燕', '秋', '霞', '香', '月', '慧', '莹']

const TEACHERS = [
  '王明华', '李建国', '张秀英', '刘芳', '陈志强', '杨丽华', '赵文博', '黄玉梅',
  '周海涛', '吴晓燕', '徐立群', '孙鹏飞', '马晓东', '朱婷婷', '胡建国', '郭美玲',
]



const REPERTOIRES_BY_LEVEL: Record<string, Array<{ name: string; composer: string; version: string }>> = {
  '1': [
    { name: '小步舞曲', composer: '巴赫', version: '初级版' },
    { name: '欢乐颂', composer: '贝多芬', version: '简化版' },
    { name: '小星星变奏曲', composer: '莫扎特', version: '入门版' },
    { name: '两只老虎', composer: '法国民谣', version: '基础版' },
  ],
  '2': [
    { name: '致爱丽丝', composer: '贝多芬', version: '简化版' },
    { name: '童年的回忆', composer: '塞内维尔', version: '标准版' },
    { name: '水边的阿狄丽娜', composer: '塞内维尔', version: '初级版' },
    { name: '梦中的婚礼', composer: '塞内维尔', version: '简化版' },
  ],
  '3': [
    { name: '克罗地亚狂想曲', composer: '马克西姆', version: '简化版' },
    { name: '天空之城', composer: '久石让', version: '标准版' },
    { name: '千与千寻', composer: '久石让', version: '钢琴版' },
    { name: '菊次郎的夏天', composer: '久石让', version: '原版' },
  ],
  '4': [
    { name: '月光奏鸣曲', composer: '贝多芬', version: '第一乐章' },
    { name: '天鹅湖', composer: '柴可夫斯基', version: '选段' },
    { name: '蓝色多瑙河', composer: '施特劳斯', version: '钢琴版' },
    { name: '如歌的行板', composer: '柴可夫斯基', version: '钢琴改编版' },
  ],
  '5': [
    { name: '幻想即兴曲', composer: '肖邦', version: 'op.66' },
    { name: '爱之梦', composer: '李斯特', version: '第三首' },
    { name: '少女的祈祷', composer: '巴达捷夫斯卡', version: '原版' },
    { name: '星星变奏曲', composer: '莫扎特', version: 'K.265' },
  ],
  '6': [
    { name: '悲怆奏鸣曲', composer: '贝多芬', version: 'op.13 第三乐章' },
    { name: '革命练习曲', composer: '肖邦', version: 'op.10 no.12' },
    { name: '钟', composer: '李斯特', version: '帕格尼尼练习曲第3首' },
    { name: '月光', composer: '德彪西', version: '原版' },
  ],
  '7': [
    { name: '热情奏鸣曲', composer: '贝多芬', version: 'op.57 第三乐章' },
    { name: '英雄波兰舞曲', composer: '肖邦', version: 'op.53' },
    { name: '匈牙利狂想曲', composer: '李斯特', version: '第6号' },
    { name: '图画展览会', composer: '穆索尔斯基', version: '选段' },
  ],
  '8': [
    { name: '帕格尼尼主题狂想曲', composer: '拉赫玛尼诺夫', version: 'op.43' },
    { name: '叙事曲', composer: '肖邦', version: 'op.23 g小调' },
    { name: '梅菲斯特圆舞曲', composer: '李斯特', version: '第一首' },
    { name: '伊斯拉美', composer: '巴拉基列夫', version: '东方幻想曲' },
  ],
  '9': [
    { name: '冬风练习曲', composer: '肖邦', version: 'op.25 no.11' },
    { name: '唐璜的回忆', composer: '李斯特', version: 'S.418' },
    { name: '第三钢琴协奏曲', composer: '普罗科菲耶夫', version: 'op.26 第一乐章' },
    { name: '彼得鲁什卡', composer: '斯特拉文斯基', version: '三乐章' },
  ],
  '10': [
    { name: '拉赫玛尼诺夫第三钢琴协奏曲', composer: '拉赫玛尼诺夫', version: 'op.30 全乐章' },
    { name: '贝多芬奏鸣曲 Hammerklavier', composer: '贝多芬', version: 'op.106 全乐章' },
    { name: '超技练习曲 鬼火', composer: '李斯特', version: 'S.139 no.5' },
    { name: '哥德堡变奏曲', composer: '巴赫', version: 'BWV.988 全曲' },
  ],
}

const ALTERNATE_REPERTOIRES: Record<string, Array<{ name: string; composer: string; version: string; reason: string }>> = {
  '1': [
    { name: '小步舞曲', composer: '巴赫', version: '中级版', reason: '报名时填写的是初级版，实际提交的是中级版，难度超出考试要求' },
    { name: '欢乐颂', composer: '贝多芬', version: '原版', reason: '报名填写简化版，实际演奏原版，存在版本差异' },
  ],
  '2': [
    { name: '致爱丽丝', composer: '贝多芬', version: '原版', reason: '报名填写简化版，实际演奏完整原版' },
    { name: '童年的回忆', composer: '塞内维尔', version: '改编版', reason: '提交版本为自行改编，与指定版本不符' },
  ],
  '3': [
    { name: '克罗地亚狂想曲', composer: '马克西姆', version: '原版', reason: '报名填写简化版，实际演奏完整原版，时长超出3分钟限制' },
    { name: '天空之城', composer: '久石让', version: '四手联弹版', reason: '报名填写独奏版，实际提交四手联弹版本' },
  ],
  '4': [
    { name: '月光奏鸣曲', composer: '贝多芬', version: '全三乐章', reason: '报名仅填写第一乐章，实际提交全三乐章' },
    { name: '天鹅湖', composer: '柴可夫斯基', version: '管弦乐版', reason: '提交版本不是钢琴独奏曲，而是管弦乐改编版' },
  ],
  '5': [
    { name: '幻想即兴曲', composer: '肖邦', version: '遗稿版', reason: '报名填写op.66正式版，实际提交的是未经修订的遗稿版本' },
    { name: '爱之梦', composer: '李斯特', version: '第一首', reason: '报名填写第三首，实际演奏第一首，曲目完全不同' },
  ],
  '6': [
    { name: '悲怆奏鸣曲', composer: '贝多芬', version: '第一乐章', reason: '报名填写第三乐章，实际演奏第一乐章' },
    { name: '革命练习曲', composer: '肖邦', version: 'op.10 no.11', reason: '报名填写no.12革命，实际演奏no.11降E大调' },
  ],
  '7': [
    { name: '热情奏鸣曲', composer: '贝多芬', version: '第一乐章', reason: '报名填写第三乐章，实际演奏第一乐章' },
    { name: '英雄波兰舞曲', composer: '肖邦', version: '降A大调波兰舞曲 op.40', reason: '报名填写op.53英雄，实际演奏的是op.40军队波兰舞曲' },
  ],
  '8': [
    { name: '帕格尼尼主题狂想曲', composer: '拉赫玛尼诺夫', version: 'op.43 第18变奏', reason: '报名填写全曲，实际只演奏了第18变奏部分' },
    { name: '叙事曲', composer: '肖邦', version: 'op.38 F大调', reason: '报名填写op.23 g小调，实际演奏op.38 F大调' },
  ],
  '9': [
    { name: '冬风练习曲', composer: '肖邦', version: 'op.25 no.12 大海', reason: '报名填写no.11冬风，实际演奏no.12大海' },
    { name: '唐璜的回忆', composer: '李斯特', version: '节选版', reason: '报名填写全曲S.418，实际提交的是删节版本' },
  ],
  '10': [
    { name: '拉赫玛尼诺夫第二钢琴协奏曲', composer: '拉赫玛尼诺夫', version: 'op.18', reason: '报名填写第三钢琴协奏曲op.30，实际提交的是第二钢琴协奏曲' },
    { name: '哥德堡变奏曲', composer: '巴赫', version: 'BWV.988 主题', reason: '报名填写全曲，实际只演奏了主题和前5个变奏' },
  ],
}

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min

const generateChineseName = (gender: 'male' | 'female'): string => {
  const lastName = randomItem(LAST_NAMES)
  const firstNames = gender === 'male' ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE
  const firstName = randomInt(0, 1) === 0 ? randomItem(firstNames) : randomItem(firstNames) + randomItem(firstNames)
  return lastName + firstName
}

const generateIdNumber = (): string => {
  const provinces = ['11', '12', '13', '31', '32', '33', '44', '51']
  const province = randomItem(provinces)
  const city = String(randomInt(10, 99))
  const district = String(randomInt(10, 99))
  const birthYear = String(randomInt(2008, 2018))
  const birthMonth = String(randomInt(1, 12)).padStart(2, '0')
  const birthDay = String(randomInt(1, 28)).padStart(2, '0')
  const sequence = String(randomInt(100, 999))
  const checkCode = randomItem(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X'])
  return `${province}${city}${district}${birthYear}${birthMonth}${birthDay}${sequence}${checkCode}`
}

const generatePhone = (): string => {
  const prefixes = ['138', '139', '158', '159', '188', '189', '136', '137', '150', '151']
  const prefix = randomItem(prefixes)
  const suffix = String(randomInt(10000000, 99999999))
  return prefix + suffix
}

const generateRegistration = (
  index: number,
  statusConfig: { status: RegistrationStatus; anomalies: AnomalyType[] }
): { registration: Registration; seedData: { gender: 'male' | 'female'; examLevel: string; hasMismatch: boolean; isPaymentLate: boolean; hasMissingDoc: boolean } } => {
  const gender: 'male' | 'female' = randomInt(0, 1) === 0 ? 'male' : 'female'
  const examLevel = String((index % 10) + 1) as Registration['examLevel']
  const baseDate = dayjs().subtract(randomInt(5, 60), 'day')

  const hasMismatch = statusConfig.anomalies.includes(AnomalyType.REPERTOIRE_MISMATCH)
  const isPaymentLate = statusConfig.anomalies.includes(AnomalyType.PAYMENT_LATE)
  const hasMissingDoc = statusConfig.anomalies.includes(AnomalyType.DOCUMENT_MISSING)

  const registration: Registration = {
    id: generateUUID(),
    studentName: generateChineseName(gender),
    gender,
    idNumber: generateIdNumber(),
    examLevel,
    guideTeacher: randomItem(TEACHERS),
    phone: generatePhone(),
    status: statusConfig.status,
    anomalies: statusConfig.anomalies,
    createdAt: baseDate.format('YYYY-MM-DDTHH:mm:ss'),
    updatedAt: baseDate.add(randomInt(1, 5), 'day').format('YYYY-MM-DDTHH:mm:ss'),
    version: 1,
  }

  return {
    registration,
    seedData: { gender, examLevel, hasMismatch, isPaymentLate, hasMissingDoc },
  }
}

const generateMaterials = (
  registrationId: string,
  baseDate: dayjs.Dayjs,
  anomalies: AnomalyType[]
): Material[] => {
  const materialTypes: Array<{ type: Material['type']; name: string }> = [
    { type: 'application_form', name: '考级报名表' },
    { type: 'repertoire_page', name: '曲目版本页' },
    { type: 'payment_receipt', name: '缴费回执' },
    { type: 'photo', name: '近期免冠照片' },
  ]

  const hasIncomplete = anomalies.includes(AnomalyType.MATERIAL_INCOMPLETE)

  return materialTypes.map((mt, idx) => {
    let status: Material['status'] = 'submitted'
    if (hasIncomplete && idx === randomInt(0, 3)) {
      status = 'pending'
    }
    if (anomalies.includes(AnomalyType.REPERTOIRE_MISMATCH) && mt.type === 'repertoire_page') {
      status = 'rejected'
    }

    return {
      id: generateUUID(),
      registrationId,
      type: mt.type,
      name: mt.name,
      status,
      submittedAt: baseDate.add(idx, 'day').format('YYYY-MM-DDTHH:mm:ss'),
      fileUrl: status !== 'pending' ? `/files/${registrationId}/${mt.type}.pdf` : undefined,
    }
  })
}

const generateRepertoires = (
  registrationId: string,
  examLevel: string,
  hasMismatch: boolean
): Repertoire[] => {
  const repertoires: Repertoire[] = []
  const count = randomInt(2, 3)
  const baseRepertoires = REPERTOIRES_BY_LEVEL[examLevel]
  const altRepertoires = ALTERNATE_REPERTOIRES[examLevel]

  for (let i = 0; i < count; i++) {
    const base = baseRepertoires[i % baseRepertoires.length]

    repertoires.push({
      id: generateUUID(),
      registrationId,
      name: base.name,
      composer: base.composer,
      version: base.version,
      source: 'application',
      isMatched: !hasMismatch || i > 0,
      mismatchReason: hasMismatch && i === 0 ? altRepertoires[0].reason : undefined,
    })

    let actual = base
    const isMatched = !hasMismatch || i > 0
    let mismatchReason: string | undefined

    if (hasMismatch && i === 0 && altRepertoires.length > 0) {
      actual = altRepertoires[0]
      mismatchReason = altRepertoires[0].reason
    }

    repertoires.push({
      id: generateUUID(),
      registrationId,
      name: actual.name,
      composer: actual.composer,
      version: actual.version,
      source: 'actual',
      isMatched,
      mismatchReason,
    })
  }

  return repertoires
}

const generatePayment = (
  registrationId: string,
  baseDate: dayjs.Dayjs,
  isLate: boolean
): Payment => {
  const examFeeMap: Record<string, number> = {
    '1': 200, '2': 260, '3': 320, '4': 380, '5': 450,
    '6': 520, '7': 600, '8': 700, '9': 800, '10': 1000,
  }
  const level = registrationId.slice(-1) || '5'
  const amount = examFeeMap[level] || 450
  const expectedDate = baseDate.add(3, 'day')

  if (isLate) {
    const lateDays = randomInt(8, 30)
    const actualDate = expectedDate.add(lateDays, 'day')
    const lateFee = Math.floor(amount * 0.05 * Math.min(lateDays / 7, 4))

    return {
      id: generateUUID(),
      registrationId,
      amount,
      expectedDate: expectedDate.format('YYYY-MM-DD'),
      actualDate: actualDate.format('YYYY-MM-DD'),
      status: 'paid',
      isLate: true,
      receiptUrl: `/files/${registrationId}/payment_receipt.pdf`,
      lateFee,
    }
  }

  const isPaid = randomInt(0, 1) === 0
  return {
    id: generateUUID(),
    registrationId,
    amount,
    expectedDate: expectedDate.format('YYYY-MM-DD'),
    actualDate: isPaid ? expectedDate.subtract(randomInt(0, 2), 'day').format('YYYY-MM-DD') : undefined,
    status: isPaid ? 'paid' : 'pending',
    isLate: false,
    receiptUrl: isPaid ? `/files/${registrationId}/payment_receipt.pdf` : undefined,
  }
}

const generateDocuments = (
  registrationId: string,
  baseDate: dayjs.Dayjs,
  hasMissing: boolean
): Document[] => {
  const docTypes: Array<{ type: Document['type']; name: string }> = [
    { type: 'id_card', name: '身份证' },
    { type: 'previous_certificate', name: '上一级考级证书' },
    { type: 'photo', name: '证件照片' },
    { type: 'other', name: '其他证明材料' },
  ]

  const missingIndex = hasMissing ? randomInt(1, 2) : -1

  return docTypes.map((dt, idx) => {
    const isMissing = hasMissing && idx === missingIndex
    const isExpired = !isMissing && dt.type === 'id_card' && randomInt(0, 9) === 0

    return {
      id: generateUUID(),
      registrationId,
      type: dt.type,
      status: isMissing ? 'missing' : isExpired ? 'expired' : 'valid',
      expiryDate: isMissing ? undefined : baseDate.add(randomInt(1, 5), 'year').format('YYYY-MM-DD'),
      fileUrl: isMissing ? undefined : `/files/${registrationId}/${dt.type}.jpg`,
      isMissing,
      missingNote: isMissing ? `缺少${dt.name}，请在7个工作日内补充` : undefined,
    }
  })
}

const generateTeacherNotes = (
  registrationId: string,
  baseDate: dayjs.Dayjs,
  hasMismatch: boolean,
  isPaymentLate: boolean,
  hasMissingDoc: boolean
): TeacherNote[] => {
  const notes: TeacherNote[] = []
  const teachers = ['王明华', '李建国', '张秀英', '刘芳']

  if (hasMismatch) {
    notes.push({
      id: generateUUID(),
      registrationId,
      teacherName: randomItem(teachers),
      content: '系统检测到曲目版本不符，但我与学生家长确认过，该生实际水平已达到中级版要求。考虑到学生准备时间充分，建议特批通过本次考试。学生现场演奏视频已存档备查。',
      evidenceType: 'repertoire',
      createdAt: baseDate.add(2, 'day').format('YYYY-MM-DDTHH:mm:ss'),
      isContradictory: true,
    })
  }

  if (isPaymentLate) {
    notes.push({
      id: generateUUID(),
      registrationId,
      teacherName: randomItem(teachers),
      content: '缴费晚到情况属实，家长说明是由于公司财务流程延误导致。现已补缴滞纳金，学生本人学习态度认真，建议保留考试资格。',
      evidenceType: 'payment',
      createdAt: baseDate.add(5, 'day').format('YYYY-MM-DDTHH:mm:ss'),
      isContradictory: false,
    })
  }

  if (hasMissingDoc) {
    notes.push({
      id: generateUUID(),
      registrationId,
      teacherName: randomItem(teachers),
      content: '上一级考级证书正在补办中，学生提供了原证书扫描件和考级中心出具的证明。根据补充材料，确认学生已通过上一级考试，建议先审核其他材料。',
      evidenceType: 'document',
      createdAt: baseDate.add(3, 'day').format('YYYY-MM-DDTHH:mm:ss'),
      isContradictory: true,
    })
  }

  if (!hasMismatch && !isPaymentLate && !hasMissingDoc && randomInt(0, 1) === 0) {
    notes.push({
      id: generateUUID(),
      registrationId,
      teacherName: randomItem(teachers),
      content: '该生平时上课表现优秀，曲目完成度高，建议优先安排考试时间。家长反馈学生希望能在上午时段参加考试。',
      evidenceType: 'other',
      createdAt: baseDate.add(1, 'day').format('YYYY-MM-DDTHH:mm:ss'),
      isContradictory: false,
    })
  }

  return notes
}

const generateHistoryRecords = (
  registrationId: string,
  baseDate: dayjs.Dayjs,
  status: RegistrationStatus,
  anomalies: AnomalyType[]
): HistoryRecord[] => {
  const records: HistoryRecord[] = []
  const operators = ['张运营', '李审核', '王老师']

  records.push({
    id: generateUUID(),
    registrationId,
    operator: randomItem(operators),
    action: '提交报名',
    newValue: '状态：待审核',
    createdAt: baseDate.format('YYYY-MM-DDTHH:mm:ss'),
  })

  records.push({
    id: generateUUID(),
    registrationId,
    operator: randomItem(operators),
    action: '系统自动检测',
    newValue: anomalies.length > 0 ? `检测到异常：${anomalies.join('、')}` : '材料齐全，无异常',
    createdAt: baseDate.add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
  })

  if (status === 'repertoire_mismatch') {
    records.push({
      id: generateUUID(),
      registrationId,
      operator: randomItem(operators),
      action: '曲目核对',
      oldValue: '报名曲目版本',
      newValue: '实际演奏版本不符',
      createdAt: baseDate.add(1, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    })
  }

  if (status === 'payment_late') {
    records.push({
      id: generateUUID(),
      registrationId,
      operator: randomItem(operators),
      action: '缴费确认',
      oldValue: '待缴费',
      newValue: '缴费晚到，已收滞纳金',
      createdAt: baseDate.add(5, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    })
  }

  if (status === 'document_missing') {
    records.push({
      id: generateUUID(),
      registrationId,
      operator: randomItem(operators),
      action: '证件查验',
      newValue: '发现证件缺失，已通知家长补充',
      createdAt: baseDate.add(2, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    })
  }

  if (status === 'passed') {
    records.push({
      id: generateUUID(),
      registrationId,
      operator: randomItem(operators),
      action: '审核通过',
      oldValue: '审核中',
      newValue: '审核通过',
      createdAt: baseDate.add(3, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    })
  }

  if (status === 'rejected') {
    records.push({
      id: generateUUID(),
      registrationId,
      operator: randomItem(operators),
      action: '审核驳回',
      oldValue: '审核中',
      newValue: '审核驳回，原因：材料不符合要求',
      createdAt: baseDate.add(4, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    })
  }

  return records
}

const generateSnapshots = (
  registrationId: string,
  registration: Registration,
  materials: Material[],
  repertoires: Repertoire[],
  payment: Payment,
  documents: Document[],
  baseDate: dayjs.Dayjs
): Snapshot[] => {
  const snapshots: Snapshot[] = []

  snapshots.push({
    id: generateUUID(),
    registrationId,
    version: 1,
    data: {
      registration: { ...registration },
      materials: materials.map((m) => ({ ...m })),
      repertoires: repertoires.map((r) => ({ ...r })),
      payment: { ...payment },
      documents: documents.map((d) => ({ ...d })),
    },
    reason: '初始提交版本',
    createdAt: baseDate.format('YYYY-MM-DDTHH:mm:ss'),
  })

  if (registration.status !== 'pending') {
    snapshots.push({
      id: generateUUID(),
      registrationId,
      version: 2,
      data: {
        registration: { ...registration, status: registration.status, anomalies: registration.anomalies },
        materials: materials.map((m) => ({ ...m })),
        repertoires: repertoires.map((r) => ({ ...r })),
        payment: { ...payment },
        documents: documents.map((d) => ({ ...d })),
      },
      reason: `状态变更：${registration.status}`,
      createdAt: baseDate.add(2, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    })
  }

  return snapshots
}

const generateMockData = (): MockData => {
  const statusConfigs: Array<{ status: RegistrationStatus; anomalies: AnomalyType[] }> = [
    { status: RegistrationStatus.PASSED, anomalies: [] },
    { status: RegistrationStatus.PASSED, anomalies: [] },
    { status: RegistrationStatus.PASSED, anomalies: [] },
    { status: RegistrationStatus.REVIEWING, anomalies: [] },
    { status: RegistrationStatus.REVIEWING, anomalies: [] },
    { status: RegistrationStatus.REPERTOIRE_MISMATCH, anomalies: [AnomalyType.REPERTOIRE_MISMATCH, AnomalyType.TEACHER_CONTRADICTION] },
    { status: RegistrationStatus.REPERTOIRE_MISMATCH, anomalies: [AnomalyType.REPERTOIRE_MISMATCH] },
    { status: RegistrationStatus.PAYMENT_LATE, anomalies: [AnomalyType.PAYMENT_LATE] },
    { status: RegistrationStatus.PAYMENT_LATE, anomalies: [AnomalyType.PAYMENT_LATE, AnomalyType.TEACHER_CONTRADICTION] },
    { status: RegistrationStatus.DOCUMENT_MISSING, anomalies: [AnomalyType.DOCUMENT_MISSING] },
    { status: RegistrationStatus.DOCUMENT_MISSING, anomalies: [AnomalyType.DOCUMENT_MISSING, AnomalyType.TEACHER_CONTRADICTION] },
    { status: RegistrationStatus.DOCUMENT_MISSING, anomalies: [AnomalyType.DOCUMENT_MISSING, AnomalyType.MATERIAL_INCOMPLETE] },
    { status: RegistrationStatus.MATERIALS_INCOMPLETE, anomalies: [AnomalyType.MATERIAL_INCOMPLETE] },
    { status: RegistrationStatus.SUPPLEMENT, anomalies: [AnomalyType.MATERIAL_INCOMPLETE, AnomalyType.DOCUMENT_MISSING] },
    { status: RegistrationStatus.REJECTED, anomalies: [AnomalyType.REPERTOIRE_MISMATCH, AnomalyType.DOCUMENT_MISSING] },
    { status: RegistrationStatus.REJECTED, anomalies: [AnomalyType.PAYMENT_LATE, AnomalyType.DOCUMENT_MISSING] },
    { status: RegistrationStatus.PASSED, anomalies: [AnomalyType.TEACHER_CONTRADICTION] },
    { status: RegistrationStatus.PENDING, anomalies: [] },
  ]

  const count = randomInt(15, 20)
  const mockData: MockData = {
    registrations: [],
    materials: [],
    repertoires: [],
    payments: [],
    documents: [],
    teacherNotes: [],
    historyRecords: [],
    snapshots: [],
  }

  for (let i = 0; i < count; i++) {
    const config = statusConfigs[i % statusConfigs.length]
    const { registration, seedData } = generateRegistration(i, config)
    const baseDate = dayjs(registration.createdAt)

    const materials = generateMaterials(registration.id, baseDate, registration.anomalies)
    const repertoires = generateRepertoires(registration.id, seedData.examLevel, seedData.hasMismatch)
    const payment = generatePayment(registration.id, baseDate, seedData.isPaymentLate)
    const documents = generateDocuments(registration.id, baseDate, seedData.hasMissingDoc)
    const teacherNotes = generateTeacherNotes(
      registration.id,
      baseDate,
      seedData.hasMismatch,
      seedData.isPaymentLate,
      seedData.hasMissingDoc
    )
    const historyRecords = generateHistoryRecords(
      registration.id,
      baseDate,
      registration.status,
      registration.anomalies
    )
    const snapshots = generateSnapshots(
      registration.id,
      registration,
      materials,
      repertoires,
      payment,
      documents,
      baseDate
    )

    mockData.registrations.push(registration)
    mockData.materials.push(...materials)
    mockData.repertoires.push(...repertoires)
    mockData.payments.push(payment)
    mockData.documents.push(...documents)
    mockData.teacherNotes.push(...teacherNotes)
    mockData.historyRecords.push(...historyRecords)
    mockData.snapshots.push(...snapshots)
  }

  return mockData
}

export const mockData = generateMockData()

const initDatabase = async (): Promise<IDBPDatabase> => {
  return openDB(DB_CONFIG.name, DB_CONFIG.version, {
    upgrade(db) {
      Object.entries(DB_CONFIG.stores).forEach(([storeName, config]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: config.keyPath })
          if (config.indexes) {
            config.indexes.forEach((index) => {
              store.createIndex(index, index, { unique: false })
            })
          }
        }
      })
    },
  })
}

export const initMockData = async (): Promise<void> => {
  try {
    const db = await initDatabase()

    const existingCount = await db.count('registrations')
    if (existingCount > 0) {
      console.log('[MockData] 数据库已存在数据，跳过初始化')
      return
    }

    const data = generateMockData()
    const tx = db.transaction(
      [
        'registrations',
        'materials',
        'repertoires',
        'payments',
        'documents',
        'teacherNotes',
        'historyRecords',
        'snapshots',
      ],
      'readwrite'
    )

    await Promise.all([
      ...data.registrations.map((r) => tx.objectStore('registrations').add(r)),
      ...data.materials.map((m) => tx.objectStore('materials').add(m)),
      ...data.repertoires.map((r) => tx.objectStore('repertoires').add(r)),
      ...data.payments.map((p) => tx.objectStore('payments').add(p)),
      ...data.documents.map((d) => tx.objectStore('documents').add(d)),
      ...data.teacherNotes.map((n) => tx.objectStore('teacherNotes').add(n)),
      ...data.historyRecords.map((h) => tx.objectStore('historyRecords').add(h)),
      ...data.snapshots.map((s) => tx.objectStore('snapshots').add(s)),
    ])

    await tx.done
    console.log(`[MockData] 成功初始化 ${data.registrations.length} 条报名数据`)
  } catch (error) {
    console.error('[MockData] 初始化失败:', error)
    throw error
  }
}

export const clearMockData = async (): Promise<void> => {
  try {
    const db = await initDatabase()
    const tx = db.transaction(
      [
        'registrations',
        'materials',
        'repertoires',
        'payments',
        'documents',
        'teacherNotes',
        'historyRecords',
        'snapshots',
      ],
      'readwrite'
    )

    await Promise.all([
      tx.objectStore('registrations').clear(),
      tx.objectStore('materials').clear(),
      tx.objectStore('repertoires').clear(),
      tx.objectStore('payments').clear(),
      tx.objectStore('documents').clear(),
      tx.objectStore('teacherNotes').clear(),
      tx.objectStore('historyRecords').clear(),
      tx.objectStore('snapshots').clear(),
    ])

    await tx.done
    console.log('[MockData] 数据库已清空')
  } catch (error) {
    console.error('[MockData] 清空数据库失败:', error)
    throw error
  }
}

export const resetMockData = async (): Promise<void> => {
  await clearMockData()
  await initMockData()
}
