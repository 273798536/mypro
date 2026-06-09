// 水质 COD 批量报告 - 核心业务逻辑
// 所有计算、校验、判读都在此统一处理，确保图表、明细、导出共用同一批结果

const CoreLogic = (function() {

  const TEMP_UNITS = ['℃', 'F', 'K', ''];
  const STANDARD_DIGESTION_TEMP_MIN = 146;
  const STANDARD_DIGESTION_TEMP_MAX = 150;
  const STANDARD_DIGESTION_TIME_MIN = 115;
  const STANDARD_DIGESTION_TIME_MAX = 125;
  const REQUIRED_WEIGH_PRECISION = '0.1mg';
  const ABSORBANCE_LINEAR_MAX = 1.200;
  const HIGH_CONCENTRATION_THRESHOLD = 400;

  function convertTempToCelsius(value, unit) {
    if (value === null || value === undefined || isNaN(value)) return null;
    const u = (unit || '').trim().toUpperCase();
    if (u === 'C' || u === '℃' || u === '') return value;
    if (u === 'F') return (value - 32) * 5 / 9;
    if (u === 'K') return value - 273.15;
    return value;
  }

  function convertTimeToMinutes(value, unit) {
    if (value === null || value === undefined || isNaN(value)) return null;
    const u = (unit || '').trim().toLowerCase();
    if (u === 'min' || u === 'minute' || u === 'minutes' || u === '') return value;
    if (u === 'h' || u === 'hour' || u === 'hours') return value * 60;
    if (u === 's' || u === 'sec' || u === 'second' || u === 'seconds') return value / 60;
    return value;
  }

  function calcPrecisionLevel(precisionStr) {
    if (!precisionStr) return 1000;
    const s = precisionStr.toLowerCase().trim();
    if (s.includes('0.1mg') || s.includes('0.1毫克')) return 0.0001;
    if (s.includes('0.01g') || s.includes('0.01克')) return 0.01;
    if (s.includes('0.1g') || s.includes('0.1克')) return 0.1;
    if (s.includes('1mg') || s.includes('1毫克')) return 0.001;
    return 1;
  }

  function isWeighPrecisionSufficient(precisionStr) {
    const level = calcPrecisionLevel(precisionStr);
    return level <= 0.0001;
  }

  function calculateCODConcentration(absorbance, slope, intercept, dilutionFactor) {
    if (absorbance === null || absorbance === undefined || isNaN(absorbance)) return null;
    if (!slope || slope === 0) return null;
    const df = dilutionFactor || 1;
    const raw = (absorbance - intercept) / slope;
    return {
      raw: Math.max(0, raw),
      final: Math.max(0, raw) * df
    };
  }

  function checkSpectrumPeak(points, targetWl) {
    if (!points || points.length < 3) return { valid: true, reason: '数据点不足，跳过谱图检查' };
    const target = points.find(p => p.wl === targetWl) || points[Math.floor(points.length / 2)];
    const sorted = [...points].sort((a, b) => b.abs - a.abs);
    const isPeak = Math.abs(sorted[0].wl - targetWl) <= 10;
    if (!isPeak) {
      return { valid: false, reason: `最大吸光度出现在${sorted[0].wl}nm，不是目标波长${targetWl}nm附近，请核对谱图` };
    }
    return { valid: true, reason: '谱图正常，目标波长为吸收峰' };
  }

  function detectAnomalies(sample, batchContext) {
    const issues = [];

    if (sample.isOldFormat) {
      issues.push({
        code: 'oldFormatData',
        ...ANOMALY_RULES.oldFormatData,
        field: '整体记录',
        detail: '样品使用旧版记录表录入'
      });
    }

    if (sample.remark && (sample.remark.includes('补录') || sample.remark.includes('补填'))) {
      issues.push({
        code: 'patchedData',
        ...ANOMALY_RULES.patchedData,
        field: '备注',
        detail: sample.remark
      });
    }

    const wr = sample.weighRecord || {};
    if (!wr.weighSheetId || wr.sampleWeight === null || wr.sampleWeight === undefined || wr.sampleWeight === '') {
      issues.push({
        code: 'weighRecordMissing',
        ...ANOMALY_RULES.weighRecordMissing,
        field: '称量数据',
        detail: wr.remark || '称量单缺失'
      });
    } else {
      if (wr.precisionLevel && !isWeighPrecisionSufficient(wr.precisionLevel)) {
        issues.push({
          code: 'weighPrecisionLow',
          ...ANOMALY_RULES.weighPrecisionLow,
          field: '称量精度',
          detail: `当前精度：${wr.precisionLevel}（天平型号：${wr.balanceModel || '未记录'}），要求精度：${REQUIRED_WEIGH_PRECISION}。${wr.remark || ''}`
        });
      }
    }

    const rx = sample.reaction || {};
    if (!rx.digestionTempUnit) {
      issues.push({
        code: 'unitMissing',
        ...ANOMALY_RULES.unitMissing,
        field: '消解温度单位',
        detail: '消解温度单位未填写，请确认是摄氏度(℃)、华氏度(°F)还是开尔文(K)'
      });
    }

    const tempC = convertTempToCelsius(rx.digestionTemp, rx.digestionTempUnit);
    const timeMin = convertTimeToMinutes(rx.digestionTime, rx.digestionTimeUnit);

    if (batchContext && batchContext.tempUnitsInBatch && batchContext.tempUnitsInBatch.size > 1) {
      issues.push({
        code: 'tempUnitMismatch',
        ...ANOMALY_RULES.tempUnitMismatch,
        field: '温度单位',
        detail: `本批样品使用了${batchContext.tempUnitsInBatch.size}种温度单位：${[...batchContext.tempUnitsInBatch].filter(u=>u).join('、') || '未知'}`
      });
    }

    if (tempC !== null && (tempC < STANDARD_DIGESTION_TEMP_MIN || tempC > STANDARD_DIGESTION_TEMP_MAX)) {
      issues.push({
        code: 'digestionTempDeviation',
        ...ANOMALY_RULES.digestionTempDeviation,
        field: '消解温度',
        detail: `换算后温度：${tempC.toFixed(1)}℃（原值：${rx.digestionTemp}${rx.digestionTempUnit}），标准范围：${STANDARD_DIGESTION_TEMP_MIN}-${STANDARD_DIGESTION_TEMP_MAX}℃`
      });
    }

    if (timeMin !== null && (timeMin < STANDARD_DIGESTION_TIME_MIN || timeMin > STANDARD_DIGESTION_TIME_MAX)) {
      issues.push({
        code: 'digestionTimeDeviation',
        ...ANOMALY_RULES.digestionTimeDeviation,
        field: '消解时间',
        detail: `换算后时间：${timeMin.toFixed(1)}分钟（原值：${rx.digestionTime}${rx.digestionTimeUnit}），标准范围：${STANDARD_DIGESTION_TIME_MIN}-${STANDARD_DIGESTION_TIME_MAX}分钟`
      });
    }

    const sp = sample.spectrum || {};
    if (!sp.wavelengthUnit) {
      issues.push({
        code: 'unitMissing',
        ...ANOMALY_RULES.unitMissing,
        field: '波长单位',
        detail: '检测波长单位未填写，通常为nm'
      });
    }

    if (sp.absorbance !== null && sp.absorbance !== undefined && sp.absorbance >= ABSORBANCE_LINEAR_MAX * 0.9) {
      issues.push({
        code: 'absorbanceOutOfRange',
        ...ANOMALY_RULES.absorbanceOutOfRange,
        field: '吸光度',
        detail: `吸光度${sp.absorbance.toFixed(4)}，接近或超过线性上限${ABSORBANCE_LINEAR_MAX}`
      });
    }

    const spectrumCheck = checkSpectrumPeak(sp.rawDataPoints, sp.wavelength);
    if (!spectrumCheck.valid) {
      issues.push({
        code: 'spectrumAbnormal',
        name: '谱图判读异常',
        severity: 'warning',
        description: '吸收峰位置异常',
        suggestion: '请检查比色皿是否有气泡、样品是否浑浊，或重新扫描谱图',
        field: '谱图',
        detail: spectrumCheck.reason
      });
    }

    return issues;
  }

  function processBatch(rawData) {
    const data = JSON.parse(JSON.stringify(rawData));

    const tempUnitsInBatch = new Set();
    data.samples.forEach(s => {
      const u = (s.reaction && s.reaction.digestionTempUnit) || '';
      tempUnitsInBatch.add(u);
    });

    const qc = data.qualityControl;
    if (qc && qc.standardSample) {
      const stdCalc = calculateCODConcentration(
        qc.standardSample.absorbance,
        data.standardCurve.slope,
        data.standardCurve.intercept,
        1
      );
      if (stdCalc) {
        qc.standardSample.measuredValue = stdCalc.final;
        const deviation = Math.abs(stdCalc.final - qc.standardSample.theoreticalValue) / qc.standardSample.theoreticalValue * 100;
        qc.standardSample.pass = deviation <= qc.standardSample.tolerance;
        qc.standardSample.deviationPercent = deviation;
      }
    }
    if (qc && qc.parallelSample) {
      const relDev = Math.abs(qc.parallelSample.sample1Abs - qc.parallelSample.sample2Abs) /
        ((qc.parallelSample.sample1Abs + qc.parallelSample.sample2Abs) / 2) * 100;
      qc.parallelSample.relativeDeviation = relDev;
      qc.parallelSample.pass = relDev <= qc.parallelSample.threshold;
    }

    data.samples.forEach(sample => {
      const calc = sample.calculation;
      const abs = sample.spectrum && sample.spectrum.absorbance;

      if (abs !== null && abs !== undefined && !isNaN(abs)) {
        const result = calculateCODConcentration(
          abs,
          calc.standardCurveSlope || data.standardCurve.slope,
          calc.standardCurveIntercept || data.standardCurve.intercept,
          calc.dilutionFactor
        );
        if (result) {
          calc.rawConcentration = result.raw;
          calc.finalConcentration = result.final;

          if (result.final > HIGH_CONCENTRATION_THRESHOLD) {
            sample._highConc = true;
          }
        }
      }

      const issues = detectAnomalies(sample, { tempUnitsInBatch });
      if (sample._highConc) {
        issues.push({
          code: 'highConcentration',
          ...ANOMALY_RULES.highConcentration,
          field: '浓度结果',
          detail: `计算浓度：${calc.finalConcentration ? calc.finalConcentration.toFixed(1) : 'N/A'}${calc.concentrationUnit}，稀释倍数：${calc.dilutionFactor}倍`
        });
      }
      calc.issues = issues;
    });

    const anomalySummary = {};
    let totalAnomalies = 0;
    let samplesWithAnomalies = 0;

    data.samples.forEach(s => {
      const issues = s.calculation.issues || [];
      if (issues.length > 0) samplesWithAnomalies++;
      issues.forEach(iss => {
        totalAnomalies++;
        if (!anomalySummary[iss.code]) {
          anomalySummary[iss.code] = {
            code: iss.code,
            name: iss.name,
            severity: iss.severity,
            count: 0,
            sampleIds: []
          };
        }
        anomalySummary[iss.code].count++;
        if (!anomalySummary[iss.code].sampleIds.includes(s.id)) {
          anomalySummary[iss.code].sampleIds.push(s.id);
        }
      });
    });

    data._processed = {
      tempUnitsInBatch: [...tempUnitsInBatch],
      anomalySummary: Object.values(anomalySummary),
      totalAnomalies,
      samplesWithAnomalies,
      totalSamples: data.samples.length,
      processTime: new Date().toISOString()
    };

    return data;
  }

  function getTraceabilityChain(processedData, sampleId) {
    const sample = processedData.samples.find(s => s.id === sampleId);
    if (!sample) return null;

    const chain = [];

    chain.push({
      step: '异常结果',
      items: (sample.calculation.issues || []).map(iss => ({
        label: iss.name,
        value: iss.detail || iss.description,
        severity: iss.severity
      }))
    });

    if (sample.calculation && sample.calculation.finalConcentration !== null) {
      chain.push({
        step: '浓度计算',
        items: [
          { label: '最终浓度', value: `${sample.calculation.finalConcentration.toFixed(2)} ${sample.calculation.concentrationUnit}` },
          { label: '原始浓度', value: sample.calculation.rawConcentration !== null ? `${sample.calculation.rawConcentration.toFixed(2)} ${sample.calculation.concentrationUnit}` : 'N/A' },
          { label: '稀释倍数', value: `${sample.calculation.dilutionFactor}倍` },
          { label: '标准曲线', value: `A = ${sample.calculation.standardCurveSlope}C + ${sample.calculation.standardCurveIntercept}` }
        ]
      });
    } else {
      chain.push({
        step: '浓度计算',
        items: [{ label: '状态', value: '数据不全，暂无法计算' }]
      });
    }

    if (sample.spectrum) {
      chain.push({
        step: '谱图判读',
        items: [
          { label: '吸光度', value: sample.spectrum.absorbance ? sample.spectrum.absorbance.toFixed(4) : 'N/A' },
          { label: '检测波长', value: `${sample.spectrum.wavelength}${sample.spectrum.wavelengthUnit || '(未填)'}` },
          { label: '仪器型号', value: sample.spectrum.instrument || 'N/A' },
          { label: '测定时间', value: sample.spectrum.measureTime || 'N/A' }
        ]
      });
    }

    if (sample.reaction) {
      const tempC = convertTempToCelsius(sample.reaction.digestionTemp, sample.reaction.digestionTempUnit);
      const timeMin = convertTimeToMinutes(sample.reaction.digestionTime, sample.reaction.digestionTimeUnit);
      chain.push({
        step: '反应条件',
        items: [
          { label: '消解温度(原值)', value: `${sample.reaction.digestionTemp}${sample.reaction.digestionTempUnit || '(未填)'}` },
          { label: '消解温度(换算为℃)', value: tempC !== null ? `${tempC.toFixed(1)}℃` : 'N/A' },
          { label: '消解时间(原值)', value: `${sample.reaction.digestionTime}${sample.reaction.digestionTimeUnit || '(未填)'}` },
          { label: '消解时间(换算为分钟)', value: timeMin !== null ? `${timeMin.toFixed(1)}分钟` : 'N/A' },
          { label: '试剂批号', value: sample.reaction.reagentBatch || 'N/A' },
          { label: '催化剂批号', value: sample.reaction.catalystBatch || 'N/A' },
          { label: '备注', value: sample.reaction.remark || '无' }
        ]
      });
    }

    if (sample.weighRecord) {
      chain.push({
        step: '称量记录',
        items: [
          { label: '称量单号', value: sample.weighRecord.weighSheetId || '(缺失)' },
          { label: '称量时间', value: sample.weighRecord.weighTime || '(缺失)' },
          { label: '样品重量', value: sample.weighRecord.sampleWeight !== null && sample.weighRecord.sampleWeight !== undefined ? `${sample.weighRecord.sampleWeight}${sample.weighRecord.sampleWeightUnit || ''}` : '(缺失)' },
          { label: '天平型号', value: sample.weighRecord.balanceModel || 'N/A' },
          { label: '称量精度', value: sample.weighRecord.precisionLevel || 'N/A' },
          { label: '操作员', value: sample.weighRecord.operator || 'N/A' },
          { label: '备注', value: sample.weighRecord.remark || '无' }
        ]
      });
    }

    chain.push({
      step: '样品信息',
      items: [
        { label: '样品编号', value: sample.sampleCode },
        { label: '样品名称', value: sample.sampleName },
        { label: '样品类型', value: sample.sampleType || 'N/A' },
        { label: '采样点', value: sample.collectPoint || 'N/A' },
        { label: '采样时间', value: sample.collectTime || 'N/A' },
        { label: '是否旧表', value: sample.isOldFormat ? '是' : '否' },
        { label: '备注', value: sample.remark || '无' }
      ]
    });

    const uniqueIssues = {};
    (sample.calculation.issues || []).forEach(iss => {
      if (!uniqueIssues[iss.code]) {
        uniqueIssues[iss.code] = iss;
      }
    });

    return {
      sampleId: sample.id,
      sampleCode: sample.sampleCode,
      sampleName: sample.sampleName,
      chain: chain.reverse(),
      opinions: Object.values(uniqueIssues).map(iss => ({
        name: iss.name,
        severity: iss.severity,
        description: iss.description,
        suggestion: iss.suggestion
      }))
    };
  }

  return {
    convertTempToCelsius,
    convertTimeToMinutes,
    calculateCODConcentration,
    detectAnomalies,
    processBatch,
    getTraceabilityChain,
    isWeighPrecisionSufficient,
    STANDARD_DIGESTION_TEMP_MIN,
    STANDARD_DIGESTION_TEMP_MAX,
    STANDARD_DIGESTION_TIME_MIN,
    STANDARD_DIGESTION_TIME_MAX,
    REQUIRED_WEIGH_PRECISION
  };
})();
