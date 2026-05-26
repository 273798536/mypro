import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { LoanBaseInfo, PrepaymentResult, RepaymentItem } from '@/types';
import { formatCurrency } from './calculator';

export function exportToPDF(
  loanInfo: LoanBaseInfo | null,
  result: PrepaymentResult,
  warnings: {
    unhandled: string[];
    corrected: string[];
    needConfirm: string[];
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('房贷提前还款试算报告', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  if (loanInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('一、贷款基础信息', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const loanData = [
      ['借款人', loanInfo.borrowerName || '-'],
      ['贷款合同号', loanInfo.contractNumber || '-'],
      ['贷款金额', formatCurrency(loanInfo.loanAmount)],
      ['贷款期限', `${loanInfo.loanTerm}个月（${(loanInfo.loanTerm / 12).toFixed(1)}年）`],
      ['还款方式', loanInfo.repaymentMethod === 'equal_principal_interest' ? '等额本息' : '等额本金'],
      ['初始年利率', `${loanInfo.interestRate}%`],
      ['放款日', loanInfo.disbursementDate],
      ['首次还款日', loanInfo.firstRepaymentDate],
      ['利率重定价日', loanInfo.repricingDate],
    ];

    loanData.forEach(([label, value]) => {
      doc.text(label, margin, y);
      doc.text(String(value), margin + 60, y);
      y += 6;
    });
    y += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('二、试算参数', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const paramsData = [
    ['提前还款日期', result.params.prepaymentDate],
    ['提前还款类型', result.params.prepaymentType === 'full' ? '全部提前还款' : '部分提前还款'],
    ['提前还款金额', formatCurrency(result.params.prepaymentAmount)],
  ];
  if (result.params.prepaymentType === 'partial' && result.params.partialOption) {
    paramsData.push(['部分还款方式', result.params.partialOption === 'reduce_payment' ? '减少月供' : '缩短期限']);
  }

  paramsData.forEach(([label, value]) => {
    doc.text(label, margin, y);
    doc.text(String(value), margin + 60, y);
    y += 6;
  });
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('三、试算结果', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const resultData = [
    ['提前还款时已还期数', `${result.periodAtPrepayment}期`],
    ['提前还款时剩余本金', formatCurrency(result.remainingPrincipal)],
    ['原还款总利息', formatCurrency(result.originalTotalInterest)],
    ['新还款总利息', formatCurrency(result.newTotalInterest)],
    ['节省利息', formatCurrency(result.interestSaved)],
    ['违约金', formatCurrency(result.penaltyAmount)],
    ['净收益（节省-违约金）', formatCurrency(result.netBenefit)],
  ];
  if (result.newMonthlyPayment !== undefined) {
    resultData.push(['新月供金额', formatCurrency(result.newMonthlyPayment)]);
  }
  if (result.newTerm !== undefined) {
    resultData.push(['新还款期限', `${result.newTerm}期`]);
  }

  resultData.forEach(([label, value]) => {
    doc.text(label, margin, y);
    doc.text(String(value), margin + 60, y);
    y += 6;
  });
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('四、数据状态说明', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (warnings.unhandled.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('未处理项：', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    warnings.unhandled.forEach((item) => {
      doc.text(`• ${item}`, margin + 5, y);
      y += 6;
    });
    y += 4;
  }

  if (warnings.corrected.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('已修正项：', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    warnings.corrected.forEach((item) => {
      doc.text(`• ${item}`, margin + 5, y);
      y += 6;
    });
    y += 4;
  }

  if (warnings.needConfirm.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('需人工确认项：', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    warnings.needConfirm.forEach((item) => {
      doc.text(`• ${item}`, margin + 5, y);
      y += 6;
    });
  }

  if (y > 270) {
    doc.addPage();
    y = margin;
  } else {
    y += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('五、风险提示', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => {
      doc.text(`[${w.level === 'error' ? '重要' : w.level === 'warning' ? '注意' : '提示'}] ${w.message}`, margin, y);
      y += 6;
      doc.text(w.details, margin + 5, y);
      y += 8;
    });
  } else {
    doc.text('本次试算未检测到特殊风险点。', margin, y);
    y += 6;
  }

  doc.setDrawColor(200);
  doc.line(margin, 280, pageWidth - margin, 280);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('本报告由系统自动生成，仅供参考，实际金额以银行柜台计算为准。', pageWidth / 2, 287, { align: 'center' });
  doc.text('数据来源标记：系统生成 / 合同录入 / 人工修正', pageWidth / 2, 292, { align: 'center' });

  doc.save(`提前还款试算报告_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}

export function exportToExcel(
  loanInfo: LoanBaseInfo | null,
  result: PrepaymentResult
) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['房贷提前还款试算明细'],
    [],
    ['一、贷款基础信息'],
    ['字段', '值'],
    ['贷款金额', loanInfo?.loanAmount || 0],
    ['贷款期限(月)', loanInfo?.loanTerm || 0],
    ['还款方式', loanInfo?.repaymentMethod === 'equal_principal_interest' ? '等额本息' : '等额本金'],
    ['初始年利率(%)', loanInfo?.interestRate || 0],
    ['放款日', loanInfo?.disbursementDate || ''],
    [],
    ['二、试算参数'],
    ['提前还款日期', result.params.prepaymentDate],
    ['提前还款类型', result.params.prepaymentType === 'full' ? '全部' : '部分'],
    ['提前还款金额', result.params.prepaymentAmount],
    [],
    ['三、试算结果'],
    ['原总利息', result.originalTotalInterest],
    ['新总利息', result.newTotalInterest],
    ['节省利息', result.interestSaved],
    ['违约金', result.penaltyAmount],
    ['净收益', result.netBenefit],
    result.newMonthlyPayment ? ['新月供', result.newMonthlyPayment] : [],
    result.newTerm ? ['新期限(月)', result.newTerm] : [],
  ].filter(row => row.length > 0);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, '试算摘要');

  const scheduleHeaders = ['期数', '应还日期', '应还本金', '应还利息', '应还总额', '剩余本金', '状态', '数据来源', '是否修正'];
  const scheduleData = [scheduleHeaders, ...result.newRepaymentSchedule.map(item => [
    item.period,
    item.dueDate,
    item.principal,
    item.interest,
    item.totalPayment,
    item.remainingPrincipal,
    item.status === 'paid' ? '已还' : item.status === 'overdue' ? '逾期' : '待还',
    item.source,
    item.isCorrected ? '是' : '否',
  ])];

  const scheduleWs = XLSX.utils.aoa_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(wb, scheduleWs, '新还款计划');

  XLSX.writeFile(wb, `提前还款试算明细_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}

export function exportScheduleToExcel(schedule: RepaymentItem[], loanInfo?: LoanBaseInfo | null) {
  const wb = XLSX.utils.book_new();

  const headers = ['期数', '应还日期', '应还本金', '应还利息', '应还总额', '剩余本金', '状态', '数据来源', '是否修正', '修正备注'];
  const data = [headers, ...schedule.map(item => [
    item.period,
    item.dueDate,
    item.principal,
    item.interest,
    item.totalPayment,
    item.remainingPrincipal,
    item.status === 'paid' ? '已还' : item.status === 'overdue' ? '逾期' : '待还',
    item.source,
    item.isCorrected ? '是' : '否',
    item.correctionNote || '',
  ])];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '还款计划');

  XLSX.writeFile(wb, `还款计划_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}
