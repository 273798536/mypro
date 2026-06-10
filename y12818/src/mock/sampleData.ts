/**
 * 示例数据文件
 * 包含培养基批号、样本记录、版本历史、人工修正、结论、异常记录等完整Mock数据
 */

import { findStandardName } from './speciesSynonyms';

// ==================== 基础类型定义 ====================

/** 培养基批号信息 */
export interface MediaBatch {
  /** 批号ID（UUID） */
  id: string;
  /** 批号编号，如 MB-2026-001 */
  batchNo: string;
  /** 培养基名称 */
  mediaName: string;
  /** 生产厂家 */
  manufacturer: string;
  /** 生产日期（ISO格式） */
  productionDate: string;
  /** 有效期至（ISO格式） */
  expiryDate: string;
  /** 配制人 */
  preparedBy: string;
  /** 灭菌批号 */
  sterilizationNo: string;
  /** 批号状态 */
  status: '正常' | '待检' | '过期' | '停用';
  /** 备注 */
  remark?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 样本检测记录 */
export interface SampleRecord {
  /** 样本ID（UUID） */
  id: string;
  /** 关联培养基批号ID */
  batchId: string;
  /** 原始Excel行号 */
  originalRowNo: number;
  /** 样本编号 */
  sampleNo: string;
  /** 样本名称 */
  sampleName: string;
  /** 检测物种名称（原始录入） */
  speciesName: string;
  /** 标准化后的物种名称 */
  standardSpeciesName: string;
  /** 是否为物种同义词匹配案例 */
  isSynonymCase: boolean;
  /** 菌落数（CFU/g或CFU/mL） */
  colonyCount: number | null;
  /** 检测结果 */
  result: '阳性' | '阴性' | '可疑' | '未检出';
  /** 检测人 */
  testedBy: string;
  /** 检测时间（ISO格式） */
  testedAt: string;
  /** 培养温度（℃） */
  incubateTemp: number;
  /** 培养时间（小时） */
  incubateHours: number;
  /** 图片文件名 */
  imageName: string;
  /** 图片URL */
  imageUrl?: string;
  /** 数据来源备注 */
  sourceRemark: string;
  /** 记录状态 */
  status: '待审核' | '已审核' | '需修正' | '已确认';
  /** 审核人 */
  reviewedBy?: string;
  /** 审核时间 */
  reviewedAt?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 版本记录（用于审计追踪） */
export interface VersionRecord {
  /** 版本ID */
  id: string;
  /** 关联实体类型 */
  entityType: '样本记录' | '培养基批号' | '结论' | '异常记录';
  /** 关联实体ID */
  entityId: string;
  /** 版本号，从1开始递增 */
  versionNo: number;
  /** 变更前数据快照（JSON字符串） */
  beforeSnapshot: string | null;
  /** 变更后数据快照（JSON字符串） */
  afterSnapshot: string | null;
  /** 变更字段列表 */
  changedFields: string[];
  /** 操作人 */
  operator: string;
  /** 操作类型 */
  operation: '创建' | '修改' | '删除' | '审核' | '修正';
  /** 变更说明 */
  changeRemark: string;
  /** 操作时间 */
  operatedAt: string;
  /** 客户端IP */
  clientIp?: string;
}

/** 人工修正记录 */
export interface CorrectionRecord {
  /** 修正ID */
  id: string;
  /** 关联样本ID */
  sampleId: string;
  /** 修正前字段值 */
  beforeValue: string;
  /** 修正后字段值 */
  afterValue: string;
  /** 修正的字段名 */
  fieldName: string;
  /** 修正原因 */
  reason: string;
  /** 修正人 */
  correctedBy: string;
  /** 修正时间 */
  correctedAt: string;
  /** 审批状态 */
  approvalStatus: '待审批' | '已批准' | '已驳回';
  /** 审批人 */
  approvedBy?: string;
  /** 审批时间 */
  approvedAt?: string;
  /** 审批意见 */
  approvalRemark?: string;
}

/** 结论记录 */
export interface ConclusionRecord {
  /** 结论ID */
  id: string;
  /** 关联培养基批号ID */
  batchId: string;
  /** 关联样本ID列表 */
  sampleIds: string[];
  /** 结论标题 */
  title: string;
  /** 结论详细内容 */
  content: string;
  /** 结论类型 */
  type: '合格' | '不合格' | '有条件合格' | '需复检';
  /** 结论人 */
  concludedBy: string;
  /** 结论时间 */
  concludedAt: string;
  /** 是否为重复结论（同一批次多次结论） */
  isDuplicate: boolean;
  /** 关联的重复结论ID（如有） */
  duplicateOfId?: string;
  /** 状态 */
  status: '草稿' | '已发布' | '已撤销';
  /** 审批人 */
  approvedBy?: string;
  /** 审批时间 */
  approvedAt?: string;
}

/** 异常记录 */
export interface AnomalyRecord {
  /** 异常ID */
  id: string;
  /** 关联样本ID（可为空，如批次级异常） */
  sampleId?: string;
  /** 关联培养基批号ID */
  batchId?: string;
  /** 异常类型 */
  anomalyType: '数据异常' | '设备异常' | '环境异常' | '试剂异常' | '操作异常';
  /** 异常严重程度 */
  severity: '一般' | '严重' | '紧急';
  /** 异常标题 */
  title: string;
  /** 异常详细描述 */
  description: string;
  /** 发现人 */
  reportedBy: string;
  /** 发现时间 */
  reportedAt: string;
  /** 处理状态 */
  status: '待处理' | '处理中' | '已解决' | '已关闭';
  /** 处理措施 */
  resolution?: string;
  /** 处理人 */
  resolvedBy?: string;
  /** 处理时间 */
  resolvedAt?: string;
  /** 附件列表 */
  attachments?: string[];
}

// ==================== Mock数据生成 ====================

/** 生成唯一ID（简化版UUID） */
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 培养基批号数据 - 3个批次 */
export const mockMediaBatches: MediaBatch[] = [
  {
    id: 'batch-001',
    batchNo: 'MB-2026-001',
    mediaName: '胰酪大豆胨琼脂培养基（TSA）',
    manufacturer: '青岛海博生物',
    productionDate: '2026-01-15',
    expiryDate: '2027-01-14',
    preparedBy: '李配制',
    sterilizationNo: 'STE-2026-012',
    status: '正常',
    remark: '常规检测用培养基，适用性试验合格',
    createdAt: '2026-01-16T09:00:00.000Z',
    updatedAt: '2026-01-16T09:00:00.000Z'
  },
  {
    id: 'batch-002',
    batchNo: 'MB-2026-002',
    mediaName: '麦康凯琼脂培养基（MAC）',
    manufacturer: '北京陆桥技术',
    productionDate: '2026-02-20',
    expiryDate: '2027-02-19',
    preparedBy: '王配制',
    sterilizationNo: 'STE-2026-045',
    status: '正常',
    remark: '肠道菌选择性分离培养基',
    createdAt: '2026-02-21T10:30:00.000Z',
    updatedAt: '2026-02-21T10:30:00.000Z'
  },
  {
    id: 'batch-003',
    batchNo: 'MB-2026-003',
    mediaName: '沙氏葡萄糖琼脂培养基（SDA）',
    manufacturer: '广东环凯微生物',
    productionDate: '2026-03-10',
    expiryDate: '2027-03-09',
    preparedBy: '张配制',
    sterilizationNo: 'STE-2026-078',
    status: '待检',
    remark: '真菌检测用培养基，待完成适用性试验',
    createdAt: '2026-03-11T14:00:00.000Z',
    updatedAt: '2026-03-11T14:00:00.000Z'
  }
];

/** 样本记录数据 - 12条，包含5条物种同义案例 */
export const mockSampleRecords: SampleRecord[] = [
  // ===== 批号 MB-2026-001 下的样本 =====
  {
    id: 'sample-001',
    batchId: 'batch-001',
    originalRowNo: 2,
    sampleNo: 'S-2026-01001',
    sampleName: '纯化水-1号罐',
    speciesName: '大肠埃希氏菌',
    standardSpeciesName: findStandardName('大肠埃希氏菌'),
    isSynonymCase: false,
    colonyCount: 0,
    result: '未检出',
    testedBy: '赵检验',
    testedAt: '2026-01-20T10:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 48,
    imageName: 'S-2026-01001_TSA_01.jpg',
    sourceRemark: '导入自2026年1月水质检测Excel表',
    status: '已审核',
    reviewedBy: '钱审核',
    reviewedAt: '2026-01-21T09:00:00.000Z',
    createdAt: '2026-01-20T10:30:00.000Z',
    updatedAt: '2026-01-21T09:00:00.000Z'
  },
  {
    id: 'sample-002',
    batchId: 'batch-001',
    originalRowNo: 3,
    sampleNo: 'S-2026-01002',
    sampleName: '原料-面粉批次RM-001',
    speciesName: 'E.coli',
    standardSpeciesName: findStandardName('E.coli'),
    isSynonymCase: true,
    colonyCount: 15,
    result: '阳性',
    testedBy: '赵检验',
    testedAt: '2026-01-20T11:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 48,
    imageName: 'S-2026-01002_TSA_01.jpg',
    sourceRemark: '导入自2026年1月原料检测表 - 录入为英文缩写',
    status: '需修正',
    createdAt: '2026-01-20T11:30:00.000Z',
    updatedAt: '2026-01-20T14:00:00.000Z'
  },
  {
    id: 'sample-003',
    batchId: 'batch-001',
    originalRowNo: 4,
    sampleNo: 'S-2026-01003',
    sampleName: '车间空气沉降-灌装间A',
    speciesName: '金黄色葡萄球菌',
    standardSpeciesName: findStandardName('金黄色葡萄球菌'),
    isSynonymCase: false,
    colonyCount: 2,
    result: '可疑',
    testedBy: '孙检验',
    testedAt: '2026-01-20T14:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 72,
    imageName: 'S-2026-01003_TSA_01.jpg',
    sourceRemark: '空气沉降监测数据，菌落形态待确认',
    status: '待审核',
    createdAt: '2026-01-20T15:30:00.000Z',
    updatedAt: '2026-01-20T15:30:00.000Z'
  },
  {
    id: 'sample-004',
    batchId: 'batch-001',
    originalRowNo: 5,
    sampleNo: 'S-2026-01004',
    sampleName: '成品-饼干批次FP-015',
    speciesName: '金葡菌',
    standardSpeciesName: findStandardName('金葡菌'),
    isSynonymCase: true,
    colonyCount: 0,
    result: '未检出',
    testedBy: '孙检验',
    testedAt: '2026-01-21T09:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 48,
    imageName: 'S-2026-01004_TSA_01.jpg',
    sourceRemark: '成品出厂检验 - 使用实验室内部简称录入',
    status: '已审核',
    reviewedBy: '钱审核',
    reviewedAt: '2026-01-22T10:00:00.000Z',
    createdAt: '2026-01-21T10:00:00.000Z',
    updatedAt: '2026-01-22T10:00:00.000Z'
  },
  // ===== 批号 MB-2026-002 下的样本 =====
  {
    id: 'sample-005',
    batchId: 'batch-002',
    originalRowNo: 2,
    sampleNo: 'S-2026-02001',
    sampleName: '原料-鸡肉批次RM-023',
    speciesName: '鼠伤寒沙门菌',
    standardSpeciesName: findStandardName('鼠伤寒沙门菌'),
    isSynonymCase: true,
    colonyCount: 8,
    result: '阳性',
    testedBy: '周检验',
    testedAt: '2026-02-25T10:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 48,
    imageName: 'S-2026-02001_MAC_01.jpg',
    sourceRemark: '动物原料检测 - 缺少"氏"字的简写形式',
    status: '已确认',
    reviewedBy: '吴审核',
    reviewedAt: '2026-02-26T11:00:00.000Z',
    createdAt: '2026-02-25T11:00:00.000Z',
    updatedAt: '2026-02-26T11:00:00.000Z'
  },
  {
    id: 'sample-006',
    batchId: 'batch-002',
    originalRowNo: 3,
    sampleNo: 'S-2026-02002',
    sampleName: '器具涂抹-切丁机',
    speciesName: '绿脓杆菌',
    standardSpeciesName: findStandardName('绿脓杆菌'),
    isSynonymCase: true,
    colonyCount: 3,
    result: '可疑',
    testedBy: '周检验',
    testedAt: '2026-02-25T13:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 48,
    imageName: 'S-2026-02002_MAC_01.jpg',
    sourceRemark: '设备表面涂抹检测 - 使用临床常用俗名',
    status: '需修正',
    createdAt: '2026-02-25T14:30:00.000Z',
    updatedAt: '2026-02-26T09:00:00.000Z'
  },
  {
    id: 'sample-007',
    batchId: 'batch-002',
    originalRowNo: 4,
    sampleNo: 'S-2026-02003',
    sampleName: '污水-排放口',
    speciesName: 'Escherichia coli',
    standardSpeciesName: findStandardName('Escherichia coli'),
    isSynonymCase: true,
    colonyCount: 120,
    result: '阳性',
    testedBy: '武检验',
    testedAt: '2026-02-26T09:00:00.000Z',
    incubateTemp: 44,
    incubateHours: 24,
    imageName: 'S-2026-02003_MAC_01.jpg',
    sourceRemark: '污水监测 - 使用完整拉丁学名录入',
    status: '已审核',
    reviewedBy: '吴审核',
    reviewedAt: '2026-02-27T10:00:00.000Z',
    createdAt: '2026-02-26T10:30:00.000Z',
    updatedAt: '2026-02-27T10:00:00.000Z'
  },
  {
    id: 'sample-008',
    batchId: 'batch-002',
    originalRowNo: 5,
    sampleNo: 'S-2026-02004',
    sampleName: '手部涂抹-操作工A',
    speciesName: '铜绿假单胞菌',
    standardSpeciesName: findStandardName('铜绿假单胞菌'),
    isSynonymCase: false,
    colonyCount: 0,
    result: '未检出',
    testedBy: '武检验',
    testedAt: '2026-02-26T11:00:00.000Z',
    incubateTemp: 36,
    incubateHours: 48,
    imageName: 'S-2026-02004_MAC_01.jpg',
    sourceRemark: '人员卫生监测',
    status: '已审核',
    reviewedBy: '吴审核',
    reviewedAt: '2026-02-27T11:00:00.000Z',
    createdAt: '2026-02-26T12:00:00.000Z',
    updatedAt: '2026-02-27T11:00:00.000Z'
  },
  // ===== 批号 MB-2026-003 下的样本 =====
  {
    id: 'sample-009',
    batchId: 'batch-003',
    originalRowNo: 2,
    sampleNo: 'S-2026-03001',
    sampleName: '原料-奶粉批次RM-045',
    speciesName: 'Candida albicans',
    standardSpeciesName: findStandardName('Candida albicans'),
    isSynonymCase: false,
    colonyCount: 0,
    result: '未检出',
    testedBy: '郑检验',
    testedAt: '2026-03-15T10:00:00.000Z',
    incubateTemp: 28,
    incubateHours: 120,
    imageName: 'S-2026-03001_SDA_01.jpg',
    sourceRemark: '乳制品原料真菌检测',
    status: '待审核',
    createdAt: '2026-03-15T11:30:00.000Z',
    updatedAt: '2026-03-15T11:30:00.000Z'
  },
  {
    id: 'sample-010',
    batchId: 'batch-003',
    originalRowNo: 3,
    sampleNo: 'S-2026-03002',
    sampleName: '车间空气-包装间B',
    speciesName: '黑曲霉',
    standardSpeciesName: findStandardName('黑曲霉'),
    isSynonymCase: false,
    colonyCount: 5,
    result: '阳性',
    testedBy: '郑检验',
    testedAt: '2026-03-15T14:00:00.000Z',
    incubateTemp: 28,
    incubateHours: 96,
    imageName: 'S-2026-03002_SDA_01.jpg',
    sourceRemark: '车间环境监测 - 需结合温湿度数据评估',
    status: '已确认',
    reviewedBy: '冯审核',
    reviewedAt: '2026-03-17T09:00:00.000Z',
    createdAt: '2026-03-15T15:30:00.000Z',
    updatedAt: '2026-03-17T09:00:00.000Z'
  },
  {
    id: 'sample-011',
    batchId: 'batch-003',
    originalRowNo: 4,
    sampleNo: 'S-2026-03003',
    sampleName: '包材-内袋批次PK-012',
    speciesName: '白假丝酵母菌',
    standardSpeciesName: findStandardName('白假丝酵母菌'),
    isSynonymCase: true,
    colonyCount: 1,
    result: '可疑',
    testedBy: '王检验',
    testedAt: '2026-03-16T09:00:00.000Z',
    incubateTemp: 28,
    incubateHours: 120,
    imageName: 'S-2026-03003_SDA_01.jpg',
    sourceRemark: '包材微检 - 使用微生物学分类名称',
    status: '待审核',
    createdAt: '2026-03-16T10:30:00.000Z',
    updatedAt: '2026-03-16T10:30:00.000Z'
  },
  {
    id: 'sample-012',
    batchId: 'batch-003',
    originalRowNo: 5,
    sampleNo: 'S-2026-03004',
    sampleName: '成品-酸奶批次FP-089',
    speciesName: '酿酒酵母',
    standardSpeciesName: findStandardName('酿酒酵母'),
    isSynonymCase: false,
    colonyCount: 25,
    result: '阳性',
    testedBy: '王检验',
    testedAt: '2026-03-16T11:00:00.000Z',
    incubateTemp: 28,
    incubateHours: 72,
    imageName: 'S-2026-03004_SDA_01.jpg',
    sourceRemark: '发酵产品检测 - 酵母菌为发酵菌种，属正常检出',
    status: '已审核',
    reviewedBy: '冯审核',
    reviewedAt: '2026-03-17T14:00:00.000Z',
    createdAt: '2026-03-16T12:30:00.000Z',
    updatedAt: '2026-03-17T14:00:00.000Z'
  }
];

/** 版本历史记录 - 覆盖所有实体的完整变更记录 */
export const mockVersionRecords: VersionRecord[] = [
  // ===== 样本记录版本 =====
  {
    id: 'ver-001',
    entityType: '样本记录',
    entityId: 'sample-001',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ sampleNo: 'S-2026-01001', speciesName: '大肠埃希氏菌', result: '未检出' }),
    changedFields: ['*'],
    operator: '赵检验',
    operation: '创建',
    changeRemark: '系统导入样本记录',
    operatedAt: '2026-01-20T10:30:00.000Z',
    clientIp: '192.168.1.101'
  },
  {
    id: 'ver-002',
    entityType: '样本记录',
    entityId: 'sample-001',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ status: '待审核' }),
    afterSnapshot: JSON.stringify({ status: '已审核', reviewedBy: '钱审核' }),
    changedFields: ['status', 'reviewedBy', 'reviewedAt'],
    operator: '钱审核',
    operation: '审核',
    changeRemark: '审核通过，数据准确无误',
    operatedAt: '2026-01-21T09:00:00.000Z',
    clientIp: '192.168.1.102'
  },
  {
    id: 'ver-003',
    entityType: '样本记录',
    entityId: 'sample-002',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ sampleNo: 'S-2026-01002', speciesName: 'E.coli', isSynonymCase: false }),
    changedFields: ['*'],
    operator: '赵检验',
    operation: '创建',
    changeRemark: 'Excel导入，物种为英文缩写',
    operatedAt: '2026-01-20T11:30:00.000Z',
    clientIp: '192.168.1.101'
  },
  {
    id: 'ver-004',
    entityType: '样本记录',
    entityId: 'sample-002',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ isSynonymCase: false, standardSpeciesName: 'E.coli' }),
    afterSnapshot: JSON.stringify({ isSynonymCase: true, standardSpeciesName: '大肠埃希氏菌', status: '需修正' }),
    changedFields: ['isSynonymCase', 'standardSpeciesName', 'status'],
    operator: '系统',
    operation: '修改',
    changeRemark: '同义词自动匹配：E.coli → 大肠埃希氏菌，标记待人工确认',
    operatedAt: '2026-01-20T14:00:00.000Z',
    clientIp: '127.0.0.1'
  },
  {
    id: 'ver-005',
    entityType: '样本记录',
    entityId: 'sample-004',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ sampleNo: 'S-2026-01004', speciesName: '金葡菌' }),
    changedFields: ['*'],
    operator: '孙检验',
    operation: '创建',
    changeRemark: '手动录入样本数据，使用实验室简称',
    operatedAt: '2026-01-21T10:00:00.000Z',
    clientIp: '192.168.1.103'
  },
  {
    id: 'ver-006',
    entityType: '样本记录',
    entityId: 'sample-004',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ status: '待审核' }),
    afterSnapshot: JSON.stringify({ status: '已审核' }),
    changedFields: ['status', 'reviewedBy', 'reviewedAt'],
    operator: '钱审核',
    operation: '审核',
    changeRemark: '确认同义词匹配正确，数据通过审核',
    operatedAt: '2026-01-22T10:00:00.000Z',
    clientIp: '192.168.1.102'
  },
  {
    id: 'ver-007',
    entityType: '样本记录',
    entityId: 'sample-005',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ sampleNo: 'S-2026-02001', speciesName: '鼠伤寒沙门菌' }),
    changedFields: ['*'],
    operator: '周检验',
    operation: '创建',
    changeRemark: '导入检测数据，物种名称略有差异',
    operatedAt: '2026-02-25T11:00:00.000Z',
    clientIp: '192.168.1.104'
  },
  {
    id: 'ver-008',
    entityType: '样本记录',
    entityId: 'sample-005',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ colonyCount: 10 }),
    afterSnapshot: JSON.stringify({ colonyCount: 8 }),
    changedFields: ['colonyCount'],
    operator: '周检验',
    operation: '修改',
    changeRemark: '复核菌落计数，从10修正为8',
    operatedAt: '2026-02-25T15:30:00.000Z',
    clientIp: '192.168.1.104'
  },
  {
    id: 'ver-009',
    entityType: '样本记录',
    entityId: 'sample-010',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ sampleNo: 'S-2026-03002', result: '可疑' }),
    changedFields: ['*'],
    operator: '郑检验',
    operation: '创建',
    changeRemark: '初步检测录入，结果标记为可疑',
    operatedAt: '2026-03-15T15:30:00.000Z',
    clientIp: '192.168.1.105'
  },
  {
    id: 'ver-010',
    entityType: '样本记录',
    entityId: 'sample-010',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ result: '可疑', colonyCount: 2 }),
    afterSnapshot: JSON.stringify({ result: '阳性', colonyCount: 5, status: '已确认' }),
    changedFields: ['result', 'colonyCount', 'status', 'reviewedBy'],
    operator: '冯审核',
    operation: '审核',
    changeRemark: '镜检确认黑曲霉菌落，更新结果及数量',
    operatedAt: '2026-03-17T09:00:00.000Z',
    clientIp: '192.168.1.106'
  },
  // ===== 培养基批号版本 =====
  {
    id: 'ver-011',
    entityType: '培养基批号',
    entityId: 'batch-001',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ batchNo: 'MB-2026-001', status: '待检' }),
    changedFields: ['*'],
    operator: '李配制',
    operation: '创建',
    changeRemark: '新批次培养基入库登记',
    operatedAt: '2026-01-16T09:00:00.000Z',
    clientIp: '192.168.1.201'
  },
  {
    id: 'ver-012',
    entityType: '培养基批号',
    entityId: 'batch-001',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ status: '待检' }),
    afterSnapshot: JSON.stringify({ status: '正常' }),
    changedFields: ['status'],
    operator: '钱审核',
    operation: '审核',
    changeRemark: '适用性试验合格，批次状态更新为正常',
    operatedAt: '2026-01-18T14:00:00.000Z',
    clientIp: '192.168.1.102'
  },
  {
    id: 'ver-013',
    entityType: '培养基批号',
    entityId: 'batch-003',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ batchNo: 'MB-2026-003', status: '待检' }),
    changedFields: ['*'],
    operator: '张配制',
    operation: '创建',
    changeRemark: '新批次SDA培养基登记入库',
    operatedAt: '2026-03-11T14:00:00.000Z',
    clientIp: '192.168.1.202'
  },
  // ===== 结论版本 =====
  {
    id: 'ver-014',
    entityType: '结论',
    entityId: 'conclusion-001',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ title: 'MB-2026-001批次适用性评价', status: '草稿' }),
    changedFields: ['*'],
    operator: '钱审核',
    operation: '创建',
    changeRemark: '起草批次评价报告',
    operatedAt: '2026-01-22T15:00:00.000Z',
    clientIp: '192.168.1.102'
  },
  {
    id: 'ver-015',
    entityType: '结论',
    entityId: 'conclusion-001',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ status: '草稿', type: '有条件合格' }),
    afterSnapshot: JSON.stringify({ status: '已发布', type: '合格' }),
    changedFields: ['status', 'type'],
    operator: '吴主任',
    operation: '审核',
    changeRemark: '主任审批通过，调整结论类型为合格',
    operatedAt: '2026-01-23T10:00:00.000Z',
    clientIp: '192.168.1.301'
  },
  // ===== 异常记录版本 =====
  {
    id: 'ver-016',
    entityType: '异常记录',
    entityId: 'anomaly-001',
    versionNo: 1,
    beforeSnapshot: null,
    afterSnapshot: JSON.stringify({ title: '菌落数偏高异常', status: '待处理' }),
    changedFields: ['*'],
    operator: '赵检验',
    operation: '创建',
    changeRemark: '报告检测异常',
    operatedAt: '2026-01-20T16:00:00.000Z',
    clientIp: '192.168.1.101'
  },
  {
    id: 'ver-017',
    entityType: '异常记录',
    entityId: 'anomaly-001',
    versionNo: 2,
    beforeSnapshot: JSON.stringify({ status: '待处理' }),
    afterSnapshot: JSON.stringify({ status: '处理中', resolution: '已启动调查' }),
    changedFields: ['status', 'resolution'],
    operator: '吴主任',
    operation: '修改',
    changeRemark: 'QA启动偏差调查',
    operatedAt: '2026-01-21T09:30:00.000Z',
    clientIp: '192.168.1.301'
  }
];

