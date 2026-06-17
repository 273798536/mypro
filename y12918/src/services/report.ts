import { run, get, all } from '../database';
import { AppError, getMissingAnnotationMessage } from '../utils/response';
import { ReportStatus, CoverageReport } from '../types';
import { getAllVocabTerms } from './vocabulary';
import { getEvaluationSetById } from './evaluationSet';

const STATUS_FLOW: Record<ReportStatus, ReportStatus[]> = {
  pending: ['processing'],
  processing: ['pending_review'],
  pending_review: ['reviewing', 'completed'],
  reviewing: ['completed', 'pending_review'],
  completed: ['exported'],
  exported: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) || false;
}

export function getReportById(id: number): CoverageReport | undefined {
  return get('SELECT * FROM coverage_reports WHERE id = ?', [id]);
}

export function listReports(
  page: number = 1,
  pageSize: number = 20,
  status?: ReportStatus
) {
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const params: Array<string | number> = [];

  if (status) {
    whereClause = 'WHERE cr.status = ?';
    params.push(status);
  }

  const items = all(
    `SELECT cr.*, es.name as evaluation_set_name, dv.name as vocabulary_name
     FROM coverage_reports cr
     LEFT JOIN evaluation_sets es ON cr.evaluation_set_id = es.id
     LEFT JOIN domain_vocabularies dv ON cr.vocabulary_id = dv.id
     ${whereClause}
     ORDER BY cr.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const totalRow = get(
    `SELECT COUNT(*) as count FROM coverage_reports ${whereClause ? 'WHERE status = ?' : ''}`,
    status ? [status] : []
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function createReport(
  name: string,
  evaluationSetId: number,
  vocabularyId: number,
  createdBy?: string
): number {
  const evalSet = getEvaluationSetById(evaluationSetId);
  if (!evalSet) {
    throw new AppError(`评测集 #${evaluationSetId} 不存在`, 404);
  }

  const vocab = get('SELECT id FROM domain_vocabularies WHERE id = ?', [
    vocabularyId,
  ]);
  if (!vocab) {
    throw new AppError(`领域词表 #${vocabularyId} 不存在`, 404);
  }

  const existing = get(
    `SELECT id FROM coverage_reports
     WHERE name = ? AND evaluation_set_id = ? AND vocabulary_id = ?`,
    [name, evaluationSetId, vocabularyId]
  );

  if (existing) {
    throw new AppError(
      `同名报告"${name}"已存在于该评测集和词表组合，请勿重复创建`,
      409
    );
  }

  const result = run(
    `INSERT INTO coverage_reports
     (name, evaluation_set_id, vocabulary_id, status, created_by)
     VALUES (?, ?, ?, 'pending', ?)`,
    [name, evaluationSetId, vocabularyId, createdBy || null]
  );

  return result.lastInsertRowid;
}

export function generateReport(reportId: number): void {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  if (report.status !== 'pending') {
    throw new AppError(
      `报告状态为"${report.status}"，不能重新生成。请先确认报告处于待生成状态。`,
      400
    );
  }

  run(
    `UPDATE coverage_reports SET status = 'processing', updated_at = datetime('now')
     WHERE id = ?`,
    [reportId]
  );

  run('DELETE FROM report_items WHERE report_id = ?', [reportId]);

  const questions = all(
    `SELECT question_id, question_text, domain_tags, annotation_status, annotation_note
     FROM questions WHERE evaluation_set_id = ?`,
    [report.evaluation_set_id]
  ) as Array<{
    question_id: string;
    question_text: string;
    domain_tags: string | null;
    annotation_status: string;
    annotation_note: string | null;
  }>;

  const terms = getAllVocabTerms(report.vocabulary_id);

  let coveredCount = 0;
  const hitTermsSet = new Set<string>();

  const insertSql = `INSERT INTO report_items
     (report_id, question_id, question_text, is_covered, hit_terms, annotation_status, annotation_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`;

  questions.forEach((q) => {
    const text = q.question_text.toLowerCase();
    const hitTerms: string[] = [];

    for (const term of terms) {
      if (text.includes(term.toLowerCase())) {
        hitTerms.push(term);
        hitTermsSet.add(term);
      }
    }

    const isCovered = hitTerms.length > 0 ? 1 : 0;
    if (isCovered) coveredCount++;

    run(insertSql, [
      reportId,
      q.question_id,
      q.question_text,
      isCovered,
      JSON.stringify(hitTerms),
      q.annotation_status || 'none',
      q.annotation_note,
    ]);
  });

  const coverageRate =
    questions.length > 0
      ? Math.round((coveredCount / questions.length) * 10000) / 100
      : 0;

  run(
    `UPDATE coverage_reports
     SET status = 'pending_review',
         total_questions = ?,
         covered_questions = ?,
         coverage_rate = ?,
         total_terms = ?,
         hit_terms = ?,
         summary = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      questions.length,
      coveredCount,
      coverageRate,
      terms.length,
      hitTermsSet.size,
      `共 ${questions.length} 题，命中 ${coveredCount} 题，覆盖率 ${coverageRate}%；词表共 ${terms.length} 词，命中 ${hitTermsSet.size} 词。`,
      reportId,
    ]
  );
}

export function transitionStatus(
  reportId: number,
  targetStatus: ReportStatus,
  operator?: string
): CoverageReport {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const currentStatus = report.status as ReportStatus;

  if (!canTransition(currentStatus, targetStatus)) {
    throw new AppError(
      `状态流转不合法：不能从"${currentStatus}"直接转为"${targetStatus}"。` +
        `当前可流转到的状态有：${STATUS_FLOW[currentStatus].join('、') || '无'}`,
      400
    );
  }

  if (targetStatus === 'completed') {
    validateCompletionReadiness(reportId);
  }

  run(
    `UPDATE coverage_reports SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    [targetStatus, reportId]
  );

  const updated = getReportById(reportId);
  if (!updated) {
    throw new AppError('更新失败', 500);
  }

  return updated;
}

