/**
 * 报告生成服务
 * 功能：批号追溯报告/物种一致性报告/全链路审计报告、Excel导出、PDF导出(HTML打印方案)
 */

// ============= 类型定义 =============

/** 报告类型 */
export type ReportType =
  | 'batch_traceability'   // 批号追溯报告
  | 'species_consistency'  // 物种一致性报告
  | 'full_audit';          // 全链路审计报告

/** 报告格式 */
export type ReportFormat = 'html' | 'excel' | 'pdf';

/** 报告生成状态 */
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

/** 报告基础元数据 */
export interface ReportMetadata {
  /** 报告ID */
  reportId: string;
  /** 报告类型 */
  reportType: ReportType;
  /** 报告标题 */
  title: string;
  /** 生成时间 */
  generatedAt: string;
  /** 生成人 */
  generatedBy: string;
  /** 报告格式 */
  format: ReportFormat;
  /** 报告状态 */
  status: ReportStatus;
  /** 报告版本号 */
  version: string;
  /** 数据时间范围 */
  dataRange?: {
    start: string;
    end: string;
  };
  /** 标签 */
  tags: string[];
  /** 文件大小（字节） */
  fileSize?: number;
}

/** 批号追溯报告数据 */
export interface BatchTraceabilityReport {
  metadata: ReportMetadata;
  /** 查询的批号列表 */
  batchNumbers: string[];
  /** 批号追溯详情 */
  batchDetails: Array<{
    batchNumber: string;
    /** 生产信息 */
    productionInfo: {
      manufacturer: string;
      productionDate: string;
      expiryDate: string;
      productionLine: string;
      batchSize: string;
    };
    /** 质量检测记录 */
    qualityRecords: Array<{
      testId: string;
      testDate: string;
      tester: string;
      testItem: string;
      result: string;
      standard: string;
      isPassed: boolean;
      remark?: string;
    }>;
    /** 使用记录 */
    usageRecords: Array<{
      usageId: string;
      usageDate: string;
      project: string;
      user: string;
      consumption: string;
      remaining: string;
    }>;
    /** 关联物种检测 */
    speciesTests: Array<{
      speciesName: string;
      standardSpecies: string;
      testCount: number;
      passRate: number;
    }>;
    /** 追溯结论 */
    conclusion: {
      status: 'normal' | 'warning' | 'abnormal';
      summary: string;
      risks: string[];
      suggestions: string[];
    };
  }>;
  /** 统计概览 */
  summary: {
    totalBatches: number;
    totalQualityTests: number;
    totalUsages: number;
    passRate: number;
    abnormalCount: number;
    warningCount: number;
  };
}

/** 物种一致性报告数据 */
export interface SpeciesConsistencyReport {
  metadata: ReportMetadata;
  /** 一致性分析结果 */
  analysis: {
    totalRecords: number;
    /** 物种匹配情况 */
    matchStats: {
      exactMatch: number;
      fuzzyMatch: number;
      noMatch: number;
      manualReviewed: number;
    };
    /** 一致性评分（百分制） */
    consistencyScore: number;
    /** 一致性评级 */
    consistencyLevel: 'excellent' | 'good' | 'fair' | 'poor';
  };
  /** 各物种一致性详情 */
  speciesDetails: Array<{
    speciesCode: string;
    standardName: string;
    aliases: string[];
    totalRecords: number;
    exactMatch: number;
    fuzzyMatch: number;
    noMatch: number;
    /** 冲突记录 */
    conflicts: Array<{
      recordId: string;
      originalName: string;
      matchedName: string;
      conflictType: string;
      confidence: number;
      rowNumber?: number;
    }>;
  }>;
  /** 名称标准化前后对比 */
  normalizationSummary: Array<{
    originalName: string;
    occurrenceCount: number;
    normalizedTo: string;
    standardCode: string;
  }>;
  /** 改进建议 */
  recommendations: string[];
}

/** 全链路审计报告数据 */
export interface FullAuditReport {
  metadata: ReportMetadata;
  /** 数据导入审计 */
  importAudit: {
    totalImports: number;
    imports: Array<{
      importId: string;
      importTime: string;
      operator: string;
      fileName: string;
      totalRows: number;
      successRows: number;
      failedRows: number;
      warnings: string[];
    }>;
  };
  /** 数据修改审计 */
  modificationAudit: {
    totalModifications: number;
    modifications: Array<{
      modifyId: string;
      modifyTime: string;
      operator: string;
      recordId: string;
      field: string;
      oldValue: string;
      newValue: string;
      reason: string;
    }>;
  };
  /** 去重操作审计 */
  deduplicationAudit: {
    totalOperations: number;
    operations: Array<{
      dedupId: string;
      operationTime: string;
      operator: string;
      mergedCount: number;
      remainingCount: number;
      strategy: string;
    }>;
  };
  /** 版本变更审计 */
  versionAudit: {
    totalVersions: number;
    versions: Array<{
      versionId: string;
      version: string;
      createdAt: string;
      createdBy: string;
      changeType: string;
      description: string;
      affectedRecords: number;
    }>;
  };
  /** 审计结论 */
  auditConclusion: {
    integrityScore: number;
    complianceStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
    findings: Array<{
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
  };
}

/** 报告生成结果 */
export interface ReportGenerationResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 报告元数据 */
  metadata?: ReportMetadata;
  /** 报告数据（原始数据结构） */
  reportData?: T;
  /** HTML内容（用于PDF打印或网页显示） */
  htmlContent?: string;
  /** Excel Blob数据（模拟） */
  excelBlob?: Blob;
  /** 下载链接（Mock） */
  downloadUrl?: string;
  /** 错误信息 */
  errorMessage?: string;
}

