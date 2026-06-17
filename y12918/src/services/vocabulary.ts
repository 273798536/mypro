import { run, get, all } from '../database';
import { ImportResult } from '../types';
import { AppError } from '../utils/response';

export interface VocabTermRow {
  term: string;
  category?: string;
}

export function getVocabularyByName(name: string, domain: string) {
  return get(
    'SELECT * FROM domain_vocabularies WHERE name = ? AND domain = ?',
    [name, domain]
  );
}

export function getVocabularyById(id: number) {
  return get('SELECT * FROM domain_vocabularies WHERE id = ?', [id]);
}

export function listVocabularies(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;
  const items = all(
    `SELECT * FROM domain_vocabularies
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );

  const totalRow = get(
    'SELECT COUNT(*) as count FROM domain_vocabularies',
    []
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function createVocabulary(name: string, domain: string): number {
  const existing = getVocabularyByName(name, domain);
  if (existing) {
    throw new AppError(`领域词表"${name}"在"${domain}"领域已存在`, 409);
  }

  const result = run(
    `INSERT INTO domain_vocabularies (name, domain, total_terms)
     VALUES (?, ?, 0)`,
    [name, domain]
  );

  return result.lastInsertRowid;
}

export function importVocabTerms(
  vocabularyId: number,
  rows: VocabTermRow[]
): ImportResult {
  const vocab = getVocabularyById(vocabularyId);
  if (!vocab) {
    throw new AppError(`领域词表 #${vocabularyId} 不存在`, 404);
  }

  const errors: string[] = [];
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

        const existing = get(findSql, [vocabularyId, row.term.trim()]);

        if (existing) {
          if (row.category !== undefined) {
            run(updateSql, [row.category || null, vocabularyId, row.term.trim()]);
            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          run(insertSql, [vocabularyId, row.term.trim(), row.category || null]);
          newCount++;
        }
      } catch (e) {
        errors.push(`第${index + 1}行: ${(e as Error).message}`);
        skippedCount++;
      }
    });

    const countResult = get(
      'SELECT COUNT(*) as count FROM vocabulary_terms WHERE vocabulary_id = ?',
      [vocabularyId]
    );

    run(
      `UPDATE domain_vocabularies
       SET total_terms = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [countResult?.count || 0, vocabularyId]
    );
  } catch (e) {
    throw new AppError(`导入失败: ${(e as Error).message}`, 500);
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

export function listVocabTerms(
  vocabularyId: number,
  page: number = 1,
  pageSize: number = 50,
  category?: string
) {
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE vocabulary_id = ?';
  const params: Array<string | number> = [vocabularyId];

  if (category) {
    whereClause += ' AND category = ?';
    params.push(category);
  }

  const items = all(
    `SELECT * FROM vocabulary_terms
     ${whereClause}
     ORDER BY term ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const totalRow = get(
    `SELECT COUNT(*) as count FROM vocabulary_terms ${whereClause}`,
    params
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function getAllVocabTerms(vocabularyId: number): string[] {
  const rows = all(
    'SELECT term FROM vocabulary_terms WHERE vocabulary_id = ?',
    [vocabularyId]
  ) as Array<{ term: string }>;
  return rows.map((r) => r.term);
}
