const { parseCSV } = require('./parser');
const { validateHeaders, validateRow } = require('./validator');

const UNIT_TO_METERS = {
  'm': 1,
  'km': 1000,
  '里': 500
};

function runTrial(filePath, options = {}) {
  const { threshold = Infinity, expectedUnit = null, baseline = null } = options;
  const { headers, rows } = parseCSV(filePath);

  const headerErrors = validateHeaders(headers);
  if (headerErrors.length > 0) {
    return {
      success: false,
      error: `缺少必要列: ${headerErrors.join('、')}`,
      stats: null,
      details: null
    };
  }

  const processed = [];
  const badRows = [];
  const skippedRows = [];
  const duplicateRows = [];
  const seenIds = new Map();

  for (const row of rows) {
    const result = validateRow(row, headers);

    if (result.skipped) {
      skippedRows.push({
        lineNumber: row.lineNumber,
        raw: row.raw,
        reason: result.skipReason
      });
      continue;
    }

    if (!result.valid) {
      badRows.push({
        lineNumber: row.lineNumber,
        raw: row.raw,
        errors: result.errors,
        warnings: result.warnings
      });
      continue;
    }

    const data = result.data;

    if (seenIds.has(data.questionId)) {
      duplicateRows.push({
        lineNumber: row.lineNumber,
        raw: row.raw,
        questionId: data.questionId,
        firstLine: seenIds.get(data.questionId)
      });
      continue;
    }
    seenIds.set(data.questionId, row.lineNumber);

    const distanceInMeters = convertToMeters(data.distance, data.unit);
    const overThreshold = isFinite(threshold) && distanceInMeters > threshold;
    const unitMismatch = expectedUnit && data.unit !== expectedUnit;

    processed.push({
      lineNumber: row.lineNumber,
      questionId: data.questionId,
      start: data.start,
      end: data.end,
      distance: data.distance,
      unit: data.unit,
      distanceInMeters,
      overThreshold,
      unitMismatch,
      warnings: result.warnings
    });
  }

  const totalDistance = processed.reduce((sum, p) => sum + p.distanceInMeters, 0);
  const avgDistance = processed.length > 0 ? totalDistance / processed.length : 0;
  const overThresholdCount = processed.filter(p => p.overThreshold).length;
  const unitMismatchCount = processed.filter(p => p.unitMismatch).length;

  let jumpAnalysis = null;
  if (baseline && baseline.processedCount !== undefined) {
    jumpAnalysis = analyzeJump({
      baseline,
      current: {
        processedCount: processed.length,
        avgDistance,
        totalDistance,
        overThresholdCount,
        unitMismatchCount
      }
    }, processed);
  }

  return {
    success: true,
    stats: {
      totalRows: rows.length,
      processed: processed.length,
      badRows: badRows.length,
      skipped: skippedRows.length,
      duplicates: duplicateRows.length,
      totalDistance,
      avgDistance,
      overThresholdCount,
      unitMismatchCount
    },
    details: {
      processed,
      badRows,
      skippedRows,
      duplicateRows
    },
    jumpAnalysis,
    threshold,
    expectedUnit
  };
}

function convertToMeters(distance, unit) {
  const factor = UNIT_TO_METERS[unit] ?? 1;
  return distance * factor;
}

function analyzeJump({ baseline, current }, processedRows) {
  const diffs = {};
  const reasons = [];

  const countDiff = current.processedCount - baseline.processedCount;
  if (countDiff !== 0) {
    diffs.processedCount = countDiff;
    if (countDiff === 1) {
      reasons.push('单条记录增减');
    } else if (Math.abs(countDiff) > 1) {
      reasons.push(`记录数变化 ${countDiff > 0 ? '+' : ''}${countDiff} 条`);
    }
  }

  const avgDiff = current.avgDistance - (baseline.avgDistance || 0);
  if (avgDiff !== 0) {
    diffs.avgDistance = avgDiff;
  }

  if (current.overThresholdCount !== (baseline.overThresholdCount || 0)) {
    diffs.overThresholdCount = current.overThresholdCount - (baseline.overThresholdCount || 0);
    reasons.push('阈值筛选变化');
  }

  if (current.unitMismatchCount !== (baseline.unitMismatchCount || 0)) {
    diffs.unitMismatchCount = current.unitMismatchCount - (baseline.unitMismatchCount || 0);
    reasons.push('单位不匹配数量变化');
  }

  let singleRecordImpact = null;
  if (countDiff === 1 && processedRows.length > 0) {
    const lastRow = processedRows[processedRows.length - 1];
    singleRecordImpact = {
      questionId: lastRow.questionId,
      distanceInMeters: lastRow.distanceInMeters,
      impactOnAvg: avgDiff
    };
  }

  return {
    diffs,
    reasons,
    singleRecordImpact
  };
}

module.exports = { runTrial, convertToMeters };
