import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { 
  Employee, 
  SalaryCalculation, 
  Exception, 
  TaxPeriod,
  SpecialDeduction,
  BackPay
} from '../types';
import { formatCurrency } from './calculator';
import { getExceptionTypeName, getSeverityName } from './exceptionDetector';

export const exportToExcel = (
  employees: Employee[],
  calculations: SalaryCalculation[],
  exceptions: Exception[],
  deductions: SpecialDeduction[],
  backPayRecords: BackPay[],
  taxPeriod: TaxPeriod
) => {
  const wb = XLSX.utils.book_new();
  
  const payrollData = calculations.map(calc => {
    const emp = employees.find(e => e.id === calc.employeeId);
    const empDeductions = deductions.filter(d => d.employeeId === calc.employeeId);
    const empBackPay = backPayRecords.find(b => b.employeeId === calc.employeeId && b.targetPeriod === taxPeriod.periodName);
    
    return {
      '员工编号': emp?.employeeNo || '',
      '姓名': emp?.name || '',
      '部门': emp?.department || '',
      '岗位': emp?.position || '',
      '应发工资': calc.grossSalary,
      '社保个人': calc.socialSecurityPersonal,
      '公积金个人': calc.housingFundPersonal,
      '专项扣除合计': calc.specialDeductionTotal,
      '应纳税所得额': calc.taxableIncome,
      '个税': calc.taxAmount,
      '补发调整': calc.backPayAdjustment,
      '其他扣款': calc.otherDeduction,
      '实发工资': calc.netSalary,
      '补发原因': empBackPay?.reason || '',
      '专项扣除明细': empDeductions.map(d => `${d.deductionType}:${d.amount}`).join('; ')
    };
  });
  
  const payrollSheet = XLSX.utils.json_to_sheet(payrollData);
  XLSX.utils.book_append_sheet(wb, payrollSheet, '工资明细');
  
  const exceptionData = exceptions.map(exc => ({
    '异常类型': getExceptionTypeName(exc.type),
    '严重程度': getSeverityName(exc.severity),
    '员工姓名': exc.employeeName || '',
    '税期': exc.taxPeriod,
    '描述': exc.description,
    '来源': exc.source,
    '建议': exc.suggestion,
    '状态': exc.status === 'pending' ? '待处理' : exc.status === 'resolved' ? '已解决' : '已忽略',
    '创建时间': exc.createdAt
  }));
  
  const exceptionSheet = XLSX.utils.json_to_sheet(exceptionData);
  XLSX.utils.book_append_sheet(wb, exceptionSheet, '异常记录');
  
  const summaryData = [{
    '税期': taxPeriod.periodName,
    '员工总数': taxPeriod.totalEmployees,
    '工资总额': taxPeriod.totalSalary,
    '个税总额': taxPeriod.totalTax,
    '异常数量': taxPeriod.exceptionCount,
    '状态': taxPeriod.status === 'pending' ? '未开始' 
      : taxPeriod.status === 'in_progress' ? '处理中' 
      : taxPeriod.status === 'locked' ? '已锁定' 
      : '已完成'
  }];
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, '汇总');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, `工资明细_${taxPeriod.periodName}.xlsx`);
};

