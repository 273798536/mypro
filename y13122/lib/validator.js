const REQUIRED_HEADERS = ['题目ID', '起点', '终点', '距离', '单位'];

function validateHeaders(headers) {
  const missing = [];
  for (const h of REQUIRED_HEADERS) {
    if (!headers.includes(h)) {
      missing.push(h);
    }
  }
  return missing;
}

function validateRow(row, headers) {
  const errors = [];
  const warnings = [];

  if (row.empty) {
    return { valid: false, errors: ['空行'], warnings: [], skipped: true, skipReason: '空行跳过' };
  }

  const idx = (name) => headers.indexOf(name);
  const get = (name) => row.values[idx(name)]?.trim() ?? '';

  const questionId = get('题目ID');
  const start = get('起点');
  const end = get('终点');
  const distance = get('距离');
  const unit = get('单位');

  if (!questionId) {
    errors.push('题目ID为空');
  }

  if (!start) {
    errors.push('起点为空');
  }

  if (!end) {
    errors.push('终点为空');
  }

  if (!distance) {
    errors.push('距离为空');
  } else if (isNaN(Number(distance))) {
    errors.push(`距离不是数字: "${distance}"`);
  } else if (Number(distance) <= 0) {
    errors.push(`距离必须大于0: ${distance}`);
  }

  if (!unit) {
    errors.push('单位为空');
  } else if (!['m', 'km', '里'].includes(unit)) {
    warnings.push(`单位不常见: "${unit}"`);
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    skipped: false,
    skipReason: null,
    data: valid ? {
      questionId,
      start,
      end,
      distance: Number(distance),
      unit,
      raw: row.raw
    } : null
  };
}

module.exports = { validateHeaders, validateRow };
