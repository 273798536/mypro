/**
 * 滴定管校准记录 - 核心业务逻辑
 * 
 * 功能：
 * 1. 温度曲线分析与安全备注一致性校验
 * 2. 称量精度判断
 * 3. 浓度换算（支持批次报告补录后联动更新）
 * 4. 异常分类（补材料 / 改口径 / 数据质量）
 */

function analyzeRecord(record) {
  const issues = [];

  issues.push(...analyzeTemperature(record));
  issues.push(...analyzeWeighing(record));
  issues.push(...analyzeConcentration(record));
  issues.push(...analyzeSafetyRemarkConsistency(record));

  return issues;
}

function analyzeTemperature(record) {
  const issues = [];
  const curve = record.temperatureCurve;
  if (!curve || curve.length < 2) return issues;

  const temps = curve.map(p => p.temp);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const fluctuation = maxTemp - minTemp;
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

  if (maxTemp > TEMP_THRESHOLD.MAX) {
    issues.push({
      id: `TEMP-OVER-${record.id}`,
      category: ANOMALY_CATEGORIES.DATA_QUALITY.code,
      severity: 'warning',
      title: '温度超出上限',
      detail: `最高温度 ${maxTemp.toFixed(1)}℃ 超过阈值 ${TEMP_THRESHOLD.MAX}℃`,
      evidence: { maxTemp, threshold: TEMP_THRESHOLD.MAX },
      nextStep: '确认温度超限是否影响校准结果，必要时安排复校'
    });
  }

  if (minTemp < TEMP_THRESHOLD.MIN) {
    issues.push({
      id: `TEMP-UNDER-${record.id}`,
      category: ANOMALY_CATEGORIES.DATA_QUALITY.code,
      severity: 'warning',
      title: '温度低于下限',
      detail: `最低温度 ${minTemp.toFixed(1)}℃ 低于阈值 ${TEMP_THRESHOLD.MIN}℃`,
      evidence: { minTemp, threshold: TEMP_THRESHOLD.MIN },
      nextStep: '确认温度超限是否影响校准结果，必要时安排复校'
    });
  }

  if (fluctuation > TEMP_THRESHOLD.FLUCTUATION) {
    issues.push({
      id: `TEMP-FLUC-${record.id}`,
      category: ANOMALY_CATEGORIES.DATA_QUALITY.code,
      severity: 'warning',
      title: '温度波动过大',
      detail: `温度波动 ${fluctuation.toFixed(1)}℃ 超过阈值 ${TEMP_THRESHOLD.FLUCTUATION}℃，从 ${minTemp.toFixed(1)}℃ 到 ${maxTemp.toFixed(1)}℃`,
      evidence: { fluctuation, threshold: TEMP_THRESHOLD.FLUCTUATION, minTemp, maxTemp },
      nextStep: '检查环境控制，确认波动是否对称量结果产生影响'
    });
  }

  record._tempAnalysis = { maxTemp, minTemp, fluctuation, avgTemp };
  return issues;
}

function analyzeWeighing(record) {
  const issues = [];
  const w = record.weighingData;

  if (w.actual === null || w.precision === null) {
    issues.push({
      id: `WEIGH-MISSING-${record.id}`,
      category: ANOMALY_CATEGORIES.MATERIAL.code,
      severity: 'error',
      title: '称量数据缺失',
      detail: '实际称量值和称量精度未填写',
      evidence: { actual: w.actual, precision: w.precision },
      nextStep: '补材料：补充称量数据后重新校验'
    });
    return issues;
  }

  if (w.precision > WEIGHING_PRECISION_THRESHOLD) {
    const deviation = Math.abs(w.actual - record.nominalVolume);
    issues.push({
      id: `WEIGH-PRECISION-${record.id}`,
      category: ANOMALY_CATEGORIES.CALIBRATION.code,
      severity: 'error',
      title: '称量精度不足',
      detail: `称量精度 ${w.precision.toFixed(4)}g 超过允许阈值 ${WEIGHING_PRECISION_THRESHOLD}g，标称 ${record.nominalVolume}mL 实称 ${w.actual.toFixed(4)}g，偏差 ${deviation.toFixed(4)}g`,
      evidence: { 
        precision: w.precision, 
        threshold: WEIGHING_PRECISION_THRESHOLD,
        nominal: record.nominalVolume,
        actual: w.actual,
        deviation: deviation
      },
      nextStep: '改口径：检查滴定管密封性和口径，或更换天平重新称量'
    });
  }

  const volumeDeviation = Math.abs(w.actual - record.nominalVolume);
  const allowedDeviation = record.nominalVolume * 0.001;
  if (volumeDeviation > allowedDeviation) {
    issues.push({
      id: `WEIGH-DEVIATION-${record.id}`,
      category: ANOMALY_CATEGORIES.CALIBRATION.code,
      severity: 'warning',
      title: '体积偏差超标',
      detail: `实际体积 ${w.actual.toFixed(4)}mL 与标称 ${record.nominalVolume}mL 偏差 ${volumeDeviation.toFixed(4)}mL，超过允许范围 ±${allowedDeviation.toFixed(4)}mL`,
      evidence: { actual: w.actual, nominal: record.nominalVolume, deviation: volumeDeviation, allowed: allowedDeviation },
      nextStep: '改口径：评估滴定管是否需要校准或更换'
    });
  }

  return issues;
}

