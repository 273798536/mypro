import prisma from '../lib/prisma';
import { ModelType, EvaluationStatus } from '@prisma/client';

async function main() {
  console.log('🌱 开始初始化种子数据...');

  const oldModel = await prisma.modelVersion.upsert({
    where: { id: 'model-old-001' },
    update: {},
    create: {
      id: 'model-old-001',
      name: '病历问答模型V1.0',
      version: 'v1.0.0',
      type: ModelType.OLD,
      description: '旧版基线模型，用于对比评测',
    },
  });
  console.log('✅ 旧模型版本:', oldModel.name);

  const newModel = await prisma.modelVersion.upsert({
    where: { id: 'model-new-001' },
    update: {},
    create: {
      id: 'model-new-001',
      name: '病历问答模型V2.0',
      version: 'v2.0.0',
      type: ModelType.NEW,
      description: '新版优化模型，灰度测试中',
    },
  });
  console.log('✅ 新模型版本:', newModel.name);

  const grayModel = await prisma.modelVersion.upsert({
    where: { id: 'model-gray-001' },
    update: {},
    create: {
      id: 'model-gray-001',
      name: '病历问答模型V2.0-灰度',
      version: 'v2.0.0-gray',
      type: ModelType.GRAY,
      description: '灰度分流模型，A/B测试用',
    },
  });
  console.log('✅ 灰度模型版本:', grayModel.name);

  const sampleQuestions = [
    {
      medicalRecordId: 'MR202506001',
      questionId: 'Q001',
      questionContent: '患者的主要诊断是什么？',
      modelAnswer: '患者主要诊断为2型糖尿病伴酮症酸中毒',
      standardAnswer: '2型糖尿病伴酮症酸中毒',
    },
    {
      medicalRecordId: 'MR202506001',
      questionId: 'Q002',
      questionContent: '患者是否有高血压病史？',
      modelAnswer: '患者有5年高血压病史',
      standardAnswer: '有，5年高血压病史',
    },
    {
      medicalRecordId: 'MR202506002',
      questionId: 'Q001',
      questionContent: '本次入院的主要原因是什么？',
      modelAnswer: '患者因胸闷胸痛3天入院',
      standardAnswer: '胸闷胸痛查因',
    },
    {
      medicalRecordId: 'MR202506002',
      questionId: 'Q002',
      questionContent: '患者的过敏史有哪些？',
      modelAnswer: '患者否认药物及食物过敏史',
      standardAnswer: '无药物及食物过敏史',
    },
    {
      medicalRecordId: 'MR202506003',
      questionId: 'Q001',
      questionContent: '患者的手术史有哪些？',
      modelAnswer: '患者2018年行胆囊切除术，2020年行阑尾切除术',
      standardAnswer: '2018年胆囊切除术，2020年阑尾切除术',
    },
    {
      medicalRecordId: 'MR202506003',
      questionId: 'Q002',
      questionContent: '目前的用药方案是什么？',
      modelAnswer: '二甲双胍0.5g tid，胰岛素皮下注射',
      standardAnswer: '二甲双胍0.5g 口服 每日三次，门冬胰岛素 早8U 中6U 晚6U 皮下注射',
    },
  ];

  const batchId = 'BATCH-SEED-20250618';

  for (let i = 0; i < sampleQuestions.length; i++) {
    const q = sampleQuestions[i];
    const isCorrectOld = i % 2 === 0;
    const isCorrectNew = i % 3 !== 0;

    await prisma.evaluationRecord.upsert({
      where: { id: `eval-old-${i + 1}` },
      update: {},
      create: {
        id: `eval-old-${i + 1}`,
        batchId,
        medicalRecordId: q.medicalRecordId,
        questionId: q.questionId,
        questionContent: q.questionContent,
        modelAnswer: q.modelAnswer,
        standardAnswer: q.standardAnswer,
        modelVersionId: oldModel.id,
        isCorrect: isCorrectOld,
        confidence: 0.75 + Math.random() * 0.2,
        errorType: isCorrectOld ? null : '信息遗漏',
        status: EvaluationStatus.EVALUATED,
        judgeReason: isCorrectOld
          ? '回答准确完整，与标准答案一致'
          : '回答部分信息缺失，未完全覆盖标准答案要点',
        evaluatedAt: new Date('2025-06-15T10:00:00'),
      },
    });

    await prisma.evaluationRecord.upsert({
      where: { id: `eval-new-${i + 1}` },
      update: {},
      create: {
        id: `eval-new-${i + 1}`,
        batchId,
        medicalRecordId: q.medicalRecordId,
        questionId: q.questionId,
        questionContent: q.questionContent,
        modelAnswer: q.modelAnswer + '（优化版）',
        standardAnswer: q.standardAnswer,
        modelVersionId: newModel.id,
        isCorrect: isCorrectNew,
        confidence: 0.85 + Math.random() * 0.1,
        errorType: isCorrectNew ? null : '表述不够规范',
        status: EvaluationStatus.EVALUATED,
        judgeReason: isCorrectNew
          ? '新模型回答准确，语义完整'
          : '医学术语表述不够规范',
        evaluatedAt: new Date('2025-06-18T10:00:00'),
      },
    });
  }

  console.log('✅ 已创建基础评测记录:', sampleQuestions.length * 2, '条');

  const mistakenRecord = await prisma.evaluationRecord.upsert({
    where: { id: 'eval-old-mistake-001' },
    update: {},
    create: {
      id: 'eval-old-mistake-001',
      batchId,
      medicalRecordId: 'MR202506004',
      questionId: 'Q001',
      questionContent: '患者的肌酐值是多少？',
      modelAnswer: '患者肌酐值为85μmol/L，在正常范围内',
      standardAnswer: '肌酐值为125μmol/L，高于正常值上限',
      modelVersionId: oldModel.id,
      isCorrect: false,
      confidence: 0.92,
      errorType: '事实错误',
      status: EvaluationStatus.EVALUATED,
      judgeReason: '旧模型误读了检验报告中的数值',
      evaluatedAt: new Date('2025-06-15T11:00:00'),
    },
  });
  console.log('✅ 已创建旧模型误判样本:', mistakenRecord.id);

  console.log('\n🎉 种子数据初始化完成！');
  console.log('');
  console.log('📊 数据概览:');
  console.log('   模型版本: 3个（旧/新/灰度）');
  console.log('   评测记录: 13条');
  console.log('   包含场景:');
  console.log('   ✓ 基础评测对比数据');
  console.log('   ✓ 旧模型误判样本（MR202506004-Q001）');
  console.log('   ✓ 可用于测试重复评测、改判解释等场景');
  console.log('');
  console.log('👉 运行 npm run test:scenario 测试完整业务场景');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