function validateCompletionReadiness(reportId: number): void {
  const missingItems = all(
    `SELECT question_id, question_text
     FROM report_items
     WHERE report_id = ? AND annotation_status = 'none'
     ORDER BY id ASC
     LIMIT 20`,
    [reportId]
  ) as Array<{ question_id: string; question_text: string }>;

  const totalRow = get(
    `SELECT COUNT(*) as count FROM report_items WHERE report_id = ? AND annotation_status = 'none'`,
    [reportId]
  );

  const totalMissing = totalRow?.count || 0;

  if (totalMissing > 0) {
    const message = getMissingAnnotationMessage(reportId, totalMissing, missingItems);
    throw new AppError(message, 400, [
      `缺少标注记录: ${totalMissing} 条`,
      '请先完成所有题目的标注后再标记为已完成',
    ]);
  }
}

export function getReportSummary(reportId: number) {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const statusCounts = all(
    `SELECT annotation_status, COUNT(*) as count
     FROM report_items
     WHERE report_id = ?
     GROUP BY annotation_status`,
    [reportId]
  ) as Array<{ annotation_status: string; count: number }>;

  const coverageStats = all(
    `SELECT is_covered, COUNT(*) as count
     FROM report_items
     WHERE report_id = ?
     GROUP BY is_covered`,
    [reportId]
  ) as Array<{ is_covered: number; count: number }>;

  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s) => {
    statusMap[s.annotation_status] = s.count;
  });

  const coverageMap: Record<number, number> = {};
  coverageStats.forEach((s) => {
    coverageMap[s.is_covered] = s.count;
  });

  return {
    report,
    annotationStats: {
      none: statusMap.none || 0,
      partial: statusMap.partial || 0,
      full: statusMap.full || 0,
    },
    coverageStats: {
      covered: coverageMap[1] || 0,
      uncovered: coverageMap[0] || 0,
    },
  };
}

