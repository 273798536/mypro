// 水质 COD 批量报告 - 导出模块
// 生成可发给非技术人员的报告文件，异常说明使用通俗语言

const Exporter = (function() {

  const SEVERITY_LABELS = {
    error: '需重视',
    warning: '请关注',
    info: '温馨提示'
  };

  function generateReadableExplanation(issue) {
    const explanations = {
      weighPrecisionLow: () => {
        return '称量时使用的天平精度不够（要求精确到万分之一克，即0.1mg）。' +
          '打个比方，就像用菜市场的秤去称金戒指，称出来的重量可能不准。' +
          '如果有条件建议换高精度天平重新称量；如果样品已经用完没法再测，就在报告里注明这个情况。';
      },
      weighRecordMissing: () => {
        return '称量单还没送到，或者关键的称量数据没填上。' +
          '没有称量记录就像做菜不知道放了多少盐，做出来的结果心里没底。' +
          '请让称量组尽快把称量单送过来，收到后重新算一遍。';
      },
      tempUnitMismatch: () => {
        return '同一批样品里，消解温度写了好几种单位（有的写摄氏度℃，有的写华氏度°F，有的写开尔文K）。' +
          '就像有人说今天30度，有人说今天86度，其实都是指同一天的温度，但单位不同。' +
          '已经自动换算成摄氏度了，建议复核温度是否在标准范围（146-150℃）内。';
      },
      unitMissing: () => {
        return '有些地方忘了写单位（比如温度、波长的单位没填）。' +
          '就像说"今天温度25"，不知道是摄氏度还是华氏度，容易让人误解。' +
          '请对照原始记录补上单位后再确认。';
      },
      oldFormatData: () => {
        return '这份样品用的是旧版记录表填写的。' +
          '旧表和新表的字段和单位可能不太一样，就像老版人民币和新版人民币，虽然都能用，但需要确认一下没搞错。' +
          '建议对照旧表原始记录，确认所有数值和单位都已经正确转换。';
      },
      digestionTempDeviation: () => {
        return `消解温度不在标准范围（146-150℃）内。` +
          '消解就像泡茶，水温不对的话泡出来的味道就不对。温度差太多可能影响结果的准确性。' +
          '如果温度偏差超过±2℃，建议重新消解再测；如果样品已经用完没法重做，就在报告里注明。';
      },
      digestionTimeDeviation: () => {
        return `消解时间不在标准范围（115-125分钟）内。` +
          '消解就像炖汤，时间不够没入味，时间太长又炖干了。时间不对可能影响氧化反应是否完全。' +
          '如果偏差超过±5分钟，建议重新消解再测；如果没法重做，就在报告里注明。';
      },
      absorbanceOutOfRange: () => {
        return '样品的吸光度太高，已经接近或超过仪器的线性范围上限。' +
          '就像用体温计去量开水，温度超过量程就测不准了。' +
          '建议把样品再稀释一下重新测，让吸光度落在仪器的可靠测量范围内。';
      },
      highConcentration: () => {
        return '这个样品的COD浓度比较高（超过400mg/L），已经按照稀释倍数换算好了。' +
          '请确认稀释操作时没有搞错倍数，高浓度样品建议做个平行样验证一下结果。';
      },
      patchedData: () => {
        return '这条记录是后来补录的。' +
          '补录的数据需要特别留意，就像事后补的笔记，容易和当时的实际情况有出入。' +
          '请和原始采样/检测记录核对一下，确保信息一致。';
      },
      spectrumAbnormal: () => {
        return '谱图的吸收峰位置不太对，最大吸光度不是出现在目标波长附近。' +
          '可能是比色皿里有气泡，或者样品有点浑浊，也可能是仪器没校准好。' +
          '建议检查一下比色皿，或者重新扫描一遍谱图看看。';
      }
    };
    const fn = explanations[issue.code];
    return fn ? fn() : (issue.description || '发现异常，请复核');
  }

  function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportSummaryCSV(processedData) {
    const p = processedData._processed || {};
    const headers = ['批次编号', '批次名称', '检测人', '复核人', '创建时间', '更新时间',
      '样品总数', '有异常的样品数', '异常总条数', '状态', '备注'];
    const row = [
      processedData.batchId,
      processedData.batchName,
      processedData.analyst,
      processedData.reviewer,
      processedData.createTime,
      processedData.updateTime,
      p.totalSamples,
      p.samplesWithAnomalies,
      p.totalAnomalies,
      processedData.status,
      processedData.remark
    ];
    return headers.map(escapeCSV).join(',') + '\n' + row.map(escapeCSV).join(',') + '\n';
  }

  function exportSamplesCSV(processedData) {
    const headers = [
      '序号',
      '样品编号',
      '样品名称',
      '样品类型',
      '采样点',
      '采样时间',
      '是否旧表',
      '吸光度',
      '稀释倍数',
      'COD浓度(mg/L)',
      '消解温度(℃，换算后)',
      '消解时间(分钟，换算后)',
      '称量精度',
      '天平型号',
      '异常数量',
      '严重异常数量',
      '需关注异常数量',
      '提示类异常数量',
      '异常汇总',
      '样品备注'
    ];
    const lines = [headers.map(escapeCSV).join(',')];
    processedData.samples.forEach((s, idx) => {
      const tempC = CoreLogic.convertTempToCelsius(
        s.reaction && s.reaction.digestionTemp,
        s.reaction && s.reaction.digestionTempUnit
      );
      const timeMin = CoreLogic.convertTimeToMinutes(
        s.reaction && s.reaction.digestionTime,
        s.reaction && s.reaction.digestionTimeUnit
      );
      const issues = s.calculation.issues || [];
      const severityCount = { error: 0, warning: 0, info: 0 };
      issues.forEach(iss => { severityCount[iss.severity] = (severityCount[iss.severity] || 0) + 1; });
      const issueSummary = issues.map(iss => `[${SEVERITY_LABELS[iss.severity] || iss.severity}]${iss.name}`).join('；');
      lines.push([
        idx + 1,
        s.sampleCode,
        s.sampleName,
        s.sampleType,
        s.collectPoint,
        s.collectTime,
        s.isOldFormat ? '是' : '否',
        s.spectrum ? s.spectrum.absorbance : '',
        s.calculation.dilutionFactor,
        s.calculation.finalConcentration !== null && s.calculation.finalConcentration !== undefined
          ? s.calculation.finalConcentration.toFixed(2) : '',
        tempC !== null ? tempC.toFixed(1) : '',
        timeMin !== null ? timeMin.toFixed(1) : '',
        s.weighRecord ? s.weighRecord.precisionLevel : '',
        s.weighRecord ? s.weighRecord.balanceModel : '',
        issues.length,
        severityCount.error,
        severityCount.warning,
        severityCount.info,
        issueSummary,
        s.remark
      ].map(escapeCSV).join(','));
    });
    return lines.join('\n') + '\n';
  }

  function exportAnomaliesCSV(processedData) {
    const headers = [
      '序号',
      '样品编号',
      '样品名称',
      '异常级别',
      '异常名称',
      '涉及字段',
      '专业说明',
      '通俗解释',
      '处理建议'
    ];
    const lines = [headers.map(escapeCSV).join(',')];
    let idx = 0;
    processedData.samples.forEach(s => {
      (s.calculation.issues || []).forEach(iss => {
        idx++;
        lines.push([
          idx,
          s.sampleCode,
          s.sampleName,
          SEVERITY_LABELS[iss.severity] || iss.severity,
          iss.name,
          iss.field || '',
          iss.description || '',
          generateReadableExplanation(iss),
          iss.suggestion || ''
        ].map(escapeCSV).join(','));
      });
    });
    return lines.join('\n') + '\n';
  }

  function exportQCCSV(processedData) {
    const qc = processedData.qualityControl;
    const headers = ['质控类型', '项目', '数值', '阈值/标准', '是否合格', '备注'];
    const lines = [headers.map(escapeCSV).join(',')];
    if (qc && qc.blankSample) {
      lines.push([
        '空白试验',
        '空白吸光度',
        qc.blankSample.absorbance,
        `≤${qc.blankSample.threshold}`,
        qc.blankSample.pass ? '合格' : '不合格',
        qc.blankSample.remark
      ].map(escapeCSV).join(','));
    }
    if (qc && qc.standardSample) {
      lines.push([
        '标准样品',
        '标准值',
        qc.standardSample.theoreticalValue + ' mg/L',
        '',
        '',
        ''
      ].map(escapeCSV).join(','));
      lines.push([
        '标准样品',
        '实测值',
        qc.standardSample.measuredValue !== null && qc.standardSample.measuredValue !== undefined
          ? qc.standardSample.measuredValue.toFixed(2) + ' mg/L' : '',
        `偏差≤${qc.standardSample.tolerance}%`,
        qc.standardSample.pass === null ? '未判定' : (qc.standardSample.pass ? '合格' : '不合格'),
        qc.standardSample.remark + (qc.standardSample.deviationPercent !== undefined ? ` 偏差${qc.standardSample.deviationPercent.toFixed(2)}%` : '')
      ].map(escapeCSV).join(','));
    }
    if (qc && qc.parallelSample) {
      lines.push([
        '平行样',
        '平行样1吸光度',
        qc.parallelSample.sample1Abs,
        '',
        '',
        ''
      ].map(escapeCSV).join(','));
      lines.push([
        '平行样',
        '平行样2吸光度',
        qc.parallelSample.sample2Abs,
        '',
        '',
        ''
      ].map(escapeCSV).join(','));
      lines.push([
        '平行样',
        '相对偏差',
        qc.parallelSample.relativeDeviation !== null && qc.parallelSample.relativeDeviation !== undefined
          ? qc.parallelSample.relativeDeviation.toFixed(2) + '%' : '',
        `≤${qc.parallelSample.threshold}%`,
        qc.parallelSample.pass === null ? '未判定' : (qc.parallelSample.pass ? '合格' : '不合格'),
        qc.parallelSample.remark
      ].map(escapeCSV).join(','));
    }
    const sc = processedData.standardCurve;
    if (sc) {
      lines.push([
        '标准曲线',
        '曲线方程',
        sc.equation,
        '',
        '',
        ''
      ].map(escapeCSV).join(','));
      lines.push([
        '标准曲线',
        '相关系数R²',
        sc.rSquare,
        '≥0.999',
        sc.rSquare >= 0.999 ? '合格' : '不合格',
        ''
      ].map(escapeCSV).join(','));
    }
    return lines.join('\n') + '\n';
  }

  function exportFullReport(processedData) {
    const sections = [
      '====== 水质 COD 批量检测报告 ======',
      '',
      '【第一部分：批次概要】',
      exportSummaryCSV(processedData),
      '',
      '【第二部分：质控情况】',
      exportQCCSV(processedData),
      '',
      '【第三部分：样品结果明细】',
      exportSamplesCSV(processedData),
      '',
      '【第四部分：异常与处理建议（通俗解释版）】',
      exportAnomaliesCSV(processedData),
      '',
      '====== 报告结束 ======'
    ];
    return sections.join('\n');
  }

  function downloadCSV(content, filename) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateFilename(processedData, suffix) {
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${processedData.batchId}_${suffix}_${ts}.csv`;
  }

  return {
    exportSummaryCSV,
    exportSamplesCSV,
    exportAnomaliesCSV,
    exportQCCSV,
    exportFullReport,
    downloadCSV,
    generateFilename,
    generateReadableExplanation,
    SEVERITY_LABELS
  };
})();
