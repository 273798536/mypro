import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Target,
  AlertTriangle,
  Info,
  ArrowRight,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  FileWarning,
  CircleDot,
} from 'lucide-react';
import { useTorqueStore } from '@/store/useTorqueStore';
import { STATUS_LABELS } from '@/types';
import type { TorqueCalcResult, AnomalyItem } from '@/types';
import { formatTorque } from '@/utils/unitConverter';

const COLOR_NAMEPLATE_BG = '#2563eb';
const COLOR_NAMEPLATE_BORDER = '#1e40af';
const COLOR_CALCULATED_BG = '#0d9488';
const COLOR_CALCULATED_BORDER = '#134e4a';
const COLOR_CALC_MISSING = '#cbd5e1';
const COLOR_UNKNOWN = '#94a3b8';
const COLOR_WARN = '#f97316';
const COLOR_ERROR = '#dc2626';

export default function ChartPage() {
  const navigate = useNavigate();
  const { results, selectRecord, selectedRecordId } = useTorqueStore();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [compressExtremes, setCompressExtremes] = useState<boolean>(true);

  const { chartData, thresholdData, yMax, stats, truncatedCount } = useMemo(() => {
    const items = results.map(r => ({
      idx: 0,
      id: r.recordId,
      deviceId: r.deviceId,
      deviceName: r.deviceName || '',
      nameplateNm: r.normalizedValue,
      calculatedNm: r.calculatedTorque ?? null,
      hasCalc: r.calculatedTorque !== null,
      status: r.status,
      thresholdNm: r.thresholdCheck?.threshold ?? null,
      thresholdPassed: r.thresholdCheck?.passed,
      thresholdRatio: r.thresholdCheck?.ratio ?? null,
      thresholdSource: r.thresholdCheck?.thresholdSource ?? '',
      anomalyCount: r.anomalies.length,
      anomalyTypes: r.anomalies.map(a => a.type),
      sourceFile: r.sourceFile,
      sourceRow: r.sourceRow,
      calcMethod: r.calcMethod,
      originalValue: r.originalValue,
      originalUnit: r.originalUnit,
      unitFactor: r.unitConversion.factor,
      unitDetected: r.unitConversion.detected,
      nameplateNmDisplay: r.normalizedValue,
      calculatedNmDisplay: r.calculatedTorque,
      thresholdNmDisplay: r.thresholdCheck?.threshold ?? null,
      isTruncated: false,
    }));
    items.forEach((it, i) => (it.idx = i));

    const yValues: number[] = [];
    items.forEach(it => {
      if (it.nameplateNm > 0) yValues.push(it.nameplateNm);
      if (it.calculatedNm !== null && it.calculatedNm > 0) yValues.push(it.calculatedNm);
      if (it.thresholdNm !== null && it.thresholdNm > 0) yValues.push(it.thresholdNm);
    });

    let computedYMax = yValues.length ? Math.max(...yValues) * 1.18 : 100;
    let truncated = 0;

    if (compressExtremes && yValues.length >= 3) {
      const sorted = [...yValues].sort((a, b) => a - b);
      const p90Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9));
      const p90 = sorted[p90Idx];
      const p50 = sorted[Math.floor(sorted.length / 2)];
      const dynamicCap = Math.max(p90 * 2.2, p50 * 10, 500);
      if (dynamicCap < computedYMax * 0.5) {
        computedYMax = dynamicCap;
        items.forEach(it => {
          const vals: number[] = [];
          if (it.nameplateNm > 0) vals.push(it.nameplateNm);
          if (it.calculatedNm !== null) vals.push(it.calculatedNm);
          if (it.thresholdNm !== null) vals.push(it.thresholdNm);
          const localMax = vals.length ? Math.max(...vals) : 0;
          if (localMax > computedYMax * 0.92) {
            it.isTruncated = true;
            truncated++;
            const scale = (computedYMax * 0.92) / localMax;
            if (it.nameplateNm > 0) it.nameplateNmDisplay = it.nameplateNm * scale;
            if (it.calculatedNm !== null) it.calculatedNmDisplay = it.calculatedNm * scale;
            if (it.thresholdNm !== null) it.thresholdNmDisplay = it.thresholdNm * scale;
          }
        });
      }
    }

    const thData = items
      .filter(it => it.thresholdNmDisplay !== null)
      .map(it => ({
        x: it.deviceId,
        y: it.thresholdNmDisplay!,
        yRaw: it.thresholdNm!,
        passed: it.thresholdPassed!,
        source: it.thresholdSource,
        ratio: it.thresholdRatio!,
        nameplateNm: it.nameplateNmDisplay,
        calculatedNm: it.calculatedNmDisplay,
        id: it.id,
        idx: it.idx,
        truncated: it.isTruncated,
      }));

    const total = items.length;
    const normal = items.filter(i => i.status === 'normal').length;
    const anomaly = items.filter(i => i.status === 'warning').length;
    const error = items.filter(i => i.status === 'error').length;
    const unknown = items.filter(i => i.status === 'unknown').length;
    const overThreshold = items.filter(i => i.thresholdPassed === false).length;
    const calcCoverage = total
      ? Math.round((items.filter(i => i.hasCalc).length / total) * 100)
      : 0;

    return {
      chartData: items,
      thresholdData: thData,
      yMax: computedYMax,
      stats: { total, normal, anomaly, error, unknown, overThreshold, calcCoverage },
      truncatedCount: truncated,
    };
  }, [results, compressExtremes]);

  const truncatedScatterData = useMemo(() => {
    return chartData
      .filter(it => it.isTruncated)
      .map(it => ({
        x: it.deviceId,
        y: Math.max(it.nameplateNmDisplay || 0, it.calculatedNmDisplay || 0) * 1.01,
        id: it.id,
        idx: it.idx,
        nameplateRaw: it.nameplateNm,
        calculatedRaw: it.calculatedNm,
      }));
  }, [chartData]);

  const selectedItem = chartData.find(i => i.id === selectedRecordId) ?? null;
  const selectedFull: TorqueCalcResult | null =
    selectedResultById(results, selectedRecordId);

  if (results.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">暂无数据，请先导入铭牌数据</div>
        </div>
      </div>
    );
  }

  const handleBarClick = (payload: any) => {
    if (!payload) return;
    const item = 'idx' in payload ? payload : payload?.payload;
    if (item && typeof item.id === 'string') {
      selectRecord(item.id);
    }
  };

  const jumpToDetail = () => {
    if (!selectedRecordId) return;
    selectRecord(selectedRecordId);
    navigate('/detail');
  };

  return (
    <div className="p-6 h-full flex flex-col min-h-0">
      <div className="mb-4 flex-shrink-0 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            图表可视化
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            铭牌值 vs 复算值同口径对照 · 每台设备独立安全阈值 · 点击柱体定位到明细溯源
          </p>
        </div>
        {selectedRecordId && (
          <button
            onClick={jumpToDetail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-colors flex-shrink-0"
          >
            查看详情溯源
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2.5 mb-4 flex-shrink-0">
        <StatCard label="总记录" value={stats.total} tone="slate" icon={BarChart3} />
        <StatCard label="正常" value={stats.normal} tone="emerald" icon={ShieldCheck} />
        <StatCard label="异常" value={stats.anomaly} tone="orange" icon={AlertTriangle} />
        <StatCard label="错误" value={stats.error} tone="red" icon={FileWarning} />
        <StatCard label="未知" value={stats.unknown} tone="slate" icon={CircleDot} />
        <StatCard
          label="超阈值"
          value={stats.overThreshold}
          tone="red"
          icon={ShieldAlert}
          highlight={stats.overThreshold > 0}
        />
        <StatCard
          label="复算覆盖率"
          value={`${stats.calcCoverage}%`}
          tone="teal"
          icon={Gauge}
          highlight={stats.calcCoverage < 80}
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="text-[13px] font-medium text-slate-700">
            铭牌换算值 · 公式复算值 · 独立安全阈值标记
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={compressExtremes}
                onChange={e => setCompressExtremes(e.target.checked)}
                className="w-3 h-3 accent-blue-600"
              />
              <span>压缩极端值</span>
              {truncatedCount > 0 && (
                <span className="px-1 rounded bg-orange-100 text-orange-700 text-[10px] font-medium">
                  {truncatedCount} 条已压缩
                </span>
              )}
            </label>
            <LegendSwatch label="铭牌换算" color={COLOR_NAMEPLATE_BG} border={COLOR_NAMEPLATE_BORDER} />
            <LegendSwatch label="公式复算" color={COLOR_CALCULATED_BG} border={COLOR_CALCULATED_BORDER} />
            <LegendSwatch label="无法复算" color={COLOR_CALC_MISSING} border="#94a3b8" dashed />
            <LegendLine label="阈值·达标" color="#10b981" />
            <LegendLine label="阈值·超标" color={COLOR_ERROR} />
            <LegendDot label="异常状态" color={COLOR_WARN} />
            <LegendDot label="错误状态" color={COLOR_ERROR} />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 14, right: 30, left: 10, bottom: 70 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  handleBarClick(e.activePayload[0].payload);
                }
              }}
              onMouseMove={(e: any) => {
                if (e?.activeTooltipIndex !== undefined) {
                  setHoverIdx(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="deviceId"
                type="category"
                tick={{ fontSize: 10.5, fill: '#475569' }}
                angle={-40}
                textAnchor="end"
                height={70}
                interval={0}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: '#64748b' }}
                domain={[0, yMax]}
                label={{
                  value: 'N·m',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10.5, fill: '#94a3b8' },
                }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <ZAxis type="number" range={[30, 30]} />
              <Tooltip
                content={CustomTooltip}
                cursor={{ fill: hoverIdx !== null ? '#f8fafc' : 'transparent' }}
                isAnimationActive={false}
              />

              <Bar
                dataKey="nameplateNmDisplay"
                name="铭牌换算值"
                barSize={18}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                onClick={(p: any) => handleBarClick(p)}
              >
                {chartData.map((entry, i) => {
                  const isSel = entry.id === selectedRecordId;
                  const isHover = hoverIdx === i;
                  const dim = selectedRecordId !== null && !isSel;
                  let fill = COLOR_NAMEPLATE_BG;
                  if (entry.status === 'warning') fill = COLOR_WARN;
                  if (entry.status === 'error') fill = COLOR_ERROR;
                  if (entry.status === 'unknown') fill = COLOR_UNKNOWN;
                  if (!entry.unitDetected) fill = '#a855f7';
                  return (
                    <Cell
                      key={`np-${i}`}
                      fill={fill}
                      opacity={dim ? 0.3 : 1}
                      stroke={
                        isSel
                          ? entry.status === 'error'
                            ? '#7f1d1d'
                            : entry.status === 'warning'
                            ? '#9a3412'
                            : '#1e3a8a'
                          : isHover
                          ? '#1e293b'
                          : 'rgba(15,23,42,0.35)'
                      }
                      strokeWidth={isSel ? 2.5 : isHover ? 1.25 : 0.75}
                    />
                  );
                })}
              </Bar>

              <Bar
                dataKey="calculatedNmDisplay"
                name="公式复算值"
                barSize={18}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
                onClick={(p: any) => handleBarClick(p)}
              >
                {chartData.map((entry, i) => {
                  const isSel = entry.id === selectedRecordId;
                  const isHover = hoverIdx === i;
                  const dim = selectedRecordId !== null && !isSel;
                  if (!entry.hasCalc) {
                    return (
                      <Cell
                        key={`calc-${i}`}
                        fill="transparent"
                        stroke={dim ? 'rgba(148,163,184,0.25)' : COLOR_CALC_MISSING}
                        strokeWidth={1}
                        strokeDasharray="2 2"
                      />
                    );
                  }
                  return (
                    <Cell
                      key={`calc-${i}`}
                      fill={COLOR_CALCULATED_BG}
                      opacity={dim ? 0.3 : 0.92}
                      stroke={isSel ? '#134e4a' : isHover ? '#115e59' : 'rgba(15,23,42,0.35)'}
                      strokeWidth={isSel ? 2.5 : isHover ? 1.25 : 0.75}
                    />
                  );
                })}
              </Bar>

              <Scatter
                data={thresholdData as any[]}
                isAnimationActive={false}
                shape={ThresholdTick as any}
                onClick={(p: any) => {
                  if (p && p.payload && p.payload.id) {
                    selectRecord(p.payload.id);
                  }
                }}
              />

              <Scatter
                data={truncatedScatterData as any[]}
                isAnimationActive={false}
                shape={TruncationMark as any}
                onClick={(p: any) => {
                  if (p && p.payload && p.payload.id) {
                    selectRecord(p.payload.id);
                  }
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-3 flex-shrink-0 min-h-[120px]">
        {selectedFull ? (
          <DetailPanel result={selectedFull} />
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 leading-relaxed">
              <div className="font-medium mb-0.5">核心验收路径：三步走通</div>
              <div>① 点击任一柱体 → 下方出现同口径明细（铭牌值、复算值、阈值来源、异常）</div>
              <div>② 对比「铭牌换算值」蓝柱 与 「公式复算值」青柱 → 若相差明显则存在复算偏差</div>
              <div>③ 观察绿色/红色短横线 → 若柱体超过红色线即为超阈值，可点击右上角"查看详情溯源"</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               辅助组件                                    */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: number | string;
  tone: 'slate' | 'emerald' | 'orange' | 'red' | 'teal';
  icon: any;
  highlight?: boolean;
}) {
  const toneMap: Record<string, string> = {
    slate: 'text-slate-700 border-slate-200 bg-white',
    emerald: 'text-emerald-700 border-emerald-200 bg-emerald-50/50',
    orange: 'text-orange-700 border-orange-200 bg-orange-50/50',
    red: 'text-red-700 border-red-200 bg-red-50/50',
    teal: 'text-teal-700 border-teal-200 bg-teal-50/50',
  };
  const valColor: Record<string, string> = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-700',
    orange: 'text-orange-600',
    red: 'text-red-600',
    teal: 'text-teal-700',
  };
  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${toneMap[tone]} ${
        highlight ? 'ring-2 ring-red-200 ring-offset-1' : ''
      } transition-all`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-slate-500">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${tone === 'slate' ? 'text-slate-400' : ''}`} />
      </div>
      <div className={`text-lg font-bold leading-none ${valColor[tone]}`}>{value}</div>
    </div>
  );
}

function LegendSwatch({
  label,
  color,
  border,
  dashed = false,
}: {
  label: string;
  color: string;
  border: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 inline-block rounded-sm"
        style={{
          background: dashed ? 'transparent' : color,
          border: `1px solid ${border}`,
          borderStyle: dashed ? 'dashed' : 'solid',
        }}
      />
      <span>{label}</span>
    </div>
  );
}
function LegendLine({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block relative w-4 h-2">
        <span
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5"
          style={{ background: color }}
        />
        <span
          className="absolute left-1/2 -translate-x-1/2 top-0 h-2 w-0.5"
          style={{ background: color }}
        />
      </span>
      <span>{label}</span>
    </div>
  );
}
function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 inline-block rounded-full"
        style={{ background: color }}
      />
      <span>{label}</span>
    </div>
  );
}

