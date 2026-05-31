import { PlateArchive, BindingRecord, ParkingFlow, DeferredRevenue, EventTrace, ProblemMark, StatusChange, ValidationStep, ScenarioConfig } from '../types';

export const plateArchives: PlateArchive[] = [
  {
    id: 'plate-001',
    plateNumber: '京A12345',
    ownerName: '张三',
    vehicleType: 'private',
    effectiveDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'active',
    parkingLot: 'A区停车场',
    monthlyFee: 500,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-15T10:30:00Z'
  },
  {
    id: 'plate-002',
    plateNumber: '京B67890',
    ownerName: '李四',
    vehicleType: 'commercial',
    effectiveDate: '2024-02-01',
    expiryDate: '2024-07-31',
    status: 'active',
    parkingLot: 'B区停车场',
    monthlyFee: 800,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: 'plate-003',
    plateNumber: '京C11111',
    ownerName: '王五',
    vehicleType: 'private',
    effectiveDate: '2024-01-15',
    expiryDate: '2024-06-30',
    status: 'suspended',
    parkingLot: 'A区停车场',
    monthlyFee: 500,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-04-01T09:00:00Z'
  },
  {
    id: 'plate-004',
    plateNumber: '京D22222',
    ownerName: '赵六',
    vehicleType: 'temporary',
    effectiveDate: '2024-03-01',
    expiryDate: '2024-03-31',
    status: 'expired',
    parkingLot: 'C区停车场',
    monthlyFee: 300,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-04-01T00:00:00Z'
  },
  {
    id: 'plate-005',
    plateNumber: '京E33333',
    ownerName: '钱七',
    vehicleType: 'private',
    effectiveDate: '2024-03-10',
    expiryDate: '2024-09-09',
    status: 'transferred',
    parkingLot: 'A区停车场',
    monthlyFee: 500,
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-04-15T14:20:00Z'
  }
];

export const bindingRecords: BindingRecord[] = [
  {
    id: 'bind-001',
    plateId: 'plate-001',
    oldPlate: '京A12345',
    newPlate: '京A54321',
    bindTime: '2024-03-15T10:30:00Z',
    operator: '运营专员A',
    status: 'success'
  },
  {
    id: 'bind-002',
    plateId: 'plate-003',
    oldPlate: '京C11111',
    newPlate: '京C99999',
    bindTime: '2024-04-01T09:00:00Z',
    operator: '运营专员B',
    status: 'failed',
    failReason: '旧车牌存在未结清临停费用，无法完成换绑',
    failStep: 'validation'
  },
  {
    id: 'bind-003',
    plateId: 'plate-005',
    oldPlate: '京E33333',
    newPlate: '京E77777',
    bindTime: '2024-04-10T11:00:00Z',
    operator: '运营专员A',
    status: 'failed',
    failReason: '跨月换绑导致收入归属不清，需财务确认',
    failStep: 'approval'
  },
  {
    id: 'bind-004',
    plateId: 'plate-002',
    oldPlate: '京B67890',
    newPlate: '京B00000',
    bindTime: '2024-05-01T14:00:00Z',
    operator: '运营专员C',
    status: 'pending'
  }
];

