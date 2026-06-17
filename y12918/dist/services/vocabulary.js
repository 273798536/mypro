"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVocabularyByName = getVocabularyByName;
exports.getVocabularyById = getVocabularyById;
exports.listVocabularies = listVocabularies;
exports.createVocabulary = createVocabulary;
exports.importVocabTerms = importVocabTerms;
exports.listVocabTerms = listVocabTerms;
exports.getAllVocabTerms = getAllVocabTerms;
const database_1 = require("../database");
const response_1 = require("../utils/response");
function getVocabularyByName(name, domain) {
    return (0, database_1.get)('SELECT * FROM domain_vocabularies WHERE name = ? AND domain = ?', [name, domain]);
}
function getVocabularyById(id) {
    return (0, database_1.get)('SELECT * FROM domain_vocabularies WHERE id = ?', [id]);
}
function listVocabularies(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const items = (0, database_1.all)(`SELECT * FROM domain_vocabularies
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`, [pageSize, offset]);
    const totalRow = (0, database_1.get)('SELECT COUNT(*) as count FROM domain_vocabularies', []);
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function createVocabulary(name, domain) {
    const existing = getVocabularyByName(name, domain);
    if (existing) {
        throw new response_1.AppError(`领域词表"${name}"在"${domain}"领域已存在`, 409);
    }
    const result = (0, database_1.run)(`INSERT INTO domain_vocabularies (name, domain, total_terms)
     VALUES (?, ?, 0)`, [name, domain]);
    return result.lastInsertRowid;
}
function importVocabTerms(vocabularyId, rows) {
    const vocab = getVocabularyById(vocabularyId);
    if (!vocab) {
        throw new response_1.AppError(`领域词表 #${vocabularyId} 不存在`, 404);
    }
    const errors = [];
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const insertSql = `INSERT INTO vocabulary_terms (vocabulary_id, term, category)
     VALUES (?, ?, ?)`;
    const updateSql = `UPDATE vocabulary_terms
     SET category = ?
     WHERE vocabulary_id = ? AND term = ?`;
    const findSql = 'SELECT id FROM vocabulary_terms WHERE vocabulary_id = ? AND term = ?';
    try {
        rows.forEach((row, index) => {
            try {
                if (!row.term) {
                    errors.push(`第${index + 1}行: 缺少词条`);
                    skippedCount++;
                    return;
                }
                const existing = (0, database_1.get)(findSql, [vocabularyId, row.term.trim()]);
                if (existing) {
                    if (row.category !== undefined) {
                        (0, database_1.run)(updateSql, [row.category || null, vocabularyId, row.term.trim()]);
                        updatedCount++;
                    }
                    else {
                        skippedCount++;
                    }
                }
                else {
                    (0, database_1.run)(insertSql, [vocabularyId, row.term.trim(), row.category || null]);
                    newCount++;
                }
            }
            catch (e) {
                errors.push(`第${index + 1}行: ${e.message}`);
                skippedCount++;
            }
        });
        const countResult = (0, database_1.get)('SELECT COUNT(*) as count FROM vocabulary_terms WHERE vocabulary_id = ?', [vocabularyId]);
        (0, database_1.run)(`UPDATE domain_vocabularies
       SET total_terms = ?, updated_at = datetime('now')
       WHERE id = ?`, [countResult?.count || 0, vocabularyId]);
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
function listVocabTerms(vocabularyId, page = 1, pageSize = 50, category) {
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE vocabulary_id = ?';
    const params = [vocabularyId];
    if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
    }
    const items = (0, database_1.all)(`SELECT * FROM vocabulary_terms
     ${whereClause}
     ORDER BY term ASC
     LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
    const totalRow = (0, database_1.get)(`SELECT COUNT(*) as count FROM vocabulary_terms ${whereClause}`, params);
    return { items, total: totalRow?.count || 0, page, pageSize };
}
function getAllVocabTerms(vocabularyId) {
    const rows = (0, database_1.all)('SELECT term FROM vocabulary_terms WHERE vocabulary_id = ?', [vocabularyId]);
    return rows.map((r) => r.term);
}
//# sourceMappingURL=vocabulary.js.map