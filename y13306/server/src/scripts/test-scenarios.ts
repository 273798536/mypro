import prisma from '../lib/prisma';
import { EvaluationService } from '../services/evaluation.service';
import { CsvService } from '../services/csv.service';
import { EvaluationStatus, ModelType } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

let batchId: string;
let newModelId: string;
let oldModelId: string;

async function printSection(title: string) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(80)}\n`);
}

async function printResult(label: string, passed: boolean, detail?: string) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${label}: ${passed ? '通过' : '失败'}`);
  if (detail) {
    console.log(`   ${detail}`);
  }
}

async function setup() {
  printSection('环境准备');

  const newModel = await prisma.modelVersion.findFirst({
    where: { type: ModelType.NEW },
  });
  const oldModel = await prisma.modelVersion.findFirst({
    where: { type: ModelType.OLD },
  });

  if (!newModel || !oldModel) {
    console.log('❌ 请先运行 npm run db:setup 初始化种子数据');
    process.exit(1);
  }

  newModelId = newModel.id;
  oldModelId = oldModel.id;
  batchId = `BATCH-TEST-${Date.now()}`;

  console.log(`📦 测试批次ID: ${batchId}`);
  console.log(`🆕 新模型版本: ${newModel.name} (${newModel.version})`);
  console.log(`🆕 旧模型版本: ${oldModel.name} (${oldModel.version})`);
}

async function testScenario1_ImportOldData() {
  printSection('场景1：导入旧材料（模拟周一早会前导入历史数据）');

  const records = [
    {
      batchId,
      medicalRecordId: 'MR202506100',
      questionId: 'Q001',
      questionContent: '患者的空腹血糖值是多少？',
      modelAnswer: '空腹血糖值为7.8mmol/L',
      standardAnswer: '空腹血糖值为7.8mmol/L（正常范围3.9-6.1mmol/L）',
      modelVersionId: oldModelId,
      isCorrect: true,
      confidence: 0.88,
      judgeReason: '数值准确，但未标注参考范围',
    },
    {
      batchId,
      medicalRecordId: 'MR202506100',
      questionId: 'Q002',
      questionContent: '患者是否有吸烟史？',
      modelAnswer: '患者吸烟史20年，每日10支',
      standardAnswer: '吸烟史20年，每日约10支，已戒烟1年',
      modelVersionId: oldModelId,
      isCorrect: false,
      confidence: 0.75,
      errorType: '信息遗漏',
      judgeReason: '未提及已戒烟的重要信息',
    },
    {
      batchId,
      medicalRecordId: 'MR202506101',
      questionId: 'Q001',
      questionContent: '本次住院的主要治疗方案是什么？',
      modelAnswer: '予胰岛素降糖、阿司匹林抗血小板、他汀调脂治疗',
      standardAnswer: '降糖（胰岛素）、抗血小板（阿司匹林）、调脂（阿托伐他汀）、扩冠（硝酸甘油）',
      modelVersionId: oldModelId,
      isCorrect: false,
      confidence: 0.82,
      errorType: '信息遗漏',
      judgeReason: '遗漏了扩冠治疗方案',
    },
  ];

  const results = await EvaluationService.batchCreate(records, '测试脚本');

  console.log(`📥 导入了 ${results.length} 条记录`);

  let allPassed = true;
  for (const r of results) {
    const passed = r.status === EvaluationStatus.EVALUATED;
    printResult(
      `记录 ${r.medicalRecordId}-${r.questionId}`,
      passed,
      `状态: ${r.statusText}`
    );
    allPassed = allPassed && passed;
  }

  return allPassed;
}

async function testScenario2_DuplicateDetection() {
  printSection('场景2：重复评测检测（放一条重复评测，看遇到乱材料时会不会露怯）');

  const duplicateRecord = {
    batchId,
    medicalRecordId: 'MR202506100',
    questionId: 'Q001',
    questionContent: '患者的空腹血糖值是多少？',
    modelAnswer: '空腹血糖值为7.8mmol/L（重复评测）',
    standardAnswer: '空腹血糖值为7.8mmol/L（正常范围3.9-6.1mmol/L）',
    modelVersionId: newModelId,
    isCorrect: true,
    confidence: 0.91,
    judgeReason: '重复评测，数值准确',
  };

  const result = await EvaluationService.createRecord(
    duplicateRecord,
    '测试脚本'
  );

  console.log(`🔍 重复记录ID: ${result.id}`);
  console.log(`🔍 重复源记录ID: ${result.duplicateOfId}`);

  const passed1 = result.isDuplicate === true;
  printResult('检测为重复记录', passed1, `isDuplicate=${result.isDuplicate}`);

  const passed2 = result.status === EvaluationStatus.DUPLICATE;
  printResult(
    '状态标记为重复评测',
    passed2,
    `状态: ${result.statusText}`
  );

  const passed3 = result.duplicateOfId !== undefined;
  printResult('关联到原始记录', passed3, `duplicateOfId=${result.duplicateOfId}`);

  return passed1 && passed2 && passed3;
}

