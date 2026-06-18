import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVersionStore } from '@/store/useVersionStore';
import type { Version } from '@/types';
import {
  FileText,
  ChevronDown,
  Settings,
  BookOpen,
  PlayCircle,
  Eye,
  FileJson,
  Flag,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { cn, formatDate, getStatusColor, getStatusText } from '@/utils/helpers';

type TabType = 'records' | 'config' | 'guide';

export default function Versions() {
  const navigate = useNavigate();
  const params = useParams<{ versionId?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('records');
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  const {
    versions,
    selectedTargetVersionId,
    setSelectedTargetVersion,
    getVersionById,
  } = useVersionStore();

  const currentVersionId = params.versionId || selectedTargetVersionId;
  const currentVersion =
    getVersionById(currentVersionId) || versions[0];

  const tabs: { id: TabType; label: string; icon: typeof FileText }[] = [
    { id: 'records', label: '版本记录', icon: FileText },
    { id: 'config', label: '计算口径', icon: Settings },
    { id: 'guide', label: '操作指南', icon: BookOpen },
  ];

  const handleVersionChange = (id: string) => {
    setSelectedTargetVersion(id);
    navigate(`/versions/${id}`);
    setShowVersionDropdown(false);
  };

  const StatusBadge = ({ version }: { version: Version }) => (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
        version.status === 'active' && 'bg-accent-green/10 text-accent-green',
        version.status === 'withdrawn' && 'bg-gray-500/10 text-gray-400',
        version.status === 'abnormal' && 'bg-accent-red/10 text-accent-red'
      )}
    >
      <span className={cn('w-2 h-2 rounded-full', getStatusColor(version.status))} />
      {getStatusText(version.status)}
    </span>
  );

  const GuideStep = ({
    step,
    title,
    description,
    icon: Icon,
  }: {
    step: number;
    title: string;
    description: string;
    icon: typeof Eye;
  }) => (
    <div className="flex gap-4 p-4 rounded-lg bg-bg-tertiary/30 border border-border-color">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
        <span className="font-display font-bold text-accent-blue">{step}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} className="text-accent-blue" />
          <h4 className="font-medium text-white">{title}</h4>
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );

  return (
    <div
      className="animate-fade-in"
      onClick={() => setShowVersionDropdown(false)}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-bg-secondary text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText size={28} className="text-accent-orange" />
              版本说明
            </h1>
            <p className="text-gray-400">
              查看版本历史、计算口径和操作指南
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVersionDropdown(!showVersionDropdown);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-secondary border border-border-color hover:border-accent-blue/30 transition-colors"
          >
            <div className="text-left">
              <p className="text-xs text-gray-400">当前查看</p>
              <p className="font-display font-semibold text-white">
                {currentVersion.versionNumber}
              </p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showVersionDropdown && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-bg-secondary border border-border-color rounded-lg shadow-xl z-10 overflow-hidden">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleVersionChange(v.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors border-b border-border-color/50 last:border-0',
                    v.id === currentVersion.id && 'bg-bg-tertiary'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'font-display font-medium',
                        v.status === 'withdrawn'
                          ? 'text-gray-500 line-through'
                          : 'text-white'
                      )}
                    >
                      {v.versionNumber}
                    </span>
                    <StatusBadge version={v} />
                  </div>
                  <p className="text-xs text-gray-400">{v.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'bg-bg-secondary rounded-lg border p-6 mb-6',
          currentVersion.status === 'withdrawn'
            ? 'border-gray-500/30 opacity-80'
            : currentVersion.metrics.some((m) => m.isAbnormal)
            ? 'border-accent-orange/30'
            : 'border-border-color'
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-display text-2xl font-bold text-white">
                {currentVersion.versionNumber}
              </h2>
              <StatusBadge version={currentVersion} />
            </div>
            <p
              className={cn(
                'text-gray-300',
                currentVersion.status === 'withdrawn' && 'line-through text-gray-500'
              )}
            >
              {currentVersion.description}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            {formatDate(currentVersion.createdAt)}
          </div>
        </div>

        {currentVersion.status === 'withdrawn' && currentVersion.withdrawReason && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
            <AlertCircle size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">撤回原因</p>
              <p className="text-sm text-gray-300">{currentVersion.withdrawReason}</p>
            </div>
          </div>
        )}

        {currentVersion.metrics.some((m) => m.isAbnormal) && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-orange/5 border border-accent-orange/20 mt-4">
            <AlertCircle size={18} className="text-accent-orange flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-accent-orange mb-1">异常指标</p>
              <div className="flex flex-wrap gap-2">
                {currentVersion.metrics
                  .filter((m) => m.isAbnormal)
                  .map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-1 rounded bg-accent-orange/10 text-accent-orange text-xs"
                    >
                      {m.name}: {m.value}% ({m.delta > 0 ? '+' : ''}
                      {m.delta}%)
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-border-color">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 -mb-px border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-gray-400 hover:text-white'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'records' && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-white mb-4">
            完整版本记录
          </h3>
          {versions.map((version) => (
            <div
              key={version.id}
              onClick={() => handleVersionChange(version.id)}
              className={cn(
                'p-4 rounded-lg border transition-all cursor-pointer',
                'hover:border-accent-blue/30 hover:bg-bg-secondary/50',
                version.id === currentVersion.id
                  ? 'bg-bg-secondary border-accent-blue/30 glow-border'
                  : 'bg-bg-secondary/30 border-border-color',
                version.status === 'withdrawn' && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      getStatusColor(version.status)
                    )}
                  />
                  <span
                    className={cn(
                      'font-display font-semibold text-white',
                      version.status === 'withdrawn' && 'line-through text-gray-500'
                    )}
                  >
                    {version.versionNumber}
                  </span>
                  <StatusBadge version={version} />
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(version.createdAt)}
                </span>
              </div>

              <p
                className={cn(
                  'text-sm text-gray-300 mb-3',
                  version.status === 'withdrawn' && 'line-through text-gray-500'
                )}
              >
                {version.description}
              </p>

              {version.withdrawReason && (
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <XCircle size={12} className="text-gray-500" />
                  撤回原因：{version.withdrawReason}
                </div>
              )}

              <div className="flex items-center gap-2">
                {version.metrics.slice(0, 5).map((m) => (
                  <span
                    key={m.id}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-mono',
                      m.isAbnormal
                        ? 'bg-accent-red/10 text-accent-red'
                        : 'bg-bg-tertiary text-gray-300'
                    )}
                  >
                    {m.name}: {m.value}%
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  算法值班人
                </span>
                <span className="flex items-center gap-1">
                  <Flag size={12} />
                  {version.leakRecords.length} 条泄漏
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle size={12} />
                  {version.metrics.length} 个指标
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-lg border border-border-color p-6">
            <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={18} className="text-accent-blue" />
              计算口径配置
            </h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">判定阈值</label>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <span className="font-mono text-2xl text-accent-blue">
                    {currentVersion.calcConfig.threshold}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-2 block">抽样规则</label>
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <span className="text-white">
                    {currentVersion.calcConfig.samplingRule}
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-2 block">评估公式</label>
                <div className="bg-bg-tertiary rounded-lg p-4 font-mono text-accent-green">
                  {currentVersion.calcConfig.evaluationFormula}
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-2 block">
                  属性权重配置
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {Object.entries(currentVersion.calcConfig.attributeWeights).map(
                    ([attr, weight]) => (
                      <div key={attr} className="bg-bg-tertiary rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-2">{attr}</p>
                        <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full bg-accent-blue rounded-full"
                            style={{ width: `${weight * 100 * 3}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm text-white">
                          {(weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-bg-secondary rounded-lg border border-border-color p-6">
            <h3 className="font-display text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <BookOpen size={18} className="text-accent-green" />
              操作指南
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              算法值班人接手"商品属性灰度对比"时，无需询问即可通过以下三步完成工作
            </p>

            <div className="space-y-4">
              <GuideStep
                step={1}
                title="放样例 - 查看样本详情"
                description="进入「样本详情」页面，按贡献度排序查看影响结论最大的 Top 20 样本，点击样本可展开完整属性信息。泄漏样本已在「样本泄漏专区」单独列出，不会影响正常结果。"
                icon={Eye}
              />
              <GuideStep
                step={2}
                title="重跑 - 重新计算验证"
                description="在「样本详情」页可单样本重跑或点击「重跑全部」批量重算。重跑状态会实时显示，完成后状态变为「已完成」。也可在「灰度对比」页选择不同版本进行对比验证。"
                icon={PlayCircle}
              />
              <GuideStep
                step={3}
                title="查看接口返回 - 定位问题根因"
                description="点击任意样本的「查看接口返回」按钮，可查看该样本的完整 API 返回 JSON，包括预测结果、置信度、处理时间等详细信息，便于定位识别错误的具体原因。"
                icon={FileJson}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-secondary rounded-lg border border-accent-blue/30 p-5">
              <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center mb-3">
                <FileText size={20} className="text-accent-blue" />
              </div>
              <h4 className="font-medium text-white mb-2">材料存放位置</h4>
              <p className="text-xs text-gray-400">
                所有版本说明、计算口径、操作指南均在「版本说明」页
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-accent-red/30 p-5">
              <div className="w-10 h-10 rounded-lg bg-accent-red/10 flex items-center justify-center mb-3">
                <AlertCircle size={20} className="text-accent-red" />
              </div>
              <h4 className="font-medium text-white mb-2">异常查看位置</h4>
              <p className="text-xs text-gray-400">
                异常指标在「总览面板」高亮显示，泄漏样本在各页面独立专区
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-accent-green/30 p-5">
              <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center mb-3">
                <FileJson size={20} className="text-accent-green" />
              </div>
              <h4 className="font-medium text-white mb-2">重新导出位置</h4>
              <p className="text-xs text-gray-400">
                「样本详情」页点击「导出报告」可下载 JSON 格式的完整分析报告
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