/** 报告查询条件 */
export interface ReportQuery {
  reportType: ReportType;
  batchNumbers?: string[];
  speciesCodes?: string[];
  dateRange?: { start: string; end: string };
  operators?: string[];
  includeRawData?: boolean;
}

// ============= Mock 数据 =============

/** 批号追溯Mock数据生成器 */
function generateMockBatchTraceability(): BatchTraceabilityReport['batchDetails'] {
  return [
    {
      batchNumber: 'B2026-001',
      productionInfo: {
        manufacturer: '北京培养基科技有限公司',
        productionDate: '2026-01-10',
        expiryDate: '2027-01-09',
        productionLine: 'A线-3号罐',
        batchSize: '500L'
      },
      qualityRecords: [
        { testId: 'QT-001', testDate: '2026-01-11', tester: '张三', testItem: 'pH值', result: '7.2', standard: '7.0-7.4', isPassed: true },
        { testId: 'QT-002', testDate: '2026-01-11', tester: '张三', testItem: '无菌检查', result: '无菌生长', standard: '无细菌生长', isPassed: true },
        { testId: 'QT-003', testDate: '2026-01-12', tester: '李四', testItem: '促生长试验', result: '生长良好', standard: '菌落正常生长', isPassed: true },
        { testId: 'QT-004', testDate: '2026-01-12', tester: '李四', testItem: '外观检查', result: '淡黄色粉末', standard: '淡黄色至黄色粉末', isPassed: true }
      ],
      usageRecords: [
        { usageId: 'US-001', usageDate: '2026-02-15', project: '水质检测项目', user: '王检验员', consumption: '50L', remaining: '450L' },
        { usageId: 'US-002', usageDate: '2026-03-01', project: '食品微生物检测', user: '赵检验员', consumption: '100L', remaining: '350L' },
        { usageId: 'US-003', usageDate: '2026-03-20', project: '药品无菌检查', user: '钱检验员', consumption: '80L', remaining: '270L' }
      ],
      speciesTests: [
        { speciesName: '大肠杆菌', standardSpecies: '大肠埃希氏菌 (SP-001)', testCount: 45, passRate: 100 },
        { speciesName: '金葡菌', standardSpecies: '金黄色葡萄球菌 (SP-002)', testCount: 32, passRate: 96.9 },
        { speciesName: '枯草杆菌', standardSpecies: '枯草芽孢杆菌 (SP-003)', testCount: 28, passRate: 100 }
      ],
      conclusion: {
        status: 'normal',
        summary: '该批号培养基生产、检验、使用全流程正常，质量稳定，无异常记录。',
        risks: [],
        suggestions: ['继续按常规流程使用', '关注有效期，及时使用剩余库存']
      }
    },
    {
      batchNumber: 'B2026-002',
      productionInfo: {
        manufacturer: '北京培养基科技有限公司',
        productionDate: '2026-02-05',
        expiryDate: '2027-02-04',
        productionLine: 'A线-2号罐',
        batchSize: '400L'
      },
      qualityRecords: [
        { testId: 'QT-005', testDate: '2026-02-06', tester: '王五', testItem: 'pH值', result: '7.5', standard: '7.0-7.4', isPassed: false, remark: '略高于标准上限，经OOS调查后判定合格' },
        { testId: 'QT-006', testDate: '2026-02-06', tester: '王五', testItem: '无菌检查', result: '无菌生长', standard: '无细菌生长', isPassed: true },
        { testId: 'QT-007', testDate: '2026-02-07', tester: '赵六', testItem: '促生长试验', result: '生长良好', standard: '菌落正常生长', isPassed: true }
      ],
      usageRecords: [
        { usageId: 'US-004', usageDate: '2026-03-05', project: '环境监测', user: '孙检验员', consumption: '60L', remaining: '340L' }
      ],
      speciesTests: [
        { speciesName: '金黄色葡萄球菌', standardSpecies: '金黄色葡萄球菌 (SP-002)', testCount: 38, passRate: 94.7 }
      ],
      conclusion: {
        status: 'warning',
        summary: '该批号培养基pH值检测曾超出标准范围，虽经OOS调查后放行，但建议加强使用前复核。',
        risks: ['pH值偏高可能对部分敏感菌株生长产生影响'],
        suggestions: ['使用前增加pH值复核', '用于敏感菌株检测时增加阳性对照']
      }
    },
    {
      batchNumber: 'B2026-003',
      productionInfo: {
        manufacturer: '上海生物试剂有限公司',
        productionDate: '2026-01-20',
        expiryDate: '2027-01-19',
        productionLine: 'B线-1号罐',
        batchSize: '600L'
      },
      qualityRecords: [
        { testId: 'QT-008', testDate: '2026-01-21', tester: '周七', testItem: 'pH值', result: '7.1', standard: '7.0-7.4', isPassed: true },
        { testId: 'QT-009', testDate: '2026-01-21', tester: '周七', testItem: '水分含量', result: '3.2%', standard: '≤5.0%', isPassed: true },
        { testId: 'QT-010', testDate: '2026-01-22', tester: '吴八', testItem: '促生长试验', result: '生长良好', standard: '菌落正常生长', isPassed: true }
      ],
      usageRecords: [
        { usageId: 'US-005', usageDate: '2026-02-28', project: '化妆品检测', user: '郑检验员', consumption: '120L', remaining: '480L' },
        { usageId: 'US-006', usageDate: '2026-03-15', project: '饮用水检测', user: '冯检验员', consumption: '90L', remaining: '390L' }
      ],
      speciesTests: [
        { speciesName: '铜绿假单胞菌', standardSpecies: '铜绿假单胞菌 (SP-004)', testCount: 25, passRate: 100 },
        { speciesName: '白色念珠菌', standardSpecies: '白色念珠菌 (SP-005)', testCount: 20, passRate: 95 }
      ],
      conclusion: {
        status: 'normal',
        summary: '该批号培养基质量符合标准要求，使用记录完整。',
        risks: [],
        suggestions: ['按正常库存管理', '建议存储条件保持2-8℃冷藏']
      }
    }
  ];
}

