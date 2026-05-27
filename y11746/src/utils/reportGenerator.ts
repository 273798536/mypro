import * as XLSX from 'xlsx';
import { Donation, Project, ExceptionRecord, ProjectSummary, VerificationStats } from '../types';
import { collectByProject, calculateVerificationStats } from './verificationEngine';

export interface SummaryReport {
  stats: VerificationStats;
  generatedAt: string;
}

export const generateSummaryReport = (
  donations: Donation[],
  projects: Project[],
  exceptions: ExceptionRecord[]
): SummaryReport => {
  const stats = calculateVerificationStats(donations);
  return {
    stats,
    generatedAt: new Date().toLocaleString('zh-CN'),
  };
};

export const generateExceptionReportData = (exceptions: ExceptionRecord[]) => {
  return exceptions.map(e => ({
    '异常类型': e.type,
    '描述': e.description,
    '修正建议': e.suggestion,
    '数据来源': e.source,
    '原始行号': e.sourceLine,
    '记录ID': e.recordId,
    '状态': e.resolved ? '已解决' : '待处理',
    '发现时间': new Date(e.createdAt).toLocaleString('zh-CN'),
  }));
};

export const generateDonationReportData = (donations: Donation[]) => {
  return donations.map(d => ({
    '捐赠人': d.donorName,
    '金额': d.amount,
    '项目名称': d.projectName || d.projectId,
    '是否实物': d.isPhysical ? '是' : '否',
    '票据号码': d.invoiceNumber || '-',
    '票据状态': d.invoiceStatus,
    '是否退款': d.hasRefund ? '是' : '否',
    '异常数量': d.exceptions.length,
    '状态': d.isVerified ? '已核销' : '待核销',
    '数据来源': d.source,
    '原始行号': d.sourceLine,
  }));
};

export const generateProjectReportData = (summaries: ProjectSummary[]) => {
  return summaries.map(s => ({
    '项目代码': s.projectCode,
    '项目名称': s.projectName,
    '是否定向': s.isTargeted ? '是' : '否',
    '捐赠笔数': s.donationCount,
    '总金额': s.totalAmount,
    '实物捐赠数': s.physicalCount,
    '退款笔数': s.refundCount,
  }));
};

export const exportToExcel = (
  donations: Donation[],
  projects: Project[],
  exceptions: ExceptionRecord[],
  filename: string = '慈善捐赠票据核销报告'
) => {
  const projectSummaries = collectByProject(donations, projects);

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['慈善捐赠票据核销汇总报告'],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    [],
    ['统计项', '数值'],
    ['总捐赠笔数', donations.length],
    ['正常笔数', donations.filter(d => d.exceptions.length === 0).length],
    ['异常笔数', donations.filter(d => d.exceptions.length > 0).length],
    ['待开票数', donations.filter(d => d.invoiceStatus === 'pending').length],
    ['已冲销数', donations.filter(d => d.invoiceStatus === 'reversed').length],
    ['捐赠总额', donations.reduce((sum, d) => sum + d.amount, 0)],
    ['退款总额', donations.filter(d => d.hasRefund).reduce((sum, d) => sum + d.amount, 0)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, '汇总');

  const donationWs = XLSX.utils.json_to_sheet(generateDonationReportData(donations));
  XLSX.utils.book_append_sheet(wb, donationWs, '捐赠明细');

  const projectWs = XLSX.utils.json_to_sheet(generateProjectReportData(projectSummaries));
  XLSX.utils.book_append_sheet(wb, projectWs, '项目归集');

  const exceptionWs = XLSX.utils.json_to_sheet(generateExceptionReportData(exceptions));
  XLSX.utils.book_append_sheet(wb, exceptionWs, '异常清单');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, filename + '_' + dateStr + '.xlsx');
};

export const exportToCSV = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', filename + '_' + dateStr + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
