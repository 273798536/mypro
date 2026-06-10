/**
 * AI/ML 工作流业务服务
 * 功能：文件导入解析、模拟AI分析、人工修正处理、结论生成等
 */

import * as XLSX from 'xlsx';
import type { ImportPreviewRow, CorrectionRowData } from '@/store/workflowStore';
import type {
  SpeciesMatchResult,
  AnomalyRecord,
  ConclusionRecord,
  GroupDimension,
} from '@/types';

/** 导入解析结果 */
export interface ImportParseResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  errorMessage?: string;
  /** 表头列表 */
  headers?: string[];
  /** 预览行数据 */
  previewRows?: ImportPreviewRow[];
  /** 数据总行数 */
  totalRows?: number;
  /** 检测到的文件类型 */
  detectedType?: 'excel' | 'csv';
}

/** AI分析执行结果 */
export interface AIAnalysisExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 同义匹配结果 */
  synonymMatches: SpeciesMatchResult[];
  /** 异常标记 */
  anomalies: AnomalyRecord[];
  /** 分析耗时（毫秒） */
  durationMs: number;
  /** 分析摘要 */
  summary: {
    totalRecords: number;
    matchedCount: number;
    unmatchedCount: number;
    conflictCount: number;
    anomalyCount: number;
  };
}

/** 结论生成参数 */
export interface ConclusionGenerationParams {
  /** 关联样本ID列表 */
  sampleIds: string[];
  /** 关联版本ID列表 */
  versionIds: string[];
  /** 关联修正ID列表 */
  correctionIds: string[];
  /** 关联异常ID列表 */
  anomalyIds: string[];
  /** 结论标题（可选，不传则自动生成） */
  title?: string;
  /** 结论内容（可选，不传则自动生成） */
  content?: string;
  /** 操作人 */
  operator: string;
}

/** 结论生成结果 */
export interface ConclusionGenerationResult {
  /** 是否成功 */
  success: boolean;
  /** 结论记录 */
  conclusion?: ConclusionRecord;
  /** 全链路ID */
  traceChainId: string;
  /** 整体置信度 0-100 */
  confidenceScore: number;
  /** 各维度置信度 */
  confidenceDimensions: Array<{
    dimension: string;
    score: number;
    explanation: string;
  }>;
}

/** 维度显示名映射 */
const GROUP_DIMENSION_LABELS: Record<GroupDimension, string> = {
  batch_number: '培养基批号',
  sampling_location: '采样地点',
  species: '物种名称',
  culture_condition: '培养条件',
  culture_medium: '培养基类型',
};

/** 生成唯一ID工具 */
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 延迟模拟 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 工作流服务类
 */
export class WorkflowService {
  constructor() {}

  // ========== 文件导入解析 ==========

