import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  SalesHistory,
  InventorySnapshot,
  PromotionCalendar,
  ValidationError,
  ImportResult,
  SKU,
} from '@/types';

export function parseCSV<T>(
  content: string,
  parser: (row: Record<string, string>, rowNum: number) => { data?: T; errors: ValidationError[] }
): ImportResult<T> {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  
  if (result.errors.length > 0) {
    return {
      success: false,
      data: [],
      errors: result.errors.map((e, i) => ({
        row: e.row ?? i,
        field: 'parse',
        message: e.message,
        value: null,
      })),
      rowCount: 0,
      preview: [],
    };
  }
  
  const data: T[] = [];
  const errors: ValidationError[] = [];
  
  const rows = result.data as Record<string, string>[];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = parser(row, i + 2);
    
    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors);
    }
    
    if (parsed.data !== undefined) {
      data.push(parsed.data);
    }
  }
  
  return {
    success: errors.length === 0,
    data,
    errors,
    rowCount: rows.length,
    preview: data.slice(0, 5),
  };
}

export function parseExcel<T>(
  content: ArrayBuffer,
  parser: (row: Record<string, any>, rowNum: number) => { data?: T; errors: ValidationError[] }
): ImportResult<T> {
  try {
    const workbook = XLSX.read(content, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { raw: false }) as Record<string, any>[];
    
    const data: T[] = [];
    const errors: ValidationError[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const parsed = parser(row, i + 2);
      
      if (parsed.errors.length > 0) {
        errors.push(...parsed.errors);
      }
      
      if (parsed.data !== undefined) {
        data.push(parsed.data);
      }
    }
    
    return {
      success: errors.length === 0,
      data,
      errors,
      rowCount: rows.length,
      preview: data.slice(0, 5),
    };
  } catch (e: any) {
    return {
      success: false,
      data: [],
      errors: [{
        row: 0,
        field: 'file',
        message: `Excel解析失败: ${e.message}`,
        value: null,
      }],
      rowCount: 0,
      preview: [],
    };
  }
}

function validateDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function validateNumber(numStr: string, min: number = 0): { valid: boolean; value: number } {
  if (numStr === undefined || numStr === null || numStr === '') {
    return { valid: false, value: NaN };
  }
  const num = Number(numStr);
  return {
    valid: !isNaN(num) && num >= min,
    value: num,
  };
}

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/[\s_]+/g, '');
}

function findValue(row: Record<string, any>, possibleKeys: string[]): string | undefined {
  for (const key of possibleKeys) {
    const normalizedKey = normalizeKey(key);
    for (const [rowKey, value] of Object.entries(row)) {
      if (normalizeKey(rowKey) === normalizedKey) {
        return String(value ?? '').trim();
      }
    }
  }
  return undefined;
}

export function parseSalesHistoryRow(row: Record<string, any>, rowNum: number): {
  data?: SalesHistory;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  
  const skuId = findValue(row, ['skuId', 'sku_id', 'SKU', '商品编码', 'sku']) || '';
  const salesDate = findValue(row, ['salesDate', 'date', '销售日期', '日期', 'sale_date']) || '';
  const quantityStr = findValue(row, ['quantitySold', 'quantity', '销量', '销售数量', 'qty', '数量']) || '';
  const storeId = findValue(row, ['storeId', 'store_id', '门店', '门店编码', '店铺']) || 'default';
  
  if (!skuId) {
    errors.push({
      row: rowNum,
      field: 'skuId',
      message: 'SKU编码不能为空',
      value: skuId,
    });
  }
  
  if (!validateDate(salesDate)) {
    errors.push({
      row: rowNum,
      field: 'salesDate',
      message: '销售日期格式不正确，请使用YYYY-MM-DD格式',
      value: salesDate,
    });
  }
  
  const { valid: qtyValid, value: quantity } = validateNumber(quantityStr, 0);
  if (!qtyValid) {
    errors.push({
      row: rowNum,
      field: 'quantitySold',
      message: '销售数量必须是非负数字',
      value: quantityStr,
    });
  }
  
  if (errors.length > 0) {
    return { data: undefined, errors };
  }
  
  const normalizedDate = new Date(salesDate).toISOString().split('T')[0];
  
  return {
    data: {
      id: `sales-${skuId}-${normalizedDate}-${rowNum}`,
      skuId,
      salesDate: normalizedDate,
      quantitySold: quantity,
      storeId,
    },
    errors: [],
  };
}