function analyzeConcentration(record) {
  const issues = [];
  const c = record.concentration;
  const batch = record.batchReport;

  if (!batch && c.measured === null) {
    issues.push({
      id: `CONC-NODATA-${record.id}`,
      category: ANOMALY_CATEGORIES.MATERIAL.code,
      severity: 'info',
      title: '浓度待批次报告',
      detail: '暂无实测浓度和批次报告数据',
      evidence: { measured: c.measured, hasBatchReport: !!batch },
      nextStep: '补材料：批次报告送达后录入，系统将自动重新校验浓度'
    });
    return issues;
  }

  if (batch && batch.measuredConcentration !== undefined) {
    const relDev = Math.abs(batch.measuredConcentration - c.nominal) / c.nominal * 100;
    const threshold = 0.5;

    if (relDev > threshold) {
      issues.push({
        id: `CONC-DEVIATION-${record.id}`,
        category: ANOMALY_CATEGORIES.DATA_QUALITY.code,
        severity: 'warning',
        title: '浓度偏差超警戒',
        detail: `批次报告实测浓度 ${batch.measuredConcentration.toFixed(4)} ${c.unit} 与标称 ${c.nominal.toFixed(4)} ${c.unit} 偏差 ${relDev.toFixed(2)}%，超过警戒值 ${threshold}%`,
        evidence: { 
          measured: batch.measuredConcentration, 
          nominal: c.nominal, 
          relativeDeviation: relDev,
          threshold: threshold
        },
        nextStep: '评估该批次溶液是否可继续使用，或重新配制标准溶液'
      });
    } else {
      issues.push({
        id: `CONC-OK-${record.id}`,
        category: null,
        severity: 'success',
        title: '浓度校验通过',
        detail: `批次报告实测浓度 ${batch.measuredConcentration.toFixed(4)} ${c.unit}，与标称偏差 ${relDev.toFixed(2)}%，在允许范围内`,
        evidence: { measured: batch.measuredConcentration, nominal: c.nominal, relativeDeviation: relDev },
        nextStep: null
      });
    }

    record._concentrationCalculated = {
      ...c,
      measured: batch.measuredConcentration,
      uncertainty: batch.uncertainty,
      relativeDeviation: relDev,
      source: 'batchReport'
    };
  } else if (c.measured !== null) {
    const relDev = Math.abs(c.measured - c.nominal) / c.nominal * 100;
    record._concentrationCalculated = {
      ...c,
      relativeDeviation: relDev,
      source: 'manual'
    };
  }

  return issues;
}