  /**
   * 解析导入的Excel/CSV文件
   * @param file 上传的File对象
   * @param previewLimit 预览行数限制
   */
  async parseImportFile(
    file: File,
    previewLimit: number = 50
  ): Promise<ImportParseResult> {
    try {
      const fileName = file.name.toLowerCase();
      const isCsv = fileName.endsWith('.csv');
      const detectedType: 'excel' | 'csv' = isCsv ? 'csv' : 'excel';

      // 读取文件
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // 取第一个sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // 转换为二维数组
      const data: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

      if (data.length === 0) {
        return {
          success: false,
          errorMessage: '文件内容为空',
          detectedType,
        };
      }

      // 提取表头（第一行）
      const rawHeaders = (data[0] as unknown[]).map((h, idx) => {
        const str = String(h ?? '');
        return str.trim() || `列${idx + 1}`;
      });

      // 数据行（从第二行开始）
      const dataRows = data.slice(1).filter((row) => row.some((cell) => cell !== null && String(cell).trim() !== ''));

      // 生成预览行（保留原始行号，从2开始，因为1是表头）
      const previewRows: ImportPreviewRow[] = dataRows.slice(0, previewLimit).map((row, idx) => {
        const originalRowNo = idx + 2;
        const cells: Record<string, string | number | null> = {};
        rawHeaders.forEach((header, colIdx) => {
          const value = row[colIdx] ?? null;
          if (value === null) {
            cells[header] = null;
          } else if (typeof value === 'number') {
            cells[header] = value;
          } else {
            const strVal = String(value);
            // 尝试转换为数字
            const numVal = Number(strVal);
            if (!isNaN(numVal) && strVal.trim() !== '' && !isNaN(parseFloat(strVal))) {
              cells[header] = numVal;
            } else {
              cells[header] = strVal;
            }
          }
        });
        return { rowNumber: originalRowNo, cells };
      });

      return {
        success: true,
        headers: rawHeaders,
        previewRows,
        totalRows: dataRows.length,
        detectedType,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知解析错误';
      return {
        success: false,
        errorMessage: `文件解析失败：${msg}`,
      };
    }
  }

  /**
   * 获取分组维度显示名称
   */
  getDimensionLabel(dimension: GroupDimension): string {
    return GROUP_DIMENSION_LABELS[dimension] || dimension;
  }

  /**
   * 获取所有分组维度选项
   */
  getAllDimensionOptions(): Array<{ value: GroupDimension; label: string }> {
    return (Object.keys(GROUP_DIMENSION_LABELS) as GroupDimension[]).map((key) => ({
      value: key,
      label: GROUP_DIMENSION_LABELS[key],
    }));
  }

  // ========== AI分析 ==========

  /**
   * 执行AI分析（同义匹配+异常检测）
   * @param recordCount 记录数量
   * @param onProgress 进度回调
   */
  async executeAIAnalysis(
    recordCount: number,
    onProgress?: (progress: number) => void
  ): Promise<AIAnalysisExecutionResult> {
    const startTime = Date.now();

    // 模拟进度更新
    const progressSteps = [10, 25, 40, 55, 70, 85, 100];
    for (const step of progressSteps) {
      await delay(150 + Math.random() * 200);
      onProgress?.(step);
    }

    // 模拟同义匹配结果
    const sampleNames = [
      { input: '大肠杆菌', matched: '大肠埃希氏菌', score: 98, method: 'exact' as const },
      { input: 'E.coli', matched: '大肠埃希氏菌', score: 95, method: 'fuzzy' as const },
      { input: '金葡菌', matched: '金黄色葡萄球菌', score: 92, method: 'fuzzy' as const },
      { input: '金黄色葡萄球菌', matched: '金黄色葡萄球菌', score: 100, method: 'exact' as const },
      { input: '枯草杆菌', matched: '枯草芽孢杆菌', score: 90, method: 'fuzzy' as const },
      { input: '绿脓杆菌', matched: '铜绿假单胞菌', score: 88, method: 'fuzzy' as const },
      { input: '未知菌种X', matched: null, score: 35, method: 'none' as const },
      { input: '铜绿假单胞菌', matched: '铜绿假单胞菌', score: 99, method: 'exact' as const },
      { input: '白假丝酵母菌', matched: '白色念珠菌', score: 93, method: 'fuzzy' as const },
      { input: 'Candida albicans', matched: '白色念珠菌', score: 96, method: 'ai' as const },
    ];

    const count = Math.max(recordCount, sampleNames.length);
    const synonymMatches: SpeciesMatchResult[] = [];

    for (let i = 0; i < count; i++) {
      const template = sampleNames[i % sampleNames.length];
      synonymMatches.push({
        inputName: template.input,
        matchedSpeciesId: template.matched ? `SP-${String((i % 8) + 1).padStart(3, '0')}` : null,
        matchedCanonicalName: template.matched,
        matchScore: template.score,
        matchMethod: template.method,
        candidates:
          template.method === 'fuzzy' || template.method === 'ai'
            ? [
                {
                  speciesId: `SP-${String((i % 8) + 1).padStart(3, '0')}`,
                  canonicalName: template.matched || '候选1',
                  score: template.score,
                  matchedAlias: template.input,
                },
                {
                  speciesId: `SP-${String(((i + 1) % 8) + 1).padStart(3, '0')}`,
                  canonicalName: '候选物种2',
                  score: Math.max(50, template.score - 15),
                  matchedAlias: '别名2',
                },
              ]
            : [],
        needsManualReview: template.method === 'none' || template.score < 80,
        unmatchReason: template.method === 'none' ? '未在标准物种库中找到匹配项' : null,
      });
    }

    // 模拟异常标记
    const anomalyTemplates: Array<Partial<AnomalyRecord> & { title: string; description: string }> = [
      {
        anomalyType: 'species_synonym_conflict',
        title: '物种名称匹配冲突',
        description: '该记录存在多个高置信度候选物种，请人工确认',
        priority: 2,
      },
      {
        anomalyType: 'data_inconsistency',
        title: '数据格式不一致',
        description: '批号格式与标准规范不符，建议进行标准化修正',
        priority: 2,
      },
      {
        anomalyType: 'ai_low_confidence',
        title: 'AI匹配置信度偏低',
        description: '物种名称自动匹配置信度低于阈值，需人工复核',
        priority: 3,
      },
      {
        anomalyType: 'data_inconsistency',
        title: '数值范围异常',
        description: '菌落计数值超出常规范围，建议核对原始记录',
        priority: 1,
      },
    ];

    const anomalies: AnomalyRecord[] = [];
    const anomalyCount = Math.min(4, Math.floor(count / 2));
    for (let i = 0; i < anomalyCount; i++) {
      const tpl = anomalyTemplates[i % anomalyTemplates.length];
      anomalies.push({
        id: genId('ANOM'),
        anomalyType: tpl.anomalyType || 'manual_correction_needed',
        title: tpl.title,
        description: tpl.description,
        sampleIds: [genId('sample')],
        relatedSamplingLocations: ['实验室A', '灌装间B'],
        relatedConclusionIds: [],
        priority: (tpl.priority ?? 2) as 1 | 2 | 3,
        status: 'pending',
        conflictDetail: null,
        aiAnalysisNotes: null,
        detectedAt: new Date().toISOString(),
        detectedBy: 'ai',
        assigneeId: null,
        handlingHistory: [],
        resolution: null,
        resolvedAt: null,
        resolvedBy: null,
        relatedSynonymIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
      });
    }

    const matchedCount = synonymMatches.filter(
      (r) => r.matchMethod === 'exact' || r.matchMethod === 'fuzzy' || r.matchMethod === 'ai'
    ).length;
    const unmatchedCount = synonymMatches.filter((r) => r.matchMethod === 'none').length;
    const conflictCount = synonymMatches.filter((r) => r.needsManualReview).length;

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      synonymMatches,
      anomalies,
      durationMs,
      summary: {
        totalRecords: count,
        matchedCount,
        unmatchedCount,
        conflictCount,
        anomalyCount: anomalies.length,
      },
    };
  }

