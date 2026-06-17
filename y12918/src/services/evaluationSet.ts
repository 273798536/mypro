import { run, get, all } from '../database';
import { ImportResult } from '../types';
import { AppError } from '../utils/response';

export interface QuestionImportRow {
  question_id: string;
  question_text: string;
  domain_tags?: string;
  annotation_status?: 'none' | 'partial' | 'full';
  annotation_note?: string;
}

export function getEvaluationSetByName(name: string) {
  return get('SELECT * FROM evaluation_sets WHERE name = ?', [name]);
}

export function getEvaluationSetById(id: number) {
  return get('SELECT * FROM evaluation_sets WHERE id = ?', [id]);
}

export function listEvaluationSets(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;
  const items = all(
    `SELECT * FROM evaluation_sets
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );

  const totalRow = get<{ count: number }>(
    'SELECT COUNT(*) as count FROM evaluation_sets'
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function createEvaluationSet(
  name: string,
  description?: string,
  source?: string
): number {
  const existing = getEvaluationSetByName(name);
  if (existing) {
    throw new AppError(`评测集"${name}"已存在，请勿重复创建`, 409);
  }

  const result = run(
    `INSERT INTO evaluation_sets (name, description, source, total_questions)
     VALUES (?, ?, ?, 0)`,
    [name, description || null, source || null]
  );

  return result.lastInsertRowid;
}

export function importQuestions(
  evaluationSetId: number,
  rows: QuestionImportRow[]
): ImportResult {
  const evalSet = getEvaluationSetById(evaluationSetId);
  if (!evalSet) {
    throw new AppError(`评测集 #${evaluationSetId} 不存在`, 404);
  }

  const errors: string[] = [];
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

        const existing = get(
          'SELECT id FROM questions WHERE evaluation_set_id = ? AND question_id = ?',
          [evaluationSetId, row.question_id]
        );

        const status = row.annotation_status || 'none';
        const tags = row.domain_tags || '';
        const note = row.annotation_note || null;

        if (existing) {
          run(
            `UPDATE questions
             SET question_text = ?, domain_tags = ?, annotation_status = ?, annotation_note = ?,
                 updated_at = datetime('now')
             WHERE evaluation_set_id = ? AND question_id = ?`,
            [
              row.question_text,
              tags,
              status,
              note,
              evaluationSetId,
              row.question_id,
            ]
          );
          updatedCount++;
        } else {
          run(
            `INSERT INTO questions
             (evaluation_set_id, question_id, question_text, domain_tags, annotation_status, annotation_note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              evaluationSetId,
              row.question_id,
              row.question_text,
              tags,
              status,
              note,
            ]
          );
          newCount++;
        }
      } catch (e) {
        errors.push(`第${index + 1}行: ${(e as Error).message}`);
        skippedCount++;
      }
    });

    const countResult = get<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions WHERE evaluation_set_id = ?',
      [evaluationSetId]
    );

    run(
      `UPDATE evaluation_sets
       SET total_questions = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [countResult?.count || 0, evaluationSetId]
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

export function listQuestions(
  evaluationSetId: number,
  page: number = 1,
  pageSize: number = 20,
  annotationStatus?: string
) {
  const offset = (page - 1) * pageSize;

  let whereClause = 'WHERE evaluation_set_id = ?';
  const params: Array<string | number> = [evaluationSetId];

  if (annotationStatus) {
    whereClause += ' AND annotation_status = ?';
    params.push(annotationStatus);
  }

  const items = all(
    `SELECT * FROM questions
     ${whereClause}
     ORDER BY id ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const totalRow = get<{ count: number }>(
    `SELECT COUNT(*) as count FROM questions ${whereClause}`,
    params
  );

  return { items, total: totalRow?.count || 0, page, pageSize };
}

export function updateQuestionAnnotation(
  evaluationSetId: number,
  questionId: string,
  annotationStatus: 'none' | 'partial' | 'full',
  domainTags?: string,
  annotationNote?: string
) {
  const existing = get(
    'SELECT id FROM questions WHERE evaluation_set_id = ? AND question_id = ?',
    [evaluationSetId, questionId]
  );

  if (!existing) {
    throw new AppError(
      `评测集 #${evaluationSetId} 中不存在题目 "${questionId}"`,
      404
    );
  }

  run(
    `UPDATE questions
     SET annotation_status = ?,
         domain_tags = COALESCE(?, domain_tags),
         annotation_note = COALESCE(?, annotation_note),
         updated_at = datetime('now')
     WHERE evaluation_set_id = ? AND question_id = ?`,
    [
      annotationStatus,
      domainTags !== undefined ? domainTags : null,
      annotationNote !== undefined ? annotationNote : null,
      evaluationSetId,
      questionId,
    ]
  );

  return { success: true };
}
