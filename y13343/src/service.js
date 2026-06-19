const {
  STATUS,
  loadRecords,
  saveRecords,
  loadExceptions,
  saveExceptions,
  loadMetadata,
  saveMetadata,
  addHistoryEntry,
  getHistoryByRecordId
} = require('./storage');

const CONFIDENCE_THRESHOLD = 0.75;
const DRIFT_THRESHOLD = 0.15;
const MODEL_VERSION = 'v2.3.1';
const OLD_MODEL_VERSION = 'v1.8.0';

function detectDrift(oldConfidence, newConfidence) {
  const absDiff = Math.abs(newConfidence - oldConfidence);
  const direction = newConfidence > oldConfidence ? 'up' : (newConfidence < oldConfidence ? 'down' : 'flat');
  return {
    drifted: absDiff >= DRIFT_THRESHOLD,
    diff: absDiff,
    direction
  };
}

function needsManualConfirm(record) {
  const reasons = [];
  const nextSteps = [];

  if (record.confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(`置信度过低：当前 ${(record.confidence * 100).toFixed(1)}% < 阈值 ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
    nextSteps.push('人工核对排班规则与实际考勤，确认推荐是否合理');
  }

  if (record.oldConfidence !== undefined && record.oldConfidence !== null) {
    const drift = detectDrift(record.oldConfidence, record.confidence);
    if (drift.drifted) {
      const dirText = drift.direction === 'up' ? '上升' : '下降';
      reasons.push(`阈值漂移：置信度较旧模型${dirText} ${(drift.diff * 100).toFixed(1)}%（旧 ${(record.oldConfidence * 100).toFixed(1)}% → 新 ${(record.confidence * 100).toFixed(1)}%）`);
      nextSteps.push('核查特征是否发生变化，确认漂移是否合理');
    }
  }

  if (record.hasLateAttachment) {
    reasons.push('存在晚到附件：该记录关联的考勤/打卡数据滞后送达，推荐结果可能缺失关键信息');
    nextSteps.push('等待附件齐全后重跑推荐，或结合附件人工判断');
  }

  if (record.recommendationChanged) {
    reasons.push('推荐结果变更：与旧模型推荐结论不一致');
    nextSteps.push('对比新旧模型特征权重，确认改判是否符合预期');
  }

  return {
    needed: reasons.length > 0,
    reasons,
    nextSteps,
    threshold: CONFIDENCE_THRESHOLD,
    driftThreshold: DRIFT_THRESHOLD
  };
}

function explainReclassification(record) {
  if (!record.oldRecommendation || !record.newRecommendation || record.oldRecommendation === record.newRecommendation) {
    return { changed: false };
  }

  const explanations = [];
  const featureDiffs = [];

  if (record.featureDiffs) {
    for (const f of record.featureDiffs) {
      featureDiffs.push(f);
      if (f.impact && f.impact !== 'neutral') {
        const impactText = f.impact === 'positive' ? '拉高' : '拉低';
        explanations.push(`特征「${f.name}」从 ${f.oldValue} → ${f.newValue}，${impactText}推荐置信度约 ${(f.weight * 100).toFixed(1)}%`);
      }
    }
  }

  if (record.oldConfidence !== undefined && record.confidence !== undefined) {
    const delta = record.confidence - record.oldConfidence;
    explanations.push(`整体置信度变化：${(record.oldConfidence * 100).toFixed(1)}% → ${(record.confidence * 100).toFixed(1)}%（${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%）`);
  }

  if (explanations.length === 0) {
    explanations.push(`模型版本升级 ${OLD_MODEL_VERSION} → ${MODEL_VERSION}，决策边界调整导致结论变更`);
  }

  return {
    changed: true,
    oldRecommendation: record.oldRecommendation,
    newRecommendation: record.newRecommendation,
    oldModelVersion: OLD_MODEL_VERSION,
    newModelVersion: MODEL_VERSION,
    featureDiffs,
    explanations,
    summary: `旧模型推荐「${record.oldRecommendation.label}」，新模型改判为「${record.newRecommendation.label}」，共 ${featureDiffs.length} 项特征发生变化`
  };
}

function importBatch(batchData, operator = 'system') {
  const records = loadRecords();
  const exceptions = loadExceptions();
  const meta = loadMetadata();

  const batchId = `batch_${Date.now()}`;
  const importedAt = new Date().toISOString();
  const importResult = { batchId, importedAt, total: 0, success: 0, failed: 0, exceptionCount: 0 };

  const items = Array.isArray(batchData) ? batchData : (batchData.records || []);
  importResult.total = items.length;

  for (const item of items) {
    try {
      const recordId = item.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const existingIdx = records.findIndex(r => r.id === recordId);

      const confirmInfo = needsManualConfirm(item);

      const record = {
        id: recordId,
        batchId,
        importedAt,
        employeeId: item.employeeId,
        employeeName: item.employeeName || item.employeeId,
        date: item.date,
        shiftType: item.shiftType || '日班',
        oldRecommendation: item.oldRecommendation || null,
        newRecommendation: item.newRecommendation || item.recommendation || null,
        recommendation: item.newRecommendation || item.recommendation || null,
        recommendationChanged: !!(item.oldRecommendation && item.newRecommendation &&
          JSON.stringify(item.oldRecommendation) !== JSON.stringify(item.newRecommendation)),
        oldConfidence: item.oldConfidence,
        confidence: item.confidence ?? item.newConfidence ?? 0.5,
        features: item.features || {},
        featureDiffs: item.featureDiffs || [],
        hasLateAttachment: !!item.hasLateAttachment,
        attachments: item.attachments || [],
        status: STATUS.PENDING,
        currentRemark: item.remark || '',
        needsManualConfirm: confirmInfo.needed,
        confirmReasons: confirmInfo.reasons,
        confirmNextSteps: confirmInfo.nextSteps,
        confirmedBy: null,
        confirmedAt: null,
        withdrawnBy: null,
        withdrawnAt: null,
        modelVersion: MODEL_VERSION,
        _version: (existingIdx >= 0 ? (records[existingIdx]._version || 0) : 0) + 1
      };

      if (item.hasLateAttachment) {
        exceptions.push({
          id: `exc_${recordId}_${Date.now()}`,
          recordId,
          type: 'late_attachment',
          severity: 'warning',
          message: `员工 ${record.employeeName} ${record.date} 存在晚到附件，推荐结论待附件齐全后复核`,
          attachments: item.attachments || [],
          createdAt: importedAt,
          resolved: false
        });
        importResult.exceptionCount++;
        record.status = STATUS.EXCEPTION;
      }

      if (existingIdx >= 0) {
        const existing = records[existingIdx];
        const oldStatus = existing.status;
        const oldVersion = existing._version || 0;
        record._version = oldVersion + 1;

        if (oldStatus === STATUS.CONFIRMED) {
          record.status = STATUS.CONFIRMED;
          record.confirmedBy = existing.confirmedBy;
          record.confirmedAt = existing.confirmedAt;
          if (existing.currentRemark && !record.currentRemark) {
            record.currentRemark = existing.currentRemark;
          }
          addHistoryEntry(recordId, 'update_import_preserve', operator,
            `批次 ${batchId} 重新导入 · 保留已确认状态不被覆盖（版本 v${oldVersion} → v${record._version}）`,
            { oldStatus, newStatus: STATUS.CONFIRMED, preservedConfirm: true });
        } else if (oldStatus === STATUS.WITHDRAWN) {
          record.status = STATUS.WITHDRAWN;
          record.withdrawnBy = existing.withdrawnBy;
          record.withdrawnAt = existing.withdrawnAt;
          if (existing.currentRemark && !record.currentRemark) {
            record.currentRemark = existing.currentRemark;
          }
          addHistoryEntry(recordId, 'update_import_preserve', operator,
            `批次 ${batchId} 重新导入 · 保留已撤回状态不被覆盖（版本 v${oldVersion} → v${record._version}）`,
            { oldStatus, newStatus: STATUS.WITHDRAWN, preservedWithdraw: true });
        } else {
          addHistoryEntry(recordId, 'update_import', operator,
            `批次 ${batchId} 重新导入覆盖（版本 v${oldVersion} → v${record._version}）`,
            { oldStatus, newStatus: record.status });
        }

        records[existingIdx] = record;
      } else {
        record._version = 1;
        addHistoryEntry(recordId, 'import', operator, `批次 ${batchId} 首次导入`, {});
        records.push(record);
      }
      importResult.success++;
    } catch (e) {
      importResult.failed++;
      exceptions.push({
        id: `exc_import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        recordId: item.id || null,
        type: 'import_error',
        severity: 'error',
        message: `导入失败：${e.message}`,
        raw: JSON.stringify(item).slice(0, 500),
        createdAt: importedAt,
        resolved: false
      });
    }
  }

  saveRecords(records);
  saveExceptions(exceptions);
  meta.importBatches.push({
    id: batchId,
    importedAt,
    operator,
    total: importResult.total,
    success: importResult.success,
    failed: importResult.failed
  });
  saveMetadata(meta);

  return importResult;
}

