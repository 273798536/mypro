import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Play, Plus, Clock, CheckCircle2, Loader2, AlertTriangle, Settings, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Experiment, ExperimentConfig } from '@/types';

const statusConfig = {
  pending: { label: '待运行', color: 'bg-slate-100 text-slate-600', icon: Clock },
  running: { label: '运行中', color: 'bg-blue-100 text-blue-600', icon: Loader2 },
  completed: { label: '已完成', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
  error: { label: '错误', color: 'bg-red-100 text-red-600', icon: AlertTriangle },
};

export default function Experiments() {
  const { experiments, runExperiment, runAllExperiments, addExperiment } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newConfig, setNewConfig] = useState<ExperimentConfig>({
    windowCount: 3,
    simulationTime: 480,
    includeBoundary: false,
    includeBadInput: false
  });
  const [newName, setNewName] = useState('');

  const pendingCount = experiments.filter(e => e.status === 'pending').length;

  function handleCreate() {
    if (!newName.trim()) return;
    addExperiment({ name: newName.trim(), config: newConfig });
    setShowModal(false);
    setNewName('');
    setNewConfig({
      windowCount: 3,
      simulationTime: 480,
      includeBoundary: false,
      includeBadInput: false
    });
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">批量实验</h2>
          <p className="text-sm text-slate-500 mt-1">配置多组实验方案，一键批量运行排队模拟</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => runAllExperiments()}
            disabled={pendingCount === 0}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
              pendingCount > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            <Play className="w-4 h-4" />
            批量运行全部 ({pendingCount})
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            新建实验
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {experiments.map((exp) => (
          <ExperimentCard
            key={exp.id}
            experiment={exp}
            onRun={() => runExperiment(exp.id)}
            formatDate={formatDate}
          />
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">新建实验方案</h3>
              <p className="text-sm text-slate-500 mt-1">配置实验参数，用于排队模拟计算</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">实验名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：高峰时段4窗口配置"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Settings className="w-4 h-4 inline mr-1" />
                  窗口数量: {newConfig.windowCount} 个
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newConfig.windowCount}
                  onChange={(e) => setNewConfig({ ...newConfig, windowCount: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1个</span>
                  <span>5个</span>
                  <span>10个</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  模拟时长: {newConfig.simulationTime} 分钟
                </label>
                <input
                  type="range"
                  min="120"
                  max="960"
                  step="60"
                  value={newConfig.simulationTime}
                  onChange={(e) => setNewConfig({ ...newConfig, simulationTime: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>2小时</span>
                  <span>8小时</span>
                  <span>16小时</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  <Layers className="w-4 h-4 inline mr-1" />
                  数据分组配置
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newConfig.includeBoundary}
                      onChange={(e) => setNewConfig({ ...newConfig, includeBoundary: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">包含边界值数据</div>
                      <div className="text-xs text-slate-500">服务时长异常、预约爽约等</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={newConfig.includeBadInput}
                      onChange={(e) => setNewConfig({ ...newConfig, includeBadInput: e.target.checked })}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-700">包含坏输入数据</div>
                      <div className="text-xs text-slate-500">空值、负数、逻辑冲突等</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className={cn(
                  'px-6 py-2 rounded-lg font-medium text-sm transition-all',
                  newName.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                )}
              >
                创建实验
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExperimentCard({
  experiment,
  onRun,
  formatDate
}: {
  experiment: Experiment;
  onRun: () => void;
  formatDate: (date: Date) => string;
}) {
  const StatusIcon = statusConfig[experiment.status].icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">{experiment.name}</h3>
            <p className="text-xs text-slate-400 mt-1">创建于 {formatDate(experiment.createdAt)}</p>
          </div>
          <span className={cn(
            'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full',
            statusConfig[experiment.status].color
          )}>
            <StatusIcon className={cn('w-3 h-3', experiment.status === 'running' && 'animate-spin')} />
            {statusConfig[experiment.status].label}
          </span>
        </div>

        {experiment.status === 'running' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>运行进度</span>
              <span>{experiment.progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${experiment.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">窗口数量</div>
            <div className="text-lg font-bold text-slate-800">{experiment.config.windowCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">模拟时长</div>
            <div className="text-lg font-bold text-slate-800">{experiment.config.simulationTime}分钟</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {experiment.config.includeBoundary && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              含边界值
            </span>
          )}
          {experiment.config.includeBadInput && (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
              含坏输入
            </span>
          )}
          {!experiment.config.includeBoundary && !experiment.config.includeBadInput && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              仅正常数据
            </span>
          )}
        </div>
      </div>

      {experiment.status === 'pending' && (
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onRun}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            <Play className="w-4 h-4" />
            运行实验
          </button>
        </div>
      )}

      {experiment.status === 'completed' && (
        <div className="p-4 border-t border-slate-100 bg-green-50">
          <div className="flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            实验已完成，请前往结果分析查看
          </div>
        </div>
      )}
    </div>
  );
}