/** 人工修正记录 - 覆盖样本修正场景 */
export const mockCorrectionRecords: CorrectionRecord[] = [
  {
    id: 'correction-001',
    sampleId: 'sample-002',
    beforeValue: 'E.coli',
    afterValue: '大肠埃希氏菌',
    fieldName: 'speciesName',
    reason: '物种名称标准化：将英文缩写E.coli修正为标准中文名称大肠埃希氏菌',
    correctedBy: '钱审核',
    correctedAt: '2026-01-21T11:00:00.000Z',
    approvalStatus: '已批准',
    approvedBy: '吴主任',
    approvedAt: '2026-01-21T14:00:00.000Z',
    approvalRemark: '同意修正，确保物种名称一致性'
  },
  {
    id: 'correction-002',
    sampleId: 'sample-004',
    beforeValue: '金葡菌',
    afterValue: '金黄色葡萄球菌',
    fieldName: 'speciesName',
    reason: '内部简称标准化：将实验室常用简称金葡菌修正为标准名称金黄色葡萄球菌',
    correctedBy: '孙检验',
    correctedAt: '2026-01-22T09:00:00.000Z',
    approvalStatus: '已批准',
    approvedBy: '钱审核',
    approvedAt: '2026-01-22T10:00:00.000Z',
    approvalRemark: '修正正确，统一使用标准名称'
  },
  {
    id: 'correction-003',
    sampleId: 'sample-005',
    beforeValue: '10',
    afterValue: '8',
    fieldName: 'colonyCount',
    reason: '复核计数修正：双人复核后确认实际菌落数为8个（原计数时误将2个背景颗粒计入）',
    correctedBy: '周检验',
    correctedAt: '2026-02-25T15:30:00.000Z',
    approvalStatus: '已批准',
    approvedBy: '吴审核',
    approvedAt: '2026-02-26T09:00:00.000Z',
    approvalRemark: '复核记录完整，修正有效'
  },
  {
    id: 'correction-004',
    sampleId: 'sample-006',
    beforeValue: '绿脓杆菌',
    afterValue: '铜绿假单胞菌',
    fieldName: 'speciesName',
    reason: '俗名修正：将临床常用俗名绿脓杆菌修正为国家标准名称铜绿假单胞菌',
    correctedBy: '周检验',
    correctedAt: '2026-02-26T10:00:00.000Z',
    approvalStatus: '待审批',
    approvedBy: undefined,
    approvedAt: undefined,
    approvalRemark: undefined
  },
  {
    id: 'correction-005',
    sampleId: 'sample-011',
    beforeValue: '可疑',
    afterValue: '阳性',
    fieldName: 'result',
    reason: '结果修正：经28℃延长培养至120小时并镜检确认，白色念珠菌生长明确，结果由可疑改为阳性',
    correctedBy: '王检验',
    correctedAt: '2026-03-17T09:30:00.000Z',
    approvalStatus: '待审批',
    approvedBy: undefined,
    approvedAt: undefined,
    approvalRemark: undefined
  },
  {
    id: 'correction-006',
    sampleId: 'sample-010',
    beforeValue: '2',
    afterValue: '5',
    fieldName: 'colonyCount',
    reason: '计数修正：培养96小时后菌落生长更充分，重新计数为5个，原48小时计数不完全',
    correctedBy: '郑检验',
    correctedAt: '2026-03-16T15:00:00.000Z',
    approvalStatus: '已批准',
    approvedBy: '冯审核',
    approvedAt: '2026-03-17T09:00:00.000Z',
    approvalRemark: '培养时间充分，计数准确，同意修正'
  }
];

