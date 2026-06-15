import type {
  Student, Track, Booth, BoothSettlement, ExceptionQueueItem,
  Festival, ProgressRecord, AuthInfo, SchedulerViewItem
} from '../types';

const now = Date.now();
const day = 86400000;

export const mockStudents: Student[] = [
  { id: 's001', name: '陈子轩', grade: '初三', instrument: '小提琴', joinDate: '2023-09-01' },
  { id: 's002', name: '李雨桐', grade: '初二', instrument: '钢琴', joinDate: '2022-03-15' },
  { id: 's003', name: '王浩然', grade: '高一', instrument: '吉他', joinDate: '2023-01-10' },
  { id: 's004', name: '张诗涵', grade: '初三', instrument: '古筝', joinDate: '2021-06-20' },
  { id: 's005', name: '刘嘉豪', grade: '高二', instrument: '架子鼓', joinDate: '2022-08-05' },
  { id: 's006', name: '陈雅琪', grade: '初一', instrument: '长笛', joinDate: '2023-11-01' },
  { id: 's007', name: '黄子轩', grade: '高一', instrument: '萨克斯', joinDate: '2022-05-18' },
  { id: 's008', name: '赵欣怡', grade: '初三', instrument: '二胡', joinDate: '2023-02-14' },
];

export const mockTracks: Track[] = [
  {
    id: 't001', name: '《克罗地亚狂想曲》四手联弹',
    studentIds: ['s002', 's004'], teacherId: 'lin',
    durationMinutes: 6, scheduledTime: '2026-06-20 14:30', stage: '主舞台A区',
    status: 'scheduled', difficulty: 'advanced', genre: '古典',
    notes: '需要提前30分钟到场试琴'
  },
  {
    id: 't002', name: '《青花瓷》古筝与小提琴合奏',
    studentIds: ['s001', 's004'], teacherId: 'lin',
    durationMinutes: 5, scheduledTime: '2026-06-20 15:15', stage: '主舞台A区',
    status: 'scheduled', difficulty: 'intermediate', genre: '国风',
    notes: '服装统一着汉服'
  },
  {
    id: 't003', name: '《海阔天空》乐队组曲',
    studentIds: ['s003', 's005', 's007'], teacherId: 'lin',
    durationMinutes: 8, scheduledTime: '2026-06-20 16:40', stage: '户外舞台B区',
    status: 'scheduled', difficulty: 'intermediate', genre: '流行摇滚',
    notes: '吉他手需要自备效果器'
  },
  {
    id: 't004', name: '《卡农》长笛独奏',
    studentIds: ['s006'], teacherId: 'lin',
    durationMinutes: 4, scheduledTime: '2026-06-20 17:20', stage: '室内小剧场',
    status: 'scheduled', difficulty: 'beginner', genre: '古典'
  },
  {
    id: 't005', name: '《赛马》二胡齐奏',
    studentIds: ['s008', 's004'], teacherId: 'lin',
    durationMinutes: 5, scheduledTime: '2026-06-20 19:00', stage: '主舞台A区',
    status: 'scheduled', difficulty: 'advanced', genre: '民乐',
    notes: '压轴节目，注意衔接'
  },
];

export const mockBooths: Booth[] = [
  { id: 'b001', name: '星光文创摊位', type: 'merchandise', operator: '王姐文创工作室', location: '入口左侧1号', contactPhone: '138****5678', boothFee: 1500, revenueTarget: 8000 },
  { id: 'b002', name: '音符小吃铺', type: 'food', operator: '张阿姨餐饮', location: '中场休息区2号', contactPhone: '139****1234', boothFee: 2000, revenueTarget: 15000 },
  { id: 'b003', name: '乐器体验角', type: 'experience', operator: '琴行赞助', location: '主舞台旁3号', contactPhone: '137****9012', boothFee: 0, revenueTarget: 5000 },
  { id: 'b004', name: '纪念品快闪店', type: 'sponsor', operator: '品牌冠名商', location: '出口处4号', contactPhone: '136****3456', boothFee: 5000, revenueTarget: 30000 },
];

