const DEVIATION_THRESHOLDS = {
  PASSED: 0.01,
  PENDING: 0.05,
  FAILED: Infinity
};

const LON_RANGE = { min: -180, max: 180 };
const LAT_RANGE = { min: -90, max: 90 };

const isValidCoordinate = (coord) => {
  if (!Array.isArray(coord) || coord.length !== 2) return false;
  const [lon, lat] = coord;
  if (typeof lon !== 'number' || typeof lat !== 'number') return false;
  if (isNaN(lon) || isNaN(lat)) return false;
  if (!isFinite(lon) || !isFinite(lat)) return false;
  if (lon < LON_RANGE.min || lon > LON_RANGE.max) return false;
  if (lat < LAT_RANGE.min || lat > LAT_RANGE.max) return false;
  return true;
};

const validateCoordinates = (coords) => {
  const errors = [];
  if (!coords || typeof coords !== 'object') {
    return { valid: false, errors: ['坐标数据缺失'] };
  }
  const corners = ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'];
  corners.forEach(corner => {
    if (!coords[corner]) {
      errors.push(`${corner} 坐标缺失`);
    } else if (!isValidCoordinate(coords[corner])) {
      errors.push(`${corner} 坐标格式无效或超出范围`);
    }
  });
  return { valid: errors.length === 0, errors };
};

export const calculateMatchRate = (baseCoords, labelCoords) => {
  const baseValidation = validateCoordinates(baseCoords);
  const labelValidation = validateCoordinates(labelCoords);
  
  if (!baseValidation.valid || !labelValidation.valid) {
    return {
      matchRate: 0,
      maxDeviation: 0,
      valid: false,
      errors: [...baseValidation.errors, ...labelValidation.errors]
    };
  }

  const corners = ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'];
  let totalDistance = 0;
  let maxDistance = 0;
  const cornerDeviations = {};

  corners.forEach(corner => {
    const base = baseCoords[corner];
    const label = labelCoords[corner];
    const distance = Math.sqrt(
      Math.pow(base[0] - label[0], 2) + Math.pow(base[1] - label[1], 2)
    );
    totalDistance += distance;
    maxDistance = Math.max(maxDistance, distance);
    cornerDeviations[corner] = parseFloat(distance.toFixed(6));
  });

  const avgDistance = totalDistance / 4;
  const matchRate = Math.max(0, 100 - avgDistance * 5000);

  return {
    matchRate: parseFloat(matchRate.toFixed(1)),
    maxDeviation: parseFloat(maxDistance.toFixed(4)),
    cornerDeviations,
    valid: true,
    errors: []
  };
};

const cornerNames = {
  bottomLeft: '左下角',
  bottomRight: '右下角',
  topLeft: '左上角',
  topRight: '右上角'
};

const findLargestDeviationCorner = (cornerDeviations) => {
  if (!cornerDeviations) return null;
  let maxCorner = null;
  let maxValue = -1;
  Object.entries(cornerDeviations).forEach(([corner, dev]) => {
    if (dev > maxValue) {
      maxValue = dev;
      maxCorner = corner;
    }
  });
  return maxCorner ? { corner: maxCorner, name: cornerNames[maxCorner] || maxCorner, value: maxValue } : null;
};

const formatCoordPair = (baseCoord, labelCoord) => {
  if (!baseCoord || !labelCoord) return '';
  const dx = (labelCoord[0] - baseCoord[0]).toFixed(6);
  const dy = (labelCoord[1] - baseCoord[1]).toFixed(6);
  const dxSign = dx >= 0 ? '+' : '';
  const dySign = dy >= 0 ? '+' : '';
  return `经度偏移${dxSign}${dx}，纬度偏移${dySign}${dy}`;
};

