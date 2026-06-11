import { useState, useMemo } from 'react';
import {
  Workflow,
  Play,
  FlaskConical,
  Cpu,
  GitCompare,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Database,
  ArrowRight,
  Plus,
  Minus,
  Edit3,
  Save,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { useSampleStore } from '../store/useSampleStore';
import { useReviewStore } from '../store/useReviewStore';
import type { WorkflowRunStatus } from '../types';

/**
 * 运行状态对应样式
 */
const runStatusStyle: Record<
  WorkflowRunStatus,
  { bg: string; text: string; icon: React.ReactNode; label: string }
> = {
  pending: {
    bg: 'bg-paper-dark',
    text: 'text-deep-ocean/70',
    icon: <Clock size={14} />,
    label: '等待中',
  },
  running: {
    bg: 'bg-amber-warn/15',
    text: 'text-amber-warn',
    icon: <Play size={14} />,
    label: '运行中',
  },
  completed: {
    bg: 'bg-life-green/15',
    text: 'text-life-green',
    icon: <CheckCircle2 size={14} />,
    label: '已完成',
  },
  failed: {
    bg: 'bg-corral-severe/15',
    text: 'text-corral-severe',
    icon: <AlertTriangle size={14} />,
    label: '失败',
  },
};

/**
 * 运行配置面板组件
 */
function RunConfigPanel({
  onStart,
  disabled,
}: {
  onStart: (config: { modelVersion: string; groupFilter: string | null }) => void;
  disabled: boolean;
}) {
  const [modelVersion, setModelVersion] = useState('fish-path-v1.2.0');
  const [groupFilter, setGroupFilter] = useState<string>('');

  const modelVersions = [
    'fish-path-v1.2.0',
    'fish-path-v1.1.0',
    'fish-path-v1.0.0',
  ];
  const groups = ['', 'A', 'B', 'C', 'D'];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={18} className="text-deep-ocean" />
        <h3 className="font-serif font-semibold text-deep-ocean text-lg">运行配置</h3>
      </div>

      <div className="space-y-4">
        {/* 模型版本 */}
        <div>
          <label className="text-sm font-medium text-deep-ocean/70 mb-1.5 block">
            AI 模型版本
          </label>
          <select
            value={modelVersion}
            onChange={(e) => setModelVersion(e.target.value)}
            className="input-field"
            disabled={disabled}
          >
            {modelVersions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* 实验组过滤 */}
        <div>
          <label className="text-sm font-medium text-deep-ocean/70 mb-1.5 block">
            实验组过滤
          </label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="input-field"
            disabled={disabled}
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g === '' ? '全部实验组' : `实验组 ${g}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-deep-ocean/40 mt-1">
            选择实验组可只处理该组样本，留空处理全部
          </p>
        </div>

        {/* 启动按钮 */}
        <Button
          variant="primary"
          className="w-full"
          disabled={disabled}
          onClick={() =>
            onStart({
              modelVersion,
              groupFilter: groupFilter || null,
            })
          }
        >
          <span className="flex items-center justify-center gap-2">
            <Play size={16} />
            {disabled ? '运行中...' : '启动工作流'}
          </span>
        </Button>
      </div>
    </Card>
  );
}

/**
 * 工作流进度组件
 */
function WorkflowProgress({
  isRunning,
  progress,
  currentRun,
}: {
  isRunning: boolean;
  progress: number;
  currentRun: ReturnType<typeof useWorkflowStore.getState>['currentRun'];
}) {
  const steps = [
    { label: '数据加载', threshold: 10 },
    { label: '预处理', threshold: 25 },
    { label: 'AI 标注', threshold: 55 },
    { label: '异常检测', threshold: 85 },
    { label: '结果汇总', threshold: 100 },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Cpu size={18} className="text-deep-ocean" />
        <h3 className="font-serif font-semibold text-deep-ocean text-lg">
          {currentRun ? '当前运行' : '运行进度'}
        </h3>
      </div>

      {currentRun ? (
        <div className="space-y-4">
          {/* 运行信息 */}
          <div className="flex items-center justify-between">
            <span className="font-serif font-semibold text-deep-ocean">
              {currentRun.version_label}
            </span>
            <Badge
              className={`${runStatusStyle[currentRun.status].bg} ${runStatusStyle[currentRun.status].text}`}
              variant="neutral"
            >
              <span className="flex items-center gap-1">
                {runStatusStyle[currentRun.status].icon}
                {runStatusStyle[currentRun.status].label}
              </span>
            </Badge>
          </div>

          {/* 进度条 */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-deep-ocean/60">处理进度</span>
              <span className="font-semibold text-deep-ocean tabular">{progress}%</span>
            </div>
            <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isRunning
                    ? 'bg-amber-warn'
                    : currentRun.status === 'completed'
                    ? 'bg-life-green'
                    : 'bg-corral-severe'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const completed = progress >= step.threshold;
              return (
                <div key={step.label} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      completed
                        ? 'bg-life-green text-paper'
                        : 'bg-paper-dark text-deep-ocean/40'
                    }`}
                  >
                    {completed ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      completed ? 'text-life-green' : 'text-deep-ocean/40'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 详情 */}
          <div className="pt-3 border-t border-deep-ocean/5 grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-deep-ocean/60">
              <User size={12} />
              {currentRun.created_by}
            </div>
            <div className="flex items-center gap-1.5 text-deep-ocean/60">
              <Database size={12} />
              模型 {currentRun.model_version}
            </div>
            <div className="flex items-center gap-1.5 text-deep-ocean/60">
              <Clock size={12} />
              {new Date(currentRun.started_at).toLocaleTimeString('zh-CN')}
            </div>
            <div className="flex items-center gap-1.5 text-deep-ocean/60">
              <FlaskConical size={12} />
              {currentRun.group_filter ?? '全部实验组'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-deep-ocean/40">
          <Cpu size={36} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无运行中的任务</p>
          <p className="text-xs mt-0.5">配置参数后点击启动</p>
        </div>
      )}
    </Card>
  );
}

