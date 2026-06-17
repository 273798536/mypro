const { mockReports } = require('../data/mockData');

const UNIT_CONVERSIONS = {
  speed: {
    'm/s': { factor: 1, base: 'm/s' },
    'km/h': { factor: 1000 / 3600, base: 'm/s' },
    'kmph': { factor: 1000 / 3600, base: 'm/s' },
    'm/min': { factor: 1 / 60, base: 'm/s' }
  },
  length: {
    'mm': { factor: 0.001, base: 'm' },
    'cm': { factor: 0.01, base: 'm' },
    'm': { factor: 1, base: 'm' },
    'mm ': { factor: 0.001, base: 'm' }
  },
  angle: {
    '°': { factor: 1, base: '°' },
    'deg': { factor: 1, base: '°' },
    '度': { factor: 1, base: '°' }
  }
};

const MATERIAL_ALIASES = {
  '铝合金6061': ['6061铝合金', 'AL6061', '6061铝', '铝6061'],
  '不锈钢304': ['304不锈钢', 'SUS304', '304钢'],
  '碳纤维': ['碳纤', 'CFRP', '碳纤维复合材料']
};

function normalizeUnit(value, unit, category = 'speed') {
  const conversions = UNIT_CONVERSIONS[category];
  if (!conversions) {
    return { value, unit, isNormalized: false, note: '未知单位类别' };
  }
  const conversion = conversions[unit];
  if (!conversion) {
    return { value, unit, isNormalized: false, note: `未知单位: ${unit}` };
  }
  const normalizedValue = value * conversion.factor;
  return {
    value: normalizedValue,
    unit: conversion.base,
    originalValue: value,
    originalUnit: unit,
    isNormalized: true,
    factor: conversion.factor
  };
}

function checkUnitConsistency(samples) {
  const issues = [];
  const speedUnits = new Set();
  const angleUnits = new Set();

  samples.forEach(sample => {
    speedUnits.add(sample.windSpeedUnit || 'm/s');
    if (sample.attackAngle !== undefined) {
      angleUnits.add('°');
    }
  });

  if (speedUnits.size > 1) {
    issues.push({
      type: 'unit_mismatch',
      category: 'speed',
      units: Array.from(speedUnits),
      description: `速度单位不一致：${Array.from(speedUnits).join('、')}，已自动统一为 m/s`
    });
  }

  return issues;
}

function normalizeMaterialName(name) {
  for (const [standardName, aliases] of Object.entries(MATERIAL_ALIASES)) {
    if (name === standardName || aliases.includes(name)) {
      return {
        standardName,
        isNameConsistent: name === standardName,
        originalName: name,
        aliases
      };
    }
  }
  return {
    standardName: name,
    isNameConsistent: true,
    originalName: name,
    aliases: []
  };
}

function normalizeSampleUnits(samples) {
  return samples.map(sample => {
    const speedUnit = sample.windSpeedUnit || 'm/s';
    const normalized = normalizeUnit(sample.windSpeed, speedUnit, 'speed');

    let hasUnitIssue = sample.hasUnitIssue || false;
    let unitIssueNote = sample.unitIssueNote || '';

    if (!normalized.isNormalized) {
      return sample;
    }

    if (speedUnit !== 'm/s' && !sample.hasUnitIssue) {
      hasUnitIssue = true;
      unitIssueNote = `原始录入单位为 ${speedUnit}，与标准单位 m/s 不一致，已自动换算`;
    }

    return {
      ...sample,
      windSpeed: Math.round(normalized.value * 100) / 100,
      windSpeedUnit: 'm/s',
      originalWindSpeed: sample.windSpeed,
      originalWindSpeedUnit: speedUnit,
      hasUnitIssue,
      unitIssueNote
    };
  });
}

