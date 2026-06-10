import { useState, useMemo } from 'react';
import {
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Sparkles,
  Settings,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Zap,
  Shield,
  Cpu,
} from 'lucide-react';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSampleStore } from '@/stores/sampleStore';
import { Empty } from '@/components/Empty';
import { cn } from '@/lib/utils';

export default function AIStationPage() {
  const { versions, statistics, users } = useSampleStore();

  const [activeTab, setActiveTab] = useState<'workflows' | 'models' | 'monitor' | 'history'>('workflows');
  const [isRunning, setIsRunning] = useState(true);

  const aiAnalysisData = useMemo(() => {
    return versions.filter((v) => v.aiAnalysis);
  }, [versions]);

  const performanceData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = dayjs().subtract(13 - i, 'day');
      return {
        date: date.format('MM-DD'),
        准确率: 85 + Math.random() * 10,
        召回率: 80 + Math.random() * 12,
        F1分数: 82 + Math.random() * 10,
      };
    });
  }, []);

  const workflowConfigs = [
    {
      id: 'wf-001',
      name: '测序结果异常检测',
      description: '自动检测测序结果中的异常值和潜在错误',
      model: 'DeepVariant-v3.2',
      status: 'running',
      lastRun: Date.now() - 1800000,
      accuracy: 94.5,
      processed: 1256,
    },
    {
      id: 'wf-002',
      name: '智能修正建议',
      description: '基于历史修正模式推荐修正方案',
      model: 'CorrectionGPT-v2.1',
      status: 'running',
      lastRun: Date.now() - 3600000,
      accuracy: 88.2,
      processed: 892,
    },
    {
      id: 'wf-003',
      name: '重复内容智能比对',
      description: '条码重复时自动比对内容差异',
      model: 'DupCompare-v1.5',
      status: 'running',
      lastRun: Date.now() - 7200000,
      accuracy: 96.8,
      processed: 345,
    },
    {
      id: 'wf-004',
      name: '置信度评估',
      description: '对AI分析结果给出置信度评分',
      model: 'Confidence-v2.0',
      status: 'idle',
      lastRun: Date.now() - 86400000,
      accuracy: 91.3,
      processed: 2105,
    },
  ];

  const modelVersions = [
    {
      id: 'model-001',
      name: 'DeepVariant',
      version: 'v3.2.0',
      type: '变异检测',
      accuracy: 94.5,
      trainedOn: '2024-01-01',
      size: '2.3GB',
      status: 'active',
    },
    {
      id: 'model-002',
      name: 'CorrectionGPT',
      version: 'v2.1.0',
      type: '智能修正',
      accuracy: 88.2,
      trainedOn: '2024-01-10',
      size: '1.8GB',
      status: 'active',
    },
    {
      id: 'model-003',
      name: 'DupCompare',
      version: 'v1.5.0',
      type: '重复比对',
      accuracy: 96.8,
      trainedOn: '2024-01-05',
      size: '890MB',
      status: 'active',
    },
    {
      id: 'model-004',
      name: 'Confidence',
      version: 'v2.0.0',
      type: '置信度评估',
      accuracy: 91.3,
      trainedOn: '2024-01-12',
      size: '1.2GB',
      status: 'active',
    },
    {
      id: 'model-005',
      name: 'DeepVariant',
      version: 'v3.1.0',
      type: '变异检测',
      accuracy: 92.8,
      trainedOn: '2023-12-15',
      size: '2.2GB',
      status: 'archived',
    },
  ];

  const executionHistory = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `exec-${Date.now() - i * 3600000}`,
      workflow: workflowConfigs[i % workflowConfigs.length].name,
      startTime: Date.now() - i * 3600000 - Math.random() * 1800000,
      endTime: Date.now() - i * 3600000,
      status: i < 8 ? 'success' : 'running',
      recordsProcessed: Math.floor(Math.random() * 100) + 10,
      duration: Math.floor(Math.random() * 300) + 60,
      operator: users[Math.floor(Math.random() * users.length)]?.name || '系统',
    }));
  }, [users, workflowConfigs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-accent-100 text-accent-700';
      case 'active':
        return 'bg-accent-100 text-accent-700';
      case 'success':
        return 'bg-accent-100 text-accent-700';
      case 'idle':
        return 'bg-warning-100 text-warning-700';
      case 'archived':
        return 'bg-lab-bg text-lab-textMuted';
      default:
        return 'bg-lab-bg text-lab-text';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'active':
        return '激活';
      case 'success':
        return '成功';
      case 'idle':
        return '空闲';
      case 'archived':
        return '已归档';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <Cpu size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">AI分析数</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{aiAnalysisData.length}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Shield size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">平均准确率</p>
              <p className="text-2xl font-bold font-mono text-lab-text">92.7%</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <Zap size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">今日处理</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{statistics.todayImports * 3}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <Bot size={20} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">工作流状态</p>
              <p className="text-lg font-bold text-lab-text flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                    isRunning ? 'bg-accent-400' : 'bg-warning-400'
                  )} />
                  <span className={cn(
                    'relative inline-flex rounded-full h-3 w-3',
                    isRunning ? 'bg-accent-500' : 'bg-warning-500'
                  )} />
                </span>
                {isRunning ? '运行中' : '已暂停'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lab-card p-4 bg-accent-50 border border-accent-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="text-accent-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-accent-800 mb-1">AI/ML工作流说明</h3>
              <p className="text-sm text-accent-700">
                系统支持可插拔的AI/ML工作流架构，包括测序结果异常检测、智能修正建议、重复内容智能比对、置信度评估。
                所有AI分析结果都会记录模型版本，确保结果可复现。
                遇到条码重复记录时，AI会自动比对内容差异并给出相似度评分。
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isRunning
                ? 'bg-warning-600 text-white hover:bg-warning-700'
                : 'bg-accent-600 text-white hover:bg-accent-700'
            )}
          >
            {isRunning ? (
              <>
                <Pause size={16} />
                暂停工作流
              </>
            ) : (
              <>
                <Play size={16} />
                启动工作流
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex border-b border-lab-border">
        <button
          onClick={() => setActiveTab('workflows')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-2',
            activeTab === 'workflows'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          <Activity size={16} />
          工作流配置
          {activeTab === 'workflows' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-2',
            activeTab === 'models'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          <Cpu size={16} />
          模型版本
          {activeTab === 'models' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('monitor')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-2',
            activeTab === 'monitor'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          <BarChart3 size={16} />
          性能监控
          {activeTab === 'monitor' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-2',
            activeTab === 'history'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          <FileText size={16} />
          执行历史
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
      </div>

      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflowConfigs.map((workflow, index) => (
            <div key={workflow.id} className="lab-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-lab-text flex items-center gap-2">
                    {workflow.name}
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', getStatusColor(workflow.status))}>
                      {getStatusLabel(workflow.status)}
                    </span>
                  </h4>
                  <p className="text-sm text-lab-textMuted mt-1">{workflow.description}</p>
                </div>
                <button className="p-2 rounded-lg hover:bg-lab-bg transition-colors">
                  <Settings size={16} className="text-lab-textMuted" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lab-textMuted">使用模型</span>
                  <span className="font-mono text-primary-600">{workflow.model}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lab-textMuted">准确率</span>
                  <span className="font-mono font-bold text-accent-600">{workflow.accuracy}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lab-textMuted">已处理样本</span>
                  <span className="font-mono">{workflow.processed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lab-textMuted">最后运行</span>
                  <span className="text-lab-textMuted">
                    {dayjs(workflow.lastRun).format('HH:mm')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-lab-border">
                <button
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    workflow.status === 'running'
                      ? 'bg-warning-100 text-warning-700 hover:bg-warning-200'
                      : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                  )}
                >
                  {workflow.status === 'running' ? (
                    <>
                      <Pause size={14} />
                      暂停
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      启动
                    </>
                  )}
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-lab-bg text-lab-text hover:bg-primary-50 hover:text-primary-600 transition-colors">
                  <RefreshCw size={14} />
                  立即执行
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'models' && (
        <div className="lab-card p-4">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>模型名称</th>
                  <th>版本</th>
                  <th>类型</th>
                  <th>准确率</th>
                  <th>训练时间</th>
                  <th>大小</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {modelVersions.map((model) => (
                  <tr key={model.id}>
                    <td className="font-medium text-lab-text">{model.name}</td>
                    <td className="font-mono text-primary-600">{model.version}</td>
                    <td>
                      <span className="px-2 py-1 rounded-md bg-primary-50 text-primary-700 text-xs">
                        {model.type}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-accent-600">{model.accuracy}%</td>
                    <td className="text-sm text-lab-textMuted">{model.trainedOn}</td>
                    <td className="font-mono text-sm">{model.size}</td>
                    <td>
                      <span className={cn('px-2 py-1 rounded-md text-xs font-medium', getStatusColor(model.status))}>
                        {getStatusLabel(model.status)}
                      </span>
                    </td>
                    <td>
                      <button className="text-sm text-primary-600 hover:underline">
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monitor' && (
        <div className="space-y-6">
          <div className="lab-card p-6">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-accent-500" />
              模型性能趋势（近14天）
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRecall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorF1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="准确率" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorAccuracy)" strokeWidth={2} />
                  <Area type="monotone" dataKey="召回率" stroke="#14b8a6" fillOpacity={1} fill="url(#colorRecall)" strokeWidth={2} />
                  <Area type="monotone" dataKey="F1分数" stroke="#f59e0b" fillOpacity={1} fill="url(#colorF1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
                <span className="text-sm text-lab-text">准确率</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#14b8a6]" />
                <span className="text-sm text-lab-text">召回率</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className="text-sm text-lab-text">F1分数</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="lab-card p-4">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>执行ID</th>
                  <th>工作流</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>状态</th>
                  <th>处理记录</th>
                  <th>耗时</th>
                  <th>操作人</th>
                </tr>
              </thead>
              <tbody>
                {executionHistory.map((exec) => (
                  <tr key={exec.id}>
                    <td className="font-mono text-xs text-primary-600">{exec.id.substring(0, 12)}...</td>
                    <td className="text-sm">{exec.workflow}</td>
                    <td className="text-xs text-lab-textMuted whitespace-nowrap">
                      {dayjs(exec.startTime).format('MM-DD HH:mm')}
                    </td>
                    <td className="text-xs text-lab-textMuted whitespace-nowrap">
                      {exec.status === 'running' ? '进行中' : dayjs(exec.endTime).format('MM-DD HH:mm')}
                    </td>
                    <td>
                      <span className={cn('px-2 py-1 rounded-md text-xs font-medium', getStatusColor(exec.status))}>
                        {getStatusLabel(exec.status)}
                      </span>
                    </td>
                    <td className="font-mono text-sm">{exec.recordsProcessed}</td>
                    <td className="font-mono text-sm">{Math.floor(exec.duration / 60)}分{exec.duration % 60}秒</td>
                    <td className="text-sm">{exec.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
