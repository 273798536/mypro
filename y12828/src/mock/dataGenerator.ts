import { faker } from '@faker-js/faker/locale/zh_CN';
import { v4 as uuidv4 } from 'uuid';
import {
  SampleVersion,
  SourceOrigin,
  User,
  ReviewComment,
  FinalConclusion,
  AuditLog,
  DedupResult,
  DiffResult,
  AiAnalysisResult,
  SequencingResult,
  GroupIndicators,
  ManualCorrection,
  Barcode,
  SampleStatus,
} from '@/types';
import { versionControlEngine } from '@/engines/versionControlEngine';
import { diffEngine } from '@/engines/diffEngine';
import { deduplicationEngine } from '@/engines/deduplicationEngine';
import { auditEngine } from '@/engines/auditEngine';

const GENE_NAMES = ['EGFR', 'KRAS', 'BRAF', 'PIK3CA', 'PTEN', 'TP53', 'ALK', 'ROS1', 'MET', 'HER2'];
const VARIANT_TYPES = ['野生型', '杂合突变', '纯合突变', '缺失突变', '插入突变'];
const TEST_TYPES = ['PCR测序', 'Sanger测序', 'NGS测序', 'qPCR检测', 'FISH检测'];
const CABINET_IDS = ['BSC-A01', 'BSC-A02', 'BSC-B01', 'BSC-B02', 'BSC-C01'];
const OPERATORS = ['张检验师', '李检验师', '王检验师', '刘检验师', '陈检验师'];
const QUALITY_CONTROL = ['赵质控', '孙质控', '周质控'];

function generateBarcode(): Barcode {
  return `BC-${faker.number.int({ min: 100000, max: 999999 })}`;
}

function generateSequencingResult(): SequencingResult {
  const geneName = faker.helpers.arrayElement(GENE_NAMES);
  return {
    geneName,
    variant: faker.helpers.arrayElement(VARIANT_TYPES),
    alleleFrequency: faker.number.float({ min: 0, max: 1, fractionDigits: 4 }),
    qualityScore: faker.number.int({ min: 20, max: 100 }),
    coverage: faker.number.int({ min: 50, max: 1000 }),
    interpretation: faker.helpers.arrayElement([
      '未检测到临床意义明确的变异',
      '检测到意义未明的变异',
      '检测到可能致病性变异',
      '检测到致病性变异',
    ]),
  };
}

function generateGroupIndicators(): GroupIndicators {
  const testDate = faker.date.recent({ days: 30 }).toISOString().split('T')[0];
  return {
    groupId: uuidv4(),
    batchId: `BATCH-${faker.number.int({ min: 1000, max: 9999 })}`,
    testDate,
    testType: faker.helpers.arrayElement(TEST_TYPES),
    operator: faker.helpers.arrayElement(OPERATORS),
    biosafetyCabinetId: faker.helpers.arrayElement(CABINET_IDS),
  };
}

function generateSourceOrigin(rowNumber: number, batchId: string, operatorId: string): SourceOrigin {
  return {
    id: uuidv4(),
    originalRowNumber: rowNumber,
    originalFileName: `测序结果_${batchId}_${faker.date.recent({ days: 7 }).toISOString().split('T')[0]}.xlsx`,
    sourceRemark: faker.helpers.arrayElement([
      `生物安全柜使用记录 第${rowNumber}行`,
      `日常检测记录 BC-${faker.number.int({ min: 100000, max: 999999 })}`,
      `补录数据 来源:检验科档案柜${faker.number.int({ min: 1, max: 5 })}`,
      `测序结果补录 ${faker.date.recent({ days: 14 }).toISOString().split('T')[0]}`,
    ]),
    importBatchId: batchId,
    importTimestamp: Date.now() - faker.number.int({ min: 0, max: 86400000 * 30 }),
    importOperatorId: operatorId,
  };
}

function generateAiAnalysisResult(): AiAnalysisResult {
  const hasAnomaly = faker.datatype.boolean(0.3);
  return {
    analysisId: uuidv4(),
    modelVersion: 'BioSeq-AI v2.1.0',
    anomalyScore: hasAnomaly ? faker.number.float({ min: 0.5, max: 0.95, fractionDigits: 2 }) : faker.number.float({ min: 0.05, max: 0.3, fractionDigits: 2 }),
    suggestions: hasAnomaly
      ? [
          {
            field: 'sequencingResult.interpretation',
            suggestedValue: '检测到可能致病性变异，建议人工复核',
            confidence: faker.number.float({ min: 0.7, max: 0.95, fractionDigits: 2 }),
            reasoning: '该变异位点在COSMIC数据库中与多种肿瘤相关',
          },
        ]
      : [],
    executedAt: Date.now() - faker.number.int({ min: 0, max: 3600000 }),
  };
}

