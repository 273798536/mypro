import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawDataRow, FieldMapping, FieldError, FileInfo } from '@/types';

const generateId = (): string => {
  return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const strValue = String(value).trim();
  if (strValue === '' || strValue === '-' || strValue === 'NA' || strValue === 'null' || strValue === 'NULL') {
    return null;
  }

  const cleaned = strValue.replace(/[,\s%]/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return null;
  }

  return num;
};

const parseBoolean = (value: any): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  const strValue = String(value).trim().toLowerCase();
  return ['1', 'true', '是', 'yes', 'y', '促销', '活动', '大促'].some(keyword => strValue.includes(keyword));
};

const parseString = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const validateNumericField = (value: any, fieldName: string): { value: number | null; errors: FieldError[] } => {
  const errors: FieldError[] = [];
  const parsed = parseNumber(value);

  if (parsed === null && value !== null && value !== undefined && value !== '') {
    const strValue = String(value).trim();
    if (strValue !== '' && strValue !== '-' && strValue !== 'NA') {
      errors.push({
        field: fieldName,
        type: 'format',
        message: `无法解析为数字: "${value}"`,
      });
    } else {
      errors.push({
        field: fieldName,
        type: 'empty',
        message: `${fieldName}为空`,
      });
    }
  }

  return { value: parsed, errors };
};

const validateRow = (
  rawRow: Record<string, any>,
  mapping: FieldMapping,
  rowNumber: number
): { row: RawDataRow; errors: FieldError[] } => {
  const allErrors: FieldError[] = [];

  const getValue = (key: keyof FieldMapping): any => {
    const columnName = mapping[key];
    return rawRow[columnName] ?? rawRow[columnName.toLowerCase()] ?? rawRow[columnName.toUpperCase()];
  };

  const forecastResult = validateNumericField(getValue('forecast'), '预测值');
  const lowerResult = validateNumericField(getValue('lowerBound'), '预测下限');
  const upperResult = validateNumericField(getValue('upperBound'), '预测上限');
  const actualResult = validateNumericField(getValue('actual'), '真实销量');

  allErrors.push(...forecastResult.errors);
  allErrors.push(...lowerResult.errors);
  allErrors.push(...upperResult.errors);
  allErrors.push(...actualResult.errors);

  if (lowerResult.value !== null && upperResult.value !== null) {
    if (lowerResult.value > upperResult.value) {
      allErrors.push({
        field: '区间逻辑',
        type: 'logic',
        message: `预测下限(${lowerResult.value})大于预测上限(${upperResult.value})`,
      });
    }
    if (lowerResult.value === upperResult.value) {
      allErrors.push({
        field: '区间逻辑',
        type: 'logic',
        message: '预测区间宽度为0',
      });
    }
  }

  if (forecastResult.value !== null && forecastResult.value < 0) {
    allErrors.push({
      field: '预测值',
      type: 'out_of_range',
      message: `预测值为负数: ${forecastResult.value}`,
    });
  }

  if (actualResult.value !== null && actualResult.value < 0) {
    allErrors.push({
      field: '真实销量',
      type: 'out_of_range',
      message: `真实销量为负数: ${actualResult.value}`,
    });
  }

  const category = parseString(getValue('category'));
  if (!category) {
    allErrors.push({
      field: '品类',
      type: 'empty',
      message: '品类为空',
    });
  }

  const date = parseString(getValue('date'));
  const remark = parseString(getValue('remark'));
  const isPromotion = parseBoolean(getValue('isPromotion'));

  if (!isPromotion && remark) {
    const promotionKeywords = ['促销', '活动', '大促', '618', '双11', '双十一', '双12', '店庆'];
    if (promotionKeywords.some(keyword => remark.includes(keyword))) {
      // 不自动通过促销标记，只是记录
    }
  }

  const row: RawDataRow = {
    id: generateId(),
    rowNumber,
    category,
    date,
    forecast: forecastResult.value,
    lowerBound: lowerResult.value,
    upperBound: upperResult.value,
    actual: actualResult.value,
    isPromotion,
    remark,
    _raw: rawRow,
    _errors: allErrors,
    _isDirty: allErrors.length > 0,
  };

  return { row, errors: allErrors };
};

