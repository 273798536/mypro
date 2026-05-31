const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3200;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function genId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
}

function addHistory(data, entityType, entityId, field, oldValue, newValue, reason, operator, cascadedEffects) {
  data.amendmentHistory.push({
    id: genId('AH'),
    entityType, entityId, field, oldValue, newValue, reason, operator,
    timestamp: new Date().toISOString(),
    cascadedEffects: cascadedEffects || []
  });
}

app.get('/api/contracts', (req, res) => {
  const data = readData();
  res.json(data.contracts);
});

app.get('/api/contracts/:id', (req, res) => {
  const data = readData();
  const c = data.contracts.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: '合同不存在' });
  res.json(c);
});

app.get('/api/production-reports', (req, res) => {
  const data = readData();
  let reports = data.productionReports;
  if (req.query.contractId) reports = reports.filter(r => r.contractId === req.query.contractId);
  res.json(reports);
});

app.get('/api/production-reports/:id', (req, res) => {
  const data = readData();
  const r = data.productionReports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: '产量报表不存在' });
  res.json(r);
});

app.get('/api/production-supplements', (req, res) => {
  const data = readData();
  let list = data.productionSupplements;
  if (req.query.contractId) list = list.filter(s => s.contractId === req.query.contractId);
  if (req.query.status) list = list.filter(s => s.status === req.query.status);
  res.json(list);
});

app.get('/api/production-supplements/:id', (req, res) => {
  const data = readData();
  const s = data.productionSupplements.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: '产量补录不存在' });
  res.json(s);
});

app.put('/api/production-supplements/:id/override', (req, res) => {
  const data = readData();
  const idx = data.productionSupplements.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '产量补录不存在' });

  const sup = data.productionSupplements[idx];
  const oldStatus = sup.status;
  if (sup.status === 'overridden') return res.status(400).json({ error: '该补录已被改判' });

  const { overrideReason, operator } = req.body;
  if (!overrideReason) return res.status(400).json({ error: '改判理由必填' });

  sup.status = 'overridden';
  sup.overriddenBy = operator || '未知';
  sup.overriddenAt = new Date().toISOString();
  sup.overrideReason = overrideReason;

  const cascadedEffects = [];

  const mf = data.marginFreezes.find(m => m.supplementId === sup.id);
  if (mf) {
    const oldFlag = mf.flaggedByOverride;
    mf.flaggedByOverride = true;
    if (!oldFlag) {
      cascadedEffects.push(`${mf.id} flaggedByOverride→true`);
    }
  }

  const da = data.deferredAllocations.find(d => d.supplementId === sup.id);
  if (da) {
    const diff = Math.abs(sup.originalOutput - sup.supplementedOutput) * 0;
    const contract = data.contracts.find(c => c.id === sup.contractId);
    const report = data.productionReports.find(r => r.id === sup.reportId);
    if (contract && report) {
      const newDeferred = Math.round(Math.abs(sup.originalOutput - sup.supplementedOutput) * report.unitPrice * contract.royaltyRate);
      const oldDeferred = da.deferredAmount;
      const oldRetro = da.ratioRetroFlag;

      da.deferredAmount = newDeferred;
      da.marginImpact = newDeferred;
      da.status = 'deferred';
      da.ratioRetroFlag = true;

      da.adjustments.push({
        type: 'supplement_override',
        field: 'deferredAmount',
        before: oldDeferred,
        after: newDeferred,
        reason: `产量补录改判：${overrideReason}`,
        operator: operator || '未知',
        timestamp: new Date().toISOString()
      });

      cascadedEffects.push(`${da.id} deferredAmount: ${oldDeferred}→${newDeferred}`);
      if (!oldRetro) cascadedEffects.push(`${da.id} ratioRetroFlag→true`);

      addHistory(data, 'deferredAllocation', da.id, 'deferredAmount',
        String(oldDeferred), String(newDeferred),
        `产量补录改判联动：${overrideReason}`, operator || '未知',
        []);
    }
  }

  addHistory(data, 'productionSupplement', sup.id, 'status',
    oldStatus, 'overridden', overrideReason, operator || '未知', cascadedEffects);

  writeData(data);
  res.json({ supplement: sup, cascadedEffects });
});

