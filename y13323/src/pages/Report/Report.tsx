import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  FileBarChart,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Settings,
  User,
  Link2,
  Download,
  RefreshCw,
  TrendingDown,
} from 'lucide-react';
import {
  formatDateTime,
  getPriorityLabel,
  getPriorityColor,
} from '@/utils/format';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

export default function Report() {
  const { report } = useAppStore();

  if (!report) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">暂无报告数据</p>
      </div>
    );
  }

  const { conclusionImpact, grayscaleBreakdown, actionGuide } = report;

  const pieData = [
    { name: '样本变化', value: grayscaleBreakdown.sampleChange.contribution, color: '#2196F3' },
    { name: '阈值变化', value: grayscaleBreakdown.thresholdChange.contribution, color: '#FF9800' },
    { name: '人工改判', value: grayscaleBreakdown.humanReview.contribution, color: '#4CAF50' },
  ];

  const evidenceTypeColors: Record<string, string> = {
    withdrawal: 'bg-status-error',
    sample_change: 'bg-accent-blue-500',
    threshold_change: 'bg-status-warning',
    human_review: 'bg-status-success',
  };

  const evidenceTypeLabels: Record<string, string> = {
    withdrawal: '撤回',
    sample_change: '样本变更',
    threshold_change: '阈值调整',
    human_review: '人工复核',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif-sc font-semibold text-deep-blue-500">
            {report.title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            <Clock size={14} />
            生成于 {formatDateTime(report.generatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw size={16} />
            重新生成
          </Button>
          <Button variant="outline">
            <Download size={16} />
            导出报告
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-deep-blue-500 to-deep-blue-600 text-white border-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <FileBarChart size={20} />
              <span className="text-sm font-medium text-deep-blue-100">
                结论影响分析
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-deep-blue-200 mb-1">原始结论</p>
                <p className="text-lg font-medium line-through opacity-70">
                  {conclusionImpact.originalConclusion}
                </p>
              </div>
              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-white text-deep-blue-500 rounded-full p-2 shadow-lg">
                  <ArrowRight size={20} />
                </div>
                <div className="p-4 bg-white/20 rounded-lg backdrop-blur-sm ml-4">
                  <p className="text-sm text-deep-blue-100 mb-1">当前结论</p>
                  <p className="text-lg font-semibold">
                    {conclusionImpact.newConclusion}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-deep-blue-100 text-sm">
              <span className="font-medium text-white">原因：</span>
              {conclusionImpact.changeReason}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500 mb-5">
          证据链 · 为什么结论变了
        </h3>

        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200 z-0"></div>

          <div className="space-y-6 relative z-10">
            {conclusionImpact.evidenceChain.map((evidence, index) => (
              <div key={evidence.id} className="flex gap-4">
                <div
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md',
                    evidenceTypeColors[evidence.type]
                  )}
                >
                  {evidence.type === 'withdrawal' && <RotateCcwIcon />}
                  {evidence.type === 'sample_change' && <Layers size={18} />}
                  {evidence.type === 'threshold_change' && <Settings size={18} />}
                  {evidence.type === 'human_review' && <User size={18} />}
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={evidence.type === 'withdrawal' ? 'error' : evidence.type === 'threshold_change' ? 'warning' : evidence.type === 'human_review' ? 'success' : 'info'}>
                      {evidenceTypeLabels[evidence.type]}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(evidence.timestamp)}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800">{evidence.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {evidence.description}
                  </p>
                </div>
                <div className="pt-3">
                  <span className="text-deep-blue-500 font-mono font-bold text-lg">
                    {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-serif-sc text-lg font-semibold text-deep-blue-500 mb-5">
          灰度结果拆解
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="flex items-center justify-center">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={75}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="p-4 bg-accent-blue-500/5 border border-accent-blue-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent-blue-500"></div>
                  <span className="font-medium text-gray-800">样本变化</span>
                </div>
                <span className="text-lg font-bold text-accent-blue-500 font-mono">
                  {grayscaleBreakdown.sampleChange.contribution}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {grayscaleBreakdown.sampleChange.description}
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                {grayscaleBreakdown.sampleChange.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent-blue-500 mt-1">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-status-warning/5 border border-status-warning/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-status-warning"></div>
                  <span className="font-medium text-gray-800">阈值变化</span>
                </div>
                <span className="text-lg font-bold text-status-warning font-mono">
                  {grayscaleBreakdown.thresholdChange.contribution}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {grayscaleBreakdown.thresholdChange.description}
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                {grayscaleBreakdown.thresholdChange.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-status-warning mt-1">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-status-success/5 border border-status-success/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-status-success"></div>
                  <span className="font-medium text-gray-800">人工改判</span>
                </div>
                <span className="text-lg font-bold text-status-success font-mono">
                  {grayscaleBreakdown.humanReview.contribution}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {grayscaleBreakdown.humanReview.description}
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                {grayscaleBreakdown.humanReview.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-status-success mt-1">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-status-error/30 bg-status-error/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-status-error/10 rounded-lg">
            <AlertTriangle size={20} className="text-status-error" />
          </div>
          <div>
            <h3 className="font-serif-sc text-lg font-semibold text-status-error">
              需补充材料
            </h3>
            <p className="text-sm text-gray-500">
              共 {actionGuide.toSupplement.length} 项，建议优先处理
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {actionGuide.toSupplement.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white rounded-lg border border-status-error/20 hover:border-status-error/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-status-error" />
                    <p className="font-medium text-gray-800">{item.title}</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
                    {item.description}
                  </p>
                </div>
                <span
                  className={clsx(
                    'text-xs font-medium whitespace-nowrap ml-4',
                    getPriorityColor(item.priority)
                  )}
                >
                  {getPriorityLabel(item.priority)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-status-success/30 bg-status-success/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-status-success/10 rounded-lg">
              <CheckCircle size={20} className="text-status-success" />
            </div>
            <div>
              <h3 className="font-serif-sc text-lg font-semibold text-status-success">
                可放行
              </h3>
              <p className="text-sm text-gray-500">
                共 {actionGuide.toApprove.length} 项，无异议可放行
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {actionGuide.toApprove.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-lg border border-status-success/20 hover:border-status-success/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={14} className="text-status-success" />
                      <p className="font-medium text-gray-800">{item.title}</p>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'text-xs font-medium whitespace-nowrap ml-4',
                      getPriorityColor(item.priority)
                    )}
                  >
                    {getPriorityLabel(item.priority)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-status-warning/30 bg-status-warning/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-status-warning/10 rounded-lg">
              <HelpCircle size={20} className="text-status-warning" />
            </div>
            <div>
              <h3 className="font-serif-sc text-lg font-semibold text-status-warning">
                待确认
              </h3>
              <p className="text-sm text-gray-500">
                共 {actionGuide.toConfirm.length} 项，需进一步确认
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {actionGuide.toConfirm.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-lg border border-status-warning/20 hover:border-status-warning/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <HelpCircle size={14} className="text-status-warning" />
                      <p className="font-medium text-gray-800">{item.title}</p>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'text-xs font-medium whitespace-nowrap ml-4',
                      getPriorityColor(item.priority)
                    )}
                  >
                    {getPriorityLabel(item.priority)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="primary" size="lg">
          <CheckCircle size={18} />
          一键放行确认项
        </Button>
        <Button variant="outline" size="lg">
          <Link2 size={18} />
          分享报告
        </Button>
      </div>
    </div>
  );
}

function RotateCcwIcon() {
  return <RefreshCw size={18} />;
}