/** 结论记录 - 6条（含2条重复结论） */
export const mockConclusionRecords: ConclusionRecord[] = [
  // ===== 批号 MB-2026-001 的结论（含1条重复） =====
  {
    id: 'conclusion-001',
    batchId: 'batch-001',
    sampleIds: ['sample-001', 'sample-002', 'sample-003', 'sample-004'],
    title: 'MB-2026-001 TSA培养基批次适用性评价报告',
    content: '本批次胰酪大豆胨琼脂培养基（TSA）共完成4项适用性检测：纯化水未检出大肠埃希氏菌，原料检出低水平大肠菌群（15 CFU/g，在合格范围内），车间空气沉降检出少量可疑葡萄球菌，成品饼干未检出金黄色葡萄球菌。综合评估：本批次培养基促生长能力良好，选择性符合预期，适用性试验合格，可正常用于后续检测工作。建议加强灌装间空气消毒频次。',
    type: '合格',
    concludedBy: '钱审核',
    concludedAt: '2026-01-22T15:30:00.000Z',
    isDuplicate: false,
    status: '已发布',
    approvedBy: '吴主任',
    approvedAt: '2026-01-23T10:00:00.000Z'
  },
  {
    id: 'conclusion-002',
    batchId: 'batch-001',
    sampleIds: ['sample-001', 'sample-002', 'sample-003', 'sample-004'],
    title: '【重复】MB-2026-001 TSA培养基批次适用性评价报告',
    content: '本批次胰酪大豆胨琼脂培养基（TSA）共完成4项适用性检测：纯化水未检出大肠埃希氏菌，原料检出低水平大肠菌群（15 CFU/g，在合格范围内），车间空气沉降检出少量可疑葡萄球菌，成品饼干未检出金黄色葡萄球菌。综合评估：本批次培养基促生长能力良好，选择性符合预期，适用性试验合格，可正常用于后续检测工作。建议加强灌装间空气消毒频次。',
    type: '合格',
    concludedBy: '钱审核',
    concludedAt: '2026-01-22T16:00:00.000Z',
    isDuplicate: true,
    duplicateOfId: 'conclusion-001',
    status: '已撤销',
    approvedBy: '吴主任',
    approvedAt: '2026-01-22T16:30:00.000Z'
  },
  // ===== 批号 MB-2026-002 的结论 =====
  {
    id: 'conclusion-003',
    batchId: 'batch-002',
    sampleIds: ['sample-005', 'sample-006', 'sample-007', 'sample-008'],
    title: 'MB-2026-002 MAC培养基批次检测综合报告',
    content: '本批次麦康凯琼脂培养基（MAC）完成4项检测：1）鸡肉原料检出鼠伤寒沙门氏菌（8 CFU/g），不合格，需启动原料退货流程；2）切丁机涂抹检出可疑铜绿假单胞菌（3 CFU/cm²），需加强设备消毒验证；3）污水排放口检出大肠埃希氏菌（120 CFU/mL），符合排放标准；4）手部涂抹未检出目标菌。本批次培养基选择性良好，建议结合原料不合格事件进行风险评估。',
    type: '有条件合格',
    concludedBy: '吴审核',
    concludedAt: '2026-02-28T14:00:00.000Z',
    isDuplicate: false,
    status: '已发布',
    approvedBy: '吴主任',
    approvedAt: '2026-03-01T09:00:00.000Z'
  },
  // ===== 批号 MB-2026-003 的结论（含1条重复） =====
  {
    id: 'conclusion-004',
    batchId: 'batch-003',
    sampleIds: ['sample-009', 'sample-010', 'sample-011', 'sample-012'],
    title: 'MB-2026-003 SDA培养基真菌检测评价报告',
    content: '本批次沙氏葡萄糖琼脂培养基（SDA）完成4项真菌检测：奶粉原料未检出白色念珠菌，包装间空气检出黑曲霉（5 CFU/皿），内袋包材检出可疑白色念珠菌（1 CFU/件），酸奶成品检出酿酒酵母（25 CFU/g，发酵菌种属正常）。培养基促真菌生长性能良好。包装间霉菌超标需启动环境消毒措施。',
    type: '需复检',
    concludedBy: '冯审核',
    concludedAt: '2026-03-18T10:00:00.000Z',
    isDuplicate: false,
    status: '草稿',
    approvedBy: undefined,
    approvedAt: undefined
  },
  {
    id: 'conclusion-005',
    batchId: 'batch-003',
    sampleIds: ['sample-009', 'sample-010', 'sample-011', 'sample-012'],
    title: '【重复】MB-2026-003 SDA培养基真菌检测评价报告',
    content: '本批次沙氏葡萄糖琼脂培养基（SDA）完成4项真菌检测：奶粉原料未检出白色念珠菌，包装间空气检出黑曲霉（5 CFU/皿），内袋包材检出可疑白色念珠菌（1 CFU/件），酸奶成品检出酿酒酵母（25 CFU/g，发酵菌种属正常）。培养基促真菌生长性能良好。包装间霉菌超标需启动环境消毒措施。',
    type: '需复检',
    concludedBy: '冯审核',
    concludedAt: '2026-03-18T10:15:00.000Z',
    isDuplicate: true,
    duplicateOfId: 'conclusion-004',
    status: '已撤销',
    approvedBy: undefined,
    approvedAt: undefined
  },
  {
    id: 'conclusion-006',
    batchId: 'batch-001',
    sampleIds: ['sample-002'],
    title: 'MB-2026-001原料大肠杆菌超标专项分析',
    content: '针对样本S-2026-01002（面粉RM-001）检出大肠埃希氏菌15 CFU/g进行专项分析：1）该批次面粉供应商资质齐全，近6个月供货质量稳定；2）同期同批次其他样品检测结果正常；3）取样过程无异常。判断为偶发性污染，建议加强原料入厂抽样检测频率，本批次面粉让步接收用于非即食产品生产。',
    type: '有条件合格',
    concludedBy: '吴主任',
    concludedAt: '2026-01-25T11:00:00.000Z',
    isDuplicate: false,
    status: '已发布',
    approvedBy: '陈总工',
    approvedAt: '2026-01-25T15:00:00.000Z'
  }
];

