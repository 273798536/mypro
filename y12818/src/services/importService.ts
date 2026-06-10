/**
 * 数据导入解析服务
 * 功能：CSV/Excel导入解析、原始行号保留、字段映射
 */

// ============= 类型定义 =============

/** 支持的文件格式 */
export type ImportFileFormat = 'csv' | 'xlsx' | 'xls';

/** 字段映射规则 */
export interface FieldMappingRule {
  /** 源字段名（Excel/CSV中的列名） */
  sourceField: string;
  /** 目标字段名（系统内部字段） */
  targetField: string;
  /** 是否必填 */
  required?: boolean;
  /** 数据类型 */
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  /** 枚举可选值（当dataType为enum时） */
  enumValues?: string[];
  /** 格式化函数名称（用于前端显示，实际逻辑内置） */
  formatter?: string;
  /** 默认值（当源字段为空时使用） */
  defaultValue?: unknown;
  /** 验证规则 */
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    customRuleName?: string;
  };
}

/** 字段映射配置 */
export interface FieldMappingConfig {
  /** 模板ID */
  templateId: string;
  /** 模板名称 */
  templateName: string;
  /** 描述 */
  description?: string;
  /** 表头所在行号（从1开始） */
  headerRowIndex: number;
  /** 数据起始行号（从1开始） */
  dataStartRowIndex: number;
  /** 字段映射列表 */
  mappings: FieldMappingRule[];
  /** 是否自动识别列名（基于相似度） */
  autoDetectColumns: boolean;
  /** 文件编码（CSV用） */
  encoding?: 'utf-8' | 'gbk' | 'gb2312';
  /** 分隔符（CSV用） */
  delimiter?: ',' | ';' | '\t' | '|';
}

/** 导入单条行记录 */
export interface ImportRowRecord {
  /** 导入时的原始行号（从1开始，包含表头） */
  originalRowNumber: number;
  /** 原始数据（列名 -> 原始值） */
  rawData: Record<string, string>;
  /** 映射并转换后的数据（目标字段 -> 转换值） */
  parsedData: Record<string, unknown>;
  /** 是否解析成功 */
  isValid: boolean;
  /** 错误/警告信息 */
  issues: ImportIssue[];
}

/** 导入问题 */
export interface ImportIssue {
  /** 问题级别 */
  level: 'error' | 'warning' | 'info';
  /** 相关字段（如为空表示行级问题） */
  field?: string;
  /** 问题代码 */
  code: string;
  /** 问题描述 */
  message: string;
  /** 原值 */
  originalValue?: unknown;
  /** 建议值 */
  suggestedValue?: unknown;
}

/** 导入结果 */
export interface ImportResult {
  /** 导入任务ID */
  importId: string;
  /** 文件名 */
  fileName: string;
  /** 文件格式 */
  fileFormat: ImportFileFormat;
  /** 文件大小 */
  fileSize: number;
  /** 导入时间 */
  importedAt: string;
  /** 导入人 */
  importedBy: string;
  /** 使用的字段映射配置 */
  mappingConfig: FieldMappingConfig;
  /** 统计信息 */
  statistics: {
    /** 文件总行数（含表头） */
    totalRowsInFile: number;
    /** 数据行数（不含表头） */
    totalDataRows: number;
    /** 成功解析行数 */
    validRows: number;
    /** 存在错误的行数 */
    errorRows: number;
    /** 仅警告的行数 */
    warningRows: number;
    /** 识别的列数 */
    totalColumns: number;
    /** 成功映射的列数 */
    mappedColumns: number;
    /** 未映射的源列 */
    unmappedSourceColumns: string[];
    /** 未映射的目标列（必填） */
    missingRequiredTargetFields: string[];
  };
  /** 识别出的表头列名 */
  detectedHeaderColumns: string[];
  /** 解析后的行记录 */
  rows: ImportRowRecord[];
  /** 全部问题汇总 */
  allIssues: ImportIssue[];
  /** 字段映射执行详情 */
  mappingDetails: Array<{
    sourceField: string;
    targetField: string;
    autoMatched: boolean;
    matchConfidence: number;
    sampleValues: string[];
  }>;
  /** 预览数据（用于前端展示） */
  preview: {
    /** 原始数据预览（前10行） */
    rawPreview: Array<Record<string, string>>;
    /** 解析后数据预览（前10行） */
    parsedPreview: Array<Record<string, unknown>>;
  };
}

