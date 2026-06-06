import { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  User,
  PenLine,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
  StickyNote,
  FolderOpen,
  Eye,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import type { ExampleItem, ExampleType } from '@/types';

const typeMeta: Record<ExampleType, { label: string; icon: any; color: string; bg: string }> = {
  old_form: { label: '旧表数据', icon: FolderOpen, color: 'text-warm-700', bg: 'bg-warm-50 border-warm-200' },
  supplementary: { label: '补录备注', icon: StickyNote, color: 'text-medical-700', bg: 'bg-medical-50 border-medical-200' },
  missing_unit: { label: '漏填单位', icon: PenLine, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  collision_example: { label: '碰撞边界', icon: AlertTriangle, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

export default function ExamplesPage() {
  const { examples } = useAppStore();
  const [activeId, setActiveId] = useState<string>(examples[0]?.id || '');
  const [showAnnotation, setShowAnnotation] = useState(true);
  const [filterType, setFilterType] = useState<ExampleType | 'all'>('all');

  const filtered = filterType === 'all' ? examples : examples.filter((e) => e.type === filterType);
  const active = examples.find((e) => e.id === activeId) || examples[0];

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-5 animate-fade-in">
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-medical-600" />
              复核样例
            </h3>
            <span className="text-[11px] text-ink-400">{filtered.length} / {examples.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <FilterChip active={filterType === 'all'} onClick={() => setFilterType('all')} label="全部" />
            {(['old_form', 'supplementary', 'missing_unit', 'collision_example'] as ExampleType[]).map((t) => (
              <FilterChip
                key={t}
                active={filterType === t}
                onClick={() => setFilterType(t)}
                label={typeMeta[t].label}
                icon={typeMeta[t].icon}
              />
            ))}
          </div>
          <div className="space-y-2 max-h-full overflow-y-auto scroll-area">
            {filtered.map((ex) => (
              <ExampleCard
                key={ex.id}
                example={ex}
                active={activeId === ex.id}
                onClick={() => setActiveId(ex.id)}
              />
            ))}
          </div>
          <p className="mt-4 text-[11px] text-ink-400 leading-relaxed flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 text-warm-500 shrink-0" />
            每个样例均来自日常训练材料中会混入的小问题，且均真实改变了最终判定结论。
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {active && (
          <>
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-display text-xl font-semibold text-ink-900">{active.title}</h2>
                    {(() => {
                      const meta = typeMeta[active.type];
                      const Icon = meta.icon;
                      return (
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border', meta.bg, meta.color)}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      );
                    })()}
                    {active.changedResult && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                        <AlertTriangle className="w-3 h-3" />
                        已改变判定结论
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink-600 leading-relaxed max-w-2xl">{active.summary}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
                    <span className="inline-flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5" />
                      材料来源：{active.materialSource}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnnotation(!showAnnotation)}
                  className="btn-ghost shrink-0"
                >
                  {showAnnotation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>草稿与标注</span>
                </button>
              </div>

              {showAnnotation && active.draftAnnotations && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-warm-50 to-white border border-warm-200/70 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-warm-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-warm-700">
                      <PenLine className="w-3.5 h-3.5" />
                      标注草稿 & 讲解备注（同轮复核）
                    </div>
                    <p className="text-sm text-warm-900/80 leading-relaxed font-display" style={{ fontStyle: 'italic' }}>
                      "{active.draftAnnotations}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-4 flex-1 min-h-0">
              <div className="col-span-3 card flex flex-col overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-medical-600" />
                    <h3 className="text-sm font-semibold text-ink-800">原始材料还原</h3>
                    <span className="text-[10px] text-ink-400">贴近日常材料的真实感</span>
                  </div>
                  <button className="btn-ghost">
                    <ZoomIn className="w-4 h-4" />
                    <span>放大</span>
                  </button>
                </div>
                <div className="flex-1 p-6 bg-paper overflow-y-auto scroll-area">
                  <MaterialView example={active} />
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-4 min-h-0">
                <div className="card p-4 bg-gradient-to-br from-white to-red-50/30 border-red-100/70">
                  <div className="flex items-center gap-1.5 mb-3">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <h4 className="text-sm font-semibold text-ink-800">原始判定</h4>
                  </div>
                  <p className="text-sm text-red-800/90 leading-relaxed">{active.beforeConclusion}</p>
                </div>

                <div className="flex justify-center py-1">
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <span className="h-px w-10 bg-ink-200" />
                    <ArrowRight className="w-4 h-4" />
                    <span className="h-px w-10 bg-ink-200" />
                  </div>
                </div>

                <div className="card p-4 bg-gradient-to-br from-white to-sage-50/40 border-sage-200/70">
                  <div className="flex items-center gap-1.5 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-sage-600" />
                    <h4 className="text-sm font-semibold text-ink-800">复核后结论</h4>
                  </div>
                  <p className="text-sm text-sage-800/90 leading-relaxed">{active.afterConclusion}</p>
                </div>

                <div className="card p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Layers className="w-4 h-4 text-medical-600" />
                    <h4 className="text-sm font-semibold text-ink-800">问题解析</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto scroll-area pr-1">
                    <p className="text-sm text-ink-700 leading-relaxed">{active.explanation}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: any;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
        active
          ? 'bg-medical-600 text-white border-medical-600 shadow-soft'
          : 'bg-white text-ink-600 border-ink-200 hover:border-medical-300 hover:text-medical-700'
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </button>
  );
}

function ExampleCard({
  example,
  active,
  onClick,
}: {
  example: ExampleItem;
  active: boolean;
  onClick: () => void;
}) {
  const meta = typeMeta[example.type];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3.5 rounded-xl border transition-all',
        active
          ? 'border-medical-300 bg-medical-50/50 shadow-soft'
          : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/50'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border', meta.bg)}>
          <Icon className={cn('w-4 h-4', meta.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink-800 leading-snug">{example.title}</div>
          <div className="mt-1 text-[11px] text-ink-500 line-clamp-2 leading-relaxed">
            {example.summary}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {example.changedResult ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-warm-700 bg-warm-50 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-2.5 h-2.5" />
                改变结论
              </span>
            ) : (
              <span className="text-[10px] text-ink-400">未改变结论</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MaterialView({ example }: { example: ExampleItem }) {
  if (example.type === 'old_form') {
    return <OldFormMaterial example={example} />;
  }
  if (example.type === 'supplementary') {
    return <SupplementaryMaterial example={example} />;
  }
  if (example.type === 'missing_unit') {
    return <MissingUnitMaterial example={example} />;
  }
  return <CollisionMaterial example={example} />;
}

function OldFormMaterial({ example }: { example: ExampleItem }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="p-5 rounded-xl bg-white border border-warm-200/60 shadow-card" style={{ fontFamily: '"Noto Serif SC", serif' }}>
        <div className="flex items-center justify-between border-b-2 border-double border-warm-300 pb-2">
          <div>
            <div className="text-lg font-bold text-ink-800">穴位训练记录表</div>
            <div className="text-[11px] text-ink-500 mt-0.5">2022年度归档 · Sheet3</div>
          </div>
          <div className="text-[11px] text-warm-700 px-2 py-0.5 rounded bg-warm-50 border border-warm-200 rotate-3">
            旧版标准
          </div>
        </div>

        <table className="w-full mt-3 text-sm">
          <thead>
            <tr className="text-left text-[11px] text-ink-500">
              <th className="py-1.5 font-normal">行号</th>
              <th className="py-1.5 font-normal">穴位</th>
              <th className="py-1.5 font-normal">取法</th>
              <th className="py-1.5 font-normal">数值</th>
              <th className="py-1.5 font-normal">操作人</th>
            </tr>
          </thead>
          <tbody className="text-sm border-t border-warm-200/60">
            {[
              { n: 12, ap: '内关', m: '腕横纹上2寸', v: '50mm', op: '张' },
              { n: 13, ap: '合谷', m: '虎口中点', v: '—', op: '李' },
              {
                n: 14,
                ap: '足三里',
                m: '犊鼻下3寸',
                v: '69mm',
                op: '李',
                highlight: true,
                note: '同身寸取法参考2018版',
              },
              { n: 15, ap: '三阴交', m: '内踝上3寸', v: '75mm', op: '王' },
            ].map((row) => (
              <tr key={row.n} className={row.highlight ? 'bg-warm-50/80' : ''}>
                <td className="py-1.5 font-mono text-xs text-ink-400">{row.n}</td>
                <td className="py-1.5 font-medium text-ink-800">{row.ap}</td>
                <td className="py-1.5 text-ink-600">{row.m}</td>
                <td className="py-1.5 font-mono text-ink-800">
                  {row.v}
                  {row.highlight && (
                    <span className="ml-1 text-[10px] text-warm-600 bg-warm-100 px-1 rounded">旧</span>
                  )}
                </td>
                <td className="py-1.5 text-ink-600">{row.op}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {example.content.find(c => c.hasIssue) && (
          <div className="mt-4 p-3 rounded-lg bg-warm-100/60 border border-warm-200/70 relative">
            <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-warm-200 text-[10px] font-bold text-warm-900 rotate-[-2deg]">
              手写旁注
            </div>
            <div className="text-xs text-warm-900/80 font-display italic leading-relaxed">
              "同身寸取法参考2018版，1寸 = 23mm。系统换算按2023新版1寸=25mm，差值6mm，偏差超限。"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SupplementaryMaterial({ example }: { example: ExampleItem }) {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="p-5 rounded-xl bg-white border border-ink-200 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-medical-50 border border-medical-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-sage-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink-800">系统自动判定</div>
              <div className="text-[10px] text-ink-400 mt-0.5">内关穴 · 2024-03-20 10:23</div>
            </div>
          </div>
          <span className="badge-success">
            <CheckCircle2 className="w-3 h-3" />
            合格 · 准确率 82%
          </span>
        </div>
        <div className="mt-3 h-14 rounded-lg bg-sage-50/60 border border-sage-200/70 flex items-center justify-center text-xs text-sage-700">
          <div className="w-4/5 h-2 rounded-full bg-sage-100 overflow-hidden">
            <div className="h-full w-[82%] rounded-full bg-sage-500" />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="px-3 py-1 rounded-full bg-ink-100 text-[11px] text-ink-500 flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3" />
          训练师当日补录
        </div>
      </div>

      <div
        className="p-5 rounded-xl border-2 border-dashed border-warm-400/70 shadow-card"
        style={{
          backgroundImage:
            'repeating-linear-gradient(transparent 0 27px, rgba(214, 118, 55, 0.08) 27px 28px)',
          backgroundColor: '#fffbf4',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="w-4 h-4 text-warm-600" />
          <div className="text-[11px] text-warm-700">纸质训练日志 第7页 · 补录栏</div>
        </div>
        <p className="font-display text-warm-900 leading-loose" style={{ fontSize: 16 }}>
          「腕横纹取法偏上约 <span className="underline decoration-wavy decoration-warm-600 underline-offset-4">1cm</span>，
          学员取点时设备滑动前 15s 数据漂移，建议重新考核。—— 王XX <span className="float-right text-xs text-warm-500">16:45 补</span>」
        </p>
        <div className="mt-3 pt-3 border-t border-warm-200/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-warm-600">
            <User className="w-3 h-3" />
            训练师王XX
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-warm-600">
            <Clock className="w-3 h-3" />
            2024-03-20 16:45 补录入系统
          </div>
        </div>
      </div>
    </div>
  );
}

function MissingUnitMaterial({ example }: { example: ExampleItem }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="p-5 rounded-xl bg-white border border-ink-200 shadow-card">
        <div className="flex items-center justify-between border-b border-ink-200 pb-2">
          <div>
            <div className="text-base font-bold text-ink-800">训练记录模板 v3.2</div>
            <div className="text-[11px] text-ink-400 mt-0.5">合谷穴 · 压力值列</div>
          </div>
          <span className="badge-danger">
            <AlertTriangle className="w-3 h-3" />
            漏填单位
          </span>
        </div>

        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="text-left text-[11px] text-ink-500">
              <th className="pb-2 font-normal w-8">#</th>
              <th className="pb-2 font-normal">穴位</th>
              <th className="pb-2 font-normal">时间</th>
              <th className="pb-2 font-normal">
                压力值
                <span className="ml-1 text-red-500">*</span>
              </th>
              <th className="pb-2 font-normal">位置偏差</th>
            </tr>
          </thead>
          <tbody className="border-t border-ink-100">
            {[
              { n: 1, ap: '内关', t: '10:12', p: '4.2 N', d: '2.1mm', ok: true },
              { n: 2, ap: '百会', t: '10:18', p: '3.8 N', d: '1.5mm', ok: true },
              {
                n: 3,
                ap: '合谷',
                t: '10:23',
                p: '450',
                d: '3.0mm',
                ok: false,
                hint: '旁注铅笔字：g',
              },
              { n: 4, ap: '足三里', t: '10:30', p: '5.1 N', d: '4.2mm', ok: true },
            ].map((row) => (
              <tr key={row.n} className={row.ok ? '' : 'bg-red-50/60'}>
                <td className="py-2 font-mono text-xs text-ink-400">{row.n}</td>
                <td className="py-2 font-medium text-ink-800">{row.ap}</td>
                <td className="py-2 font-mono text-xs text-ink-500">{row.t}</td>
                <td className="py-2">
                  <span className={cn('font-mono font-semibold', row.ok ? 'text-ink-800' : 'text-red-700')}>
                    {row.p}
                  </span>
                  {!row.ok && <span className="ml-2 text-[10px] text-red-500 italic">（无单位）</span>}
                </td>
                <td className="py-2 text-ink-600">{row.d}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 p-3 rounded-lg bg-warm-50 border border-warm-200 relative">
          <div className="absolute -left-2 -top-2 w-12 h-12 flex items-center justify-center bg-white rounded-full border border-warm-200 shadow-soft rotate-[-6deg]">
            <span className="text-[9px] font-bold text-warm-700 leading-tight text-center">
              铅笔
              <br />
              旁注
            </span>
          </div>
          <p className="pl-10 text-xs text-warm-900/80 font-display italic leading-relaxed">
            "压力值 450 = 450g ≈ 4.41N。系统默认读成 N，判定超标。实际在 3~6N 正常范围。"
          </p>
        </div>
      </div>
    </div>
  );
}

function CollisionMaterial({ example }: { example: ExampleItem }) {
  const headData = example.content;
  return (
    <div className="max-w-lg mx-auto">
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-xl bg-white border border-ink-200 shadow-card p-4">
          <div className="text-[11px] text-ink-500 mb-1">图层 layer-002</div>
          <div className="text-xs font-semibold text-ink-800">初版标注草稿</div>
          <div className="mt-3 aspect-[3/5] rounded-lg bg-paper border border-ink-100 overflow-hidden relative">
            <svg viewBox="0 0 180 300" className="w-full h-full">
              <ellipse cx="90" cy="60" rx="48" ry="52" fill="#e8eaee" stroke="#9aa6b3" strokeWidth={1} />
              <circle cx="90" cy="55" r="28" fill="none" stroke="rgba(12, 142, 232, 0.25)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx="90" cy="75" r="28" fill="none" stroke="rgba(12, 142, 232, 0.25)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx="90" cy="55" r="6" fill="white" stroke="#0c8ee8" strokeWidth={2} />
              <text x="102" y="58" fontSize="10" fontWeight="600" fill="#064d85">百会</text>
              <circle cx="90" cy="75" r="6" fill="white" stroke="#0c8ee8" strokeWidth={2} />
              <text x="102" y="78" fontSize="10" fontWeight="600" fill="#064d85">前顶</text>
              <line x1="90" y1="30" x2="90" y2="120" stroke="#d67637" strokeWidth="3.5" opacity="0.55" strokeLinecap="round" />
              <text x="14" y="22" fontSize="9" fill="#d67637" className="italic" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                草稿辅助线
              </text>
            </svg>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-warm-200 text-[9px] font-bold text-warm-900 rotate-3">
              遮挡
            </div>
          </div>
          <p className="mt-3 text-[11px] text-red-700">
            视觉上看似超出百会边界 → 原判定：不合格
          </p>
        </div>

        <div className="col-span-3 rounded-xl bg-white border border-ink-200 shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] text-ink-500">碰撞边界参数</div>
              <div className="text-xs font-semibold text-ink-800">百会 ↔ 前顶 邻接区</div>
            </div>
            <span className="badge-warning">
              <Eye className="w-3 h-3" />
              重叠区域
            </span>
          </div>
          <div className="space-y-2">
            {headData.map((row, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg border transition-all',
                  row.hasIssue ? 'bg-warm-50/70 border-warm-200' : 'bg-ink-50/40 border-ink-100'
                )}
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-ink-500">{row.label}</div>
                  <div className="text-sm font-medium text-ink-800 mt-0.5">
                    {row.value}
                    {row.original !== undefined && row.corrected !== undefined && (
                      <span className="ml-2 text-[11px] text-warm-700">
                        ({row.original} → {row.corrected})
                      </span>
                    )}
                  </div>
                  {row.hasIssue && row.issueDescription && (
                    <div className="mt-1 text-[10px] text-warm-700 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {row.issueDescription}
                    </div>
                  )}
                </div>
                {row.hasIssue && (
                  <div className="w-6 h-6 rounded-full bg-warm-100 border border-warm-200 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3 text-warm-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-sage-50 border border-sage-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-800 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              复核判定
            </div>
            <p className="text-[11px] text-sage-800/90 leading-relaxed">
              判定点 (300, 95) 距离百会标准点 15mm，位于 12.5mm + 7.5mm 重叠缓冲区合法范围内。
              视觉误判来自草稿层橙色辅助线加粗覆盖重叠区，坐标实际合规 → 改判：合格。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
