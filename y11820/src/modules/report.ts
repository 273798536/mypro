import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { MonthlyReport, AnomalyRecord } from '../types';
import { detectCrossChainDuplicates, detectInternalTransferMiscount } from './transfer';
import { detectPriceGaps } from './price';
import { computeTotalGasUsd } from './gas';
import { computeExchangeBalance } from './exchange';
import { computeWalletSnapshotHash } from './wallet';
import { AnomalyType } from '../types';

const router = Router();

router.post('/generate', (req: Request, res: Response) => {
  const { report_month } = req.body;
  if (!report_month || !/^\d{4}-\d{2}$/.test(report_month)) {
    return res.status(400).json({ error: 'report_month 格式: YYYY-MM' });
  }
  const db = getDb();

  const startDate = `${report_month}-01`;
  const endDate = `${report_month}-31`;

  const transaction = db.transaction(() => {
    const anomalies: { type: AnomalyType; items: any[] }[] = [];

    const miscounts = detectInternalTransferMiscount(db);
    if (miscounts.length > 0) {
      anomalies.push({ type: 'internal_transfer_miscount', items: miscounts });
    }

    const crossChain = detectCrossChainDuplicates(db);
    if (crossChain.length > 0) {
      anomalies.push({ type: 'cross_chain_duplicate', items: crossChain });
    }

    const priceGaps = detectPriceGaps(db, startDate, endDate);
    if (priceGaps.length > 0) {
      anomalies.push({ type: 'price_gap', items: priceGaps });
    }

    const anomalyFlags = anomalies.map(a => a.type);
    const hasAnomaly = anomalyFlags.length > 0;
    const branchType = hasAnomaly ? 'anomaly_branch' : 'normal';

    const totalGasUsd = computeTotalGasUsd(db, startDate, endDate);
    const exchangeBalances = computeExchangeBalance(db);
    const walletHash = computeWalletSnapshotHash();

    let totalAssetsUsd = 0;
    for (const bal of exchangeBalances) {
      const priceRow = db.prepare(
        'SELECT price_usd FROM price_snapshots WHERE token_symbol = ? AND snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1'
      ).get(bal.asset_symbol, endDate) as { price_usd: string } | undefined;
      const price = priceRow ? parseFloat(priceRow.price_usd) : 0;
      totalAssetsUsd += bal.net_balance * price;
    }

    const totalIncomeUsd = 0;

    const summary = buildSummary(anomalies, totalAssetsUsd, totalGasUsd, report_month);

    const existing = db.prepare('SELECT id FROM monthly_reports WHERE report_month = ?').get(report_month) as { id: number } | undefined;

    let reportId: number;
    if (existing) {
      db.prepare(
        'DELETE FROM anomaly_records WHERE report_id = ?'
      ).run(existing.id);
      db.prepare(`
        UPDATE monthly_reports SET total_assets_usd = ?, total_gas_usd = ?, total_income_usd = ?,
          anomaly_flags = ?, branch_type = ?, summary = ?, wallet_snapshot_hash = ?
        WHERE report_month = ?
      `).run(
        String(totalAssetsUsd.toFixed(2)), String(totalGasUsd.toFixed(2)), String(totalIncomeUsd.toFixed(2)),
        JSON.stringify(anomalyFlags), branchType, summary, walletHash, report_month
      );
      reportId = existing.id;
    } else {
      const info = db.prepare(`
        INSERT INTO monthly_reports (report_month, total_assets_usd, total_gas_usd, total_income_usd, anomaly_flags, branch_type, summary, wallet_snapshot_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        report_month, String(totalAssetsUsd.toFixed(2)), String(totalGasUsd.toFixed(2)), String(totalIncomeUsd.toFixed(2)),
        JSON.stringify(anomalyFlags), branchType, summary, walletHash
      );
      reportId = Number(info.lastInsertRowid);
    }

    for (const anomaly of anomalies) {
      const severity = anomaly.type === 'price_gap' ? 'info' : anomaly.type === 'internal_transfer_miscount' ? 'critical' : 'warning';
      db.prepare(
        'INSERT INTO anomaly_records (report_id, anomaly_type, description, related_ids, severity) VALUES (?, ?, ?, ?, ?)'
      ).run(
        reportId,
        anomaly.type,
        `${anomaly.type}: 发现 ${anomaly.items.length} 条异常`,
        JSON.stringify(anomaly.items.map((item: any) => item.id_a ?? item.transfer_ids ?? item.token).flat()),
        severity
      );
    }

    const report = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(reportId) as MonthlyReport;
    const anomalyRecords = db.prepare('SELECT * FROM anomaly_records WHERE report_id = ?').all(reportId) as AnomalyRecord[];

    return { report, anomaly_records: anomalyRecords, anomalies_detail: anomalies };
  });

  try {
    const result = transaction();
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const reports = db.prepare('SELECT * FROM monthly_reports ORDER BY report_month DESC').all() as MonthlyReport[];
  res.json(reports);
});

router.get('/:month', (req: Request, res: Response) => {
  const db = getDb();
  const report = db.prepare('SELECT * FROM monthly_reports WHERE report_month = ?').get(req.params.month) as MonthlyReport | undefined;
  if (!report) return res.status(404).json({ error: '月报未找到' });
  const anomalyRecords = db.prepare('SELECT * FROM anomaly_records WHERE report_id = ?').all(report.id) as AnomalyRecord[];
  res.json({ report, anomaly_records: anomalyRecords });
});

router.get('/:month/conclusion-changes', (req: Request, res: Response) => {
  const db = getDb();
  const report = db.prepare('SELECT * FROM monthly_reports WHERE report_month = ?').get(req.params.month) as MonthlyReport | undefined;
  if (!report) return res.status(404).json({ error: '月报未找到' });
  const changes = db.prepare(
    "SELECT * FROM wallet_conclusion_changes WHERE created_at >= ? AND created_at <= ? ORDER BY created_at"
  ).all(`${req.params.month}-01`, `${req.params.month}-31`) as any[];
  res.json({
    report_month: req.params.month,
    wallet_snapshot_hash: report.wallet_snapshot_hash,
    conclusion_changes: changes,
    total_changes: changes.length
  });
});

router.delete('/:month', (req: Request, res: Response) => {
  const db = getDb();
  const report = db.prepare('SELECT * FROM monthly_reports WHERE report_month = ?').get(req.params.month) as MonthlyReport | undefined;
  if (!report) return res.status(404).json({ error: '月报未找到' });
  db.prepare('DELETE FROM anomaly_records WHERE report_id = ?').run(report.id);
  db.prepare('DELETE FROM monthly_reports WHERE id = ?').run(report.id);
  res.status(204).send();
});

router.patch('/anomaly/:id/resolve', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM anomaly_records WHERE id = ?').get(req.params.id) as AnomalyRecord | undefined;
  if (!existing) return res.status(404).json({ error: '异常记录未找到' });
  db.prepare('UPDATE anomaly_records SET resolved = 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM anomaly_records WHERE id = ?').get(req.params.id) as AnomalyRecord;
  res.json(updated);
});

function buildSummary(anomalies: { type: AnomalyType; items: any[] }[], totalAssets: number, totalGas: number, month: string): string {
  const parts: string[] = [`${month} 加密资产托管月报摘要:`];
  parts.push(`总资产估值: $${totalAssets.toFixed(2)}`);
  parts.push(`总Gas费: $${totalGas.toFixed(2)}`);

  if (anomalies.length === 0) {
    parts.push('未检测到异常，月报走正常分支。');
  } else {
    parts.push(`检测到 ${anomalies.length} 类异常，月报走异常分支:`);
    for (const a of anomalies) {
      const label = {
        internal_transfer_miscount: '内部转账误算',
        price_gap: '币价缺口',
        cross_chain_duplicate: '跨链重复'
      }[a.type] || a.type;
      parts.push(`- ${label}: ${a.items.length} 条`);
    }
    parts.push('请先处理异常后再出正式月报。');
  }

  return parts.join('\n');
}

export default router;
