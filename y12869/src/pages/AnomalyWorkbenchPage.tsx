import { useAnomalyDisposal } from '@/hooks/useAnomalyDisposal';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FilePlus2, Sliders, CheckCircle, ChevronRight, Filter, ListFilter,
  Camera, Book, Edit3, Layers, MapPin, Clock, Check, Circle, CircleCheck } from 'lucide-react';

const SEV_COLORS: Record<string, { bg: string; ring: string; text: string; label: string }> = {
  red: { bg: 'from-red-900/50 to-red-800/20', ring: 'ring-red-500/40', text: 'text-red-300', label: '严重' },
  orange: { bg: 'from-amber-900/50 to-amber-800/20', ring: 'ring-amber-500/40', text: 'text-amber-300', label: '较重' },
  yellow: { bg: 'from-yellow-900/40 to-yellow-800/15', ring: 'ring-yellow-500/40', text: 'text-yellow-300', label: '一般' },
  blue: { bg: 'from-blue-900/40 to-blue-800/15', ring: 'ring-blue-500/40', text: 'text-blue-300', label: '提示' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'chip-red',
  processing: 'chip-orange',
  reviewing: 'chip-blue',
  closed: 'chip-green',
};

export default function AnomalyWorkbenchPage() {
  const { filteredList, filters, setAnomalyFilters, activeAnomaly, setActiveAnomaly, advanceDisposalStep,
    stats, anomalyTypeToLabel, anomalySeverityToLabel, disposalDirectionToLabel, anomalyStatusToLabel } = useAnomalyDisposal();
  const setSelectedPoint = useAppStore(s => s.setSelectedPoint);
  const setSelectedSections = useAppStore(s => s.setSelectedSections);
  const navigate = useNavigate();

  const jumpTo3D = (anomaly: typeof filteredList[number]) => {
    if (anomaly.relatedSectionIds.length > 0) setSelectedSections(anomaly.relatedSectionIds);
    if (anomaly.relatedPointIds.length > 0) setSelectedPoint(anomaly.relatedPointIds[0]);
    navigate('/visualization');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-5 gap-5">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-serif font-bold text-white/95">异常处置工作台</h1>
          <p className="text-xs text-channel-muted mt-1">分级展示异常，明确告知：补材料还是改口径</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['red', 'orange', 'yellow', 'blue'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setAnomalyFilters({ severity: filters.severity === sev ? undefined : sev })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                ${filters.severity === sev ? `bg-gradient-to-br ${SEV_COLORS[sev].bg} ring-1 ${SEV_COLORS[sev].ring} border-white/10` : 'border-channel-border bg-channel-card hover:border-channel-muted'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${sev === 'red' ? 'bg-red-500' : sev === 'orange' ? 'bg-amber-500' : sev === 'yellow' ? 'bg-yellow-400' : 'bg-blue-500'} ${filters.severity === sev ? 'animate-pulse' : ''}`} />
              <span className={`text-sm font-semibold ${filters.severity === sev ? SEV_COLORS[sev].text : 'text-channel-text'}`}>
                {anomalySeverityToLabel(sev)}
              </span>
              <span className={`font-mono font-bold ${filters.severity === sev ? SEV_COLORS[sev].text : 'text-channel-muted'}`}>
                {stats.bySeverity[sev]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
        <div className="col-span-7 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2 text-xs shrink-0">
            <ListFilter className="w-4 h-4 text-channel-muted" />
            <span className="text-channel-muted">状态筛选：</span>
            {(['pending', 'processing', 'reviewing', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setAnomalyFilters({ status: filters.status === s ? undefined : s })}
                className={`${STATUS_COLORS[s]} hover:scale-105 transition-transform cursor-pointer
                  ${filters.status === s ? 'ring-2 ring-white/30 scale-105' : ''}`}
              >
                {anomalyStatusToLabel(s)} · {stats.byStatus[s]}
              </button>
            ))}
            <div className="ml-auto chip-gray">共 {filteredList.length} 条异常</div>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin pr-1 grid gap-3 grid-cols-2 auto-rows-min">
            {filteredList.map(a => {
              const sev = SEV_COLORS[a.severity];
              const isActive = activeAnomaly?.anomalyId === a.anomalyId;
              const doneSteps = a.disposalSteps.filter(s => s.completed && s.required).length;
              const reqSteps = a.disposalSteps.filter(s => s.required).length;
              const pct = reqSteps > 0 ? Math.round((doneSteps / reqSteps) * 100) : 0;
              return (
                <div
                  key={a.anomalyId}
                  onClick={() => setActiveAnomaly(a.anomalyId)}
                  className={`card card-hover cursor-pointer p-4 relative overflow-hidden transition-all
                    ${isActive ? `ring-2 ${sev.ring}` : ''}
                    bg-gradient-to-br ${sev.bg}`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${a.severity === 'red' ? 'bg-red-500' : a.severity === 'orange' ? 'bg-amber-500' : a.severity === 'yellow' ? 'bg-yellow-400' : 'bg-blue-500'}`} />

                  <div className="flex items-start justify-between gap-2 mb-2 pl-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`chip-${a.severity === 'yellow' ? 'yellow' : a.severity} text-[10px]`}>{sev.label}</span>
                        <span className="chip-gray text-[10px]">{anomalyTypeToLabel(a.type)}</span>
                        <span className={`ml-auto ${STATUS_COLORS[a.status]} text-[10px]`}>{anomalyStatusToLabel(a.status)}</span>
                      </div>
                      <div className="font-semibold text-sm text-white/95 leading-snug">{a.title}</div>
                    </div>
                  </div>

                  <p className="text-xs text-channel-text/80 leading-relaxed mb-3 pl-2 line-clamp-3">
                    {a.description}
                  </p>

                  <div className="space-y-2 pl-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-channel-muted">
                        {a.disposalDirection === 'supplement_material' ? <FilePlus2 className="w-3 h-3" /> : <Sliders className="w-3 h-3" />}
                        <span>下一步：{disposalDirectionToLabel(a.disposalDirection)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-channel-border/60 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-ocean-500'} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-channel-muted">{doneSteps}/{reqSteps}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <MapPin className="w-3 h-3 text-ocean-400" />
                      {a.relatedSectionIds.slice(0, 2).map(sid => (
                        <span key={sid} className="chip-blue">{sid}</span>
                      ))}
                      {a.relatedSectionIds.length > 2 && <span className="text-channel-muted">+{a.relatedSectionIds.length - 2}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); jumpTo3D(a); }}
                        className="chip-gray hover:bg-ocean-700/40 transition-colors ml-auto"
                      >
                        跳转 3D <ChevronRight className="w-3 h-3 inline -ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="col-span-2 text-center py-16 text-channel-muted">
                <CheckCircle className="w-14 h-14 mx-auto mb-3 text-emerald-400/40" />
                <div>此筛选条件下无异常</div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-5 card p-5 flex flex-col min-h-0 overflow-hidden">
          {!activeAnomaly ? (
            <div className="flex-1 flex items-center justify-center text-center text-channel-muted">
              <div>
                <AlertTriangle className="w-14 h-14 mx-auto mb-4 opacity-30" />
                <div className="text-sm">点击左侧异常卡片</div>
                <div className="text-xs mt-1">查看处置步骤与下一步指引</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="mb-4 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`chip-${activeAnomaly.severity === 'yellow' ? 'yellow' : activeAnomaly.severity}`}>
                    {SEV_COLORS[activeAnomaly.severity].label}
                  </span>
                  <span className="chip-gray">{anomalyTypeToLabel(activeAnomaly.type)}</span>
                  <span className={`ml-auto ${STATUS_COLORS[activeAnomaly.status]}`}>{anomalyStatusToLabel(activeAnomaly.status)}</span>
                </div>
                <h2 className="text-lg font-serif font-bold text-white/95 leading-tight">{activeAnomaly.title}</h2>
                <div className="mt-1.5 text-[11px] text-channel-muted flex items-center gap-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 创建 {activeAnomaly.createdAt}</span>
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> 更新 {activeAnomaly.updatedAt}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-channel-bg/60 border border-channel-border mb-4 shrink-0">
                <div className="text-xs leading-relaxed text-channel-text/90">{activeAnomaly.description}</div>
              </div>

              <div className="mb-4 p-3 rounded-lg shrink-0" style={{
                background: activeAnomaly.disposalDirection === 'supplement_material'
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))',
                border: activeAnomaly.disposalDirection === 'supplement_material'
                  ? '1px solid rgba(16,185,129,0.3)'
                  : '1px solid rgba(59,130,246,0.3)',
              }}>
                <div className="flex items-center gap-2 mb-1">
                  {activeAnomaly.disposalDirection === 'supplement_material' ? (
                    <FilePlus2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Sliders className="w-4 h-4 text-ocean-400" />
                  )}
                  <span className={`text-sm font-bold ${activeAnomaly.disposalDirection === 'supplement_material' ? 'text-emerald-300' : 'text-ocean-300'}`}>
                    处置方向：{disposalDirectionToLabel(activeAnomaly.disposalDirection)}
                  </span>
                </div>
                <div className="text-xs text-channel-text/80">
                  {activeAnomaly.disposalDirection === 'supplement_material'
                    ? '需要补充上传原始凭证（采样单、日志、照片等）'
                    : '需要调整参数口径（基准面、阈值、坐标系等），请谨慎操作'}
                </div>
              </div>

              <div className="text-sm font-semibold mb-3 flex items-center gap-2 shrink-0">
                <Edit3 className="w-4 h-4 text-ocean-400" />
                <span>处置步骤链</span>
              </div>

              <div className="flex-1 overflow-auto scrollbar-thin pr-1 space-y-1">
                {activeAnomaly.disposalSteps.map((step, idx) => {
                  const isLast = idx === activeAnomaly.disposalSteps.length - 1;
                  const dirColor = step.direction === 'supplement_material'
                    ? { chip: 'chip-green', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', icon: <Book className="w-3 h-3" /> }
                    : { chip: 'chip-blue', bg: 'bg-ocean-500/20', border: 'border-ocean-500/40', icon: <Sliders className="w-3 h-3" /> };
                  return (
                    <div key={step.stepId} className="relative">
                      {!isLast && (
                        <div className={`absolute left-4.5 top-8 w-0.5 h-8 ${step.completed ? 'bg-emerald-500/60' : 'bg-channel-border'}`} style={{ left: '18px' }} />
                      )}
                      <div
                        className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all mb-1
                          ${step.completed
                            ? `${dirColor.bg} ${dirColor.border}`
                            : 'bg-channel-card border-channel-border hover:border-channel-muted'}`}
                      >
                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                          ${step.completed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-channel-bg border-2 border-channel-border text-channel-muted'}`}
                        >
                          {step.completed ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-start gap-2 mb-1">
                            <span className={`${dirColor.chip} text-[10px]`}>
                              {dirColor.icon} {disposalDirectionToLabel(step.direction)}
                            </span>
                            {!step.required && <span className="chip-gray text-[10px]">可选</span>}
                            {step.meta?.requiredPhotos && (
                              <span className="chip-orange text-[10px]">需 {String(step.meta.requiredPhotos)} 张照片</span>
                            )}
                          </div>
                          <div className={`text-sm leading-relaxed ${step.completed ? 'text-emerald-200/90' : 'text-channel-text'}`}>
                            {step.instruction}
                          </div>
                          {step.completedAt && (
                            <div className="text-[10px] text-channel-muted mt-1 flex items-center gap-1">
                              <CircleCheck className="w-3 h-3 text-emerald-400" /> 完成于 {step.completedAt}
                            </div>
                          )}
                          {step.meta && 'uploadedPhotos' in step.meta && typeof step.meta.uploadedPhotos === 'number' && (
                            <div className="mt-2 h-1.5 rounded-full bg-channel-border overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${(step.meta.uploadedPhotos as number / (step.meta.requiredPhotos as number || 1)) * 100}%` }} />
                            </div>
                          )}
                        </div>
                        {!step.completed && (
                          <button
                            onClick={() => advanceDisposalStep(activeAnomaly.anomalyId, step.stepId)}
                            className="mt-1 shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-ocean-700 text-white hover:bg-ocean-600 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> 标记完成
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