  // ========== 人工修正 ==========

  /**
   * 从AI分析结果生成待修正列表
   */
  generateCorrectionRows(
    synonymMatches: SpeciesMatchResult[]
  ): CorrectionRowData[] {
    const rows: CorrectionRowData[] = [];
    let rowIdx = 0;

    synonymMatches.forEach((match, idx) => {
      if (match.needsManualReview || match.matchMethod === 'fuzzy') {
        rows.push({
          sampleId: `sample-${idx + 1}`,
          originalRowNo: idx + 2,
          sampleNo: `S-2026-${String(rowIdx + 1).padStart(5, '0')}`,
          beforeValue: match.inputName,
          afterValue: match.matchedCanonicalName,
          fieldName: 'speciesName',
          reason: match.matchMethod === 'none'
            ? '未自动匹配到标准物种，需人工指定'
            : '模糊匹配置信度不足，建议复核',
          isSaved: false,
        });
        rowIdx++;
      }
    });

    return rows;
  }

  /**
   * 批量保存修正记录（模拟）
   */
  async saveCorrections(rows: CorrectionRowData[]): Promise<{
    success: boolean;
    savedCount: number;
    savedIds: string[];
  }> {
    await delay(400 + rows.length * 20);
    const savedIds: string[] = [];
    rows.forEach((r) => {
      if (r.afterValue !== null && String(r.afterValue).trim() !== '') {
        savedIds.push(r.sampleId);
      }
    });
    return {
      success: true,
      savedCount: savedIds.length,
      savedIds,
    };
  }

  // ========== 结论生成 ==========

