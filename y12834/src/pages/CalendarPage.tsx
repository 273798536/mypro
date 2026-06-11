import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, UtensilsCrossed, AlertTriangle, Clock, Play, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { AnomalyOverview } from '../components/calendar/AnomalyOverview';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useFeedingStore } from '../store/useFeedingStore';
import { useSampleStore } from '../store/useSampleStore';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useReviewStore } from '../store/useReviewStore';
import type { AnomalySeverity, WorkflowRunStatus } from '../types';

/**
 * 日期格式化为 YYYY-MM-DD 字符串
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 工作流运行状态对应样式
 */
const runStatusStyle: Record<WorkflowRunStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-paper-dark',
    text: 'text-deep-ocean/70',
    icon: <Clock size={12} />,
  },
  running: {
    bg: 'bg-amber-warn/15',
    text: 'text-amber-warn',
    icon: <Play size={12} />,
  },
  completed: {
    bg: 'bg-life-green/15',
    text: 'text-life-green',
    icon: <CheckCircle2 size={12} />,
  },
  failed: {
    bg: 'bg-corral-severe/15',
    text: 'text-corral-severe',
    icon: <AlertTriangle size={12} />,
  },
};

/**
 * 投喂日历首页
 * 使用 AppLayout 三栏布局，右侧面板显示选中日期详情
 */