function checkAnomalies(samples) {
  const anomalies = [];

  samples.forEach(sample => {
    if (sample.anomalyType === 'direction') {
      anomalies.push({
        sampleId: sample.id,
        type: 'direction_error',
        severity: 'high',
        description: sample.anomalyDescription || '方向符号异常',
        processingResult: '异常数据，已标记，不可作为正常通过数据',
        sampleName: sample.name
      });
    }

    if (sample.hasUnitIssue) {
      anomalies.push({
        sampleId: sample.id,
        type: 'unit_mismatch',
        severity: 'medium',
        description: sample.unitIssueNote || '单位不一致，已换算',
        processingResult: '已统一单位，数据有效',
        sampleName: sample.name
      });
    }

    if (sample.isBoundary) {
      anomalies.push({
        sampleId: sample.id,
        type: 'boundary_sample',
        severity: 'info',
        description: sample.boundaryNote || '边界样本，对参数敏感',
        processingResult: '边界样本，需标注敏感性',
        sampleName: sample.name
      });
    }
  });

  return anomalies;
}

function unifySampleNotes(samples) {
  return samples.map(sample => {
    const unifiedNote = generateUnifiedNote(sample);
    return {
      ...sample,
      unifiedNote,
      notesConsistent: checkNotesConsistency(sample)
    };
  });
}

function generateUnifiedNote(sample) {
  let note = '';
  if (sample.isNormal) {
    note = `${sample.name}：${sample.flowStatus}`;
  } else if (sample.anomalyType === 'direction') {
    note = `⚠️ ${sample.name}：方向符号异常，数据待复核`;
  } else {
    note = `${sample.name}：${sample.flowStatus}`;
  }
  if (sample.hasUnitIssue) {
    note += `（单位已统一换算）`;
  }
  if (sample.isBoundary) {
    note += ` [边界样本]`;
  }
  return note;
}

function checkNotesConsistency(sample) {
  const sceneLabel = sample.sceneLabel || '';
  const sideNote = sample.sideNote || '';
  const screenshotNote = sample.screenshotNote || '';

  const hasCommonContent = (a, b) => {
    const keywords = ['分离', '附着', '攻角', '流速', '异常', '临界', '边界'];
    let count = 0;
    keywords.forEach(kw => {
      if (a.includes(kw) && b.includes(kw)) count++;
    });
    return count >= 2;
  };

  return {
    sceneAndSide: hasCommonContent(sceneLabel, sideNote),
    sceneAndScreenshot: hasCommonContent(sceneLabel, screenshotNote),
    sideAndScreenshot: hasCommonContent(sideNote, screenshotNote)
  };
}

function recalculateWithNewParams(reportId, newParams) {
  const report = mockReports.find(r => r.id === reportId);
  if (!report) {
    return { error: '报告不存在' };
  }

  const oldBaseWindSpeed = report.parameters.windSpeed.value;
  const newBaseWindSpeed = newParams.windSpeed !== undefined ? newParams.windSpeed : oldBaseWindSpeed;
  const oldBaseAngle = report.parameters.attackAngle.value;
  const newBaseAngle = newParams.attackAngle !== undefined ? newParams.attackAngle : oldBaseAngle;

  const speedFactor = newBaseWindSpeed / oldBaseWindSpeed;
  const angleOffset = newBaseAngle - oldBaseAngle;

  const normalizedSamples = normalizeSampleUnits(report.samples);

  const recalculatedSamples = normalizedSamples.map(sample => {
    const sampleOldAngle = sample.attackAngle;
    const sampleNewAngle = sampleOldAngle + angleOffset;
    const sampleOldSpeed = sample.windSpeed;
    const sampleNewSpeed = sampleOldSpeed * speedFactor;

    const newSeparationPoint = calculateSeparationPoint(
      sample.separationPoint,
      sampleOldAngle,
      sampleNewAngle,
      speedFactor
    );

    return {
      ...sample,
      attackAngle: Math.round(sampleNewAngle * 10) / 10,
      windSpeed: Math.round(sampleNewSpeed * 100) / 100,
      windSpeedUnit: 'm/s',
      separationPoint: newSeparationPoint,
      flowStatus: classifyFlow(newSeparationPoint),
      isBoundary: isNearBoundary(sampleNewAngle),
      boundaryNote: isNearBoundary(sampleNewAngle) ? '接近失速临界攻角，分离点对攻角变化敏感' : null,
      recalculated: true,
      changeReason: generateChangeReason(sample, sampleNewSpeed, sampleNewAngle, speedFactor, angleOffset)
    };
  });

  const unitIssues = checkUnitConsistency(recalculatedSamples);
  const anomalies = checkAnomalies(recalculatedSamples);

  const recordMaterialName = report.materialConclusion?.materialNameInRecord 
    || report.basicInfo?.materialAlias 
    || report.basicInfo?.specimenMaterial;
  const materialInfo = normalizeMaterialName(recordMaterialName);

  const unifiedSamples = unifySampleNotes(recalculatedSamples);

  return {
    reportId,
    originalParams: {
      windSpeed: oldBaseWindSpeed,
      attackAngle: oldBaseAngle
    },
    newParams: {
      windSpeed: newBaseWindSpeed,
      attackAngle: newBaseAngle
    },
    parameterChange: {
      windSpeedChange: newBaseWindSpeed - oldBaseWindSpeed,
      attackAngleChange: newBaseAngle - oldBaseAngle,
      speedFactor,
      angleOffset
    },
    samples: unifiedSamples,
    unitIssues,
    anomalies,
    materialInfo,
    formulas: report.formulas,
    overallConclusion: generateConclusion(unifiedSamples, materialInfo, unitIssues, anomalies)
  };
}