// ============= 核心服务 =============

/**
 * 报告生成服务类
 */
export class ReportService {

  constructor() {
  }

  /**
   * 生成批号追溯报告
   */
  generateBatchTraceabilityReport(
    query: Omit<ReportQuery, 'reportType'>,
    format: ReportFormat = 'html',
    operator: string = 'system'
  ): ReportGenerationResult<BatchTraceabilityReport> {
    const metadata: ReportMetadata = {
      reportId: `RPT-BATCH-${Date.now()}`,
      reportType: 'batch_traceability',
      title: '培养基批号追溯报告',
      generatedAt: new Date().toISOString(),
      generatedBy: operator,
      format,
      status: 'completed',
      version: '1.0.0',
      dataRange: query.dateRange,
      tags: ['批号追溯', '质量审计']
    };

    // Mock数据
    const batchDetails = generateMockBatchTraceability();
    const filteredDetails = query.batchNumbers && query.batchNumbers.length > 0
      ? batchDetails.filter(b => query.batchNumbers!.includes(b.batchNumber))
      : batchDetails;

    const totalQualityTests = filteredDetails.reduce((sum, b) => sum + b.qualityRecords.length, 0);
    const totalUsages = filteredDetails.reduce((sum, b) => sum + b.usageRecords.length, 0);
    const passedTests = filteredDetails.reduce(
      (sum, b) => sum + b.qualityRecords.filter(q => q.isPassed).length, 0
    );
    const abnormalCount = filteredDetails.filter(b => b.conclusion.status === 'abnormal').length;
    const warningCount = filteredDetails.filter(b => b.conclusion.status === 'warning').length;

    const reportData: BatchTraceabilityReport = {
      metadata,
      batchNumbers: filteredDetails.map(b => b.batchNumber),
      batchDetails: filteredDetails,
      summary: {
        totalBatches: filteredDetails.length,
        totalQualityTests,
        totalUsages,
        passRate: totalQualityTests > 0 ? Math.round((passedTests / totalQualityTests) * 10000) / 100 : 0,
        abnormalCount,
        warningCount
      }
    };

    const htmlContent = this.renderBatchReportToHtml(reportData);
    const downloadUrl = this.mockDownloadUrl(metadata, format);

    return {
      success: true,
      metadata,
      reportData,
      htmlContent,
      downloadUrl
    };
  }

