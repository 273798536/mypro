const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadInputMaterials(inputDir) {
  const materials = {
    normalRecords: [],
    gapRecords: [],
    repairNotes: [],
    supplementaryNotes: [],
    manifest: null
  };

  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (file === 'manifest.json') {
        materials.manifest = data;
      } else if (file.startsWith('normal_record_')) {
        materials.normalRecords.push({ ...data, _sourceFile: file });
      } else if (file.startsWith('gap_record_')) {
        materials.gapRecords.push({ ...data, _sourceFile: file });
      } else if (file.startsWith('repair_note_')) {
        materials.repairNotes.push({ ...data, _sourceFile: file });
      } else if (file.startsWith('supplementary_note_')) {
        materials.supplementaryNotes.push({ ...data, _sourceFile: file });
      }
    } catch (e) {
      console.warn(chalk.yellow(`  ⚠  跳过无法解析的文件: ${file}`));
    }
  }

  return materials;
}

function detectGaps(records) {
  const gaps = [];
  for (const rec of records) {
    const missingBands = [];
    const paramKeys = Object.keys(rec.parameters || {});
    for (const key of paramKeys) {
      if (rec.parameters[key] === null || rec.parameters[key] === undefined) {
        missingBands.push(key);
      }
    }
    if (missingBands.length > 0 || rec.hasGap) {
      gaps.push({
        recordId: rec.recordId,
        sourceFile: rec._sourceFile,
        venue: rec.venue,
        recordedAt: rec.recordedAt,
        missingBands: rec.gapBands || missingBands,
        remark: rec.remark || '',
        source: rec.source
      });
    }
  }
  return gaps;
}

function buildTraceability(record) {
  const traces = [];
  traces.push({
    recordId: record.recordId,
    version: record.version,
    recordedBy: record.recordedBy,
    recordedAt: record.recordedAt,
    venue: record.venue
  });
  if (record.equipment) {
    traces.push({ equipment: record.equipment });
  }
  if (record.source) {
    traces.push({ dataSource: record.source });
  }
  if (record._sourceFile) {
    traces.push({ sourceFile: record._sourceFile });
  }
  return traces;
}

function buildParameterWithTrace(record) {
  const params = record.parameters || {};
  const withTrace = {};
  for (const [key, value] of Object.entries(params)) {
    withTrace[key] = {
      value: value,
      trace: {
        recordId: record.recordId,
        version: record.version,
        sourceFile: record._sourceFile,
        recordedAt: record.recordedAt,
        recordedBy: record.recordedBy,
        venue: record.venue,
        dataSource: record.source
      }
    };
  }
  return withTrace;
}

