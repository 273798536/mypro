import { nanoid } from 'nanoid';
import { getDb, initDatabase } from '../api/db/connection';
import type { Intent, RiskLevel, MaterialSource, VersionType } from '../shared/types.ts';

interface SampleRecord {
  sessionId: string;
  customerText: string;
  robotText: string;
  originalAnnotation: Intent;
  aiPrediction: Intent;
  aiConfidence: number;
  riskLevel: RiskLevel;
  driftScore: number;
  sourceFile: string;
  sourceRow: number;
  sourceType: MaterialSource;
  batchId: string;
  truncated?: boolean;
  truncationReason?: string;
  fullContext?: string;
  trainingSampleId?: string;
  promptVersionId?: string;
  hasManualCorrection?: boolean;
  manualCorrection?: {
    from: Intent;
    to: Intent;
    reason: string;
    operator: string;
  };
  hasRollback?: boolean;
  rollbackToVersion?: string;
  toolCallError?: {
    errorType: string;
    errorMessage: string;
    parameterName?: string;
    parameterValue?: string;
    humanReadableExplanation: string;
  };
}

function generateTruncationReason(technicalReason: string): { technical: string; human: string } {
  const reasonMap: Record<string, { technical: string; human: string }> = {
    'max_tokens_exceeded': {
      technical: 'max_tokens_exceeded: context length > 4096 tokens',
      human: '对话内容过长，为保证分析准确性，系统自动保留了核心内容，省略了部分历史聊天记录'
    },
    'field_length_limit': {
      technical: 'field_length_limit: customer_text > 500 chars',
      human: '用户输入内容特别长，系统只保留了最关键的部分用于分析'
    },
    'special_chars_stripped': {
      technical: 'special_chars_stripped: invalid unicode removed',
      human: '原文包含一些特殊符号（如表情、乱码），系统已自动清理后再进行分析'
    },
    'old_format_migration': {
      technical: 'old_format_migration: pre-2026 schema migrated',
      human: '这是从旧系统导入的历史数据，格式与新版不完全一致，已做兼容性处理'
    }
  };
  return reasonMap[technicalReason] || { technical: technicalReason, human: technicalReason };
}

function calculateDriftScore(original: Intent, predicted: Intent): number {
  if (original === predicted) return 0;
  
  const semanticDistance: Record<string, number> = {
    'refund-exchange': 0.3,
    'exchange-refund': 0.3,
    'complaint-refund': 0.5,
    'refund-complaint': 0.5,
    'complaint-other': 0.7,
    'other-complaint': 0.7,
    'inquiry-technical_support': 0.4,
    'technical_support-inquiry': 0.4,
  };
  
  const key = `${original}-${predicted}`;
  return semanticDistance[key] || 0.8;
}

function calculateRiskLevel(driftScore: number, confidence: number): RiskLevel {
  if (driftScore >= 0.7 && confidence < 0.8) return 'high';
  if (driftScore >= 0.5) return 'medium';
  if (driftScore > 0) return 'low';
  return 'normal';
}

