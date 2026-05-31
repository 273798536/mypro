import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Target,
  Music2,
  Zap,
  History,
  ArrowRight,
  Check,
  X,
  Eye,
  FileEdit,
  PlayCircle,
} from 'lucide-react';
import { useStore } from '@/store';
import { FAILURE_TYPE_LABELS, TIER_STATUS_LABELS } from '@/types';
import { generateSpeedTiers, evaluate } from '@/engine/evaluate';

export default function ReviewPage() {
  const navigate = useNavigate();
  const {
    samples,
    selectedSampleId,
    sessions,
    tierResults,
    failures,
    corrections,
    ladders,
    scores,
    measures,
    suggestions,
    selectedSessionId,
    selectSession,
    getSessionsForSample,
    getTierResultsForSession,
    getFailuresForTierResult,
    getCorrectionsForSession,
    selectSample,
  } = useStore();

  const [compareSessionId, setCompareSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'compare'>('overview');

  const selectedSample = samples.find((s) => s.id === selectedSampleId);
  const sampleSessions = selectedSampleId ? getSessionsForSample(selectedSampleId) : [];
  const ladder = selectedSample ? ladders.find((l) => l.id === selectedSample.ladderId) : null;
  const score = selectedSample ? scores.find((sc) => sc.id === selectedSample.scoreId) : null;
  const scoreMeasures = score ? measures.filter((m) => m.scoreId === score.id) : [];
  const tiers = useMemo(() => (ladder ? generateSpeedTiers(ladder) : []), [ladder]);

  const sampleSuggestions = suggestions.filter((s) => s.sampleId === selectedSampleId);

  const chartData = useMemo(() => {
    if (!selectedSessionId) return [];
    const results = getTierResultsForSession(selectedSessionId);
    const sessionCorrections = getCorrectionsForSession(selectedSessionId);
    const sessionFailures = results.flatMap((tr) => getFailuresForTierResult(tr.id));

    if (ladder) {
      const input = {
        failures: sessionFailures,
        ladder,
        corrections: sessionCorrections,
        tierResults: results,
      };
      const evalResult = evaluate(input);

      return tiers.map((tier) => {
        const result = results.find((r) => r.bpm === tier.bpm);
        const status = result ? evalResult.tierStatuses[result.id] || result.passStatus : 'pending';
        const tierFailures = result ? getFailuresForTierResult(result.id) : [];
        return {
          bpm: tier.bpm,
          status: TIER_STATUS_LABELS[status as keyof typeof TIER_STATUS_LABELS] || status,
          pass: status === 'pass' ? 100 : status === 'fail' ? 0 : 50,
          failures: tierFailures.length,
          hasReview: status === 'review',
        };
      });
    }
    return [];
  }, [selectedSessionId, tiers, getTierResultsForSession, getFailuresForTierResult, getCorrectionsForSession, ladder]);

  const failureMeasureData = useMemo(() => {
    if (!selectedSessionId) return [];
    const results = getTierResultsForSession(selectedSessionId);
    const sessionFailures = results.flatMap((tr) => getFailuresForTierResult(tr.id));

    const measureCounts = new Map<number, { measure: number; count: number; types: string[] }>();
    sessionFailures.forEach((f) => {
      const existing = measureCounts.get(f.measureNumber) || {
        measure: f.measureNumber,
        count: 0,
        types: [],
      };
      existing.count++;
      if (!existing.types.includes(f.failureType)) {
        existing.types.push(f.failureType);
      }
      measureCounts.set(f.measureNumber, existing);
    });

    return scoreMeasures
      .map((m) => measureCounts.get(m.measureNumber) || { measure: m.measureNumber, count: 0, types: [] })
      .sort((a, b) => a.measure - b.measure);
  }, [selectedSessionId, getTierResultsForSession, getFailuresForTierResult, scoreMeasures]);

  const sessionMetrics = useMemo(() => {
    if (!selectedSessionId) return null;
    const results = getTierResultsForSession(selectedSessionId);
    const sessionFailures = results.flatMap((tr) => getFailuresForTierResult(tr.id));
    const sessionCorrections = getCorrectionsForSession(selectedSessionId);

    const passCount = results.filter((r) => r.passStatus === 'pass').length;
    const failCount = results.filter((r) => r.passStatus === 'fail').length;
    const maxPassedBpm =
      passCount > 0
        ? Math.max(...results.filter((r) => r.passStatus === 'pass').map((r) => r.bpm))
        : 0;

    const typeCounts = new Map<string, number>();
    sessionFailures.forEach((f) => {
      typeCounts.set(f.failureType, (typeCounts.get(f.failureType) || 0) + 1);
    });

    return {
      totalTiers: tiers.length,
      completedTiers: results.length,
      passCount,
      failCount,
      maxPassedBpm,
      failureTypeCounts: typeCounts,
      totalFailures: sessionFailures.length,
      totalCorrections: sessionCorrections.length,
    };
  }, [selectedSessionId, getTierResultsForSession, getFailuresForTierResult, getCorrectionsForSession, tiers]);

  if (!selectedSampleId || !selectedSample) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">复盘看板</h1>
          <p className="text-text-muted mt-1">查看练习历史、速度阶梯趋势、对比分析</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {samples.map((sample) => {
            const s = scores.find((sc) => sc.id === sample.scoreId);
            const l = ladders.find((la) => la.id === sample.ladderId);
            const sampleSess = getSessionsForSample(sample.id);
            return (
              <div
                key={sample.id}
                onClick={() => {
                  selectSample(sample.id);
                  if (sampleSess.length > 0) {
                    selectSession(sampleSess[0].id);
                  }
                }}
                className="bg-bg-secondary rounded-xl p-4 cursor-pointer hover:bg-accent-secondary/10 transition-all border-2 border-transparent hover:border-accent-secondary"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white font-semibold">{sample.studentName}</div>
                  <Eye className="w-4 h-4 text-accent-primary" />
                </div>
                <div className="text-text-secondary text-sm">鼓谱：{s?.name}</div>
                <div className="text-text-secondary text-sm">
                  阶梯：{l?.startBpm}-{l?.endBpm} BPM
                </div>
                <div className="text-text-muted text-xs mt-2">
                  {sampleSess.length} 次练习 • {new Date(sample.date).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">复盘看板</h1>
          <p className="text-text-muted mt-1">
            {selectedSample.studentName} • {score?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-accent-secondary/20'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            总览
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-accent-secondary/20'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            历史
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'compare'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-accent-secondary/20'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            对比
          </button>
        </div>
      </div>

      {sampleSessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sampleSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => selectSession(session.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedSessionId === session.id
                  ? 'bg-accent-primary text-white shadow-glow-sm'
                  : 'bg-bg-secondary text-text-secondary hover:bg-accent-secondary/20'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              版本 {session.version}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'overview' && selectedSessionId && sessionMetrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-text-muted">已通过</span>
              </div>
              <div className="text-3xl font-bold text-white">{sessionMetrics.passCount}</div>
              <div className="text-text-secondary text-sm">/ {sessionMetrics.totalTiers} 档</div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-text-muted">失败</span>
              </div>
              <div className="text-3xl font-bold text-white">{sessionMetrics.failCount}</div>
              <div className="text-text-secondary text-sm">{sessionMetrics.totalFailures} 次失败标记</div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent-primary/20 rounded-lg">
                  <Zap className="w-5 h-5 text-accent-primary" />
                </div>
                <span className="text-text-muted">最高通过速度</span>
              </div>
              <div className="text-3xl font-bold text-white font-mono">
                {sessionMetrics.maxPassedBpm || '-'}
              </div>
              <div className="text-text-secondary text-sm">BPM</div>
            </div>
            <div className="bg-bg-secondary rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <FileEdit className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-text-muted">错拍修正</span>
              </div>
              <div className="text-3xl font-bold text-white">{sessionMetrics.totalCorrections}</div>
              <div className="text-text-secondary text-sm">次补录</div>
            </div>
          </div>

          {sampleSuggestions.length > 0 && (
            <div className="bg-bg-secondary rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-primary" />
                练习建议
                {sessionMetrics.totalCorrections > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                    已根据修正更新
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sampleSuggestions.map((sugg) => (
                  <div key={sugg.id} className="bg-bg-panel/50 rounded-lg p-4">
                    <div className="text-text-secondary text-sm mb-2">推荐速度</div>
                    <div className="text-4xl font-bold text-accent-primary font-mono mb-2">
                      {sugg.recommendedBpm}
                    </div>
                    <div className="text-text-secondary text-sm mb-2">重点小节</div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {sugg.focusMeasures.length > 0 ? (
                        sugg.focusMeasures.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm"
                          >
                            #{m}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-muted text-sm">无</span>
                      )}
                    </div>
                    <div className="text-text-muted text-sm">{sugg.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-bg-secondary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">速度阶梯曲线</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16213e" />
                  <XAxis dataKey="bpm" stroke="#718096" />
                  <YAxis yAxisId="left" stroke="#718096" />
                  <YAxis yAxisId="right" orientation="right" stroke="#718096" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16213e',
                      border: '1px solid #533483',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="pass"
                    name="通过率"
                    fill="#e94560"
                    fillOpacity={0.3}
                    stroke="#e94560"
                  />
                  <Bar yAxisId="right" dataKey="failures" name="失败次数" fill="#533483" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">小节失败统计</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failureMeasureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16213e" />
                  <XAxis dataKey="measure" stroke="#718096" label={{ value: '小节', fill: '#718096' }} />
                  <YAxis stroke="#718096" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16213e',
                      border: '1px solid #533483',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" name="失败次数" fill="#e94560" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">交叉跳转导航</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/setup')}
                className="p-4 bg-bg-panel/50 rounded-lg text-left hover:bg-accent-secondary/20 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">样本</div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="text-text-muted text-sm mt-1">
                  共 {samples.length} 个样本
                </div>
              </button>
              <button
                onClick={() => {}}
                className="p-4 bg-bg-panel/50 rounded-lg text-left hover:bg-accent-secondary/20 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">版本</div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="text-text-muted text-sm mt-1">
                  共 {sampleSessions.length} 个版本
                </div>
              </button>
              <button
                onClick={() => navigate('/correction')}
                className="p-4 bg-bg-panel/50 rounded-lg text-left hover:bg-accent-secondary/20 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">修正</div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="text-text-muted text-sm mt-1">
                  共 {corrections.length} 条修正
                </div>
              </button>
              <button
                onClick={() => {}}
                className="p-4 bg-bg-panel/50 rounded-lg text-left hover:bg-accent-secondary/20 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">指标</div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="text-text-muted text-sm mt-1">
                  通过率 {(sessionMetrics.passCount / Math.max(1, sessionMetrics.completedTiers) * 100).toFixed(1)}%
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-bg-secondary rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">练习历史</h3>
          <div className="space-y-3">
            {sampleSessions.map((session, idx) => {
              const results = getTierResultsForSession(session.id);
              const passCount = results.filter((r) => r.passStatus === 'pass').length;
              const maxBpm = passCount > 0
                ? Math.max(...results.filter((r) => r.passStatus === 'pass').map((r) => r.bpm))
                : 0;
              const sessionCorrections = getCorrectionsForSession(session.id);
              return (
                <div
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                    selectedSessionId === session.id
                      ? 'bg-accent-primary/20 border border-accent-primary'
                      : 'bg-bg-panel/50 hover:bg-accent-secondary/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-secondary/30 rounded-full flex items-center justify-center font-bold text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">版本 {session.version}</div>
                      <div className="text-text-muted text-sm">
                        {new Date(session.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{passCount}</div>
                      <div className="text-text-muted text-xs">通过</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent-primary font-mono">
                        {maxBpm}
                      </div>
                      <div className="text-text-muted text-xs">最高 BPM</div>
                    </div>
                    {sessionCorrections.length > 0 && (
                      <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">
                        有修正
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-text-secondary mb-2 text-sm">选择版本 A</label>
              <select
                value={selectedSessionId || ''}
                onChange={(e) => selectSession(e.target.value || null)}
                className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30"
              >
                <option value="">请选择</option>
                {sampleSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    版本 {s.version}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-text-secondary mb-2 text-sm">选择版本 B</label>
              <select
                value={compareSessionId || ''}
                onChange={(e) => setCompareSessionId(e.target.value || null)}
                className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30"
              >
                <option value="">请选择</option>
                {sampleSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    版本 {s.version}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSessionId && compareSessionId && (
            <div className="grid grid-cols-2 gap-6">
              {[selectedSessionId, compareSessionId].map((sid, idx) => {
                const session = sessions.find((s) => s.id === sid);
                const results = getTierResultsForSession(sid);
                const passCount = results.filter((r) => r.passStatus === 'pass').length;
                const maxBpm = passCount > 0
                  ? Math.max(...results.filter((r) => r.passStatus === 'pass').map((r) => r.bpm))
                  : 0;
                const sessionFailures = results.flatMap((tr) => getFailuresForTierResult(tr.id));
                const sessionCorrections = getCorrectionsForSession(sid);

                return (
                  <div
                    key={sid}
                    className={`bg-bg-secondary rounded-xl p-6 ${
                      idx === 0 ? 'border-l-4 border-accent-primary' : 'border-l-4 border-accent-secondary'
                    }`}
                  >
                    <div className="text-lg font-semibold text-white mb-4">
                      版本 {session?.version}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-3xl font-bold text-white">{passCount}</div>
                        <div className="text-text-muted text-sm">通过档位</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-accent-primary font-mono">{maxBpm}</div>
                        <div className="text-text-muted text-sm">最高 BPM</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-red-400">{sessionFailures.length}</div>
                        <div className="text-text-muted text-sm">失败次数</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-yellow-400">{sessionCorrections.length}</div>
                        <div className="text-text-muted text-sm">错拍修正</div>
                      </div>
                    </div>
                    <div className="text-xs text-text-muted">
                      {new Date(session?.createdAt || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
