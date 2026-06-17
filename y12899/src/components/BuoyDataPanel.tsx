import { useState, useRef } from 'react';
import { Thermometer, Droplets, Wind, Activity, Upload, Table, LineChart, X, AlertCircle, CheckCircle2, FileJson, FileSpreadsheet, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuoyData } from '../types';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FormulaPanel } from './FormulaPanel';
import { formulaInfo, biomassFormula, calculateHarvestEstimate } from '../utils/calculations';

interface BuoyDataPanelProps {
  dataList: BuoyData[];
  area: number;
  hasViolation: boolean;
  tideRange: number;
  windSpeed: number;
  waterRecords: any[];
  onImportBatch?: (rows: Partial<BuoyData>[]) => { added: number; errors: string[] };
  className?: string;
}

const indicatorConfig = [
  { key: 'temperature', label: '水温', unit: '°C', icon: Thermometer, color: 'text-rose-500' },
  { key: 'salinity', label: '盐度', unit: 'psu', icon: Droplets, color: 'text-cyan-500' },
  { key: 'dissolvedOxygen', label: '溶解氧', unit: 'mg/L', icon: Wind, color: 'text-sky-500' },
  { key: 'pH', label: 'pH值', unit: '', icon: Activity, color: 'text-amber-500' },
  { key: 'chlorophyll', label: '叶绿素a', unit: 'μg/L', icon: Activity, color: 'text-emerald-500' },
  { key: 'turbidity', label: '浊度', unit: 'NTU', icon: Activity, color: 'text-slate-500' },
];

