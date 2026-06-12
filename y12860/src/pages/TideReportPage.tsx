import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { FileDown, FileText, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import { useTrackerStore } from '@/store/useTrackerStore';
import type { TideReport, TidePoint } from '@/types';

type TemplateType = 'pdf' | 'word';

interface ExportOptions {
  template: TemplateType;
  trackSummary: boolean;
  tideChart: boolean;
  riskConclusion: boolean;
  sourceMaterials: boolean;
}

const RENDER_SHAPE = {
  late: (props: any) => {
    const { cx, cy } = props;
    return (
      <g>
        <polygon
          points={`${cx},${cy - 7} ${cx + 7},${cy} ${cx},${cy + 7} ${cx - 7},${cy}`}
          fill="#E84855"
          stroke="#F06A75"
          strokeWidth={1.5}
        />
      </g>
    );
  },
  outOfRange: (props: any) => {
    const { cx, cy } = props;
    return (
      <g>
        <rect
          x={cx - 6}
          y={cy - 6}
          width={12}
          height={12}
          fill="#E84855"
          stroke="#F06A75"
          strokeWidth={1.5}
          rx={1}
        />
      </g>
    );
  },
  actualSolid: (props: any) => {
    const { cx, cy } = props;
    return (
      <circle cx={cx} cy={cy} r={5} fill="#3FBDBB" stroke="#5FD4D2" strokeWidth={1.5} />
    );
  },
  forecastHollow: (props: any) => {
    const { cx, cy } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="none"
        stroke="#F7CB6A"
        strokeWidth={2}
      />
    );
  },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as TidePoint | undefined;
  if (!data) return null;

  const tags: string[] = [];
  if (data.isLate) tags.push('晚到');
  if (data.isOutOfRange) tags.push('越界');

  return (
    <div className="nautical-card px-4 py-3 text-sm">
      <div className="text-seafoam-300 font-medium mb-1">{data.hourLabel}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-ocean-300">潮高：</span>
        <span className="font-mono text-ocean-100">{data.height.toFixed(2)} m</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-ocean-300">类型：</span>
        <span className={data.isForecast ? 'text-sand-400' : 'text-seafoam-400'}>
          {data.isForecast ? '预报' : '实测'}
        </span>
      </div>
      {tags.length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-ocean-300">质量：</span>
          <div className="flex gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="tag bg-coral-500/20 text-coral-300 border border-coral-500/30"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ThumbnailTide = ({ report }: { report: TideReport | undefined }) => {
  if (!report) {
    return (
      <div className="w-full h-24 bg-ocean-800/40 rounded-lg border border-ocean-600/30 flex items-center justify-center text-ocean-400 text-xs">
        暂无预览
      </div>
    );
  }

  const heights = report.tideData.map((d) => d.height);
  const minH = Math.min(...heights) - 0.5;
  const maxH = Math.max(...heights) + 0.5;
  const range = maxH - minH;
  const w = 280;
  const h = 96;
  const padL = 10;
  const padR = 10;
  const padT = 10;
  const padB = 10;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const points = report.tideData.map((d, i) => {
    const x = padL + (i / (report.tideData.length - 1)) * innerW;
    const y = padT + innerH - ((d.height - minH) / range) * innerH;
    return `${x},${y}`;
  });

  const datumY = padT + innerH - ((report.datumHeight - minH) / range) * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
      <rect x={0} y={0} width={w} height={h} fill="rgba(14,47,86,0.4)" rx={8} />
      <line
        x1={padL}
        y1={datumY}
        x2={w - padR}
        y2={datumY}
        stroke="#F7CB6A"
        strokeWidth={1}
        strokeDasharray="2,2"
        opacity={0.7}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#3FBDBB"
        strokeWidth={1.5}
        opacity={0.9}
      />
      <text x={w - padR} y={datumY - 3} textAnchor="end" fontSize="8" fill="#F7CB6A" opacity={0.8}>
        基准面 {report.datumHeight}m
      </text>
    </svg>
  );
};

export default function TideReportPage() {
  const { buoys, tideReports, getTideByBuoy } = useTrackerStore();

  const [selectedBuoyId, setSelectedBuoyId] = useState(buoys[0]?.id ?? '');
  const [portName, setPortName] = useState('舟山嵊山港');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(2, 'day').format('YYYY-MM-DD'));
  const [activeReportId, setActiveReportId] = useState<string | null>(tideReports[0]?.id ?? null);

  const [exportOpts, setExportOpts] = useState<ExportOptions>({
    template: 'pdf',
    trackSummary: true,
    tideChart: true,
    riskConclusion: true,
    sourceMaterials: false,
  });

  const activeReport: TideReport | undefined = useMemo(() => {
    if (activeReportId) {
      return tideReports.find((r) => r.id === activeReportId);
    }
    return tideReports[0];
  }, [activeReportId, tideReports]);

  const handleCompute = () => {
    const report = getTideByBuoy(selectedBuoyId);
    if (report) {
      setActiveReportId(report.id);
      setPortName(report.portName);
      setStartDate(dayjs(report.startDate).format('YYYY-MM-DD'));
      setEndDate(dayjs(report.endDate).format('YYYY-MM-DD'));
    }
  };

  const handleExport = () => {
    const report = activeReport;
    if (!report) return;
    const metadata = {
      reportId: report.id,
      portName: report.portName,
      buoyId: report.buoyId,
      period: {
        start: dayjs(report.startDate).format('YYYY-MM-DD'),
        end: dayjs(report.endDate).format('YYYY-MM-DD'),
      },
      template: exportOpts.template === 'pdf' ? 'PDF标准报告' : 'Word摘要报告',
      includes: {
        处理轨迹摘要: exportOpts.trackSummary,
        潮汐曲线图: exportOpts.tideChart,
        风险结论: exportOpts.riskConclusion,
        来源材料清单: exportOpts.sourceMaterials,
      },
      forecastQuality: report.forecastQuality,
      datumHeight: report.datumHeight,
      generatedAt: dayjs(report.generatedAt).format('YYYY-MM-DD HH:mm:ss'),
      exportAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `潮汐报告_${report.portName}_${dayjs().format('YYYYMMDDHHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    if (!activeReport) return [];
    return activeReport.tideData;
  }, [activeReport]);

  const latePoints = chartData.filter((d) => d.isLate);
  const outOfRangePoints = chartData.filter((d) => d.isOutOfRange);
  const actualPoints = chartData.filter((d) => !d.isForecast && !d.isLate && !d.isOutOfRange);
  const forecastPoints = chartData.filter((d) => d.isForecast && !d.isLate && !d.isOutOfRange);

  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const ticks: string[] = [];
    const step = Math.max(1, Math.floor(chartData.length / 8));
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push(chartData[i].hourLabel);
    }
    return ticks;
  }, [chartData]);

  const quality = activeReport?.forecastQuality ?? {
    onTimeRate: 0,
    outOfRangeCount: 0,
    totalPoints: 0,
  };

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-seafoam-300 border-l-4 border-seafoam-500 pl-3">
          潮汐计算与报告
        </h1>
      </div>

      <section className="nautical-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-seafoam-400" />
          <h2 className="section-title !text-lg !border-l-0 !pl-0">参数配置与报告选择</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs text-ocean-300">浮标选择</label>
            <select
              className="input-nautical"
              value={selectedBuoyId}
              onChange={(e) => setSelectedBuoyId(e.target.value)}
            >
              {buoys.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}（{b.code}）
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-ocean-300">港口名称</label>
            <input
              type="text"
              className="input-nautical"
              value={portName}
              onChange={(e) => setPortName(e.target.value)}
              placeholder="请输入港口名称"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-ocean-300">起始日期</label>
            <input
              type="date"
              className="input-nautical"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-ocean-300">结束日期</label>
            <input
              type="date"
              className="input-nautical"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="nautical-btn-primary w-full" onClick={handleCompute}>
              <FileText className="w-4 h-4 mr-2" />
              计算潮汐曲线
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm text-ocean-300 mb-3">已有报告列表</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tideReports.map((r) => {
              const isActive = activeReportId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveReportId(r.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-seafoam-500/10 border-seafoam-400/60 shadow-glow'
                      : 'bg-ocean-800/40 border-ocean-600/40 hover:border-ocean-500/60 hover:bg-ocean-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-seafoam-300">{r.portName}</span>
                    {isActive && (
                      <span className="tag tag-available">当前</span>
                    )}
                  </div>
                  <div className="text-xs text-ocean-300 mb-2">
                    {dayjs(r.startDate).format('MM-DD')} ~ {dayjs(r.endDate).format('MM-DD')}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-ocean-400">准时率：</span>
                      <span className="font-mono text-seaweed-400">
                        {(r.forecastQuality.onTimeRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-ocean-400">越界数：</span>
                      <span className="font-mono text-coral-400">
                        {r.forecastQuality.outOfRangeCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-ocean-400 mt-2 pt-2 border-t border-ocean-700/50">
                    生成：{dayjs(r.generatedAt).format('YYYY-MM-DD HH:mm')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="nautical-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title !text-lg !border-l-0 !pl-0">潮汐曲线图</h2>
          {activeReport && (
            <div className="text-xs text-ocean-300">
              {activeReport.portName} · 基准面 {activeReport.datumHeight}m
            </div>
          )}
        </div>

        <div className="h-96">
          {activeReport ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(35, 97, 181, 0.3)"
                />
                <XAxis
                  dataKey="hourLabel"
                  ticks={xTicks}
                  stroke="#65A0E8"
                  fontSize={11}
                  tick={{ fill: '#94A3B8' }}
                  axisLine={{ stroke: 'rgba(35, 97, 181, 0.5)' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  stroke="#65A0E8"
                  fontSize={11}
                  tick={{ fill: '#94A3B8' }}
                  axisLine={{ stroke: 'rgba(35, 97, 181, 0.5)' }}
                  unit="m"
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value: string) => (
                    <span className="text-xs text-ocean-200">{value}</span>
                  )}
                />

                {activeReport.datumHeight !== undefined && (
                  <ReferenceLine
                    y={activeReport.datumHeight}
                    stroke="#F7CB6A"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                  >
                    <Label
                      value={`基准面 ${activeReport.datumHeight}m`}
                      position="right"
                      fill="#F7CB6A"
                      fontSize={11}
                    />
                  </ReferenceLine>
                )}

                {activeReport.highTides.slice(0, 2).map((ht, idx) => (
                  <ReferenceLine
                    key={`high-${idx}`}
                    y={ht.height}
                    stroke="#5FD4D2"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  >
                    <Label
                      value={`高潮 ${ht.height.toFixed(2)}m`}
                      position="right"
                      fill="#5FD4D2"
                      fontSize={10}
                    />
                  </ReferenceLine>
                ))}

                {activeReport.lowTides.slice(0, 2).map((lt, idx) => (
                  <ReferenceLine
                    key={`low-${idx}`}
                    y={lt.height}
                    stroke="#65A0E8"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  >
                    <Label
                      value={`低潮 ${lt.height.toFixed(2)}m`}
                      position="right"
                      fill="#65A0E8"
                      fontSize={10}
                    />
                  </ReferenceLine>
                ))}

                <Line
                  type="monotone"
                  dataKey="height"
                  stroke="#3FBDBB"
                  strokeWidth={2.5}
                  dot={false}
                  name="潮高曲线"
                  isAnimationActive={false}
                />

                <Scatter
                  name="实测点"
                  data={actualPoints}
                  dataKey="height"
                  shape={RENDER_SHAPE.actualSolid}
                  isAnimationActive={false}
                />
                <Scatter
                  name="预报点"
                  data={forecastPoints}
                  dataKey="height"
                  shape={RENDER_SHAPE.forecastHollow}
                  isAnimationActive={false}
                />
                <Scatter
                  name="预报晚到"
                  data={latePoints}
                  dataKey="height"
                  shape={RENDER_SHAPE.late}
                  isAnimationActive={false}
                />
                <Scatter
                  name="越界"
                  data={outOfRangePoints}
                  dataKey="height"
                  shape={RENDER_SHAPE.outOfRange}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-ocean-400">
              请选择报告或计算潮汐曲线
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"></div>
        <section className="nautical-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileDown className="w-4 h-4 text-seafoam-400" />
            <h2 className="section-title !text-lg !border-l-0 !pl-0">报告导出中心</h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="text-xs text-ocean-300">模板选择</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setExportOpts((o) => ({ ...o, template: 'pdf' }))
                  }
                  className={`px-3 py-2 rounded-md text-sm border transition-all ${
                    exportOpts.template === 'pdf'
                      ? 'bg-seafoam-500/15 border-seafoam-400/60 text-seafoam-300'
                      : 'bg-ocean-800/40 border-ocean-600/40 text-ocean-300 hover:border-ocean-500/60'
                  }`}
                >
                  PDF标准报告
                </button>
                <button
                  onClick={() =>
                    setExportOpts((o) => ({ ...o, template: 'word' }))
                  }
                  className={`px-3 py-2 rounded-md text-sm border transition-all ${
                    exportOpts.template === 'word'
                      ? 'bg-seafoam-500/15 border-seafoam-400/60 text-seafoam-300'
                      : 'bg-ocean-800/40 border-ocean-600/40 text-ocean-300 hover:border-ocean-500/60'
                  }`}
                >
                  Word摘要报告
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-ocean-300">包含项</div>
              <div className="space-y-2">
                {[
                  { key: 'trackSummary', label: '处理轨迹摘要' },
                  { key: 'tideChart', label: '潮汐曲线图' },
                  { key: 'riskConclusion', label: '风险结论' },
                  { key: 'sourceMaterials', label: '来源材料清单' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 cursor-pointer text-sm text-ocean-200 hover:text-seafoam-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={exportOpts[item.key as keyof ExportOptions] as boolean}
                      onChange={(e) =>
                        setExportOpts((o) => ({
                          ...o,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-ocean-500 bg-ocean-800 text-seafoam-500 focus:ring-seafoam-500/50 focus:ring-offset-0"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-ocean-300">预览缩略图</div>
              <ThumbnailTide report={activeReport} />
            </div>

            <button
              className="nautical-btn-primary w-full"
              onClick={handleExport}
              disabled={!activeReport}
            >
              <FileDown className="w-4 h-4 mr-2" />
              导出报告
            </button>
          </div>
        </section>
      </div>

      <section className="nautical-card p-5">
        <h2 className="section-title !text-lg !border-l-0 !pl-0 mb-4">
          预报质量统计
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-ocean-800/50 border border-ocean-600/40 rounded-xl p-5">
            <div className="text-xs text-ocean-400 mb-2">准时率</div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl text-seaweed-400 font-mono">
                {(quality.onTimeRate * 100).toFixed(1)}
              </span>
              <span className="text-ocean-300">%</span>
            </div>
            <div className="mt-3 h-2 bg-ocean-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-seaweed-500 to-seaweed-400 wave-progress"
                style={{ width: `${Math.max(0, Math.min(100, quality.onTimeRate * 100))}%` }}
              />
            </div>
          </div>

          <div className="bg-ocean-800/50 border border-ocean-600/40 rounded-xl p-5">
            <div className="text-xs text-ocean-400 mb-2">越界数</div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl text-coral-400 font-mono">
                {quality.outOfRangeCount}
              </span>
              <span className="text-ocean-300 text-sm">个</span>
            </div>
            <div className="mt-3 text-xs text-ocean-400">
              共 {quality.totalPoints} 个数据点，越界占比
              <span className="text-coral-400 font-mono ml-1">
                {quality.totalPoints
                  ? ((quality.outOfRangeCount / quality.totalPoints) * 100).toFixed(2)
                  : '0.00'}
                %
              </span>
            </div>
          </div>

          <div className="bg-ocean-800/50 border border-ocean-600/40 rounded-xl p-5">
            <div className="text-xs text-ocean-400 mb-2">总点数</div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-3xl text-seafoam-400 font-mono">
                {quality.totalPoints}
              </span>
              <span className="text-ocean-300 text-sm">个</span>
            </div>
            <div className="mt-3 text-xs text-ocean-400">
              报告时段：
              {activeReport
                ? `${dayjs(activeReport.startDate).format('MM-DD')} ~ ${dayjs(activeReport.endDate).format('MM-DD')}`
                : '-'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
