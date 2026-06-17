"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvaluationSetByName = getEvaluationSetByName;
exports.getEvaluationSetById = getEvaluationSetById;
exports.listEvaluationSets = listEvaluationSets;
exports.createEvaluationSet = createEvaluationSet;
exports.importQuestions = importQuestions;
exports.listQuestions = listQuestions;
exports.updateQuestionAnnotation = updateQuestionAnnotation;
const database_1 = require("../database");
const response_1 = require("../utils/response");
function getEvaluationSetByName(name) {
    return (0, database_1.get)('SELECT * FROM evaluation_sets WHERE name = ?', [name]);
}
function getEvaluationSetById(id) {
    return (0, database_1.get)('SELECT * FROM evaluation_sets WHERE id = ?', [id]);
}
function listEvaluationSets(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const items = (0, database_1.all)(`SELECT * FROM evaluation_sets
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`, [pageSize, offset]);
    const totalRow = (0, database_1.get)('SELECT COUNT(*) as count FROM evaluation_sets');
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function createEvaluationSet(name, description, source) {
    const existing = getEvaluationSetByName(name);
    if (existing) {
        throw new response_1.AppError(`评测集"${name}"已存在，请勿重复创建`, 409);
    }
    const result = (0, database_1.run)(`INSERT INTO evaluation_sets (name, description, source, total_questions)
     VALUES (?, ?, ?, 0)`, [name, description || null, source || null]);
    return result.lastInsertRowid;
}
function importQuestions(evaluationSetId, rows) {
    const evalSet = getEvaluationSetById(evaluationSetId);
    if (!evalSet) {
        throw new response_1.AppError(`评测集 #${evaluationSetId} 不存在`, 404);
    }
    const errors = [];
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    try {
        rows.forEach((row, index) => {
            try {
                if (!row.question_id || !row.question_text) {
                    errors.push(`第${index + 1}行: 缺少题目ID或题目文本`);
                    skippedCount++;
                    return;
                }
                const existing = (0, database_1.get)('SELECT id FROM questions WHERE evaluation_set_id = ? AND question_id = ?', [evaluationSetId, row.question_id]);
                const status = row.annotation_status || 'none';
                const tags = row.domain_tags || '';
                const note = row.annotation_note || null;
                if (existing) {
                    (0, database_1.run)(`UPDATE questions
             SET question_text = ?, domain_tags = ?, annotation_status = ?, annotation_note = ?,
                 updated_at = datetime('now')
             WHERE evaluation_set_id = ? AND question_id = ?`, [
                        row.question_text,
                        tags,
                        status,
                        note,
                        evaluationSetId,
                        row.question_id,
                    ]);
                    updatedCount++;
                }
                else {
                    (0, database_1.run)(`INSERT INTO questions
             (evaluation_set_id, question_id, question_text, domain_tags, annotation_status, annotation_note)
             VALUES (?, ?, ?, ?, ?, ?)`, [
                        evaluationSetId,
                        row.question_id,
                        row.question_text,
                        tags,
                        status,
                        note,
                    ]);
                    newCount++;
                }
            }
            catch (e) {
                errors.push(`第${index + 1}行: ${e.message}`);
                skippedCount++;
            }
        });
        const countResult = (0, database_1.get)('SELECT COUNT(*) as count FROM questions WHERE evaluation_set_id = ?', [evaluationSetId]);
        (0, database_1.run)(`UPDATE evaluation_sets
       SET total_questions = ?, updated_at = datetime('now')
       WHERE id = ?`, [countResult?.count || 0, evaluationSetId]);
    }
    catch (e) {
        throw new response_1.AppError(`导入失败: ${e.message}`, 500);
    }
    return {
        success: errors.length < rows.length,
        totalCount: rows.length,
        newCount,
        updatedCount,
        skippedCount,
        errors,
    };
}
function listQuestions(evaluationSetId, page = 1, pageSize = 20, annotationStatus) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE evaluation_set_id = ?';
    const params = [evaluationSetId];
    if (annotationStatus) {
        whereClause += ' AND annotation_status = ?';
        params.push(annotationStatus);
    }
    const items = (0, database_1.all)(`SELECT * FROM questions
     ${whereClause}
     ORDER BY id ASC
     LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    const totalRow = (0, database_1.get)(`SELECT COUNT(*) as count FROM questions ${whereClause}`, params);
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function updateQuestionAnnotation(evaluationSetId, questionId, annotationStatus, domainTags, annotationNote) {
    const existing = (0, database_1.get)('SELECT id FROM questions WHERE evaluation_set_id = ? AND question_id = ?', [evaluationSetId, questionId]);
    if (!existing) {
        throw new response_1.AppError(`评测集 #${evaluationSetId} 中不存在题目 "${questionId}"`, 404);
    }
    (0, database_1.run)(`UPDATE questions
     SET annotation_status = ?,
         domain_tags = COALESCE(?, domain_tags),
         annotation_note = COALESCE(?, annotation_note),
         updated_at = datetime('now')
     WHERE evaluation_set_id = ? AND question_id = ?`, [
        annotationStatus,
        domainTags !== undefined ? domainTags : null,
        annotationNote !== undefined ? annotationNote : null,
        evaluationSetId,
        questionId,
    ]);
    return { success: true };
}
//# sourceMappingURL=evaluationSet.js.map