export function BuoyDataPanel({
  dataList,
  area,
  hasViolation,
  tideRange,
  windSpeed,
  waterRecords,
  onImportBatch,
  className,
}: BuoyDataPanelProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [selectedIndicator, setSelectedIndicator] = useState('temperature');
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'manual'>('file');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseSuccess, setParseSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const manualDefaults: Record<string, string> = {
    temperature: '',
    salinity: '',
    dissolvedOxygen: '',
    pH: '',
    chlorophyll: '',
    turbidity: '',
    timestamp: '',
  };
  const [manualRow, setManualRow] = useState<Record<string, string>>(manualDefaults);

  const estimate = calculateHarvestEstimate(
    area,
    dataList,
    waterRecords,
    hasViolation,
    tideRange,
    windSpeed
  );

  const avgData = dataList.length > 0
    ? dataList.reduce(
        (acc, data) => ({
          temperature: acc.temperature + data.temperature / dataList.length,
          salinity: acc.salinity + data.salinity / dataList.length,
          dissolvedOxygen: acc.dissolvedOxygen + data.dissolvedOxygen / dataList.length,
          pH: acc.pH + data.pH / dataList.length,
          chlorophyll: acc.chlorophyll + data.chlorophyll / dataList.length,
          turbidity: acc.turbidity + data.turbidity / dataList.length,
        }),
        { temperature: 0, salinity: 0, dissolvedOxygen: 0, pH: 0, chlorophyll: 0, turbidity: 0 }
      )
    : { temperature: 0, salinity: 0, dissolvedOxygen: 0, pH: 0, chlorophyll: 0, turbidity: 0 };

  const chartData = dataList.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    value: d[selectedIndicator as keyof BuoyData] as number,
  }));

  const selectedConfig = indicatorConfig.find(c => c.key === selectedIndicator)!;

  const parseCSV = (text: string): Partial<BuoyData>[] => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    const header = lines[0].split(',').map(s => s.trim().toLowerCase());
    const fieldMap: Record<string, keyof BuoyData | 'timestamp'> = {
      'timestamp': 'timestamp', '时间': 'timestamp', 'time': 'timestamp', 'datetime': 'timestamp',
      'temperature': 'temperature', '水温': 'temperature', 'temp': 'temperature',
      'salinity': 'salinity', '盐度': 'salinity',
      'dissolvedoxygen': 'dissolvedOxygen', '溶解氧': 'dissolvedOxygen', 'do': 'dissolvedOxygen',
      'ph': 'pH',
      'chlorophyll': 'chlorophyll', '叶绿素': 'chlorophyll', 'chl': 'chlorophyll',
      'turbidity': 'turbidity', '浊度': 'turbidity',
      'lat': 'location', 'latitude': 'location', '纬度': 'location',
      'lng': 'location', 'longitude': 'location', '经度': 'location',
    };

    const idx: Partial<Record<keyof BuoyData | 'timestamp' | 'lat' | 'lng', number>> = {};
    header.forEach((h, i) => {
      const key = fieldMap[h];
      if (key === 'location') {
        if (h.includes('lat') || h === '纬度') idx.lat = i;
        else idx.lng = i;
      } else if (key) {
        (idx as any)[key] = i;
      }
    });

    const rows: Partial<BuoyData>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim());
      const row: Partial<BuoyData> = {};
      if (typeof idx.timestamp === 'number') {
        const v = cols[idx.timestamp];
        if (v) row.timestamp = v;
      }
      const numericFields: (keyof BuoyData)[] = ['temperature', 'salinity', 'dissolvedOxygen', 'pH', 'chlorophyll', 'turbidity'];
      numericFields.forEach(f => {
        const i2 = (idx as any)[f];
        if (typeof i2 === 'number' && cols[i2] !== '') {
          const v = parseFloat(cols[i2]);
          if (!Number.isNaN(v)) (row as any)[f] = v;
        }
      });
      if (typeof idx.lat === 'number' || typeof idx.lng === 'number') {
        const lat = typeof idx.lat === 'number' ? parseFloat(cols[idx.lat]) : NaN;
        const lng = typeof idx.lng === 'number' ? parseFloat(cols[idx.lng]) : NaN;
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          row.location = { lat, lng };
        }
      }
      rows.push(row);
    }
    return rows;
  };

  const handleFile = async (file: File) => {
    setParseErrors([]);
    setParseSuccess(null);
    const text = await file.text();
    let rows: Partial<BuoyData>[] = [];
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        rows = parseCSV(text);
      }
    } catch (e: any) {
      setParseErrors([`文件解析失败：${e?.message || '未知错误'}`]);
      return;
    }
    if (rows.length === 0) {
      setParseErrors(['未解析到任何数据行']);
      return;
    }
    if (!onImportBatch) {
      setParseErrors(['未配置导入处理器']);
      return;
    }
    const result = onImportBatch(rows);
    if (result.errors.length > 0) setParseErrors(result.errors);
    if (result.added > 0) {
      setParseSuccess(`成功导入 ${result.added} 条浮标数据，收成估算已自动更新`);
      setShowImport(false);
    }
  };

  const handleManualSubmit = () => {
    setParseErrors([]);
    setParseSuccess(null);
    if (!onImportBatch) return;
    const row: Partial<BuoyData> = {};
    const required = ['temperature', 'salinity', 'dissolvedOxygen', 'pH', 'chlorophyll', 'turbidity'] as const;
    const missing: string[] = [];
    required.forEach(k => {
      const v = manualRow[k];
      const num = parseFloat(v);
      if (v === '' || Number.isNaN(num)) {
        missing.push(indicatorConfig.find(c => c.key === k)?.label || k);
      } else {
        (row as any)[k] = num;
      }
    });
    if (missing.length > 0) {
      setParseErrors([`缺少或格式错误：${missing.join('、')}`]);
      return;
    }
    if (manualRow.timestamp) {
      const ts = new Date(manualRow.timestamp);
      row.timestamp = Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
    }
    const result = onImportBatch([row]);
    if (result.errors.length > 0) setParseErrors(result.errors);
    if (result.added > 0) {
      setParseSuccess(`已添加 1 条浮标数据，收成估算已自动更新`);
      setManualRow(manualDefaults);
    }
  };

  const resetFeedback = () => {
    setParseErrors([]);
    setParseSuccess(null);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Activity size={20} className="text-sky-600" />
          浮标数据处理
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'table' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Table size={14} />
              数据表格
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'chart' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <LineChart size={14} />
              趋势图
            </button>
          </div>
          <button
            onClick={() => { resetFeedback(); setShowImport(v => !v); }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors',
              showImport
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Upload size={14} />
            {showImport ? '收起导入' : '导入数据'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        </div>
      </div>

      {showImport && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">浮标数据导入</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                支持 CSV / JSON（CSV 表头示例：timestamp,temperature,salinity,dissolvedOxygen,pH,chlorophyll,turbidity,lat,lng）
              </p>
            </div>
            <button
              onClick={() => setShowImport(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex rounded-lg border border-sky-200 bg-white overflow-hidden w-fit">
            <button
              onClick={() => { setImportMode('file'); resetFeedback(); }}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                importMode === 'file' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <FileSpreadsheet size={14} />
              上传文件
            </button>
            <button
              onClick={() => { setImportMode('manual'); resetFeedback(); }}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5',
                importMode === 'manual' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <Edit3 size={14} />
              手动录入
            </button>
          </div>

          {parseSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={15} />
              {parseSuccess}
            </div>
          )}
          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
              {parseErrors.map((e, i) => (
                <div key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {e}
                </div>
              ))}
            </div>
          )}

          {importMode === 'file' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-sky-300 bg-white py-6 text-sm text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition-colors flex flex-col items-center gap-1.5"
            >
              <FileJson size={24} className="text-sky-500" />
              点击选择 CSV 或 JSON 文件
            </button>
          )}

          {importMode === 'manual' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {indicatorConfig.map(c => (
                <label key={c.key} className="space-y-1">
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <c.icon size={12} className={c.color} />
                    {c.label} ({c.unit}) <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={manualRow[c.key]}
                    onChange={e => setManualRow({ ...manualRow, [c.key]: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    placeholder={`例如 ${c.key === 'pH' ? '8.1' : c.key === 'temperature' ? '22.5' : '30'}`}
                  />
                </label>
              ))}
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">采集时间（留空=现在）</span>
                <input
                  type="datetime-local"
                  value={manualRow.timestamp}
                  onChange={e => setManualRow({ ...manualRow, timestamp: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                />
              </label>
              <div className="flex items-end">
                <button
                  onClick={handleManualSubmit}
                  className="w-full rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600 transition-colors"
                >
                  提交 1 条
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-6 gap-3">
        {indicatorConfig.map(config => {
          const Icon = config.icon;
          const value = avgData[config.key as keyof typeof avgData];
          return (
            <div
              key={config.key}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all',
                selectedIndicator === config.key
                  ? 'border-sky-300 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
              onClick={() => setSelectedIndicator(config.key)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={config.color} />
                <span className="text-xs text-slate-500">{config.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">
                {value.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-0.5">{config.unit}</span>
              </p>
            </div>
          );
        })}
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">时间</th>
                  {indicatorConfig.map(config => (
                    <th key={config.key} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {config.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dataList.map(data => (
                  <tr key={data.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {new Date(data.timestamp).toLocaleString('zh-CN')}
                    </td>
                    {indicatorConfig.map(config => {
                      const value = data[config.key as keyof BuoyData] as number;
                      return (
                        <td key={config.key} className="px-4 py-3 whitespace-nowrap text-sm font-mono text-slate-700">
                          {value.toFixed(1)}
                          <span className="text-xs text-slate-400 ml-1">{config.unit}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} ${selectedConfig.unit}`, selectedConfig.label]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedConfig.label}
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <FormulaPanel
        formula={formulaInfo}
        result={estimate.estimatedYield}
        resultUnit={estimate.unit}
        calculation={{
          values: {
            '养殖面积': estimate.breakdown.area,
            '单位面积生物量': estimate.breakdown.biomassPerUnit,
            '成活率': estimate.breakdown.survivalRate / 100,
            '校正系数': estimate.breakdown.correctionFactor / 100,
          },
          breakdown: {
            '养殖面积': estimate.breakdown.area,
            '单位面积生物量': estimate.breakdown.biomassPerUnit,
            '成活率': `${estimate.breakdown.survivalRate}%`,
            '校正系数': (estimate.breakdown.correctionFactor / 100).toFixed(4),
            '估算产量': `${estimate.estimatedYield.toLocaleString()} ${estimate.unit}`,
          },
        }}
        defaultOpen
      />

      <FormulaPanel
        formula={biomassFormula}
        calculation={{
          values: {
            'T (水温)': avgData.temperature,
            'S (盐度)': avgData.salinity,
            'DO (溶解氧)': avgData.dissolvedOxygen,
            'Chl (叶绿素a)': avgData.chlorophyll,
          },
          breakdown: {
            '计算结果': `${estimate.breakdown.biomassPerUnit} kg/亩`,
          },
        }}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-slate-700">收成估算结果</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">置信度</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full"
                style={{ width: `${estimate.confidence}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">{estimate.confidence}%</span>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-2">估算产量</p>
          <p className="text-4xl font-bold text-slate-800">
            {estimate.estimatedYield.toLocaleString()}
            <span className="text-lg font-normal text-slate-500 ml-2">{estimate.unit}</span>
          </p>
          <p className="text-sm text-slate-400 mt-2">
            约 {(estimate.estimatedYield / 1000).toFixed(2)} 吨
          </p>
        </div>
      </div>
    </div>
  );
}