export function parseInventorySnapshotRow(row: Record<string, any>, rowNum: number): {
  data?: InventorySnapshot;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  
  const skuId = findValue(row, ['skuId', 'sku_id', 'SKU', '商品编码', 'sku']) || '';
  const snapshotDate = findValue(row, ['snapshotDate', 'date', '快照日期', '日期']) || '';
  const currentStr = findValue(row, ['currentStock', '库存', '当前库存', 'stock', 'quantity', '数量']) || '';
  const reservedStr = findValue(row, ['reservedStock', '预留库存', '锁定库存', 'reserved']) || '0';
  const onOrderStr = findValue(row, ['onOrderStock', '在途库存', '在途', 'on_order']) || '0';
  const warehouseId = findValue(row, ['warehouseId', 'warehouse', '仓库', '仓库编码']) || 'default';
  
  if (!skuId) {
    errors.push({
      row: rowNum,
      field: 'skuId',
      message: 'SKU编码不能为空',
      value: skuId,
    });
  }
  
  if (!validateDate(snapshotDate)) {
    errors.push({
      row: rowNum,
      field: 'snapshotDate',
      message: '快照日期格式不正确，请使用YYYY-MM-DD格式',
      value: snapshotDate,
    });
  }
  
  const { valid: currentValid, value: currentStock } = validateNumber(currentStr);
  if (!currentValid) {
    errors.push({
      row: rowNum,
      field: 'currentStock',
      message: '当前库存必须是数字',
      value: currentStr,
    });
  }
  
  const { valid: reservedValid, value: reservedStock } = validateNumber(reservedStr, 0);
  if (!reservedValid) {
    errors.push({
      row: rowNum,
      field: 'reservedStock',
      message: '预留库存必须是非负数字',
      value: reservedStr,
    });
  }
  
  const { valid: onOrderValid, value: onOrderStock } = validateNumber(onOrderStr, 0);
  if (!onOrderValid) {
    errors.push({
      row: rowNum,
      field: 'onOrderStock',
      message: '在途库存必须是非负数字',
      value: onOrderStr,
    });
  }
  
  if (errors.length > 0) {
    return { data: undefined, errors };
  }
  
  const normalizedDate = new Date(snapshotDate).toISOString().split('T')[0];
  
  return {
    data: {
      id: `inv-${skuId}-${normalizedDate}-${rowNum}`,
      skuId,
      snapshotDate: normalizedDate,
      currentStock,
      quantity: currentStock,
      reservedStock,
      onOrderStock,
      warehouseId,
      warehouse: warehouseId,
    },
    errors: [],
  };
}