export const parseCSVFile = (
  file: File,
  mapping: FieldMapping,
  onProgress?: (progress: number) => void
): Promise<{ rows: RawDataRow[]; fileInfo: FileInfo }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 0.5);
      }
    };

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        const columns = result.meta.fields || [];
        const rawData = result.data as Record<string, any>[];

        if (onProgress) {
          onProgress(0.6);
        }

        const validatedRows: RawDataRow[] = [];
        rawData.forEach((rawRow, index) => {
          const { row } = validateRow(rawRow, mapping, index + 2);
          validatedRows.push(row);

          if (onProgress && index % 100 === 0) {
            onProgress(0.6 + 0.4 * (index / rawData.length));
          }
        });

        const fileInfo: FileInfo = {
          name: file.name,
          size: file.size,
          type: 'text/csv',
          columns,
          rowCount: validatedRows.length,
        };

        if (onProgress) {
          onProgress(1);
        }

        resolve({ rows: validatedRows, fileInfo });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
};

export const parseExcelFile = (
  file: File,
  mapping: FieldMapping,
  onProgress?: (progress: number) => void
): Promise<{ rows: RawDataRow[]; fileInfo: FileInfo }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 0.3);
      }
    };

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (onProgress) {
          onProgress(0.4);
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '' });

        if (onProgress) {
          onProgress(0.5);
        }

        const columns = Object.keys(jsonData[0] || {});
        const validatedRows: RawDataRow[] = [];

        jsonData.forEach((rawRow: Record<string, any>, index: number) => {
          const { row } = validateRow(rawRow, mapping, index + 2);
          validatedRows.push(row);

          if (onProgress && index % 100 === 0) {
            onProgress(0.5 + 0.5 * (index / jsonData.length));
          }
        });

        const fileInfo: FileInfo = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          columns,
          rowCount: validatedRows.length,
        };

        if (onProgress) {
          onProgress(1);
        }

        resolve({ rows: validatedRows, fileInfo });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export const parseFile = async (
  file: File,
  mapping: FieldMapping,
  onProgress?: (progress: number) => void
): Promise<{ rows: RawDataRow[]; fileInfo: FileInfo }> => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return parseCSVFile(file, mapping, onProgress);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelFile(file, mapping, onProgress);
  } else {
    throw new Error('不支持的文件格式，请上传CSV或Excel文件');
  }
};

export const autoDetectFieldMapping = (columns: string[]): FieldMapping => {
  const mapping: FieldMapping = {
    forecast: '',
    actual: '',
    lowerBound: '',
    upperBound: '',
    category: '',
    date: '',
    isPromotion: '',
    remark: '',
  };

  const findMatch = (keywords: string[], defaultVal: string): string => {
    for (const col of columns) {
      const lowerCol = col.toLowerCase();
      if (keywords.some(kw => lowerCol.includes(kw.toLowerCase()))) {
        return col;
      }
    }
    return defaultVal;
  };

  mapping.forecast = findMatch(['预测', 'forecast', 'pred', '销量预测', '预测值', 'predict'], columns[0] || '');
  mapping.actual = findMatch(['真实', 'actual', 'real', '销量', '实际', '真实值', '真实销量'], columns[1] || '');
  mapping.lowerBound = findMatch(['下限', 'lower', 'min', '下界', '预测下限', '最低', 'low'], columns[2] || '');
  mapping.upperBound = findMatch(['上限', 'upper', 'max', '上界', '预测上限', '最高', 'high'], columns[3] || '');
  mapping.category = findMatch(['品类', 'category', '分类', '类目', '品类名称', '商品分类'], columns[4] || '');
  mapping.date = findMatch(['日期', 'date', '时间', 'day', '月份', '周'], columns[5] || '');
  mapping.isPromotion = findMatch(['促销', 'promotion', '是否促销', '活动', '是否活动', '大促'], columns[6] || '');
  mapping.remark = findMatch(['备注', 'remark', '说明', 'comment', '注释', 'note'], columns[7] || '');

  return mapping;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