function confirmRecord(recordId, operator, remark = '') {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx < 0) {
    throw new Error(`记录 ${recordId} 不存在`);
  }
  const record = records[idx];
  const oldStatus = record.status;

  record.status = STATUS.CONFIRMED;
  record.confirmedBy = operator;
  record.confirmedAt = new Date().toISOString();
  if (remark) {
    record.currentRemark = remark;
  }
  record._version = (record._version || 0) + 1;

  records[idx] = record;
  saveRecords(records);

  addHistoryEntry(recordId, 'confirm', operator, remark || '人工确认通过', {
    oldStatus,
    newStatus: STATUS.CONFIRMED
  });

  return record;
}

function withdrawRecord(recordId, operator, remark = '') {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx < 0) {
    throw new Error(`记录 ${recordId} 不存在`);
  }
  const record = records[idx];
  const oldStatus = record.status;

  record.status = STATUS.WITHDRAWN;
  record.withdrawnBy = operator;
  record.withdrawnAt = new Date().toISOString();
  if (remark) {
    record.currentRemark = remark;
  }
  record._version = (record._version || 0) + 1;

  records[idx] = record;
  saveRecords(records);

  addHistoryEntry(recordId, 'withdraw', operator, remark || '撤回确认', {
    oldStatus,
    newStatus: STATUS.WITHDRAWN
  });

  return record;
}

