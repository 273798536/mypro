import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSnapshotStore } from '@/store/snapshotStore';
import { getStepsBySnapshotId } from '@/data/steps';
import { StatusBadge, GrayErrorBadge, ChangeTypeBadge, JudgmentBadge } from '@/components/StatusBadge';
import { formatDateTime } from '@/utils/date';
import type { Step } from '@/types';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Layers,
  User,
  Clock,
} from 'lucide-react';

const ComparePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const leftId = searchParams.get('left');
  const rightId = searchParams.get('right');

  const { snapshots, notes, judgments } = useSnapshotStore();

  const [leftSnapshotId, setLeftSnapshotId] = useState(leftId || '');
  const [rightSnapshotId, setRightSnapshotId] = useState(rightId || '');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const leftSnapshot = snapshots.find((s) => s.id === leftSnapshotId);
  const rightSnapshot = snapshots.find((s) => s.id === rightSnapshotId);
  const leftSteps = getStepsBySnapshotId(leftSnapshotId);
  const rightSteps = getStepsBySnapshotId(rightSnapshotId);
  const leftNotes = notes[leftSnapshotId] || [];
  const rightNotes = notes[rightSnapshotId] || [];
  const leftJudgment = judgments[leftSnapshotId]?.[0] || null;
  const rightJudgment = judgments[rightSnapshotId]?.[0] || null;

  const toggleStep = (stepKey: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) {
        next.delete(stepKey);
      } else {
        next.add(stepKey);
      }
      return next;
    });
  };

  const stepComparison = useMemo(() => {
    if (!leftSnapshotId || !rightSnapshotId) return [];

    const leftStepMap = new Map(leftSteps.map((s) => [s.stepName, s]));
    const rightStepMap = new Map(rightSteps.map((s) => [s.stepName, s]));

    const allStepNames = new Set([...leftStepMap.keys(), ...rightStepMap.keys()]);

    const result: {
      name: string;
      leftStep: Step | null;
      rightStep: Step | null;
      status: 'added' | 'removed' | 'modified' | 'same';
      paramDiffs: { key: string; left: any; right: any }[];
    }[] = [];

    for (const name of allStepNames) {
      const leftStep = leftStepMap.get(name) || null;
      const rightStep = rightStepMap.get(name) || null;

      let status: 'added' | 'removed' | 'modified' | 'same' = 'same';
      if (!leftStep && rightStep) {
        status = 'added';
      } else if (leftStep && !rightStep) {
        status = 'removed';
      } else if (leftStep && rightStep) {
        const leftKeys = Object.keys(leftStep.parameters);
        const rightKeys = Object.keys(rightStep.parameters);
        const allKeys = new Set([...leftKeys, ...rightKeys]);

        const hasDiff = Array.from(allKeys).some(
          (key) =>
            JSON.stringify(leftStep.parameters[key]) !==
            JSON.stringify(rightStep.parameters[key])
        );

        if (hasDiff) {
          status = 'modified';
        }
      }

      const paramDiffs: { key: string; left: any; right: any }[] = [];
      if (leftStep && rightStep) {
        const allKeys = new Set([
          ...Object.keys(leftStep.parameters),
          ...Object.keys(rightStep.parameters),
        ]);
        for (const key of allKeys) {
          const leftVal = leftStep.parameters[key];
          const rightVal = rightStep.parameters[key];
          if (JSON.stringify(leftVal) !== JSON.stringify(rightVal)) {
            paramDiffs.push({ key, left: leftVal, right: rightVal });
          }
        }
      }

      result.push({ name, leftStep, rightStep, status, paramDiffs });
    }

    return result;
  }, [leftSnapshotId, rightSnapshotId, leftSteps, rightSteps]);

  const changeCount = stepComparison.filter((s) => s.status !== 'same').length;

  const renderStepIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <Plus className="w-4 h-4 text-emerald-500" />;
      case 'removed':
        return <Minus className="w-4 h-4 text-red-500" />;
      case 'modified':
        return <ArrowLeftRight className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-300" />;
    }
  };

  if (!leftSnapshotId || !rightSnapshotId) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">版本对比</h1>
          <p className="text-slate-500 mt-1">选择两个快照进行版本对比</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                左侧快照
              </label>
              <select
                value={leftSnapshotId}
                onChange={(e) => setLeftSnapshotId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">请选择快照</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                右侧快照
              </label>
              <select
                value={rightSnapshotId}
                onChange={(e) => setRightSnapshotId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">请选择快照</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← 返回列表页选择快照对比
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">版本对比</h1>
            <p className="text-slate-500 mt-1">
              共 {stepComparison.length} 个步骤，{changeCount} 处差异
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLeftSnapshotId('');
                setRightSnapshotId('');
              }}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              重新选择
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`bg-white rounded-xl border-2 p-5 shadow-sm ${
            leftSnapshot?.hasGrayError ? 'border-red-300' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">左侧</p>
              <h3 className="font-semibold text-slate-900">{leftSnapshot?.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {leftSnapshot?.hasGrayError && <GrayErrorBadge hasError={true} size="sm" />}
              <StatusBadge status={leftSnapshot!.status} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Layers className="w-4 h-4" />
              {leftSnapshot?.modelVersion}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="w-4 h-4" />
              {leftSnapshot?.createdBy}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {leftSnapshot && formatDateTime(leftSnapshot.createdAt)}
            </span>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl border-2 p-5 shadow-sm ${
            rightSnapshot?.hasGrayError ? 'border-red-300' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">右侧</p>
              <h3 className="font-semibold text-slate-900">{rightSnapshot?.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {rightSnapshot?.hasGrayError && <GrayErrorBadge hasError={true} size="sm" />}
              <StatusBadge status={rightSnapshot!.status} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Layers className="w-4 h-4" />
              {rightSnapshot?.modelVersion}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="w-4 h-4" />
              {rightSnapshot?.createdBy}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {rightSnapshot && formatDateTime(rightSnapshot.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            步骤差异对比
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {stepComparison.map((item, index) => {
            const stepKey = `step-${index}`;
            const isExpanded = expandedSteps.has(stepKey);

            return (
              <div
                key={stepKey}
                className={`${
                  item.status !== 'same' ? 'bg-blue-50/30' : ''
                }`}
              >
                <div
                  className="grid grid-cols-12 gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleStep(stepKey)}
                >
                  <div className="col-span-1 flex items-center gap-2">
                    {renderStepIcon(item.status)}
                    <span className="text-sm font-medium text-slate-500">
                      {index + 1}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <div className="font-medium text-slate-900">
                      {item.leftStep?.stepName || item.name}
                    </div>
                    {item.leftStep && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.leftStep.description}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-center">
                    {item.status === 'modified' && (
                      <ArrowRight className="w-5 h-5 text-blue-500" />
                    )}
                    {item.status === 'added' && (
                      <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
                        新增
                      </span>
                    )}
                    {item.status === 'removed' && (
                      <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                        移除
                      </span>
                    )}
                    {item.status === 'same' && (
                      <span className="text-xs text-slate-400">无变化</span>
                    )}
                  </div>
                  <div className="col-span-4">
                    <div className="font-medium text-slate-900">
                      {item.rightStep?.stepName || item.name}
                    </div>
                    {item.rightStep && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.rightStep.description}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 px-4 pb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">
                          左侧参数
                        </h4>
                        {item.leftStep ? (
                          <div className="space-y-2">
                            {Object.entries(item.leftStep.parameters).map(([key, value]) => {
                              const isDiff = item.paramDiffs.some((d) => d.key === key);
                              return (
                                <div
                                  key={key}
                                  className={`text-xs ${
                                    isDiff ? 'bg-red-50 -mx-2 px-2 py-1 rounded' : ''
                                  }`}
                                >
                                  <span className="text-slate-500 font-mono">{key}:</span>{' '}
                                  <span
                                    className={`font-mono ${
                                      isDiff ? 'text-red-700 font-medium' : 'text-slate-700'
                                    }`}
                                  >
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">此步骤不存在</p>
                        )}
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">
                          右侧参数
                        </h4>
                        {item.rightStep ? (
                          <div className="space-y-2">
                            {Object.entries(item.rightStep.parameters).map(([key, value]) => {
                              const isDiff = item.paramDiffs.some((d) => d.key === key);
                              return (
                                <div
                                  key={key}
                                  className={`text-xs ${
                                    isDiff ? 'bg-emerald-50 -mx-2 px-2 py-1 rounded' : ''
                                  }`}
                                >
                                  <span className="text-slate-500 font-mono">{key}:</span>{' '}
                                  <span
                                    className={`font-mono ${
                                      isDiff ? 'text-emerald-700 font-medium' : 'text-slate-700'
                                    }`}
                                  >
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">此步骤不存在</p>
                        )}
                      </div>
                    </div>

                    {item.paramDiffs.length > 0 && (
                      <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          差异参数 ({item.paramDiffs.length})
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {item.paramDiffs.map((diff) => (
                            <div key={diff.key} className="bg-white rounded p-2">
                              <p className="text-slate-500 font-mono mb-1">{diff.key}</p>
                              <div className="flex items-center gap-1">
                                <span className="text-red-600 font-mono">
                                  {Array.isArray(diff.left)
                                    ? diff.left.join(', ')
                                    : String(diff.left)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-300" />
                                <span className="text-emerald-600 font-mono">
                                  {Array.isArray(diff.right)
                                    ? diff.right.join(', ')
                                    : String(diff.right)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">左侧 - 人工判断</h2>
          </div>
          <div className="p-5">
            {leftJudgment ? (
              <div>
                <JudgmentBadge result={leftJudgment.result} />
                <p className="text-sm text-slate-700 mt-3">{leftJudgment.comment}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                  <User className="w-3.5 h-3.5" />
                  {leftJudgment.judgedBy}
                  <Clock className="w-3.5 h-3.5 ml-2" />
                  {formatDateTime(leftJudgment.judgedAt)}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  关联模型版本：{leftJudgment.modelVersion}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无判断</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">右侧 - 人工判断</h2>
          </div>
          <div className="p-5">
            {rightJudgment ? (
              <div>
                <JudgmentBadge result={rightJudgment.result} />
                <p className="text-sm text-slate-700 mt-3">{rightJudgment.comment}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                  <User className="w-3.5 h-3.5" />
                  {rightJudgment.judgedBy}
                  <Clock className="w-3.5 h-3.5 ml-2" />
                  {formatDateTime(rightJudgment.judgedAt)}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  关联模型版本：{rightJudgment.modelVersion}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无判断</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">
              左侧 - 备注 ({leftNotes.length})
            </h2>
          </div>
          <div className="p-5 max-h-64 overflow-y-auto">
            {leftNotes.length > 0 ? (
              <div className="space-y-3">
                {leftNotes.map((note) => (
                  <div key={note.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-700">{note.createdBy}</span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(note.createdAt)}
                      </span>
                      {note.stepId && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          步骤备注
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无备注</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">
              右侧 - 备注 ({rightNotes.length})
            </h2>
          </div>
          <div className="p-5 max-h-64 overflow-y-auto">
            {rightNotes.length > 0 ? (
              <div className="space-y-3">
                {rightNotes.map((note) => (
                  <div key={note.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-700">{note.createdBy}</span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(note.createdAt)}
                      </span>
                      {note.stepId && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          步骤备注
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无备注</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