export const parkingFlows: ParkingFlow[] = [
  {
    id: 'flow-001',
    plateId: 'plate-001',
    plateNumber: '京A12345',
    entryTime: '2024-03-10T08:00:00Z',
    exitTime: '2024-03-10T18:00:00Z',
    parkingType: 'monthly',
    duration: 600,
    amount: 0,
    paymentMethod: 'monthly',
    isDeducted: true,
    deductionSource: '包月抵扣'
  },
  {
    id: 'flow-002',
    plateId: 'plate-001',
    plateNumber: '京A12345',
    entryTime: '2024-03-20T09:30:00Z',
    exitTime: '2024-03-20T20:45:00Z',
    parkingType: 'monthly',
    duration: 675,
    amount: 0,
    paymentMethod: 'monthly',
    isDeducted: true,
    deductionSource: '包月抵扣'
  },
  {
    id: 'flow-003',
    plateId: 'plate-003',
    plateNumber: '京C11111',
    entryTime: '2024-03-25T10:00:00Z',
    exitTime: '2024-03-26T08:00:00Z',
    parkingType: 'temporary',
    duration: 1320,
    amount: 120,
    paymentMethod: 'wechat',
    isDeducted: false
  },
  {
    id: 'flow-004',
    plateId: 'plate-003',
    plateNumber: '京C11111',
    entryTime: '2024-04-02T07:00:00Z',
    exitTime: '2024-04-02T19:00:00Z',
    parkingType: 'temporary',
    duration: 720,
    amount: 60,
    paymentMethod: 'unpaid',
    isDeducted: false
  },
  {
    id: 'flow-005',
    plateId: 'plate-002',
    plateNumber: '京B67890',
    entryTime: '2024-04-05T08:30:00Z',
    exitTime: '2024-04-05T17:30:00Z',
    parkingType: 'monthly',
    duration: 540,
    amount: 0,
    paymentMethod: 'monthly',
    isDeducted: true,
    deductionSource: '包月抵扣'
  },
  {
    id: 'flow-006',
    plateId: 'plate-005',
    plateNumber: '京E33333',
    entryTime: '2024-03-28T12:00:00Z',
    exitTime: '2024-03-28T16:30:00Z',
    parkingType: 'temporary',
    duration: 270,
    amount: 45,
    paymentMethod: 'alipay',
    isDeducted: false
  },
  {
    id: 'flow-007',
    plateId: 'plate-004',
    plateNumber: '京D22222',
    entryTime: '2024-04-10T09:00:00Z',
    exitTime: '2024-04-10T15:00:00Z',
    parkingType: 'temporary',
    duration: 360,
    amount: 50,
    paymentMethod: 'wechat',
    isDeducted: false
  }
];

export const deferredRevenues: DeferredRevenue[] = [
  {
    id: 'revenue-001',
    plateId: 'plate-001',
    plateNumber: '京A12345',
    period: '2024-03',
    totalAmount: 500,
    recognizedAmount: 500,
    deferredAmount: 0,
    calculationDate: '2024-04-01T00:00:00Z',
    status: 'normal',
    warnings: [],
    errors: []
  },
  {
    id: 'revenue-002',
    plateId: 'plate-002',
    plateNumber: '京B67890',
    period: '2024-03',
    totalAmount: 800,
    recognizedAmount: 800,
    deferredAmount: 0,
    calculationDate: '2024-04-01T00:00:00Z',
    status: 'normal',
    warnings: [],
    errors: []
  },
  {
    id: 'revenue-003',
    plateId: 'plate-003',
    plateNumber: '京C11111',
    period: '2024-03',
    totalAmount: 500,
    recognizedAmount: 250,
    deferredAmount: 250,
    calculationDate: '2024-04-01T00:00:00Z',
    status: 'warning',
    warnings: ['车牌状态异常（已停用），需确认递延处理'],
    errors: []
  },
  {
    id: 'revenue-004',
    plateId: 'plate-005',
    plateNumber: '京E33333',
    period: '2024-04',
    totalAmount: 500,
    recognizedAmount: 0,
    deferredAmount: 500,
    calculationDate: '2024-04-15T00:00:00Z',
    status: 'error',
    warnings: ['跨月换绑待确认'],
    errors: ['收入归属不清，需财务审批后重新计算']
  }
];