export function parsePromotionCalendarRow(row: Record<string, any>, rowNum: number): {
  data?: PromotionCalendar;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];
  
  const skuId = findValue(row, ['skuId', 'sku_id', 'SKU', '商品编码', 'sku']) || '';
  const startDate = findValue(row, ['startDate', '开始日期', '促销开始', 'start_date']) || '';
  const endDate = findValue(row, ['endDate', '结束日期', '促销结束', 'end_date']) || '';
  const promotionType = findValue(row, ['promotionType', '促销类型', '类型', 'type']) || 'general';
  const discountStr = findValue(row, ['discountRate', '折扣率', '折扣', 'discount']) || '0';
  const liftStr = findValue(row, ['expectedLift', '预期增长', '增长比例', 'lift']) || '0.3';
  const isActiveStr = findValue(row, ['isActive', '是否生效', '生效', 'active']) || 'true';
  
  if (!skuId) {
    errors.push({
      row: rowNum,
      field: 'skuId',
      message: 'SKU编码不能为空',
      value: skuId,
    });
  }
  
  if (!validateDate(startDate)) {
    errors.push({
      row: rowNum,
      field: 'startDate',
      message: '开始日期格式不正确',
      value: startDate,
    });
  }
  
  if (!validateDate(endDate)) {
    errors.push({
      row: rowNum,
      field: 'endDate',
      message: '结束日期格式不正确',
      value: endDate,
    });
  }
  
  if (validateDate(startDate) && validateDate(endDate)) {
    if (new Date(startDate) > new Date(endDate)) {
      errors.push({
        row: rowNum,
        field: 'dateRange',
        message: '开始日期不能晚于结束日期',
        value: `${startDate} ~ ${endDate}`,
      });
    }
  }
  
  const { valid: discountValid, value: discountRate } = validateNumber(discountStr, 0);
  if (!discountValid || discountRate > 1) {
    errors.push({
      row: rowNum,
      field: 'discountRate',
      message: '折扣率必须在0-1之间',
      value: discountStr,
    });
  }
  
  const { valid: liftValid, value: expectedLift } = validateNumber(liftStr, 0);
  if (!liftValid) {
    errors.push({
      row: rowNum,
      field: 'expectedLift',
      message: '预期增长必须是非负数字',
      value: liftStr,
    });
  }
  
  const isActive = ['1', 'true', 'yes', '是', '生效'].includes(isActiveStr.toLowerCase());
  
  if (errors.length > 0) {
    return { data: undefined, errors };
  }
  
  const normalizedStart = new Date(startDate).toISOString().split('T')[0];
  const normalizedEnd = new Date(endDate).toISOString().split('T')[0];
  
  return {
    data: {
      id: `promo-${skuId}-${normalizedStart}-${rowNum}`,
      skuId,
      startDate: normalizedStart,
      endDate: normalizedEnd,
      promotionType,
      discountRate,
      expectedLift,
      isActive,
    },
    errors: [],
  };
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function extractSkusFromData(
  salesHistory: SalesHistory[],
  inventorySnapshot: InventorySnapshot[]
): SKU[] {
  const skuMap = new Map<string, SKU>();
  
  for (const sale of salesHistory) {
    if (!skuMap.has(sale.skuId)) {
      skuMap.set(sale.skuId, {
        id: sale.skuId,
        skuId: sale.skuId,
        name: sale.skuId,
        skuName: sale.skuId,
        category: '未分类',
        unitCost: 10,
        sellingPrice: 20,
        leadTimeDays: 7,
        reviewPeriodDays: 7,
      });
    }
  }
  
  for (const inv of inventorySnapshot) {
    if (!skuMap.has(inv.skuId)) {
      skuMap.set(inv.skuId, {
        id: inv.skuId,
        skuId: inv.skuId,
        name: inv.skuId,
        skuName: inv.skuId,
        category: '未分类',
        unitCost: 10,
        sellingPrice: 20,
        leadTimeDays: 7,
        reviewPeriodDays: 7,
      });
    }
  }
  
  return Array.from(skuMap.values());
}

export function getFileTemplate(type: 'sales' | 'inventory' | 'promotion'): string {
  const templates: Record<string, string[]> = {
    sales: ['skuId', 'salesDate', 'quantitySold', 'storeId'],
    inventory: ['skuId', 'snapshotDate', 'currentStock', 'reservedStock', 'onOrderStock', 'warehouseId'],
    promotion: ['skuId', 'startDate', 'endDate', 'promotionType', 'discountRate', 'expectedLift', 'isActive'],
  };
  
  return templates[type].join(',');
}
