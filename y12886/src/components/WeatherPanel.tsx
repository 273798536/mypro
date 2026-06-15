import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Wind, AlertTriangle } from 'lucide-react';
import type { WeatherRecord, WindRoseBin, SeaStateLevel } from '@/types';
import { SEA_STATE_LABELS } from '@/types';
import { computeWindRose, computeSeaStateSummary } from '@/utils/dataEngine';

const SPEED_COLORS: Record<string, string> = {
  speed0to5: '#2E8BC0',
  speed5to10: '#2EC4B6',
  speed10to15: '#FF6B35',
  speed15plus: '#E63946',
};
const SPEED_LABELS: Record<string, string> = {
  speed0to5: '0-5 m/s',
  speed5to10: '5-10 m/s',
  speed10to15: '10-15 m/s',
  speed15plus: '15+ m/s',
};
const SPEED_KEYS = ['speed0to5', 'speed5to10', 'speed10to15', 'speed15plus'] as const;

interface Props {
  records: WeatherRecord[];
}

export default function WeatherPanel({ records }: Props) {
  const roseData = useMemo(() => computeWindRose(records), [records]);
  const seaSummary = useMemo(() => computeSeaStateSummary(records), [records]);
  const validRecords = useMemo(() => records.filter(r => !r.isAnomaly), [records]);
  const anomalies = useMemo(() => records.filter(r => r.isAnomaly), [records]);

  const dominantDir = useMemo(() => {
    let max = 0;
    let dir = '-';
    for (const b of roseData) {
      const t = b.speed0to5 + b.speed5to10 + b.speed10to15 + b.speed15plus;
      if (t > max) { max = t; dir = b.direction; }
    }
    return dir;
  }, [roseData]);

  const windRange = useMemo(() => {
    if (!validRecords.length) return { min: 0, max: 0 };
    const s = validRecords.map(r => r.windSpeed);
    return { min: Math.min(...s), max: Math.max(...s) };
  }, [validRecords]);

  const maxSea = useMemo(() => {
    if (!seaSummary.length) return { level: 0, label: '-' };
    const m = seaSummary.reduce((a, b) => (a.level > b.level ? a : b));
    return { level: m.level, label: SEA_STATE_LABELS[m.level as SeaStateLevel] ?? m.label };
  }, [seaSummary]);

  return (
    <div className="rounded-lg overflow-hidden shadow-md" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div className="bg-[#0C2D48] text-white px-4 py-2.5 flex items-center gap-2">
        <Wind size={18} />
        <span className="font-semibold text-sm">气象预报</span>
      </div>
      <div className="bg-white p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-2">风玫瑰图</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={roseData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="direction" type="category" tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {SPEED_KEYS.map(key => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={SPEED_COLORS[key]}
                    name={SPEED_LABELS[key]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">海况等级</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-1 text-left font-medium">等级</th>
                  <th className="py-1 text-left font-medium">描述</th>
                  <th className="py-1 text-right font-medium">次数</th>
                </tr>
              </thead>
              <tbody>
                {seaSummary.map(row => (
                  <tr
                    key={row.level}
                    className={`border-b ${row.level >= 4 ? 'text-orange-600 font-medium' : ''}`}
                  >
                    <td className="py-1">{row.level}</td>
                    <td className="py-1">{SEA_STATE_LABELS[row.level as SeaStateLevel] ?? row.label}</td>
                    <td className="py-1 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-2">概要</div>
            <div className="text-xs space-y-2">
              <p><span className="text-gray-500">主导风向：</span>{dominantDir}</p>
              <p><span className="text-gray-500">风速范围：</span>{windRange.min}–{windRange.max} m/s</p>
              <p><span className="text-gray-500">海况评估：</span>{maxSea.level}级（{maxSea.label}）</p>
              {anomalies.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-red-600 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} />
                    异常记录 ×{anomalies.length}
                  </p>
                  {anomalies.map(a => (
                    <p key={a.id} className="text-red-500 pl-4">{a.anomalyReason}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