export const mockFestival: Festival = {
  id: 'f2026summer',
  name: '2026夏日星光音乐节',
  date: '2026-06-20',
  venue: '城市文化广场',
  organizer: '星光音乐培训中心',
  authorizationExpiry: new Date(now + 14 * day).toISOString().split('T')[0],
  status: 'active',
  totalRevenue: 58000,
  settledAmount: 32000,
  pendingAmount: 26000,
};

export const mockSettlements: BoothSettlement[] = [
  {
    id: 'settle001', festivalId: 'f2026summer', trackId: 't001', boothId: 'b001',
    actualRevenue: 9600, systemCalculatedShare: 2880, actualShare: 2880,
    studentShare: 1152, teacherShare: 864, boothShare: 576, platformShare: 288,
    status: 'aligned', settlementDate: '2026-06-21', operatorName: '王姐文创工作室'
  },
  {
    id: 'settle002', festivalId: 'f2026summer', trackId: 't002', boothId: 'b001',
    actualRevenue: 7200, systemCalculatedShare: 2160, actualShare: 2160,
    studentShare: 864, teacherShare: 648, boothShare: 432, platformShare: 216,
    status: 'aligned', settlementDate: '2026-06-21', operatorName: '王姐文创工作室'
  },
  {
    id: 'settle003', festivalId: 'f2026summer', trackId: 't003', boothId: 'b002',
    actualRevenue: 18500, systemCalculatedShare: 5550, actualShare: 5550,
    studentShare: 2220, teacherShare: 1665, boothShare: 1110, platformShare: 555,
    status: 'aligned', settlementDate: '2026-06-21', operatorName: '张阿姨餐饮'
  },
  {
    id: 'settle004', festivalId: 'f2026summer', trackId: 't004', boothId: 'b003',
    actualRevenue: 6200, systemCalculatedShare: 1860, actualShare: 1860,
    studentShare: 744, teacherShare: 558, boothShare: 372, platformShare: 186,
    status: 'exception', settlementDate: '2026-06-21', operatorName: '琴行赞助'
  },
  {
    id: 'settle005', festivalId: 'f2026summer', trackId: 't005', boothId: 'b004',
    actualRevenue: 32000, systemCalculatedShare: 9600, actualShare: 8800,
    studentShare: 3520, teacherShare: 2640, boothShare: 1760, platformShare: 880,
    status: 'manual_review', settlementDate: '2026-06-21', operatorName: '品牌冠名商'
  },
];

export const mockExceptions: ExceptionQueueItem[] = [
  {
    id: 'ex001', festivalId: 'f2026summer', settlementId: 'settle004',
    type: 'missing_evidence',
    humanReason: '乐器体验角当天下午POS机网络中断，有4笔交易走了现金收款，小票还没补齐，系统少算了大概1200块钱',
    severity: 'medium', status: 'pending_evidence',
    reportedBy: '系统自动检测', reportedAt: '2026-06-21 10:30',
    assignedTo: '林姐',
    evidenceRequired: ['现金收款小票照片', '当日盘点表签字页', '摊主说明文档'],
    evidenceProvided: ['摊主说明文档'],
    nextStep: '请联系琴行赞助的李经理补充现金收款小票和盘点表，提交后重新触发分账计算',
    needsManualConfirm: false, isManualOverride: false,
    filterSnapshot: { dateRange: ['2026-06-20', '2026-06-20'], boothType: 'experience', minRevenue: 5000 }
  },
  {
    id: 'ex002', festivalId: 'f2026summer', settlementId: 'settle005',
    type: 'manual_adjustment',
    humanReason: '冠名商老板是学生家长，现场口头答应给压轴节目额外加800块鼓励奖，林姐已经签字确认，但系统还没录这笔',
    severity: 'high', status: 'investigating',
    reportedBy: '林姐（人工改判）', reportedAt: '2026-06-22 09:15',
    assignedTo: '财务-刘姐',
    evidenceRequired: ['林姐签字的纸质确认单扫描件', '与冠名商的微信沟通记录'],
    evidenceProvided: ['林姐签字的纸质确认单扫描件'],
    nextStep: '请财务刘姐复核纸质确认单，确认后在系统中添加800元额外奖励并重新分账，保留本次人工改判痕迹',
    needsManualConfirm: true, isManualOverride: true,
    filterSnapshot: { dateRange: ['2026-06-20', '2026-06-20'], boothType: 'sponsor', status: 'manual_review' }
  },
  {
    id: 'ex003', festivalId: 'f2026summer', settlementId: 'settle003',
    type: 'revenue_mismatch',
    humanReason: '小吃铺傍晚6点到7点那场报的营业额和系统流水对不上，差了350块，摊主说有一笔退单忘了录',
    severity: 'low', status: 'open',
    reportedBy: '系统自动检测', reportedAt: '2026-06-21 14:20',
    assignedTo: '排班-小赵',
    nextStep: '让张阿姨找出那笔退单的小票，拍照上传后更新实际营收即可',
    needsManualConfirm: false, isManualOverride: false,
    filterSnapshot: { dateRange: ['2026-06-20', '2026-06-20'], boothType: 'food' }
  },
];

