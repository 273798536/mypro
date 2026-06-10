import { useMemo, useState } from 'react';
import {
  Images,
  Calendar,
  User,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ZoomIn,
  Target,
  BookOpen,
  Filter,
  FileText,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { mockAnnotationStandards } from '@/data/mockData';
import type { ImageAnnotation, ReviewStatus } from '@/types';
import { cn, getReviewStatusClass, getReviewStatusText, formatDateTime } from '@/utils';

export default function AnnotationReviewPage() {
  const store = useAppStore();
  const [selectedAnn, setSelectedAnn] = useState<ImageAnnotation | null>(
    store.annotations[0] || null
  );
  const [search, setSearch] = useState('');
  const [filterReview, setFilterReview] = useState<'all' | ReviewStatus>('all');
  const [filterAnnotator, setFilterAnnotator] = useState('all');
  const [showStandards, setShowStandards] = useState(true);

  const annotators = useMemo(
    () => Array.from(new Set(store.annotations.map((a) => a.annotator))),
    [store.annotations]
  );

  const filtered = useMemo(() => {
    return store.annotations.filter((a) => {
      if (filterReview !== 'all' && a.reviewStatus !== filterReview) return false;
      if (filterAnnotator !== 'all' && a.annotator !== filterAnnotator) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.sampleId.toLowerCase().includes(q) &&
          !a.labels.some((l) => l.toLowerCase().includes(q)) &&
          !a.annotator.includes(search)
        )
          return false;
      }
      return true;
    });
  }, [store.annotations, filterReview, filterAnnotator, search]);

  const selectedStandard = useMemo(() => {
    if (!selectedAnn) return null;
    return selectedAnn.labels
      .map((label) => mockAnnotationStandards.find((s) => label.includes(s.type.split('-')[0]) || s.type.includes(label.slice(0, 2))))
      .filter(Boolean);
  }, [selectedAnn]);

  const stats = useMemo(() => ({
    total: store.annotations.length,
    pending: store.annotations.filter((a) => a.reviewStatus === 'pending').length,
    approved: store.annotations.filter((a) => a.reviewStatus === 'approved').length,
    rejected: store.annotations.filter((a) => a.reviewStatus === 'rejected').length,
    revision: store.annotations.filter((a) => a.reviewStatus === 'needs_revision').length,
  }), [store.annotations]);

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">审核 / 图像标注</div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 font-serif-cn flex items-center gap-2">
            🖼️ 图像标注审核 & 标准对照
            <span className="ml-3 px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 text-xs font-normal border border-purple-500/20">
              月底/课前专用
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            逐张核对标注框是否准确，点击缩略图查看详情。右侧「标注标准对照表」供课前讲解使用。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStandards(!showStandards)} className={cn('btn-secondary text-sm flex items-center gap-1.5', showStandards && '!bg-deep-ocean/5 !border-deep-ocean/30 !text-deep-ocean')}>
            <BookOpen className="w-4 h-4" />
            {showStandards ? '隐藏对照表' : '显示对照表'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '标注总数', value: stats.total, color: 'from-slate-500 to-slate-700', icon: Images },
          { label: '待审核', value: stats.pending, color: 'from-amber-400 to-amber-600', icon: Clock },
          { label: '已通过', value: stats.approved, color: 'from-tundra-green to-emerald-600', icon: CheckCircle2 },
          { label: '需修改', value: stats.revision, color: 'from-blue-500 to-indigo-600', icon: AlertTriangle },
          { label: '已驳回', value: stats.rejected, color: 'from-red-400 to-red-600', icon: XCircle },
        ].map((s) => (
          <div key={s.label} className="card !p-3.5 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0 shadow', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono-data text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="space-y-4">
          <div className="card !p-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 font-bold text-slate-700 text-sm">
              <Filter className="w-4 h-4" />
              筛选条件
            </div>
            <div className="p-3 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1.5">搜索</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="样本/标签/标注人"
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-deep-ocean"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1.5">审核状态</label>
                <div className="space-y-1">
                  {(['all', 'pending', 'approved', 'needs_revision', 'rejected'] as const).map((st) => (
                    <label key={st} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-50">
                      <input
                        type="radio"
                        checked={filterReview === st}
                        onChange={() => setFilterReview(st)}
                        className="accent-deep-ocean"
                      />
                      <span className="text-[11.5px]">{st === 'all' ? '全部' : getReviewStatusText(st)}</span>
                      {st !== 'all' && (
                        <span className="ml-auto text-[10px] text-slate-400 font-mono-data">
                          {store.annotations.filter((a) => a.reviewStatus === st).length}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1.5">标注人</label>
                <select
                  value={filterAnnotator}
                  onChange={(e) => setFilterAnnotator(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs bg-white cursor-pointer focus:outline-none focus:border-deep-ocean"
                >
                  <option value="all">全部</option>
                  {annotators.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {showStandards && (
            <div className="card !p-0 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-slate-100 bg-gradient-to-r from-deep-ocean/5 to-transparent flex items-center gap-2 font-bold text-slate-800 text-sm">
                <BookOpen className="w-4 h-4 text-deep-ocean" />
                标注标准对照表
                <span className="ml-auto text-[10px] text-slate-400 font-normal">课前讲解</span>
              </div>
              <div className="p-2.5 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                {mockAnnotationStandards.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3.5 h-3.5 rounded shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-bold text-slate-800">{s.type}</span>
                    </div>
                    <div className="text-slate-600 leading-relaxed space-y-1 pl-5.5">
                      <div><span className="text-slate-400">标准描述：</span>{s.description}</div>
                      <div><span className="text-slate-400">判定规则：</span>{s.rule}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 font-serif-cn text-sm">
                <Images className="w-4 h-4 text-deep-ocean" />
                标注缩略图墙
                <span className="text-xs font-normal text-slate-400">
                  共 {filtered.length} 张
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                点击图片查看详情 & 标注框
              </div>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 max-h-[380px] overflow-y-auto scrollbar-thin">
              {filtered.map((a) => {
                const active = selectedAnn?.id === a.id;
                const sample = store.samples.find((s) => s.id === a.sampleId);
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAnn(a)}
                    className={cn(
                      'group rounded-xl border-2 overflow-hidden cursor-pointer transition-all',
                      active
                        ? 'border-deep-ocean shadow-xl -translate-y-1'
                        : 'border-slate-100 hover:border-deep-ocean/40 hover:shadow-md'
                    )}
                  >
                    <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                      <img
                        src={a.imageUrl}
                        alt={a.id}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500" preserveAspectRatio="none">
                        {a.boundingBoxes.map((box, i) => (
                          <g key={i}>
                            <rect
                              x={(box.x / 500) * 100 + '%'}
                              y={(box.y / 500) * 100 + '%'}
                              width={(box.width / 500) * 100 + '%'}
                              height={(box.height / 500) * 100 + '%'}
                              fill="none"
                              stroke={a.labels[i]?.includes('垩白') ? '#d97706' : a.labels[i]?.includes('溶血') ? '#dc2626' : '#3d8b6b'}
                              strokeWidth="2.5"
                              strokeDasharray="4 2"
                            />
                            <rect
                              x={(box.x / 500) * 100 + '%'}
                              y={`calc(${(box.y / 500) * 100 + '%'} - 18px)`}
                              fill={a.labels[i]?.includes('垩白') ? '#d97706' : a.labels[i]?.includes('溶血') ? '#dc2626' : '#3d8b6b'}
                              width="auto"
                              rx="3"
                            >
                              <tspan x={4} dy="12" fill="white" fontSize="10" fontWeight="600">
                                {a.labels[i]?.slice(0, 6) || '标签'}
                              </tspan>
                            </rect>
                          </g>
                        ))}
                      </svg>
                      <div className={cn(
                        'absolute top-2 right-2 badge',
                        getReviewStatusClass(a.reviewStatus)
                      )}>
                        {getReviewStatusText(a.reviewStatus)}
                      </div>
                      <div className="absolute inset-0 bg-deep-ocean/0 group-hover:bg-deep-ocean/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-deep-ocean text-white text-xs font-semibold shadow-lg">
                          <ZoomIn className="w-3.5 h-3.5" />
                          查看详情
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono-data text-[10.5px] font-bold text-deep-ocean">
                          {a.sampleId.slice(-7)}
                        </span>
                        <span className="text-[9.5px] text-slate-400">
                          {a.boundingBoxes.length}个标注
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        {sample?.species} · {a.annotator.split('-')[1]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedAnn && (
            <div className="card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-purple-500/5 to-blue-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-deep-ocean/10 flex items-center justify-center text-deep-ocean">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 font-serif-cn text-sm flex items-center gap-2">
                      标注详情 · {selectedAnn.id}
                      <span className={cn('badge', getReviewStatusClass(selectedAnn.reviewStatus))}>
                        {getReviewStatusText(selectedAnn.reviewStatus)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {selectedAnn.sampleId}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedAnn.annotator}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr]">
                <div className="p-4 border-r border-slate-100">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                    <img
                      src={selectedAnn.imageUrl}
                      alt={selectedAnn.id}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500" preserveAspectRatio="none">
                      {selectedAnn.boundingBoxes.map((box, i) => (
                        <g key={i}>
                          <rect
                            x={(box.x / 500) * 100 + '%'}
                            y={(box.y / 500) * 100 + '%'}
                            width={(box.width / 500) * 100 + '%'}
                            height={(box.height / 500) * 100 + '%'}
                            fill="rgba(59,130,246,0.1)"
                            stroke={selectedAnn.labels[i]?.includes('垩白') ? '#d97706' : selectedAnn.labels[i]?.includes('溶血') ? '#dc2626' : '#1e3a5f'}
                            strokeWidth="3"
                          />
                          <line x1="0" y1={((box.y + box.height / 2) / 500) * 100 + '%'} x2={(box.x / 500) * 100 + '%'} y2={((box.y + box.height / 2) / 500) * 100 + '%'} stroke="#e07b39" strokeDasharray="3 3" strokeWidth="1.5" />
                          <text x="50%" y={((box.y + box.height / 2) / 500) * 100 + '%'} dy="-3" fill="#e07b39" fontSize="10" textAnchor="end" dx="-10">
                            x:{box.x}, y:{box.y}
                          </text>
                          <text x={((box.x + box.width / 2) / 500) * 100 + '%'} y={((box.y + box.height + 18) / 500) * 100 + '%'} fill="#1e3a5f" fontSize="11" fontWeight="700" textAnchor="middle">
                            [{i + 1}] {selectedAnn.labels[i]?.slice(0, 8)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      标注框坐标 & 标签详情
                    </div>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-400 text-left">
                          <th className="pb-1.5 font-medium">#</th>
                          <th className="pb-1.5 font-medium">标注标签</th>
                          <th className="pb-1.5 font-medium text-right">置信度</th>
                          <th className="pb-1.5 font-medium text-right">坐标(x,y,w,h)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAnn.boundingBoxes.map((box, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1.5 font-bold text-slate-500">{i + 1}</td>
                            <td className="py-1.5 font-medium text-slate-700">{selectedAnn.labels[i]}</td>
                            <td className="py-1.5 text-right">
                              <span className={cn(
                                'font-mono-data font-semibold',
                                (selectedAnn.confidences[i] || 0) >= 0.9 ? 'text-tundra-green-dark' :
                                (selectedAnn.confidences[i] || 0) >= 0.85 ? 'text-deep-ocean' : 'text-amber-warning'
                              )}>
                                {Math.round((selectedAnn.confidences[i] || 0) * 100)}%
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-mono-data text-slate-500 text-[10px]">
                              {box.x},{box.y},{box.width},{box.height}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {showStandards && selectedStandard && selectedStandard.length > 0 && (
                    <div className="p-3 rounded-lg bg-deep-ocean/[0.04] border border-deep-ocean/20">
                      <div className="font-bold text-deep-ocean mb-2 flex items-center gap-1.5 text-[11.5px]">
                        <Info className="w-3.5 h-3.5" />
                        对应标注标准 · 课前讲解参考
                      </div>
                      <div className="space-y-2">
                        {selectedStandard.filter(Boolean).map((s: any, i: number) => (
                          <div key={i} className="text-[11px] leading-relaxed">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: s.color }} />
                              <span className="font-bold text-slate-800">{s.type}</span>
                            </div>
                            <div className="pl-4 text-slate-600">
                              <div>📖 {s.description}</div>
                              <div className="mt-0.5">✓ 判定规则: {s.rule}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-lg border-t-2 border-tundra-green/40 bg-tundra-green/[0.04]">
                    <div className="font-bold text-tundra-green-dark mb-1.5 flex items-center gap-1.5 text-[11.5px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      审核意见
                    </div>
                    <div className="text-[11.5px] text-slate-600 leading-relaxed pl-5">
                      {selectedAnn.reviewComment || '（暂无审核意见，保持待审核状态）'}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      标注提交时间: {formatDateTime(selectedAnn.annotator + '-').slice(0, 10) || '2026-06-04'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