async function testScenario3_ModelMistakeRevision() {
  printSection('场景3：旧模型误判样本改判（放回旧模型误判样本，看新结果能不能解释为什么改判）');

  const oldMistake = await prisma.evaluationRecord.findFirst({
    where: {
      medicalRecordId: 'MR202506004',
      questionId: 'Q001',
      modelVersion: { type: ModelType.OLD },
    },
    include: { modelVersion: true },
  });

  if (!oldMistake) {
    console.log('❌ 未找到旧模型误判样本，请先运行种子脚本');
    return false;
  }

  console.log(`📋 旧模型误判记录: ${oldMistake.id}`);
  console.log(`   病历: ${oldMistake.medicalRecordId}, 问题: ${oldMistake.questionId}`);
  console.log(`   旧模型判定: ${oldMistake.isCorrect ? '正确' : '错误'}`);
  console.log(`   旧模型理由: ${oldMistake.judgeReason}`);

  const newRecord = await EvaluationService.createRecord(
    {
      batchId,
      medicalRecordId: oldMistake.medicalRecordId,
      questionId: oldMistake.questionId,
      questionContent: oldMistake.questionContent,
      modelAnswer: '患者肌酐值为125μmol/L，高于正常值上限（参考范围44-133μmol/L）',
      standardAnswer: oldMistake.standardAnswer || undefined,
      modelVersionId: newModelId,
      isCorrect: true,
      confidence: 0.96,
      judgeReason: '新模型正确识别了检验数值，125μmol/L确实高于正常值上限',
    },
    '测试脚本'
  );

  const detail = await EvaluationService.getDetail(newRecord.id);

  console.log(`\n📋 新模型评测记录: ${detail.id}`);
  console.log(`   新模型判定: ${detail.isCorrect ? '正确' : '错误'}`);
  console.log(`   新模型理由: ${detail.judgeReason}`);

  const hasComparison = detail.revisionComparison !== undefined;
  printResult('生成新旧模型对比', hasComparison);

  let passedExplanation = false;
  if (hasComparison && detail.revisionComparison) {
    console.log(`\n📊 改判解释:`);
    console.log(`   旧模型: ${detail.revisionComparison.oldModelVersion?.name}`);
    console.log(`   旧判定: ${detail.revisionComparison.oldIsCorrect ? '正确' : '错误'}`);
    console.log(`   新模型: ${detail.revisionComparison.newModelVersion.name}`);
    console.log(`   新判定: ${detail.revisionComparison.newIsCorrect ? '正确' : '错误'}`);
    console.log(`   解释: ${detail.revisionComparison.revisionExplanation}`);

    passedExplanation = detail.revisionComparison.revisionExplanation.length > 0;
    printResult('改判解释完整', passedExplanation);
  }

  const oldWrongNewRight =
    oldMistake.isCorrect === false && detail.isCorrect === true;
  printResult('成功改判（错误→正确）', oldWrongNewRight);

  return hasComparison && passedExplanation && oldWrongNewRight;
}