export function listReportItems(
  reportId: number,
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    isCovered?: number;
    annotationStatus?: string;
    reviewed?: boolean;
  }
) {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const offset = (page - 1) * pageSize;
  const whereClauses: string[] = ['report_id = ?'];
  const params: Array<string | number> = [reportId];

  if (filters?.isCovered !== undefined) {
    whereClauses.push('is_covered = ?');
    params.push(filters.isCovered);
  }

  if (filters?.annotationStatus) {
    whereClauses.push('annotation_status = ?');
    params.push(filters.annotationStatus);
  }

  if (filters?.reviewed !== undefined) {
    if (filters.reviewed) {
      whereClauses.push('reviewed_at IS NOT NULL');
    } else {
      whereClauses.push('reviewed_at IS NULL');
    }
  }

  const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

  const items = all(
    `SELECT * FROM report_items
     ${whereClause}
     ORDER BY id ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const totalRow = get(
    `SELECT COUNT(*) as count FROM report_items ${whereClause}`,
    params
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function updateReportItemAnnotation(
  reportId: number,
  reportItemId: number,
  annotationStatus: 'none' | 'partial' | 'full',
  annotationNote?: string,
  reviewer?: string
): void {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const item = get(
    'SELECT * FROM report_items WHERE id = ? AND report_id = ?',
    [reportItemId, reportId]
  );
  if (!item) {
    throw new AppError(`报告 #${reportId} 中不存在条目 #${reportItemId}`, 404);
  }

  run(
    `UPDATE report_items
     SET annotation_status = ?,
         annotation_note = COALESCE(?, annotation_note),
         reviewed_by = COALESCE(?, reviewed_by),
         reviewed_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      annotationStatus,
      annotationNote !== undefined ? annotationNote : null,
      reviewer || null,
      reportItemId,
    ]
  );

  run(
    `INSERT INTO review_records
     (report_id, report_item_id, reviewer, action, comment)
     VALUES (?, ?, ?, 'supplement', ?)`,
    [reportId, reportItemId, reviewer || 'unknown', annotationNote || null]
  );

  recalcReportStats(reportId);
}

function recalcReportStats(reportId: number): void {
  const stats = get(
    `SELECT
       COUNT(*) as total,
       SUM(is_covered) as covered,
       SUM(CASE WHEN annotation_status = 'full' THEN 1 ELSE 0 END) as full_annotated
     FROM report_items WHERE report_id = ?`,
    [reportId]
  ) as { total: number; covered: number; full_annotated: number };

  const total = stats.total || 0;
  const covered = stats.covered || 0;
  const coverageRate = total > 0 ? Math.round((covered / total) * 10000) / 100 : 0;

  run(
    `UPDATE coverage_reports
     SET total_questions = ?,
         covered_questions = ?,
         coverage_rate = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [total, covered, coverageRate, reportId]
  );
}

export function reviewReportItem(
  reportId: number,
  reportItemId: number,
  action: 'confirm' | 'reject' | 'supplement',
  comment?: string,
  reviewer?: string,
  annotationData?: {
    annotationStatus?: 'none' | 'partial' | 'full';
    annotationNote?: string;
  }
): void {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const item = get(
    'SELECT * FROM report_items WHERE id = ? AND report_id = ?',
    [reportItemId, reportId]
  );
  if (!item) {
    throw new AppError(`报告 #${reportId} 中不存在条目 #${reportItemId}`, 404);
  }

  if (annotationData) {
    run(
      `UPDATE report_items
       SET annotation_status = COALESCE(?, annotation_status),
           annotation_note = COALESCE(?, annotation_note),
           reviewed_by = COALESCE(?, reviewed_by),
           review_comment = COALESCE(?, review_comment),
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        annotationData.annotationStatus || null,
        annotationData.annotationNote !== undefined ? annotationData.annotationNote : null,
        reviewer || null,
        comment || null,
        reportItemId,
      ]
    );
  } else {
    run(
      `UPDATE report_items
       SET reviewed_by = COALESCE(?, reviewed_by),
           review_comment = COALESCE(?, review_comment),
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
      [reviewer || null, comment || null, reportItemId]
    );
  }

  run(
    `INSERT INTO review_records
     (report_id, report_item_id, reviewer, action, comment, annotation_data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      reportId,
      reportItemId,
      reviewer || 'unknown',
      action,
      comment || null,
      annotationData ? JSON.stringify(annotationData) : null,
    ]
  );

  recalcReportStats(reportId);
}

export function listReviewRecords(
  reportId: number,
  page: number = 1,
  pageSize: number = 20
) {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const offset = (page - 1) * pageSize;

  const items = all(
    `SELECT rr.*, ri.question_id, ri.question_text
     FROM review_records rr
     LEFT JOIN report_items ri ON rr.report_item_id = ri.id
     WHERE rr.report_id = ?
     ORDER BY rr.created_at DESC
     LIMIT ? OFFSET ?`,
    [reportId, pageSize, offset]
  );

  const totalRow = get(
    `SELECT COUNT(*) as count FROM review_records WHERE report_id = ?`,
    [reportId]
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function markAsExported(reportId: number): void {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  if (report.status !== 'completed') {
    throw new AppError(
      `只有"已完成"状态的报告才能导出，当前状态为"${report.status}"`,
      400
    );
  }

  run(
    `UPDATE coverage_reports
     SET status = 'exported', exported_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
    [reportId]
  );
}
