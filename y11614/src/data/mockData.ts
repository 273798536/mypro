import { 
  Employee, 
  SalaryItem, 
  SpecialDeduction, 
  BackPay, 
  Resignation, 
  TaxPeriod, 
  SalaryCalculation, 
  Exception, 
  AuditLog,
  TaxBracket,
  DashboardStats 
} from '../types';

export const taxBrackets: TaxBracket[] = [
  { min: 0, max: 3000, rate: 0.03, quickDeduction: 0 },
  { min: 3000, max: 12000, rate: 0.1, quickDeduction: 210 },
  { min: 12000, max: 25000, rate: 0.2, quickDeduction: 1410 },
  { min: 25000, max: 35000, rate: 0.25, quickDeduction: 2660 },
  { min: 35000, max: 55000, rate: 0.3, quickDeduction: 4410 },
  { min: 55000, max: 80000, rate: 0.35, quickDeduction: 7160 },
  { min: 80000, max: Infinity, rate: 0.45, quickDeduction: 15160 },
];

export const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    name: '张三',
    employeeNo: 'E001',
    department: '技术部',
    position: '高级工程师',
    joinDate: '2020-03-15',
    idCard: '110101199001011234',
    socialSecurityBase: 25000,
    housingFundBase: 25000,
    status: 'active'
  },
  {
    id: 'emp-002',
    name: '李四',
    employeeNo: 'E002',
    department: '产品部',
    position: '产品经理',
    joinDate: '2021-06-01',
    idCard: '110101199205155678',
    socialSecurityBase: 22000,
    housingFundBase: 22000,
    status: 'active'
  },
  {
    id: 'emp-003',
    name: '王五',
    employeeNo: 'E003',
    department: '市场部',
    position: '市场总监',
    joinDate: '2019-01-20',
    idCard: '110101198808209012',
    socialSecurityBase: 30000,
    housingFundBase: 30000,
    status: 'active'
  },
  {
    id: 'emp-004',
    name: '赵六',
    employeeNo: 'E004',
    department: '财务部',
    position: '会计',
    joinDate: '2022-02-10',
    idCard: '110101199512033456',
    socialSecurityBase: 15000,
    housingFundBase: 15000,
    status: 'active'
  },
  {
    id: 'emp-005',
    name: '钱七',
    employeeNo: 'E005',
    department: '人事部',
    position: 'HR专员',
    joinDate: '2021-11-05',
    idCard: '110101199309107890',
    socialSecurityBase: 18000,
    housingFundBase: 18000,
    status: 'resigned'
  },
  {
    id: 'emp-006',
    name: '孙八',
    employeeNo: 'E006',
    department: '技术部',
    position: '前端工程师',
    joinDate: '2022-08-15',
    idCard: '110101199604202345',
    socialSecurityBase: 20000,
    housingFundBase: 20000,
    status: 'active'
  },
  {
    id: 'emp-007',
    name: '周九',
    employeeNo: 'E007',
    department: '设计部',
    position: 'UI设计师',
    joinDate: '2023-01-10',
    idCard: '110101199707156789',
    socialSecurityBase: 16000,
    housingFundBase: 16000,
    status: 'active'
  },
  {
    id: 'emp-008',
    name: '吴十',
    employeeNo: 'E008',
    department: '运营部',
    position: '运营主管',
    joinDate: '2020-09-01',
    idCard: '110101199103250123',
    socialSecurityBase: 23000,
    housingFundBase: 23000,
    status: 'active'
  }
];

export const mockSalaryItems: SalaryItem[] = mockEmployees
  .filter(e => e.status !== 'resigned')
  .map(emp => ({
    id: `sal-${emp.id}-202605`,
    employeeId: emp.id,
    taxPeriod: '2026-05',
    baseSalary: emp.socialSecurityBase,
    performanceBonus: Math.floor(emp.socialSecurityBase * 0.3),
    overtimePay: emp.department === '技术部' ? 2000 : 0,
    allowance: 500,
    otherIncome: 0,
    socialSecurityPersonal: Math.floor(emp.socialSecurityBase * 0.105),
    housingFundPersonal: Math.floor(emp.housingFundBase * 0.12),
    otherDeduction: 0
  }));