/** 导入解析选项 */
export interface ImportParseOptions {
  /** 最大预览行数 */
  maxPreviewRows?: number;
  /** 最大错误行数（超过则中断） */
  maxErrorRows?: number;
  /** 是否执行自动字段匹配 */
  performAutoMatch?: boolean;
  /** 是否执行数据验证 */
  performValidation?: boolean;
}

/** 列自动匹配结果 */
export interface ColumnMatchResult {
  /** 源列名 */
  sourceColumn: string;
  /** 匹配到的目标字段 */
  matchedTargetField: string | null;
  /** 匹配置信度 0-1 */
  confidence: number;
  /** 匹配候选列表 */
  candidates: Array<{
    targetField: string;
    confidence: number;
  }>;
}

// ============= Mock 数据 =============

/** 默认字段映射配置 - 培养基检测数据模板 */
const DEFAULT_MAPPING_TEMPLATE: FieldMappingConfig = {
  templateId: 'TPL-MEDIUM-001',
  templateName: '培养基检测数据标准模板',
  description: '用于导入培养基批号、物种检测、质量检验等数据的标准模板',
  headerRowIndex: 1,
  dataStartRowIndex: 2,
  autoDetectColumns: true,
  encoding: 'utf-8',
  delimiter: ',',
  mappings: [
    {
      sourceField: '批号',
      targetField: 'batchNumber',
      required: true,
      dataType: 'string',
      validation: { minLength: 3, maxLength: 32, pattern: '^[A-Za-z0-9-]+$' }
    },
    {
      sourceField: '物种名称',
      targetField: 'speciesName',
      required: true,
      dataType: 'string',
      validation: { minLength: 2 }
    },
    {
      sourceField: '采样地点',
      targetField: 'samplingLocation',
      required: false,
      dataType: 'string',
      defaultValue: '未知'
    },
    {
      sourceField: '采样时间',
      targetField: 'samplingTime',
      required: true,
      dataType: 'date',
      formatter: 'parseDate'
    },
    {
      sourceField: '检测结论',
      targetField: 'conclusion',
      required: true,
      dataType: 'enum',
      enumValues: ['合格', '不合格', '待复核', '阳性', '阴性']
    },
    {
      sourceField: '菌落数',
      targetField: 'colonyCount',
      required: false,
      dataType: 'number',
      validation: { min: 0, max: 99999 }
    },
    {
      sourceField: '检验员',
      targetField: 'tester',
      required: false,
      dataType: 'string'
    },
    {
      sourceField: '备注',
      targetField: 'remark',
      required: false,
      dataType: 'string',
      validation: { maxLength: 500 }
    }
  ]
};

/** Mock的CSV示例数据 */
const MOCK_CSV_DATA = `批号,物种名称,采样地点,采样时间,检测结论,菌落数,检验员,备注
B2026-001,大肠埃希氏菌,北京-实验室A,2026-03-01 10:00:00,合格,120,张三,
B2026-001,大肠杆菌,北京-实验室A,2026-03-01 10:05:00,合格,125,张三,疑似重复
B2026-001,E. coli,北京实验室A,2026-03-02 09:30:00,合格,,李四,名称未标准化
B2026-002,金黄色葡萄球菌,上海-实验室B,2026-03-05 14:00:00,合格,80,王五,
B2026-002,金葡菌,上海实验室B,2026-03-05 14:10:00,合格,78,赵六,
B2026-003,枯草芽孢杆菌,广州-实验室C,2026-03-10 08:00:00,不合格,1500,周七,超标
B2026-003,枯草杆菌,广州实验室C,2026-03-11 16:00:00,不合格,,吴八,缺少菌落数
B2026-004,铜绿假单胞菌,深圳-实验室D,2026-03-12 15:30:00,合格,,郑九,
B2026-005,白色念珠菌,杭州-实验室E,2026-03-18 11:00:00,合格,200,冯十,
B2026-005,白假丝酵母菌,杭州实验室E,2026-03-18 11:30:00,合格,195,冯十,
B2026-006,未知物种,成都-实验室F,2026-03-20 09:00:00,合格,50,陈十一,物种未收录
,枯草芽孢杆菌,武汉-实验室G,2026-03-22 10:00:00,合格,80,褚十二,缺少批号
B2026-007,金黄色葡萄球菌,南京-实验室H,2026/03/25 2:00 PM,合格,65,卫十三,日期格式不同
B2026-008,大肠埃希氏菌,西安-实验室I,2026-03-28 08:00,合格,99999,蒋十四,边界值
B2026-009,铜绿假单胞菌,重庆-实验室J,2026-13-01 00:00:00,待复核,100,沈十五,日期无效`;

