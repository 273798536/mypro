import { useNavigate } from 'react-router-dom';
import { FlaskConical, FileSpreadsheet, Calculator, ClipboardCheck, FileBarChart, HelpCircle, Database, PlayCircle } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useBatchStore } from '@/store/batchStore';
import { buildSummary } from '@/utils/consistency';

export function Home() {
  const navigate = useNavigate();
  const { batch, weighingRows, experimentRecords, reactionTimes, loadMockData, resetData } = useExperimentStore();
  const { reviewItems, calculationResults, loadMockData: loadBatchMock } = useBatchStore();

  const summary = buildSummary(reviewItems, calculationResults);

  const handleLoadDemo = () => {
    loadMockData();
    loadBatchMock();
  };

  const handleReset = () => {
    resetData();
    useBatchStore.getState().resetData();
  };

  const navItems = [
    { path: '/data-entry', icon: FileSpreadsheet, label: '数据录入', desc: '称量单、实验记录、反应时间', color: 'bg-lab-navy' },
    { path: '/calculator', icon: Calculator, label: '计算工具', desc: '燃烧热公式、浓度换算', color: 'bg-lab-green' },
    { path: '/review', icon: ClipboardCheck, label: '复核工作台', desc: '空白对照等问题复核', color: 'bg-lab-amber' },
    { path: '/batch-report', icon: FileBarChart, label: '批次报告', desc: '时间线、导出、一致性校验', color: 'bg-purple-600' },
    { path: '/help', icon: HelpCircle, label: '帮助说明', desc: '公式手册、启动指南', color: 'bg-gray-600' },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-lab-navy text-white py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-sm flex items-center justify-center">
              <FlaskConical size={28} />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold">燃烧热实验批改工具</h1>
              <p className="text-white/70 mt-1">药化实验数据计算 · 复核 · 批次追踪</p>
            </div>
          </div>
          <p className="text-white/80 max-w-2xl leading-relaxed">
            将经验驱动的批改流程标准化。每一步计算都附带公式、单位和适用范围，
            空白对照缺失、反应时间漏记等问题自动进入联合复核流程，
            批次报告支持溯源到原始行号和图片。
          </p>

          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              onClick={handleLoadDemo}
              className="lab-btn bg-lab-amber text-lab-ink hover:bg-lab-amberLight flex items-center gap-2"
            >
              <Database size={18} /> 载入示例批次 YH20260610-01
            </button>
            <button
              onClick={handleReset}
              className="lab-btn bg-white/10 text-white hover:bg-white/20 flex items-center gap-2 border border-white/20"
            >
              <PlayCircle size={18} /> 从空目录开始
            </button>
            <button
              onClick={() => navigate('/help')}
              className="lab-btn bg-transparent text-white hover:bg-white/10 flex items-center gap-2 border border-white/30"
            >
              <HelpCircle size={18} /> 查看启动指南
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {batch.name && (
          <div className="lab-card p-5 mb-8">
            <h2 className="font-serif text-xl font-semibold text-lab-navy mb-4">当前批次概览</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">批次号</p>
                <p className="font-mono font-medium">{batch.name || '未命名'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">操作员</p>
                <p className="font-medium">{batch.operator || '未填写'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">创建时间</p>
                <p className="font-medium">{batch.createdAt}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">状态</p>
                <p className={`font-medium ${
                  summary.batchStatus === '已完成' ? 'text-lab-green' :
                  summary.batchStatus === '待复核' ? 'text-lab-amber' :
                  'text-lab-navy'
                }`}>{summary.batchStatus}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 p-3 rounded-sm">
                <p className="text-2xl font-mono font-semibold text-lab-green">{summary.passCount}</p>
                <p className="text-xs text-gray-500 mt-1">通过项</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-sm">
                <p className="text-2xl font-mono font-semibold text-lab-amber">{summary.retestCount}</p>
                <p className="text-xs text-gray-500 mt-1">建议复测</p>
              </div>
              <div className="bg-red-50 p-3 rounded-sm">
                <p className="text-2xl font-mono font-semibold text-lab-red">{summary.reviewCount + summary.pendingReviewCount}</p>
                <p className="text-xs text-gray-500 mt-1">需复核</p>
              </div>
            </div>
            {batch.sourceNote && (
              <div className="mt-4 pt-4 border-t border-lab-line">
                <span className="source-badge">📌 来源备注：{batch.sourceNote}</span>
              </div>
            )}
          </div>
        )}

        <h2 className="font-serif text-xl font-semibold text-lab-ink mb-5">功能模块</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="lab-card p-5 text-left hover:shadow-md transition-all group"
                style={{ animation: `fadeIn 0.5s ease-out ${i * 0.08}s both` }}
              >
                <div className={`w-12 h-12 ${item.color} text-white rounded-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <Icon size={24} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-lab-ink mb-1">{item.label}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-10 lab-card p-5 bg-lab-cream/50">
          <h3 className="font-serif text-lg font-semibold text-lab-navy mb-3">📋 快速使用流程</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-lab-navy text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>在<strong>数据录入</strong>页填写称量单（保留原始行号）、实验温度记录和反应时间</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-lab-navy text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>进入<strong>计算工具</strong>页，查看燃烧热计算公式（含单位、适用范围、每步推导）和浓度换算结果</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-lab-navy text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>系统自动检测空白对照缺失、反应时间漏记等问题，在<strong>复核工作台</strong>逐项处理，点击可查看原因说明</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-lab-navy text-white text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>在<strong>批次报告</strong>页查看时间线追溯，确认界面摘要与导出内容一致后，导出带溯源信息的PDF/Excel</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