export const mockSpecialDeductions: SpecialDeduction[] = [
  {
    id: 'ded-001',
    employeeId: 'emp-001',
    deductionType: 'children_education',
    amount: 1000,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  },
  {
    id: 'ded-002',
    employeeId: 'emp-001',
    deductionType: 'housing_loan',
    amount: 1000,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  },
  {
    id: 'ded-003',
    employeeId: 'emp-002',
    deductionType: 'children_education',
    amount: 2000,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  },
  {
    id: 'ded-004',
    employeeId: 'emp-003',
    deductionType: 'elderly_care',
    amount: 2000,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  },
  {
    id: 'ded-005',
    employeeId: 'emp-003',
    deductionType: 'children_education',
    amount: 1000,
    effectiveMonth: '2026-04',
    source: 'manual_adjustment',
    isLocked: false
  },
  {
    id: 'ded-006',
    employeeId: 'emp-004',
    deductionType: 'housing_rent',
    amount: 1500,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  },
  {
    id: 'ded-007',
    employeeId: 'emp-006',
    deductionType: 'continuing_education',
    amount: 400,
    effectiveMonth: '2026-03',
    source: 'system_import',
    isLocked: true
  },
  {
    id: 'ded-008',
    employeeId: 'emp-007',
    deductionType: 'infant_care',
    amount: 1000,
    effectiveMonth: '2026-06',
    source: 'employee_declaration',
    isLocked: false
  },
  {
    id: 'ded-009',
    employeeId: 'emp-008',
    deductionType: 'children_education',
    amount: 1000,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  },
  {
    id: 'ded-010',
    employeeId: 'emp-008',
    deductionType: 'elderly_care',
    amount: 1000,
    effectiveMonth: '2026-01',
    source: 'employee_declaration',
    isLocked: true
  }
];

export const mockBackPayRecords: BackPay[] = [
  {
    id: 'back-001',
    employeeId: 'emp-001',
    originalPeriod: '2026-03',
    targetPeriod: '2026-05',
    amount: 5000,
    reason: '季度绩效补发',
    taxAdjustment: 480,
    isCrossPeriod: false
  },
  {
    id: 'back-002',
    employeeId: 'emp-003',
    originalPeriod: '2025-12',
    targetPeriod: '2026-05',
    amount: 15000,
    reason: '年终奖补发',
    taxAdjustment: 1800,
    isCrossPeriod: true
  },
  {
    id: 'back-003',
    employeeId: 'emp-006',
    originalPeriod: '2026-04',
    targetPeriod: '2026-05',
    amount: 3000,
    reason: '加班费补发',
    taxAdjustment: 90,
    isCrossPeriod: false
  }
];

export const mockResignations: Resignation[] = [
  {
    id: 'res-001',
    employeeId: 'emp-005',
    resignationDate: '2026-04-30',
    lastWorkingDay: '2026-04-30',
    socialSecurityEndMonth: '2026-04',
    housingFundEndMonth: '2026-04',
    hasSeverancePay: true,
    severancePayAmount: 36000
  }
];

export const mockTaxPeriods: TaxPeriod[] = [
  {
    id: 'period-202605',
    periodName: '2026年5月',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    status: 'in_progress',
    isLocked: false,
    totalEmployees: 7,
    totalSalary: 256000,
    totalTax: 18500,
    exceptionCount: 5
  },
  {
    id: 'period-202604',
    periodName: '2026年4月',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'completed',
    isLocked: true,
    totalEmployees: 8,
    totalSalary: 268000,
    totalTax: 19200,
    exceptionCount: 3
  },
  {
    id: 'period-202603',
    periodName: '2026年3月',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'completed',
    isLocked: true,
    totalEmployees: 8,
    totalSalary: 265000,
    totalTax: 18900,
    exceptionCount: 2
  },
  {
    id: 'period-202602',
    periodName: '2026年2月',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    status: 'completed',
    isLocked: true,
    totalEmployees: 8,
    totalSalary: 275000,
    totalTax: 20100,
    exceptionCount: 4
  },
  {
    id: 'period-202601',
    periodName: '2026年1月',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'completed',
    isLocked: true,
    totalEmployees: 7,
    totalSalary: 245000,
    totalTax: 17800,
    exceptionCount: 1
  }
];

