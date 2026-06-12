import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useCalcStore } from '@/store/useCalcStore';
import type { TidalPoint } from '@/types';

export default function TideChart() {
  const series = useCalcStore(s => s.tidalSeries);
  const harmonics = useCalcStore(s => s.harmonics);

  const option = useMemo(() => buildOption(series), [series]);

  if (!harmonics.length) {
    return (
      <div className="panel-card h-[320px] flex flex-col items-center justify-center text-ocean-500 text-sm">
        <div className="text-5xl mb-3 opacity-40">🌊</div>
        <div>未录入潮汐调和常数，无法绘制潮位曲线</div>
        <div className="text-xs mt-1">请在左侧「潮汐调和常数」面板输入或载入示例</div>
      </div>
    );
  }

  const hls = series.filter(s => s.type);
  return (
    <div className="panel-card overflow-hidden animate-fade-in">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="panel-title">潮位过程线（72h）</span>
          <span className="text-xs text-ocean-500 tabular-nums">
            共 {series.length} 点 · 高潮 {hls.filter(s => s.type === 'H').length} · 低潮 {hls.filter(s => s.type === 'L').length}
          </span>
        </div>
        <span className="text-[11px] text-ocean-500">来源：{Array.from(new Set(harmonics.map(h => h.sourceMaterial))).join(' · ') || '-'}</span>
      </div>
      <div className="p-3">
        <ReactECharts
          option={option}
          style={{ height: 260 }}
          notMerge
          lazyUpdate
        />
        {hls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
            {hls.slice(0, 6).map(p => (
              <div key={p.time} className={`px-2 py-0.5 rounded tabular-nums font-mono ${
                p.type === 'H' ? 'bg-status-deferred-soft text-status-deferred' : 'bg-ocean-100 text-ocean-700'
              }`}>
                {p.type === 'H' ? 'H 高潮' : 'L 低潮'} · {p.time.slice(5, 16)} · <b>{p.level.toFixed(2)}m</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildOption(series: TidalPoint[]): any {
  const xs = series.map(s => s.time.slice(5, 16));
  const levels = series.map(s => s.level);
  const confidences = series.map(s => Math.round(s.confidence * 100));
  const hIdx = series.map((s, i) => s.type === 'H' ? i : -1).filter(i => i >= 0);
  const lIdx = series.map((s, i) => s.type === 'L' ? i : -1).filter(i => i >= 0);
  return {
    grid: { left: 44, right: 44, top: 14, bottom: 36 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,37,64,0.92)',
      borderWidth: 0,
      textStyle: { color: '#fff', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
      formatter: (p: any) => {
        const d = p[0];
        const idx = d.dataIndex;
        const s = series[idx];
        const typeTxt = s.type === 'H' ? '· <b>高潮</b>' : s.type === 'L' ? '· <b>低潮</b>' : '';
        return `<div style="min-width:150px">
          <div style="font-family:Noto Serif SC,serif;font-weight:600;margin-bottom:4px">${d.axisValue}</div>
          <div>潮位：<b style="color:#2A6F97">${d.value.toFixed(3)} m</b> ${typeTxt}</div>
          <div>置信度：<b>${confidences[idx]}%</b></div>
        </div>`;
      },
    },
    xAxis: {
      type: 'category', data: xs,
      axisLine: { lineStyle: { color: '#C9DAEA' } },
      axisLabel: { color: '#2A6F97', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', interval: 5, rotate: 0 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value', name: '潮位 m', nameTextStyle: { color: '#2A6F97', fontSize: 11, padding: [0, 0, 0, 30] },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#2A6F97', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', formatter: (v: number) => v.toFixed(1) },
        splitLine: { lineStyle: { color: '#E0EBF5', type: 'dashed' } },
      },
    ],
    series: [
      {
        type: 'line', data: levels,
        smooth: true, symbol: 'none', showSymbol: false,
        lineStyle: { color: '#2A6F97', width: 2.2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(42,111,151,0.30)' },
              { offset: 1, color: 'rgba(42,111,151,0.02)' },
            ],
          },
        },
        markPoint: {
          symbol: 'circle', symbolSize: 40,
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', formatter: '{c}m' },
          data: [
            ...hIdx.map(i => ({ coord: [i, series[i].level], value: series[i].level.toFixed(2), itemStyle: { color: '#E9A23B' } })),
            ...lIdx.map(i => ({ coord: [i, series[i].level], value: series[i].level.toFixed(2), itemStyle: { color: '#0E7C7B' } })),
          ],
        },
      },
    ],
  };
}