  /**
   * 生成物种一致性报告
   */
  generateSpeciesConsistencyReport(
    query: Omit<ReportQuery, 'reportType'>,
    format: ReportFormat = 'html',
    operator: string = 'system'
  ): ReportGenerationResult<SpeciesConsistencyReport> {
    const metadata: ReportMetadata = {
      reportId: `RPT-SPECIES-${Date.now()}`,
      reportType: 'species_consistency',
      title: '物种名称一致性分析报告',
      generatedAt: new Date().toISOString(),
      generatedBy: operator,
      format,
      status: 'completed',
      version: '1.0.0',
      dataRange: query.dateRange,
      tags: ['物种一致性', '数据质量']
    };

    const speciesDetails: SpeciesConsistencyReport['speciesDetails'] = [
      {
        speciesCode: 'SP-001',
        standardName: '大肠埃希氏菌',
        aliases: ['大肠杆菌', 'E. coli', '大肠菌'],
        totalRecords: 150,
        exactMatch: 120,
        fuzzyMatch: 25,
        noMatch: 5,
        conflicts: [
          { recordId: 'REC-120', originalName: '大肠秆菌', matchedName: '大肠埃希氏菌', conflictType: '疑似错别字', confidence: 0.78, rowNumber: 125 },
          { recordId: 'REC-145', originalName: 'E.coil', matchedName: '大肠埃希氏菌', conflictType: '拼写错误', confidence: 0.72, rowNumber: 150 }
        ]
      },
      {
        speciesCode: 'SP-002',
        standardName: '金黄色葡萄球菌',
        aliases: ['金葡菌', 'S. aureus', '葡萄球菌'],
        totalRecords: 120,
        exactMatch: 100,
        fuzzyMatch: 18,
        noMatch: 2,
        conflicts: []
      },
      {
        speciesCode: 'SP-003',
        standardName: '枯草芽孢杆菌',
        aliases: ['枯草杆菌', 'B. subtilis', '枯草菌'],
        totalRecords: 85,
        exactMatch: 70,
        fuzzyMatch: 12,
        noMatch: 3,
        conflicts: [
          { recordId: 'REC-230', originalName: '枯草芽胞杆菌', matchedName: '枯草芽孢杆菌', conflictType: '用字差异', confidence: 0.88, rowNumber: 235 }
        ]
      },
      {
        speciesCode: 'SP-004',
        standardName: '铜绿假单胞菌',
        aliases: ['绿脓杆菌', 'P. aeruginosa', '假单胞菌'],
        totalRecords: 60,
        exactMatch: 52,
        fuzzyMatch: 6,
        noMatch: 2,
        conflicts: []
      },
      {
        speciesCode: 'SP-005',
        standardName: '白色念珠菌',
        aliases: ['白假丝酵母菌', 'C. albicans', '念珠菌'],
        totalRecords: 55,
        exactMatch: 48,
        fuzzyMatch: 5,
        noMatch: 2,
        conflicts: []
      }
    ];

    const filteredSpecies = query.speciesCodes && query.speciesCodes.length > 0
      ? speciesDetails.filter(s => query.speciesCodes!.includes(s.speciesCode))
      : speciesDetails;

    const totalRecords = filteredSpecies.reduce((sum, s) => sum + s.totalRecords, 0);
    const exactMatch = filteredSpecies.reduce((sum, s) => sum + s.exactMatch, 0);
    const fuzzyMatch = filteredSpecies.reduce((sum, s) => sum + s.fuzzyMatch, 0);
    const noMatch = filteredSpecies.reduce((sum, s) => sum + s.noMatch, 0);
    const manualReviewed = filteredSpecies.reduce((sum, s) => sum + s.conflicts.length, 0);

    const consistencyScore = totalRecords > 0
      ? Math.round(((exactMatch + fuzzyMatch * 0.85) / totalRecords) * 100)
      : 0;
    const consistencyLevel =
      consistencyScore >= 95 ? 'excellent' :
      consistencyScore >= 85 ? 'good' :
      consistencyScore >= 70 ? 'fair' : 'poor';

    const normalizationSummary: SpeciesConsistencyReport['normalizationSummary'] = [
      { originalName: '大肠杆菌', occurrenceCount: 45, normalizedTo: '大肠埃希氏菌', standardCode: 'SP-001' },
      { originalName: '金葡菌', occurrenceCount: 32, normalizedTo: '金黄色葡萄球菌', standardCode: 'SP-002' },
      { originalName: '枯草杆菌', occurrenceCount: 28, normalizedTo: '枯草芽孢杆菌', standardCode: 'SP-003' },
      { originalName: '绿脓杆菌', occurrenceCount: 20, normalizedTo: '铜绿假单胞菌', standardCode: 'SP-004' },
      { originalName: '白假丝酵母菌', occurrenceCount: 15, normalizedTo: '白色念珠菌', standardCode: 'SP-005' },
      { originalName: 'E. coli', occurrenceCount: 30, normalizedTo: '大肠埃希氏菌', standardCode: 'SP-001' },
      { originalName: 'S. aureus', occurrenceCount: 18, normalizedTo: '金黄色葡萄球菌', standardCode: 'SP-002' }
    ];

    const recommendations: string[] = [
      '建议将"大肠杆菌"、"金葡菌"等常用别名统一替换为标准名称以提高一致性',
      '5条未匹配记录建议人工审核后补充到同义词词典',
      '加强录入培训，推广使用标准学名或中文名',
      '建议在录入表单中增加物种名称下拉选择功能，减少自由输入'
    ];

    const reportData: SpeciesConsistencyReport = {
      metadata,
      analysis: {
        totalRecords,
        matchStats: { exactMatch, fuzzyMatch, noMatch, manualReviewed },
        consistencyScore,
        consistencyLevel
      },
      speciesDetails: filteredSpecies,
      normalizationSummary,
      recommendations
    };

    const htmlContent = this.renderSpeciesReportToHtml(reportData);
    const downloadUrl = this.mockDownloadUrl(metadata, format);

    return {
      success: true,
      metadata,
      reportData,
      htmlContent,
      downloadUrl
    };
  }