export const mockSalaryCalculations: SalaryCalculation[] = mockSalaryItems.map(item => {
  const emp = mockEmployees.find(e => e.id === item.employeeId)!;
  const deductions = mockSpecialDeductions.filter(d => d.employeeId === item.employeeId);
  const backPay = mockBackPayRecords.find(b => b.employeeId === item.employeeId && b.targetPeriod === '2026-05');
  
  const specialDeductionTotal = deductions.reduce((sum, d) => sum + d.amount, 0);
  const grossSalary = item.baseSalary + item.performanceBonus + item.overtimePay + item.allowance + item.otherIncome + (backPay?.amount || 0);
  const socialSecurity = item.socialSecurityPersonal;
  const housingFund = item.housingFundPersonal;
  const taxableIncome = Math.max(0, grossSalary - socialSecurity - housingFund - 5000 - specialDeductionTotal);
  
  let taxAmount = 0;
  for (const bracket of taxBrackets) {
    if (taxableIncome > bracket.min) {
      taxAmount = taxableIncome * bracket.rate - bracket.quickDeduction;
    } else {
      break;
    }
  }
  taxAmount = Math.max(0, Math.round(taxAmount * 100) / 100);
  
  const netSalary = Math.round((grossSalary - socialSecurity - housingFund - taxAmount - item.otherDeduction - (backPay?.taxAdjustment || 0)) * 100) / 100;
  
  return {
    id: `calc-${item.employeeId}-202605`,
    employeeId: item.employeeId,
    taxPeriodId: 'period-202605',
    grossSalary: Math.round(grossSalary * 100) / 100,
    socialSecurityPersonal: socialSecurity,
    housingFundPersonal: housingFund,
    specialDeductionTotal,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    taxAmount,
    backPayAdjustment: backPay?.taxAdjustment || 0,
    otherDeduction: item.otherDeduction,
    netSalary,
    calculationStatus: 'calculated',
    calculationTime: '2026-05-25T10:30:00Z'
  };
});