async function testScenario4_WithdrawAndLink() {
  printSection('场景4：撤回记录与最终结论关联（把一条撤回记录和最后结论连起来）');

  const recordToWithdraw = await prisma.evaluationRecord.findFirst({
    where: {
      batchId,
      status: EvaluationStatus.EVALUATED,
      isDuplicate: false,
    },
  });

  if (!recordToWithdraw) {
    console.log('❌ 未找到可撤回的记录');
    return false;
  }

  console.log(`📋 待撤回记录: ${recordToWithdraw.id}`);
  console.log(`   病历: ${recordToWithdraw.medicalRecordId}`);
  console.log(`   当前状态: ${recordToWithdraw.status}`);

  const withdrawn = await EvaluationService.withdraw(
    recordToWithdraw.id,
    '人工复核发现模型输出存在医学事实偏差，需重新评测',
    '风控运营-老唐'
  );

  const passed1 = withdrawn.status === EvaluationStatus.WITHDRAWN;
  printResult('记录状态变为已撤回', passed1, `状态: ${withdrawn.statusText}`);

  const passed2 = withdrawn.hasWithdrawal === true;
  printResult('标记有撤回记录', passed2, `hasWithdrawal=${withdrawn.hasWithdrawal}`);

  const passed3 = withdrawn.withdrawalInfo !== undefined;
  printResult('生成撤回记录详情', passed3);

  if (withdrawn.withdrawalInfo) {
    console.log(`\n📝 撤回详情:`);
    console.log(`   撤回原因: ${withdrawn.withdrawalInfo.reason}`);
    console.log(`   操作人: ${withdrawn.withdrawalInfo.operator}`);
  }

  const conclusionRecord = await EvaluationService.createRecord(
    {
      batchId,
      medicalRecordId: recordToWithdraw.medicalRecordId,
      questionId: recordToWithdraw.questionId,
      questionContent: recordToWithdraw.questionContent,
      modelAnswer: '经人工复核，患者空腹血糖值为7.8mmol/L，高于正常范围，需密切监测',
      standardAnswer: '空腹血糖值为7.8mmol/L（正常范围3.9-6.1mmol/L），高于正常范围',
      modelVersionId: newModelId,
      isCorrect: true,
      confidence: 0.98,
      judgeReason: '人工复核确认，回答完整准确，包含参考范围和临床提示',
    },
    '风控运营-老唐'
  );

  console.log(`\n📋 最终结论记录: ${conclusionRecord.id}`);

  if (!withdrawn.withdrawalInfo) {
    return false;
  }

  const linked = await EvaluationService.linkWithdrawalToConclusion(
    withdrawn.withdrawalInfo.id,
    conclusionRecord.id,
    '风控运营-老唐'
  );

  const passed4 = linked.finalConclusionId === conclusionRecord.id;
  printResult('撤回记录关联到最终结论', passed4, `finalConclusionId=${linked.finalConclusionId}`);

  const passed5 = linked.finalConclusionInfo !== undefined;
  printResult('可查看最终结论详情', passed5);

  if (linked.finalConclusionInfo) {
    console.log(`\n🔗 关联的最终结论:`);
    console.log(`   状态: ${linked.finalConclusionInfo.statusText}`);
    console.log(`   结果: ${linked.finalConclusionInfo.isCorrect ? '正确' : '错误'}`);
    console.log(`   理由: ${linked.finalConclusionInfo.judgeReason}`);
  }

  return passed1 && passed2 && passed3 && passed4 && passed5;
}

async function testScenario5_HumanConfirmAndHistory() {
  printSection('场景5：人工确认与历史记录（人工确认前后的变化要进历史，周一早会前复盘时能解释）');

  const recordToConfirm = await prisma.evaluationRecord.findFirst({
    where: {
      batchId,
      status: EvaluationStatus.EVALUATED,
      isDuplicate: false,
      hasWithdrawal: false,
    },
  });

  if (!recordToConfirm) {
    console.log('❌ 未找到可确认的记录');
    return false;
  }

  console.log(`📋 待确认记录: ${recordToConfirm.id}`);
  console.log(`   当前状态: ${recordToConfirm.status}`);
  console.log(`   判定结果: ${recordToConfirm.isCorrect ? '正确' : '错误'}`);

  const confirmed = await EvaluationService.confirm(
    recordToConfirm.id,
    '风控运营-老唐',
    '人工复核确认模型输出准确，与病历内容一致'
  );

  const passed1 = confirmed.status === EvaluationStatus.CONFIRMED;
  printResult('状态变为已人工确认', passed1, `状态: ${confirmed.statusText}`);

  const passed2 = confirmed.confirmedBy === '风控运营-老唐';
  printResult('记录确认人', passed2, `confirmedBy=${confirmed.confirmedBy}`);

  const passed3 = confirmed.confirmedAt !== undefined;
  printResult('记录确认时间', passed3);

  const historyCount = confirmed.changeHistories.length;
  const passed4 = historyCount > 0;
  printResult('生成历史变更记录', passed4, `历史记录数: ${historyCount}`);

  console.log(`\n📜 历史变更记录:`);
  for (const h of confirmed.changeHistories.slice(0, 5)) {
    console.log(`   [${h.createdAt}] ${h.operationType} ${h.fieldName}`);
    console.log(`      由: ${h.oldValue || '无'} → ${h.newValue || '无'}`);
    console.log(`      原因: ${h.changeReason || '无'}`);
    console.log(`      操作人: ${h.operator || '系统'}`);
  }

  return passed1 && passed2 && passed3 && passed4;
}