  /**
   * 生成全链路审计报告
   */
  generateFullAuditReport(
    query: Omit<ReportQuery, 'reportType'>,
    format: ReportFormat = 'html',
    operator: string = 'system'
  ): ReportGenerationResult<FullAuditReport> {
    const metadata: ReportMetadata = {
      reportId: `RPT-AUDIT-${Date.now()}`,
      reportType: 'full_audit',
      title: '数据全链路审计报告',
      generatedAt: new Date().toISOString(),
      generatedBy: operator,
      format,
      status: 'completed',
      version: '1.0.0',
      dataRange: query.dateRange || { start: '2026-01-01T00:00:00Z', end: new Date().toISOString() },
      tags: ['全链路审计', '合规检查']
    };

    const imports: FullAuditReport['importAudit']['imports'] = [
      { importId: 'IMP-2026-03', importTime: '2026-03-01T10:00:00Z', operator: 'operator01', fileName: '培养基检测数据_2026Q1.xlsx', totalRows: 150, successRows: 148, failedRows: 2, warnings: ['第23、67行物种名称未自动匹配，已标记待审核'] },
      { importId: 'IMP-2026-03-v2', importTime: '2026-03-05T14:20:00Z', operator: 'operator02', fileName: '补充数据_3月.xlsx', totalRows: 80, successRows: 80, failedRows: 0, warnings: [] },
      { importId: 'IMP-2026-04', importTime: '2026-04-06T09:15:00Z', operator: 'operator01', fileName: '4月检测数据.xlsx', totalRows: 95, successRows: 92, failedRows: 3, warnings: ['第5、44、89行批号格式不规范，已自动修正'] }
    ];

    const modifications: FullAuditReport['modificationAudit']['modifications'] = [
      { modifyId: 'MOD-001', modifyTime: '2026-03-08T11:30:00Z', operator: 'operator01', recordId: 'REC-012', field: 'speciesName', oldValue: '大肠杆菌', newValue: '大肠埃希氏菌', reason: '物种名称标准化修正' },
      { modifyId: 'MOD-002', modifyTime: '2026-03-12T16:45:00Z', operator: 'operator02', recordId: 'REC-058', field: 'conclusion', oldValue: '合格', newValue: '不合格', reason: '复核发现原始结果录入错误，纠正结论' },
      { modifyId: 'MOD-003', modifyTime: '2026-03-18T13:20:00Z', operator: 'operator03', recordId: 'REC-090', field: 'samplingLocation', oldValue: '上海', newValue: '上海-实验室B', reason: '补充采样地点详细信息' },
      { modifyId: 'MOD-004', modifyTime: '2026-04-08T10:00:00Z', operator: 'operator01', recordId: 'REC-210', field: 'batchNumber', oldValue: 'B2026004', newValue: 'B2026-004', reason: '批号格式标准化' }
    ];

    const dedupOps: FullAuditReport['deduplicationAudit']['operations'] = [
      { dedupId: 'DEDUP-001', operationTime: '2026-03-25T15:00:00Z', operator: 'operator02', mergedCount: 12, remainingCount: 440, strategy: '保留完整度最高记录' },
      { dedupId: 'DEDUP-002', operationTime: '2026-04-12T09:30:00Z', operator: 'operator01', mergedCount: 8, remainingCount: 525, strategy: '保留最新记录' }
    ];

    const versions: FullAuditReport['versionAudit']['versions'] = [
      { versionId: 'VER-000001', version: '1.0.0', createdAt: '2026-01-15T09:30:00Z', createdBy: 'admin', changeType: 'create', description: '初始版本：导入第一批培养基检测数据', affectedRecords: 150 },
      { versionId: 'VER-000002', version: '1.1.0', createdAt: '2026-02-20T14:15:00Z', createdBy: 'operator01', changeType: 'update', description: '新增2月份检测数据，修正3条物种名称', affectedRecords: 83 },
      { versionId: 'VER-000003', version: '1.2.0', createdAt: '2026-03-25T10:45:00Z', createdBy: 'operator02', changeType: 'merge', description: '导入3月份数据，执行去重合并操作', affectedRecords: 137 },
      { versionId: 'VER-000004', version: '1.2.1', createdAt: '2026-04-02T16:20:00Z', createdBy: 'operator01', changeType: 'update', description: '修复异常值，补充缺失字段', affectedRecords: 18 },
      { versionId: 'VER-000006', version: '2.0.0', createdAt: '2026-05-10T09:00:00Z', createdBy: 'admin', changeType: 'update', description: '重大更新：采用新的物种标准库，重新匹配所有物种名称', affectedRecords: 450 }
    ];

    const findings: FullAuditReport['auditConclusion']['findings'] = [
      { severity: 'low', description: '存在2次手动修改记录未填写详细原因', recommendation: '完善修改原因填写规范，确保变更可追溯' },
      { severity: 'medium', description: '部分导入数据的物种名称存在格式不统一问题', recommendation: '加强数据录入前的校验，使用标准化模板' },
      { severity: 'low', description: 'IMP-2026-04导入中有3条记录批号格式被自动修正', recommendation: '建议向数据提供方反馈格式规范，减少后续修正工作量' }
    ];

    const highSeverityCount = findings.filter(f => f.severity === 'high').length;
    const medSeverityCount = findings.filter(f => f.severity === 'medium').length;
    const integrityScore = Math.max(0, 100 - highSeverityCount * 15 - medSeverityCount * 5);
    const complianceStatus =
      integrityScore >= 90 ? 'compliant' :
      integrityScore >= 75 ? 'partially_compliant' : 'non_compliant';

    const reportData: FullAuditReport = {
      metadata,
      importAudit: { totalImports: imports.length, imports },
      modificationAudit: { totalModifications: modifications.length, modifications },
      deduplicationAudit: { totalOperations: dedupOps.length, operations: dedupOps },
      versionAudit: { totalVersions: versions.length, versions },
      auditConclusion: { integrityScore, complianceStatus, findings }
    };

    const htmlContent = this.renderAuditReportToHtml(reportData);
    const downloadUrl = this.mockDownloadUrl(metadata, format);

    return {
      success: true,
      metadata,
      reportData,
      htmlContent,
      downloadUrl
    };
  }

  /**
   * 通用报告生成入口
   */
  generateReport(
    query: ReportQuery,
    format: ReportFormat = 'html',
    operator?: string
  ): ReportGenerationResult {
    switch (query.reportType) {
      case 'batch_traceability':
        return this.generateBatchTraceabilityReport(query, format, operator);
      case 'species_consistency':
        return this.generateSpeciesConsistencyReport(query, format, operator);
      case 'full_audit':
        return this.generateFullAuditReport(query, format, operator);
      default:
        return { success: false, errorMessage: '不支持的报告类型' };
    }
  }