function seedConversations(): void {
  const db = getDb();
  
  const truncationReason1 = generateTruncationReason('max_tokens_exceeded');
  const truncationReason2 = generateTruncationReason('old_format_migration');
  const truncationReason3 = generateTruncationReason('field_length_limit');
  
  const samples: SampleRecord[] = [
    {
      sessionId: 'S007',
      customerText: '帮我查一下订单什么时候发货',
      robotText: '您好，请提供订单号',
      originalAnnotation: 'refund',
      aiPrediction: 'inquiry',
      aiConfidence: 0.92,
      driftScore: 0.8,
      riskLevel: 'high',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 7,
      sourceType: 'segmentation_list',
      batchId: 'batch_002',
      hasManualCorrection: true,
      manualCorrection: {
        from: 'refund',
        to: 'inquiry',
        reason: '原标注错误，用户只是询问发货时间，没有退款意图。备注里也明确标注了应该是inquiry',
        operator: '复核员_周主管'
      },
      toolCallError: {
        errorType: 'parameter_mismatch',
        errorMessage: 'Expected intent field to be one of [refund, exchange, complaint, inquiry, technical_support, other], got "refund " (with trailing space)',
        parameterName: 'intent',
        parameterValue: 'refund ',
        humanReadableExplanation: '在切分清单第7行，标注员在"refund"后面不小心多敲了一个空格，导致系统识别时参数匹配失败'
      }
    },
    {
      sessionId: 'S008',
      customerText: '我要退款退款退款！太生气了',
      robotText: '非常理解您的心情，请先冷静一下',
      originalAnnotation: 'other',
      aiPrediction: 'refund',
      aiConfidence: 0.98,
      driftScore: 0.8,
      riskLevel: 'high',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 8,
      sourceType: 'segmentation_list',
      batchId: 'batch_002',
      hasManualCorrection: true,
      manualCorrection: {
        from: 'other',
        to: 'refund',
        reason: '原标注错误，用户连续三次说退款，明显是退款意图。other标注明显不合理',
        operator: '复核员_周主管'
      }
    },
    {
      sessionId: 'S018',
      customerText: '退款申请提交了什么时候能处理',
      robotText: '退款申请一般1-3个工作日处理完成',
      originalAnnotation: 'inquiry',
      aiPrediction: 'refund',
      aiConfidence: 0.88,
      driftScore: 0.8,
      riskLevel: 'high',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 18,
      sourceType: 'segmentation_list',
      batchId: 'batch_002'
    },
    {
      sessionId: 'T002',
      customerText: '请问这个商品支持7天无理由退换吗？',
      robotText: '是的，支持7天无理由退换货',
      originalAnnotation: 'inquiry',
      aiPrediction: 'exchange',
      aiConfidence: 0.78,
      driftScore: 0.8,
      riskLevel: 'high',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 2,
      sourceType: 'training_sample',
      batchId: 'batch_003',
      truncated: true,
      truncationReason: truncationReason1.technical,
      fullContext: '用户：请问这个商品支持7天无理由退换吗？\n客服：是的，支持7天无理由退换货\n用户：那如果我买了之后不喜欢可以退吗？\n客服：可以的，只要商品不影响二次销售\n用户：退货运费谁出？\n客服：非质量问题的话需要您承担运费哦\n用户：好的，我知道了，谢谢\n客服：不客气，还有其他问题吗？\n用户：没有了\n客服：好的，祝您购物愉快~',
      promptVersionId: 'pv_002'
    },
    {
      sessionId: 'T003',
      customerText: '发货太慢了，等了五天还没到，什么服务态度！',
      robotText: '非常抱歉让您久等了，我帮您催促快递',
      originalAnnotation: 'complaint',
      aiPrediction: 'refund',
      aiConfidence: 0.85,
      driftScore: 0.5,
      riskLevel: 'medium',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 3,
      sourceType: 'training_sample',
      batchId: 'batch_003',
      trainingSampleId: 'TS-2026-0512-003',
      promptVersionId: 'pv_003'
    },
    {
      sessionId: 'T006',
      customerText: '算了，就这样吧，以后不买了',
      robotText: '非常抱歉给您带来不好的体验，欢迎您再次光临',
      originalAnnotation: 'other',
      aiPrediction: 'complaint',
      aiConfidence: 0.82,
      driftScore: 0.7,
      riskLevel: 'medium',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 6,
      sourceType: 'training_sample',
      batchId: 'batch_003',
      promptVersionId: 'pv_003'
    },
    {
      sessionId: 'S001',
      customerText: '你们这个商品质量也太差了吧，刚用三天就坏了！',
      robotText: '非常抱歉给您带来不好的体验，请问具体是什么问题呢？',
      originalAnnotation: 'complaint',
      aiPrediction: 'complaint',
      aiConfidence: 0.96,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 1,
      sourceType: 'segmentation_list',
      batchId: 'batch_002'
    },
    {
      sessionId: 'S002',
      customerText: '我想申请退货退款',
      robotText: '好的，请告知您的订单号',
      originalAnnotation: 'refund',
      aiPrediction: 'refund',
      aiConfidence: 0.99,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 2,
      sourceType: 'segmentation_list',
      batchId: 'batch_002'
    },
    {
      sessionId: 'S003',
      customerText: '这个尺码不太合适，能不能换一个？',
      robotText: '可以的，换货需要您寄回原商品',
      originalAnnotation: 'exchange',
      aiPrediction: 'exchange',
      aiConfidence: 0.97,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 3,
      sourceType: 'segmentation_list',
      batchId: 'batch_002'
    },
    {
      sessionId: 'S006',
      customerText: '这什么垃圾东西，再也不买了！',
      robotText: '非常抱歉让您失望了，请问是哪里不满意呢？',
      originalAnnotation: 'complaint',
      aiPrediction: 'complaint',
      aiConfidence: 0.95,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 6,
      sourceType: 'segmentation_list',
      batchId: 'batch_002',
      truncated: true,
      truncationReason: truncationReason2.technical,
      fullContext: '【旧系统导入数据】\n时间：2026-05-28 14:32:18\n用户ID：U123456\n【START】\n用户：这什么垃圾东西，再也不买了！\n客服：非常抱歉让您失望了，请问是哪里不满意呢？\n用户：自己看！质量差成这样还好意思卖？\n客服：非常抱歉，能具体描述一下问题吗？\n用户：[图片]\n客服：收到图片，确实有质量问题，我们可以为您办理退换货\n用户：不用了，以后再也不来了\n【END】\n旧系统标注：投诉\n备注：用户情绪激动，已登记投诉记录'
    },
    {
      sessionId: 'S015',
      customerText: '你们这客服也太慢了吧 等了半小时',
      robotText: '非常抱歉让您久等了，现在为您处理',
      originalAnnotation: 'complaint',
      aiPrediction: 'other',
      aiConfidence: 0.72,
      driftScore: 0.7,
      riskLevel: 'medium',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 15,
      sourceType: 'segmentation_list',
      batchId: 'batch_002'
    },
    {
      sessionId: 'S020',
      customerText: '500块钱的东西就这个质量？真的服了',
      robotText: '非常抱歉，我们的产品让您失望了',
      originalAnnotation: 'complaint',
      aiPrediction: 'refund',
      aiConfidence: 0.86,
      driftScore: 0.5,
      riskLevel: 'medium',
      sourceFile: 'segmentation_temp_20260612.csv',
      sourceRow: 20,
      sourceType: 'segmentation_list',
      batchId: 'batch_002'
    },
    {
      sessionId: 'T001',
      customerText: '商品质量有问题，要求全额退款！',
      robotText: '非常抱歉，我们会尽快为您处理退款',
      originalAnnotation: 'refund',
      aiPrediction: 'refund',
      aiConfidence: 0.98,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 1,
      sourceType: 'training_sample',
      batchId: 'batch_003',
      trainingSampleId: 'TS-2026-0510-001'
    },
    {
      sessionId: 'T005',
      customerText: '网页一直加载不出来，一直转圈，换了浏览器也不行',
      robotText: '请尝试清除浏览器缓存或者使用无痕模式访问',
      originalAnnotation: 'technical_support',
      aiPrediction: 'inquiry',
      aiConfidence: 0.76,
      driftScore: 0.4,
      riskLevel: 'low',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 5,
      sourceType: 'training_sample',
      batchId: 'batch_003'
    },
    {
      sessionId: 'T007',
      customerText: '我买的手机屏幕有划痕，要求退款！！！',
      robotText: '非常抱歉，请问您是否已签收？可以申请退换货',
      originalAnnotation: 'refund',
      aiPrediction: 'complaint',
      aiConfidence: 0.81,
      driftScore: 0.5,
      riskLevel: 'medium',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 7,
      sourceType: 'training_sample',
      batchId: 'batch_003',
      trainingSampleId: 'TS-2026-0516-007',
      promptVersionId: 'pv_001'
    },
    {
      sessionId: 'T010',
      customerText: '这已经是第三次出问题了！你们到底能不能解决？',
      robotText: '非常抱歉，这次一定帮您彻底解决问题',
      originalAnnotation: 'complaint',
      aiPrediction: 'complaint',
      aiConfidence: 0.96,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'training_samples_with_remarks_202605.json',
      sourceRow: 10,
      sourceType: 'training_sample',
      batchId: 'batch_003',
      hasRollback: true
    },
    {
      sessionId: 'BAD-001',
      customerText: '',
      robotText: '您好，请问有什么可以帮您？',
      originalAnnotation: 'other',
      aiPrediction: 'inquiry',
      aiConfidence: 0.55,
      driftScore: 0.8,
      riskLevel: 'high',
      sourceFile: 'annotations_20260601_0610.xlsx',
      sourceRow: 45,
      sourceType: 'annotation_record',
      batchId: 'batch_001',
      toolCallError: {
        errorType: 'empty_field',
        errorMessage: 'customer_text field is empty or contains only whitespace',
        parameterName: 'customer_text',
        parameterValue: '',
        humanReadableExplanation: '在标注记录Excel第45行，用户输入内容是空的，可能是导出时漏填或者用户根本没有发消息。这条数据建议直接忽略。'
      }
    },
    {
      sessionId: 'BAD-002',
      customerText: '想退款买了不合适但是已经超过7天了怎么办能通融一下吗真的没穿过吊牌还在',
      robotText: '您的情况我帮您特殊申请一下，请稍等',
      originalAnnotation: 'refund',
      aiPrediction: 'refund',
      aiConfidence: 0.91,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'annotations_20260601_0610.xlsx',
      sourceRow: 78,
      sourceType: 'annotation_record',
      batchId: 'batch_001',
      truncated: true,
      truncationReason: truncationReason3.technical,
      fullContext: '想退款买了不合适但是已经超过7天了怎么办能通融一下吗真的没穿过吊牌还在包装盒也完好无损就是试穿了一下尺码不合适平时穿M码这个版型偏小应该买L码的但是当时没看清楚尺码表就直接下单了收到货试穿发现很紧然后就想换但是换货又要等好几天而且我怕换了还是不合适所以还是想直接退款算了虽然知道超过7天但是真的没怎么穿吊牌都还在上面挂着能不能帮忙特殊处理一下谢谢了'
    },
    {
      sessionId: 'BAD-003',
      customerText: '订单号: 20260615001 金额: 元 数量: 3',
      robotText: '好的，我帮您查询一下这个订单',
      originalAnnotation: 'inquiry',
      aiPrediction: 'inquiry',
      aiConfidence: 0.88,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'annotations_20260601_0610.xlsx',
      sourceRow: 112,
      sourceType: 'annotation_record',
      batchId: 'batch_001',
      toolCallError: {
        errorType: 'missing_unit',
        errorMessage: 'Amount field missing currency unit, value is " 元" with leading space',
        parameterName: 'amount',
        parameterValue: ' 元',
        humanReadableExplanation: '在标注记录Excel第112行，"金额"字段只写了"元"，漏填了具体数字（应该是"299元"之类的）。这是从旧表导入时常见的问题。'
      }
    },
    {
      sessionId: 'BAD-004',
      customerText: '你们的东西太差了！[已删除敏感词]客服也不解决问题！',
      robotText: '非常抱歉给您带来不好的体验',
      originalAnnotation: 'complaint',
      aiPrediction: 'complaint',
      aiConfidence: 0.94,
      driftScore: 0,
      riskLevel: 'normal',
      sourceFile: 'annotations_20260601_0610.xlsx',
      sourceRow: 134,
      sourceType: 'annotation_record',
      batchId: 'batch_001',
      truncated: true,
      truncationReason: generateTruncationReason('special_chars_stripped').technical
    }
  ];

  const insertConv = db.prepare(`
    INSERT OR REPLACE INTO conversations 
    (id, session_id, customer_text, robot_text, full_context, truncated, truncation_reason, 
     source_file, source_row, source_type, original_annotation, ai_prediction, 
     ai_confidence, risk_level, drift_score, batch_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const insertVersion = db.prepare(`
    INSERT OR REPLACE INTO version_records
    (id, conversation_id, version_type, intent, confidence, remark, operator, 
     prompt_version_id, training_sample_id, created_at, parent_version_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `);

  const insertReview = db.prepare(`
    INSERT OR REPLACE INTO review_records
    (id, conversation_id, reviewer, original_intent, corrected_intent, change_reason, reviewed_at, status)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'approved')
  `);

  for (const sample of samples) {
    const convId = 'conv_' + nanoid(8);
    
    const driftScore = sample.driftScore || calculateDriftScore(sample.originalAnnotation, sample.aiPrediction);
    const riskLevel = sample.riskLevel || calculateRiskLevel(driftScore, sample.aiConfidence);
    
    insertConv.run(
      convId,
      sample.sessionId,
      sample.customerText,
      sample.robotText,
      sample.fullContext,
      sample.truncated ? 1 : 0,
      sample.truncationReason,
      sample.sourceFile,
      sample.sourceRow,
      sample.sourceType,
      sample.originalAnnotation,
      sample.aiPrediction,
      sample.aiConfidence,
      riskLevel,
      driftScore,
      sample.batchId
    );

    const annotationVersionId = 'ver_' + nanoid(8);
    insertVersion.run(
      annotationVersionId,
      convId,
      'annotation' as VersionType,
      sample.originalAnnotation,
      1.0,
      `原始标注，来源: ${sample.sourceFile} 第${sample.sourceRow}行`,
      sample.manualCorrection?.operator || 'system',
      null,
      sample.trainingSampleId || null,
      null
    );

    const predictionVersionId = 'ver_' + nanoid(8);
    insertVersion.run(
      predictionVersionId,
      convId,
      'prediction' as VersionType,
      sample.aiPrediction,
      sample.aiConfidence,
      `AI预测，使用提示词版本: ${sample.promptVersionId || 'pv_003'}`,
      'ai_system',
      sample.promptVersionId || null,
      sample.trainingSampleId || null,
      annotationVersionId
    );

    if (sample.hasManualCorrection && sample.manualCorrection) {
      const manualVersionId = 'ver_' + nanoid(8);
      insertVersion.run(
        manualVersionId,
        convId,
        'manual' as VersionType,
        sample.manualCorrection.to,
        1.0,
        sample.manualCorrection.reason,
        sample.manualCorrection.operator,
        sample.promptVersionId || null,
        sample.trainingSampleId || null,
        predictionVersionId
      );

      insertReview.run(
        'review_' + nanoid(8),
        convId,
        sample.manualCorrection.operator,
        sample.manualCorrection.from,
        sample.manualCorrection.to,
        sample.manualCorrection.reason
      );

      if (sample.hasRollback) {
        const rollbackVersionId = 'ver_' + nanoid(8);
        insertVersion.run(
          rollbackVersionId,
          convId,
          'rollback' as VersionType,
          sample.originalAnnotation,
          1.0,
          '回滚到原始标注版本，复核后认为原始标注是正确的',
          '复核员_李组长',
          null,
          null,
          manualVersionId
        );
      }
    }
  }

  console.log(`Seeded ${samples.length} sample conversations with version history`);
}

function main(): void {
  console.log('Seeding sample data...');
  initDatabase();
  seedConversations();
  console.log('Sample data seeding complete!');
}

main();
