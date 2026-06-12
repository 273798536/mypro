import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileEdit,
  ClipboardList,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useTrackerStore } from '@/store/useTrackerStore';
import {
  ANOMALY_TYPE_LABEL,
  NEXT_ACTION_LABEL,
  RISK_LEVEL_LABEL,
  type RiskLevel,
  type AnomalyType,
  type NextAction,
  type RiskAssessment,
} from '@/types';
import clsx from 'clsx';

type MatrixCell = {
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
};

function getRiskLevel(sum: number): RiskLevel {
  if (sum <= 3) return 'low';
  if (sum <= 6) return 'medium';
  if (sum <= 8) return 'high';
  return 'critical';
}

function getCellStyles(level: RiskLevel, isSelected: boolean) {
  const base = 'relative cursor-pointer transition-all duration-200 rounded-lg border flex items-center justify-center h-16';
  switch (level) {
    case 'low':
      return clsx(base, isSelected ? 'bg-seaweed-500/40 border-seaweed-400 ring-2 ring-seaweed-400/60' : 'bg-seaweed-500/15 border-seaweed-500/30 hover:bg-seaweed-500/25');
    case 'medium':
      return clsx(base, isSelected ? 'bg-sand-500/50 border-sand-400 ring-2 ring-sand-400/60' : 'bg-sand-500/30 border-sand-500/40 hover:bg-sand-500/40');
    case 'high':
      return clsx(base, isSelected ? 'bg-coral-500/50 border-coral-400 ring-2 ring-coral-400/60' : 'bg-coral-500/30 border-coral-500/40 hover:bg-coral-500/40');
    case 'critical':
      return clsx(base, isSelected ? 'bg-coral-500/70 border-coral-300 ring-2 ring-coral-300/80 animate-border-pulse' : 'bg-coral-500/50 border-coral-400/60 hover:bg-coral-500/60 animate-border-pulse');
  }
}

function getRiskBadgeStyles(level: RiskLevel) {
  switch (level) {
    case 'low': return 'bg-seaweed-500/20 text-seaweed-300 border-seaweed-500/40';
    case 'medium': return 'bg-sand-500/20 text-sand-300 border-sand-500/40';
    case 'high': return 'bg-coral-500/20 text-coral-300 border-coral-500/40';
    case 'critical': return 'bg-coral-500/30 text-coral-200 border-coral-400/60';
  }
}

function getNextActionBtnStyles(action: NextAction, isActive: boolean) {
  const base = 'px-3 py-1.5 rounded-md text-sm font-medium border transition-all duration-200';
  switch (action) {
    case 'supplement_material':
      return clsx(base, isActive ? 'bg-sand-500 text-ocean-950 border-sand-400' : 'bg-sand-500/15 text-sand-300 border-sand-500/40 hover:bg-sand-500/25');
    case 'adjust_caliber':
      return clsx(base, isActive ? 'bg-seafoam-500 text-ocean-950 border-seafoam-400' : 'bg-seafoam-500/15 text-seafoam-300 border-seafoam-500/40 hover:bg-seafoam-500/25');
    case 'recollect':
      return clsx(base, isActive ? 'bg-coral-500 text-ocean-950 border-coral-400' : 'bg-coral-500/15 text-coral-300 border-coral-500/40 hover:bg-coral-500/25');
  }
}

const ACTION_HINTS: Record<NextAction, string> = {
  supplement_material: '补充缺失的源材料（预报文件、巡检照片、轨迹记录等）',
  adjust_caliber: '调整数据统计口径或修正偏差，无需重新采集',
  recollect: '数据质量严重受影响，需派船现场重新采集',
};