// ============= 核心服务 =============

/**
 * 数据导入解析服务类
 */
export class ImportService {
  private mappingTemplates: FieldMappingConfig[];

  constructor() {
    this.mappingTemplates = [DEFAULT_MAPPING_TEMPLATE];
  }

  /**
   * 获取所有字段映射模板
   */
  getMappingTemplates(): FieldMappingConfig[] {
    return JSON.parse(JSON.stringify(this.mappingTemplates));
  }

  /**
   * 根据ID获取映射模板
   */
  getMappingTemplate(templateId: string): FieldMappingConfig | undefined {
    return this.mappingTemplates.find(t => t.templateId === templateId)
      ? JSON.parse(JSON.stringify(this.mappingTemplates.find(t => t.templateId === templateId)))
      : undefined;
  }

  /**
   * 保存自定义映射模板
   */
  saveMappingTemplate(template: FieldMappingConfig): void {
    const idx = this.mappingTemplates.findIndex(t => t.templateId === template.templateId);
    if (idx >= 0) {
      this.mappingTemplates[idx] = { ...template };
    } else {
      this.mappingTemplates.push({ ...template });
    }
  }

  /**
   * 从File对象获取格式
   */
  detectFileFormat(fileName: string): ImportFileFormat {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'csv';
    if (ext === 'xls') return 'xls';
    return 'xlsx';
  }

  /**
   * 解析文件（入口）
   * 真实项目中这里会读取File内容，这里用Mock数据
   */
  async parseFile(
    file: File | { name: string; size: number },
    mappingConfig: FieldMappingConfig = DEFAULT_MAPPING_TEMPLATE,
    options: ImportParseOptions = {},
    operator: string = 'system'
  ): Promise<ImportResult> {
    const fileName = file.name;
    const fileSize = file.size;
    const fileFormat = this.detectFileFormat(fileName);
    const effectiveOptions = {
      maxPreviewRows: 10,
      maxErrorRows: 1000,
      performAutoMatch: mappingConfig.autoDetectColumns,
      performValidation: true,
      ...options
    };

    // 模拟文件读取延迟
    await this.simulateDelay(200, 600);

    // 获取CSV原始行（Mock）
    const rawLines = MOCK_CSV_DATA.split(/\r?\n/).filter(l => l.trim().length > 0);
    const delimiter = mappingConfig.delimiter || ',';

    // 解析表头
    const headerLine = rawLines[mappingConfig.headerRowIndex - 1] || '';
    const headers = this.parseCsvLine(headerLine, delimiter);

    // 解析数据行
    const dataLines = rawLines.slice(mappingConfig.dataStartRowIndex - 1);
    const totalRowsInFile = rawLines.length;
    const totalDataRows = dataLines.length;

    // 执行列匹配
    const columnMatches = effectiveOptions.performAutoMatch
      ? this.autoMatchColumns(headers, mappingConfig)
      : headers.map(h => {
        const rule = mappingConfig.mappings.find(m => m.sourceField === h);
        return {
          sourceColumn: h,
          matchedTargetField: rule?.targetField || null,
          confidence: rule ? 1 : 0,
          candidates: rule ? [{ targetField: rule.targetField, confidence: 1 }] : []
        } as ColumnMatchResult;
      });

    // 构建源列 -> 目标字段映射
    const sourceToTarget = new Map<string, FieldMappingRule>();
    for (const cm of columnMatches) {
      if (cm.matchedTargetField) {
        const rule = mappingConfig.mappings.find(m => m.targetField === cm.matchedTargetField);
        if (rule) {
          sourceToTarget.set(cm.sourceColumn, { ...rule, sourceField: cm.sourceColumn });
        }
      }
    }

    // 统计未映射的必填目标字段
    const mappedTargetFields = new Set(Array.from(sourceToTarget.values()).map(r => r.targetField));
    const missingRequired = mappingConfig.mappings
      .filter(m => m.required && !mappedTargetFields.has(m.targetField))
      .map(m => m.targetField);

    const unmappedSource = columnMatches
      .filter(cm => !cm.matchedTargetField)
      .map(cm => cm.sourceColumn);

    // 解析每一行
    const rows: ImportRowRecord[] = [];
    let errorCount = 0;
    let warningCount = 0;
    const allIssues: ImportIssue[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const originalRowNumber = mappingConfig.dataStartRowIndex + i;
      const line = dataLines[i];
      const values = this.parseCsvLine(line, delimiter);

      // 构建原始数据
      const rawData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rawData[h] = values[idx]?.trim() ?? '';
      });

