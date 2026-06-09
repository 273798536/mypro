import type { Question, DataGap } from '@/types';

export interface ValidationResult {
  valid: boolean;
  gaps: DataGap[];
  warnings: string[];
  errors: string[];
}

export function validateQuestions(questions: Question[]): ValidationResult {
  const gaps: DataGap[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const idSet = new Set<string>();

  for (const q of questions) {
    if (idSet.has(q.id)) {
      errors.push(`题目ID重复：${q.id}`);
      gaps.push({
        questionId: q.id,
        fieldName: 'id',
        severity: 'error',
        description: `存在重复的题目ID ${q.id}`,
        impact: '重复ID会导致依赖关系混乱，排期计算结果不可信',
      });
    }
    idSet.add(q.id);

    if (!q.name || q.name.trim() === '') {
      gaps.push({
        questionId: q.id,
        fieldName: 'name',
        severity: 'warning',
        description: '题目名称为空',
        impact: '影响运营同事识别题目，建议补充',
      });
    }

    if (!q.chapter || q.chapter.trim() === '') {
      gaps.push({
        questionId: q.id,
        fieldName: 'chapter',
        severity: 'warning',
        description: '所属章节为空，使用默认章节排序权重',
        impact: '章节顺序权重可能不准确，排期偏差约±2位',
      });
    }

    if (q.difficulty !== null && (q.difficulty < 1 || q.difficulty > 5)) {
      gaps.push({
        questionId: q.id,
        fieldName: 'difficulty',
        severity: 'error',
        description: `难度评分 ${q.difficulty} 超出范围 [1, 5]`,
        impact: '归一化后评分失真，请修正后重新计算',
      });
    }

    if (q.errorRate !== null && (q.errorRate < 0 || q.errorRate > 1)) {
      gaps.push({
        questionId: q.id,
        fieldName: 'errorRate',
        severity: 'error',
        description: `错题率 ${q.errorRate} 超出范围 [0, 1]`,
        impact: '评分组件失真，请修正为0-1之间的小数',
      });
    }
  }

  for (const q of questions) {
    for (const depId of q.dependencies) {
      if (!idSet.has(depId)) {
        gaps.push({
          questionId: q.id,
          fieldName: 'dependencies',
          severity: 'error',
          description: `引用的前置依赖题 ${depId} 不存在`,
          impact: '该题将被跳过计算，需修复依赖后重新排期',
        });
      }
      if (depId === q.id) {
        gaps.push({
          questionId: q.id,
          fieldName: 'dependencies',
          severity: 'error',
          description: '不能依赖自身',
          impact: '该题将被跳过计算',
        });
      }
    }
  }

  const valid = errors.length === 0;

  if (gaps.length > 0) {
    warnings.push(`检测到 ${gaps.length} 条数据缺口，系统将使用兜底值继续计算可处理数据`);
  }

  return { valid, gaps, warnings, errors };
}

export function parseCSV(text: string): Question[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerMap = new Map<string, number>();
  const headers = lines[0].split(',');
  headers.forEach((h, idx) => {
    headerMap.set(h.trim().toLowerCase(), idx);
  });

  const required = ['id', 'name'];
  for (const r of required) {
    if (!headerMap.has(r)) {
      throw new Error(`CSV缺少必要列：${r}`);
    }
  }

  const result: Question[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const get = (key: string) => {
      const idx = headerMap.get(key);
      return idx !== undefined ? cols[idx]?.trim() ?? '' : '';
    };
    const depsRaw = get('dependencies') || get('deps') || '';
    const deps = depsRaw
      ? depsRaw
          .split(/[;；|/]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const diffRaw = get('difficulty') || get('diff');
    const errRaw = get('errorrate') || get('error_rate') || get('err');
    const sourceMap: Record<string, Question['source']> = {
      shared_drive: 'shared_drive',
      共享盘: 'shared_drive',
      legacy_sheet: 'legacy_sheet',
      旧表: 'legacy_sheet',
      draft_note: 'draft_note',
      草稿: 'draft_note',
      manual: 'manual',
      手动: 'manual',
    };
    const srcRaw = get('source') || 'legacy_sheet';

    result.push({
      id: get('id'),
      name: get('name'),
      difficulty: diffRaw ? Number(diffRaw) : null,
      chapter: get('chapter') || get('章节') || '未分类',
      unit: get('unit') || get('单位') || null,
      errorRate: errRaw ? Number(errRaw) : null,
      dependencies: deps,
      notes: get('notes') || get('备注') || '',
      source: sourceMap[srcRaw] || 'legacy_sheet',
    });
  }

  return result;
}