function calculateSeparationPoint(originalSepPoint, originalAngle, newAngle, speedFactor) {
  if (originalSepPoint === null) return null;

  const angleSensitivity = 0.05;
  let newSepPoint = originalSepPoint + (newAngle - originalAngle) * angleSensitivity;

  newSepPoint *= Math.pow(speedFactor, -0.3);

  newSepPoint = Math.max(0.05, Math.min(0.95, newSepPoint));

  return Math.round(newSepPoint * 100) / 100;
}

function classifyFlow(separationPoint) {
  if (separationPoint === null || separationPoint >= 0.9) return '附着流';
  if (separationPoint >= 0.6) return '小分离';
  if (separationPoint >= 0.3) return '中分离';
  return '大分离';
}

function isNearBoundary(angle) {
  return angle >= 10 && angle <= 14;
}

function generateChangeReason(sample, newWindSpeed, newAngle, speedFactor, angleDiff) {
  const reasons = [];

  if (sample.hasUnitIssue && sample.originalWindSpeed !== undefined) {
    reasons.push(`原始录入 ${sample.originalWindSpeed} ${sample.originalWindSpeedUnit || 'km/h'}，已统一为 ${sample.windSpeed} m/s`);
  }

  if (angleDiff !== 0) {
    reasons.push(`攻角从 ${sample.attackAngle}° 调整到 ${Math.round(newAngle * 10) / 10}°，变化 ${angleDiff > 0 ? '+' : ''}${angleDiff}°`);
  }
  if (speedFactor !== 1) {
    reasons.push(`流速变化因子 ${speedFactor.toFixed(3)}（${sample.windSpeed} → ${Math.round(newWindSpeed * 100) / 100} m/s），影响分离点位置`);
  }

  reasons.push('基于分离点经验公式：分离点前移量与攻角增量正相关，与流速负相关');

  return reasons.join('；');
}

function generateConclusion(samples, materialInfo, unitIssues, anomalies) {
  const normalCount = samples.filter(s => s.isNormal && !s.anomalyType).length;
  const anomalyCount = anomalies.filter(a => a.type !== 'boundary_sample' && a.type !== 'unit_mismatch').length;
  const boundaryCount = samples.filter(s => s.isBoundary).length;

  let conclusion = `本次复算包含 ${samples.length} 个样本，其中正常样本 ${normalCount} 个`;

  if (anomalyCount > 0) {
    conclusion += `，异常样本 ${anomalyCount} 个（已标记，不计入正常结论）`;
  }
  if (boundaryCount > 0) {
    conclusion += `，边界样本 ${boundaryCount} 个（需注意参数敏感性）`;
  }
  if (unitIssues.length > 0) {
    conclusion += `。发现单位不一致问题 ${unitIssues.length} 项，已统一换算`;
  }

  conclusion += `。材料"${materialInfo.originalName}"已统一为标准名称"${materialInfo.standardName}"，相关结论已关联。`;

  return conclusion;
}