function updateRemark(recordId, operator, remark) {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx < 0) {
    throw new Error(`记录 ${recordId} 不存在`);
  }
  const oldRemark = records[idx].currentRemark;
  records[idx].currentRemark = remark;
  records[idx]._version = (records[idx]._version || 0) + 1;
  saveRecords(records);

  addHistoryEntry(recordId, 'update_remark', operator, '更新备注', {
    oldRemark,
    newRemark: remark
  });

  return records[idx];
}

function getAllRecords(filters = {}) {
  let records = loadRecords();
  if (filters.status) {
    records = records.filter(r => r.status === filters.status);
  }
  if (filters.batchId) {
    records = records.filter(r => r.batchId === filters.batchId);
  }
  if (filters.needsConfirm) {
    records = records.filter(r => r.needsManualConfirm);
  }
  return records;
}

function getRecordDetail(recordId) {
  const records = loadRecords();
  const record = records.find(r => r.id === recordId);
  if (!record) return null;
  const history = getHistoryByRecordId(recordId);
  const exceptions = loadExceptions().filter(e => e.recordId === recordId);
  const reclassification = explainReclassification(record);
  return {
    record,
    history,
    exceptions,
    reclassification
  };
}

function getExceptions(resolved) {
  let exc = loadExceptions();
  if (resolved !== undefined) {
    exc = exc.filter(e => e.resolved === !!resolved);
  }
  return exc;
}

