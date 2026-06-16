import { useNavigate } from 'react-router-dom';
import {
  Play,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  FileDown,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

import { useAppStore } from '../store/useAppStore';
import { Alert } from '../components/ui/Alert';

// 启动页
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loadSampleData, currentRecordId, analysisResult } = useAppStore();

  const handleLoadDemoData = async () => {
    await loadSampleData(50);
    navigate('/analysis');
  };

  const steps = [
    {
      icon: Database,
      title: '导入数据',
      description: '批量导入样本数据，绑定提示词版本',
      path: '/import',
      active: true
    },
    {
      icon: FileSpreadsheet,
      title: '归因分析',
      description: '自动匹配安全规则，检测异常和标签冲突',
      path: '/analysis',
      active: !!currentRecordId
    },
    {
      icon: AlertTriangle,
      title: '查看异常',
      description: '追溯异常原因，查看安全规则和处理意见',
      path: '/analysis',
      active: !!analysisResult
    },
    {
      icon: FileDown,
      title: '导出结果',
      description: '生成非技术人员可读的分析报告',
      path: '/export',
      active: !!analysisResult
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* 欢迎区域 */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif-cn text-3xl font-bold text-navy-900 mb-2">
              安全拒答样本归因系统
            </h1>
            <p className="text-gray-600 text-lg">
              解决提示词版本不一致、标签冲突、临时补材料导致的判断失效问题
            </p>
          </div>
          {analysisResult && (
            <div className="text-right">
              <p className="text-sm text-gray-500">上次运行</p>
              <p className="font-mono-data text-sm text-navy-900">
                {analysisResult.reproducibility.runId}
              </p>
            </div>
          )}
        </div>

        {currentRecordId && analysisResult && (
          <Alert
            type="success"
            title="已有分析结果"
            description="检测到已完成的分析结果，可直接查看或重新运行。"
            className="mb-6"
          />
        )}
      </div>

      {/* 四步操作指引 */}
      <div className="mb-8">
        <h2 className="font-serif-cn text-xl font-semibold text-navy-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          四步完成归因分析
        </h2>

        <div className="grid grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`card card-hover p-6 relative ${
                  step.active ? '' : 'opacity-50'
                }`}
              >
                {/* 步骤编号 */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  {index + 1}
                </div>

                {/* 连接线 */}
                {index < steps.length - 1 && (
                  <div className="absolute top-10 -right-3 w-6 h-0.5 bg-gray-200">
                    <ArrowRight className="w-4 h-4 text-gray-300 absolute -right-2 -top-1.5" />
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    step.active
                      ? 'bg-navy-900 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 主要操作区 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* 快速开始 - 加载样例数据 */}
        <div className="card p-6 aged-paper">
          <div className="absolute top-4 right-4">
            <span className="badge bg-amber-100 text-amber-800">推荐</span>
          </div>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-1">
                快速体验：加载样例数据
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                一键生成贴近日常工作场景的样例数据，包含：
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-navy-100 text-navy-800">旧表导入</span>
                <span className="badge bg-emerald-100 text-emerald-800">补录备注</span>
                <span className="badge bg-amber-100 text-amber-800">漏填单位</span>
                <span className="badge bg-gray-100 text-gray-800">正常录入</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-4 p-3 bg-white/50 rounded">
            <p className="mb-1">📋 数据说明：</p>
            <p>• 25% 来源于2023年旧表导入，格式可能不统一</p>
            <p>• 20% 为后期补录备注，缺少完整上下文</p>
            <p>• 10% 存在漏填单位问题，影响安全规则判断</p>
            <p>• 45% 为正常录入数据</p>
          </div>

          <button
            onClick={handleLoadDemoData}
            className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            加载样例数据并开始分析
          </button>
        </div>

        {/* 导入真实数据 */}
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-navy-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif-cn text-lg font-semibold text-navy-900 mb-1">
                导入真实数据
              </h3>
              <p className="text-sm text-gray-600">
                支持 Excel、CSV 格式批量导入，绑定提示词版本后进行归因分析
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                ✓
              </div>
              <span>数据格式校验：自动检测漏填、格式错误</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                ✓
              </div>
              <span>版本绑定：精确到小时的时间戳，避免"晚到半天"问题</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                ✓
              </div>
              <span>统一处理记录：分布统计和版本追踪共用数据源</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/import')}
            className="w-full btn btn-secondary btn-lg flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            前往导入页面
          </button>
        </div>
      </div>

      {/* 核心特性介绍 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="font-semibold text-navy-900 mb-2">可复现的分析结果</h4>
          <p className="text-sm text-gray-600">
            每次分析生成唯一运行ID，记录随机种子和配置快照，确保结果可复现，避免因版本问题返工。
          </p>
        </div>

        <div className="card p-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="font-semibold text-navy-900 mb-2">三者对齐视图</h4>
          <p className="text-sm text-gray-600">
            图表、数据表格、文字说明共用同一批处理记录，鼠标悬停联动高亮，确保三者对得上。
          </p>
        </div>

        <div className="card p-6">
          <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-navy-600" />
          </div>
          <h4 className="font-semibold text-navy-900 mb-2">完整追溯链路</h4>
          <p className="text-sm text-gray-600">
            从异常样本出发，可追溯到关联的安全规则、漏配原因（自然语言）和处理意见，满足评审会验收标准。
          </p>
        </div>
      </div>
    </div>
  );
};
