import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  ChevronRight,
  Sliders,
  FolderOpen,
  Info,
  Music,
  FileAudio2,
} from 'lucide-react';
import { useReviewStore } from '../store/reviewStore';
import {
  VOICE_LABELS,
  VOICE_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  VoiceType,
} from '../types';
import { formatSeconds } from '../data/mockData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
  Filler
);

export default function ReviewDetail() {
  const batches = useReviewStore((s) => s.batches);
  const activeBatchId = useReviewStore((s) => s.activeBatchId);
  const activeSongId = useReviewStore((s) => s.activeSongId);
  const setActiveSong = useReviewStore((s) => s.setActiveSong);
  const selectException = useReviewStore((s) => s.selectException);
  const openDrawer = useReviewStore((s) => s.openDrawer);

  const batch = batches.find((b) => b.id === activeBatchId);
  const song = batch?.songs.find((s) => s.id === activeSongId) ?? batch?.songs[0];

  if (!batch || !song) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink-500">请先从左侧选择一个复核批次</p>
      </div>
    );
  }

  const currentSongId = activeSongId ?? song.id;

  const exceptionsForSong = batch.exceptions.filter((e) => e.songId === currentSongId);
  const timeLabels = useMemo(
    () =>
      Array.from({ length: 180 }, (_, i) =>
        formatSeconds(Math.round((i / 180) * song.durationSec))
      ),
    [song.durationSec]
  );

  const chartData = useMemo(() => {
    const datasets = song.voiceTracks.map((vt) => {
      const hasExceptions = exceptionsForSong.filter(
        (e) =>
          batch.songs
            .find((s) => s.id === e.songId)
            ?.voiceTracks.find((v) => v.id === e.voiceTrackId)?.id === vt.id
      );
      const pointBg = vt.energyCurve.map((_, idx) => {
        const sec = Math.round((idx / 180) * song.durationSec);
        const ex = hasExceptions.find(
          (e) => Math.abs(e.timePosition - sec) < 5
        );
        return ex ? '#C87941' : VOICE_COLORS[vt.voiceType];
      });
      const pointRadius = vt.energyCurve.map((_, idx) => {
        const sec = Math.round((idx / 180) * song.durationSec);
        const ex = hasExceptions.find(
          (e) => Math.abs(e.timePosition - sec) < 5
        );
        return ex ? 7 : 0;
      });
      return {
        label: VOICE_LABELS[vt.voiceType],
        data: vt.energyCurve,
        borderColor: VOICE_COLORS[vt.voiceType],
        backgroundColor: VOICE_COLORS[vt.voiceType] + '18',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: pointBg,
        pointBorderColor: pointBg,
        pointRadius,
        pointHoverRadius: 9,
        pointBorderWidth: 2,
      };
    });
    return { labels: timeLabels, datasets };
  }, [song.voiceTracks, timeLabels, exceptionsForSong, batch.songs, song.durationSec]);

  const onChartClick = (_e: any, elements: any[]) => {
    if (!elements || elements.length === 0) return;
    const el = elements[0];
    const sec = Math.round((el.index / 180) * song.durationSec);
    const datasetIndex = el.datasetIndex;
    const vt = song.voiceTracks[datasetIndex];
    const matchEx = exceptionsForSong.find(
      (e) =>
        Math.abs(e.timePosition - sec) < 8 &&
        batch.songs
          .find((s) => s.id === e.songId)
          ?.voiceTracks.find((v) => v.id === e.voiceTrackId)?.id === vt.id
    );
    if (matchEx) {
      selectException(matchEx.id);
      openDrawer('exception');
    }
  };

  return (
    <div className="space-y-6">
      {/* 曲目切换栏 */}
      <div className="page-card !p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-500 mr-2">切换曲目：</span>
          {batch.songs.map((s) => {
            const exCount = batch.exceptions.filter((e) => e.songId === s.id).length;
            const active = s.id === currentSongId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSong(s.id)}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 ${
                  active
                    ? 'bg-forest-500 text-white shadow-md'
                    : 'bg-ink-50 text-ink-700 hover:bg-ink-100'
                }`}
              >
                <span>《{s.name}》</span>
                {exCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-copper-100 text-copper-700'
                    }`}
                  >
                    {exCount}
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => openDrawer('criteria')}
              className="btn-secondary !py-2 !px-4 !text-sm"
            >
              <Sliders size={14} /> 查看计算口径
            </button>
          </div>
        </div>
      </div>

      {/* 声部对比图表 */}
      <div className="page-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">
            <Music size={18} className="text-forest-500" />
            声部能量对比图 ·《{song.name}》
          </h3>
          <div className="flex items-center gap-4 text-[11px] text-ink-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-copper-500 animate-pulseRing" />
              点击异常点查看详情 & 回溯
            </div>
            {(['soprano', 'alto', 'tenor', 'bass'] as VoiceType[]).map((vt) => (
              <div key={vt} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: VOICE_COLORS[vt] }}
                />
                {VOICE_LABELS[vt]}
              </div>
            ))}
          </div>
        </div>

        <div className="staff-bg rounded-xl border border-ink-100 p-4">
          <div className="h-80">
            <Line
              data={chartData}
              onClick={onChartClick}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1F4D3A',
                    padding: 12,
                    cornerRadius: 10,
                    titleFont: { size: 13, family: 'Noto Serif SC' },
                    bodyFont: { size: 12 },
                    callbacks: {
                      title: (items) => `⏱ ${items[0]?.label ?? ''}`,
                      label: (c) =>
                        ` ${c.dataset.label}：${Math.round((c.raw as number) * 100)}% 能量`,
                      afterBody: (items) => {
                        const sec = Math.round(
                          (items[0].dataIndex / 180) * song.durationSec
                        );
                        const ex = exceptionsForSong.find(
                          (e) => Math.abs(e.timePosition - sec) < 5
                        );
                        return ex ? ['', '⚠️ ' + ex.humanReason.slice(0, 26) + '…'] : [];
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(31,77,58,0.04)' },
                    ticks: {
                      maxTicksLimit: 12,
                      font: { size: 10 },
                      color: '#6B6356',
                    },
                  },
                  y: {
                    beginAtZero: true,
                    max: 1,
                    grid: { color: 'rgba(31,77,58,0.06)' },
                    ticks: {
                      font: { size: 10 },
                      color: '#6B6356',
                      callback: (v) => `${Math.round(Number(v) * 100)}%`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* 波形时间轴 */}
        <div className="mt-6">
          <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-3">
            波形时间轴（缩放查看异常区段）
          </p>
          <div className="relative h-28 rounded-xl bg-gradient-to-r from-voice-soprano/10 via-voice-tenor/10 to-voice-bass/10 border border-ink-100 overflow-hidden">
            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 800 112">
              {song.voiceTracks.map((vt, vi) => {
                const color = VOICE_COLORS[vt.voiceType];
                const yBase = 14 + vi * 24;
                return (
                  <g key={vt.id}>
                    <line
                      x1="0"
                      y1={yBase + 10}
                      x2="800"
                      y2={yBase + 10}
                      stroke={color}
                      strokeOpacity="0.1"
                      strokeDasharray="4 4"
                    />
                    {Array.from({ length: 200 }, (_, i) => {
                      const v = vt.energyCurve[Math.floor((i / 200) * vt.energyCurve.length)] ?? 0.5;
                      const h = Math.max(2, v * 20);
                      return (
                        <rect
                          key={i}
                          x={i * 4}
                          y={yBase + 10 - h / 2}
                          width={2.5}
                          height={h}
                          rx={1.2}
                          fill={color}
                          opacity={0.8}
                        />
                      );
                    })}
                    {/* 异常区段高亮 */}
                    {exceptionsForSong
                      .filter(
                        (e) =>
                          batch.songs
                            .find((s) => s.id === e.songId)
                            ?.voiceTracks.find((v) => v.id === e.voiceTrackId)?.voiceType ===
                          vt.voiceType
                      )
                      .map((ex) => {
                        const x = (ex.timePosition / song.durationSec) * 800;
                        return (
                          <g key={ex.id}>
                            <rect
                              x={x - 30}
                              y={yBase - 4}
                              width={60}
                              height={28}
                              fill="#C87941"
                              fillOpacity="0.15"
                              rx={4}
                            />
                            <circle
                              cx={x}
                              cy={yBase + 10}
                              r={7}
                              fill="#C87941"
                              stroke="#fff"
                              strokeWidth="2"
                              className="animate-pulseRing"
                              style={{ transformOrigin: `${x}px ${yBase + 10}px` }}
                            />
                            <text
                              x={x}
                              y={yBase - 8}
                              fontSize="9"
                              fill="#945628"
                              textAnchor="middle"
                              fontWeight="700"
                            >
                              {formatSeconds(ex.timePosition)}
                            </text>
                          </g>
                        );
                      })}
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="text-[10px] text-ink-500 mt-2 flex items-center gap-2">
            <Info size={12} />
            暖铜色圈注的是异常区段，鼠标悬停或点击图表上对应圆点可查看详细原因、回溯源文件
          </p>
        </div>
      </div>

      {/* 异常列表 + 计算口径 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 page-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              🎯 《{song.name}》异常明细
            </h3>
            <span className="text-xs text-ink-500">
              共 {exceptionsForSong.length} 条 ·{' '}
              {exceptionsForSong.filter((e) => e.resolved).length} 条已处理
            </span>
          </div>

          {exceptionsForSong.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">✨</div>
              <p className="font-serif text-ink-700 mb-1">本曲目无异常，完美</p>
              <p className="text-xs text-ink-500">四个声部的表现都在合理范围内</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {exceptionsForSong.map((e) => {
                const vt = song.voiceTracks.find((v) => v.id === e.voiceTrackId);
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      selectException(e.id);
                      openDrawer('exception');
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all group hover:shadow-md ${
                      e.resolved
                        ? 'bg-forest-50/30 border-forest-100 opacity-75'
                        : 'bg-white/80 border-ink-100 hover:border-copper-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`tag ${SEVERITY_COLORS[e.severity]} shrink-0 mt-0.5 !text-[10px]`}>
                        {SEVERITY_LABELS[e.severity]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-serif text-ink-800 leading-relaxed">
                          {e.humanReason}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-500">
                          <span
                            className="px-2 py-0.5 rounded-md text-white text-[10px] font-medium"
                            style={{ backgroundColor: VOICE_COLORS[vt?.voiceType ?? 'tenor'] }}
                          >
                            {vt ? VOICE_LABELS[vt.voiceType] : '-'}
                          </span>
                          <span>⏱ {formatSeconds(e.timePosition)}</span>
                          <span>·</span>
                          <span>{e.metric} {e.deviation}</span>
                          {e.resolved && (
                            <span className="ml-auto text-forest-600 font-medium">✓ 已处理</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <ChevronRight
                          size={14}
                          className="text-ink-300 group-hover:text-copper-500 group-hover:translate-x-0.5 transition-all"
                        />
                        <FileAudio2
                          size={12}
                          className="text-ink-400 group-hover:text-forest-500 transition-all"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 计算口径侧边卡 */}
        <div className="page-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 text-base">
              <Sliders size={16} className="text-forest-500" />
              本次计算口径
            </h3>
            <button
              onClick={() => openDrawer('criteria')}
              className="text-[11px] text-forest-600 hover:underline"
            >
              详情 →
            </button>
          </div>
          <div className="space-y-3 text-xs">
            {[
              { k: '算法版本', v: batch.calcCriteria.algorithmVersion },
              { k: '能量阈值', v: batch.calcCriteria.energyThreshold.toFixed(2) },
              { k: '频率容差', v: batch.calcCriteria.frequencyDeviation + ' 音分' },
              { k: '基准线日期', v: batch.calcCriteria.baselineDate },
            ].map((x) => (
              <div
                key={x.k}
                className="flex justify-between items-center p-2.5 rounded-lg bg-ink-50 border border-ink-100"
              >
                <span className="text-ink-500">{x.k}</span>
                <span className="font-medium text-ink-800">{x.v}</span>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-copper-50 border border-copper-100 mt-4">
              <p className="text-[10px] text-copper-700 font-medium mb-1">
                与上版口径差异
              </p>
              <p className="text-ink-800 leading-relaxed text-[11px]">
                {batch.calcCriteria.diffFromPrevious}
              </p>
            </div>
            <button
              onClick={() => openDrawer('file')}
              className="w-full mt-4 p-3 rounded-xl border border-dashed border-forest-200 bg-forest-50/50 hover:bg-forest-50 transition-all flex items-center justify-center gap-2 text-xs text-forest-700"
            >
              <FolderOpen size={14} />
              查看该曲目版本历史 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