function resolveException(exceptionId, operator, remark = '') {
  const exceptions = loadExceptions();
  const idx = exceptions.findIndex(e => e.id === exceptionId);
  if (idx < 0) {
    throw new Error(`异常 ${exceptionId} 不存在`);
  }
  exceptions[idx].resolved = true;
  exceptions[idx].resolvedBy = operator;
  exceptions[idx].resolvedAt = new Date().toISOString();
  exceptions[idx].resolveRemark = remark;
  saveExceptions(exceptions);

  const records = loadRecords();
  const ridx = records.findIndex(r => r.id === exceptions[idx].recordId);
  if (ridx >= 0 && records[ridx].status === STATUS.EXCEPTION) {
    records[ridx].status = STATUS.PENDING;
    records[ridx]._version = (records[ridx]._version || 0) + 1;
    saveRecords(records);
    addHistoryEntry(records[ridx].id, 'exception_resolved', operator, remark || `异常已处理: ${exceptionId}`, {
      exceptionId,
      oldStatus: STATUS.EXCEPTION,
      newStatus: STATUS.PENDING
    });
  }

  return exceptions[idx];
}

function getStatistics() {
  const records = loadRecords();
  const exceptions = loadExceptions();
  const meta = loadMetadata();
  const counts = {
    total: records.length,
    pending: 0,
    confirmed: 0,
    withdrawn: 0,
    exception: 0,
    needsManualConfirm: 0
  };
  for (const r of records) {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.needsManualConfirm) counts.needsManualConfirm++;
  }
  return {
    counts,
    exceptionCount: {
      total: exceptions.length,
      unresolved: exceptions.filter(e => !e.resolved).length
    },
    batchCount: meta.importBatches.length,
    lastModified: meta.lastModified,
    modelVersion: MODEL_VERSION,
    oldModelVersion: OLD_MODEL_VERSION,
    thresholds: {
      confidence: CONFIDENCE_THRESHOLD,
      drift: DRIFT_THRESHOLD
    }
  };
}

function checkConsistency() {
  const records = loadRecords();
  const exceptions = loadExceptions();
  const history = loadHistory();
  const issues = [];

  const recordIds = new Set(records.map(r => r.id));
  for (const e of exceptions) {
    if (e.recordId && !recordIds.has(e.recordId)) {
      issues.push(`异常 ${e.id} 关联记录 ${e.recordId} 不存在`);
    }
  }

  for (const h of history) {
    if (h.recordId && !recordIds.has(h.recordId)) {
      issues.push(`历史 ${h.id} 关联记录 ${h.recordId} 不存在（软引用可接受，仅提示）`);
    }
  }

  for (const r of records) {
    const hist = history.filter(h => h.recordId === r.id);
    if (r.status === STATUS.CONFIRMED && !hist.some(h => h.action === 'confirm')) {
      issues.push(`记录 ${r.id} 状态为 confirmed 但无 confirm 历史`);
    }
    if (r.status === STATUS.WITHDRAWN && !hist.some(h => h.action === 'withdraw')) {
      issues.push(`记录 ${r.id} 状态为 withdrawn 但无 withdraw 历史`);
    }
    if (r.status === STATUS.CONFIRMED && !r.confirmedAt) {
      issues.push(`记录 ${r.id} 已确认但缺少 confirmedAt`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    counts: {
      records: records.length,
      exceptions: exceptions.length,
      history: history.length
    }
  };
}

module.exports = {
  STATUS,
  CONFIDENCE_THRESHOLD,
  DRIFT_THRESHOLD,
  MODEL_VERSION,
  OLD_MODEL_VERSION,
  detectDrift,
  needsManualConfirm,
  explainReclassification,
  importBatch,
  confirmRecord,
  withdrawRecord,
  updateRemark,
  getAllRecords,
  getRecordDetail,
  getExceptions,
  resolveException,
  getStatistics,
  checkConsistency
};