function generateManualCorrection(): ManualCorrection {
  return {
    correctionId: uuidv4(),
    fieldName: faker.helpers.arrayElement([
      'sequencingResult.interpretation',
      'sequencingResult.variant',
      'groupIndicators.testDate',
    ]),
    oldValue: faker.lorem.sentence(),
    newValue: faker.lorem.sentence(),
    reason: faker.helpers.arrayElement([
      '人工复核后修正',
      '测序结果补录更新',
      '质控组要求修正',
      '原始数据解读错误',
    ]),
    correctedBy: faker.helpers.arrayElement(OPERATORS),
    correctedAt: Date.now() - faker.number.int({ min: 0, max: 86400000 * 7 }),
    reviewCommentId: faker.datatype.boolean(0.5) ? uuidv4() : null,
  };
}

function generateUsers(): User[] {
  return [
    {
      id: 'user-001',
      name: '张检验师',
      employeeId: 'EMP2024001',
      role: 'technician',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
    },
    {
      id: 'user-002',
      name: '李检验师',
      employeeId: 'EMP2024002',
      role: 'technician',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
    },
    {
      id: 'user-003',
      name: '赵质控',
      employeeId: 'EMP2024003',
      role: 'quality_control',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhao',
    },
    {
      id: 'user-004',
      name: '王管理员',
      employeeId: 'EMP2024004',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang',
    },
  ];
}

function generateSampleVersions(users: User[]): SampleVersion[] {
  const versions: SampleVersion[] = [];
  const barcodes: Barcode[] = [];
  const technicianUsers = users.filter((u) => u.role === 'technician');

  for (let i = 0; i < 25; i++) {
    const barcode = generateBarcode();
    barcodes.push(barcode);

    const batchId = `BATCH-${faker.number.int({ min: 1000, max: 9999 })}`;
    const operator = faker.helpers.arrayElement(technicianUsers);

    const versionCount = faker.number.int({ min: 1, max: 4 });
    let parentVersionId: string | null = null;

    for (let v = 1; v <= versionCount; v++) {
      const sourceOrigin = generateSourceOrigin(
        faker.number.int({ min: 1, max: 100 }),
        batchId,
        operator.id
      );

      const hasAiAnalysis = v > 1 || faker.datatype.boolean(0.6);
      const hasManualCorrections = v > 1 && faker.datatype.boolean(0.7);
      const isDuplicate = faker.datatype.boolean(0.15);
      const isLastVersion = v === versionCount;

      let status: SampleStatus = 'pending';
      if (isLastVersion) {
        status = faker.helpers.arrayElement(['confirmed', 'reviewing', 'conflict', 'pending']);
      } else if (hasManualCorrections) {
        status = 'reviewing';
      } else if (hasAiAnalysis) {
        status = 'analyzing';
      }

      const changeReasons = [
        '初始数据导入',
        '测序结果补录',
        '人工修正更新',
        '质控复核后修正',
        'AI分析结果更新',
      ];

      const version: SampleVersion = {
        versionId: uuidv4(),
        versionNumber: v,
        parentVersionId,
        barcode,
        sequencingResult: generateSequencingResult(),
        manualCorrections: hasManualCorrections
          ? Array(faker.number.int({ min: 1, max: 3 })).fill(null).map(() => generateManualCorrection())
          : [],
        groupIndicators: generateGroupIndicators(),
        createdAt: Date.now() - faker.number.int({ min: 0, max: 86400000 * 30 }),
        createdBy: operator.id,
        changeReason: changeReasons[v - 1] || '数据更新',
        isDuplicate,
        sourceOrigin,
        aiAnalysis: hasAiAnalysis ? generateAiAnalysisResult() : undefined,
        status,
      };

      versions.push(version);
      parentVersionId = version.versionId;
    }
  }

  return versions;
}