      // 映射与转换
      const parsedData: Record<string, unknown> = {};
      const issues: ImportIssue[] = [];

      for (const [sourceField, rule] of sourceToTarget) {
        const rawValue = rawData[sourceField] ?? '';
        const result = this.transformAndValidate(rawValue, rule, i + 1);
        parsedData[rule.targetField] = result.value;
        if (result.issue) {
          issues.push(result.issue);
          if (result.issue.level === 'error') {
            errorCount++;
          } else if (result.issue.level === 'warning') {
            warningCount++;
          }
          allIssues.push(result.issue);
        }
      }

      // 检查必填字段是否有值
      for (const rule of mappingConfig.mappings.filter(m => m.required)) {
        if (!(rule.targetField in parsedData) ||
            parsedData[rule.targetField] === undefined ||
            parsedData[rule.targetField] === null ||
            (typeof parsedData[rule.targetField] === 'string' && parsedData[rule.targetField] === '')) {
          const issue: ImportIssue = {
            level: 'error',
            field: rule.targetField,
            code: 'REQUIRED_MISSING',
            message: `必填字段"${rule.targetField}"缺失或为空`,
            originalValue: parsedData[rule.targetField]
          };
          issues.push(issue);
          errorCount++;
          allIssues.push(issue);
        }
      }

      const hasError = issues.some(x => x.level === 'error');
      const hasWarning = !hasError && issues.some(x => x.level === 'warning');

      rows.push({
        originalRowNumber,
        rawData,
        parsedData,
        isValid: !hasError,
        issues
      });

