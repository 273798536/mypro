import type { Calculation, Series, Exception, Cost, Flow, Payment } from '@/types';
import { formatCurrency, formatPercent, formatDateStr } from './format';
import { EXCEPTION_TYPE_LABELS, EXCEPTION_SEVERITY_LABELS, EXCEPTION_STATUS_LABELS, CALCULATION_STATUS_LABELS } from '@/types';

interface ExportCalculationRow {
  测算编号: string;
  剧集名称: string;
  测算周期: string;
  总成本: string;
  充值流水: string;
  渠道回款: string;
  回收率: string;
  利润: string;
  状态: string;
  版本: number;
  测算时间: string;
}

interface ExportExceptionRow {
  异常编号: string;
  关联测算: string;
  异常类型: string;
  优先级: string;
  状态: string;
  触发来源: string;
  卡点位置: string;
  下一步: string;
  创建时间: string;
  解决时间: string;
}

interface ExportSeriesRow {
  剧集编号: string;
  剧集名称: string;
  集数: number;
  制作成本: string;
  授权方: string;
  状态: string;
  创建时间: string;
  更新时间: string;
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );
  
  return [headerRow, ...rows].join('\n');
}

function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCalculations(
  calculations: Calculation[],
  seriesMap: Map<string, Series>
): void {
  const rows: ExportCalculationRow[] = calculations.map(calc => {
    const series = seriesMap.get(calc.seriesId);
    return {
      测算编号: calc.id,
      剧集名称: series?.name || '未知',
      测算周期: `${formatDateStr(calc.periodStart)} 至 ${formatDateStr(calc.periodEnd)}`,
      总成本: formatCurrency(calc.totalCost),
      充值流水: formatCurrency(calc.totalFlow),
      渠道回款: formatCurrency(calc.totalPayment),
      回收率: formatPercent(calc.recoveryRate),
      利润: formatCurrency(calc.profit),
      状态: CALCULATION_STATUS_LABELS[calc.status],
      版本: calc.version,
      测算时间: formatDateStr(calc.calculatedAt, 'yyyy-MM-dd HH:mm:ss'),
    };
  });
  
  const csv = convertToCSV(rows as unknown as Record<string, unknown>[]);
  downloadCSV(csv, `测算报表_${formatDateStr(new Date().toISOString())}.csv`);
}

export function exportExceptions(
  exceptions: Exception[],
  calculationMap: Map<string, Calculation>,
  seriesMap: Map<string, Series>
): void {
  const rows: ExportExceptionRow[] = exceptions.map(exc => {
    const calc = calculationMap.get(exc.calculationId);
    const series = calc ? seriesMap.get(calc.seriesId) : undefined;
    return {
      异常编号: exc.id,
      关联测算: `${series?.name || '未知'} - ${calc?.id || '未知'}`,
      异常类型: EXCEPTION_TYPE_LABELS[exc.type],
      优先级: EXCEPTION_SEVERITY_LABELS[exc.severity],
      状态: EXCEPTION_STATUS_LABELS[exc.status],
      触发来源: exc.triggerSource,
      卡点位置: exc.blockPoint,
      下一步: exc.nextStep,
      创建时间: formatDateStr(exc.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      解决时间: exc.resolvedAt ? formatDateStr(exc.resolvedAt, 'yyyy-MM-dd HH:mm:ss') : '',
    };
  });
  
  const csv = convertToCSV(rows as unknown as Record<string, unknown>[]);
  downloadCSV(csv, `异常报表_${formatDateStr(new Date().toISOString())}.csv`);
}

export function exportSeriesDetail(
  series: Series,
  calculations: Calculation[],
  costs: Cost[],
  flows: Flow[],
  payments: Payment[]
): void {
  const seriesRow: ExportSeriesRow = {
    剧集编号: series.id,
    剧集名称: series.name,
    集数: series.episodes,
    制作成本: formatCurrency(series.productionCost),
    授权方: series.authorization,
    状态: series.status,
    创建时间: formatDateStr(series.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    更新时间: formatDateStr(series.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
  };
  
  const calcRows = calculations.map(calc => ({
    type: '测算',
    日期: `${formatDateStr(calc.periodStart)} 至 ${formatDateStr(calc.periodEnd)}`,
    渠道: '-',
    金额: formatCurrency(calc.totalPayment),
    备注: `版本${calc.version}, ${CALCULATION_STATUS_LABELS[calc.status]}`,
  }));
  
  const costRows = costs.map(cost => ({
    type: '投流消耗',
    日期: formatDateStr(cost.costDate),
    渠道: cost.channel,
    金额: formatCurrency(cost.amount),
    备注: cost.isDelayed ? '消耗延迟' : cost.remark,
  }));
  
  const flowRows = flows.map(flow => ({
    type: '充值流水',
    日期: formatDateStr(flow.flowDate),
    渠道: flow.userSource,
    金额: formatCurrency(flow.amount),
    备注: flow.orderNo,
  }));
  
  const paymentRows = payments.map(payment => ({
    type: '渠道回款',
    日期: formatDateStr(payment.paymentDate),
    渠道: payment.channel,
    金额: formatCurrency(payment.amount),
    备注: payment.isSplit ? `拆分自: ${payment.splitFrom}` : payment.remark,
  }));
  
  const allRows = [
    { type: '【剧集信息】', 日期: '', 渠道: '', 金额: '', 备注: '' },
    seriesRow as unknown as Record<string, unknown>,
    { type: '', 日期: '', 渠道: '', 金额: '', 备注: '' },
    { type: '【测算记录】', 日期: '测算周期', 渠道: '-', 金额: '回款金额', 备注: '版本/状态' },
    ...calcRows,
    { type: '', 日期: '', 渠道: '', 金额: '', 备注: '' },
    { type: '【投流消耗】', 日期: '消耗日期', 渠道: '投放渠道', 金额: '消耗金额', 备注: '备注' },
    ...costRows,
    { type: '', 日期: '', 渠道: '', 金额: '', 备注: '' },
    { type: '【充值流水】', 日期: '流水日期', 渠道: '用户来源', 金额: '充值金额', 备注: '订单号' },
    ...flowRows,
    { type: '', 日期: '', 渠道: '', 金额: '', 备注: '' },
    { type: '【渠道回款】', 日期: '回款日期', 渠道: '回款渠道', 金额: '回款金额', 备注: '备注' },
    ...paymentRows,
  ];
  
  const csv = convertToCSV(allRows as unknown as Record<string, unknown>[]);
  downloadCSV(csv, `剧集明细_${series.name}_${formatDateStr(new Date().toISOString())}.csv`);
}