/* 阈值十字标记：在每个设备 X 位置 + 阈值 Y 位置画一个小 T 型 */
function ThresholdTick(props: any) {
  const { cx, cy, payload } = props;
  if (!payload) return <></>;
  const color = payload.passed ? '#10b981' : '#dc2626';
  const W = 26;
  const H = 6;
  return (
    <g style={{ cursor: 'pointer' }}>
      <line
        x1={cx - W / 2}
        y1={cy}
        x2={cx + W / 2}
        y2={cy}
        stroke={color}
        strokeWidth={2.25}
        strokeLinecap="round"
      />
      <line
        x1={cx}
        y1={cy - H}
        x2={cx}
        y2={cy + H}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.8}
      />
      {!payload.passed && (
        <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.5} />
      )}
      {payload.truncated && (
        <text
          x={cx + W / 2 + 4}
          y={cy + 3}
          fontSize={9}
          fill="#f97316"
          fontWeight={600}
        >
          ⚠真实值{formatTorque(payload.yRaw, 0)}
        </text>
      )}
    </g>
  );
}

/* 极端值截断标识：柱顶画锯齿波浪线 + 文字提示 */
function TruncationMark(props: any) {
  const { cx, cy, payload } = props;
  if (!payload) return <></>;
  const W = 44;
  const color = '#ea580c';
  return (
    <g style={{ cursor: 'pointer' }}>
      <polyline
        points={`${cx - W / 2},${cy} ${cx - W / 2 + 4},${cy - 3} ${cx - W / 2 + 8},${cy} ${cx - W / 2 + 12},${cy - 3} ${cx - W / 2 + 16},${cy} ${cx - W / 2 + 20},${cy - 3} ${cx - W / 2 + 24},${cy} ${cx - W / 2 + 28},${cy - 3} ${cx - W / 2 + 32},${cy} ${cx - W / 2 + 36},${cy - 3} ${cx - W / 2 + 40},${cy} ${cx - W / 2 + 44},${cy - 3}`}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="miter"
      />
      <text
        x={cx}
        y={cy - 6}
        fontSize={9.5}
        fill={color}
        fontWeight={700}
        textAnchor="middle"
      >
        ≈{formatTorque(Math.max(payload.nameplateRaw || 0, payload.calculatedRaw || 0), 0)}
      </text>
    </g>
  );
}

