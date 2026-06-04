import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TrackPoint, SourceMaterial } from '../types';
import { generateId } from './coordinate';
import { normalizeColor, validateColor } from './colorValidator';

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
  metadata: {
    rowCount: number;
    successCount: number;
    errorCount: number;
  };
}

export interface ParseError {
  row: number;
  column: string;
  value: string;
  error: string;
}

export function parseCSV(file: File): Promise<ParseResult<any>> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: ParseError[] = results.errors.map(e => ({
          row: e.row || 0,
          column: '',
          value: '',
          error: e.message
        }));

        resolve({
          data: results.data,
          errors,
          metadata: {
            rowCount: results.data.length,
            successCount: results.data.length - errors.length,
            errorCount: errors.length
          }
        });
      },
      error: (error) => reject(error)
    });
  });
}

export function parseExcel(file: File): Promise<ParseResult<any>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        resolve({
          data: jsonData,
          errors: [],
          metadata: {
            rowCount: jsonData.length,
            successCount: jsonData.length,
            errorCount: 0
          }
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export interface TrackPointImportOptions {
  batchId: string;
  operator: string;
  sourceMaterialId: string;
  defaultColor?: string;
}

const COLUMN_MAPPINGS: { [key: string]: string[] } = {
  lng: ['lng', '经度', 'longitude', 'lon', 'x'],
  lat: ['lat', '纬度', 'latitude', 'y'],
  elevation: ['elevation', '海拔', '高度', 'altitude', 'z'],
  color: ['color', '颜色', 'colour'],
  timestamp: ['timestamp', '时间', 'time', '日期', 'date', 'datetime'],
  operator: ['operator', '录入人', '操作人', '记录人'],
  remark: ['remark', '备注', 'note', '注释'],
  isSupplement: ['isSupplement', '补录', '是否补录', 'supplement'],
  elevationUnit: ['elevationUnit', '海拔单位', '单位'],
};

function findColumn(row: any, field: string): string | undefined {
  const possibleNames = COLUMN_MAPPINGS[field] || [field];
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return undefined;
}

export function convertToTrackPoints(
  rawData: any[],
  options: TrackPointImportOptions
): ParseResult<TrackPoint> {
  const points: TrackPoint[] = [];
  const errors: ParseError[] = [];

  rawData.forEach((row, index) => {
    const rowErrors: ParseError[] = [];
    const rowNum = index + 2;

    const lngStr = findColumn(row, 'lng');
    const latStr = findColumn(row, 'lat');
    const elevationStr = findColumn(row, 'elevation');
    const colorStr = findColumn(row, 'color') || options.defaultColor;
    const timestampStr = findColumn(row, 'timestamp');
    const operatorStr = findColumn(row, 'operator') || options.operator;
    const remarkStr = findColumn(row, 'remark');
    const isSupplementStr = findColumn(row, 'isSupplement');
    const elevationUnitStr = findColumn(row, 'elevationUnit');

    if (lngStr === undefined || latStr === undefined) {
      rowErrors.push({
        row: rowNum,
        column: '坐标',
        value: `${lngStr}, ${latStr}`,
        error: '缺少经度或纬度数据'
      });
    }

    const lng = parseFloat(lngStr as string);
    const lat = parseFloat(latStr as string);

    if (isNaN(lng) || isNaN(lat)) {
      rowErrors.push({
        row: rowNum,
        column: '坐标',
        value: `${lngStr}, ${latStr}`,
        error: '经纬度格式不正确，应为数字'
      });
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      rowErrors.push({
        row: rowNum,
        column: '坐标',
        value: `${lng}, ${lat}`,
        error: '经纬度超出有效范围'
      });
    }

    let elevation = 0;
    if (elevationStr !== undefined) {
      elevation = parseFloat(elevationStr as string);
      if (isNaN(elevation)) {
        rowErrors.push({
          row: rowNum,
          column: '海拔',
          value: elevationStr as string,
          error: '海拔格式不正确，应为数字'
        });
      }
    }

    if (!elevationUnitStr || elevationUnitStr.trim() === '') {
      rowErrors.push({
        row: rowNum,
        column: '海拔单位',
        value: elevationUnitStr as string || '',
        error: '缺少海拔单位（应为米/米）'
      });
    }

    let color = '#2E5EAA';
    let colorValid = true;
    if (colorStr !== undefined) {
      const validation = validateColor(colorStr as string);
      color = validation.hex;
      if (!validation.isValid) {
        colorValid = false;
        rowErrors.push({
          row: rowNum,
          column: '颜色',
          value: colorStr as string,
          error: validation.error || '颜色格式不正确'
        });
      }
    }

    let timestamp = Date.now();
    if (timestampStr !== undefined) {
      const parsed = Date.parse(timestampStr as string);
      if (!isNaN(parsed)) {
        timestamp = parsed;
      }
    }

    const isSupplement = isSupplementStr === '是' || 
                         isSupplementStr === 'true' || 
                         String(isSupplementStr) === 'true' ||
                         String(isSupplementStr) === '1';

    if (rowErrors.length === 0) {
      const point: TrackPoint = {
        id: generateId(),
        batchId: options.batchId,
        timestamp,
        originalLng: lng,
        originalLat: lat,
        lng,
        lat,
        elevation,
        color,
        sourceMaterial: options.sourceMaterialId,
        operator: operatorStr as string,
        status: isSupplement ? 'supplementary' : (colorValid ? 'normal' : 'color-invalid'),
        isSupplement,
        supplementNote: remarkStr as string | undefined,
      };

      if (!elevationUnitStr || elevationUnitStr.trim() === '') {
        point.status = 'missing-unit';
      }

      points.push(point);
    }

    errors.push(...rowErrors);
  });

  return {
    data: points,
    errors,
    metadata: {
      rowCount: rawData.length,
      successCount: points.length,
      errorCount: errors.length
    }
  };
}

export function exportToCSV(
  points: TrackPoint[],
  materials: SourceMaterial[]
): string {
  const materialMap = new Map(materials.map(m => [m.id, m]));

  const rows = points.map(point => {
    const material = materialMap.get(point.sourceMaterial);
    return {
      '序号': points.indexOf(point) + 1,
      '点编号': point.id,
      '时间': new Date(point.timestamp).toLocaleString('zh-CN'),
      '经度': point.lng.toFixed(6),
      '纬度': point.lat.toFixed(6),
      '海拔(m)': point.elevation.toFixed(1),
      '颜色': point.color,
      '状态': point.status === 'normal' ? '正常' :
              point.status === 'out-of-bounds' ? '越界' :
              point.status === 'color-invalid' ? '颜色异常' :
              point.status === 'missing-unit' ? '缺项' : '补录',
      '是否补录': point.isSupplement ? '是' : '否',
      '补录备注': point.supplementNote || '',
      '材料来源': material?.name || point.sourceMaterial,
      '材料类型': material?.type === 'old-form' ? '旧表' :
                  material?.type === 'supplementary' ? '补录表' : '现场记录',
      '录入人': point.operator,
      '越界边界': point.boundaryCollision?.boundaryName || '',
      '越界距离(m)': point.boundaryCollision ? Math.abs(point.boundaryCollision.distance).toFixed(1) : '',
      '复核结果': point.reviewConclusion?.result === 'pass' ? '通过' :
                  point.reviewConclusion?.result === 'reject' ? '打回' : '待复核',
      '复核意见': point.reviewConclusion?.comment || '',
    };
  });

  return Papa.unparse(rows);
}

export function exportToExcel(
  points: TrackPoint[],
  materials: SourceMaterial[],
  batchName: string
): Uint8Array {
  const materialMap = new Map(materials.map(m => [m.id, m]));

  const rows = points.map(point => {
    const material = materialMap.get(point.sourceMaterial);
    return {
      '序号': points.indexOf(point) + 1,
      '点编号': point.id,
      '时间': new Date(point.timestamp).toLocaleString('zh-CN'),
      '经度': point.lng,
      '纬度': point.lat,
      '海拔(m)': point.elevation,
      '颜色': point.color,
      '状态': point.status === 'normal' ? '正常' :
              point.status === 'out-of-bounds' ? '越界' :
              point.status === 'color-invalid' ? '颜色异常' :
              point.status === 'missing-unit' ? '缺项' : '补录',
      '是否补录': point.isSupplement ? '是' : '否',
      '补录备注': point.supplementNote || '',
      '材料来源': material?.name || point.sourceMaterial,
      '材料类型': material?.type === 'old-form' ? '旧表' :
                  material?.type === 'supplementary' ? '补录表' : '现场记录',
      '录入人': point.operator,
      '越界边界': point.boundaryCollision?.boundaryName || '',
      '越界距离(m)': point.boundaryCollision ? Math.abs(point.boundaryCollision.distance) : '',
      '复核结果': point.reviewConclusion?.result === 'pass' ? '通过' :
                  point.reviewConclusion?.result === 'reject' ? '打回' : '待复核',
      '复核意见': point.reviewConclusion?.comment || '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 20 },
    { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, '轨迹数据');

  const summaryData = [
    { '项目': '批次名称', '值': batchName },
    { '项目': '导出时间', '值': new Date().toLocaleString('zh-CN') },
    { '项目': '总点数', '值': points.length },
    { '项目': '正常点数', '值': points.filter(p => p.status === 'normal').length },
    { '项目': '越界点数', '值': points.filter(p => p.status === 'out-of-bounds').length },
    { '项目': '颜色异常', '值': points.filter(p => p.status === 'color-invalid').length },
    { '项目': '缺项点数', '值': points.filter(p => p.status === 'missing-unit').length },
    { '项目': '补录点数', '值': points.filter(p => p.status === 'supplementary').length },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, '统计摘要');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

export function downloadFile(content: string | Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