async function askForConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(chalk.yellow(question + ' (y/N): '), (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function writeAnomalyQueue(outputDir, anomalies, gaps) {
  const queueFile = path.join(outputDir, 'anomaly_queue.json');
  const timestamp = new Date().toISOString();

  const queueData = {
    generatedAt: timestamp,
    status: 'pending_review',
    displayStatus: '待负责人确认',
    totalItems: anomalies.length + gaps.length,
    summary: {
      anomalies: anomalies.length,
      samplingGaps: gaps.length
    },
    items: [
      ...anomalies.map(a => ({
        type: 'anomaly',
        status: 'pending',
        displayStatus: '异常待处理',
        ...a
      })),
      ...gaps.map(g => ({
        type: 'sampling_gap',
        status: 'suspended',
        displayStatus: '已挂起-待补测确认',
        ...g
      }))
    ]
  };

  fs.writeFileSync(queueFile, JSON.stringify(queueData, null, 2), 'utf8');

  const readableFile = path.join(outputDir, '异常队列_阅读版.txt');
  const lines = [];
  lines.push('========================================');
  lines.push('  声学混响参数回放 - 异常队列（阅读版）');
  lines.push('  生成时间: ' + timestamp);
  lines.push('  当前状态: 待负责人确认');
  lines.push('========================================\n');
  lines.push(`异常项: ${anomalies.length} 条`);
  lines.push(`采样缺口: ${gaps.length} 条`);
  lines.push(`合计: ${anomalies.length + gaps.length} 条\n`);

  if (anomalies.length > 0) {
    lines.push('-------- 异常项 --------');
    for (let i = 0; i < anomalies.length; i++) {
      const a = anomalies[i];
      lines.push(`\n[${i + 1}] 状态: 异常待处理`);
      lines.push(`    记录ID: ${a.recordId}`);
      lines.push(`    场地: ${a.venue}`);
      lines.push(`    问题: ${a.description}`);
    }
  }

  if (gaps.length > 0) {
    lines.push('\n-------- 采样缺口 --------');
    for (let i = 0; i < gaps.length; i++) {
      const g = gaps[i];
      lines.push(`\n[${i + 1}] 状态: 已挂起-待补测确认`);
      lines.push(`    记录ID: ${g.recordId}`);
      lines.push(`    来源文件: ${g.sourceFile}`);
      lines.push(`    场地: ${g.venue}`);
      lines.push(`    测量时间: ${g.recordedAt}`);
      lines.push(`    缺失频段: ${g.missingBands.join(', ')}`);
      lines.push(`    备注: ${g.remark || '无'}`);
      if (g.source && g.source.note) {
        lines.push(`    数据来源说明: ${g.source.note}`);
      }
    }
  }

  lines.push('\n========================================');
  lines.push('  处理说明:');
  lines.push('  1. 采样缺口项不得给假稳定结论，需负责人确认补测');
  lines.push('  2. 补测完成后重新执行 playback 命令');
  lines.push('========================================');

  fs.writeFileSync(readableFile, lines.join('\n'), 'utf8');

  return { queueFile, readableFile };
}

function writePlaybackReport(outputDir, materials, tracedParams) {
  const reportFile = path.join(outputDir, 'playback_report.json');
  const timestamp = new Date().toISOString();

  const allRecords = [...materials.normalRecords, ...materials.gapRecords];

  const report = {
    generatedAt: timestamp,
    materialsSummary: {
      normalRecords: materials.normalRecords.length,
      gapRecords: materials.gapRecords.length,
      repairNotes: materials.repairNotes.length,
      supplementaryNotes: materials.supplementaryNotes.length
    },
    records: allRecords.map(r => ({
      recordId: r.recordId,
      version: r.version,
      venue: r.venue,
      recordedAt: r.recordedAt,
      recordedBy: r.recordedBy,
      hasGap: r.hasGap || false,
      traceability: buildTraceability(r),
      parametersWithTrace: buildParameterWithTrace(r)
    })),
    repairNotes: materials.repairNotes.map(n => ({
      noteId: n.noteId,
      venue: n.venue,
      equipment: n.equipment,
      issueType: n.issueType,
      versionTag: n.versionTag || '',
      status: n.status
    })),
    supplementaryNotes: materials.supplementaryNotes.map(n => ({
      noteId: n.noteId,
      relatedRecords: n.relatedRecords,
      content: n.content,
      nextAction: n.nextAction
    }))
  };

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  return reportFile;
}

function writeTerminalSummary(outputDir, result) {
  const summaryFile = path.join(outputDir, 'terminal_summary.txt');
  const timestamp = new Date().toISOString();
  const lines = [];

  lines.push('========================================');
  lines.push('  声学混响参数回放 - 终端摘要');
  lines.push('  生成时间: ' + timestamp);
  lines.push('========================================\n');

  lines.push('【材料统计】');
  lines.push(`  正常记录: ${result.materialCount.normal} 条`);
  lines.push(`  带缺口记录: ${result.materialCount.gap} 条`);
  lines.push(`  维修备注: ${result.materialCount.repair} 条`);
  lines.push(`  后补说明: ${result.materialCount.supplementary} 条\n`);

  lines.push('【回放结果】');
  lines.push(`  已回放参数记录: ${result.playedBack} 条`);
  lines.push(`  参数全部可追溯: ${result.allTraceable ? '是' : '否'}\n`);

  if (result.gaps.length > 0) {
    lines.push('【采样缺口】（已挂起，待负责人确认）');
    for (const g of result.gaps) {
      lines.push(`  - ${g.recordId} (${g.venue}): 缺失 ${g.missingBands.length} 个频段`);
    }
    lines.push('');
  }

  if (result.anomalies.length > 0) {
    lines.push('【异常项】');
    for (const a of result.anomalies) {
      lines.push(`  - ${a.recordId}: ${a.description}`);
    }
    lines.push('');
  }

  if (result.suspended) {
    lines.push('【状态】回放已挂起');
    lines.push('  原因: 存在采样缺口，未给出假稳定结论');
    lines.push('  下一步: 请负责人确认补测计划\n');
  } else if (result.hasErrors) {
    lines.push('【状态】存在异常');
    lines.push('  下一步: 请查看异常队列并处理\n');
  } else {
    lines.push('【状态】回放完成，一切正常\n');
  }

  lines.push('【输出文件】');
  lines.push(`  回放报告: ${result.reportFile}`);
  lines.push(`  异常队列(JSON): ${result.anomalyQueueFile}`);
  lines.push(`  异常队列(阅读版): ${result.anomalyReadableFile}`);
  lines.push(`  本摘要: ${summaryFile}`);

  fs.writeFileSync(summaryFile, lines.join('\n'), 'utf8');
  return summaryFile;
}

async function runPlayback({ inputDir, outputDir, nonInteractive }) {
  ensureDir(outputDir);

  const materials = loadInputMaterials(inputDir);
  const allRecords = [...materials.normalRecords, ...materials.gapRecords];

  const gaps = detectGaps(materials.gapRecords);
  const anomalies = [];

  for (const rec of materials.gapRecords) {
    if (!rec.source || !rec.source.logFile) {
      anomalies.push({
        recordId: rec.recordId,
        venue: rec.venue,
        description: '参数缺少数据来源线索，无法追溯数字从哪来',
        sourceFile: rec._sourceFile
      });
    }
  }

  for (const rec of materials.normalRecords) {
    if (!rec.source || !rec.source.logFile) {
      anomalies.push({
        recordId: rec.recordId,
        venue: rec.venue,
        description: '参数缺少数据来源线索，无法追溯数字从哪来',
        sourceFile: rec._sourceFile
      });
    }
  }

  const tracedParams = {};
  for (const rec of allRecords) {
    tracedParams[rec.recordId] = buildParameterWithTrace(rec);
  }

  let suspended = false;
  if (gaps.length > 0) {
    console.log(chalk.yellow('\n⚠  检测到采样缺口:'));
    for (const g of gaps) {
      console.log(chalk.yellow(`   - ${g.recordId} (${g.venue}): 缺失频段 ${g.missingBands.join(', ')}`));
    }

    if (nonInteractive) {
      console.log(chalk.yellow('\n⏸  非交互模式: 已自动挂起，等待负责人确认采样缺口。'));
      suspended = true;
    } else {
      console.log('');
      const confirmed = await askForConfirmation(
        `检测到 ${gaps.length} 条采样缺口。挂起等待负责人确认？（选N会尝试继续，但不会给假稳定结论）`
      );
      suspended = confirmed || gaps.length > 0;
      if (suspended) {
        console.log(chalk.yellow('⏸  已挂起，等待负责人确认后补测再重新回放。'));
      }
    }
  }

  const reportFile = writePlaybackReport(outputDir, materials, tracedParams);
  const { queueFile, readableFile } = writeAnomalyQueue(outputDir, anomalies, gaps);

  const result = {
    materialCount: {
      normal: materials.normalRecords.length,
      gap: materials.gapRecords.length,
      repair: materials.repairNotes.length,
      supplementary: materials.supplementaryNotes.length
    },
    playedBack: allRecords.length,
    allTraceable: anomalies.filter(a => a.description.includes('无法追溯')).length === 0,
    gaps,
    anomalies,
    suspended,
    hasErrors: anomalies.length > 0,
    reportFile,
    anomalyQueueFile: queueFile,
    anomalyReadableFile: readableFile
  };

  result.summaryFile = writeTerminalSummary(outputDir, result);

  return result;
}

module.exports = { runPlayback };
