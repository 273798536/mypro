import { useEffect, useMemo, useRef, useState } from 'react';
import type { Anomaly, SensorRecord } from 'shared/types';
import { useNavigate } from 'react-router-dom';

interface Props {
  records: SensorRecord[];
  anomalies: Anomaly[];
  highlightPointIds?: string[];
  activeAnomalyId?: string | null;
  onSelect?: (anomaly: Anomaly) => void;
}

export default function FloorMap({
  records,
  anomalies,
  highlightPointIds = [],
  activeAnomalyId,
  onSelect,
}: Props) {
  const navigate = useNavigate();
  const highlightSet = useMemo(() => new Set(highlightPointIds), [highlightPointIds]);

  const { zones, maxRow, maxCol } = useMemo(() => {
    const zoneMap = new Map<string, SensorRecord[]>();
    let maxRow = 0, maxCol = 0;
    for (const r of records) {
      const prefix = r.point_id.split('-')[0];
      if (!zoneMap.has(prefix)) zoneMap.set(prefix, []);
      zoneMap.get(prefix)!.push(r);
      maxRow = Math.max(maxRow, r.row);
      maxCol = Math.max(maxCol, r.col);
    }
    return {
      zones: Array.from(zoneMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      maxRow,
      maxCol,
    };
  }, [records]);

  const anomalyByPoint = useMemo(() => {
    const m = new Map<string, Anomaly[]>();
    for (const a of anomalies) {
      if (!m.has(a.point_id)) m.set(a.point_id, []);
      m.get(a.point_id)!.push(a);
    }
    return m;
  }, [anomalies]);

  const cell = 38;
  const gap = 6;
  const colW = cell + gap;
  const rowH = cell + gap;

  function cellClass(r: SensorRecord, anoms: Anomaly[] | undefined): string {
    const base = 'relative rounded border text-[11px] font-mono flex flex-col items-center justify-center transition cursor-pointer';
    if (r.is_dirty) return `${base} bg-rose-50 border-rose-300 text-rose-700`;
    if (!anoms || anoms.length === 0) return `${base} bg-green-50/70 border-green-200 text-green-700 hover:bg-green-100`;
    const hasActive = anoms.some(a => a.id === activeAnomalyId);
    if (highlightSet.has(r.point_id)) {
      return hasActive
        ? `${base} bg-status-anomaly text-white border-status-anomaly shadow-md animate-pulse-ring`
        : `${base} bg-amber-100 border-status-pending text-amber-900 ring-2 ring-status-pending/60`;
    }
    // 有异常但未被高亮
    const worst = anoms.some(a => a.status === 'confirmed_anomaly')
      ? 'bg-red-100 border-status-anomaly text-status-anomaly'
      : anoms.some(a => a.status === 'pending')
        ? 'bg-amber-50 border-status-pending text-amber-800'
        : anoms.some(a => a.status === 'dismissed')
          ? 'bg-gray-100 border-gray-300 text-gray-600'
          : 'bg-green-50 border-green-200 text-green-700';
    return `${base} ${worst} hover:shadow-md`;
  }

  function handleClick(r: SensorRecord, anoms: Anomaly[] | undefined) {
    if (!anoms || anoms.length === 0) return;
    const target = anoms.find(a => a.id === activeAnomalyId) || anoms[0];
    if (onSelect) onSelect(target);
    else navigate(`/anomaly/${target.id}`);
  }

  return (
    <div className="space-y-5">
      {zones.map(([zoneName, zoneRecords]) => {
        const rows = maxRow;
        const cols = maxCol;
        const W = (cols + 1) * gap + cols * cell;
        const H = (rows + 1) * gap + rows * cell + 20;
        return (
          <div key={zoneName} className="card-padded">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="font-mono text-sm font-semibold text-brand-700">冷通道区域 <span className="text-brand-900">{zoneName}</span></div>
                <div className="text-[11px] text-brand-500 mt-0.5">共 {zoneRecords.length} 个点位 · {rows} 行 × {cols} 列</div>
              </div>
              <Legend />
            </div>
            <div className="overflow-auto -mx-1 px-1 pb-2">
              <svg width={W} height={H} className="shrink-0 block">
                {/* 列标题 */}
                {Array.from({ length: cols }).map((_, c) => (
                  <text
                    key={`col-${c}`}
                    x={gap + c * colW + cell / 2}
                    y={12}
                    className="fill-brand-400 text-[10px] font-mono"
                    textAnchor="middle"
                  >
                    {String(c + 1).padStart(2, '0')}
                  </text>
                ))}
                {Array.from({ length: rows }).map((_, r) => (
                  <g key={`row-${r}`}>
                    <text
                      x={4}
                      y={20 + r * rowH + cell / 2 + 3}
                      className="fill-brand-400 text-[10px] font-mono"
                    >
                      R{r + 1}
                    </text>
                  </g>
                ))}
              </svg>
              <div
                className="relative -mt-[var(--svg-h,40px)]"
                style={{ width: W, marginTop: -H + 20 }}
              >
                <div
                  className="grid relative"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
                    gridAutoRows: `${cell}px`,
                    gap: `${gap}px`,
                    paddingLeft: `${colW - cell + 2}px`,
                    paddingTop: `${gap}px`,
                  }}
                >
                  {Array.from({ length: rows }).flatMap((_, rIdx) =>
                    Array.from({ length: cols }).map((_, cIdx) => {
                      const row = rIdx + 1;
                      const col = cIdx + 1;
                      const rec = zoneRecords.find(r => r.row === row && r.col === col);
                      const key = `${zoneName}-${row}-${col}`;
                      if (!rec) {
                        return (
                          <div
                            key={key}
                            className="rounded border border-dashed border-brand-100 bg-brand-50/40"
                            title={`${zoneName}-${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')} · 无记录`}
                          />
                        );
                      }
                      const anoms = anomalyByPoint.get(rec.point_id);
                      return (
                        <div
                          key={key}
                          className={cellClass(rec, anoms)}
                          onClick={() => handleClick(rec, anoms)}
                          title={`${rec.point_id}${rec.temperature !== null ? ' · ' + rec.temperature + '℃' : ''}${rec.is_dirty ? ' · 脏数据' : ''}`}
                        >
                          <div className="leading-none">{rec.point_id.slice(-2)}</div>
                          <div className="text-[9px] leading-none mt-0.5 opacity-80">
                            {rec.temperature !== null ? `${rec.temperature}°` : '—'}
                          </div>
                          {anoms && anoms.length > 0 ? (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white bg-status-pending" />
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  const items = [
    { c: 'bg-green-50/70 border-green-200', t: '正常' },
    { c: 'bg-amber-50 border-status-pending', t: '待确认' },
    { c: 'bg-red-100 border-status-anomaly', t: '已确认异常' },
    { c: 'bg-amber-100 ring-2 ring-status-pending/60 border-status-pending', t: '影响范围' },
    { c: 'bg-rose-50 border-rose-300', t: '脏数据' },
    { c: 'border-dashed border-brand-200 bg-brand-50/40', t: '点位缺失' },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end text-[11px] text-brand-600 max-w-md">
      {items.map(i => (
        <div key={i.t} className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded border ${i.c}`} />
          <span>{i.t}</span>
        </div>
      ))}
    </div>
  );
}