export const eventTraces: EventTrace[] = [
  {
    id: 'trace-001',
    eventType: 'calculation',
    eventTime: '2024-04-01T00:00:00Z',
    relatedPlateIds: ['plate-001', 'plate-002', 'plate-003'],
    relatedRecordIds: ['revenue-001', 'revenue-002', 'revenue-003'],
    description: '2024年3月包月收入递延计算完成',
    sourceModule: '收入递延计算引擎',
    operator: '系统自动'
  },
  {
    id: 'trace-002',
    eventType: 'binding',
    eventTime: '2024-03-15T10:30:00Z',
    relatedPlateIds: ['plate-001'],
    relatedRecordIds: ['bind-001'],
    description: '车牌京A12345换绑为京A54321成功',
    sourceModule: '车牌管理模块',
    operator: '运营专员A'
  },
  {
    id: 'trace-003',
    eventType: 'binding',
    eventTime: '2024-04-01T09:00:00Z',
    relatedPlateIds: ['plate-003'],
    relatedRecordIds: ['bind-002', 'flow-004'],
    description: '车牌京C11111换绑失败：存在未结清费用',
    sourceModule: '车牌管理模块',
    operator: '运营专员B'
  },
  {
    id: 'trace-004',
    eventType: 'binding',
    eventTime: '2024-04-10T11:00:00Z',
    relatedPlateIds: ['plate-005'],
    relatedRecordIds: ['bind-003', 'revenue-004'],
    description: '车牌京E33333换绑失败：跨月收入归属待确认',
    sourceModule: '车牌管理模块',
    operator: '运营专员A'
  },
  {
    id: 'trace-005',
    eventType: 'deduction',
    eventTime: '2024-03-10T18:00:00Z',
    relatedPlateIds: ['plate-001'],
    relatedRecordIds: ['flow-001'],
    description: '临停费用包月抵扣成功',
    sourceModule: '收费系统',
    operator: '系统自动'
  },
  {
    id: 'trace-006',
    eventType: 'plate_change',
    eventTime: '2024-04-01T09:00:00Z',
    relatedPlateIds: ['plate-003'],
    relatedRecordIds: [],
    description: '车牌京C11111状态变更为已停用',
    sourceModule: '车牌管理模块',
    operator: '运营经理'
  }
];

export const problemMarks: ProblemMark[] = [
  {
    id: 'problem-001',
    traceId: 'trace-003',
    problemType: 'binding_failure',
    severity: 'high',
    description: '车牌换绑失败：旧车牌存在未结清临停费用',
    triggerSource: '车牌换绑校验（flow-004）',
    stuckPoint: '数据校验阶段：费用未结清校验不通过',
    missingMaterial: ['未结清费用的支付凭证', '车主豁免申请（如有）'],
    nextSteps: ['联系车主结清临停费用', '或提交特殊审批申请'],
    responsibleParty: '运营专员B',
    isResolved: false
  },
  {
    id: 'problem-002',
    traceId: 'trace-004',
    problemType: 'binding_failure',
    severity: 'critical',
    description: '跨月车牌换绑导致收入归属不清',
    triggerSource: '财务审批环节',
    stuckPoint: '审批阶段：跨月收入确认规则不明确',
    missingMaterial: ['跨月换绑收入拆分方案', '财务部门审批意见'],
    nextSteps: ['财务部门出具收入拆分方案', '运营部门确认换绑时间点'],
    responsibleParty: '财务主管',
    isResolved: false
  },
  {
    id: 'problem-003',
    traceId: 'trace-001',
    problemType: 'data_inconsistency',
    severity: 'medium',
    description: '车牌状态异常（已停用）但仍在计算递延',
    triggerSource: '收入递延计算引擎',
    stuckPoint: '计算阶段：状态校验逻辑待完善',
    missingMaterial: ['车牌停用原因说明', '停用后费用处理政策'],
    nextSteps: ['确认停用后是否继续计费', '调整计算规则'],
    responsibleParty: '系统开发',
    isResolved: false
  }
];