  /**
   * 导出Excel（通过模拟CSV/Blob生成）
   */
  exportToExcel(reportData: unknown, reportType: ReportType): Blob {
    // 将数据序列化为TSV（制表符分隔），Excel可直接打开
    let tsv = '';
    if (reportType === 'batch_traceability' && 'summary' in (reportData as BatchTraceabilityReport)) {
      const data = reportData as BatchTraceabilityReport;
      tsv += '批号追溯报告\n';
      tsv += `生成时间:\t${data.metadata.generatedAt}\n\n`;
      tsv += '批号\t生产厂家\t生产日期\t有效期\t质检次数\t合格率\t状态\n';
      for (const b of data.batchDetails) {
        const passed = b.qualityRecords.filter(q => q.isPassed).length;
        const rate = b.qualityRecords.length > 0 ? Math.round(passed / b.qualityRecords.length * 100) : 0;
        tsv += `${b.batchNumber}\t${b.productionInfo.manufacturer}\t${b.productionInfo.productionDate}\t${b.productionInfo.expiryDate}\t${b.qualityRecords.length}\t${rate}%\t${b.conclusion.status}\n`;
      }
    } else {
      tsv = '报告数据（序列化JSON）\n' + JSON.stringify(reportData, null, 2);
    }
    return new Blob(['\uFEFF' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8' });
  }

  /**
   * 触发浏览器打印PDF（HTML转PDF方案）
   * 传入报告HTML内容，使用window.print()打印
   */
  printToPdf(htmlContent: string, title: string = '报告'): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      console.warn('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #333; line-height: 1.6; }
          h1 { text-align: center; color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #1e3a8a; margin-top: 24px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 13px; }
          th { background: #eff6ff; color: #1e3a8a; }
          tr:nth-child(even) { background: #f9fafb; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          .badge-normal { background: #dcfce7; color: #166534; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-abnormal { background: #fee2e2; color: #991b1b; }
          .summary-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 12px 0; }
          @media print {
            .no-print { display: none; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // ========= HTML渲染方法 =========

  private renderBatchReportToHtml(r: BatchTraceabilityReport): string {
    const rows = r.batchDetails.map(b => {
      const passed = b.qualityRecords.filter(q => q.isPassed).length;
      const rate = b.qualityRecords.length > 0 ? Math.round(passed / b.qualityRecords.length * 100) : 0;
      const statusBadge =
        b.conclusion.status === 'normal' ? '<span class="badge badge-normal">正常</span>' :
        b.conclusion.status === 'warning' ? '<span class="badge badge-warning">关注</span>' :
        '<span class="badge badge-abnormal">异常</span>';
      return `<tr>
        <td>${b.batchNumber}</td>
        <td>${b.productionInfo.manufacturer}</td>
        <td>${b.productionInfo.productionDate}</td>
        <td>${b.productionInfo.expiryDate}</td>
        <td>${b.qualityRecords.length}</td>
        <td>${rate}%</td>
        <td>${b.usageRecords.length}</td>
        <td>${statusBadge}</td>
      </tr>`;
    }).join('');

    return `
      <h1>培养基批号追溯报告</h1>
      <div class="meta">
        报告ID：${r.metadata.reportId} &nbsp;|&nbsp;
        生成时间：${new Date(r.metadata.generatedAt).toLocaleString('zh-CN')} &nbsp;|&nbsp;
        生成人：${r.metadata.generatedBy} &nbsp;|&nbsp;
        版本：${r.metadata.version}
      </div>

      <div class="summary-box">
        <h2 style="margin-top:0">概览统计</h2>
        <p>
          共追溯 <strong>${r.summary.totalBatches}</strong> 个批号，
          质量检测 <strong>${r.summary.totalQualityTests}</strong> 次，
          合格率 <strong>${r.summary.passRate}%</strong>，
          使用记录 <strong>${r.summary.totalUsages}</strong> 条。
          ${r.summary.warningCount > 0 ? `<br>需关注批号：<strong class="text-amber-700">${r.summary.warningCount}</strong> 个` : ''}
          ${r.summary.abnormalCount > 0 ? `<br>异常批号：<strong class="text-red-700">${r.summary.abnormalCount}</strong> 个` : ''}
        </p>
      </div>

      <h2>批号列表</h2>
      <table>
        <thead><tr>
          <th>批号</th><th>生产厂家</th><th>生产日期</th><th>有效期</th>
          <th>质检次数</th><th>合格率</th><th>使用次数</th><th>状态</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <h2>批号详情</h2>
      ${r.batchDetails.map(b => this.renderBatchDetail(b)).join('')}

      <div class="no-print" style="text-align:center;margin-top:30px;color:#9ca3af;font-size:12px;">
        ─── 报告结束 ───
      </div>
    `;
  }

  private renderBatchDetail(b: BatchTraceabilityReport['batchDetails'][number]): string {
    const qRows = b.qualityRecords.map(q => `
      <tr>
        <td>${q.testId}</td>
        <td>${q.testDate}</td>
        <td>${q.tester}</td>
        <td>${q.testItem}</td>
        <td>${q.result}</td>
        <td>${q.standard}</td>
        <td>${q.isPassed ? '<span class="badge badge-normal">合格</span>' : '<span class="badge badge-abnormal">不合格</span>'}</td>
        <td>${q.remark || '-'}</td>
      </tr>
    `).join('');
    const uRows = b.usageRecords.map(u => `
      <tr>
        <td>${u.usageId}</td><td>${u.usageDate}</td><td>${u.project}</td>
        <td>${u.user}</td><td>${u.consumption}</td><td>${u.remaining}</td>
      </tr>
    `).join('');
    const sRows = b.speciesTests.map(s => `
      <tr><td>${s.speciesName}</td><td>${s.standardSpecies}</td><td>${s.testCount}</td><td>${s.passRate}%</td></tr>
    `).join('');

    return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
        <h3 style="margin-top:0;color:#2563eb">批号 ${b.batchNumber}</h3>
        <p><strong>生产信息：</strong>${b.productionInfo.manufacturer}，${b.productionInfo.productionDate} 生产，${b.productionInfo.productionLine}，${b.productionInfo.batchSize}</p>

        <h4>质量检测记录</h4>
        <table>
          <thead><tr><th>检测编号</th><th>日期</th><th>检验员</th><th>项目</th><th>结果</th><th>标准</th><th>判定</th><th>备注</th></tr></thead>
          <tbody>${qRows || '<tr><td colspan="8" style="text-align:center;color:#9ca3af">无记录</td></tr>'}</tbody>
        </table>

        <h4>使用记录</h4>
        <table>
          <thead><tr><th>使用编号</th><th>日期</th><th>项目</th><th>使用人</th><th>消耗</th><th>剩余</th></tr></thead>
          <tbody>${uRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af">无记录</td></tr>'}</tbody>
        </table>

        <h4>关联物种检测</h4>
        <table>
          <thead><tr><th>物种名称</th><th>标准物种</th><th>检测次数</th><th>通过率</th></tr></thead>
          <tbody>${sRows || '<tr><td colspan="4" style="text-align:center;color:#9ca3af">无记录</td></tr>'}</tbody>
        </table>

        <div class="summary-box">
          <strong>追溯结论：</strong>${b.conclusion.summary}
          ${b.conclusion.risks.length > 0 ? `<br><strong>风险提示：</strong>${b.conclusion.risks.join('；')}` : ''}
          ${b.conclusion.suggestions.length > 0 ? `<br><strong>建议：</strong>${b.conclusion.suggestions.join('；')}` : ''}
        </div>
      </div>
    `;
  }

  private renderSpeciesReportToHtml(r: SpeciesConsistencyReport): string {
    const specRows = r.speciesDetails.map(s => {
      const rate = s.totalRecords > 0 ? Math.round((s.exactMatch + s.fuzzyMatch) / s.totalRecords * 100) : 0;
      return `<tr>
        <td>${s.speciesCode}</td><td>${s.standardName}</td><td>${s.aliases.join('、')}</td>
        <td>${s.totalRecords}</td><td>${s.exactMatch}</td><td>${s.fuzzyMatch}</td>
        <td>${s.noMatch}</td><td>${s.conflicts.length}</td><td>${rate}%</td>
      </tr>`;
    }).join('');
    const normRows = r.normalizationSummary.map(n => `
      <tr><td>${n.originalName}</td><td>${n.occurrenceCount}</td><td>${n.normalizedTo}</td><td>${n.standardCode}</td></tr>
    `).join('');
    const recList = r.recommendations.map((rec, i) => `<li>${rec}</li>`).join('');

    const levelText =
      r.analysis.consistencyLevel === 'excellent' ? '优秀' :
      r.analysis.consistencyLevel === 'good' ? '良好' :
      r.analysis.consistencyLevel === 'fair' ? '一般' : '较差';
    const levelBadge =
      r.analysis.consistencyLevel === 'excellent' ? '<span class="badge badge-normal">优秀</span>' :
      r.analysis.consistencyLevel === 'good' ? '<span class="badge badge-normal" style="background:#dbeafe;color:#1e40af">良好</span>' :
      r.analysis.consistencyLevel === 'fair' ? '<span class="badge badge-warning">一般</span>' :
      '<span class="badge badge-abnormal">较差</span>';

    return `
      <h1>物种名称一致性分析报告</h1>
      <div class="meta">
        报告ID：${r.metadata.reportId} &nbsp;|&nbsp;
        生成时间：${new Date(r.metadata.generatedAt).toLocaleString('zh-CN')} &nbsp;|&nbsp;
        生成人：${r.metadata.generatedBy}
      </div>

      <div class="summary-box">
        <h2 style="margin-top:0">一致性分析结果 ${levelBadge}</h2>
        <p>
          共分析 <strong>${r.analysis.totalRecords}</strong> 条记录，
          精确匹配 <strong>${r.analysis.matchStats.exactMatch}</strong>，
          模糊匹配 <strong>${r.analysis.matchStats.fuzzyMatch}</strong>，
          未匹配 <strong>${r.analysis.matchStats.noMatch}</strong>，
          人工审核冲突 <strong>${r.analysis.matchStats.manualReviewed}</strong>。
          <br>
          <strong>一致性评分：</strong><span style="font-size:20px;color:#2563eb">${r.analysis.consistencyScore}</span> / 100 &nbsp;&nbsp;
          评级：<strong>${levelText}</strong>
        </p>
      </div>

      <h2>各物种一致性详情</h2>
      <table>
        <thead><tr>
          <th>编码</th><th>标准名</th><th>别名</th>
          <th>总记录</th><th>精确匹配</th><th>模糊匹配</th><th>未匹配</th><th>冲突数</th><th>一致率</th>
        </tr></thead>
        <tbody>${specRows}</tbody>
      </table>

      <h2>名称标准化汇总</h2>
      <table>
        <thead><tr><th>原始名称</th><th>出现次数</th><th>标准化为</th><th>标准编码</th></tr></thead>
        <tbody>${normRows}</tbody>
      </table>

      <h2>改进建议</h2>
      <ol>${recList}</ol>

      ${r.speciesDetails.some(s => s.conflicts.length > 0) ? `
      <h2>冲突记录明细</h2>
      ${r.speciesDetails.filter(s => s.conflicts.length > 0).map(s => `
        <h4>${s.standardName} (${s.speciesCode})</h4>
        <table>
          <thead><tr><th>记录ID</th><th>原始行号</th><th>原始名称</th><th>匹配名称</th><th>冲突类型</th><th>置信度</th></tr></thead>
          <tbody>${s.conflicts.map(c => `
            <tr>
              <td>${c.recordId}</td><td>${c.rowNumber ?? '-'}</td>
              <td>${c.originalName}</td><td>${c.matchedName}</td>
              <td>${c.conflictType}</td><td>${Math.round(c.confidence * 100)}%</td>
            </tr>
          `).join('')}</tbody>
        </table>
      `).join('')}` : ''}
    `;
  }

  private renderAuditReportToHtml(r: FullAuditReport): string {
    const statusText =
      r.auditConclusion.complianceStatus === 'compliant' ? '合规' :
      r.auditConclusion.complianceStatus === 'partially_compliant' ? '部分合规' : '不合规';
    const statusBadge =
      r.auditConclusion.complianceStatus === 'compliant' ? '<span class="badge badge-normal">合规</span>' :
      r.auditConclusion.complianceStatus === 'partially_compliant' ? '<span class="badge badge-warning">部分合规</span>' :
      '<span class="badge badge-abnormal">不合规</span>';

    const impRows = r.importAudit.imports.map(i => `
      <tr>
        <td>${i.importId}</td><td>${new Date(i.importTime).toLocaleString('zh-CN')}</td>
        <td>${i.operator}</td><td>${i.fileName}</td>
        <td>${i.totalRows}</td><td>${i.successRows}</td><td>${i.failedRows}</td>
        <td>${i.warnings.length > 0 ? i.warnings.join('；') : '-'}</td>
      </tr>
    `).join('');
    const modRows = r.modificationAudit.modifications.map(m => `
      <tr>
        <td>${m.modifyId}</td><td>${new Date(m.modifyTime).toLocaleString('zh-CN')}</td>
        <td>${m.operator}</td><td>${m.recordId}</td>
        <td>${m.field}</td><td>${String(m.oldValue)}</td><td>${String(m.newValue)}</td><td>${m.reason}</td>
      </tr>
    `).join('');
    const verRows = r.versionAudit.versions.map(v => `
      <tr>
        <td>${v.version}</td><td>${v.versionId}</td>
        <td>${new Date(v.createdAt).toLocaleString('zh-CN')}</td><td>${v.createdBy}</td>
        <td>${v.changeType}</td><td>${v.description}</td><td>${v.affectedRecords}</td>
      </tr>
    `).join('');
    const findingRows = r.auditConclusion.findings.map(f => {
      const badge =
        f.severity === 'high' ? '<span class="badge badge-abnormal">高</span>' :
        f.severity === 'medium' ? '<span class="badge badge-warning">中</span>' :
        '<span class="badge badge-normal">低</span>';
      return `<tr><td>${badge}</td><td>${f.description}</td><td>${f.recommendation}</td></tr>`;
    }).join('');

    return `
      <h1>数据全链路审计报告</h1>
      <div class="meta">
        报告ID：${r.metadata.reportId} &nbsp;|&nbsp;
        生成时间：${new Date(r.metadata.generatedAt).toLocaleString('zh-CN')} &nbsp;|&nbsp;
        审计范围：${r.metadata.dataRange ? new Date(r.metadata.dataRange.start).toLocaleDateString() + ' ~ ' + new Date(r.metadata.dataRange.end).toLocaleDateString() : '全部'}
      </div>

      <div class="summary-box">
        <h2 style="margin-top:0">审计结论 ${statusBadge}</h2>
        <p>
          <strong>完整性评分：</strong><span style="font-size:22px;color:#2563eb">${r.auditConclusion.integrityScore}</span> / 100 &nbsp;&nbsp;
          合规状态：<strong>${statusText}</strong>
          <br>
          共记录 <strong>${r.importAudit.totalImports}</strong> 次导入，
          <strong>${r.modificationAudit.totalModifications}</strong> 次修改，
          <strong>${r.deduplicationAudit.totalOperations}</strong> 次去重，
          <strong>${r.versionAudit.totalVersions}</strong> 个版本。
        </p>
      </div>

      <h2>审计发现</h2>
      <table>
        <thead><tr><th>严重程度</th><th>问题描述</th><th>建议</th></tr></thead>
        <tbody>${findingRows}</tbody>
      </table>

      <h2>导入记录审计</h2>
      <table>
        <thead><tr>
          <th>导入ID</th><th>时间</th><th>操作人</th><th>文件名</th>
          <th>总行数</th><th>成功</th><th>失败</th><th>警告</th>
        </tr></thead>
        <tbody>${impRows}</tbody>
      </table>

      <h2>修改记录审计</h2>
      <table>
        <thead><tr>
          <th>修改ID</th><th>时间</th><th>操作人</th><th>记录ID</th>
          <th>字段</th><th>原值</th><th>新值</th><th>原因</th>
        </tr></thead>
        <tbody>${modRows}</tbody>
      </table>

      <h2>版本变更审计</h2>
      <table>
        <thead><tr>
          <th>版本号</th><th>版本ID</th><th>创建时间</th><th>创建人</th>
          <th>类型</th><th>描述</th><th>影响记录数</th>
        </tr></thead>
        <tbody>${verRows}</tbody>
      </table>
    `;
  }

  private mockDownloadUrl(metadata: ReportMetadata, format: ReportFormat): string {
    const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'html';
    return `blob:mock-report-url/${metadata.reportId}.${ext}`;
  }

  /**
   * 获取历史报告列表（Mock）
   */
  getReportHistory(limit: number = 20): Array<{
    reportId: string;
    reportType: ReportType;
    title: string;
    generatedAt: string;
    generatedBy: string;
    status: ReportStatus;
    fileSize: number;
  }> {
    const types: ReportType[] = ['batch_traceability', 'species_consistency', 'full_audit'];
    const titles: Record<ReportType, string> = {
      batch_traceability: '培养基批号追溯报告',
      species_consistency: '物种名称一致性分析报告',
      full_audit: '数据全链路审计报告'
    };
    const history = [];
    const now = Date.now();
    for (let i = 0; i < limit; i++) {
      const type = types[i % types.length];
      history.push({
        reportId: `RPT-HIST-${String(i + 1).padStart(5, '0')}`,
        reportType: type,
        title: titles[type],
        generatedAt: new Date(now - i * 86400000 * 2 - Math.random() * 3600000).toISOString(),
        generatedBy: ['admin', 'operator01', 'operator02', 'operator03'][i % 4],
        status: i === 0 ? 'generating' : 'completed',
        fileSize: Math.floor(50000 + Math.random() * 500000)
      });
    }
    return history;
  }
}

/** 单例导出 */
export const reportService = new ReportService();