/* Tooltip：严格同口径，包含两条值+阈值+偏差+来源 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const base = payload[0]?.payload;
  if (!base) return null;
  const th = payload.find((p: any) => p.dataKey === 'threshold') || null;
  const np = payload.find((p: any) => p.dataKey === 'nameplateNm');
  const cc = payload.find((p: any) => p.dataKey === 'calculatedNm');
  const nameplateVal = np?.value ?? base.nameplateNm;
  const calcVal = base.hasCalc ? (cc?.value ?? base.calculatedNm) : null;
  const deviation =
    base.hasCalc && nameplateVal > 0
      ? Math.abs(calcVal - nameplateVal) / nameplateVal
      : null;

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg p-3 text-[12px] min-w-[225px]">
      <div className="font-semibold text-slate-800 mb-1.5">
        {base.deviceId}
        {base.deviceName && (
          <span className="text-slate-500 font-normal text-[11px] ml-1.5">{base.deviceName}</span>
        )}
        {base.isTruncated && (
          <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-medium align-middle">
          图示已压缩，真实值如下
        </span>
        )}
      </div>
      <div className="space-y-1.5">
        <TooltipRow
          label="铭牌换算值"
          value={formatTorque(nameplateVal, 3)}
          dot={
            base.status === 'error'
              ? COLOR_ERROR
              : base.status === 'warning'
              ? COLOR_WARN
              : base.unitDetected
              ? COLOR_NAMEPLATE_BG
              : '#a855f7'
          }
          mono
          strong
        />
        <TooltipRow
          label={base.hasCalc ? '公式复算值' : '公式复算值'}
          value={base.hasCalc ? formatTorque(calcVal, 3) : '功率/转速缺失'}
          dot={base.hasCalc ? COLOR_CALCULATED_BG : COLOR_CALC_MISSING}
          mono
          muted={!base.hasCalc}
        />
        {deviation !== null && (
          <div className="flex justify-between text-[11px] pl-4">
            <span className="text-slate-400">相对偏差</span>
            <span
              className={`font-mono ${
                deviation > 0.15 ? 'text-red-600 font-medium' : 'text-slate-500'
              }`}
            >
              {(deviation * 100).toFixed(1)}%
              {deviation > 0.15 && ' ⚠'}
            </span>
          </div>
        )}
        {base.thresholdNm !== null && (
          <>
            <div className="my-1 border-t border-slate-100" />
            <TooltipRow
              label="安全阈值"
              value={formatTorque(base.thresholdNm, 3)}
              iconColor={base.thresholdPassed ? '#10b981' : '#dc2626'}
              icon={<Target className="w-3 h-3" />}
              mono
            />
            {base.thresholdRatio !== null && (
              <div className="flex justify-between text-[11px] pl-4">
                <span className="text-slate-400">铭牌占阈值</span>
                <span
                  className={`font-mono ${
                    base.thresholdRatio > 1 ? 'text-red-600 font-medium' : 'text-slate-500'
                  }`}
                >
                  {(base.thresholdRatio * 100).toFixed(1)}%
                  {base.thresholdRatio > 1 && ' 超标'}
                </span>
              </div>
            )}
          </>
        )}
        <div className="mt-1 border-t border-slate-100 pt-1 flex justify-between">
          <span className="text-slate-400">状态</span>
          <span className={statusColor(base.status)}>
            {STATUS_LABELS[base.status as keyof typeof STATUS_LABELS]}
          </span>
        </div>
      </div>
      <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 leading-snug">
        <div>
          <span className="text-slate-500">铭牌原始：</span>
          {base.originalValue ?? '-'} {base.originalUnit || '-'}
          {base.unitFactor !== 1 && base.unitDetected && (
            <span className="text-slate-500"> ×{base.unitFactor}系数</span>
          )}
          {!base.unitDetected && <span className="text-purple-600">（单位未识别）</span>}
        </div>
        <div className="truncate">
          {base.sourceFile} · 第{base.sourceRow}行
        </div>
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  dot,
  icon,
  iconColor,
  mono,
  strong,
  muted,
}: {
  label: string;
  value: string;
  dot?: string;
  icon?: any;
  iconColor?: string;
  mono?: boolean;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-slate-500 flex items-center gap-1.5">
        {dot && (
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ background: dot }}
          />
        )}
        {icon && (
          <span style={{ color: iconColor }} className="inline-flex">
            {icon}
          </span>
        )}
        {label}
      </span>
      <span
        className={`${mono ? 'font-mono' : ''} ${strong ? 'font-semibold text-slate-800' : ''} ${
          muted ? 'text-slate-400 italic' : 'text-slate-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function statusColor(s: string) {
  switch (s) {
    case 'normal':
      return 'text-emerald-600 font-medium';
    case 'warning':
      return 'text-orange-600 font-medium';
    case 'error':
      return 'text-red-600 font-medium';
    default:
      return 'text-slate-500';
  }
}

function selectedResultById(list: TorqueCalcResult[], id: string | null) {
  if (!id) return null;
  return list.find(r => r.recordId === id) ?? null;
}

/* 底部详情面板（同口径核对区） */
function DetailPanel({ result }: { result: TorqueCalcResult }) {
  const calcDeviation =
    result.calculatedTorque !== null && result.normalizedValue > 0
      ? (Math.abs(result.calculatedTorque - result.normalizedValue) /
          result.normalizedValue) *
        100
      : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 text-xs flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{result.deviceId}</span>
            {result.deviceName && (
              <span className="text-slate-500 text-[11.5px]">{result.deviceName}</span>
            )}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10.5px] font-medium ${
                result.status === 'normal'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : result.status === 'warning'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : result.status === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {STATUS_LABELS[result.status]}
            </span>
          </div>
          <div className="text-slate-400 text-[11px]">
            来源：<span className="text-slate-500">{result.sourceFile}</span>
            <span className="mx-1">·</span>
            第 <span className="font-mono text-slate-600">{result.sourceRow}</span> 行
            <span className="mx-1">·</span>
            批次：<span className="font-mono text-slate-600">{result.sourceBatch.slice(0, 10)}…</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <MetricBox
            label="铭牌换算"
            value={formatTorque(result.normalizedValue, 3)}
            tone="blue"
          />
          <MetricBox
            label={result.calculatedTorque !== null ? '公式复算' : '无法复算'}
            value={
              result.calculatedTorque !== null
                ? formatTorque(result.calculatedTorque, 3)
                : '缺转速/功率'
            }
            tone={result.calculatedTorque !== null ? 'teal' : 'slate'}
          />
          {result.thresholdCheck && (
            <MetricBox
              label="安全阈值"
              value={formatTorque(result.thresholdCheck.threshold, 3)}
              tone={result.thresholdCheck.passed ? 'emerald' : 'red'}
              ratio={`${(result.thresholdCheck.ratio * 100).toFixed(1)}%`}
            />
          )}
          {calcDeviation !== null && (
            <MetricBox
              label="相对偏差"
              value={`${calcDeviation.toFixed(1)}%`}
              tone={calcDeviation > 15 ? 'red' : calcDeviation > 8 ? 'orange' : 'emerald'}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 pt-2.5 border-t border-slate-100">
        <div className="flex justify-between">
          <span className="text-slate-400">铭牌原始值</span>
          <span className="font-mono text-slate-700">
            {result.originalValue ?? '(缺)'} {result.originalUnit || '-'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">换算系数</span>
          <span className="font-mono text-slate-700">
            ×{result.unitConversion.factor}
            {!result.unitConversion.detected && (
              <span className="text-purple-600 ml-1">（单位未识别）</span>
            )}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">复算方法</span>
          <span className="text-slate-700">{result.calcMethod}</span>
        </div>
        {result.thresholdCheck && (
          <div className="flex justify-between col-span-2">
            <span className="text-slate-400">阈值溯源（铭牌原文）</span>
            <span className="text-slate-700 text-right max-w-[65%]">
              {result.thresholdCheck.thresholdSource}
            </span>
          </div>
        )}
      </div>

      {result.anomalies.length > 0 && (
        <div className="pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-1.5 text-[11.5px] font-medium text-orange-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            异常清单（{result.anomalies.length}）· 每条均已指向原始行
          </div>
          <div className="space-y-1">
            {result.anomalies.map((a: AnomalyItem, i: number) => (
              <AnomalyRow key={i} anomaly={a} />
            ))}
          </div>
        </div>
      )}

      <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
        <details>
          <summary className="cursor-pointer hover:text-slate-700 select-none">
            查看原始铭牌行快照（不可编辑的原始证据）
          </summary>
          <div className="mt-1.5 bg-slate-900 text-slate-200 rounded p-2.5 font-mono text-[10.5px] break-all leading-relaxed">
            {result.sourceContent || '(空)'}
          </div>
        </details>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone,
  ratio,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'teal' | 'emerald' | 'red' | 'orange' | 'slate';
  ratio?: string;
}) {
  const toneMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  };
  return (
    <div className={`rounded border px-2.5 py-1.5 min-w-[110px] ${toneMap[tone]}`}>
      <div className="text-[10px] opacity-75">{label}</div>
      <div className="font-mono text-sm font-semibold leading-tight">{value}</div>
      {ratio && <div className="text-[10px] opacity-80 mt-0.5">占比 {ratio}</div>}
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: AnomalyItem }) {
  const typeLabels: Record<string, string> = {
    unit_unclear: '单位未识别',
    order_of_magnitude: '数量级异常',
    over_threshold: '超安全阈值',
    under_threshold: '低于阈值',
    missing_data: '字段缺失',
    batch_conflict: '多批次冲突',
    calc_deviation: '复算偏差超线',
  };
  const sevColor: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    low: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  const sevText: Record<string, string> = { high: '严重', medium: '中', low: '提示' };
  return (
    <div className="flex items-start gap-2 text-[11.5px] leading-snug">
      <span
        className={`px-1.5 py-0.5 rounded border text-[10px] font-medium flex-shrink-0 mt-0.5 ${
          sevColor[anomaly.severity]
        }`}
      >
        {sevText[anomaly.severity]}·{typeLabels[anomaly.type] || anomaly.type}
      </span>
      <div className="flex-1">
        <div className="text-slate-700">{anomaly.message}</div>
        {anomaly.sourceRef && (
          <div className="text-slate-400 mt-0.5 font-mono text-[10.5px]">
            ↳ {anomaly.sourceRef}
          </div>
        )}
      </div>
    </div>
  );
}