function generateReviewComments(versions: SampleVersion[], users: User[]): ReviewComment[] {
  const comments: ReviewComment[] = [];
  const qcUsers = users.filter((u) => u.role === 'quality_control');
  const reviewingVersions = versions.filter((v) => v.status === 'reviewing' || v.status === 'confirmed');

  reviewingVersions.forEach((version) => {
    if (faker.datatype.boolean(0.7)) {
      const comment: ReviewComment = {
        commentId: uuidv4(),
        barcode: version.barcode,
        versionId: version.versionId,
        content: faker.helpers.arrayElement([
          '数据核对无误，同意最终结论',
          '建议重新核对测序结果的质量评分',
          '人工修正理由充分，予以通过',
          '条码重复记录已核实，保留两份原始记录',
          '分组指标填写完整，可归档',
          '请补充说明该版本的变更原因',
        ]),
        reviewedBy: faker.helpers.arrayElement(qcUsers).id,
        reviewedAt: Date.now() - faker.number.int({ min: 0, max: 86400000 * 7 }),
        finalConclusionId: version.status === 'confirmed' ? uuidv4() : null,
      };
      comments.push(comment);
    }
  });

  return comments;
}

function generateFinalConclusions(
  versions: SampleVersion[],
  comments: ReviewComment[],
  users: User[]
): FinalConclusion[] {
  const conclusions: FinalConclusion[] = [];
  const qcUsers = users.filter((u) => u.role === 'quality_control');
  const confirmedVersions = versions.filter((v) => v.status === 'confirmed');

  confirmedVersions.forEach((version) => {
    const relatedComments = comments.filter(
      (c) => c.barcode === version.barcode && c.finalConclusionId
    );

    const conclusion: FinalConclusion = {
      conclusionId: relatedComments[0]?.finalConclusionId || uuidv4(),
      barcode: version.barcode,
      finalResult: faker.helpers.arrayElement([
        '未检测到致病性变异',
        '检测到意义未明变异，建议临床随访',
        '检测到致病性变异，已通知临床',
        '检测到可能致病性变异，建议进一步验证',
      ]),
      conclusion: faker.helpers.arrayElement([
        '本批次检测结果均在质控范围内，结果可信',
        '经人工复核和AI分析双重验证，结果确认',
        '条码重复记录已妥善处理，保留所有原始来源',
        '补录数据与原始数据一致，结论统一',
      ]),
      confirmedBy: faker.helpers.arrayElement(qcUsers).id,
      confirmedAt: Date.now() - faker.number.int({ min: 0, max: 86400000 * 14 }),
      reviewCommentIds: relatedComments.map((c) => c.commentId),
      traceLinkIds: [uuidv4()],
      isFinal: true,
    };
    conclusions.push(conclusion);
  });

  return conclusions;
}

function generateDedupResults(versions: SampleVersion[]): DedupResult[] {
  const duplicateVersions = versions.filter((v) => v.isDuplicate);
  const barcodes = new Set(duplicateVersions.map((v) => v.barcode));

  const results: DedupResult[] = [];

  barcodes.forEach((barcode) => {
    const barcodeVersions = versions.filter((v) => v.barcode === barcode);
    const records = barcodeVersions.map((v) => ({
      versionId: v.versionId,
      sourceOrigin: v.sourceOrigin,
      importTimestamp: v.sourceOrigin.importTimestamp,
      similarity: deduplicationEngine.calculateSimilarity(barcodeVersions[0], v),
    }));

    const result: DedupResult = {
      dedupId: uuidv4(),
      barcode,
      duplicateCount: records.length - 1,
      duplicateRecords: records.slice(1),
      isConfirmedDuplicate: faker.datatype.boolean(0.6),
      mergeStrategy: faker.helpers.arrayElement(['keep_latest', 'keep_original', 'manual', null]),
      resolvedAt: faker.datatype.boolean(0.6)
        ? Date.now() - faker.number.int({ min: 0, max: 86400000 * 7 })
        : undefined,
      resolvedBy: faker.datatype.boolean(0.6) ? faker.helpers.arrayElement(QUALITY_CONTROL) : undefined,
    };

    results.push(result);
  });

  return results;
}

