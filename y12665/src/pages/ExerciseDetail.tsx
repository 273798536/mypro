import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Pencil,
  History,
  Download,
  Loader2,
  Clock,
  Image,
  MapPin,
  Slice,
  FileText,
  Hash,
  ImageIcon,
  StickyNote,
} from 'lucide-react';
import type { Screenshot } from '../../shared/types';
import { useExerciseStore } from '@/store/useExerciseStore';
import { exportApi } from '@/lib/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { TimelinePlayer } from '@/components/timeline/TimelinePlayer';
import { ScreenshotGrid } from '@/components/screenshots/ScreenshotGrid';
import SectionViewer from '@/components/section/SectionViewer';
import { cn } from '@/lib/utils';

type TabKey = 'timeline' | 'section' | 'screenshots' | 'coordinates';

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'timeline', label: '时间回放', icon: Clock },
  { key: 'section', label: '剖切查看', icon: Slice },
  { key: 'screenshots', label: '截图清单', icon: Image },
  { key: 'coordinates', label: '设备坐标', icon: MapPin },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExerciseDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'timeline';

  const { currentExercise: detail, loading: detailLoading, error: detailError, fetchExercise: fetchDetail, updateScreenshotStatus } =
    useExerciseStore();

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) fetchDetail(id);
  }, [id, fetchDetail]);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  const handleExport = async () => {
    if (!detail) return;
    setExporting(true);
    try {
      const job = await exportApi.create({ format: 'json', filter: { exerciseId: detail.id } });
      window.open(exportApi.downloadUrl(job.id), '_blank');
    } finally {
      setExporting(false);
    }
  };

  const handleMarkScreenshot = async (screenshotId: string, status: Screenshot['reviewStatus']) => {
    if (!detail) return;
    await updateScreenshotStatus(detail.id, screenshotId, status);
  };

  if (detailLoading) {
    return (
      <div className="min-h-screen bg-deep-space-900 flex items-center justify-center text-deep-space-300">
        <Loader2 size={20} className="animate-spin mr-2" />
        加载中…
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="min-h-screen bg-deep-space-900">
        <div className="max-w-[1200px] mx-auto p-6">
          <EmptyState
            title="加载失败"
            description={detailError || '练习数据不存在'}
            action={
              <button
                type="button"
                onClick={() => navigate('/exercises')}
                className="px-4 py-2 bg-ice-blue hover:bg-ice-blue-hover text-deep-space-900 text-sm rounded-md font-medium shadow-glow-ice transition-colors"
              >
                返回列表
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-space-900">
      <div className="max-w-[1280px] mx-auto p-6">
        <nav className="flex items-center gap-1.5 text-sm text-deep-space-300 mb-4">
          <button
            type="button"
            onClick={() => navigate('/exercises')}
            className="hover:text-ice-blue transition-colors"
          >
            练习列表
          </button>
          <ChevronRight size={14} className="text-deep-space-500" />
          <span className="text-deep-space-100 truncate max-w-[400px]">{detail.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-2xl font-bold text-deep-space-50 truncate">{detail.name}</h1>
            <StatusBadge status={detail.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/exercises/${detail.id}/revise`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 text-sm rounded-md border border-deep-space-500 transition-colors"
            >
              <Pencil size={14} />
              修正
            </button>
            <button
              type="button"
              onClick={() => navigate(`/exercises/${detail.id}/history`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-deep-space-700 hover:bg-deep-space-600 text-deep-space-100 text-sm rounded-md border border-deep-space-500 transition-colors"
            >
              <History size={14} />
              历史
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-ice-blue hover:bg-ice-blue-hover text-deep-space-900 text-sm rounded-md font-medium shadow-glow-ice transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? '导出中…' : '导出'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 rounded-lg border border-deep-space-600 bg-gradient-to-br from-deep-space-800 to-deep-space-800/60 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-ice-blue uppercase tracking-wider mb-4">
              <StickyNote size={14} />
              溯源信息
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-md bg-deep-space-900/60 border border-deep-space-600 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-deep-space-400 mb-1.5">
                  <Hash size={12} />
                  原始行号
                </div>
                <div className="font-mono text-lg text-ice-blue">
                  {detail.sourceRowNumber ?? '—'}
                </div>
              </div>
              <div className="rounded-md bg-deep-space-900/60 border border-deep-space-600 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-deep-space-400 mb-1.5">
                  <ImageIcon size={12} />
                  图片名
                </div>
                <div className="text-sm text-deep-space-100 truncate" title={detail.sourceImageName ?? ''}>
                  {detail.sourceImageName ?? '—'}
                </div>
              </div>
              <div className="rounded-md bg-deep-space-900/60 border border-deep-space-600 p-3.5 sm:col-span-3 md:col-span-1">
                <div className="flex items-center gap-1.5 text-xs text-deep-space-400 mb-1.5">
                  <StickyNote size={12} />
                  来源备注
                </div>
                <div className="text-sm text-deep-space-100 line-clamp-2" title={detail.sourceRemark ?? ''}>
                  {detail.sourceRemark ?? '—'}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-deep-space-600/50 flex flex-wrap items-center gap-4 text-xs text-deep-space-400">
              <span>
                创建：<span className="text-deep-space-200">{formatDate(detail.createdAt)}</span>
              </span>
              <span>
                更新：<span className="text-deep-space-200">{formatDate(detail.updatedAt)}</span>
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-deep-space-800 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">
              <FileText size={14} />
              最终结论
            </div>
            {detail.conclusion ? (
              <p className="text-sm text-deep-space-100 leading-relaxed whitespace-pre-wrap">
                {detail.conclusion}
              </p>
            ) : (
              <p className="text-sm text-deep-space-400 italic">暂无结论</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-deep-space-600 bg-deep-space-800 overflow-hidden">
          <div className="flex items-center border-b border-deep-space-600 px-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors',
                    active ? 'text-ice-blue' : 'text-deep-space-300 hover:text-deep-space-100',
                  )}
                >
                  <Icon size={15} />
                  {tab.label}
                  {active && (
                    <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-ice-blue rounded-t" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {activeTab === 'timeline' && (
              <TimelinePlayer
                startMs={detail.timelineStartMs}
                endMs={detail.timelineEndMs}
                keyframes={detail.keyframes}
              />
            )}

            {activeTab === 'section' && (
              <SectionViewer
                coordinates={detail.coordinates}
                screenshots={detail.screenshots}
                conclusion={detail.conclusion}
              />
            )}

            {activeTab === 'screenshots' && (
              <ScreenshotGrid
                screenshots={detail.screenshots}
                onMark={handleMarkScreenshot}
              />
            )}

            {activeTab === 'coordinates' && (
              <div>
                {detail.coordinates.length === 0 ? (
                  <EmptyState
                    icon={<MapPin size={56} strokeWidth={1.2} />}
                    title="暂无设备坐标"
                    description="当前练习尚未记录任何设备坐标点"
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 overflow-x-auto rounded-lg border border-deep-space-600">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-deep-space-700/50 text-deep-space-200">
                            <th className="px-4 py-2.5 text-left font-medium">标签</th>
                            <th className="px-4 py-2.5 text-left font-medium">X</th>
                            <th className="px-4 py-2.5 text-left font-medium">Y</th>
                            <th className="px-4 py-2.5 text-left font-medium">Z</th>
                            <th className="px-4 py-2.5 text-left font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.coordinates.map((c) => {
                            const linkedShots = detail.screenshots.filter((s) =>
                              s.linkedCoordinateIds.includes(c.id),
                            );
                            return (
                              <tr
                                key={c.id}
                                className="border-t border-deep-space-700 hover:bg-deep-space-700/30 transition-colors"
                              >
                                <td className="px-4 py-2.5 font-medium text-deep-space-100">{c.label}</td>
                                <td className="px-4 py-2.5 font-mono text-ice-blue">{c.x.toFixed(3)}</td>
                                <td className="px-4 py-2.5 font-mono text-ice-blue">{c.y.toFixed(3)}</td>
                                <td className="px-4 py-2.5 font-mono text-ice-blue">{c.z.toFixed(3)}</td>
                                <td className="px-4 py-2.5">
                                  {linkedShots.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('screenshots');
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-ice-blue/15 text-ice-blue hover:bg-ice-blue/25 transition-colors"
                                    >
                                      <Image size={12} />
                                      跳转到关联截图 ({linkedShots.length})
                                    </button>
                                  ) : (
                                    <span className="text-xs text-deep-space-500">无关联截图</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="rounded-lg border border-deep-space-600 bg-deep-space-800 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ice-blue uppercase tracking-wider mb-3">
                        <StickyNote size={14} />
                        溯源说明
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div className="rounded bg-deep-space-900/60 border border-deep-space-600 p-2.5">
                          <div className="text-deep-space-400 mb-1">原始行号</div>
                          <div className="font-mono text-ice-blue">{detail.sourceRowNumber ?? '—'}</div>
                        </div>
                        <div className="rounded bg-deep-space-900/60 border border-deep-space-600 p-2.5">
                          <div className="text-deep-space-400 mb-1">来源图片</div>
                          <div className="text-deep-space-100 truncate" title={detail.sourceImageName ?? ''}>
                            {detail.sourceImageName ?? '—'}
                          </div>
                        </div>
                        <div className="rounded bg-deep-space-900/60 border border-deep-space-600 p-2.5">
                          <div className="text-deep-space-400 mb-1">备注</div>
                          <div className="text-deep-space-100 whitespace-pre-wrap leading-relaxed">
                            {detail.sourceRemark ?? '—'}
                          </div>
                        </div>
                        <p className="text-deep-space-400 pt-1 leading-relaxed">
                          点击"跳转到关联截图"可在截图清单中查看该坐标点对应的截图审核情况，实现坐标与结论的双向溯源。
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
