import { RawDataRow, FieldMapping, DEFAULT_FIELD_MAPPING } from '@/types';

const generateId = (): string => {
  return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const categories = [
  { name: '连衣裙', type: 'hot', baseSales: 5000 },
  { name: 'T恤', type: 'hot', baseSales: 4500 },
  { name: '运动鞋', type: 'hot', baseSales: 4000 },
  { name: '牛仔裤', type: 'normal', baseSales: 2500 },
  { name: '衬衫', type: 'normal', baseSales: 2200 },
  { name: '外套', type: 'normal', baseSales: 2000 },
  { name: '短裙', type: 'normal', baseSales: 1800 },
  { name: '毛衣', type: 'cold', baseSales: 500 },
  { name: '围巾', type: 'cold', baseSales: 300 },
  { name: '手套', type: 'cold', baseSales: 200 },
];

const generateSalesValue = (base: number, variance: number = 0.3): number => {
  const randomFactor = 1 + (Math.random() - 0.5) * variance * 2;
  return Math.round(base * randomFactor);
};

const generateForecast = (
  actual: number,
  categoryType: string,
  hasBias: boolean = true
): { forecast: number; lower: number; upper: number } => {
  let forecast: number;
  let intervalWidth: number;

  if (categoryType === 'hot' && hasBias) {
    forecast = Math.round(actual * (0.7 + Math.random() * 0.2));
    intervalWidth = actual * 0.15;
  } else if (categoryType === 'cold' && hasBias) {
    forecast = Math.round(actual * (0.9 + Math.random() * 0.2));
    intervalWidth = actual * 0.6;
  } else {
    forecast = Math.round(actual * (0.9 + Math.random() * 0.2));
    intervalWidth = actual * 0.25;
  }

  const lower = Math.max(0, Math.round(forecast - intervalWidth));
  const upper = Math.round(forecast + intervalWidth);

  return { forecast, lower, upper };
};

const generateDate = (index: number): string => {
  const date = new Date(2024, 0, 1);
  date.setDate(date.getDate() + index);
  return date.toISOString().split('T')[0];
};

export const generateDemoData = (
  daysPerCategory: number = 60
): RawDataRow[] => {
  const rows: RawDataRow[] = [];
  let rowNumber = 2;

  categories.forEach((cat, catIndex) => {
    for (let day = 0; day < daysPerCategory; day++) {
      const actual = generateSalesValue(cat.baseSales);
      const { forecast, lower, upper } = generateForecast(actual, cat.type);
      const date = generateDate(day);

      const row: RawDataRow = {
        id: generateId(),
        rowNumber: rowNumber++,
        category: cat.name,
        date,
        forecast,
        lowerBound: lower,
        upperBound: upper,
        actual,
        isPromotion: false,
        remark: '',
        _raw: {},
        _errors: [],
        _isDirty: false,
      };

      rows.push(row);
    }
  });

  const anomalyRows = generateAnomalyRows(rowNumber);
  rows.push(...anomalyRows);

  const dirtyRows = generateDirtyRows(rowNumber + anomalyRows.length);
  rows.push(...dirtyRows);

  return rows;
};

const generateAnomalyRows = (startRow: number): RawDataRow[] => {
  const rows: RawDataRow[] = [];
  let rowNumber = startRow;

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: 'T恤',
    date: '2024-06-18',
    forecast: 2000,
    lowerBound: 1800,
    upperBound: 2200,
    actual: 8500,
    isPromotion: true,
    remark: '618大促活动',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '运动鞋',
    date: '2024-11-11',
    forecast: 3000,
    lowerBound: 2700,
    upperBound: 3300,
    actual: 12000,
    isPromotion: true,
    remark: '双十一大促',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '连衣裙',
    date: '2024-03-15',
    forecast: 0,
    lowerBound: 0,
    upperBound: 100,
    actual: 3500,
    isPromotion: false,
    remark: '明显坏值样例：预测为0但实际销量很高',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '衬衫',
    date: '2024-04-20',
    forecast: 5000,
    lowerBound: 5500,
    upperBound: 4500,
    actual: 4800,
    isPromotion: false,
    remark: '明显坏值样例：下限大于上限，逻辑错误',
    _raw: {},
    _errors: [{
      field: '区间逻辑',
      type: 'logic',
      message: '预测下限(5500)大于预测上限(4500)',
    }],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '牛仔裤',
    date: '2024-05-10',
    forecast: -100,
    lowerBound: -200,
    upperBound: 0,
    actual: 2000,
    isPromotion: false,
    remark: '明显坏值样例：预测值为负数',
    _raw: {},
    _errors: [{
      field: '预测值',
      type: 'out_of_range',
      message: '预测值为负数: -100',
    }],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '外套',
    date: '2024-07-01',
    forecast: 500,
    lowerBound: 400,
    upperBound: 600,
    actual: 2500,
    isPromotion: false,
    remark: '偏差过大：预测严重低估',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '毛衣',
    date: '2024-08-15',
    forecast: 1500,
    lowerBound: 1200,
    upperBound: 1800,
    actual: 200,
    isPromotion: false,
    remark: '偏差过大：预测严重高估',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '围巾',
    date: '2024-02-14',
    forecast: 100,
    lowerBound: 80,
    upperBound: 120,
    actual: 800,
    isPromotion: false,
    remark: '情人节活动，未标记促销',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  return rows;
};

const generateDirtyRows = (startRow: number): RawDataRow[] => {
  const rows: RawDataRow[] = [];
  let rowNumber = startRow;

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: 'T恤',
    date: '2024-01-15',
    forecast: null,
    lowerBound: 2000,
    upperBound: 3000,
    actual: 2500,
    isPromotion: false,
    remark: '脏数据样例：预测值为空',
    _raw: {},
    _errors: [{
      field: '预测值',
      type: 'empty',
      message: '预测值为空',
    }],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '运动鞋',
    date: '2024-02-20',
    forecast: 3500,
    lowerBound: null,
    upperBound: null,
    actual: 3800,
    isPromotion: false,
    remark: '脏数据样例：上下限为空',
    _raw: {},
    _errors: [
      { field: '预测下限', type: 'empty', message: '预测下限为空' },
      { field: '预测上限', type: 'empty', message: '预测上限为空' },
    ],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '连衣裙',
    date: '2024-03-10',
    forecast: NaN as any,
    lowerBound: 4000,
    upperBound: 6000,
    actual: 5200,
    isPromotion: false,
    remark: '脏数据样例：预测值格式错误',
    _raw: {},
    _errors: [{
      field: '预测值',
      type: 'format',
      message: '无法解析为数字: "无法计算"',
    }],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '',
    date: '2024-04-05',
    forecast: 1500,
    lowerBound: 1200,
    upperBound: 1800,
    actual: 1600,
    isPromotion: false,
    remark: '脏数据样例：品类为空',
    _raw: {},
    _errors: [{
      field: '品类',
      type: 'empty',
      message: '品类为空',
    }],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '牛仔裤',
    date: '2024-05-25',
    forecast: 2000,
    lowerBound: 1800,
    upperBound: 2200,
    actual: null,
    isPromotion: false,
    remark: '脏数据样例：真实销量为空',
    _raw: {},
    _errors: [{
      field: '真实销量',
      type: 'empty',
      message: '真实销量为空',
    }],
    _isDirty: true,
  });

  rows.push({
    id: generateId(),
    rowNumber: rowNumber++,
    category: '衬衫',
    date: '2024-06-30',
    forecast: 1800,
    lowerBound: 1600,
    upperBound: 2000,
    actual: 1900,
    isPromotion: false,
    remark: '数据待核实，分析师备注：需要确认库存情况',
    _raw: {},
    _errors: [],
    _isDirty: false,
  });

  return rows;
};

export const getDemoFieldMapping = (): FieldMapping => {
  return DEFAULT_FIELD_MAPPING;
};

export const generateDemoCSVContent = (): string => {
  const headers = ['品类', '日期', '预测值', '预测下限', '预测上限', '真实销量', '是否促销', '备注'];
  const rows = generateDemoData();

  const csvRows = [headers.join(',')];

  rows.forEach(row => {
    const values = [
      row.category,
      row.date,
      row.forecast !== null ? row.forecast : '',
      row.lowerBound !== null ? row.lowerBound : '',
      row.upperBound !== null ? row.upperBound : '',
      row.actual !== null ? row.actual : '',
      row.isPromotion ? '是' : '否',
      row.remark,
    ];
    csvRows.push(values.map(v => `"${v}"`).join(','));
  });

  return csvRows.join('\n');
};

export const downloadDemoCSV = () => {
  const content = generateDemoCSVContent();
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '销量预测样例数据_含异常.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
