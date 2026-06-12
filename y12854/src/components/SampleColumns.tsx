import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Sample } from '@/types';

interface FieldDef {
  key: keyof Sample;
  label: string;
  unit: string;
  min: number;
  max: number;
}

const numericFields: FieldDef[] = [
  { key: 'temperature', label: '水温', unit: '°C', min: 15, max: 28 },
  { key: 'salinity', label: '盐度', unit: '‰', min: 28, max: 34 },
  { key: 'dissolvedOxygen', label: '溶解氧', unit: 'mg/L', min: 5, max: 10 },
  { key: 'chlorophyllA', label: '叶绿素a', unit: 'μg/L', min: 0, max: 10 },
  { key: 'ph', label: 'pH', unit: '', min: 7.5, max: 8.5 },
];

function isOutOfRange(val: number, field: FieldDef) {
  return val < field.min || val > field.max;
}

export function SampleCharts({ sample }: { sample: Sample }) {
  const timeSeriesData = [
    { t: 'T1', temperature: Number((sample.temperature - 0.3).toFixed(1)), salinity: Number((sample.salinity - 0.2).toFixed(1)), dissolvedOxygen: Number((sample.dissolvedOxygen + 0.1).toFixed(1)) },
    { t: 'T2', temperature: Number((sample.temperature - 0.1).toFixed(1)), salinity: Number((sample.salinity - 0.1).toFixed(1)), dissolvedOxygen: Number((sample.dissolvedOxygen + 0.05).toFixed(1)) },
    { t: 'T3', temperature: Number(sample.temperature.toFixed(1)), salinity: Number(sample.salinity.toFixed(1)), dissolvedOxygen: Number(sample.dissolvedOxygen.toFixed(1)) },
  ];

  const scatterData = [{ x: Number(sample.chlorophyllA.toFixed(1)), y: Number(sample.ph.toFixed(2)) }];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-400 mb-1">水温/盐度/溶解氧 时序</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 11 }}
              formatter={(value: number, name: string) => {
                const unit = name === '水温' ? '°C' : name === '盐度' ? '‰' : 'mg/L';
                return [`${value}${unit}`, name];
              }}
            />
            <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="水温" />
            <Line type="monotone" dataKey="salinity" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="盐度" />
            <Line type="monotone" dataKey="dissolvedOxygen" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="溶解氧" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-1">叶绿素a vs pH</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scatterData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'μg/L', position: 'bottom', fontSize: 9, fill: '#64748b' }} />
            <YAxis dataKey="y" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 11 }}
              formatter={(value: number, name: string) => {
                if (name === 'pH') return [value.toFixed(2), name];
                return [value, name];
              }}
              labelFormatter={(label) => `叶绿素a: ${label} μg/L`}
            />
            <Line type="monotone" dataKey="y" stroke="#f59e0b" strokeWidth={2} dot={{ r: 6 }} name="pH" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatValue(key: keyof Sample, val: number): string {
  if (key === 'ph') return val.toFixed(2);
  return val.toFixed(1);
}

export function SampleTable({ sample }: { sample: Sample }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-1.5 pr-2 text-slate-400 font-medium">指标</th>
            <th className="text-right py-1.5 px-2 text-slate-400 font-medium">当前值</th>
            <th className="text-right py-1.5 px-2 text-slate-400 font-medium">正常范围</th>
            <th className="text-center py-1.5 pl-2 text-slate-400 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {numericFields.map((field) => {
            const val = (sample[field.key] as number) ?? 0;
            const oor = isOutOfRange(val, field);
            return (
              <tr key={field.key} className="border-b border-slate-800/50">
                <td className="py-1.5 pr-2 text-slate-300">{field.label}</td>
                <td className={`py-1.5 px-2 text-right font-mono ${oor ? 'text-red-400 font-bold' : 'text-white'}`}>
                  {formatValue(field.key, val)}{field.unit}
                </td>
                <td className="py-1.5 px-2 text-right text-slate-500 font-mono">
                  {field.min}–{field.max}{field.unit}
                </td>
                <td className="py-1.5 pl-2 text-center">
                  {oor ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  ) : (
                    <span className="inline-block w-2 h-2 rounded-full bg-success-green" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SampleText({ sample }: { sample: Sample }) {
  const desc = numericFields.map((field) => {
    const val = (sample[field.key] as number) ?? 0;
    const oor = isOutOfRange(val, field);
    const formattedVal = formatValue(field.key, val);
    const anomalyText = oor
      ? `（异常，正常范围${field.min}–${field.max}${field.unit}）`
      : '（正常）';
    return `${field.label}${formattedVal}${field.unit}${anomalyText}`;
  });

  return (
    <div className="text-xs leading-relaxed text-slate-300">
      <p className="font-medium text-white mb-1">
        {sample.stationName} {sample.sampleDate} 采样
      </p>
      <p>{desc.join('，')}。</p>
      {sample.buoyData?.[0]?.isLate && (
        <p className="mt-1 text-warning-amber">
          浮标数据晚到，部分指标待确认。
        </p>
      )}
      {sample.tideData?.[0] && !sample.tideData[0].timezoneValid && (
        <p className="mt-1 text-red-400">
          潮汐数据时区异常：{sample.tideData[0].timezoneError}
        </p>
      )}
    </div>
  );
}
