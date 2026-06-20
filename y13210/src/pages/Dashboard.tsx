import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { parseDroppedFiles } from '../data/mockData';
import {
  Upload,
  FolderUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  BarChart3,
  Users,
  FileWarning,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useReviewStore } from '../store/reviewStore';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  VOICE_LABELS,
  VOICE_COLORS,
  VoiceType,
} from '../types';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function Dashboard() {
  const navigate = useNavigate();
  const batches = useReviewStore((s) => s.batches);
  const activeBatchId = useReviewStore((s) => s.activeBatchId);
  const setActiveBatch = useReviewStore((s) => s.setActiveBatch);
  const createNewBatch = useReviewStore((s) => s.createNewBatch);
  const selectException = useReviewStore((s) => s.selectException);
  const openDrawer = useReviewStore((s) => s.openDrawer);

  const [parsing, setParsing] = useState(false);
  const [parseInfo, setParseInfo] = useState<string | null>(null);

  const batch = batches.find((b) => b.id === activeBatchId);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setParsing(true);
      setParseInfo(`正在读取 ${files.length} 个文件…`);
      try {
        const parsed = await parseDroppedFiles(files);
        const folderName = parsed.rootFolderName || '新导入批次';
        setParseInfo(
          `识别到 ${parsed.songs.length} 首曲目、` +
            `${parsed.songs.reduce((a, s) => a + s.audioFiles.length, 0)} 个音频、` +
            `${Object.keys(parsed.noteContents).length} 份备注、` +
            `${Object.keys(parsed.screenshotUrls).length} 张截图`
        );
        const nb = createNewBatch(
          `${folderName}·复核`,
          `/音频文件夹/新导入/${folderName}/`,
          parsed
        );
        setActiveBatch(nb.id);
        setTimeout(() => {
          setParsing(false);
          setParseInfo(null);
          navigate('/confirm');
        }, 600);
      } catch (err) {
        console.warn('解析文件夹失败，回退到 mock 模板：', err);
        const folderName = files[0]?.webkitRelativePath?.split('/')[0] ?? '新导入批次';
        const nb = createNewBatch(`${folderName}·复核`, `/音频文件夹/新导入/${folderName}/`, null);
        setActiveBatch(nb.id);
        setTimeout(() => {
          setParsing(false);
          setParseInfo(null);
          navigate('/confirm');
        }, 500);
      }
    },
    [createNewBatch, setActiveBatch, navigate]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    multiple: true,
  });

  const totalSongs = batch?.songs.length ?? 0;
  const totalExceptions = batch?.exceptions.length ?? 0;
  const resolvedExceptions = batch?.exceptions.filter((e) => e.resolved).length ?? 0;
  const pendingConflicts = batch?.aliasConflicts.filter((c) => !c.confirmed).length ?? 0;

  const voiceCompletion = (['soprano', 'alto', 'tenor', 'bass'] as VoiceType[]).map((vt) => {
    const trackExceptions =
      batch?.exceptions.filter(
        (e) => batch.songs.find((s) => s.id === e.songId)?.voiceTracks.find((v) => v.id === e.voiceTrackId)?.voiceType === vt
      ).length ?? 0;
    const totalTracks =
      batch?.songs.reduce((acc, s) => acc + (s.voiceTracks.some((v) => v.voiceType === vt) ? 1 : 0), 0) ?? 0;
    const pct = totalTracks === 0 ? 100 : Math.max(0, 100 - (trackExceptions / totalTracks) * 30);
    return { vt, pct, exceptions: trackExceptions };
  });

  const doughnutData = {
    labels: voiceCompletion.map((v) => VOICE_LABELS[v.vt] + ` ${Math.round(v.pct)}%`),
    datasets: [
      {
        data: voiceCompletion.map((v) => v.pct),
        backgroundColor: voiceCompletion.map((v) => VOICE_COLORS[v.vt]),
        borderWidth: 0,
        cutout: '65%',
      },
    ],
  };

  const songExceptionData = {
    labels: batch?.songs.map((s) => s.name) ?? [],
    datasets: [
      {
        label: '异常数量',
        data:
          batch?.songs.map(
            (s) => batch.exceptions.filter((e) => e.songId === s.id).length
          ) ?? [],
        backgroundColor: (ctx: any) => {
          const val = ctx.raw ?? 0;
          if (val >= 4) return '#C87941';
          if (val >= 2) return '#E0A878';
          return '#6FA98A';
        },
        borderRadius: 8,
        barThickness: 22,
      },
    ],
  };

  const sortedExceptions =
    batch?.exceptions
      .slice()
      .sort((a, b) => {
        const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
        if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return 0;
      })
      .slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      {/* 材料入口卡片 */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div
          {...(parsing ? {} : getRootProps())}
          className={`lg:col-span-3 page-card transition-all duration-300 border-2 border-dashed ${
            parsing
              ? 'border-forest-300 bg-forest-50/40 cursor-default'
              : isDragActive
              ? 'border-copper-400 bg-copper-50/50 scale-[1.01] shadow-cardHover cursor-pointer'
              : 'border-ink-200 hover:border-forest-300 hover:bg-forest-50/30 cursor-pointer'
          }`}
        >
          {!parsing && <input {...getInputProps()} />}
          <div className="flex items-start gap-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                parsing
                  ? 'bg-forest-500 text-white animate-pulseRing'
                  : isDragActive
                  ? 'bg-copper-500 text-white animate-pulseRing'
                  : 'bg-forest-50 text-forest-500'
              }`}
            >
              {parsing ? (
                <span className="text-3xl animate-noteBounce inline-block">🎵</span>
              ) : isDragActive ? (
                <FolderUp size={30} />
              ) : (
                <Upload size={28} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-1">
                🎵 {parsing ? '正在解析音频文件夹…' : '材料入口 · 拖入音频文件夹开始复核'}
              </h3>
              <p className="text-sm text-ink-500 leading-relaxed">
                {parsing
                  ? parseInfo ?? '读取文件中，请稍候…'
                  : '把整个文件夹拖到这里，或点击选择文件夹。系统会解析真实文件名、备注和截图，先检测曲名别名是否重复，确认无误后再开始声部能量/音准/进拍对比计算。'}
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs flex-wrap">
                <span className="tag bg-forest-50 text-forest-700 border-forest-200">
                  支持 .wav / .mp3 / .flac
                </span>
                <span className="tag bg-ink-50 text-ink-600 border-ink-200">
                  子文件夹自动归类为"曲目"
                </span>
                <span className="tag bg-copper-50 text-copper-700 border-copper-200">
                  读取 .txt/.md 备注和 .png/.jpg 截图
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 状态汇总卡片 */}
        {batch && (
          <div className="lg:col-span-2 page-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-ink-900">当前批次状态</h3>
              <span className={`tag ${STATUS_COLORS[batch.status]}`}>
                {STATUS_LABELS[batch.status]}
              </span>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-ink-50/80">
                  <p className="text-2xl font-bold text-forest-600 font-serif">
                    {totalSongs}
                  </p>
                  <p className="text-[11px] text-ink-500 mt-0.5">曲目</p>
                </div>
                <div className="p-3 rounded-xl bg-copper-50/80">
                  <p className="text-2xl font-bold text-copper-600 font-serif">
                    {totalExceptions}
                  </p>
                  <p className="text-[11px] text-ink-500 mt-0.5">异常总数</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-50/80">
                  <p className="text-2xl font-bold text-yellow-600 font-serif">
                    {pendingConflicts}
                  </p>
                  <p className="text-[11px] text-ink-500 mt-0.5">待确认别名</p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-forest-400 to-forest-500 rounded-full transition-all duration-500"
                  style={{
                    width:
                      totalExceptions === 0
                        ? '100%'
                        : `${Math.round((resolvedExceptions / totalExceptions) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-ink-500">
                <span>
                  已处理 {resolvedExceptions} / {totalExceptions} 条异常
                </span>
                <span>
                  {totalExceptions === 0
                    ? '✓ 完美'
                    : `${Math.round((resolvedExceptions / totalExceptions) * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 仪表盘图表 */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 page-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <Users size={18} className="text-forest-500" />
              声部复核完成率
            </h3>
          </div>
          <div className="relative h-64 w-full flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 16 } } }, cutout: '65%' }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {voiceCompletion.map((v) => (
              <div
                key={v.vt}
                className="flex items-center justify-between p-2 rounded-lg bg-ink-50/60"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: VOICE_COLORS[v.vt] }}
                  />
                  {VOICE_LABELS[v.vt]}
                </span>
                <span className="text-ink-700 font-medium">
                  {v.exceptions > 0 ? `${v.exceptions}处需留意` : '✓ 正常'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 page-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <BarChart3 size={18} className="text-copper-500" />
              各曲目异常分布
            </h3>
            <button
              onClick={() => navigate('/review')}
              className="text-xs btn-ghost !py-1 !px-3"
            >
              进入复核详情 <ChevronRight size={14} />
            </button>
          </div>
          <div className="h-64">
            <Bar
              data={songExceptionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1F4D3A', padding: 12, cornerRadius: 8, titleFont: { size: 13 }, bodyFont: { size: 12 } } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#6B6356' } },
                  y: { beginAtZero: true, grid: { color: 'rgba(31,77,58,0.06)' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#6B6356' } },
                },
              }}
            />
          </div>
        </div>
      </section>

      {/* 最近批次 + 异常清单 */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 page-card">
          <h3 className="section-title">
            <Clock size={18} className="text-forest-500" />
            最近复核批次
          </h3>
          <div className="space-y-2">
            {batches.map((b) => {
              const isActive = b.id === activeBatchId;
              const pending = b.aliasConflicts.filter((c) => !c.confirmed).length;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBatch(b.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-start gap-3 ${
                    isActive
                      ? 'bg-forest-50 border-2 border-forest-300 shadow-sm'
                      : 'bg-white/50 border border-ink-100 hover:bg-ink-50/50 hover:border-ink-200'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-base ${
                      isActive
                        ? 'bg-forest-500 text-white'
                        : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {b.status === 'completed' ? (
                      <CheckCircle2 size={18} />
                    ) : pending > 0 ? (
                      <AlertCircle size={18} />
                    ) : (
                      <FileWarning size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-ink-900 truncate">{b.name}</p>
                      <span className={`tag ${STATUS_COLORS[b.status]} ml-2 shrink-0 !text-[10px]`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-500 mt-1 truncate">{b.folderPath}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-500">
                      <span>{b.songs.length} 首曲目</span>
                      <span>·</span>
                      <span>{b.exceptions.length} 条异常</span>
                      <span>·</span>
                      <span>{b.createdAt.slice(5, 16)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 page-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <AlertCircle size={18} className="text-copper-500" />
              异常待处理清单（按严重程度）
            </h3>
            <span className="text-xs text-ink-500">
              显示前 {sortedExceptions.length} 条 · 共 {totalExceptions} 条
            </span>
          </div>
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-2">
            {sortedExceptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">🎶</div>
                <p className="text-sm text-ink-500">本批次没有需要处理的异常，一切完美～</p>
              </div>
            ) : (
              sortedExceptions.map((e) => {
                const song = batch?.songs.find((s) => s.id === e.songId);
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      selectException(e.id);
                      openDrawer('exception');
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md group ${
                      e.resolved
                        ? 'bg-forest-50/30 border-forest-100 opacity-75'
                        : 'bg-white/80 border-ink-100 hover:border-copper-200 hover:bg-copper-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`tag ${SEVERITY_COLORS[e.severity]} shrink-0 mt-0.5 !text-[10px]`}>
                        {SEVERITY_LABELS[e.severity]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink-800 leading-relaxed line-clamp-2">
                          <span className="font-serif">{e.humanReason}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-500">
                          <span className="flex items-center gap-1">
                            <span className="text-forest-600 font-medium">《{song?.name}》</span>
                          </span>
                          <span>·</span>
                          <span>第 {Math.floor(e.timePosition / 60)}分{String(Math.floor(e.timePosition % 60)).padStart(2, '0')}秒</span>
                          {e.resolved && (
                            <>
                              <span>·</span>
                              <span className="text-forest-600 font-medium">✓ 已处理</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-ink-300 group-hover:text-copper-500 group-hover:translate-x-1 transition-all mt-1 shrink-0"
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {pendingConflicts > 0 && (
            <button
              onClick={() => navigate('/confirm')}
              className="w-full mt-4 p-4 rounded-xl border-2 border-dashed border-yellow-300 bg-yellow-50/50 hover:bg-yellow-50 transition-all text-left flex items-center gap-3"
            >
              <AlertCircle size={20} className="text-yellow-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  有 {pendingConflicts} 组曲名别名待确认，确认后才继续完整计算
                </p>
                <p className="text-[11px] text-yellow-700/80 mt-0.5">
                  系统不会自作主张合并或区分，一切交给你判断 →
                </p>
              </div>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
