import { useState } from 'react';
import {
  UserCog,
  FolderOpen,
  AlertTriangle,
  Download,
  ArrowRight,
  Play,
  SkipForward,
  ChevronRight,
  Home,
  CheckCircle2,
  Info,
  Target,
  FileSpreadsheet,
  Map,
  Users,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/appStore';
import { Link } from 'react-router-dom';
import Toolbar from '../components/Toolbar';
import dayjs from 'dayjs';

const GUIDE_STEPS = [
  {
    id: 'materials',
    title: '① 材料归档区',
    desc: '方案相关的所有材料、图纸、会议纪要存放位置，含历史版本与当前版本自动分类。',
    hotArea: 'materials',
    icon: FolderOpen,
    badge: '所有版本自动归档',
  },
  {
    id: 'anomalies',
    title: '② 异常查看入口',
    desc: '快速定位所有未处理异常：截图丢失、坐标冲突、撤回记录，不可误标为正常通过。',
    hotArea: 'anomalies',
    icon: AlertTriangle,
    badge: `${useAppStore.getState().anomalies.filter(a => a.status !== 'closed').length} 条待处理`,
  },
  {
    id: 'export',
    title: '③ 重新导出按钮',
    desc: '一键重新生成CSV明细，自动带上最新备注、筛选、异常标记，文件名含版本号。',
    hotArea: 'export',
    icon: Download,
    badge: '导出内容与页面状态 100% 一致',
  },
];

export default function ConsolePage() {
  const store = useAppStore();
  const [guideIdx, setGuideIdx] = useState<number | null>(0);
  const [guideDone, setGuideDone] = useState(false);

  const stats = {
    versions: store.versions.length,
    points: Object.values(store.pointsByVersionId).flat().length,
    anomalies: store.anomalies.length,
    openAnomalies: store.anomalies.filter(a => a.status !== 'closed').length,
    notes: Object.values(store.notesByPointId).flat().length +
      Object.values(store.pointsByVersionId).flat().reduce((s, p) => s + p.notes.length, 0),
  };

  const nextStep = () => {
    if (guideIdx === null) return;
    if (guideIdx >= GUIDE_STEPS.length - 1) {
      setGuideIdx(null);
      setGuideDone(true);
    } else {
      setGuideIdx(guideIdx + 1);
    }
  };

  const currentStep = guideIdx !== null ? GUIDE_STEPS[guideIdx] : null;

  const teamMembers = [
    { name: '小赵', role: '方案经理', avatar: '赵', color: 'bg-brass-600 text-[#0A1628]' },
    { name: '李工', role: '设计院', avatar: '李', color: 'bg-emerald-700 text-white' },
    { name: '王总', role: '项目负责人', avatar: '王', color: 'bg-cyan-700 text-white' },
    { name: '张工', role: '现场施工', avatar: '张', color: 'bg-amber-700 text-white' },
  ];

  return (
    <div className="min-h-screen bg-[#07111F] flex flex-col">
      <Toolbar />

      <div className="flex-1 px-6 py-5 relative">
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[18px] text-brass-100 font-semibold flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <UserCog className="text-brass-400" size={20} />
              项目负责人控制台
            </h2>
            <p className="text-[11.5px] text-slate-400 mt-1 max-w-2xl">
              接手项目后，按指引三步走即可快速掌握：① 看材料归档 → ② 查异常记录 → ③ 导最新明细
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!guideDone && guideIdx === null && (
              <button
                onClick={() => setGuideIdx(0)}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-brass-600 to-brass-700 hover:from-brass-500 hover:to-brass-600 text-[#0A1628] text-[12px] font-semibold flex items-center gap-1.5 shadow-lg shadow-brass-900/30 transition-all"
              >
                <Play size={13} />
                开始操作指引
              </button>
            )}
            {guideDone && (
              <button
                onClick={() => { setGuideIdx(0); setGuideDone(false); }}
                className="h-9 px-4 rounded-xl border border-brass-700/60 bg-brass-900/30 text-brass-200 text-[12px] hover:bg-brass-900/50 flex items-center gap-1.5 transition-all"
              >
                <Play size={13} />
                重新播放指引
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 mb-5">
          {[
            { label: '方案版本', value: stats.versions, icon: Map, cls: 'text-brass-300', bg: 'border-brass-800/50 bg-brass-950/30' },
            { label: '点位总数', value: stats.points, icon: FileSpreadsheet, cls: 'text-emerald-300', bg: 'border-emerald-900/50 bg-emerald-950/20' },
            { label: '异常记录', value: stats.anomalies, icon: AlertTriangle, cls: 'text-red-300', bg: 'border-red-900/60 bg-red-950/30' },
            { label: '待处理', value: stats.openAnomalies, cls: 'text-amber-300', icon: Target, bg: 'border-amber-900/60 bg-amber-950/30' },
            { label: '人工备注', value: stats.notes, icon: Info, cls: 'text-cyan-300', bg: 'border-cyan-900/50 bg-cyan-950/20' },
            { label: '参与人员', value: teamMembers.length, icon: Users, cls: 'text-purple-300', bg: 'border-purple-900/50 bg-purple-950/20' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={cn('rounded-2xl border p-3.5 flex items-center gap-3', s.bg)}>
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center border',
                  s.bg,
                )}>
                  <Icon size={18} className={s.cls} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('text-[22px] font-bold tabular-nums leading-none', s.cls)}>{s.value}</div>
                  <div className="text-[10.5px] text-slate-500 mt-1">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {GUIDE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isHot = currentStep?.hotArea === step.hotArea;
            const LinkTo = step.hotArea === 'materials' ? '/' : step.hotArea === 'anomalies' ? '/anomalies' : '/export';
            return (
              <Link
                key={step.id}
                to={LinkTo}
                className={cn(
                  'group relative rounded-2xl border p-5 transition-all overflow-hidden',
                  isHot
                    ? 'bg-gradient-to-br from-brass-900/40 to-transparent border-brass-500/80 shadow-[0_0_35px_rgba(201,169,98,0.18)] scale-[1.02]'
                    : 'bg-slate-900/40 border-slate-800/70 hover:border-brass-700/60 hover:bg-slate-900/60',
                )}
              >
                {isHot && (
                  <>
                    <span className="absolute inset-0 rounded-2xl border-2 border-brass-400 animate-pulse pointer-events-none" />
                    <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-brass-500 text-[#0A1628] text-[10px] font-bold z-10 shadow-lg">
                      当前步骤
                    </span>
                  </>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all',
                    isHot
                      ? 'bg-brass-500 border-brass-300 text-[#0A1628] shadow-[0_0_20px_rgba(201,169,98,0.4)]'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-300 group-hover:bg-brass-900/50 group-hover:border-brass-600/60 group-hover:text-brass-200',
                  )}>
                    <Icon size={22} strokeWidth={2.3} />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
                    {step.badge}
                  </span>
                </div>

                <h3 className={cn(
                  'text-[14px] font-semibold mb-1.5',
                  isHot ? 'text-brass-100' : 'text-slate-200',
                )}>
                  {step.title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{step.desc}</p>

                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-slate-500 flex items-center gap-1">
                    <Home size={11} />
                    {step.hotArea === 'materials' && '主工作台 / 材料归档面板'}
                    {step.hotArea === 'anomalies' && '异常看板页面'}
                    {step.hotArea === 'export' && 'CSV导出中心'}
                  </span>
                  <span className={cn(
                    'flex items-center gap-0.5 text-[11px] transition-all',
                    isHot ? 'text-brass-300' : 'text-slate-500 group-hover:text-brass-300',
                  )}>
                    进入 <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
            <h3 className="text-[12.5px] text-slate-200 font-medium mb-3 flex items-center gap-1.5">
              <Map size={14} className="text-brass-400" />
              版本迭代脉络（按时间从旧到新）
            </h3>
            <div className="relative pl-6 border-l-2 border-dashed border-slate-700/60 space-y-3">
              {[...store.versions].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
              ).map((v, i) => {
                const vAnoms = store.anomalies.filter(a => a.versionId === v.id).length;
                return (
                  <div key={v.id} className="relative">
                    <span className={cn(
                      'absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-2 border-[#07111F]',
                      v.isWithdrawn ? 'bg-gray-500' : v.isActive ? 'bg-brass-500 shadow-[0_0_10px_rgba(201,169,98,0.6)]' : 'bg-slate-600',
                    )} />
                    <div className={cn(
                      'rounded-xl p-3.5 border transition-colors',
                      v.isWithdrawn
                        ? 'bg-gray-800/30 border-gray-700/50'
                        : v.isActive
                          ? 'bg-brass-950/30 border-brass-800/60'
                          : 'bg-slate-800/40 border-slate-700/60',
                    )}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-slate-100">{v.label}</span>
                          {v.isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brass-600/30 text-brass-200 border border-brass-600/50">
                              当前生效
                            </span>
                          )}
                          {v.isWithdrawn && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-600/40 text-gray-200 border border-gray-500/60 line-through">
                              已撤回
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-500 flex items-center gap-1">
                          <Info size={10.5} />
                          {dayjs(v.timestamp).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-400 mb-2">{v.description}</p>
                      <div className="flex items-center gap-3 text-[10.5px]">
                        <span className="text-slate-500">点位：{(store.pointsByVersionId[v.id] ?? []).length} 根</span>
                        {vAnoms > 0 && (
                          <span className="text-red-300 flex items-center gap-1">
                            <AlertTriangle size={11} />
                            异常记录 {vAnoms} 条
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
              <h3 className="text-[12.5px] text-slate-200 font-medium mb-3 flex items-center gap-1.5">
                <Users size={14} className="text-brass-400" />
                项目参与人员
              </h3>
              <div className="space-y-2.5">
                {teamMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/40 transition-colors">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] border',
                      m.color,
                      'border-white/10',
                    )}>
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-200 font-medium">{m.name}</div>
                      <div className="text-[10.5px] text-slate-500">{m.role}</div>
                    </div>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
              <h3 className="text-[12.5px] text-slate-200 font-medium mb-3 flex items-center gap-1.5">
                <Info size={14} className="text-brass-400" />
                接手快速清单
              </h3>
              <div className="space-y-2">
                {[
                  '所有筛选条件、备注、选中点位刷新页面后自动保留',
                  '时间轴切换版本 → 侧边明细 + 3D高亮自动同步',
                  '异常记录的 markedAsNormal 恒为 false，不会误通过',
                  '导出CSV和页面看到的状态、标记 100% 一致',
                  '口头备注在溯源和导出中均有特殊 [口头] 前缀',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/30 border border-slate-800/50">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-300 leading-relaxed">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {currentStep && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[520px] max-w-[90vw] rounded-2xl border-2 border-brass-500/80 bg-[#0E1F38] shadow-[0_10px_60px_rgba(201,169,98,0.25)] p-4 flex items-start gap-3 backdrop-blur-md">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-brass-600/30 border border-brass-600/60 flex items-center justify-center">
              <Info size={18} className="text-brass-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-brass-300 mb-0.5">
                步骤 {(guideIdx ?? 0) + 1} / {GUIDE_STEPS.length}
              </div>
              <div className="text-[13px] text-slate-100 font-semibold mb-1">{currentStep.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">{currentStep.desc}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => { setGuideIdx(null); setGuideDone(true); }}
                className="h-8 px-2.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                跳过
              </button>
              <button
                onClick={nextStep}
                className="h-8 px-3 rounded-lg bg-brass-600/80 hover:bg-brass-500 text-[#0A1628] text-[11.5px] font-semibold flex items-center gap-1 transition-colors"
              >
                {guideIdx === GUIDE_STEPS.length - 1 ? (
                  <>完成 <CheckCircle2 size={12} /></>
                ) : (
                  <>下一步 <SkipForward size={12} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
