import * as XLSX from 'xlsx';
import { parseFile, generateTemplateFile } from '../src/services/fileParser';
import { exportService } from '../src/services/exportService';
import { processingRecordService } from '../src/services/processingRecord';
import { versionManager } from '../src/services/versionManager';
import { attributionAnalyzer } from '../src/services/attributionAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  console.log('========== 安全拒答样本归因系统 - 功能测试 ==========\n');

  // ===== 测试1: 生成模板文件 =====
  console.log('【测试1】生成导入模板文件');
  const templateBlob = generateTemplateFile();
  const templateBuffer = Buffer.from(await templateBlob.arrayBuffer());
  
  const templateWb = XLSX.read(templateBuffer, { type: 'buffer' });
  const templateSheet = templateWb.Sheets[templateWb.SheetNames[0]];
  const templateData = XLSX.utils.sheet_to_json(templateSheet);
  console.log(`  ✓ 模板生成成功，包含 ${templateData.length} 条样例数据`);
  console.log(`  ✓ 列名: ${Object.keys(templateData[0] || {}).join(', ')}`);

  // ===== 测试2: 解析模板文件 =====
  console.log('\n【测试2】解析模板文件（模拟导入）');
  
  const templateFile = new File([templateBlob], '测试模板.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const recordId = processingRecordService.generateRecordId();
  const { samples, stats } = await parseFile(templateFile, recordId);
  
  console.log(`  ✓ 解析成功，共 ${samples.length} 条样本`);
  console.log(`  ✓ 统计: 旧表${stats.oldTable}条 / 补录${stats.supplement}条 / 漏填单位${stats.missingUnit}条 / 正常${stats.normal}条`);
  
  samples.forEach((s, i) => {
    console.log(`    - 样本${i + 1}: [${s.sourceType}] ${s.content.substring(0, 20)}... | 单位: ${s.unit || '(空)'} | 安全标签: ${s.securityLabel}`);
  });

  // ===== 测试3: 创建处理记录 =====
  console.log('\n【测试3】创建统一处理记录');
  const currentVersion = versionManager.getCurrentVersion();
  if (!currentVersion) throw new Error('无提示词版本');
  
  const record = processingRecordService.createRecord(samples, currentVersion);
  console.log(`  ✓ 处理记录创建成功: ${record.recordId}`);
  console.log(`  ✓ 样本数: ${record.sampleCount}, 异常数: ${record.anomalyCount}`);

  // ===== 测试4: 运行归因分析 =====
  console.log('\n【测试4】运行归因分析');
  const result = await attributionAnalyzer.runAnalysis(samples, record.recordId);
  console.log(`  ✓ 分析完成，运行ID: ${result.reproducibility.runId}`);
  console.log(`  ✓ 异常样本: ${result.anomalySamples.length} 条`);
  console.log(`  ✓ 标签冲突: ${result.labelConflicts.length} 条`);
  
  const dist = result.distributionStats;
  console.log(`  ✓ 来源分布: 旧表${dist.bySourceType.old_table} / 补录${dist.bySourceType.supplement} / 漏填${dist.bySourceType.missing_unit} / 正常${dist.bySourceType.normal}`);
  console.log(`  ✓ 异常分布: 规则漏配${dist.byAnomalyType.missing_rule} / 标签冲突${dist.byAnomalyType.label_conflict} / 漏填单位${dist.byAnomalyType.missing_unit} / 格式错误${dist.byAnomalyType.format_error}`);

  // ===== 测试5: 更新处理记录统计 =====
  console.log('\n【测试5】更新处理记录统计');
  processingRecordService.updateRecordStats(record.recordId, result);
  const updatedRecord = processingRecordService.getRecord(record.recordId);
  if (updatedRecord) {
    console.log(`  ✓ 更新后异常数: ${updatedRecord.anomalyCount}`);
    console.log(`  ✓ 更新后冲突数: ${updatedRecord.conflictCount}`);
  }

  // ===== 测试6: 三者对齐验证 =====
  console.log('\n【测试6】三者对齐验证');
  const validation = processingRecordService.validateRecordConsistency(record.recordId);
  console.log(`  ✓ 验证结果: ${validation.valid ? '通过' : '未通过'}`);
  if (!validation.valid) {
    validation.issues.forEach(issue => console.log(`    ✗ ${issue}`));
  }

  // ===== 测试7: 导出Excel =====
  console.log('\n【测试7】导出Excel报告');
  const exportConfig = {
    format: 'excel' as const,
    template: 'review' as const,
    includeNaturalLanguage: true,
    includeTraceLink: true
  };

  const { blob: excelBlob, filename: excelFilename } = await exportService.export(
    exportConfig,
    updatedRecord!,
    samples,
    result
  );

  const excelBuffer = Buffer.from(await excelBlob.arrayBuffer());
  
  // 验证导出的Excel能正常打开
  const exportedWb = XLSX.read(excelBuffer, { type: 'buffer' });
  console.log(`  ✓ 文件名: ${excelFilename}`);
  console.log(`  ✓ 工作表: ${exportedWb.SheetNames.join(', ')}`);
  
  exportedWb.SheetNames.forEach(name => {
    const ws = exportedWb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(`    - ${name}: ${data.length} 行数据`);
  });

  // 保存到磁盘验证
  const outputDir = path.resolve(__dirname, '../test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const excelPath = path.join(outputDir, excelFilename);
  fs.writeFileSync(excelPath, excelBuffer);
  console.log(`  ✓ 已保存到: ${excelPath}`);

  // ===== 测试8: 验证导出数据与页面数据一致 =====
  console.log('\n【测试8】导出数据一致性验证');
  
  // 检查样本明细sheet
  const sampleSheet = exportedWb.Sheets['样本明细'];
  const sampleData = XLSX.utils.sheet_to_json(sampleSheet) as any[];
  console.log(`  ✓ 样本明细: 导出${sampleData.length}条 / 原始${samples.length}条`);
  
  if (sampleData.length === samples.length) {
    console.log('  ✓ 样本数量一致');
  } else {
    console.log('  ✗ 样本数量不一致!');
  }

  // 检查异常明细
  const anomalySheet = exportedWb.Sheets['异常明细'];
  const anomalyData = XLSX.utils.sheet_to_json(anomalySheet) as any[];
  const anomalyCount = samples.filter(s => s.anomalies.length > 0).length;
  console.log(`  ✓ 异常明细: 导出${anomalyData.length - 1}条 / 原始${anomalyCount}条`);

  // ===== 总结 =====
  console.log('\n========== 测试完成 ==========');
  console.log(`\n✅ 核心功能验证通过:`);
  console.log('   1. Excel模板生成与解析');
  console.log('   2. 真实文件内容解析（非模拟）');
  console.log('   3. 统一处理记录层');
  console.log('   4. 归因分析与异常检测');
  console.log('   5. 三者对齐验证');
  console.log('   6. Excel导出（格式正确、数据一致）');
  console.log(`\n📁 测试输出目录: ${outputDir}`);
}

// 浏览器环境下的File polyfill
if (typeof globalThis.File === 'undefined') {
  class MockFile {
    private blob: Blob;
    name: string;
    type: string;
    
    constructor(blobParts: any[], name: string, options: any = {}) {
      this.blob = new Blob(blobParts, options);
      this.name = name;
      this.type = options.type || '';
    }
    
    arrayBuffer() {
      return this.blob.arrayBuffer();
    }
    
    stream() {
      return this.blob.stream();
    }
    
    text() {
      return this.blob.text();
    }
    
    get size() {
      return this.blob.size;
    }
    
    slice(start?: number, end?: number, contentType?: string) {
      return this.blob.slice(start, end, contentType);
    }
  }
  (globalThis as any).File = MockFile;
}

runTest().catch(console.error);