function generateAuditLogs(
  versions: SampleVersion[],
  comments: ReviewComment[],
  conclusions: FinalConclusion[],
  users: User[]
): AuditLog[] {
  const logs: AuditLog[] = [];

  versions.forEach((version) => {
    logs.push({
      logId: uuidv4(),
      operatorId: version.createdBy,
      operatorName: users.find((u) => u.id === version.createdBy)?.name || '未知用户',
      action: version.versionNumber === 1 ? 'import' : 'update_version',
      targetType: 'version',
      targetId: version.versionId,
      timestamp: version.createdAt,
      details: {
        barcode: version.barcode,
        versionNumber: version.versionNumber,
        changeReason: version.changeReason,
      },
    });

    if (version.manualCorrections.length > 0) {
      version.manualCorrections.forEach((correction) => {
        logs.push({
          logId: uuidv4(),
          operatorId: correction.correctedBy,
          operatorName: correction.correctedBy,
          action: 'manual_correction',
          targetType: 'version',
          targetId: version.versionId,
          timestamp: correction.correctedAt,
          details: {
            field: correction.fieldName,
            reason: correction.reason,
          },
        });
      });
    }

    if (version.aiAnalysis) {
      logs.push({
        logId: uuidv4(),
        operatorId: 'system',
        operatorName: 'AI系统',
        action: 'ai_analysis',
        targetType: 'version',
        targetId: version.versionId,
        timestamp: version.aiAnalysis.executedAt,
        details: {
          modelVersion: version.aiAnalysis.modelVersion,
          anomalyScore: version.aiAnalysis.anomalyScore,
          suggestionsCount: version.aiAnalysis.suggestions.length,
        },
      });
    }
  });

  comments.forEach((comment) => {
    logs.push({
      logId: uuidv4(),
      operatorId: comment.reviewedBy,
      operatorName: users.find((u) => u.id === comment.reviewedBy)?.name || '未知用户',
      action: 'add_review_comment',
      targetType: 'review_comment',
      targetId: comment.commentId,
      timestamp: comment.reviewedAt,
      details: {
        barcode: comment.barcode,
        versionId: comment.versionId,
      },
    });
  });

  conclusions.forEach((conclusion) => {
    logs.push({
      logId: uuidv4(),
      operatorId: conclusion.confirmedBy,
      operatorName: users.find((u) => u.id === conclusion.confirmedBy)?.name || '未知用户',
      action: 'confirm_conclusion',
      targetType: 'conclusion',
      targetId: conclusion.conclusionId,
      timestamp: conclusion.confirmedAt,
      details: {
        barcode: conclusion.barcode,
        finalResult: conclusion.finalResult,
      },
    });
  });

  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateMockData() {
  const users = generateUsers();
  const versions = generateSampleVersions(users);

  versions.forEach((version) => {
    const existing = versionControlEngine.getVersionHistory(version.barcode);
    if (existing.length === 0 || existing[existing.length - 1].versionId !== version.versionId) {
      versionControlEngine.setVersions(version.barcode, [
        ...existing.filter((v) => v.barcode === version.barcode),
        version,
      ]);
    }
  });

  const comments = generateReviewComments(versions, users);
  const conclusions = generateFinalConclusions(versions, comments, users);
  const dedupResults = generateDedupResults(versions);
  const auditLogs = generateAuditLogs(versions, comments, conclusions, users);

  deduplicationEngine.setAllDedupResults(dedupResults);
  auditEngine.setInitialLogs(auditLogs);
  auditEngine.setCurrentUser(users[0]);

  const pendingDiffs = diffEngine.getPendingDiffs(versions);

  return {
    users,
    versions,
    comments,
    conclusions,
    dedupResults,
    auditLogs,
    pendingDiffs,
  };
}

export function generateStatistics(versions: SampleVersion[], dedupResults: DedupResult[], pendingDiffs: DiffResult[], comments: ReviewComment[], conclusions: FinalConclusion[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const thisMonthTimestamp = thisMonth.getTime();

  return {
    todayImports: versions.filter((v) => v.createdAt >= todayTimestamp && v.versionNumber === 1).length,
    pendingDiffs: pendingDiffs.length,
    duplicateWarnings: dedupResults.filter((r) => !r.isConfirmedDuplicate || r.mergeStrategy === null).length,
    aiAnalysisProgress: Math.round(
      (versions.filter((v) => v.aiAnalysis).length / versions.length) * 100
    ),
    totalSamples: new Set(versions.map((v) => v.barcode)).size,
    confirmedConclusions: conclusions.length,
    pendingReviews: comments.filter((c) => !c.finalConclusionId).length,
    thisMonthAudits: conclusions.filter((c) => c.confirmedAt >= thisMonthTimestamp).length,
  };
}