  /**
   * 生成结论记录与全链路追踪信息
   */
  async generateConclusion(
    params: ConclusionGenerationParams
  ): Promise<ConclusionGenerationResult> {
    await delay(800 + Math.random() * 400);

    const traceChainId = `TRACE-${Date.now().toString(36).toUpperCase()}`;

    // 计算置信度
    const baseScore = 78;
    const sampleBonus = Math.min(params.sampleIds.length * 2, 10);
    const correctionPenalty = Math.min(params.correctionIds.length * 3, 15);
    const anomalyPenalty = Math.min(params.anomalyIds.length * 4, 12);
    const confidenceScore = Math.max(50, Math.min(98, baseScore + sampleBonus - correctionPenalty - anomalyPenalty));

    const confidenceDimensions = [
      {
        dimension: '数据完整性',
        score: Math.min(98, 85 + sampleBonus),
        explanation: `基于${params.sampleIds.length}个样本记录的完整度评估`,
      },
      {
        dimension: '物种匹配准确性',
        score: Math.max(60, 90 - correctionPenalty),
        explanation: params.correctionIds.length > 0
          ? `经${params.correctionIds.length}项人工修正后准确性提升`
          : '自动匹配准确率良好',
      },
      {
        dimension: '版本一致性',
        score: 92,
        explanation: '版本链完整，无断裂或冲突',
      },
      {
        dimension: '异常处理覆盖度',
        score: Math.max(55, 88 - anomalyPenalty),
        explanation: params.anomalyIds.length > 0
          ? `${params.anomalyIds.length}项异常已纳入结论评估`
          : '无未处理异常记录',
      },
      {
        dimension: '链路可追溯性',
        score: 95,
        explanation: `全链路ID：${traceChainId}，支持完整溯源`,
      },
    ];

    // 生成结论标题和内容（若未传入）
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const autoTitle = params.title || `数据综合分析结论报告 - ${dateStr}`;
    const autoContent = params.content || this.generateAutoConclusionContent(params, confidenceScore);

    const conclusion: ConclusionRecord = {
      id: genId('CONC'),
      sampleIds: params.sampleIds,
      versionIds: params.versionIds,
      correctionIds: params.correctionIds,
      title: autoTitle,
      content: autoContent,
      summary: autoContent.slice(0, 150) + (autoContent.length > 150 ? '...' : ''),
      conclusionType: 'general',
      confidenceScore,
      confidenceDimensions: confidenceDimensions.map((d) => ({
        dimension: d.dimension,
        score: d.score,
        explanation: d.explanation,
      })),
      status: 'draft',
      submittedAt: null,
      submittedBy: null,
      reviewer: null,
      reviewComment: null,
      reviewedAt: null,
      evidenceChain: [
        {
          type: 'sample_data',
          referenceId: params.sampleIds[0] || 'N/A',
          description: `${params.sampleIds.length}条样本检测数据`,
        },
        ...params.correctionIds.slice(0, 2).map((id) => ({
          type: 'manual_correction' as const,
          referenceId: id,
          description: '人工修正记录',
        })),
        ...params.anomalyIds.slice(0, 2).map((id) => ({
          type: 'ai_analysis' as const,
          referenceId: id,
          description: 'AI异常标记记录',
        })),
      ],
      resolvedAnomalyIds: params.anomalyIds,
      isSuperseded: false,
      supersededBy: null,
      tags: ['auto-generated', traceChainId],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: params.operator,
      updatedBy: params.operator,
    };

    return {
      success: true,
      conclusion,
      traceChainId,
      confidenceScore,
      confidenceDimensions,
    };
  }

  /**
   * 自动生成结论内容文本
   */
  private generateAutoConclusionContent(
    params: ConclusionGenerationParams,
    confidenceScore: number
  ): string {
    const lines: string[] = [];
    const now = new Date().toLocaleString('zh-CN');

    lines.push(`一、概述`);
    lines.push(`本报告基于AI/ML工作流分析生成，关联${params.sampleIds.length}条样本记录、${params.versionIds.length}个数据版本、${params.correctionIds.length}项人工修正、${params.anomalyIds.length}条异常标记。`);
    lines.push(`分析完成时间：${now}`);
    lines.push('');

    lines.push(`二、数据质量评估`);
    lines.push(`整体置信度评分：${confidenceScore}分（满分100）。`);
    if (params.correctionIds.length > 0) {
      lines.push(`经${params.correctionIds.length}项人工修正后，数据准确性得到提升，修正内容已全部纳入结论计算。`);
    }
    if (params.anomalyIds.length > 0) {
      lines.push(`针对检出的${params.anomalyIds.length}项异常，已逐条分析并在结论中体现其影响。`);
    }
    lines.push('');

    lines.push(`三、核心发现`);
    if (confidenceScore >= 90) {
      lines.push(`1. 数据整体质量优秀，各项指标均在合理范围内；`);
      lines.push(`2. 物种名称匹配良好，同义词标准化效果显著；`);
      lines.push(`3. 版本链路完整，可支持全流程审计追踪。`);
    } else if (confidenceScore >= 75) {
      lines.push(`1. 数据整体质量良好，存在少量需要关注的问题；`);
      lines.push(`2. 部分物种名称经过人工修正后准确性得到保障；`);
      lines.push(`3. 建议在后续录入中加强格式规范性培训。`);
    } else {
      lines.push(`1. 数据存在一定质量问题，需持续优化录入流程；`);
      lines.push(`2. 建议对低置信度记录进行二次复核；`);
      lines.push(`3. 完善异常处理流程，降低人工修正依赖。`);
    }
    lines.push('');

    lines.push(`四、全链路追踪`);
    lines.push(`本结论可通过全链路ID追溯所有相关操作记录。`);
    lines.push(`建议后续使用报告导出中心生成正式归档报告。`);

    return lines.join('\n');
  }
}

/** 单例导出 */
export const workflowService = new WorkflowService();