/** 异常记录 - 4条 */
export const mockAnomalyRecords: AnomalyRecord[] = [
  {
    id: 'anomaly-001',
    sampleId: 'sample-002',
    batchId: 'batch-001',
    anomalyType: '数据异常',
    severity: '严重',
    title: '原料面粉大肠菌群超标异常',
    description: '样本S-2026-01002（面粉批次RM-001）检出大肠埃希氏菌15 CFU/g，超出原料内控标准（≤10 CFU/g）。该批次面粉共入库500kg，已使用约100kg用于非即食产品。需立即调查污染源并评估已生产产品风险。',
    reportedBy: '赵检验',
    reportedAt: '2026-01-20T16:00:00.000Z',
    status: '处理中',
    resolution: '1. 已封存剩余400kg面粉；2. 启动偏差调查（编号DEV-2026-003）；3. 已追溯同批次生产的产品共3批，留样检测中；4. 已通知供应商到场共同分析',
    resolvedBy: '吴主任',
    resolvedAt: '2026-01-23T16:00:00.000Z',
    attachments: ['DEV-2026-003_调查报告.pdf', 'RM-001_不合格品处理单.jpg']
  },
  {
    id: 'anomaly-002',
    sampleId: 'sample-006',
    batchId: 'batch-002',
    anomalyType: '环境异常',
    severity: '一般',
    title: '切丁机表面检出铜绿假单胞菌',
    description: '设备涂抹检测S-2026-02002检出可疑铜绿假单胞菌（3 CFU/cm²）。切丁机为肉类加工核心设备，需验证消毒效果。设备上周完成年度大修，可能存在密封死角清洁不彻底。',
    reportedBy: '周检验',
    reportedAt: '2026-02-26T10:00:00.000Z',
    status: '已解决',
    resolution: '1. 对切丁机进行CIP+拆解手工消毒；2. 重新涂抹验证3次，结果均合格；3. 修订设备SOP，增加月度拆解清洁要求；4. 消毒后连续3天监测均合格',
    resolvedBy: '吴审核',
    resolvedAt: '2026-03-01T14:00:00.000Z',
    attachments: ['设备消毒验证记录.pdf']
  },
  {
    id: 'anomaly-003',
    sampleId: 'sample-010',
    batchId: 'batch-003',
    anomalyType: '环境异常',
    severity: '严重',
    title: '包装间空气黑曲霉超标',
    description: '包装间B空气沉降检测S-2026-03002检出黑曲霉5 CFU/皿，远超洁净区标准（≤1 CFU/皿）。包装间为D级洁净区，黑曲霉超标可能导致终产品霉菌污染风险。同期温湿度记录显示车间湿度偏高（68%）。',
    reportedBy: '郑检验',
    reportedAt: '2026-03-16T10:00:00.000Z',
    status: '处理中',
    resolution: '1. 已启动洁净区熏蒸消毒（甲醛+高锰酸钾）；2. 检查并清洗空调系统初效/中效/高效过滤器；3. 除湿机已到位，目标湿度控制≤55%；4. 消毒后连续3天监测，第1天2 CFU/皿，第2天1 CFU/皿，第3天待检测',
    resolvedBy: undefined,
    resolvedAt: undefined,
    attachments: ['洁净区消毒方案.pdf', '空调系统检查报告.pdf']
  },
  {
    id: 'anomaly-004',
    sampleId: undefined,
    batchId: 'batch-003',
    anomalyType: '试剂异常',
    severity: '一般',
    title: 'SDA培养基批号适用性试验延迟',
    description: 'MB-2026-003批次沙氏葡萄糖琼脂培养基（SDA）原定3月15日前完成适用性试验，因标准菌株白色念珠菌（ATCC 10231）冻干粉在复壮过程中生长不良，需重新采购标准菌株，预计延迟5个工作日完成适用性试验。期间暂停使用该批次培养基。',
    reportedBy: '张配制',
    reportedAt: '2026-03-14T16:30:00.000Z',
    status: '待处理',
    resolution: undefined,
    resolvedBy: undefined,
    resolvedAt: undefined,
    attachments: ['标准菌株采购申请单.pdf']
  }
];

// ==================== 汇总导出 ====================

/** 完整Mock数据包接口 */
export interface MockDataSet {
  mediaBatches: MediaBatch[];
  sampleRecords: SampleRecord[];
  versionRecords: VersionRecord[];
  correctionRecords: CorrectionRecord[];
  conclusionRecords: ConclusionRecord[];
  anomalyRecords: AnomalyRecord[];
}

/** 获取完整Mock数据集 */
export function getCompleteMockData(): MockDataSet {
  return {
    mediaBatches: mockMediaBatches,
    sampleRecords: mockSampleRecords,
    versionRecords: mockVersionRecords,
    correctionRecords: mockCorrectionRecords,
    conclusionRecords: mockConclusionRecords,
    anomalyRecords: mockAnomalyRecords
  };
}
