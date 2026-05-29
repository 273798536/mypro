import { db } from '../db/dexie';
import { exportToCSV } from '../utils/csv';
import { formatDate, formatDateTime } from '../utils/date';
import {
  ANOMALY_LABELS,
  MATCH_STATUS_LABELS,
  LOSS_TYPE_LABELS,
  ExchangeLoss,
} from '../types';

export async function exportLossReport(
  lossesData?: ExchangeLoss[],
  startDate?: string,
  endDate?: string
): Promise<void> {
  let losses = lossesData || (await db.exchangeLosses.toArray());

  if (startDate) {
    losses = losses.filter((l) => l.calculationDate >= startDate);
  }
  if (endDate) {
    losses = losses.filter((l) => l.calculationDate <= endDate);
  }

  const matchings = await db.matchingRecords.toArray();
  const orders = await db.customerOrders.toArray();
  const statements = await db.bankStatements.toArray();
  const bills = await db.platformBills.toArray();
  const rates = await db.exchangeRates.toArray();

  const matchingMap = new Map(matchings.map((m) => [m.id, m]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const statementMap = new Map(statements.map((s) => [s.id, s]));
  const billMap = new Map(bills.map((b) => [b.id, b]));
  const rateMap = new Map(rates.map((r) => [r.id, r]));

  const exportData = losses.map((loss) => {
    const matching = matchingMap.get(loss.matchingId);
    const order = matching ? orderMap.get(matching.orderId) : undefined;
    const statement = matching ? statementMap.get(matching.statementId) : undefined;
    const bill = matching?.billId ? billMap.get(matching.billId) : undefined;
    const rate = loss.rateId ? rateMap.get(loss.rateId) : undefined;

    return {
      '汇损ID': loss.id,
      '计算日期': formatDate(loss.calculationDate),
      '订单号': order?.orderNo || '',
      '客户名称': order?.customerName || '',
      '订单币种': order?.currency || '',
      '订单金额': order?.amount || 0,
      '订单日期': order?.orderDate || '',
      '水单号': statement?.referenceNo || '',
      '到账币种': statement?.currency || '',
      '到账金额': statement?.receivedAmount || 0,
      '到账日期': statement?.transactionDate || '',
      '银行': statement?.bank || '',
      '平台': bill?.platform || '',
      '平台手续费': bill?.feeAmount || 0,
      '汇率': rate?.rate || 1,
      '汇率日期': rate?.date || '',
      '预期金额(CNY)': loss.expectedAmount.toFixed(2),
      '实际金额(CNY)': loss.actualAmount.toFixed(2),
      '汇损金额(CNY)': loss.lossAmount.toFixed(2),
      '汇损率': (loss.lossRate * 100).toFixed(2) + '%',
      '汇损类型': LOSS_TYPE_LABELS[loss.lossType],
      '异常类型': ANOMALY_LABELS[loss.anomalyType],
      '异常说明': loss.anomalyDescription,
      '匹配状态': matching ? MATCH_STATUS_LABELS[matching.status] : '',
      '匹配置信度': matching ? matching.confidence + '%' : '',
      '状态': loss.status === 'pending' ? '待确认' : loss.status === 'confirmed' ? '已确认' : loss.status === 'adjusted' ? '已调整' : '已忽略',
    };
  });

  const filename = `汇损报告_${formatDate(new Date())}`;
  exportToCSV(exportData, filename);
}

export async function exportMatchingReport(): Promise<void> {
  const matchings = await db.matchingRecords.toArray();
  const orders = await db.customerOrders.toArray();
  const statements = await db.bankStatements.toArray();
  const bills = await db.platformBills.toArray();

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const statementMap = new Map(statements.map((s) => [s.id, s]));
  const billMap = new Map(bills.map((b) => [b.id, b]));

  const exportData = matchings.map((matching) => {
    const order = orderMap.get(matching.orderId);
    const statement = statementMap.get(matching.statementId);
    const bill = matching.billId ? billMap.get(matching.billId) : undefined;

    return {
      '匹配ID': matching.id,
      '匹配日期': formatDateTime(matching.matchedAt),
      '订单号': order?.orderNo || '',
      '客户名称': order?.customerName || '',
      '订单金额': order ? `${order.currency} ${order.amount}` : '',
      '水单号': statement?.referenceNo || '',
      '到账金额': statement ? `${statement.currency} ${statement.receivedAmount}` : '',
      '匹配金额': matching.matchedAmount,
      '平台账单': bill?.billNo || '',
      '匹配状态': MATCH_STATUS_LABELS[matching.status],
      '置信度': matching.confidence + '%',
      '是否部分到账': matching.isPartial ? '是' : '否',
    };
  });

  const filename = `匹配记录_${formatDate(new Date())}`;
  exportToCSV(exportData, filename);
}

export async function exportAllData(): Promise<void> {
  const [orders, statements, bills, rates, matchings, losses] = await Promise.all([
    db.customerOrders.toArray(),
    db.bankStatements.toArray(),
    db.platformBills.toArray(),
    db.exchangeRates.toArray(),
    db.matchingRecords.toArray(),
    db.exchangeLosses.toArray(),
  ]);

  const ordersExport = orders.map((o) => ({
    '类型': '客户订单',
    'ID': o.id,
    '订单号': o.orderNo,
    '客户名称': o.customerName,
    '币种': o.currency,
    '金额': o.amount,
    '日期': o.orderDate,
    '来源': o.source,
    '创建时间': formatDateTime(o.createdAt),
  }));

  const statementsExport = statements.map((s) => ({
    '类型': '银行水单',
    'ID': s.id,
    '水单号': s.referenceNo,
    '币种': s.currency,
    '到账金额': s.receivedAmount,
    '日期': s.transactionDate,
    '银行': s.bank,
    '付款人': s.payerInfo,
    '来源': s.source,
    '创建时间': formatDateTime(s.createdAt),
  }));

  const billsExport = bills.map((b) => ({
    '类型': '平台账单',
    'ID': b.id,
    '账单号': b.billNo,
    '平台': b.platform,
    '币种': b.currency,
    '总金额': b.grossAmount,
    '手续费': b.feeAmount,
    '净金额': b.netAmount,
    '关联订单': b.orderNo,
    '日期': b.billDate,
    '来源': b.source,
    '创建时间': formatDateTime(b.createdAt),
  }));

  const ratesExport = rates.map((r) => ({
    '类型': '汇率数据',
    'ID': r.id,
    '源币种': r.baseCurrency,
    '目标币种': r.targetCurrency,
    '汇率': r.rate,
    '日期': r.date,
    '来源': r.source,
    '创建时间': formatDateTime(r.createdAt),
    '更新时间': formatDateTime(r.updatedAt),
  }));

  const allData = [...ordersExport, ...statementsExport, ...billsExport, ...ratesExport];
  const filename = `全部数据_${formatDate(new Date())}`;
  exportToCSV(allData, filename);
}

export async function exportAuditLogs(lossId?: string): Promise<void> {
  let logs = await db.auditLogs.toArray();
  if (lossId) {
    logs = logs.filter((l) => l.lossId === lossId);
  }

  const exportData = logs.map((log) => ({
    '日志ID': log.id,
    '汇损ID': log.lossId,
    '修改字段': log.fieldName,
    '原值': log.oldValue,
    '新值': log.newValue,
    '操作人': log.operator,
    '操作时间': formatDateTime(log.operatedAt),
    '备注': log.remark,
  }));

  const filename = `审计日志_${formatDate(new Date())}`;
  exportToCSV(exportData, filename);
}