export default function RiskMatrix() {
  const { assessments, buoys, updateAssessment, generateShortDescription } = useTrackerStore();

  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [localNextAction, setLocalNextAction] = useState<NextAction | null>(null);

  const assessmentsByCell = useMemo(() => {
    const map = new Map<string, RiskAssessment[]>();
    for (const a of assessments) {
      const key = `${a.likelihoodLevel}-${a.impactLevel}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    let list = assessments;
    if (selectedCell) {
      list = list.filter((a) => a.likelihoodLevel === selectedCell.likelihood && a.impactLevel === selectedCell.impact);
    }
    if (anomalyFilter) {
      list = list.filter((a) => a.anomalyType === anomalyFilter);
    }
    return list;
  }, [assessments, selectedCell, anomalyFilter]);

  const handleSelectAssessment = (a: RiskAssessment) => {
    setSelectedAssessment(a);
    setDescriptionText(a.shortDescription);
    setLocalNextAction(a.nextAction);
  };

  const handleUseTemplate = () => {
    if (!selectedAssessment) return;
    const template = generateShortDescription({
      availableData: selectedAssessment.availableData,
      pendingData: selectedAssessment.pendingData,
      recollectData: selectedAssessment.recollectData,
    });
    setDescriptionText(template);
  };

  const handleSave = () => {
    if (!selectedAssessment) return;
    const patch: Partial<RiskAssessment> = { shortDescription: descriptionText };
    if (localNextAction) patch.nextAction = localNextAction;
    updateAssessment(selectedAssessment.id, patch);
    setSelectedAssessment(null);
  };

  const renderMatrixRow = (impact: 1 | 2 | 3 | 4 | 5) => (
    <tr key={impact}>
      <td className="w-16 pr-3 text-right text-ocean-300 text-sm font-medium align-middle">
        {impact === 3 ? (
          <div className="flex items-center justify-end gap-1">
            <span className="text-ocean-400 text-xs">↑</span>
            <span>{impact}</span>
          </div>
        ) : impact}
      </td>
      {[1, 2, 3, 4, 5].map((likelihood) => {
        const sum = likelihood + impact;
        const level = getRiskLevel(sum);
        const key = `${likelihood}-${impact}`;
        const items = assessmentsByCell.get(key) || [];
        const count = items.length;
        const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
        return (
          <td key={likelihood} className="p-1">
            <div
              className={getCellStyles(level, isSelected)}
              onClick={() => {
                if (count > 0 || selectedCell) {
                  setSelectedCell(isSelected ? null : { likelihood: likelihood as 1 | 2 | 3 | 4 | 5, impact: impact as 1 | 2 | 3 | 4 | 5 });
                }
              }}
              title={`${RISK_LEVEL_LABEL[level]} · ${count} 条`}
            >
              {count > 0 && (
                <span className="absolute top-1 right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-ocean-950/70 border border-ocean-400/40 text-[10px] font-semibold text-ocean-100 flex items-center justify-center">
                  {count}
                </span>
              )}
              <span className="text-xs font-medium text-ocean-950/50">{sum}</span>
            </div>
          </td>
        );
      })}
    </tr>
  );

  const renderDataList = (title: string, items: string[], color: string, dotColor: string, Icon: typeof CheckCircle) => (
    <div>
      <div className={clsx('text-xs font-medium mb-2 flex items-center gap-1', color)}>
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-ocean-400">无</p>
        ) : items.map((d) => (
          <div key={d} className="text-sm text-ocean-200 flex items-center gap-2">
            <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
            {d}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full p-6 space-y-6 overflow-auto">
      <div className="nautical-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="w-6 h-6 text-seafoam-400" />
          <h2 className="section-title">风险分层矩阵</h2>
          <div className="ml-auto flex gap-4 text-xs">
            {[
              { bg: 'bg-seaweed-500/40 border-seaweed-400/50', label: '低风险' },
              { bg: 'bg-sand-500/50 border-sand-400/50', label: '中风险' },
              { bg: 'bg-coral-500/40 border-coral-400/50', label: '高风险' },
              { bg: 'bg-coral-500/60 border-coral-300/70', label: '紧急风险' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={clsx('w-3 h-3 rounded border', item.bg)} />
                <span className="text-ocean-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-2xl">
              <div className="mb-2 text-right text-ocean-400 text-sm font-medium">影响程度 ↑</div>
              <table className="w-full border-collapse">
                <tbody>
                  {renderMatrixRow(5)}
                  {renderMatrixRow(4)}
                  {renderMatrixRow(3)}
                  {renderMatrixRow(2)}
                  {renderMatrixRow(1)}
                </tbody>
              </table>
              <div className="mt-2 flex">
                <div className="w-16" />
                <div className="flex-1 flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="flex-1 text-center text-ocean-300 text-sm font-medium py-1">
                      {n === 3 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span>{n}</span>
                          <span className="text-ocean-400 text-xs">→</span>
                        </div>
                      ) : n}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-center text-ocean-400 text-sm">发生可能性 →</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="nautical-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-coral-400" />
              <h2 className="section-title text-lg">异常案例列表</h2>
              {selectedCell && (
                <button
                  onClick={() => setSelectedCell(null)}
                  className="ml-auto text-xs text-ocean-300 hover:text-seafoam-300 underline underline-offset-2"
                >
                  清除矩阵筛选
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.entries(ANOMALY_TYPE_LABEL) as [AnomalyType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAnomalyFilter(anomalyFilter === key ? null : key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                    anomalyFilter === key
                      ? 'bg-seafoam-500 text-ocean-950 border-seafoam-400'
                      : 'bg-ocean-800/60 text-ocean-200 border-ocean-600/50 hover:border-seafoam-500/50 hover:text-seafoam-300'
                  )}
                >
                  {label}
                </button>
              ))}
              {anomalyFilter && (
                <button onClick={() => setAnomalyFilter(null)} className="text-xs text-ocean-400 hover:text-ocean-200 underline underline-offset-2 self-center ml-1">
                  重置
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredAssessments.length === 0 ? (
                <div className="py-16 text-center text-ocean-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>暂无匹配的异常案例</p>
                </div>
              ) : filteredAssessments.map((a) => {
                const buoy = buoys.find((b) => b.id === a.buoyId);
                const isExpanded = expandedId === a.id;
                const isSelected = selectedAssessment?.id === a.id;
                return (
                  <div
                    key={a.id}
                    className={clsx(
                      'rounded-xl border transition-all duration-200 overflow-hidden',
                      isSelected ? 'bg-ocean-800/70 border-seafoam-500/50 shadow-glow' : 'bg-ocean-900/50 border-ocean-700/50 hover:border-ocean-600/70'
                    )}
                  >
                    <div className="p-4 cursor-pointer" onClick={() => handleSelectAssessment(a)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-display text-lg text-ocean-100">{buoy?.name || '未知浮标'}</span>
                            <span className="text-ocean-400 text-sm font-mono">{buoy?.code || ''}</span>
                            <span className={clsx('tag border', getRiskBadgeStyles(a.riskLevel))}>{RISK_LEVEL_LABEL[a.riskLevel]}</span>
                            <span className="tag bg-ocean-700/60 text-ocean-200 border-ocean-600/50">{ANOMALY_TYPE_LABEL[a.anomalyType]}</span>
                          </div>
                          <p className="text-sm text-ocean-200 mb-3">{a.shortDescription}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.availableData.slice(0, 2).map((d) => (
                              <span key={`av-${d}`} className="tag tag-available"><CheckCircle className="w-3 h-3 mr-1" />{d}</span>
                            ))}
                            {a.pendingData.slice(0, 2).map((d) => (
                              <span key={`pd-${d}`} className="tag tag-pending"><ClipboardList className="w-3 h-3 mr-1" />{d}</span>
                            ))}
                            {a.recollectData.slice(0, 2).map((d) => (
                              <span key={`rc-${d}`} className="tag tag-recollect"><FileEdit className="w-3 h-3 mr-1" />{d}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <div className="flex gap-1.5 mb-2">
                            {(['supplement_material', 'adjust_caliber', 'recollect'] as NextAction[]).map((action) => (
                              <button
                                key={action}
                                onClick={(e) => { e.stopPropagation(); updateAssessment(a.id, { nextAction: action }); }}
                                className={getNextActionBtnStyles(action, a.nextAction === action)}
                              >
                                {NEXT_ACTION_LABEL[action]}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : a.id); }}
                            className="ml-auto flex items-center gap-1 text-xs text-ocean-400 hover:text-seafoam-300"
                          >
                            {isExpanded ? <>收起 <ChevronDown className="w-4 h-4" /></> : <>展开详情 <ChevronRight className="w-4 h-4" /></>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-ocean-700/40 bg-ocean-900/40">
                        <div className="pt-4 space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            {renderDataList('可用数据项', a.availableData, 'text-seaweed-300', 'bg-seaweed-400', CheckCircle)}
                            {renderDataList('暂缓数据项', a.pendingData, 'text-sand-300', 'bg-sand-400', ClipboardList)}
                            {renderDataList('需重采数据项', a.recollectData, 'text-coral-300', 'bg-coral-400', FileEdit)}
                          </div>
                          {buoy && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-ocean-800/50 border border-ocean-700/40">
                              <div className="w-10 h-10 rounded-full bg-seafoam-500/20 border border-seafoam-500/40 flex items-center justify-center">
                                <User className="w-5 h-5 text-seafoam-300" />
                              </div>
                              <div>
                                <div className="text-xs text-ocean-400">联系监测员</div>
                                <div className="text-sm font-medium text-ocean-100">{buoy.operator}</div>
                                <div className="text-xs text-ocean-400">负责 {buoy.name}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="nautical-card p-5 h-full">
            <div className="flex items-center gap-3 mb-5">
              <FileEdit className="w-5 h-5 text-seafoam-400" />
              <h2 className="section-title text-lg">下一步指引与说明编辑</h2>
            </div>

            {!selectedAssessment ? (
              <div className="py-20 text-center">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-ocean-500 opacity-50" />
                <p className="text-ocean-400 mb-1">请从左侧列表选择一个异常案例</p>
                <p className="text-ocean-500 text-sm">选中后可在此调整下一步动作并编辑风险说明</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-lg bg-ocean-800/50 border border-ocean-700/40">
                  <div className="text-xs text-ocean-400 mb-1">当前选中</div>
                  <div className="text-ocean-100 font-medium">
                    {buoys.find((b) => b.id === selectedAssessment.buoyId)?.name || ''} · {ANOMALY_TYPE_LABEL[selectedAssessment.anomalyType]}
                  </div>
                  <div className="mt-1 text-xs">
                    发生可能性 {selectedAssessment.likelihoodLevel} × 影响程度 {selectedAssessment.impactLevel}
                    <span className={clsx('ml-2 tag border', getRiskBadgeStyles(selectedAssessment.riskLevel))}>
                      {RISK_LEVEL_LABEL[selectedAssessment.riskLevel]}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-ocean-200 mb-3">选择下一步动作</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['supplement_material', 'adjust_caliber', 'recollect'] as NextAction[]).map((action) => (
                      <button
                        key={action}
                        onClick={() => setLocalNextAction(action)}
                        className={getNextActionBtnStyles(action, localNextAction === action)}
                      >
                        {NEXT_ACTION_LABEL[action]}
                      </button>
                    ))}
                  </div>
                  {localNextAction && (
                    <div className="mt-2 text-xs text-ocean-400">{ACTION_HINTS[localNextAction]}</div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-ocean-200">风险说明</div>
                    <button onClick={handleUseTemplate} className="text-xs text-seafoam-300 hover:text-seafoam-200 flex items-center gap-1">
                      <FileEdit className="w-3.5 h-3.5" />
                      使用模板填充
                    </button>
                  </div>
                  <textarea
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    rows={8}
                    className="input-nautical resize-none font-sans"
                    placeholder="请输入风险处理说明..."
                  />
                </div>

                <button onClick={handleSave} className="w-full nautical-btn-primary py-2.5">
                  保存修改
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