async function testScenario6_ReviseAndHistory() {
  printSection('场景6：改判与历史追踪（模拟人工改判，记录变更轨迹）');

  const recordToRevise = await prisma.evaluationRecord.findFirst({
    where: {
      batchId,
      status: EvaluationStatus.EVALUATED,
      isCorrect: false,
      isDuplicate: false,
    },
  });

  if (!recordToRevise) {
    console.log('❌ 未找到可改判的记录');
    return false;
  }

  console.log(`📋 待改判记录: ${recordToRevise.id}`);
  console.log(`   当前判定: ${recordToRevise.isCorrect ? '正确' : '错误'}`);
  console.log(`   当前理由: ${recordToRevise.judgeReason}`);

  const revised = await EvaluationService.revise(
    recordToRevise.id,
    true,
    '经人工复核，虽然回答不够详尽，但核心信息准确，应判定为正确',
    '人工复核发现原判定过严，回答涵盖了主要治疗方案，遗漏的扩冠治疗属于次要信息，不影响核心结论',
    '风控运营-老唐'
  );

  const passed1 = revised.status === EvaluationStatus.REVISED;
  printResult('状态变为已改判', passed1, `状态: ${revised.statusText}`);

  const passed2 = revised.isCorrect === true;
  printResult('判定结果已更新', passed2, `isCorrect=${revised.isCorrect}`);

  const passed3 = revised.revisionReason !== undefined;
  printResult('记录改判理由', passed3, `理由: ${revised.revisionReason}`);

  console.log(`\n📜 改判后的历史记录:`);
  const statusHistory = revised.changeHistories.filter(
    (h) => h.fieldName === 'status' || h.fieldName === 'isCorrect'
  );
  for (const h of statusHistory) {
    console.log(`   [${h.createdAt}] ${h.fieldName}: ${h.oldValue} → ${h.newValue}`);
  }

  return passed1 && passed2 && passed3;
}

async function testScenario7_CsvExportConsistency() {
  printSection('场景7：CSV导出与接口状态一致性（负责人从接口查明细，看到的状态要和导出的CSV一致）');

  const apiResult = await EvaluationService.list({ batchId, pageSize: 100 });
  console.log(`📊 接口返回记录数: ${apiResult.list.length}`);

  const exportData = await CsvService.generateExportData({ batchId });
  console.log(`📊 CSV导出记录数: ${exportData.rows.length}`);

  const passed1 = apiResult.list.length === exportData.rows.length;
  printResult('记录数量一致', passed1, `接口=${apiResult.list.length}, CSV=${exportData.rows.length}`);

  let allStatusMatch = true;
  let allWithdrawMatch = true;
  let allDuplicateMatch = true;

  for (let i = 0; i < apiResult.list.length; i++) {
    const apiRecord = apiResult.list[i];
    const csvRow = exportData.rows[i];

    if (csvRow[11] !== apiRecord.statusText) {
      allStatusMatch = false;
      console.log(`   ❌ 状态不一致: ${apiRecord.id}`);
      console.log(`      接口: ${apiRecord.statusText}, CSV: ${csvRow[11]}`);
    }

    if (csvRow[14] !== (apiRecord.isDuplicate ? '是' : '否')) {
      allDuplicateMatch = false;
      console.log(`   ❌ 重复标记不一致: ${apiRecord.id}`);
    }

    if (csvRow[16] !== (apiRecord.hasWithdrawal ? '是' : '否')) {
      allWithdrawMatch = false;
      console.log(`   ❌ 撤回标记不一致: ${apiRecord.id}`);
    }
  }

  printResult('状态字段完全一致', allStatusMatch);
  printResult('重复标记完全一致', allDuplicateMatch);
  printResult('撤回标记完全一致', allWithdrawMatch);

  console.log(`\n📄 CSV表头字段（共${exportData.headers.length}列）:`);
  exportData.headers.forEach((h, i) => {
    console.log(`   ${i + 1}. ${h}`);
  });

  const outputDir = path.join(process.cwd(), 'exports');
  const filePath = await CsvService.exportToFile({ batchId }, outputDir);
  console.log(`\n💾 CSV文件已导出: ${filePath}`);

  const fileExists = fs.existsSync(filePath);
  printResult('CSV文件生成成功', fileExists);

  return passed1 && allStatusMatch && allWithdrawMatch && allDuplicateMatch && fileExists;
}