app.get('/api/margin-freezes', (req, res) => {
  const data = readData();
  let list = data.marginFreezes;
  if (req.query.contractId) list = list.filter(m => m.contractId === req.query.contractId);
  if (req.query.status) list = list.filter(m => m.status === req.query.status);
  res.json(list);
});

app.get('/api/margin-freezes/:id', (req, res) => {
  const data = readData();
  const m = data.marginFreezes.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: '保证金冻结不存在' });
  res.json(m);
});

app.put('/api/margin-freezes/:id/correct', (req, res) => {
  const data = readData();
  const idx = data.marginFreezes.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '保证金冻结不存在' });

  const mf = data.marginFreezes[idx];
  const { newAmount, reason, operator } = req.body;
  if (newAmount == null) return res.status(400).json({ error: '修正金额必填' });

  const oldAmount = mf.amount;
  mf.amount = newAmount;

  const cascadedEffects = [];

  const da = data.deferredAllocations.find(d => d.marginFreezeId === mf.id);
  if (da) {
    const oldDeferred = da.deferredAmount;
    const oldMargin = da.marginImpact;
    da.marginImpact = newAmount;
    if (da.deferredAmount !== newAmount) {
      da.deferredAmount = newAmount;
    }
    da.adjustments.push({
      type: 'margin_correction',
      field: 'marginImpact',
      before: oldMargin,
      after: newAmount,
      reason: `保证金修正联动：${reason}`,
      operator: operator || '未知',
      timestamp: new Date().toISOString()
    });
    if (oldDeferred !== newAmount) {
      da.adjustments.push({
        type: 'margin_correction',
        field: 'deferredAmount',
        before: oldDeferred,
        after: newAmount,
        reason: `保证金修正联动：${reason}`,
        operator: operator || '未知',
        timestamp: new Date().toISOString()
      });
    }
    cascadedEffects.push(`${da.id} marginImpact: ${oldMargin}→${newAmount}`);
    if (oldDeferred !== newAmount) {
      cascadedEffects.push(`${da.id} deferredAmount: ${oldDeferred}→${newAmount}`);
    }
  }

  addHistory(data, 'marginFreeze', mf.id, 'amount',
    String(oldAmount), String(newAmount), reason, operator || '未知', cascadedEffects);

  writeData(data);
  res.json({ marginFreeze: mf, cascadedEffects });
});

app.put('/api/margin-freezes/:id/release', (req, res) => {
  const data = readData();
  const idx = data.marginFreezes.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '保证金冻结不存在' });

  const mf = data.marginFreezes[idx];
  const oldStatus = mf.status;
  mf.status = 'released';
  mf.releasedAt = new Date().toISOString();

  const { reason, operator } = req.body;

  addHistory(data, 'marginFreeze', mf.id, 'status',
    oldStatus, 'released', reason || '保证金释放', operator || '未知', []);

  writeData(data);
  res.json(mf);
});

app.get('/api/deferred-allocations', (req, res) => {
  const data = readData();
  let list = data.deferredAllocations;
  if (req.query.contractId) list = list.filter(d => d.contractId === req.query.contractId);
  if (req.query.status) list = list.filter(d => d.status === req.query.status);
  res.json(list);
});

app.get('/api/deferred-allocations/:id', (req, res) => {
  const data = readData();
  const d = data.deferredAllocations.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: '递延分配不存在' });

  const enriched = { ...d };
  enriched.contract = data.contracts.find(c => c.id === d.contractId) || null;
  enriched.productionReport = d.supplementId
    ? (data.productionSupplements.find(s => s.id === d.supplementId)
      ? data.productionReports.find(r => r.id === data.productionSupplements.find(s => s.id === d.supplementId).reportId)
      : null)
    : (data.productionReports.find(r => r.contractId === d.contractId && r.period === d.period) || null);
  enriched.supplement = d.supplementId ? (data.productionSupplements.find(s => s.id === d.supplementId) || null) : null;
  enriched.marginFreeze = d.marginFreezeId ? (data.marginFreezes.find(m => m.id === d.marginFreezeId) || null) : null;

  res.json(enriched);
});