      // 超限中断
      if (errorCount > effectiveOptions.maxErrorRows) break;
    }

    // 映射详情
    const mappingDetails = columnMatches.map(cm => {
      const sampleValues: string[] = [];
      const sampleRows = Math.min(5, dataLines.length);
      for (let i = 0; i < sampleRows; i++) {
        const vals = this.parseCsvLine(dataLines[i], delimiter);
        const idx = headers.indexOf(cm.sourceColumn);
        if (idx >= 0 && vals[idx]) {
          sampleValues.push(vals[idx].trim());
        }
      }
      return {
        sourceField: cm.sourceColumn,
        targetField: cm.matchedTargetField || '(未映射)',
        autoMatched: cm.confidence < 1 && cm.confidence > 0,
        matchConfidence: cm.confidence,
        sampleValues
      };
    });

    const validRows = rows.filter(r => r.isValid).length;
    const errorRows = rows.filter(r => r.issues.some(i => i.level === 'error')).length;
    const warningRows = rows.filter(r =>
      r.isValid && r.issues.some(i => i.level === 'warning')
    ).length;

    // 预览数据
    const previewRows = Math.min(effectiveOptions.maxPreviewRows, rows.length);
    const rawPreview = rows.slice(0, previewRows).map(r => r.rawData);
    const parsedPreview = rows.slice(0, previewRows).map(r => r.parsedData);

    return {
      importId: `IMP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      fileName,
      fileFormat,
      fileSize,
      importedAt: new Date().toISOString(),
      importedBy: operator,
      mappingConfig: JSON.parse(JSON.stringify(mappingConfig)),
      statistics: {
        totalRowsInFile,
        totalDataRows,
        validRows,
        errorRows,
        warningRows,
        totalColumns: headers.length,
        mappedColumns: Array.from(sourceToTarget.keys()).length,
        unmappedSourceColumns: unmappedSource,
        missingRequiredTargetFields: missingRequired
      },
      detectedHeaderColumns: headers,
      rows,
      allIssues,
      mappingDetails,
      preview: { rawPreview, parsedPreview }
    };
  }

  /**
   * 使用Mock数据快速演示导入解析
   */
  parseMockData(options?: ImportParseOptions, operator?: string): Promise<ImportResult> {
    const mockFile = { name: '培养基检测数据_示例.csv', size: MOCK_CSV_DATA.length };
    return this.parseFile(mockFile, DEFAULT_MAPPING_TEMPLATE, options, operator);
  }

  /**
   * 自动匹配列名
   * 将上传文件的列名和映射模板的源字段进行相似度匹配
   */
  autoMatchColumns(sourceColumns: string[], config: FieldMappingConfig): ColumnMatchResult[] {
    const targetRules = config.mappings;
    return sourceColumns.map(sourceCol => {
      const normalizedSource = this.normalizeForMatch(sourceCol);
      const candidates: Array<{ targetField: string; confidence: number }> = [];

      for (const rule of targetRules) {
        // 精确匹配优先（源字段名 + 目标字段名 + 别名）
        if (rule.sourceField === sourceCol) {
          candidates.push({ targetField: rule.targetField, confidence: 1.0 });
          continue;
        }
        const normalizedTargetSource = this.normalizeForMatch(rule.sourceField);
        const normalizedTargetField = this.normalizeForMatch(rule.targetField);

        // 包含关系
        let confidence = 0;
        if (normalizedSource === normalizedTargetSource || normalizedSource === normalizedTargetField) {
          confidence = 0.98;
        } else if (normalizedSource.includes(normalizedTargetSource) || normalizedTargetSource.includes(normalizedSource)) {
          confidence = 0.9;
        } else if (normalizedSource.includes(normalizedTargetField) || normalizedTargetField.includes(normalizedSource)) {
          confidence = 0.85;
        } else {
          // 编辑距离相似度
          confidence = this.calculateSimilarity(normalizedSource, normalizedTargetSource);
          const confidence2 = this.calculateSimilarity(normalizedSource, normalizedTargetField);
          confidence = Math.max(confidence, confidence2);
        }

        if (confidence >= 0.5) {
          candidates.push({ targetField: rule.targetField, confidence: Math.round(confidence * 100) / 100 });
        }
      }

      // 排序并取最佳匹配
      candidates.sort((a, b) => b.confidence - a.confidence);
      const best = candidates[0];
      const threshold = 0.7;

      return {
        sourceColumn: sourceCol,
        matchedTargetField: best && best.confidence >= threshold ? best.targetField : null,
        confidence: best?.confidence || 0,
        candidates: candidates.slice(0, 3)
      };
    });
  }

  /**
   * 生成字段映射建议（用于交互式映射界面）
   */
  generateMappingSuggestions(sourceColumns: string[]): Array<{
    sourceColumn: string;
    suggestions: Array<{ targetField: string; confidence: number; reason: string }>;
  }> {
    const targetRules = DEFAULT_MAPPING_TEMPLATE.mappings;
    return sourceColumns.map(col => {
      const suggestions = targetRules.map(rule => {
        let confidence = 0;
        let reason = '';
        if (rule.sourceField === col) {
          confidence = 1.0; reason = '列名完全匹配';
        } else {
          const sim = this.calculateSimilarity(
            this.normalizeForMatch(col),
            this.normalizeForMatch(rule.sourceField)
          );
          confidence = sim;
          if (sim >= 0.9) reason = '高度相似';
          else if (sim >= 0.7) reason = '中度相似';
          else reason = '低相似度候选';
        }
        return { targetField: rule.targetField, confidence: Math.round(confidence * 100) / 100, reason };
      }).filter(s => s.confidence >= 0.4).sort((a, b) => b.confidence - a.confidence).slice(0, 5);
      return { sourceColumn: col, suggestions };
    });
  }

  /**
   * 导出空模板（供用户下载填写）
   */
  generateEmptyTemplate(templateId: string, format: ImportFileFormat = 'csv'): Blob {
    const template = this.getMappingTemplate(templateId) || DEFAULT_MAPPING_TEMPLATE;
    const headers = template.mappings.map(m => m.sourceField).join(template.delimiter || ',');
    const exampleRow = template.mappings.map(m => {
      const samples: Record<string, string> = {
        batchNumber: 'B2026-001',
        speciesName: '大肠埃希氏菌',
        samplingLocation: '北京-实验室A',
        samplingTime: '2026-03-01 10:00:00',
        conclusion: '合格',
        colonyCount: '120',
        tester: '张三',
        remark: '示例数据，导入前请删除此行'
      };
      return samples[m.targetField] || '';
    }).join(template.delimiter || ',');

    const content = headers + '\n' + exampleRow + '\n';
    const mime = format === 'csv'
      ? 'text/csv;charset=utf-8'
      : 'application/vnd.ms-excel;charset=utf-8';
    return new Blob(['\uFEFF' + content], { type: mime });
  }

  /**
   * 获取导入错误报告（可用于导出校验报告）
   */
  generateValidationReport(result: ImportResult): {
    summary: string;
    errorRows: Array<{ row: number; errors: string[] }>;
    warnings: Array<{ row: number; warnings: string[] }>;
  } {
    const summary = `共解析${result.statistics.totalDataRows}行，` +
      `成功${result.statistics.validRows}行，` +
      `错误${result.statistics.errorRows}行，` +
      `警告${result.statistics.warningRows}行`;

    const errorRows = result.rows
      .filter(r => r.issues.some(i => i.level === 'error'))
      .map(r => ({
        row: r.originalRowNumber,
        errors: r.issues.filter(i => i.level === 'error').map(i =>
          i.field ? `[${i.field}] ${i.message}` : i.message
        )
      }));

    const warnings = result.rows
      .filter(r => r.issues.some(i => i.level === 'warning'))
      .map(r => ({
        row: r.originalRowNumber,
        warnings: r.issues.filter(i => i.level === 'warning').map(i =>
          i.field ? `[${i.field}] ${i.message}` : i.message
        )
      }));

    return { summary, errorRows, warnings };
  }

  // ========= 私有工具方法 =========

  /**
   * 解析CSV单行（考虑引号内转义）
   */
  private parseCsvLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * 字段转换和校验
   */
  private transformAndValidate(
    rawValue: string,
    rule: FieldMappingRule,
    rowIdx: number
  ): { value: unknown; issue?: ImportIssue } {
    const isEmpty = rawValue === '' || rawValue === undefined || rawValue === null;

    // 空值处理
    if (isEmpty) {
      if (rule.defaultValue !== undefined) {
        return { value: rule.defaultValue };
      }
      if (rule.required) {
        return {
          value: undefined,
          issue: {
            level: 'error',
            field: rule.targetField,
            code: 'EMPTY_REQUIRED',
            message: `字段"${rule.sourceField}"为空，且为必填项`,
            originalValue: rawValue
          }
        };
      }
      return { value: undefined };
    }

    // 类型转换
    let value: unknown = rawValue;
    const type = rule.dataType || 'string';
    try {
      if (type === 'number') {
        const clean = rawValue.replace(/[,%\s]/g, '');
        value = Number(clean);
        if (isNaN(value as number)) {
          return {
            value: rawValue,
            issue: {
              level: 'error',
              field: rule.targetField,
              code: 'INVALID_NUMBER',
              message: `"${rawValue}"不是有效的数字`,
              originalValue: rawValue
            }
          };
        }
      } else if (type === 'date') {
        const parsed = this.parseFlexibleDate(rawValue);
        if (!parsed) {
          return {
            value: rawValue,
            issue: {
              level: 'error',
              field: rule.targetField,
              code: 'INVALID_DATE',
              message: `"${rawValue}"不是有效的日期格式`,
              originalValue: rawValue,
              suggestedValue: '推荐格式：YYYY-MM-DD HH:mm:ss'
            }
          };
        }
        value = parsed;
      } else if (type === 'boolean') {
        const lower = rawValue.toLowerCase();
        const truthy = ['true', '是', 'yes', '1', '合格', '通过', 'positive', '阳性'];
        const falsy = ['false', '否', 'no', '0', '不合格', '不通过', 'negative', '阴性'];
        if (truthy.includes(lower)) value = true;
        else if (falsy.includes(lower)) value = false;
        else {
          return {
            value: rawValue,
            issue: {
              level: 'warning',
              field: rule.targetField,
              code: 'AMBIGUOUS_BOOLEAN',
              message: `"${rawValue}"布尔含义不明确，已按字符串保留`,
              originalValue: rawValue
            }
          };
        }
      } else if (type === 'enum' && rule.enumValues) {
        if (!rule.enumValues.includes(rawValue)) {
          // 找最接近的
          const suggestions = rule.enumValues.map(v => ({
            v, s: this.calculateSimilarity(rawValue.toLowerCase(), v.toLowerCase())
          })).sort((a, b) => b.s - a.s);
          return {
            value: rawValue,
            issue: {
              level: 'warning',
              field: rule.targetField,
              code: 'ENUM_OUT_OF_RANGE',
              message: `"${rawValue}"不在允许值列表[${rule.enumValues.join('/')}]中`,
              originalValue: rawValue,
              suggestedValue: suggestions[0]?.s > 0.6 ? suggestions[0].v : undefined
            }
          };
        }
      }
    } catch (e) {
      return {
        value: rawValue,
        issue: {
          level: 'error',
          field: rule.targetField,
          code: 'PARSE_ERROR',
          message: `解析失败：${(e as Error).message}`,
          originalValue: rawValue
        }
      };
    }

    // 验证规则
    if (rule.validation) {
      const v = rule.validation;
      if (typeof value === 'string') {
        if (v.minLength !== undefined && value.length < v.minLength) {
          return {
            value,
            issue: {
              level: 'error',
              field: rule.targetField,
              code: 'MIN_LENGTH',
              message: `长度${value.length}小于最小值${v.minLength}`,
              originalValue: rawValue
            }
          };
        }
        if (v.maxLength !== undefined && value.length > v.maxLength) {
          return {
            value,
            issue: {
              level: 'warning',
              field: rule.targetField,
              code: 'MAX_LENGTH',
              message: `长度${value.length}超过最大值${v.maxLength}，可能被截断`,
              originalValue: rawValue
            }
          };
        }
        if (v.pattern && !new RegExp(v.pattern).test(value)) {
          return {
            value,
            issue: {
              level: 'warning',
              field: rule.targetField,
              code: 'PATTERN_MISMATCH',
              message: `格式不符合规范，推荐使用字母数字和"-"组合`,
              originalValue: rawValue
            }
          };
        }
      }
      if (typeof value === 'number') {
        if (v.min !== undefined && value < v.min) {
          return {
            value,
            issue: {
              level: 'warning',
              field: rule.targetField,
              code: 'MIN_VALUE',
              message: `数值${value}低于下限${v.min}`,
              originalValue: rawValue
            }
          };
        }
        if (v.max !== undefined && value > v.max) {
          return {
            value,
            issue: {
              level: 'warning',
              field: rule.targetField,
              code: 'MAX_VALUE',
              message: `数值${value}接近/超过上限${v.max}，请核实`,
              originalValue: rawValue
            }
          };
        }
      }
    }

    return { value };
  }

  /**
   * 灵活日期解析，支持多种格式
   */
  private parseFlexibleDate(input: string): string | null {
    if (!input) return null;
    const formats: Array<(s: string) => Date | null> = [
      s => new Date(s.replace(/-/g, '/')),
      s => new Date(s),
      s => {
        const m = s.match(/^(\d{4})[/年\-](\d{1,2})[/月\-](\d{1,2})[日\s]*(\d{1,2})?[:时]?(\d{1,2})?[:分]?(\d{1,2})?/);
        if (!m) return null;
        const [, y, mo, d, h = '0', mi = '0', se = '0'] = m;
        return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se));
      },
      s => {
        const m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(\d{1,2}):(\d{1,2})\s*(AM|PM)/i);
        if (!m) return null;
        let hours = Number(m[4]);
        if (m[6].toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (m[6].toUpperCase() === 'AM' && hours === 12) hours = 0;
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hours, Number(m[5]));
      }
    ];
    for (const fmt of formats) {
      try {
        const date = fmt(input);
        if (date && !isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  /**
   * 字符串标准化（用于匹配）
   */
  private normalizeForMatch(s: string): string {
    return s
      .trim()
      .toLowerCase()
      .replace(/[\s\-_（）()【】\[\].,，。:：;；/\\]+/g, '')
      .replace(/编号|号|名称|名字|时间|日期|地点|地址|结论|结果|数量/gi, '')
      .replace(/batch|no\.?|number|id|code|name|time|date|location|address|result|count/gi, '');
  }

  /**
   * 计算字符串相似度（Levenshtein）
   */
  private calculateSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = s1[i - 1] === s2[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
      }
    }
    return 1 - dp[m][n] / Math.max(m, n);
  }

  /**
   * 模拟异步延迟
   */
  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min) + min);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/** 单例导出 */
export const importService = new ImportService();