/**
 * 样本处理状态组件
 */
function SampleProcessingStatus({
  currentRunId,
}: {
  currentRunId: string | null;
}) {
  const samples = useSampleStore((s) => s.samples);
  const versions = useSampleStore((s) => s.versions);
  const anomalies = useReviewStore((s) => s.anomalies);

  const runVersions = currentRunId
    ? versions.filter((v) => v.run_id === currentRunId)
    : versions.slice(-15);

  const stats = useMemo(() => {
    const statusCount = {
      draft: 0,
      ai_reviewed: 0,
      human_corrected: 0,
      final: 0,
    };
    runVersions.forEach((v) => {
      statusCount[v.status]++;
    });
    return statusCount;
  }, [runVersions]);

  const total = runVersions.length || 1;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-deep-ocean" />
          <h3 className="font-serif font-semibold text-deep-ocean text-lg">样本处理状态</h3>
        </div>
        <Badge variant="info">{runVersions.length} 个样本</Badge>
      </div>

      {/* 状态统计条 */}
      <div className="h-3 rounded-full bg-paper-dark overflow-hidden flex mb-4">
        <div
          className="h-full bg-paper-dark/80"
          style={{ width: `${(stats.draft / total) * 100}%` }}
        />
        <div
          className="h-full bg-amber-warn"
          style={{ width: `${(stats.ai_reviewed / total) * 100}%` }}
        />
        <div
          className="h-full bg-deep-ocean"
          style={{ width: `${(stats.human_corrected / total) * 100}%` }}
        />
        <div
          className="h-full bg-life-green"
          style={{ width: `${(stats.final / total) * 100}%` }}
        />
      </div>

      {/* 图例 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center">
          <div className="w-3 h-3 rounded bg-paper-dark/80 mx-auto mb-1" />
          <p className="text-xs text-deep-ocean/60">草稿 {stats.draft}</p>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 rounded bg-amber-warn mx-auto mb-1" />
          <p className="text-xs text-deep-ocean/60">AI复核 {stats.ai_reviewed}</p>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 rounded bg-deep-ocean mx-auto mb-1" />
          <p className="text-xs text-deep-ocean/60">人工修正 {stats.human_corrected}</p>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 rounded bg-life-green mx-auto mb-1" />
          <p className="text-xs text-deep-ocean/60">最终版 {stats.final}</p>
        </div>
      </div>

      {/* 样本列表 */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
        {runVersions.slice(0, 10).map((version) => {
          const sample = samples.find((s) => s.id === version.sample_id);
          const sampleAnomalies = anomalies.filter(
            (a) => a.sample_id === version.sample_id && a.run_id === version.run_id
          );
          return (
            <div
              key={version.id}
              className="flex items-center justify-between p-2 bg-paper-dark/30 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-deep-ocean">
                  {sample?.id || version.sample_id}
                </p>
                <p className="text-xs text-deep-ocean/50">
                  {sample?.standard_species_name || sample?.species_name || '未知物种'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {sampleAnomalies.length > 0 && (
                  <Badge variant="warn">
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {sampleAnomalies.length}
                    </span>
                  </Badge>
                )}
                <Badge
                  variant={
                    version.status === 'final'
                      ? 'success'
                      : version.status === 'human_corrected'
                      ? 'info'
                      : version.status === 'ai_reviewed'
                      ? 'warn'
                      : 'neutral'
                  }
                >
                  v{version.version_number}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * 版本对比视图组件
 */
function VersionCompareView({
  runs,
}: {
  runs: ReturnType<typeof useWorkflowStore.getState>['runs'];
}) {
  const [runId1, setRunId1] = useState(runs[0]?.id || '');
  const [runId2, setRunId2] = useState(runs[1]?.id || '');
  const compareRuns = useWorkflowStore((s) => s.compareRuns);

  const result = runId1 && runId2 ? compareRuns(runId1, runId2) : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare size={18} className="text-deep-ocean" />
        <h3 className="font-serif font-semibold text-deep-ocean text-lg">版本对比</h3>
      </div>

      {/* 版本选择 */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <select
            value={runId1}
            onChange={(e) => setRunId1(e.target.value)}
            className="input-field text-sm flex-1"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.version_label}
              </option>
            ))}
          </select>
          <ArrowRight size={16} className="text-deep-ocean/40" />
          <select
            value={runId2}
            onChange={(e) => setRunId2(e.target.value)}
            className="input-field text-sm flex-1"
          >
            {runs
              .filter((r) => r.id !== runId1)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version_label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {result ? (
        <div className="space-y-3">
          {/* 指标对比 */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-paper-dark/50 rounded-lg">
              <p className="text-2xl font-serif font-bold text-deep-ocean tabular">
                {result.metrics.run1.totalSamples}
              </p>
              <p className="text-xs text-deep-ocean/50">基准样本数</p>
            </div>
            <div className="p-3 bg-paper-dark/50 rounded-lg">
              <p className="text-2xl font-serif font-bold text-deep-ocean tabular">
                {result.metrics.run2.totalSamples}
              </p>
              <p className="text-xs text-deep-ocean/50">对比样本数</p>
            </div>
            <div className="p-3 bg-paper-dark/50 rounded-lg">
              <p
                className={`text-2xl font-serif font-bold tabular ${
                  result.metrics.run2.totalAnomalies > result.metrics.run1.totalAnomalies
                    ? 'text-corral-severe'
                    : 'text-life-green'
                }`}
              >
                {result.metrics.run2.totalAnomalies - result.metrics.run1.totalAnomalies > 0
                  ? '+'
                  : ''}
                {result.metrics.run2.totalAnomalies - result.metrics.run1.totalAnomalies}
              </p>
              <p className="text-xs text-deep-ocean/50">异常变化</p>
            </div>
          </div>

          {/* 差异统计 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-2 bg-life-green/5 rounded-lg">
              <span className="text-sm text-deep-ocean/70 flex items-center gap-1">
                <Plus size={14} className="text-life-green" />
                新增样本
              </span>
              <Badge variant="success">{result.samples.added.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-corral-severe/5 rounded-lg">
              <span className="text-sm text-deep-ocean/70 flex items-center gap-1">
                <Minus size={14} className="text-corral-severe" />
                移除样本
              </span>
              <Badge variant="danger">{result.samples.removed.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-deep-ocean/5 rounded-lg">
              <span className="text-sm text-deep-ocean/70 flex items-center gap-1">
                <Edit3 size={14} className="text-deep-ocean" />
                修改样本
              </span>
              <Badge variant="info">{result.samples.modified.length}</Badge>
            </div>
          </div>

          {/* 标注变化 */}
          <div className="pt-2 border-t border-deep-ocean/5">
            <p className="text-xs text-deep-ocean/60 mb-2">标注变化</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold text-life-green tabular">
                  +{result.annotations.added.length}
                </p>
                <p className="text-xs text-deep-ocean/50">新增</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-corral-severe tabular">
                  -{result.annotations.removed.length}
                </p>
                <p className="text-xs text-deep-ocean/50">移除</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-deep-ocean tabular">
                  {result.annotations.modified.length}
                </p>
                <p className="text-xs text-deep-ocean/50">修改</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-deep-ocean/40">
          <GitCompare size={36} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">选择两个版本进行对比</p>
        </div>
      )}
    </Card>
  );
}

/**
 * 人工修正面板组件
 */
function HumanCorrectionPanel() {
  const [fieldName, setFieldName] = useState('label');
  const [oldValue, setOldValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const applyHumanCorrection = useWorkflowStore((s) => s.applyHumanCorrection);
  const versions = useSampleStore((s) => s.versions);

  const [selectedVersionId, setSelectedVersionId] = useState(versions[0]?.id || '');

  const handleApply = () => {
    if (!selectedVersionId || !oldValue || !newValue) return;
    applyHumanCorrection(
      selectedVersionId,
      [{ fieldName, oldValue, newValue, reason }],
      'current_user'
    );
    setOldValue('');
    setNewValue('');
    setReason('');
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <User size={18} className="text-deep-ocean" />
        <h3 className="font-serif font-semibold text-deep-ocean text-lg">人工修正面板</h3>
      </div>

      <div className="space-y-3">
        {/* 选择版本 */}
        <div>
          <label className="text-xs font-medium text-deep-ocean/60 mb-1 block">
            样本版本
          </label>
          <select
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="input-field text-sm"
          >
            {versions.slice(-10).map((v) => (
              <option key={v.id} value={v.id}>
                {v.sample_id} - v{v.version_number}
              </option>
            ))}
          </select>
        </div>

        {/* 字段 */}
        <div>
          <label className="text-xs font-medium text-deep-ocean/60 mb-1 block">
            修正字段
          </label>
          <select
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            className="input-field text-sm"
          >
            <option value="label">标注标签</option>
            <option value="confidence">置信度</option>
            <option value="bbox">标注框位置</option>
            <option value="species">物种名称</option>
          </select>
        </div>

        {/* 旧值 */}
        <div>
          <label className="text-xs font-medium text-deep-ocean/60 mb-1 block">
            原始值
          </label>
          <input
            type="text"
            value={oldValue}
            onChange={(e) => setOldValue(e.target.value)}
            placeholder="输入原始值..."
            className="input-field text-sm"
          />
        </div>

        {/* 新值 */}
        <div>
          <label className="text-xs font-medium text-deep-ocean/60 mb-1 block">
            修正值
          </label>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="输入修正值..."
            className="input-field text-sm"
          />
        </div>

        {/* 原因 */}
        <div>
          <label className="text-xs font-medium text-deep-ocean/60 mb-1 block">
            修正原因
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="说明修正原因..."
            className="input-field text-sm min-h-16 resize-none"
          />
        </div>

        {/* 提交按钮 */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleApply}
          disabled={!oldValue || !newValue}
        >
          <span className="flex items-center justify-center gap-2">
            <Save size={16} />
            提交修正
          </span>
        </Button>
      </div>
    </Card>
  );
}

/**
 * AI/ML 工作流页
 * 左侧：RunConfigPanel + WorkflowProgress
 * 中间：样本处理状态
 * 右侧：VersionCompareView
 * 下方：HumanCorrectionPanel
 */
export function WorkflowPage() {
  const runs = useWorkflowStore((s) => s.runs);
  const currentRun = useWorkflowStore((s) => s.currentRun);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const runProgress = useWorkflowStore((s) => s.runProgress);
  const startRun = useWorkflowStore((s) => s.startRun);

  const handleStart = (config: { modelVersion: string; groupFilter: string | null }) => {
    startRun({
      ...config,
      createdBy: 'current_user',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="font-serif font-bold text-deep-ocean text-2xl flex items-center gap-2">
            <Workflow size={24} />
            AI/ML 工作流
          </h1>
          <p className="text-sm text-deep-ocean/50 mt-1">
            配置运行参数、查看处理进度、对比版本差异
          </p>
        </div>

        {/* 主体三栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧：配置 + 进度 */}
          <div className="lg:col-span-3 space-y-6">
            <RunConfigPanel onStart={handleStart} disabled={isRunning} />
            <WorkflowProgress
              isRunning={isRunning}
              progress={runProgress}
              currentRun={currentRun}
            />
          </div>

          {/* 中间：样本处理状态 */}
          <div className="lg:col-span-5">
            <SampleProcessingStatus currentRunId={currentRun?.id ?? null} />
          </div>

          {/* 右侧：版本对比 */}
          <div className="lg:col-span-4">
            <VersionCompareView runs={runs} />
          </div>
        </div>

        {/* 下方：人工修正面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <HumanCorrectionPanel />
          </div>
          <div className="lg:col-span-1">
            <Card className="p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={18} className="text-deep-ocean" />
                <h3 className="font-serif font-semibold text-deep-ocean text-lg">
                  修正提示
                </h3>
              </div>
              <div className="space-y-3 text-sm text-deep-ocean/70">
                <p className="leading-relaxed">
                  人工修正将记录在修正日志中，用于后续审计和模型训练反馈。
                </p>
                <ul className="space-y-2 text-xs text-deep-ocean/60 pl-4 list-disc">
                  <li>修正操作不可撤销，请确认后提交</li>
                  <li>详细的修正原因有助于模型迭代</li>
                  <li>建议先在样本详情页预览后再批量修正</li>
                  <li>所有修正都会关联到当前用户身份</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
