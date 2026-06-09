import type {
  CorrosionTestRecord,
  DuplicateBatchInfo,
  ConclusionStatus,
  CorrosionRating
} from '../types';
import { RATING_DESCRIPTIONS, STATUS_LABELS } from '../types';

export function findDuplicateBatches(records: CorrosionTestRecord[]): DuplicateBatchInfo[] {
  const batchMap = new Map<string, CorrosionTestRecord[]>();

  records.forEach(record => {
    if (!batchMap.has(record.batchNo)) {
      batchMap.set(record.batchNo, []);
    }
    batchMap.get(record.batchNo)!.push(record);
  });

  const duplicates: DuplicateBatchInfo[] = [];

  batchMap.forEach((batchRecords, batchNo) => {
    if (batchRecords.length > 1) {
      const sorted = [...batchRecords].sort(
        (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
      );
      const conclusions = new Set(batchRecords.map(r => r.conclusion));
      duplicates.push({
        batchNo,
        recordIds: batchRecords.map(r => r.id),
        affectedConclusions: batchRecords.map(
          r => `${r.sampleName}(${r.id}): ${STATUS_LABELS[r.conclusion]}`
        ),
        firstRecordDate: sorted[0].testDate,
        latestRecordDate: sorted[sorted.length - 1].testDate,
        hasConflictingConclusions: conclusions.size > 1
      });
    }
  });

  return duplicates;
}

export function getRatingStats(records: CorrosionTestRecord[]) {
  const ratingCounts: Record<number, number> = {};
  for (let i = 0; i <= 10; i++) {
    ratingCounts[i] = 0;
  }
  records.forEach(r => {
    ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
  });

  return Object.entries(ratingCounts).map(([rating, count]) => ({
    rating: parseInt(rating),
    count,
    description: RATING_DESCRIPTIONS[parseInt(rating) as CorrosionRating]
  }));
}

export function getStatusStats(records: CorrosionTestRecord[]) {
  const statusCounts: Record<ConclusionStatus, number> = {
    pass: 0,
    fail: 0,
    pending: 0,
    confirmed: 0
  };
  records.forEach(r => {
    statusCounts[r.conclusion]++;
  });
  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    label: STATUS_LABELS[status as ConclusionStatus]
  }));
}

export function getTrendData(records: CorrosionTestRecord[]) {
  const dateMap = new Map<string, { total: number; pass: number; avgRating: number }>();

  records.forEach(record => {
    if (!dateMap.has(record.testDate)) {
      dateMap.set(record.testDate, { total: 0, pass: 0, avgRating: 0 });
    }
    const entry = dateMap.get(record.testDate)!;
    entry.total++;
    if (record.conclusion === 'pass' || record.conclusion === 'confirmed') {
      entry.pass++;
    }
    entry.avgRating += record.rating;
  });

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      total: data.total,
      pass: data.pass,
      avgRating: +(data.avgRating / data.total).toFixed(1),
      passRate: +((data.pass / data.total) * 100).toFixed(0)
    }));
}

export function validateRecord(
  record: Partial<CorrosionTestRecord>,
  existingRecords: CorrosionTestRecord[],
  existingLedgerIds: string[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record.sampleName) errors.push('请填写样品名称');
  if (!record.batchNo) errors.push('请填写批号');
  if (!record.testDate) errors.push('请填写试验日期');
  if (record.durationHours === undefined || record.durationHours <= 0) {
    errors.push('请填写有效的试验时长（小时）');
  }
  if (record.rating === undefined || record.rating < 0 || record.rating > 10) {
    errors.push('请选择有效的腐蚀评级（0-10级）');
  }
  if (!record.operator) errors.push('请填写操作人员');

  const missingLedgers: string[] = [];
  (record.reagentLedgerIds || []).forEach(id => {
    if (!existingLedgerIds.includes(id)) {
      missingLedgers.push(id);
    }
  });
  if (missingLedgers.length > 0) {
    errors.push(
      `缺少试剂台账记录，请补充以下台账：${missingLedgers.join('、')}。` +
      '可在"试剂台账管理"中添加对应记录。'
    );
  }

  if ((record.reagentLedgerIds || []).length === 0) {
    warnings.push('未关联任何试剂台账，建议补充以保证数据完整性。可在录入时选择关联的试剂使用记录。');
  }

  if (record.batchNo) {
    const sameBatch = existingRecords.filter(
      r => r.batchNo === record.batchNo && r.id !== record.id
    );
    if (sameBatch.length > 0) {
      warnings.push(
        `批号【${record.batchNo}】已有 ${sameBatch.length} 条记录（${sameBatch.map(r => r.sampleName).join('、')}），` +
        '请确认是补录/重复导入还是录入错误。如果是同一批样品的补充试验，请在备注中说明。'
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function resolveDuplicateRecords(
  records: CorrosionTestRecord[],
  keepRecordId: string,
  mergeData?: Partial<CorrosionTestRecord>
): CorrosionTestRecord[] {
  const keepRecord = records.find(r => r.id === keepRecordId);
  if (!keepRecord) return records;

  const sameBatch = records.filter(
    r => r.batchNo === keepRecord.batchNo && r.id !== keepRecordId
  );

  if (sameBatch.length === 0) return records;

  return records
    .filter(r => r.batchNo !== keepRecord.batchNo || r.id === keepRecordId)
    .map(r => {
      if (r.id === keepRecordId) {
        return {
          ...r,
          ...mergeData,
          conclusion: mergeData?.conclusion || 'confirmed' as ConclusionStatus,
          isDuplicateWarning: false,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
}

export function generateSummaryText(records: CorrosionTestRecord[]): string {
  const total = records.length;
  const pass = records.filter(r => r.conclusion === 'pass').length;
  const fail = records.filter(r => r.conclusion === 'fail').length;
  const pending = records.filter(r => r.conclusion === 'pending').length;
  const confirmed = records.filter(r => r.conclusion === 'confirmed').length;
  const duplicates = findDuplicateBatches(records);

  const avgRating = total > 0
    ? (records.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
    : '0';

  const passRate = total > 0
    ? (((pass + confirmed) / total) * 100).toFixed(0)
    : '0';

  return (
    `盐雾试验腐蚀评级汇总报告\n` +
    `生成时间：${new Date().toLocaleString('zh-CN')}\n\n` +
    `【数据概览】\n` +
    `总记录数：${total} 条\n` +
    `通过：${pass} 条，不通过：${fail} 条，待确认：${pending} 条，已确认：${confirmed} 条\n` +
    `平均评级：${avgRating}/10，整体通过率：${passRate}%\n\n` +
    (duplicates.length > 0
      ? `【批号重复提示】\n共发现 ${duplicates.length} 个重复批号：\n` +
        duplicates.map(d =>
          `  - ${d.batchNo}：${d.recordIds.length} 条记录，` +
          `${d.hasConflictingConclusions ? '存在结论冲突！' : '结论一致'}\n` +
          `    影响条目：${d.affectedConclusions.join('；')}\n` +
          `    时间跨度：${d.firstRecordDate} ~ ${d.latestRecordDate}`
        ).join('\n') + '\n\n'
      : `【批号重复提示】\n未发现重复批号\n\n`) +
    `【评级分布】\n` +
    getRatingStats(records)
      .filter(s => s.count > 0)
      .map(s => `  ${s.rating}级（${s.description}）：${s.count} 条`)
      .join('\n')
  );
}
