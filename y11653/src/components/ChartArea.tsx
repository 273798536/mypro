import React, { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, Download } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { INDICATOR_LABELS, INDICATOR_COLORS, INDICATOR_UNITS, STANDARD_THRESHOLDS } from '@/data/chemicals';
import type { WaterQuality } from '@/types';

const VISIBLE_INDICATORS: (keyof WaterQuality)[] = ['cod', 'ammonia', 'totalPhosphorus', 'turbidity'];

export function ChartArea() {
  const { historyData, status } = useGameStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<(keyof WaterQuality)[]>(VISIBLE_INDICATORS);

  const toggleIndicator = (indicator: keyof WaterQuality) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicator) ? prev.filter((i) => i !== indicator) : [...prev, indicator]
    );
  };

  const exportChart = () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1200;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1200, 600);
      }

      const link = document.createElement('a');
      link.download = `水质曲线_${new Date().toLocaleDateString()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          实时水质曲线
        </h2>
        {status !== 'idle' && (
          <button
            onClick={exportChart}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出图表
          </button>
        )}
      </div>

      <div className="px-4 py-2 border-b border-slate-700 flex flex-wrap gap-2">
        {VISIBLE_INDICATORS.map((indicator) => (
          <button
            key={indicator}
            onClick={() => toggleIndicator(indicator)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedIndicators.includes(indicator)
                ? 'bg-opacity-30 text-white'
                : 'bg-slate-800 text-slate-500'
            }`}
            style={{
              backgroundColor: selectedIndicators.includes(indicator)
                ? INDICATOR_COLORS[indicator] + '40'
                : undefined,
              borderColor: selectedIndicators.includes(indicator)
                ? INDICATOR_COLORS[indicator]
                : 'transparent',
              borderWidth: '1px',
            }}
          >
            {INDICATOR_LABELS[indicator]}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4" ref={chartRef}>
        {historyData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
            <p>开始模拟后将显示水质变化曲线</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: '时间 (分钟)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
                formatter={(value: number, name: string) => {
                  const key = name as keyof WaterQuality;
                  return [`${value.toFixed(2)} ${INDICATOR_UNITS[key]}`, INDICATOR_LABELS[key]];
                }}
              />
              <Legend
                formatter={(value: string) => INDICATOR_LABELS[value as keyof WaterQuality]}
                wrapperStyle={{ color: '#cbd5e1' }}
              />

              <ReferenceLine y={STANDARD_THRESHOLDS.cod} stroke={INDICATOR_COLORS.cod} strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={STANDARD_THRESHOLDS.ammonia} stroke={INDICATOR_COLORS.ammonia} strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={STANDARD_THRESHOLDS.totalPhosphorus} stroke={INDICATOR_COLORS.totalPhosphorus} strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={STANDARD_THRESHOLDS.turbidity} stroke={INDICATOR_COLORS.turbidity} strokeDasharray="5 5" opacity={0.5} />

              {selectedIndicators.map((indicator) => (
                <Line
                  key={indicator}
                  type="monotone"
                  dataKey={indicator}
                  stroke={INDICATOR_COLORS[indicator]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: INDICATOR_COLORS[indicator] }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