export const mockExceptions: Exception[] = [
  {
    id: 'exc-001',
    type: 'deduction_mismatch',
    severity: 'error',
    employeeId: 'emp-007',
    employeeName: '周九',
    taxPeriod: '2026-05',
    description: '专项扣除「0-3岁婴幼儿照护」生效月份为2026-06，在当前税期(2026-05)不应该扣除',
    source: '专项扣除表 - 第8行',
    affectedFields: ['specialDeductionTotal', 'taxableIncome', 'taxAmount', 'netSalary'],
    suggestion: '请检查扣除生效月份是否正确，或调整至正确的税期',
    status: 'pending',
    createdAt: '2026-05-25T10:30:00Z'
  },
  {
    id: 'exc-002',
    type: 'backpay_cross_period',
    severity: 'warning',
    employeeId: 'emp-003',
    employeeName: '王五',
    taxPeriod: '2026-05',
    description: '补发工资原所属期为2025-12，跨税期发放，已自动计算税额调整',
    source: '补发记录表 - 第2行',
    affectedFields: ['grossSalary', 'taxAmount', 'backPayAdjustment'],
    suggestion: '请确认跨期补发税额调整是否正确，如需调整可手动修改',
    status: 'pending',
    createdAt: '2026-05-25T10:30:00Z'
  },
  {
    id: 'exc-003',
    type: 'social_security_after_resign',
    severity: 'error',
    employeeId: 'emp-005',
    employeeName: '钱七',
    taxPeriod: '2026-05',
    description: '员工已于2026-04-30离职，但当前税期仍存在社保和公积金缴纳记录',
    source: '工资项表 - 第5行 / 离职记录表 - 第1行',
    affectedFields: ['socialSecurityPersonal', 'housingFundPersonal'],
    suggestion: '请删除离职员工的社保公积金记录，或确认是否存在离职补偿金',
    status: 'pending',
    createdAt: '2026-05-25T10:30:00Z'
  },
  {
    id: 'exc-004',
    type: 'data_inconsistency',
    severity: 'warning',
    employeeId: 'emp-003',
    employeeName: '王五',
    taxPeriod: '2026-05',
    description: '员工档案中社保基数为30000，但工资项中社保个人部分计算基数不匹配',
    source: '员工档案 - 第3行 / 工资项表 - 第3行',
    affectedFields: ['socialSecurityPersonal'],
    suggestion: '请核对社保基数和计算比例，确保数据一致',
    status: 'pending',
    createdAt: '2026-05-25T10:30:00Z'
  },
  {
    id: 'exc-005',
    type: 'calculation_error',
    severity: 'info',
    employeeId: 'emp-001',
    employeeName: '张三',
    taxPeriod: '2026-05',
    description: '本次计算包含补发工资5000元，税额已按合并计税方式计算',
    source: '补发记录表 - 第1行',
    affectedFields: ['grossSalary', 'taxAmount'],
    suggestion: '此为正常提示，如无疑问可忽略',
    status: 'pending',
    createdAt: '2026-05-25T10:30:00Z'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-001',
    entityType: 'tax_period',
    entityId: 'period-202605',
    action: 'create',
    operator: '薪酬专员',
    timestamp: '2026-05-20T09:00:00Z',
    source: '系统操作',
    remark: '创建2026年5月税期'
  },
  {
    id: 'log-002',
    entityType: 'employee',
    entityId: 'emp-005',
    action: 'update',
    operator: '薪酬专员',
    timestamp: '2026-05-20T09:30:00Z',
    oldValue: '{"status": "active"}',
    newValue: '{"status": "resigned"}',
    source: '手动修改',
    remark: '标记员工钱七为离职状态'
  },
  {
    id: 'log-003',
    entityType: 'deduction',
    entityId: 'ded-005',
    action: 'create',
    operator: '薪酬专员',
    timestamp: '2026-05-22T14:00:00Z',
    source: '手动录入',
    remark: '为员工王五添加子女教育专项扣除'
  },
  {
    id: 'log-004',
    entityType: 'calculation',
    entityId: 'calc-emp-001-202605',
    action: 'calculate',
    operator: '系统',
    timestamp: '2026-05-25T10:30:00Z',
    source: '批量计算',
    remark: '系统自动计算2026年5月工资'
  },
  {
    id: 'log-005',
    entityType: 'exception',
    entityId: 'exc-003',
    action: 'create',
    operator: '系统',
    timestamp: '2026-05-25T10:30:00Z',
    source: '异常检测',
    remark: '检测到离职员工社保异常'
  },
  {
    id: 'log-006',
    entityType: 'deduction',
    entityId: 'ded-001',
    action: 'lock',
    operator: '薪酬专员',
    timestamp: '2026-05-23T16:00:00Z',
    source: '手动锁定',
    remark: '锁定张三的子女教育专项扣除'
  }
];

export const mockDashboardStats: DashboardStats = {
  currentPeriod: '2026年5月',
  totalEmployees: 8,
  totalSalary: 256000,
  totalTax: 18500,
  exceptionCount: 5,
  pendingExceptions: 5,
  calculationProgress: 100,
  periodStatus: '处理中'
};

export const monthlyTrendData = [
  { month: '2026-01', salary: 245000, tax: 17800 },
  { month: '2026-02', salary: 275000, tax: 20100 },
  { month: '2026-03', salary: 265000, tax: 18900 },
  { month: '2026-04', salary: 268000, tax: 19200 },
  { month: '2026-05', salary: 256000, tax: 18500 }
];

export const departmentSalaryData = [
  { department: '技术部', salary: 92000, count: 2 },
  { department: '产品部', salary: 28600, count: 1 },
  { department: '市场部', salary: 39000, count: 1 },
  { department: '财务部', salary: 19500, count: 1 },
  { department: '设计部', salary: 20800, count: 1 },
  { department: '运营部', salary: 29900, count: 1 },
  { department: '人事部', salary: 26200, count: 1 }
];

export const exceptionTypeDistribution = [
  { type: '扣除月份错位', value: 1 },
  { type: '补发跨税期', value: 1 },
  { type: '离职后社保', value: 1 },
  { type: '数据不一致', value: 1 },
  { type: '计算提示', value: 1 }
];