function analyzeSafetyRemarkConsistency(record) {
  const issues = [];
  const remark = record.safetyRemark;
  const tempAnalysis = record._tempAnalysis;

  if (!tempAnalysis) return issues;
  if (!remark || !remark.systemGenerated) return issues;

  const sysText = remark.systemGenerated;
  let inconsistent = false;
  let inconsistencyDetail = [];

  if (tempAnalysis.maxTemp > TEMP_THRESHOLD.MAX && sysText.indexOf('正常') >= 0 && sysText.indexOf('偏高') < 0) {
    inconsistent = true;
    inconsistencyDetail.push(`系统备注标记"正常"，但温度最高 ${tempAnalysis.maxTemp.toFixed(1)}℃ 超过上限`);
  }

  if (tempAnalysis.minTemp < TEMP_THRESHOLD.MIN && sysText.indexOf('正常') >= 0 && sysText.indexOf('偏低') < 0) {
    inconsistent = true;
    inconsistencyDetail.push(`系统备注标记"正常"，但温度最低 ${tempAnalysis.minTemp.toFixed(1)}℃ 低于下限`);
  }

  if (tempAnalysis.fluctuation > TEMP_THRESHOLD.FLUCTUATION && sysText.indexOf('稳定') >= 0) {
    inconsistent = true;
    inconsistencyDetail.push(`系统备注标记"稳定"，但温度波动达 ${tempAnalysis.fluctuation.toFixed(1)}℃`);
  }

  if (tempAnalysis.maxTemp <= TEMP_THRESHOLD.MAX && tempAnalysis.minTemp >= TEMP_THRESHOLD.MIN 
      && tempAnalysis.fluctuation <= TEMP_THRESHOLD.FLUCTUATION 
      && (sysText.indexOf('偏高') >= 0 || sysText.indexOf('偏低') >= 0 || sysText.indexOf('超限') >= 0)) {
    inconsistent = true;
    inconsistencyDetail.push(`系统备注标记异常，但温度数据全部在正常范围内（${tempAnalysis.minTemp.toFixed(1)}~${tempAnalysis.maxTemp.toFixed(1)}℃，波动${tempAnalysis.fluctuation.toFixed(1)}℃）`);
  }

  if (inconsistent) {
    issues.push({
      id: `REMARK-MISMATCH-${record.id}`,
      category: ANOMALY_CATEGORIES.DATA_QUALITY.code,
      severity: 'warning',
      title: '安全备注与温度曲线不一致',
      detail: inconsistencyDetail.join('；'),
      evidence: { 
        systemRemark: sysText, 
        tempAnalysis: { 
          max: tempAnalysis.maxTemp, 
          min: tempAnalysis.minTemp, 
          fluctuation: tempAnalysis.fluctuation 
        }
      },
      nextStep: '核对温度曲线数据与安全备注，更新备注使之与实际数据一致'
    });
  }

  return issues;
}

function regenerateSafetyRemark(record) {
  const analysis = record._tempAnalysis || {};
  const temps = (record.temperatureCurve || []).map(p => p.temp);
  
  if (temps.length === 0) return '';

  const maxTemp = analysis.maxTemp !== undefined ? analysis.maxTemp : Math.max(...temps);
  const minTemp = analysis.minTemp !== undefined ? analysis.minTemp : Math.min(...temps);
  const fluctuation = analysis.fluctuation !== undefined ? analysis.fluctuation : (maxTemp - minTemp);
  const avgTemp = analysis.avgTemp !== undefined ? analysis.avgTemp : (temps.reduce((a,b) => a+b, 0) / temps.length);

  let remark = '';

  if (fluctuation <= TEMP_THRESHOLD.FLUCTUATION && maxTemp <= TEMP_THRESHOLD.MAX && minTemp >= TEMP_THRESHOLD.MIN) {
    remark = `温度稳定在${minTemp.toFixed(1)}-${maxTemp.toFixed(1)}℃范围内，平均${avgTemp.toFixed(1)}℃，符合校准环境要求`;
  } else if (maxTemp > TEMP_THRESHOLD.MAX) {
    remark = `温度偏高，最高${maxTemp.toFixed(1)}℃，波动${fluctuation.toFixed(1)}℃，注意体积修正`;
  } else if (minTemp < TEMP_THRESHOLD.MIN) {
    remark = `温度偏低，最低${minTemp.toFixed(1)}℃，波动${fluctuation.toFixed(1)}℃，注意体积修正`;
  } else {
    remark = `温度波动${fluctuation.toFixed(1)}℃（${minTemp.toFixed(1)}-${maxTemp.toFixed(1)}℃），超过正常波动范围，注意观察`;
  }

  return remark;
}