export const exportToPDF = (
  employees: Employee[],
  calculations: SalaryCalculation[],
  exceptions: Exception[],
  taxPeriod: TaxPeriod
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(`工资明细报告 - ${taxPeriod.periodName}`, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('汇总信息', 14, 35);
  doc.setFontSize(10);
  doc.text(`员工总数: ${taxPeriod.totalEmployees}`, 14, 45);
  doc.text(`工资总额: ${formatCurrency(taxPeriod.totalSalary)}`, 14, 52);
  doc.text(`个税总额: ${formatCurrency(taxPeriod.totalTax)}`, 14, 59);
  doc.text(`异常数量: ${taxPeriod.exceptionCount}`, 14, 66);
  
  let y = 80;
  doc.setFontSize(12);
  doc.text('工资明细', 14, y);
  y += 10;
  
  doc.setFontSize(9);
  const headers = ['员工', '部门', '应发', '社保', '公积金', '个税', '实发'];
  const colWidths = [30, 30, 25, 22, 22, 22, 25];
  let x = 14;
  
  headers.forEach((header, i) => {
    doc.text(header, x, y);
    x += colWidths[i];
  });
  
  y += 7;
  
  calculations.forEach((calc, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    const emp = employees.find(e => e.id === calc.employeeId);
    x = 14;
    
    doc.text(emp?.name || '', x, y);
    x += colWidths[0];
    doc.text(emp?.department || '', x, y);
    x += colWidths[1];
    doc.text(formatCurrency(calc.grossSalary), x, y);
    x += colWidths[2];
    doc.text(formatCurrency(calc.socialSecurityPersonal), x, y);
    x += colWidths[3];
    doc.text(formatCurrency(calc.housingFundPersonal), x, y);
    x += colWidths[4];
    doc.text(formatCurrency(calc.taxAmount), x, y);
    x += colWidths[5];
    doc.text(formatCurrency(calc.netSalary), x, y);
    
    y += 7;
  });
  
  if (exceptions.length > 0) {
    doc.addPage();
    y = 20;
    
    doc.setFontSize(12);
    doc.text('异常记录', 14, y);
    y += 10;
    
    doc.setFontSize(9);
    exceptions.forEach((exc, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(`${index + 1}. [${getSeverityName(exc.severity)}] ${getExceptionTypeName(exc.type)}`, 14, y);
      y += 5;
      doc.text(`   员工: ${exc.employeeName || ''}`, 14, y);
      y += 5;
      doc.text(`   描述: ${exc.description}`, 14, y);
      y += 5;
      doc.text(`   来源: ${exc.source}`, 14, y);
      y += 5;
      doc.text(`   建议: ${exc.suggestion}`, 14, y);
      y += 8;
    });
  }
  
  doc.save(`工资报告_${taxPeriod.periodName}.pdf`);
};

export const downloadSampleTemplate = () => {
  const wb = XLSX.utils.book_new();
  
  const employeeTemplate = [
    { '员工编号': 'E001', '姓名': '张三', '部门': '技术部', '岗位': '工程师', '入职日期': '2020-01-01', '社保基数': 20000, '公积金基数': 20000 }
  ];
  const empSheet = XLSX.utils.json_to_sheet(employeeTemplate);
  XLSX.utils.book_append_sheet(wb, empSheet, '员工档案');
  
  const salaryTemplate = [
    { '员工编号': 'E001', '基本工资': 20000, '绩效奖金': 6000, '加班费': 0, '津贴': 500, '社保个人': 2100, '公积金个人': 2400 }
  ];
  const salSheet = XLSX.utils.json_to_sheet(salaryTemplate);
  XLSX.utils.book_append_sheet(wb, salSheet, '工资项');
  
  const deductionTemplate = [
    { '员工编号': 'E001', '扣除类型': 'children_education', '金额': 1000, '生效月份': '2026-01' }
  ];
  const dedSheet = XLSX.utils.json_to_sheet(deductionTemplate);
  XLSX.utils.book_append_sheet(wb, dedSheet, '专项扣除');
  
  const backpayTemplate = [
    { '员工编号': 'E001', '原所属期': '2026-03', '目标期': '2026-05', '金额': 5000, '原因': '绩效补发' }
  ];
  const backSheet = XLSX.utils.json_to_sheet(backpayTemplate);
  XLSX.utils.book_append_sheet(wb, backSheet, '补发记录');
  
  const resignationTemplate = [
    { '员工编号': 'E001', '离职日期': '2026-04-30', '社保截止月': '2026-04', '公积金截止月': '2026-04', '补偿金': 0 }
  ];
  const resSheet = XLSX.utils.json_to_sheet(resignationTemplate);
  XLSX.utils.book_append_sheet(wb, resSheet, '离职记录');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '工资数据导入模板.xlsx');
};