export function CalendarPage() {
  const navigate = useNavigate();

  /** 从各 store 读取数据 */
  const feedingRecords = useFeedingStore((s) => s.records);
  const samples = useSampleStore((s) => s.samples);
  const getSamplesByFeedingRecord = useSampleStore((s) => s.getSamplesByFeedingRecord);
  const recentRuns = useWorkflowStore((s) => s.getRecentRuns(5));
  const anomalies = useReviewStore((s) => s.anomalies);

  /** 当前选中的日期 */
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  /**
   * 计算有投喂记录的日期集合
   */
  const feedingDates = useMemo(() => {
    return new Set(feedingRecords.map((r) => r.date));
  }, [feedingRecords]);

  /**
   * 计算异常日期映射：日期 -> 该日期最高严重程度
   */
  const anomalyDates = useMemo(() => {
    const map = new Map<string, AnomalySeverity>();
    const severityOrder: Record<AnomalySeverity, number> = { high: 0, medium: 1, low: 2 };

    for (const anomaly of anomalies) {
      const sample = samples.find((s) => s.id === anomaly.sample_id);
      if (!sample) continue;

      const feeding = feedingRecords.find((f) => f.id === sample.feeding_record_id);
      if (!feeding) continue;

      const existing = map.get(feeding.date);
      if (!existing || severityOrder[anomaly.severity] < severityOrder[existing]) {
        map.set(feeding.date, anomaly.severity);
      }
    }
    return map;
  }, [anomalies, samples, feedingRecords]);

  /**
   * 计算异常概览统计数据
   */
  const anomalySummary = useMemo(() => {
    const missingMaterial = anomalies.filter(
      (a) => a.type === 'missing_material' && !a.resolved
    ).length;
    const incorrectSpec = anomalies.filter(
      (a) => a.type === 'incorrect_spec' && !a.resolved
    ).length;
    const pendingReview = anomalies.filter(
      (a) => (a.type === 'annotation_low_conflict' || a.type === 'species_synonym' || a.type === 'other') && !a.resolved
    ).length;
    return { missingMaterial, incorrectSpec, pendingReview };
  }, [anomalies]);

  /**
   * 获取选中日期的投喂记录和样本
   */
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedFeedings = useMemo(
    () => feedingRecords.filter((r) => r.date === selectedDateKey),
    [feedingRecords, selectedDateKey]
  );

  /**
   * 右侧面板内容：选中日期的投喂记录和样本列表
   */
  const rightPanel = useMemo(() => {
    if (selectedFeedings.length === 0) {
      return (
        <div className="p-6">
          <h3 className="font-serif font-semibold text-deep-ocean text-lg mb-4">
            {selectedDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </h3>
          <div className="text-center py-12 text-deep-ocean/40">
            <UtensilsCrossed size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">当日暂无投喂记录</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <h3 className="font-serif font-semibold text-deep-ocean text-lg">
          {selectedDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </h3>

        {selectedFeedings.map((feeding) => {
          const feedingSamples = getSamplesByFeedingRecord(feeding.id);
          return (
            <div key={feeding.id} className="space-y-3">
              {/* 投喂记录卡片 */}
              <div className="p-4 bg-paper-dark/50 rounded-lg border border-deep-ocean/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={16} className="text-deep-ocean/60" />
                    <span className="text-sm font-semibold text-deep-ocean">
                      实验组 {feeding.group_id}
                    </span>
                  </div>
                  <Badge variant="info">{feeding.researcher}</Badge>
                </div>
                <p className="text-xs text-deep-ocean/60 leading-relaxed">
                  {feeding.notes}
                </p>
              </div>

              {/* 样本列表 */}
              {feedingSamples.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-deep-ocean/60">
                    <FlaskConical size={12} />
                    关联样本 ({feedingSamples.length})
                  </div>
                  <div className="space-y-1.5">
                    {feedingSamples.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={() => navigate(`/samples/${sample.id}`)}
                        className="w-full text-left p-3 bg-white rounded-lg border border-deep-ocean/5 hover:border-deep-ocean/20 hover:shadow-soft transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-deep-ocean">
                              {sample.id}
                            </p>
                            <p className="text-xs text-deep-ocean/50 mt-0.5">
                              {sample.standard_species_name || sample.species_name}
                            </p>
                          </div>
                          <Badge variant="neutral">样本</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [selectedDate, selectedFeedings, getSamplesByFeedingRecord, navigate]);

  return (
    <AppLayout rightPanel={rightPanel} rightPanelWidth="w-96">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="font-serif font-bold text-deep-ocean text-2xl">投喂日历</h1>
          <p className="text-sm text-deep-ocean/50 mt-1">
            查看每日投喂记录、样本和异常检测情况
          </p>
        </div>

        {/* 异常概览三张卡片 */}
        <AnomalyOverview summary={anomalySummary} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左侧日历 */}
          <div className="lg:col-span-3">
            <CalendarGrid
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              feedingDates={feedingDates}
              anomalyDates={anomalyDates}
            />
          </div>

          {/* 右侧最近运行列表 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                最近运行
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/workflow')}
              >
                查看全部
              </Button>
            </div>

            <div className="space-y-3">
              {recentRuns.length === 0 ? (
                <Card className="p-8 text-center text-deep-ocean/40">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无运行记录</p>
                </Card>
              ) : (
                recentRuns.map((run) => {
                  const runAnomalies = anomalies.filter((a) => a.run_id === run.id);
                  const style = runStatusStyle[run.status];
                  return (
                    <Card
                      key={run.id}
                      hoverable
                      className="p-4"
                      onClick={() => navigate('/workflow')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-serif font-semibold text-deep-ocean">
                            {run.version_label}
                          </p>
                          <p className="text-xs text-deep-ocean/50 mt-0.5">
                            {new Date(run.started_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <Badge
                          className={`${style.bg} ${style.text}`}
                          variant="neutral"
                        >
                          <span className="flex items-center gap-1">
                            {style.icon}
                            {run.status === 'pending'
                              ? '等待中'
                              : run.status === 'running'
                              ? '运行中'
                              : run.status === 'completed'
                              ? '已完成'
                              : '失败'}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-deep-ocean/60">
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={12} className="text-corral-severe" />
                          {runAnomalies.length} 异常
                        </span>
                        <span className="flex items-center gap-1">
                          <FlaskConical size={12} />
                          模型 {run.model_version}
                        </span>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
