import jsPDF from 'jspdf';
import { GameSettlement, Bond, SourceInfo } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export const generateTextReport = (
  settlement: GameSettlement,
  bond: Bond,
  sources: SourceInfo[],
  playerName: string
): string => {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('           债券现金流铁路 - 复盘报告');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`玩家: ${playerName}`);
  lines.push(`完成时间: ${format(settlement.completedAt, 'yyyy-MM-dd HH:mm:ss')}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('【债券信息】');
  lines.push('-'.repeat(60));
  lines.push(`债券名称: ${bond.name}`);
  lines.push(`债券代码: ${bond.code}`);
  lines.push(`面值: ${(bond.faceValue / 100000000).toFixed(2)} 亿元`);
  lines.push(`票面利率: ${bond.couponRate}%`);
  lines.push(`发行日期: ${format(bond.issueDate, 'yyyy-MM-dd')}`);
  lines.push(`到期日期: ${format(bond.maturityDate, 'yyyy-MM-dd')}`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('【数据来源追溯】');
  lines.push('-'.repeat(60));
  sources.forEach(source => {
    const typeMap: Record<string, string> = {
      bond: '债券基础信息',
      coupon: '票息支付信息',
      put: '回售选择权信息',
      default: '违约事件信息'
    };
    lines.push(`${typeMap[source.type]}: ${source.provider} (${format(source.providedAt, 'yyyy-MM-dd')})`);
  });
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('【游戏结算】');
  lines.push('-'.repeat(60));
  lines.push(`票息总站数: ${settlement.totalCoupons}`);
  lines.push(`成功通过: ${settlement.paidCoupons}`);
  lines.push(`顺延处理: ${settlement.deferredCoupons}`);
  lines.push(`回售选择: ${settlement.putExercised ? '已行使回售权' : '继续持有'}`);
  lines.push(`违约事件: ${settlement.defaultEvents}`);
  lines.push(`最终现金流: ${(settlement.finalAmount / 10000).toFixed(2)} 万元`);
  lines.push('');

  if (settlement.errors.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('【错误分析】');
    lines.push('-'.repeat(60));
    lines.push('');

    settlement.errors.forEach((error, index) => {
      lines.push(`错误 #${index + 1}`);
      lines.push(`类型: ${getErrorTypeName(error.type)}`);
      lines.push(`触发者: ${error.triggeredBy}`);
      lines.push(`时间: ${format(error.triggeredAt, 'yyyy-MM-dd HH:mm:ss')}`);
      lines.push(`问题: ${error.message}`);
      lines.push(`卡在哪: ${error.blockedStep}`);
      lines.push(`下一步: ${error.nextAction}`);
      lines.push('');
    });

    const couponDeferralError = settlement.errors.find(e => e.type === 'coupon_deferral_missed');
    if (couponDeferralError) {
      const failedNode = settlement.details.find(d => d.error?.type === 'coupon_deferral_missed');
      if (failedNode) {
        lines.push('>>> 票息顺延错误定位 <<<');
        lines.push(`处理步骤: ${failedNode.nodeName}`);
        lines.push(`状态: 失败 - 未识别票息需要顺延`);
        lines.push(`建议: 仔细核对托管行提供的付息通知，特别注意节假日安排`);
        lines.push('');
      }
    }

    const putMissedError = settlement.errors.find(e => e.type === 'put_option_missed');
    if (putMissedError) {
      lines.push('>>> 回售漏选说明 <<<');
      lines.push('问题描述: 未在规定时间内对回售选择权做出选择');
      lines.push('影响: 系统默认视为放弃回售权，将继续持有债券至到期');
      lines.push('建议: 设置回售登记提醒，关注交易员发出的回售通知');
      lines.push('');
    }
  }

  lines.push('-'.repeat(60));
  lines.push('【明细记录】');
  lines.push('-'.repeat(60));
  settlement.details.forEach((detail, index) => {
    const statusIcon = getStatusIcon(detail.status);
    const dateStr = detail.date ? format(detail.date, 'yyyy-MM-dd') : '';
    const amountStr = detail.amount ? `${(detail.amount / 10000).toFixed(2)}万元` : '';
    lines.push(`${String(index + 1).padStart(2, '0')}. ${statusIcon} ${detail.nodeName.padEnd(20)} ${dateStr.padEnd(12)} ${amountStr}`);
  });

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('                   报告结束');
  lines.push('='.repeat(60));

  return lines.join('\n');
};

const getErrorTypeName = (type: string): string => {
  const map: Record<string, string> = {
    coupon_deferral_missed: '票息顺延未识别',
    put_option_missed: '回售选择权漏选',
    default_misjudged: '违约误判',
    coupon_amount_wrong: '票息金额错误',
    timing_error: '时间判断错误'
  };
  return map[type] || type;
};

const getStatusIcon = (status: string): string => {
  const map: Record<string, string> = {
    completed: '✓',
    failed: '✗',
    pending: '○',
    active: '●',
    skipped: '→'
  };
  return map[status] || '?';
};

export const exportToPDF = (
  settlement: GameSettlement,
  bond: Bond,
  sources: SourceInfo[],
  playerName: string
): void => {
  const text = generateTextReport(settlement, bond, sources, playerName);
  const doc = new jsPDF();
  
  const lines = text.split('\n');
  let y = 20;
  
  lines.forEach((line, index) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.text(line, 15, y);
    y += 7;
  });

  doc.save(`债券现金流复盘报告_${format(settlement.completedAt, 'yyyyMMdd')}.pdf`);
};

export const exportToExcel = (
  settlement: GameSettlement,
  bond: Bond
): void => {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['项目', '值'],
    ['债券名称', bond.name],
    ['债券代码', bond.code],
    ['票息总站数', settlement.totalCoupons],
    ['成功通过', settlement.paidCoupons],
    ['顺延处理', settlement.deferredCoupons],
    ['回售选择', settlement.putExercised ? '已行使' : '未行使'],
    ['违约事件', settlement.defaultEvents],
    ['最终现金流(万元)', (settlement.finalAmount / 10000).toFixed(2)]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '结算汇总');

  const detailsData = [
    ['序号', '节点名称', '状态', '日期', '金额(万元)', '错误信息']
  ];
  settlement.details.forEach((detail, index) => {
    detailsData.push([
      index + 1,
      detail.nodeName,
      detail.status,
      detail.date ? format(detail.date, 'yyyy-MM-dd') : '',
      detail.amount ? (detail.amount / 10000).toFixed(2) : '',
      detail.error?.message || ''
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(detailsData);
  XLSX.utils.book_append_sheet(wb, ws2, '明细记录');

  if (settlement.errors.length > 0) {
    const errorsData = [
      ['序号', '错误类型', '触发者', '问题描述', '卡点', '下一步动作']
    ];
    settlement.errors.forEach((error, index) => {
      errorsData.push([
        index + 1,
        getErrorTypeName(error.type),
        error.triggeredBy,
        error.message,
        error.blockedStep,
        error.nextAction
      ]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(errorsData);
    XLSX.utils.book_append_sheet(wb, ws3, '错误分析');
  }

  XLSX.writeFile(wb, `债券现金流复盘报告_${format(settlement.completedAt, 'yyyyMMdd')}.xlsx`);
};

export const exportToTextFile = (
  settlement: GameSettlement,
  bond: Bond,
  sources: SourceInfo[],
  playerName: string
): void => {
  const text = generateTextReport(settlement, bond, sources, playerName);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `债券现金流复盘报告_${format(settlement.completedAt, 'yyyyMMdd')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};