export const detectHitStatus = (matchRate, deviation, validation, cornerDeviations, baseCoords, labelCoords) => {
  if (validation && !validation.valid) {
    return {
      status: 'error',
      message: `数据异常：${validation.errors.join('；')}。底图坐标和标注草稿存在字段缺失或格式错误，无法完成比对，请检查原始数据。`,
      conflictType: 'invalid_data',
      explanation: {
        summary: '数据不完整，无法比对',
        details: validation.errors,
        action: '请回到原始表格或数据源，补全缺失的坐标字段后重新导入'
      }
    };
  }

  const worstCorner = findLargestDeviationCorner(cornerDeviations);
  const worstCoordDiff = worstCorner && baseCoords && labelCoords
    ? formatCoordPair(baseCoords[worstCorner.corner], labelCoords[worstCorner.corner])
    : '';

  if (deviation <= DEVIATION_THRESHOLDS.PASSED) {
    return {
      status: 'success',
      message: `底图坐标与标注草稿高度匹配，最大偏差 ${deviation.toFixed(4)}，匹配率 ${matchRate}%，可直接使用`,
      conflictType: 'none',
      explanation: {
        summary: '底图与标注一致，无需人工干预',
        details: [
          `四角最大偏差：${deviation.toFixed(4)}（≤ 允许阈值 ${DEVIATION_THRESHOLDS.PASSED}）`,
          `整体匹配率：${matchRate}%`,
          '底图坐标和标注草稿在误差范围内重合'
        ],
        action: '学生可直接使用此条记录的边界数据'
      }
    };
  } else if (deviation <= DEVIATION_THRESHOLDS.PENDING) {
    const cornerInfo = worstCorner
      ? `，最大偏差出现在${worstCorner.name}（偏差 ${worstCorner.value.toFixed(6)}${worstCoordDiff ? '，' + worstCoordDiff : ''}）`
      : '';
    return {
      status: 'pending',
      message: `坐标存在轻微偏差。最大偏差 ${deviation.toFixed(4)}（阈值 ${DEVIATION_THRESHOLDS.PASSED} ~ ${DEVIATION_THRESHOLDS.PENDING}）${cornerInfo}，请康复训练师复核`,
      conflictType: 'minor_deviation',
      explanation: {
        summary: '底图与标注存在可接受范围内的偏移，需人工确认',
        details: [
          `四角最大偏差：${deviation.toFixed(4)}`,
          `偏差阈值：顺利通过 ≤ ${DEVIATION_THRESHOLDS.PASSED}，待确认 ${DEVIATION_THRESHOLDS.PASSED} ~ ${DEVIATION_THRESHOLDS.PENDING}，异常 > ${DEVIATION_THRESHOLDS.PENDING}`,
          worstCorner ? `偏差最大位置：${worstCorner.name}，单角偏差 ${worstCorner.value.toFixed(6)}` : '',
          worstCoordDiff ? `坐标差异：${worstCoordDiff}` : '',
          `整体匹配率：${matchRate}%`
        ].filter(Boolean),
        action: '请康复训练师结合底图影像和现场情况判断该偏差是否可接受，可点击"在地图上查看"叠加对比边界'
      }
    };
  } else {
    const cornerInfo = worstCorner
      ? `，最大偏差出现在${worstCorner.name}（偏差 ${worstCorner.value.toFixed(6)}${worstCoordDiff ? '，' + worstCoordDiff : ''}）`
      : '';
    return {
      status: 'error',
      message: `坐标严重不匹配。最大偏差 ${deviation.toFixed(4)}，远超允许阈值 ${DEVIATION_THRESHOLDS.PENDING}${cornerInfo}，底图坐标与标注草稿差异过大，需重新处理`,
      conflictType: 'major_mismatch',
      explanation: {
        summary: '底图与标注严重偏离，数据不可用',
        details: [
          `四角最大偏差：${deviation.toFixed(4)}（> 异常阈值 ${DEVIATION_THRESHOLDS.PENDING}）`,
          worstCorner ? `偏差最大位置：${worstCorner.name}，单角偏差 ${worstCorner.value.toFixed(6)}` : '',
          worstCoordDiff ? `坐标差异：${worstCoordDiff}` : '',
          `整体匹配率：${matchRate}%`,
          '底图边界和标注边界可能不是同一地块，或标注过程中出现严重错误'
        ].filter(Boolean),
        action: '此条记录不可用，建议重新采集标注数据，或核对底图与标注是否对应同一地块'
      }
    };
  }
};

export const performHitDetection = (baseCoords, labelCoords) => {
  const matchResult = calculateMatchRate(baseCoords, labelCoords);
  const statusResult = detectHitStatus(
    matchResult.matchRate,
    matchResult.maxDeviation,
    { valid: matchResult.valid, errors: matchResult.errors },
    matchResult.cornerDeviations,
    baseCoords,
    labelCoords
  );

  return {
    status: statusResult.status,
    matchRate: matchResult.matchRate,
    deviation: matchResult.maxDeviation,
    cornerDeviations: matchResult.cornerDeviations || {},
    message: statusResult.message,
    conflictType: statusResult.conflictType,
    explanation: statusResult.explanation,
    valid: matchResult.valid,
    validationErrors: matchResult.errors
  };
};

export const calculateArea = (coordinates) => {
  const validation = validateCoordinates(coordinates);
  if (!validation.valid) {
    return 0;
  }
  
  const { bottomLeft, bottomRight, topLeft } = coordinates;
  const width = Math.abs(bottomRight[0] - bottomLeft[0]);
  const height = Math.abs(topLeft[1] - bottomLeft[1]);
  const avgLat = (bottomLeft[1] + topLeft[1]) / 2;
  const latFactor = Math.cos(avgLat * Math.PI / 180);
  const areaSquareKm = width * height * latFactor * 111 * 111;
  const areaMu = areaSquareKm * 1500;
  return parseFloat(areaMu.toFixed(2));
};

export const validateRecord = (record) => {
  const issues = [];
  
  if (!record.rowNumber && record.rowNumber !== 0) {
    issues.push('缺少原始行号');
  }
  if (!record.fieldName) {
    issues.push('缺少地块名称');
  }
  if (!record.sourceFile) {
    issues.push('缺少来源文件名');
  }
  
  const baseValidation = validateCoordinates(record.coordinates);
  const labelValidation = validateCoordinates(record.labelCoordinates);
  
  if (!baseValidation.valid) {
    issues.push(...baseValidation.errors.map(e => `底图${e}`));
  }
  if (!labelValidation.valid) {
    issues.push(...labelValidation.errors.map(e => `标注${e}`));
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};
