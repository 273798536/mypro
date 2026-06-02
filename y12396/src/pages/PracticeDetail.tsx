import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Play, Pause, Volume2,
  AlertTriangle, FileText, History, Download,
  Music, Activity, BarChart3, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot,
} from 'recharts';
import { usePracticeStore } from '@/store/practiceStore';
import StatusBadge from '@/components/StatusBadge';
import ConflictCard from '@/components/ConflictCard';

type TabKey = 'evidence' | 'conflicts' | 'mapping' | 'corrections';

const tabs: { key: TabKey; label: string; icon: typeof Music }[] = [
  { key: 'evidence', label: '三证据源', icon: BarChart3 },
  { key: 'conflicts', label: '冲突留痕', icon: AlertTriangle },
  { key: 'mapping', label: '证据对应关系', icon: FileText },
  { key: 'corrections', label: '修正记录', icon: Clock },
];

export default function PracticeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPractice, loading, fetchPracticeDetail, flagConflict } = usePracticeStore();
  const [activeTab, setActiveTab] = useState<TabKey>('evidence');
  const [isPlaying, setIsPlaying] = useState(false);

  const loadDetail = useCallback(() => {
    if (id) fetchPracticeDetail(id);
  }, [id, fetchPracticeDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (loading && !currentPractice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPractice) {
    return (
      <div className="text-center py-20 text-text-muted">未找到练习记录</div>
    );
  }

  const { record, rhythmDetection, speedTier, beatMarkers, conflicts, corrections, evidenceMapping } = currentPractice;

  const handleFlag = async (conflictId: string) => {
    if (id) await flagConflict(id, conflictId);
  };

  const bpmChartData = (speedTier?.tiers || []).map((tier, idx) => ({
    name: `T${tier.tierIndex}`,
    bpmLow: tier.bpmRange[0],
    bpmHigh: tier.bpmRange[1],
    bpmAvg: (tier.bpmRange[0] + tier.bpmRange[1]) / 2,
    label: tier.label,
    isJump: idx > 0 && Math.abs(speedTier!.tiers[idx].bpmRange[0] - speedTier!.tiers[idx - 1].bpmRange[1]) > 20,
  }));

  const jumpPoints = bpmChartData.filter((d) => d.isJump);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button onClick={() => navigate('/practices')} className="hover:text-text-primary transition-colors">
          练习列表
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-text-primary">{record.studentName} 练习详情</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-1">{record.studentName}</h2>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{record.practiceDate}</span>
            <span className="flex items-center gap-1.5"><Music className="w-3.5 h-3.5" />{record.audioFileName}</span>
            <StatusBadge status={record.status} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/practices/${id}/history`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-dark-tertiary text-text-secondary hover:text-text-primary hover:bg-dark-border transition-colors"
          >
            <History className="w-4 h-4" />
            历史追溯
          </button>
          <button
            onClick={() => navigate(`/practices/${id}/report`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-primary text-dark-primary hover:bg-amber-hover shadow-lg shadow-amber-primary/20 transition-all"
          >
            <FileText className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-dark-secondary rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-amber-primary text-dark-primary shadow-lg shadow-amber-primary/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-dark-tertiary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'evidence' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-dark-card rounded-xl border border-dark-border p-5">
            <h3 className="font-display font-semibold text-sm text-text-primary mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-primary" />
              练习音频
            </h3>
            <div className="bg-dark-primary rounded-lg p-4 mb-4">
              <div className="flex items-center gap-1 h-16">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-amber-primary/30 rounded-sm"
                    style={{ height: `${20 + Math.random() * 80}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 h-1 bg-dark-tertiary rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-amber-primary rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-amber-primary text-dark-primary flex items-center justify-center hover:bg-amber-hover transition-colors shadow-lg shadow-amber-primary/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <span className="text-xs text-text-muted">{record.audioFileName}</span>
            </div>
          </div>

          <div className="bg-dark-card rounded-xl border border-dark-border p-5">
            <h3 className="font-display font-semibold text-sm text-text-primary mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-primary" />
              BPM阶梯
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bpmChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#f5f5f5' }}
                    itemStyle={{ color: '#d97706' }}
                  />
                  <Area type="monotone" dataKey="bpmAvg" stroke="#d97706" fill="#d9770633" strokeWidth={2} />
                  {jumpPoints.map((point, idx) => (
                    <ReferenceDot
                      key={idx}
                      x={point.name}
                      y={point.bpmAvg}
                      r={5}
                      fill="#ef4444"
                      stroke="#ef4444"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {(speedTier?.tiers || []).map((tier) => (
                <div key={tier.tierIndex} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{tier.label}</span>
                  <span className="text-amber-primary font-medium">{tier.bpmRange[0]}-{tier.bpmRange[1]} BPM</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-dark-card rounded-xl border border-dark-border p-5">
            <h3 className="font-display font-semibold text-sm text-text-primary mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-primary" />
              节拍标记
            </h3>
            <div className="bg-dark-primary rounded-lg p-4 overflow-x-auto">
              <div className="flex items-end gap-0.5 min-w-[300px]">
                {beatMarkers?.markers?.slice(0, 80).map((marker, idx) => (
                  <div key={idx} className="relative flex flex-col items-center" style={{ width: '8px' }}>
                    {marker.type === 'rush' && (
                      <div className="absolute -top-4 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-conflict-red" />
                    )}
                    {marker.type === 'miss' && (
                      <div className="absolute -top-3.5 w-2 h-2 bg-pending-yellow rounded-sm" />
                    )}
                    <div
                      className={`w-full rounded-sm ${
                        marker.type === 'normal'
                          ? 'bg-amber-primary/50'
                          : marker.type === 'rush'
                          ? 'bg-conflict-red/60'
                          : 'bg-pending-yellow/40'
                      }`}
                      style={{ height: `${Math.abs(marker.deviation) > 0 ? Math.max(8, Math.min(40, Math.abs(marker.deviation) * 100)) : 8}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-amber-primary/50" /> 正常
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent border-b-conflict-red" /> 抢拍
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-pending-yellow rounded-sm" /> 漏拍
                </span>
              </div>
            </div>
            <div className="mt-3 text-xs text-text-secondary">
              检测BPM: <span className="text-amber-primary font-medium">{rhythmDetection?.detectedBPM ?? '-'}</span>
              <span className="mx-2">|</span>
              置信度: <span className="text-amber-primary font-medium">{rhythmDetection ? (rhythmDetection.confidenceScore * 100).toFixed(1) : '-'}%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'conflicts' && (
        <div>
          {conflicts.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无冲突记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  practiceId={id!}
                  onFlag={handleFlag}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'mapping' && (
        <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
          <div className="grid grid-cols-3 gap-0">
            <div className="p-4 border-b border-r border-dark-border">
              <h4 className="font-display font-semibold text-xs text-amber-primary uppercase tracking-wider">音频片段</h4>
            </div>
            <div className="p-4 border-b border-r border-dark-border">
              <h4 className="font-display font-semibold text-xs text-amber-primary uppercase tracking-wider">BPM区间</h4>
            </div>
            <div className="p-4 border-b border-dark-border">
              <h4 className="font-display font-semibold text-xs text-amber-primary uppercase tracking-wider">报告条目</h4>
            </div>
            {evidenceMapping.map((em) => (
              <>
                <div key={`a-${em.id}`} className="p-4 border-r border-dark-border border-b border-dark-border/50">
                  <div className="text-sm text-text-primary font-medium">{em.audioSegment.label}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {em.audioSegment.startTime}s - {em.audioSegment.endTime}s
                  </div>
                </div>
                <div key={`b-${em.id}`} className="p-4 border-r border-dark-border border-b border-dark-border/50">
                  <div className="text-sm text-text-primary font-medium">Tier {em.bpmTier.tierIndex}</div>
                  <div className="text-xs text-text-muted mt-1">
                    {em.bpmTier.bpmRange[0]}-{em.bpmTier.bpmRange[1]} BPM
                  </div>
                </div>
                <div key={`c-${em.id}`} className="p-4 border-b border-dark-border/50">
                  <div className="text-sm text-text-primary font-medium">{em.reportEntry.section}</div>
                  <div className="text-xs text-text-muted mt-1 line-clamp-2">{em.reportEntry.content}</div>
                </div>
              </>
            ))}
          </div>
          {evidenceMapping.length === 0 && (
            <div className="py-12 text-center text-text-muted text-sm">暂无证据对应关系</div>
          )}
        </div>
      )}

      {activeTab === 'corrections' && (
        <div>
          {corrections.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无修正记录</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-dark-border" />
              {corrections.map((correction) => (
                <div key={correction.id} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-[13px] top-1 w-3 h-3 rounded-full bg-amber-primary border-2 border-dark-primary" />
                  <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-text-muted">{correction.createdAt}</span>
                      <span className="text-xs text-amber-primary">{correction.operator}</span>
                    </div>
                    <div className="text-sm text-text-primary mb-2">
                      修正字段: <span className="font-medium">{correction.field}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="bg-conflict-red/15 text-conflict-red px-2 py-0.5 rounded">{correction.oldValue}</span>
                      <ChevronRight className="w-3 h-3 text-text-muted" />
                      <span className="bg-correction-green/15 text-correction-green px-2 py-0.5 rounded">{correction.newValue}</span>
                    </div>
                    <div className="text-xs text-text-secondary">原因: {correction.reason}</div>
                    {correction.linkedConflictId && (
                      <div className="mt-2 text-xs text-conflict-red">
                        关联冲突: {correction.linkedConflictId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