app.get('/api/amendment-history', (req, res) => {
  const data = readData();
  let list = data.amendmentHistory;
  if (req.query.entityType) list = list.filter(h => h.entityType === req.query.entityType);
  if (req.query.entityId) list = list.filter(h => h.entityId === req.query.entityId);
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(list);
});

app.get('/api/summary', (req, res) => {
  const data = readData();
  const totalGross = data.deferredAllocations.reduce((s, d) => s + d.grossRevenue, 0);
  const totalAllocation = data.deferredAllocations.reduce((s, d) => s + d.allocationAmount, 0);
  const totalDeferred = data.deferredAllocations.reduce((s, d) => s + d.deferredAmount, 0);
  const totalMarginFrozen = data.marginFreezes.filter(m => m.status === 'frozen').reduce((s, m) => s + m.amount, 0);
  const pendingSupplements = data.productionSupplements.filter(s => s.status === 'pending').length;
  const overriddenSupplements = data.productionSupplements.filter(s => s.status === 'overridden').length;
  const retroFlags = data.deferredAllocations.filter(d => d.ratioRetroFlag).length;

  res.json({
    totalGrossRevenue: totalGross,
    totalAllocationAmount: totalAllocation,
    totalDeferredAmount: totalDeferred,
    totalMarginFrozen,
    pendingSupplements,
    overriddenSupplements,
    retroFlagCount: retroFlags,
    contractCount: data.contracts.length,
    deferredCount: data.deferredAllocations.filter(d => d.status === 'deferred').length,
    settledCount: data.deferredAllocations.filter(d => d.status === 'settled').length
  });
});

app.get('/api/export', (req, res) => {
  const data = readData();
  const format = req.query.format || 'json';
  const type = req.query.type || 'allocations';

  let exportData;
  if (type === 'allocations') {
    exportData = data.deferredAllocations.map(d => {
      const contract = data.contracts.find(c => c.id === d.contractId);
      const supplement = d.supplementId ? data.productionSupplements.find(s => s.id === d.supplementId) : null;
      const report = supplement ? data.productionReports.find(r => r.id === supplement.reportId) : null;
      const mf = d.marginFreezeId ? data.marginFreezes.find(m => m.id === d.marginFreezeId) : null;
      return {
        分配编号: d.id,
        合同编号: d.contractId,
        合同名称: contract ? contract.name : '',
        合作方: contract ? contract.partner : '',
        期间: d.period,
        总收入: d.grossRevenue,
        分成比例: d.royaltyRate,
        分配金额: d.allocationAmount,
        递延金额: d.deferredAmount,
        保证金影响: d.marginImpact,
        产量补录编号: d.supplementId || '',
        产量补录状态: supplement ? supplement.status : '',
        保证金冻结编号: d.marginFreezeId || '',
        保证金冻结状态: mf ? mf.status : '',
        比例追溯标记: d.ratioRetroFlag ? '是' : '否',
        分配状态: d.status,
        调整记录数: d.adjustments.length
      };
    });
  } else if (type === 'history') {
    exportData = data.amendmentHistory.map(h => ({
      记录编号: h.id,
      实体类型: h.entityType,
      实体编号: h.entityId,
      变更字段: h.field,
      变更前: h.oldValue,
      变更后: h.newValue,
      变更原因: h.reason,
      操作人: h.operator,
      时间: h.timestamp,
      级联影响: (h.cascadedEffects || []).join('; ')
    }));
  }

  if (format === 'csv') {
    if (!exportData || exportData.length === 0) return res.status(400).json({ error: '无数据可导出' });
    const headers = Object.keys(exportData[0]);
    const csvRows = [headers.join(',')];
    for (const row of exportData) {
      csvRows.push(headers.map(h => {
        const val = String(row[h] ?? '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=mining-deferred-${type}-${Date.now()}.csv`);
    return res.send('\uFEFF' + csvRows.join('\n'));
  }

  res.json(exportData);
});

app.listen(PORT, () => {
  console.log(`矿权收益递延分配工作台已启动: http://localhost:${PORT}`);
});