export const mockProgressRecords: ProgressRecord[] = [
  {
    id: 'p001', studentId: 's001', periodStart: '2026-03-01', periodEnd: '2026-06-15',
    overallChange: 18,
    dimensions: [
      { key: 'pitch', name: '音准', previousScore: 72, currentScore: 88, maxScore: 100, note: '连续三个月稳定在85分以上，尤其高音区不再飘' },
      { key: 'rhythm', name: '节奏感', previousScore: 80, currentScore: 89, maxScore: 100, note: '复杂节拍处理比之前准确很多，合奏时不拖拍了' },
      { key: 'expression', name: '音乐表现力', previousScore: 65, currentScore: 82, maxScore: 100, note: '开始有自己的处理，渐强渐弱不再生硬' },
      { key: 'technique', name: '演奏技巧', previousScore: 78, currentScore: 86, maxScore: 100, note: '换把位流畅了很多，颤音频率更均匀' },
    ],
    highlights: [
      '《青花瓷》合奏中音准稳定性提升最明显，和古筝声部的融合度很好',
      '主动提出加练高音段落，练习量比上周期多了约30%',
      '演出彩排时一次通过，没有出现之前常见的紧张失误'
    ],
    suggestions: [
      '可以尝试更多揉弦变化，让慢板段落更有歌唱性',
      '加强五线谱视奏训练，目前还是依赖简谱记忆'
    ],
    teacherComment: '子轩这学期进步非常突出，尤其是音准和表现力的提升让我很惊喜。继续保持这份主动练习的劲头，下一阶段可以开始准备考级曲目了。',
    createdAt: '2026-06-15 16:30'
  },
  {
    id: 'p002', studentId: 's002', periodStart: '2026-03-01', periodEnd: '2026-06-15',
    overallChange: 12,
    dimensions: [
      { key: 'pitch', name: '音准', previousScore: 90, currentScore: 94, maxScore: 100, note: '本身基础就好，现在更稳定了' },
      { key: 'rhythm', name: '节奏感', previousScore: 85, currentScore: 91, maxScore: 100, note: '四手联弹时和队友的配合越来越默契' },
      { key: 'expression', name: '音乐表现力', previousScore: 78, currentScore: 87, maxScore: 100, note: '强弱对比开始有层次了' },
      { key: 'technique', name: '演奏技巧', previousScore: 82, currentScore: 90, maxScore: 100, note: '八度和弦发力更放松，不再僵硬' },
    ],
    highlights: [
      '《克罗地亚狂想曲》四手联弹中担任第一钢琴，声部平衡做得非常好',
      '主动帮队友纠正节奏，团队协作意识强',
      '背谱速度快，新曲子一周就能脱谱演奏'
    ],
    suggestions: [
      '慢曲子的气息感还可以再雕琢，不要每个音都弹得太"满"',
      '尝试即兴伴奏训练，提升应变能力'
    ],
    teacherComment: '雨桐是老师的好帮手，练琴自觉性一直不用操心。四手联弹这次挑大梁完成得很出色，继续往专业方向走完全没问题。',
    createdAt: '2026-06-15 17:10'
  },
  {
    id: 'p003', studentId: 's003', periodStart: '2026-03-01', periodEnd: '2026-06-15',
    overallChange: 22,
    dimensions: [
      { key: 'rhythm', name: '节奏感', previousScore: 60, currentScore: 80, maxScore: 100, note: '之前扫弦节奏不稳，现在和鼓点对齐率大幅提升' },
      { key: 'technique', name: '演奏技巧', previousScore: 58, currentScore: 78, maxScore: 100, note: '大横按终于过关了，F和弦不再是拦路虎' },
      { key: 'expression', name: '音乐表现力', previousScore: 62, currentScore: 79, maxScore: 100, note: '开始懂得用动态对比制造情绪起伏' },
      { key: 'stage', name: '舞台表现', previousScore: 55, currentScore: 75, maxScore: 100, note: '上台不再紧张忘谱，还能和观众互动' },
    ],
    highlights: [
      '从零起步到能弹《海阔天空》完整solo，进步速度超出预期',
      '乐队排练从不缺席，每次都提前到调琴',
      '主动购买效果器研究音色，学习热情很高'
    ],
    suggestions: [
      '加强乐理学习，目前对和弦级数理解还不够深入',
      '练琴时开节拍器，不要只靠感觉'
    ],
    teacherComment: '浩然是这学期进步最大的学生，从一个和弦都按不稳到现在能在乐队里挑大梁，这份坚持值得所有同学学习。继续加油！',
    createdAt: '2026-06-15 18:00'
  },
  {
    id: 'p004', studentId: 's004', periodStart: '2026-03-01', periodEnd: '2026-06-15',
    overallChange: 15,
    dimensions: [
      { key: 'technique', name: '演奏技巧', previousScore: 85, currentScore: 92, maxScore: 100, note: '摇指更加均匀持久，快板段落颗粒感清晰' },
      { key: 'expression', name: '音乐表现力', previousScore: 80, currentScore: 90, maxScore: 100, note: '《青花瓷》的韵味弹出来了，有古风的意境' },
      { key: 'collab', name: '合奏能力', previousScore: 75, currentScore: 89, maxScore: 100, note: '和小提琴、二胡的配合越来越有默契' },
      { key: 'sightread', name: '视奏能力', previousScore: 70, currentScore: 82, maxScore: 100, note: '新谱子上手速度明显提高' },
    ],
    highlights: [
      '一人参加三个节目（古筝独奏、合奏、齐奏），全部高质量完成',
      '主动帮新来的同学识谱，耐心讲解指法',
      '《赛马》齐奏中担任领奏，带动整个声部'
    ],
    suggestions: [
      '左手按弦力度还可以更稳定，个别音偏高',
      '慢板段落的留白可以更大胆一些'
    ],
    teacherComment: '诗涵是我们的"全能选手"，这学期在保持个人水平的同时还帮助了很多同学，老师非常感谢你的付出。继续朝全面发展！',
    createdAt: '2026-06-15 19:20'
  },
];

export const mockAuth: AuthInfo = {
  festivalId: 'f2026summer',
  authorizedUntil: new Date(now + 14 * day).toISOString().split('T')[0],
  remainingDays: 14,
  isExpired: false,
  features: ['track_management', 'settlement_alignment', 'progress_report', 'excel_export', 'scheduler_view'],
};

export const mockSchedulerItems: SchedulerViewItem[] = [
  {
    id: 'sv001', festivalId: 'f2026summer', festivalName: '2026夏日星光音乐节',
    processedCount: 3, totalCount: 5,
    pendingEvidenceCount: 1, exceptionCount: 3,
    status: 'needs_attention',
    lastRunAt: '2026-06-22 10:30'
  },
];