function getReportById(reportId) {
  const report = mockReports.find(r => r.id === reportId);
  if (!report) return null;

  const normalizedSamples = normalizeSampleUnits(report.samples);
  const unitIssues = checkUnitConsistency(normalizedSamples);
  const anomalies = checkAnomalies(normalizedSamples);

  const recordMaterialName = report.materialConclusion?.materialNameInRecord 
    || report.basicInfo?.materialAlias 
    || report.basicInfo?.specimenMaterial;
  const materialInfo = normalizeMaterialName(recordMaterialName);

  const unifiedSamples = unifySampleNotes(normalizedSamples);

  return {
    ...report,
    samples: unifiedSamples,
    unitIssues,
    anomalies,
    materialInfo,
    overallConclusion: generateConclusion(unifiedSamples, materialInfo, unitIssues, anomalies)
  };
}

function getAllReports() {
  return mockReports.map(r => ({
    id: r.id,
    name: r.name,
    testDate: r.testDate,
    status: r.status,
    sampleCount: r.samples.length
  }));
}

function generateExportHtml(reportData) {
  const {
    id,
    name,
    testDate,
    basicInfo,
    samples,
    anomalies,
    materialInfo,
    formulas,
    overallConclusion,
    unitIssues
  } = reportData;

  const samplesHtml = samples.map(s => {
    const speedDisplay = s.hasUnitIssue && s.originalWindSpeed !== undefined
      ? `${s.windSpeed} ${s.windSpeedUnit} <span style="color:#718096;font-size:12px;">(原始: ${s.originalWindSpeed} ${s.originalWindSpeedUnit || 'km/h'})</span>`
      : `${s.windSpeed} ${s.windSpeedUnit}`;

    return `
    <div class="sample-card ${s.isNormal ? '' : 'anomaly'} ${s.isBoundary ? 'boundary' : ''}">
      <h4>${s.name} ${s.anomalyType === 'direction' ? '<span class="badge warning">方向异常</span>' : ''} ${s.isBoundary ? '<span class="badge info">边界样本</span>' : ''} ${s.hasUnitIssue ? '<span class="badge info">单位换算</span>' : ''}</h4>
      <div class="sample-grid">
        <div><strong>攻角：</strong>${s.attackAngle}°</div>
        <div><strong>流速：</strong>${speedDisplay}</div>
        <div><strong>分离点：</strong>${s.separationPoint ? (s.separationPoint * 100).toFixed(0) + '% 弦长' : '无分离'}</div>
        <div><strong>流动状态：</strong>${s.flowStatus}</div>
      </div>
      <div class="sample-notes">
        <p><strong>截图说明：</strong>${s.screenshotNote}</p>
        <p><strong>场景标注：</strong>${s.sceneLabel}</p>
        <p><strong>侧边说明：</strong>${s.sideNote}</p>
        <p><strong>统一说明：</strong>${s.unifiedNote}</p>
        ${s.changeReason ? `<p><strong>变化原因：</strong>${s.changeReason}</p>` : ''}
      </div>
      <div class="maintenance-info">
        <p><strong>维修备注：</strong>${s.maintenanceRemark || '-'}</p>
        <p><strong>处理记录：</strong>${s.processingRecord || '-'}</p>
      </div>
    </div>
  `}).join('');

  const anomaliesHtml = anomalies.length > 0 ? `
    <h3>异常与问题清单</h3>
    <table class="anomaly-table">
      <thead>
        <tr><th>样本</th><th>类型</th><th>严重程度</th><th>描述</th><th>处理结果</th></tr>
      </thead>
      <tbody>
        ${anomalies.map(a => `
          <tr class="${a.severity}">
            <td>${a.sampleName}</td>
            <td>${a.type === 'direction_error' ? '方向错误' : a.type === 'unit_mismatch' ? '单位不一致' : '边界样本'}</td>
            <td>${a.severity === 'high' ? '高' : a.severity === 'medium' ? '中' : '提示'}</td>
            <td>${a.description}</td>
            <td>${a.processingResult}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const formulasHtml = formulas.map(f => `
    <div class="formula-card">
      <h4>${f.name}</h4>
      <div class="formula-expr">${f.expression}</div>
      <p>${f.description}</p>
      <ul>
        ${Object.entries(f.variables).map(([k, v]) => `<li><strong>${k}</strong>：${v}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${name} - 风洞烟线试验报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a365d; border-bottom: 3px solid #2b6cb0; padding-bottom: 10px; }
    h2 { color: #2b6cb0; margin-top: 30px; }
    h3 { color: #2c5282; }
    .meta { color: #666; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f7fafc; padding: 15px; border-radius: 8px; }
    .sample-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .sample-card.anomaly { border-left: 4px solid #e53e3e; background: #fff5f5; }
    .sample-card.boundary { border-left: 4px solid #dd6b20; background: #fffaf0; }
    .sample-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
    .sample-notes { background: #f7fafc; padding: 10px; border-radius: 6px; margin: 10px 0; }
    .sample-notes p { margin: 5px 0; font-size: 14px; }
    .maintenance-info { border-top: 1px dashed #cbd5e0; padding-top: 10px; margin-top: 10px; font-size: 13px; color: #4a5568; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: normal; }
    .badge.warning { background: #fed7d7; color: #c53030; }
    .badge.info { background: #bee3f8; color: #2b6cb0; }
    .anomaly-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .anomaly-table th, .anomaly-table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    .anomaly-table th { background: #edf2f7; }
    .anomaly-table tr.high { background: #fff5f5; }
    .anomaly-table tr.medium { background: #fffff0; }
    .formula-card { background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .formula-expr { font-family: "Times New Roman", serif; font-size: 18px; background: #fff; padding: 10px; border-radius: 4px; text-align: center; margin: 10px 0; }
    .conclusion-box { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .material-link { background: #fefcbf; padding: 10px; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>风洞烟线试验报告</h1>
  <div class="meta">
    <p><strong>报告编号：</strong>${id} &nbsp;&nbsp; <strong>试验日期：</strong>${testDate}</p>
    <p><strong>试验名称：</strong>${name}</p>
  </div>

  <h2>一、基本信息</h2>
  <div class="info-grid">
    <div><strong>试件名称：</strong>${basicInfo.specimenName}</div>
    <div><strong>试验段：</strong>${basicInfo.testSection}</div>
    <div><strong>试验类型：</strong>${basicInfo.testType}</div>
    <div><strong>材料：</strong>${basicInfo.specimenMaterial}</div>
  </div>
  ${!materialInfo.isNameConsistent ? `
  <div class="material-link">
    <strong>材料名称关联：</strong>记录中"${materialInfo.originalName}"已统一为标准名称"${materialInfo.standardName}"，与试验结论关联
  </div>
  ` : ''}

  <h2>二、计算公式</h2>
  ${formulasHtml}

  ${anomaliesHtml}

  <h2>三、试验样本详情</h2>
  ${samplesHtml}

  <h2>四、结论</h2>
  <div class="conclusion-box">
    <p>${overallConclusion}</p>
  </div>

  <h2>五、使用说明</h2>
  <div style="background: #f7fafc; padding: 15px; border-radius: 8px;">
    <ol>
      <li><strong>放样例：</strong>在左侧样本列表点击任一样本，查看该工况下的烟线显示结果</li>
      <li><strong>重跑：</strong>调整攻角或流速参数后点击"重新计算"，系统将基于公式重新估算分离点位置</li>
      <li><strong>查看截图说明：</strong>每个样本卡片中均包含截图说明、场景标注和侧边说明，三者表述一致</li>
    </ol>
  </div>
</body>
</html>
  `;
}

module.exports = {
  getAllReports,
  getReportById,
  recalculateWithNewParams,
  generateExportHtml,
  normalizeUnit,
  checkUnitConsistency,
  normalizeMaterialName,
  checkAnomalies
};
