import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  MapPin,
  FileImage,
  GitBranch,
  History,
} from 'lucide-react';
import { useSchemeStore } from '../store/useSchemeStore';
import { MapView } from '../components/MapView';
import { MaterialGrid } from '../components/MaterialGrid';
import { ReasonChain } from '../components/ReasonChain';
import { Timeline } from '../components/Timeline';
import { ActionBar } from '../components/ActionBar';
import { formatTime } from '../utils/time';

const statusLabel = {
  draft: '草稿',
  reviewing: '评审中',
  finalized: '已确定',
} as const;

const statusClass = {
  draft: 'bg-slateX-100 text-slateX-600 border-slateX-200',
  reviewing: 'bg-engineering-50 text-engineering-700 border-engineering-200',
  finalized: 'bg-slateX-700 text-white border-slateX-700',
} as const;

type Tab = 'materials' | 'reason' | 'timeline';

export function SchemeDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const allSchemes = useSchemeStore((s) => s.schemes);
  const allMaterials = useSchemeStore((s) => s.materials);
  const allTimeline = useSchemeStore((s) => s.timeline);
  const allReasonNodes = useSchemeStore((s) => s.reasonNodes);

  const scheme = useMemo(() => allSchemes.find((s) => s.id === id), [allSchemes, id]);
  const materials = useMemo(
    () => allMaterials.filter((m) => m.schemeId === id),
    [allMaterials, id]
  );
  const timeline = useMemo(
    () =>
      allTimeline
        .filter((t) => t.schemeId === id)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    [allTimeline, id]
  );
  const reasonNodes = useMemo(
    () => allReasonNodes.filter((r) => r.schemeId === id),
    [allReasonNodes, id]
  );

  const [tab, setTab] = useState<Tab>('materials');
  const [highlightedMaterialId, setHighlightedMaterialId] = useState<string | undefined>();

  if (!scheme) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slateX-500">
        方案不存在
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ml-4 text-engineering-700 underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  const overloadMats = useMemo(
    () => materials.filter((m) => m.isCapacityOverload),
    [materials]
  );
  const lateMats = useMemo(() => materials.filter((m) => m.isLateArrival), [materials]);
  const dirtyMats = useMemo(() => materials.filter((m) => m.isDirty), [materials]);

  const tabs: { key: Tab; label: string; Icon: typeof FileImage; badge?: number }[] = [
    { key: 'materials', label: '附件材料', Icon: FileImage, badge: materials.length },
    { key: 'reason', label: '原因链说明', Icon: GitBranch, badge: reasonNodes.length },
    { key: 'timeline', label: '历史时间线', Icon: History, badge: timeline.length },
  ];

  return (
    <div className="min-h-screen bg-slateX-50">
      <header className="bg-white border-b border-slateX-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-slateX-600 hover:text-engineering-700 transition-colors"
          >
            <ArrowLeft size={14} />
            返回方案列表
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <section className="bg-white border border-slateX-200 rounded-sm p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-xl text-slateX-900">{scheme.name}</h1>
                <span className={`px-2 py-0.5 text-xs border rounded-sm ${statusClass[scheme.status]}`}>
                  {statusLabel[scheme.status]}
                </span>
                {scheme.hasCapacityOverload && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-alert-50 border border-alert-500 text-alert-700 rounded-sm">
                    <AlertTriangle size={11} />
                    存在容量超限
                  </span>
                )}
                {scheme.mapPoint.isUpdated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amberX-50 border border-amberX-500 text-amberX-700 rounded-sm">
                    <Clock size={11} />
                    点位最近有补录
                  </span>
                )}
              </div>

              <div className="mt-3 p-3 bg-slateX-50 border border-slateX-200 rounded-sm">
                <div className="text-xs text-slateX-500 mb-0.5">当前比选结论</div>
                <div className="text-sm text-slateX-900 font-medium">{scheme.conclusion}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slateX-600">
                  <MapPin size={12} className="text-slateX-400" />
                  {scheme.mapPoint.label}
                </div>
                <div className="flex items-center gap-1.5 text-slateX-600">
                  <FileImage size={12} className="text-slateX-400" />
                  材料 {materials.length} 份
                </div>
                <div className="flex items-center gap-1.5 text-slateX-600">
                  <Clock size={12} className="text-slateX-400" />
                  创建 {formatTime(scheme.createdAt)}
                </div>
                <div className="flex items-center gap-1.5 text-slateX-600">
                  <History size={12} className="text-slateX-400" />
                  更新 {formatTime(scheme.updatedAt)}
                </div>
              </div>

              {(overloadMats.length > 0 || lateMats.length > 0 || dirtyMats.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {overloadMats.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-alert-50 text-alert-700 border border-alert-200 rounded-sm font-mono">
                      容量超限材料 {overloadMats.length}
                    </span>
                  )}
                  {lateMats.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-alert-50 text-alert-700 border border-alert-200 rounded-sm font-mono">
                      晚到附件 {lateMats.length}
                    </span>
                  )}
                  {dirtyMats.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-slateX-800 text-slateX-100 rounded-sm font-mono">
                      保留原始痕迹 {dirtyMats.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <ActionBar scheme={scheme} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <section className="lg:col-span-2 bg-white border border-slateX-200 rounded-sm p-4 space-y-3">
            <h2 className="font-serif text-sm text-slateX-900 flex items-center gap-1.5">
              <MapPin size={14} className="text-engineering-700" />
              地图点位
            </h2>
            <MapView point={scheme.mapPoint} />
            <div className="text-[11px] text-slateX-500 leading-relaxed">
              {scheme.mapPoint.isUpdated ? (
                <span className="text-amberX-700">
                  ※ 琥珀色脉冲圈表示该点位在最近的补录中有关联材料更新，见时间线。
                </span>
              ) : (
                <span>※ 蓝色圆点为公交港湾方案位置，补录新照片后点位会显示变更标记。</span>
              )}
            </div>
          </section>

          <section className="lg:col-span-3 bg-white border border-slateX-200 rounded-sm">
            <div className="flex items-center border-b border-slateX-200">
              {tabs.map((t) => {
                const Icon = t.Icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                      active
                        ? 'text-engineering-800 border-engineering-700 font-medium'
                        : 'text-slateX-500 border-transparent hover:text-slateX-700'
                    }`}
                  >
                    <Icon size={14} />
                    {t.label}
                    {t.badge !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slateX-100 text-slateX-600 rounded-sm">
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {tab === 'materials' && (
                <MaterialGrid
                  materials={materials}
                  highlightedId={highlightedMaterialId}
                  onHighlight={setHighlightedMaterialId}
                />
              )}
              {tab === 'reason' && (
                <ReasonChain
                  nodes={reasonNodes}
                  materials={materials}
                  onMaterialHover={setHighlightedMaterialId}
                />
              )}
              {tab === 'timeline' && <Timeline entries={timeline} materials={materials} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
