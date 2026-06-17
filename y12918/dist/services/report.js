"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = canTransition;
exports.getReportById = getReportById;
exports.listReports = listReports;
exports.createReport = createReport;
exports.generateReport = generateReport;
exports.transitionStatus = transitionStatus;
exports.getReportSummary = getReportSummary;
exports.listReportItems = listReportItems;
exports.updateReportItemAnnotation = updateReportItemAnnotation;
exports.reviewReportItem = reviewReportItem;
exports.listReviewRecords = listReviewRecords;
exports.markAsExported = markAsExported;
const database_1 = require("../database");
const response_1 = require("../utils/response");
const vocabulary_1 = require("./vocabulary");
const evaluationSet_1 = require("./evaluationSet");
const STATUS_FLOW = {
    pending: ['processing'],
    processing: ['pending_review'],
    pending_review: ['reviewing', 'completed'],
    reviewing: ['completed', 'pending_review'],
    completed: ['exported'],
    exported: [],
};
function canTransition(from, to) {
    return STATUS_FLOW[from]?.includes(to) || false;
}
function getReportById(id) {
    return (0, database_1.get)('SELECT * FROM coverage_reports WHERE id = ?', [id]);
}
function listReports(page = 1, pageSize = 20, status) {
    const offset = (page - 1) * pageSize;
    let whereClause = '';
    const params = [];
    if (status) {
        whereClause = 'WHERE cr.status = ?';
        params.push(status);
    }
    const items = (0, database_1.all)(`SELECT cr.*, es.name as evaluation_set_name, dv.name as vocabulary_name
     FROM coverage_reports cr
     LEFT JOIN evaluation_sets es ON cr.evaluation_set_id = es.id
     LEFT JOIN domain_vocabularies dv ON cr.vocabulary_id = dv.id
     ${whereClause}
     ORDER BY cr.updated_at DESC
     LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    const totalRow = (0, database_1.get)(`SELECT COUNT(*) as count FROM coverage_reports ${whereClause ? 'WHERE status = ?' : ''}`, status ? [status] : []);
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function createReport(name, evaluationSetId, vocabularyId, createdBy) {
    const evalSet = (0, evaluationSet_1.getEvaluationSetById)(evaluationSetId);
    if (!evalSet) {
        throw new response_1.AppError(`评测集 #${evaluationSetId} 不存在`, 404);
    }
    const vocab = (0, database_1.get)('SELECT id FROM domain_vocabularies WHERE id = ?', [
        vocabularyId,
    ]);
    if (!vocab) {
        throw new response_1.AppError(`领域词表 #${vocabularyId} 不存在`, 404);
    }
    const existing = (0, database_1.get)(`SELECT id FROM coverage_reports
     WHERE name = ? AND evaluation_set_id = ? AND vocabulary_id = ?`, [name, evaluationSetId, vocabularyId]);
    if (existing) {
        throw new response_1.AppError(`同名报告"${name}"已存在于该评测集和词表组合，请勿重复创建`, 409);
    }
    const result = (0, database_1.run)(`INSERT INTO coverage_reports
     (name, evaluation_set_id, vocabulary_id, status, created_by)
     VALUES (?, ?, ?, 'pending', ?)`, [name, evaluationSetId, vocabularyId, createdBy || null]);
    return result.lastInsertRowid;
}
function generateReport(reportId) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    if (report.status !== 'pending') {
        throw new response_1.AppError(`报告状态为"${report.status}"，不能重新生成。请先确认报告处于待生成状态。`, 400);
    }
    (0, database_1.run)(`UPDATE coverage_reports SET status = 'processing', updated_at = datetime('now')
     WHERE id = ?`, [reportId]);
    (0, database_1.run)('DELETE FROM report_items WHERE report_id = ?', [reportId]);
    const questions = (0, database_1.all)(`SELECT question_id, question_text, domain_tags, annotation_status, annotation_note
     FROM questions WHERE evaluation_set_id = ?`, [report.evaluation_set_id]);
    const terms = (0, vocabulary_1.getAllVocabTerms)(report.vocabulary_id);
    let coveredCount = 0;
    const hitTermsSet = new Set();
    const insertSql = `INSERT INTO report_items
     (report_id, question_id, question_text, is_covered, hit_terms, annotation_status, annotation_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`;
    questions.forEach((q) => {
        const text = q.question_text.toLowerCase();
        const hitTerms = [];
        for (const term of terms) {
            if (text.includes(term.toLowerCase())) {
                hitTerms.push(term);
                hitTermsSet.add(term);
            }
        }
        const isCovered = hitTerms.length > 0 ? 1 : 0;
        if (isCovered)
            coveredCount++;
        (0, database_1.run)(insertSql, [
            reportId,
            q.question_id,
            q.question_text,
            isCovered,
            JSON.stringify(hitTerms),
            q.annotation_status || 'none',
            q.annotation_note,
        ]);
    });
    const coverageRate = questions.length > 0
        ? Math.round((coveredCount / questions.length) * 10000) / 100
        : 0;
    (0, database_1.run)(`UPDATE coverage_reports
     SET status = 'pending_review',
         total_questions = ?,
         covered_questions = ?,
         coverage_rate = ?,
         total_terms = ?,
         hit_terms = ?,
         summary = ?,
         updated_at = datetime('now')
     WHERE id = ?`, [
        questions.length,
        coveredCount,
        coverageRate,
        terms.length,
        hitTermsSet.size,
        `共 ${questions.length} 题，命中 ${coveredCount} 题，覆盖率 ${coverageRate}%；词表共 ${terms.length} 词，命中 ${hitTermsSet.size} 词。`,
        reportId,
    ]);
}
function transitionStatus(reportId, targetStatus, operator) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    const currentStatus = report.status;
    if (!canTransition(currentStatus, targetStatus)) {
        throw new response_1.AppError(`状态流转不合法：不能从"${currentStatus}"直接转为"${targetStatus}"。` +
            `当前可流转到的状态有：${STATUS_FLOW[currentStatus].join('、') || '无'}`, 400);
    }
    if (targetStatus === 'completed') {
        validateCompletionReadiness(reportId);
    }
    (0, database_1.run)(`UPDATE coverage_reports SET status = ?, updated_at = datetime('now') WHERE id = ?`, [targetStatus, reportId]);
    const updated = getReportById(reportId);
    if (!updated) {
        throw new response_1.AppError('更新失败', 500);
    }
    return updated;
}
function validateCompletionReadiness(reportId) {
    const missingItems = (0, database_1.all)(`SELECT question_id, question_text
     FROM report_items
     WHERE report_id = ? AND annotation_status = 'none'
     ORDER BY id ASC
     LIMIT 20`, [reportId]);
    const totalRow = (0, database_1.get)(`SELECT COUNT(*) as count FROM report_items WHERE report_id = ? AND annotation_status = 'none'`, [reportId]);
    const totalMissing = totalRow?.count || 0;
    if (totalMissing > 0) {
        const message = (0, response_1.getMissingAnnotationMessage)(reportId, totalMissing, missingItems);
        throw new response_1.AppError(message, 400, [
            `缺少标注记录: ${totalMissing} 条`,
            '请先完成所有题目的标注后再标记为已完成',
        ]);
    }
}
function getReportSummary(reportId) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    const statusCounts = (0, database_1.all)(`SELECT annotation_status, COUNT(*) as count
     FROM report_items
     WHERE report_id = ?
     GROUP BY annotation_status`, [reportId]);
    const coverageStats = (0, database_1.all)(`SELECT is_covered, COUNT(*) as count
     FROM report_items
     WHERE report_id = ?
     GROUP BY is_covered`, [reportId]);
    const statusMap = {};
    statusCounts.forEach((s) => {
        statusMap[s.annotation_status] = s.count;
    });
    const coverageMap = {};
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
function listReportItems(reportId, page = 1, pageSize = 20, filters) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    const offset = (page - 1) * pageSize;
    const whereClauses = ['report_id = ?'];
    const params = [reportId];
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
        }
        else {
            whereClauses.push('reviewed_at IS NULL');
        }
    }
    const whereClause = `WHERE ${whereClauses.join(' AND ')}`;
    const items = (0, database_1.all)(`SELECT * FROM report_items
     ${whereClause}
     ORDER BY id ASC
     LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    const totalRow = (0, database_1.get)(`SELECT COUNT(*) as count FROM report_items ${whereClause}`, params);
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function updateReportItemAnnotation(reportId, reportItemId, annotationStatus, annotationNote, reviewer) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    const item = (0, database_1.get)('SELECT * FROM report_items WHERE id = ? AND report_id = ?', [reportItemId, reportId]);
    if (!item) {
        throw new response_1.AppError(`报告 #${reportId} 中不存在条目 #${reportItemId}`, 404);
    }
    (0, database_1.run)(`UPDATE report_items
     SET annotation_status = ?,
         annotation_note = COALESCE(?, annotation_note),
         reviewed_by = COALESCE(?, reviewed_by),
         reviewed_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`, [
        annotationStatus,
        annotationNote !== undefined ? annotationNote : null,
        reviewer || null,
        reportItemId,
    ]);
    (0, database_1.run)(`INSERT INTO review_records
     (report_id, report_item_id, reviewer, action, comment)
     VALUES (?, ?, ?, 'supplement', ?)`, [reportId, reportItemId, reviewer || 'unknown', annotationNote || null]);
    recalcReportStats(reportId);
}
function recalcReportStats(reportId) {
    const stats = (0, database_1.get)(`SELECT
       COUNT(*) as total,
       SUM(is_covered) as covered,
       SUM(CASE WHEN annotation_status = 'full' THEN 1 ELSE 0 END) as full_annotated
     FROM report_items WHERE report_id = ?`, [reportId]);
    const total = stats.total || 0;
    const covered = stats.covered || 0;
    const coverageRate = total > 0 ? Math.round((covered / total) * 10000) / 100 : 0;
    (0, database_1.run)(`UPDATE coverage_reports
     SET total_questions = ?,
         covered_questions = ?,
         coverage_rate = ?,
         updated_at = datetime('now')
     WHERE id = ?`, [total, covered, coverageRate, reportId]);
}
function reviewReportItem(reportId, reportItemId, action, comment, reviewer, annotationData) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    const item = (0, database_1.get)('SELECT * FROM report_items WHERE id = ? AND report_id = ?', [reportItemId, reportId]);
    if (!item) {
        throw new response_1.AppError(`报告 #${reportId} 中不存在条目 #${reportItemId}`, 404);
    }
    if (annotationData) {
        (0, database_1.run)(`UPDATE report_items
       SET annotation_status = COALESCE(?, annotation_status),
           annotation_note = COALESCE(?, annotation_note),
           reviewed_by = COALESCE(?, reviewed_by),
           review_comment = COALESCE(?, review_comment),
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`, [
            annotationData.annotationStatus || null,
            annotationData.annotationNote !== undefined ? annotationData.annotationNote : null,
            reviewer || null,
            comment || null,
            reportItemId,
        ]);
    }
    else {
        (0, database_1.run)(`UPDATE report_items
       SET reviewed_by = COALESCE(?, reviewed_by),
           review_comment = COALESCE(?, review_comment),
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`, [reviewer || null, comment || null, reportItemId]);
    }
    (0, database_1.run)(`INSERT INTO review_records
     (report_id, report_item_id, reviewer, action, comment, annotation_data)
     VALUES (?, ?, ?, ?, ?, ?)`, [
        reportId,
        reportItemId,
        reviewer || 'unknown',
        action,
        comment || null,
        annotationData ? JSON.stringify(annotationData) : null,
    ]);
    recalcReportStats(reportId);
}
function listReviewRecords(reportId, page = 1, pageSize = 20) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    const offset = (page - 1) * pageSize;
    const items = (0, database_1.all)(`SELECT rr.*, ri.question_id, ri.question_text
     FROM review_records rr
     LEFT JOIN report_items ri ON rr.report_item_id = ri.id
     WHERE rr.report_id = ?
     ORDER BY rr.created_at DESC
     LIMIT ? OFFSET ?`, [reportId, pageSize, offset]);
    const totalRow = (0, database_1.get)(`SELECT COUNT(*) as count FROM review_records WHERE report_id = ?`, [reportId]);
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function markAsExported(reportId) {
    const report = getReportById(reportId);
    if (!report) {
        throw new response_1.AppError(`报告 #${reportId} 不存在`, 404);
    }
    if (report.status !== 'completed') {
        throw new response_1.AppError(`只有"已完成"状态的报告才能导出，当前状态为"${report.status}"`, 400);
    }
    (0, database_1.run)(`UPDATE coverage_reports
     SET status = 'exported', exported_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`, [reportId]);
}
//# sourceMappingURL=report.js.map