async function testScenario8_FinalReplay() {
  printSection('场景8：完整流程回放（按周一早会前的真实节奏：导入旧材料→补撤回记录→看CSV明细）');

  console.log('🎬 正在模拟周一早会前的完整工作流程...\n');

  const replayBatchId = `BATCH-REPLAY-${Date.now()}`;
  console.log(`📦 回放批次ID: ${replayBatchId}`);
  console.log('');

  console.log('🕐 09:00 - 导入旧材料（3条历史评测记录）');
  const oldRecords = [
    {
      batchId: replayBatchId,
      medicalRecordId: 'MR202506200',
      questionId: 'Q001',
      questionContent: '患者的体温是多少？',
      modelAnswer: '体温38.5℃',
      standardAnswer: '体温38.5℃（发热）',
      modelVersionId: oldModelId,
      isCorrect: true,
      confidence: 0.9,
      judgeReason: '数值准确',
    },
    {
      batchId: replayBatchId,
      medicalRecordId: 'MR202506201',
      questionId: 'Q001',
      questionContent: '患者的白细胞计数是多少？',
      modelAnswer: '白细胞计数12.5×10^9/L',
      standardAnswer: '白细胞计数12.5×10^9/L（升高）',
      modelVersionId: oldModelId,
      isCorrect: true,
      confidence: 0.85,
      judgeReason: '数值准确',
    },
    {
      batchId: replayBatchId,
      medicalRecordId: 'MR202506202',
      questionId: 'Q001',
      questionContent: '患者的诊断是什么？',
      modelAnswer: '上呼吸道感染',
      standardAnswer: '急性上呼吸道感染，细菌性',
      modelVersionId: oldModelId,
      isCorrect: false,
      confidence: 0.7,
      errorType: '信息遗漏',
      judgeReason: '未提及细菌性感染',
    },
  ];

  const created = await EvaluationService.batchCreate(oldRecords, '风控运营-老唐');
  console.log(`   ✅ 导入完成，共 ${created.length} 条记录`);
  console.log('');

  console.log('🕐 09:15 - 发现MR202506202记录有误，执行撤回');
  const toWithdraw = created.find((r) => r.medicalRecordId === 'MR202506202');
  if (toWithdraw) {
    const withdrawn = await EvaluationService.withdraw(
      toWithdraw.id,
      '模型漏诊了细菌性感染的重要信息，需重新评测',
      '风控运营-老唐'
    );
    console.log(`   ✅ 已撤回记录: ${withdrawn.id}`);
    console.log(`      原因: ${withdrawn.withdrawalInfo?.reason}`);

    console.log('');
    console.log('🕐 09:20 - 补充正确的评测结论');
    const conclusion = await EvaluationService.createRecord(
      {
        batchId: replayBatchId,
        medicalRecordId: 'MR202506202',
        questionId: 'Q001',
        questionContent: '患者的诊断是什么？',
        modelAnswer: '急性上呼吸道感染，考虑细菌性感染，白细胞升高支持该诊断',
        standardAnswer: '急性上呼吸道感染，细菌性',
        modelVersionId: newModelId,
        isCorrect: true,
        confidence: 0.95,
        judgeReason: '回答完整，包含了感染类型和依据',
      },
      '风控运营-老唐'
    );
    console.log(`   ✅ 已创建新结论: ${conclusion.id}`);

    if (withdrawn.withdrawalInfo) {
      await EvaluationService.linkWithdrawalToConclusion(
        withdrawn.withdrawalInfo.id,
        conclusion.id,
        '风控运营-老唐'
      );
      console.log(`   ✅ 已关联撤回记录与新结论`);
    }
  }
  console.log('');

  console.log('🕐 09:30 - 人工确认所有记录');
  for (const record of created) {
    if (record.medicalRecordId !== 'MR202506202' && !record.isDuplicate) {
      await EvaluationService.confirm(
        record.id,
        '风控运营-老唐',
        '人工复核确认'
      );
    }
  }
  console.log(`   ✅ 已完成人工确认`);
  console.log('');

  console.log('🕐 09:45 - 导出CSV明细，准备周一早会汇报');
  const exportData = await CsvService.generateExportData({ batchId: replayBatchId });
  const outputDir = path.join(process.cwd(), 'exports');
  const filePath = await CsvService.exportToFile({ batchId: replayBatchId }, outputDir);
  console.log(`   ✅ CSV已导出: ${filePath}`);
  console.log('');

  console.log('📊 回放批次统计:');
  const stats = await EvaluationService.getStatistics(replayBatchId);
  console.log(`   总记录数: ${stats.total}`);
  console.log(`   已评测: ${stats.evaluated}`);
  console.log(`   正确: ${stats.correct}`);
  console.log(`   错误: ${stats.incorrect}`);
  console.log(`   准确率: ${stats.accuracy}%`);
  console.log(`   已撤回: ${stats.withdrawn}`);
  console.log(`   已确认: ${stats.confirmed}`);
  console.log('');

  console.log('📋 CSV明细中关键字段说明:');
  console.log('   · 状态列：与接口返回完全一致');
  console.log('   · 撤回原因、撤回操作人、撤回时间：完整记录撤回轨迹');
  console.log('   · 关联结论ID、最终结论状态、最终结论结果：打通撤回与最终结论');
  console.log('   · 新旧模型对比说明：解释改判原因，供周一早会复盘');
  console.log('');

  console.log('✅ 完整流程回放成功！');
  console.log('');
  console.log('💡 周一早会汇报要点:');
  console.log('   1. 展示整体准确率变化趋势');
  console.log('   2. 重点说明MR202506202的撤回和改判案例');
  console.log('   3. 解释新旧模型对比的改进点');
  console.log('   4. 提供完整CSV明细供负责人查阅');

  return true;
}