export const statusChanges: StatusChange[] = [
  {
    id: 'status-001',
    plateId: 'plate-001',
    oldStatus: 'suspended',
    newStatus: 'active',
    changeTime: '2024-01-15T00:00:00Z',
    reason: '包月续费',
    operator: '运营专员A'
  },
  {
    id: 'status-002',
    plateId: 'plate-003',
    oldStatus: 'active',
    newStatus: 'suspended',
    changeTime: '2024-04-01T09:00:00Z',
    reason: '车主申请暂停',
    operator: '运营经理'
  },
  {
    id: 'status-003',
    plateId: 'plate-004',
    oldStatus: 'active',
    newStatus: 'expired',
    changeTime: '2024-04-01T00:00:00Z',
    reason: '包月到期',
    operator: '系统自动'
  },
  {
    id: 'status-004',
    plateId: 'plate-005',
    oldStatus: 'active',
    newStatus: 'transferred',
    changeTime: '2024-04-15T14:20:00Z',
    reason: '车辆转让',
    operator: '运营专员A'
  }
];

export const validationSteps: ValidationStep[] = [
  {
    id: 'valid-001',
    stepName: '车牌格式校验',
    status: 'passed',
    description: '验证新车牌号码格式是否正确',
    timestamp: '2024-04-01T09:00:00Z'
  },
  {
    id: 'valid-002',
    stepName: '车主信息匹配',
    status: 'passed',
    description: '验证新旧车牌车主信息是否一致',
    timestamp: '2024-04-01T09:00:01Z'
  },
  {
    id: 'valid-003',
    stepName: '未结清费用检查',
    status: 'failed',
    description: '检查是否存在未结清的临停费用',
    detail: '发现1笔未结清费用：flow-004，金额60元',
    timestamp: '2024-04-01T09:00:02Z'
  },
  {
    id: 'valid-004',
    stepName: '包月有效性校验',
    status: 'skipped',
    description: '验证包月服务是否在有效期内',
    timestamp: '2024-04-01T09:00:02Z'
  }
];

export const scenarioConfigs: ScenarioConfig[] = [
  {
    id: 'scenario-normal',
    name: '正常场景',
    description: '标准包月车辆，无异常的收入递延计算',
    type: 'normal',
    dataKeys: ['plate-001', 'plate-002']
  },
  {
    id: 'scenario-binding-fee',
    name: '换绑失败-未结清费用',
    description: '旧车牌存在未结清临停费用导致换绑失败',
    type: 'binding_failure',
    dataKeys: ['plate-003', 'bind-002', 'flow-004']
  },
  {
    id: 'scenario-binding-crossmonth',
    name: '换绑失败-跨月收入',
    description: '跨月换绑导致收入归属不清，需财务确认',
    type: 'binding_failure',
    dataKeys: ['plate-005', 'bind-003', 'revenue-004']
  },
  {
    id: 'scenario-deduction',
    name: '临停抵扣场景',
    description: '包月车辆临停费用抵扣的完整流程',
    type: 'deduction',
    dataKeys: ['plate-001', 'flow-001', 'flow-002']
  }
];

export const getPlateById = (id: string): PlateArchive | undefined => 
  plateArchives.find(p => p.id === id);

export const getBindingById = (id: string): BindingRecord | undefined =>
  bindingRecords.find(b => b.id === id);

export const getFlowById = (id: string): ParkingFlow | undefined =>
  parkingFlows.find(f => f.id === id);

export const getRevenueById = (id: string): DeferredRevenue | undefined =>
  deferredRevenues.find(r => r.id === id);

export const getProblemById = (id: string): ProblemMark | undefined =>
  problemMarks.find(p => p.id === id);

export const getFlowsByPlateId = (plateId: string): ParkingFlow[] =>
  parkingFlows.filter(f => f.plateId === plateId);

export const getBindingsByPlateId = (plateId: string): BindingRecord[] =>
  bindingRecords.filter(b => b.plateId === plateId);

export const getRevenuesByPlateId = (plateId: string): DeferredRevenue[] =>
  deferredRevenues.filter(r => r.plateId === plateId);

export const getProblemsByTraceId = (traceId: string): ProblemMark[] =>
  problemMarks.filter(p => p.traceId === traceId);
