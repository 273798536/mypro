import { useState } from 'react';
import {
  Play,
  Layers,
  Calendar,
  BarChart3,
  Cpu,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';


/**
 * 样本集合选择类型
 */
type SampleScope = 'all' | 'by_group' | 'by_date';

/**
 * 运行配置表单数据接口
 */
export interface RunConfig {
  /** 样本范围 */
  scope: SampleScope;
  /** 选中的分组（scope=by_group 时生效） */
  groups: string[];
  /** 起始日期（scope=by_date 时生效） */
  startDate: string | null;
  /** 结束日期（scope=by_date 时生效） */
  endDate: string | null;
  /** 选中的分析指标 */
  metrics: string[];
  /** AI 模型版本 */
  modelVersion: string;
  /** 运行备注 */
  notes: string;
}

/**
 * 运行配置面板组件属性接口
 */
interface RunConfigPanelProps {
  /** 开始运行回调 */
  onStart: (config: RunConfig) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 可用分组列表
 */
const AVAILABLE_GROUPS = ['A', 'B', 'C', 'D'];

/**
 * 可用分析指标
 */
const AVAILABLE_METRICS = [
  { id: 'liver_health', label: '肝脏健康指数' },
  { id: 'spleen_condition', label: '脾脏状态评估' },
  { id: 'kidney_function', label: '肾功能指标' },
  { id: 'intestinal_integrity', label: '肠道完整性' },
  { id: 'gill_health', label: '鳃丝健康度' },
  { id: 'cardiac_status', label: '心肌状态' },
];

/**
 * 可用 AI 模型版本
 */
const AVAILABLE_MODELS = [
  { id: 'fish-path-v1.2.0', label: 'fish-path-v1.2.0（最新稳定版）' },
  { id: 'fish-path-v1.1.0', label: 'fish-path-v1.1.0' },
  { id: 'fish-path-v1.0.0', label: 'fish-path-v1.0.0' },
  { id: 'fish-path-experimental', label: 'fish-path-experimental（实验版）' },
];

/**
 * 运行配置面板组件
 * 包含样本集合选择、分组指标多选、模型版本选择和备注输入
 */
export function RunConfigPanel({ onStart, disabled = false }: RunConfigPanelProps) {
  /** 表单配置状态 */
  const [config, setConfig] = useState<RunConfig>({
    scope: 'all',
    groups: [],
    startDate: null,
    endDate: null,
    metrics: ['liver_health', 'spleen_condition'],
    modelVersion: 'fish-path-v1.2.0',
    notes: '',
  });

  /**
   * 切换分组选中状态
   */
  const toggleGroup = (group: string) => {
    setConfig((prev) => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter((g) => g !== group)
        : [...prev.groups, group],
    }));
  };

  /**
   * 切换指标选中状态
   */
  const toggleMetric = (metricId: string) => {
    setConfig((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter((m) => m !== metricId)
        : [...prev.metrics, metricId],
    }));
  };

  /**
   * 全选指标
   */
  const selectAllMetrics = () => {
    setConfig((prev) => ({
      ...prev,
      metrics: AVAILABLE_METRICS.map((m) => m.id),
    }));
  };

  /**
   * 清空指标
   */
  const clearAllMetrics = () => {
    setConfig((prev) => ({ ...prev, metrics: [] }));
  };

  /**
   * 计算预计处理样本数（示例逻辑）
   */
  const estimatedSampleCount = (() => {
    if (config.scope === 'all') return 15;
    if (config.scope === 'by_group') return config.groups.length * 4;
    return 8;
  })();

  return (
    <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 p-6">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-lg bg-deep-ocean/10 flex items-center justify-center">
          <Cpu size={20} className="text-deep-ocean" />
        </div>
        <div>
          <h2 className="text-lg font-serif font-semibold text-deep-ocean">
            运行配置
          </h2>
          <p className="text-xs text-deep-ocean/50">
            配置参数后启动 AI 分析工作流
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 样本集合选择 */}
        <section>
          <label className="flex items-center gap-1.5 text-sm font-medium text-deep-ocean mb-3">
            <Layers size={16} className="text-deep-ocean/60" />
            样本集合
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all', label: '全部样本', desc: '处理所有样本' },
              { value: 'by_group', label: '按分组', desc: '选择特定分组' },
              { value: 'by_date', label: '按日期', desc: '选择日期范围' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    scope: option.value as SampleScope,
                  }))
                }
                disabled={disabled}
                className={`p-3 rounded-lg border text-left transition-all ${
                  config.scope === option.value
                    ? 'border-life-green bg-life-green/5'
                    : 'border-deep-ocean/10 hover:border-deep-ocean/25 bg-white'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`text-sm font-medium ${
                    config.scope === option.value
                      ? 'text-life-green'
                      : 'text-deep-ocean'
                  }`}
                >
                  {option.label}
                </div>
                <div className="text-xs text-deep-ocean/40 mt-0.5">
                  {option.desc}
                </div>
              </button>
            ))}
          </div>

          {/* 按分组选择 */}
          {config.scope === 'by_group' && (
            <div className="mt-3 p-3 bg-paper/50 rounded-lg border border-deep-ocean/5">
              <p className="text-xs text-deep-ocean/50 mb-2">选择分组：</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GROUPS.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGroup(g)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      config.groups.includes(g)
                        ? 'bg-life-green text-paper'
                        : 'bg-white text-deep-ocean/70 border border-deep-ocean/10 hover:border-deep-ocean/25'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    分组 {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 按日期选择 */}
          {config.scope === 'by_date' && (
            <div className="mt-3 p-3 bg-paper/50 rounded-lg border border-deep-ocean/5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-deep-ocean/40" />
                <input
                  type="date"
                  value={config.startDate || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      startDate: e.target.value || null,
                    }))
                  }
                  disabled={disabled}
                  className="px-3 py-1.5 bg-white border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all"
                />
                <span className="text-deep-ocean/40">至</span>
                <input
                  type="date"
                  value={config.endDate || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      endDate: e.target.value || null,
                    }))
                  }
                  disabled={disabled}
                  className="px-3 py-1.5 bg-white border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all"
                />
              </div>
            </div>
          )}
        </section>

        {/* 分析指标多选 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-deep-ocean">
              <BarChart3 size={16} className="text-deep-ocean/60" />
              分析指标
              <span className="text-xs text-deep-ocean/40 ml-1">
                ({config.metrics.length}/{AVAILABLE_METRICS.length})
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAllMetrics}
                disabled={disabled}
                className="text-xs text-deep-ocean/60 hover:text-deep-ocean transition-colors disabled:opacity-50"
              >
                全选
              </button>
              <span className="text-deep-ocean/20">|</span>
              <button
                onClick={clearAllMetrics}
                disabled={disabled}
                className="text-xs text-deep-ocean/60 hover:text-deep-ocean transition-colors disabled:opacity-50"
              >
                清空
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_METRICS.map((metric) => {
              const isSelected = config.metrics.includes(metric.id);
              return (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  disabled={disabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-deep-ocean/30 bg-deep-ocean/5'
                      : 'border-deep-ocean/10 hover:border-deep-ocean/25 bg-white'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSelected ? (
                    <CheckSquare size={16} className="text-deep-ocean" />
                  ) : (
                    <Square size={16} className="text-deep-ocean/30" />
                  )}
                  <span
                    className={`text-sm ${
                      isSelected ? 'text-deep-ocean' : 'text-deep-ocean/70'
                    }`}
                  >
                    {metric.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 模型版本选择 */}
        <section>
          <label className="flex items-center gap-1.5 text-sm font-medium text-deep-ocean mb-3">
            <Cpu size={16} className="text-deep-ocean/60" />
            分析模型版本
          </label>
          <select
            value={config.modelVersion}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, modelVersion: e.target.value }))
            }
            disabled={disabled}
            className="w-full px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </section>

        {/* 备注输入 */}
        <section>
          <label className="flex items-center gap-1.5 text-sm font-medium text-deep-ocean mb-3">
            <FileText size={16} className="text-deep-ocean/60" />
            运行备注
          </label>
          <textarea
            value={config.notes}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="输入本次运行的备注信息（可选）..."
            rows={3}
            disabled={disabled}
            className="w-full px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean placeholder:text-deep-ocean/40 focus:outline-none focus:border-deep-ocean/40 focus:ring-1 focus:ring-deep-ocean/20 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </section>

        {/* 底部汇总和启动按钮 */}
        <div className="pt-4 border-t border-deep-ocean/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-deep-ocean/60">
              预计处理 <span className="font-semibold text-deep-ocean tabular">{estimatedSampleCount}</span> 个样本
            </div>
            <button
              onClick={() => onStart(config)}
              disabled={disabled || config.metrics.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                disabled || config.metrics.length === 0
                  ? 'bg-deep-ocean/30 text-paper/60 cursor-not-allowed'
                  : 'bg-deep-ocean text-paper hover:bg-deep-ocean-light hover:shadow-lift active:translate-y-px'
              }`}
            >
              <Play size={18} fill="currentColor" />
              启动分析
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