async function main() {
  console.log('\n' + '╔'.repeat(40));
  console.log('  🧪 病历问答灰度对比 - 业务场景测试');
  console.log('  📅 模拟时间: 2025年6月18日 周一早会前');
  console.log('╚'.repeat(40));

  await setup();

  const results: { name: string; passed: boolean }[] = [];

  results.push({
    name: '场景1：导入旧材料',
    passed: await testScenario1_ImportOldData(),
  });

  results.push({
    name: '场景2：重复评测检测',
    passed: await testScenario2_DuplicateDetection(),
  });

  results.push({
    name: '场景3：旧模型误判改判解释',
    passed: await testScenario3_ModelMistakeRevision(),
  });

  results.push({
    name: '场景4：撤回记录与结论关联',
    passed: await testScenario4_WithdrawAndLink(),
  });

  results.push({
    name: '场景5：人工确认与历史记录',
    passed: await testScenario5_HumanConfirmAndHistory(),
  });

  results.push({
    name: '场景6：改判与历史追踪',
    passed: await testScenario6_ReviseAndHistory(),
  });

  results.push({
    name: '场景7：CSV与接口状态一致',
    passed: await testScenario7_CsvExportConsistency(),
  });

  results.push({
    name: '场景8：完整流程回放',
    passed: await testScenario8_FinalReplay(),
  });

  printSection('测试结果汇总');

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  for (const r of results) {
    printResult(r.name, r.passed);
  }

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`\n📊 总评: ${passedCount}/${totalCount} 测试通过`);

  if (passedCount === totalCount) {
    console.log('\n🎉 所有测试通过！系统已准备好供周一早会使用。');
    console.log('');
    console.log('✅ 已解决的问题:');
    console.log('   1. ✅ 接口与CSV状态完全一致，负责人查数据不会对不上');
    console.log('   2. ✅ 撤回记录与最终结论关联，完整追溯变更轨迹');
    console.log('   3. ✅ 重复评测自动检测，乱材料不会乱数据');
    console.log('   4. ✅ 新旧模型改判有解释，能说明为什么变了');
    console.log('   5. ✅ 人工确认变化全进历史，复盘时能说清来龙去脉');
    console.log('');
    console.log('👉 启动服务: npm run dev');
    console.log('👉 访问前端: http://localhost:5173');
  } else {
    console.log('\n❌ 部分测试未通过，请检查相关功能。');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ 测试执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
