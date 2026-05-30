import { Order, BadRow, BadRowType, BadRowSource } from '@/types';

const REQUIRED_FIELDS = ['订单ID', '目标温度', '容量(ml)', '时限(s)'];

export function detectDataSource(rawData: string): BadRowSource {
  if (rawData.includes('搅拌') || rawData.includes('stir')) {
    return 'stir_record';
  }
  if (rawData.includes('action') || rawData.includes('操作')) {
    return 'action_log';
  }
  return 'order';
}

export function cleanOrderData(rawData: string): {
  validOrders: Order[];
  badRows: BadRow[];
} {
  const lines = rawData.split('\n');
  const validOrders: Order[] = [];
  const badRows: BadRow[] = [];
  
  if (lines.length === 0) {
    return { validOrders, badRows };
  }

  const source = detectDataSource(rawData);

  for (let i = 0; i < lines.length; i++) {
    const rowNumber = i + 1;
    const originalLine = lines[i];
    const line = originalLine.trim();

    if (line === '') {
      badRows.push(createBadRow(originalLine, rowNumber, 'empty', source));
      continue;
    }

    if (line.startsWith('#')) {
      badRows.push(createBadRow(originalLine, rowNumber, 'comment', source));
      continue;
    }

    if (i === 0 && line.includes('订单ID')) {
      continue;
    }

    const values = line.split(',');
    const fieldChecks = checkRequiredFields(values);
    
    if (!fieldChecks.valid) {
      badRows.push(createBadRow(
        originalLine,
        rowNumber,
        'missing_column',
        source,
        `缺失字段: ${fieldChecks.missingFields.join(', ')}`
      ));
      continue;
    }

    try {
      const order = parseOrderLine(values, source);
      validOrders.push(order);
    } catch (e) {
      badRows.push(createBadRow(
        originalLine,
        rowNumber,
        'invalid_format',
        source,
        (e as Error).message
      ));
    }
  }

  return { validOrders, badRows };
}

function createBadRow(
  originalData: string,
  rowNumber: number,
  type: BadRowType,
  source: BadRowSource,
  note?: string
): BadRow {
  return {
    id: `bad_${Date.now()}_${rowNumber}_${Math.random().toString(36).substr(2, 9)}`,
    originalData,
    rowNumber,
    type,
    source,
    note,
  };
}

function checkRequiredFields(values: string[]): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  REQUIRED_FIELDS.forEach((field, index) => {
    if (!values[index] || values[index].trim() === '') {
      missingFields.push(field);
    }
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

function parseOrderLine(values: string[], source: BadRowSource): Order {
  const id = values[0]?.trim();
  const targetTemperature = parseFloat(values[1]?.trim());
  const capacity = parseFloat(values[2]?.trim());
  const timeLimit = parseFloat(values[3]?.trim());
  const note = values[4]?.trim();

  if (!id || isNaN(targetTemperature) || isNaN(capacity) || isNaN(timeLimit)) {
    throw new Error('数值解析失败');
  }

  return {
    id,
    targetTemperature,
    capacity,
    timeLimit,
    note,
    source: source === 'stir_record' ? 'stir' : 
            source === 'action_log' ? 'manual' : 'customer',
  };
}

export function formatBadRowType(type: BadRowType): string {
  const typeMap: Record<BadRowType, string> = {
    empty: '空行',
    comment: '备注行',
    missing_column: '缺列',
    invalid_format: '格式错误',
  };
  return typeMap[type] || type;
}

export function formatBadRowSource(source: BadRowSource): string {
  const sourceMap: Record<BadRowSource, string> = {
    order: '顾客订单',
    action_log: '操作日志',
    stir_record: '搅拌记录',
  };
  return sourceMap[source] || source;
}
