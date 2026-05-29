import { 
  Exception, 
  Employee, 
  SalaryItem, 
  SpecialDeduction, 
  BackPay, 
  Resignation,
  ExceptionType,
  ExceptionSeverity
} from '../types';

const generateId = () => `exc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const detectDeductionMismatch = (
  deductions: SpecialDeduction[],
  taxPeriod: string,
  employees: Employee[]
): Exception[] => {
  const exceptions: Exception[] = [];
  
  deductions.forEach(deduction => {
    const employee = employees.find(e => e.id === deduction.employeeId);
    if (!employee) return;
    
    if (deduction.effectiveMonth > taxPeriod) {
      const deductionTypeNames: Record<string, string> = {
        'children_education': '子女教育',
        'continuing_education': '继续教育',
        'housing_loan': '住房贷款利息',
        'housing_rent': '住房租金',
        'elderly_care': '赡养老人',
        'infant_care': '0-3岁婴幼儿照护'
      };
      
      exceptions.push({
        id: generateId(),
        type: 'deduction_mismatch',
        severity: 'error',
        employeeId: employee.id,
        employeeName: employee.name,
        taxPeriod,
        description: `专项扣除「${deductionTypeNames[deduction.deductionType]}」生效月份为${deduction.effectiveMonth}，在当前税期(${taxPeriod})不应该扣除`,
        source: `专项扣除表 - ${deduction.id}`,
        affectedFields: ['specialDeductionTotal', 'taxableIncome', 'taxAmount', 'netSalary'],
        suggestion: '请检查扣除生效月份是否正确，或调整至正确的税期',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return exceptions;
};

export const detectBackPayCrossPeriod = (
  backPayRecords: BackPay[],
  taxPeriod: string,
  employees: Employee[]
): Exception[] => {
  const exceptions: Exception[] = [];
  
  backPayRecords.forEach(record => {
    if (record.targetPeriod !== taxPeriod) return;
    
    const employee = employees.find(e => e.id === record.employeeId);
    if (!employee) return;
    
    const originalYear = parseInt(record.originalPeriod.split('-')[0]);
    const targetYear = parseInt(taxPeriod.split('-')[0]);
    
    if (originalYear !== targetYear || record.isCrossPeriod) {
      exceptions.push({
        id: generateId(),
        type: 'backpay_cross_period',
        severity: 'warning',
        employeeId: employee.id,
        employeeName: employee.name,
        taxPeriod,
        description: `补发工资原所属期为${record.originalPeriod}，跨税期发放，已自动计算税额调整`,
        source: `补发记录表 - ${record.id}`,
        affectedFields: ['grossSalary', 'taxAmount', 'backPayAdjustment'],
        suggestion: '请确认跨期补发税额调整是否正确，如需调整可手动修改',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return exceptions;
};

export const detectSocialSecurityAfterResign = (
  salaryItems: SalaryItem[],
  resignations: Resignation[],
  taxPeriod: string,
  employees: Employee[]
): Exception[] => {
  const exceptions: Exception[] = [];
  
  resignations.forEach(resignation => {
    const employee = employees.find(e => e.id === resignation.employeeId);
    if (!employee) return;
    
    const salaryItem = salaryItems.find(s => s.employeeId === resignation.employeeId && s.taxPeriod === taxPeriod);
    if (!salaryItem) return;
    
    const resignationMonth = resignation.resignationDate.substring(0, 7);
    
    if (taxPeriod > resignationMonth) {
      if (salaryItem.socialSecurityPersonal > 0 || salaryItem.housingFundPersonal > 0) {
        exceptions.push({
          id: generateId(),
          type: 'social_security_after_resign',
          severity: 'error',
          employeeId: employee.id,
          employeeName: employee.name,
          taxPeriod,
          description: `员工已于${resignation.resignationDate}离职，但当前税期仍存在社保和公积金缴纳记录`,
          source: `工资项表 - ${salaryItem.id} / 离职记录表 - ${resignation.id}`,
          affectedFields: ['socialSecurityPersonal', 'housingFundPersonal'],
          suggestion: '请删除离职员工的社保公积金记录，或确认是否存在离职补偿金',
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    }
  });
  
  return exceptions;
};

export const detectDataInconsistency = (
  salaryItems: SalaryItem[],
  employees: Employee[],
  taxPeriod: string
): Exception[] => {
  const exceptions: Exception[] = [];
  
  salaryItems.forEach(salaryItem => {
    if (salaryItem.taxPeriod !== taxPeriod) return;
    
    const employee = employees.find(e => e.id === salaryItem.employeeId);
    if (!employee) return;
    
    const expectedSocialSecurity = Math.floor(employee.socialSecurityBase * 0.105);
    if (Math.abs(salaryItem.socialSecurityPersonal - expectedSocialSecurity) > 10) {
      exceptions.push({
        id: generateId(),
        type: 'data_inconsistency',
        severity: 'warning',
        employeeId: employee.id,
        employeeName: employee.name,
        taxPeriod,
        description: `员工档案中社保基数为${employee.socialSecurityBase}，但工资项中社保个人部分计算基数不匹配`,
        source: `员工档案 - ${employee.id} / 工资项表 - ${salaryItem.id}`,
        affectedFields: ['socialSecurityPersonal'],
        suggestion: '请核对社保基数和计算比例，确保数据一致',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return exceptions;
};

export const detectAllExceptions = (
  employees: Employee[],
  salaryItems: SalaryItem[],
  specialDeductions: SpecialDeduction[],
  backPayRecords: BackPay[],
  resignations: Resignation[],
  taxPeriod: string
): Exception[] => {
  const exceptions: Exception[] = [];
  
  exceptions.push(...detectDeductionMismatch(specialDeductions, taxPeriod, employees));
  exceptions.push(...detectBackPayCrossPeriod(backPayRecords, taxPeriod, employees));
  exceptions.push(...detectSocialSecurityAfterResign(salaryItems, resignations, taxPeriod, employees));
  exceptions.push(...detectDataInconsistency(salaryItems, employees, taxPeriod));
  
  return exceptions;
};

export const getExceptionTypeName = (type: ExceptionType): string => {
  const names: Record<ExceptionType, string> = {
    'deduction_mismatch': '扣除月份错位',
    'backpay_cross_period': '补发跨税期',
    'social_security_after_resign': '离职后社保',
    'data_inconsistency': '数据不一致',
    'calculation_error': '计算提示'
  };
  return names[type] || type;
};

export const getSeverityName = (severity: ExceptionSeverity): string => {
  const names: Record<ExceptionSeverity, string> = {
    'error': '错误',
    'warning': '警告',
    'info': '提示'
  };
  return names[severity] || severity;
};

export const getSeverityColor = (severity: ExceptionSeverity): string => {
  const colors: Record<ExceptionSeverity, string> = {
    'error': '#dc2626',
    'warning': '#f97316',
    'info': '#2563eb'
  };
  return colors[severity] || '#6b7280';
};
