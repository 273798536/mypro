import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart, ClipboardList } from 'lucide-react';
import { useExperimentStore } from '@/store/experimentStore';
import { useBatchStore } from '@/store/batchStore';
import { ReviewChecklist } from '@/components/ReviewChecklist';
import { buildSummary } from '@/utils/consistency';

export function Review() {
  const navigate = useNavigate();
  const { batch } = useExperimentStore();
  const { reviewItems, updateReviewItem, addTimelineEvent } = useBatchStore();

  const summary = buildSummary(reviewItems, useBatchStore.getState().calculationResults);

  const handleUpdate = (id: string, updates: any) => {
    updateReviewItem(id, updates);
    const item = reviewItems.find((r) => r.id === id);
    addTimelineEvent({
      batchId: batch.id,
      type: '复核',
      description: `${item?.itemName} 被标记为 ${updates.status || '更新'}`,
      operator: updates.reviewer || '当前用户',
      timestamp: new Date().toLocaleString('zh-CN'),
      sourceRef: item?.sourceRef || '',
    });
  };

  const pendingCount = reviewItems.filter((r) => r.status === '待复核').length;

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-white border-b border-lab-line sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-sm">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-serif text-xl font-semibold text-lab-navy">联合复核工作台</h1>
              <p className="text-xs text-gray-500">称量单 × 实验记录 × 反应时间 三维度交叉检查</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="px-3 py-1 bg-lab-amber text-lab-ink rounded-sm text-sm font-medium animate-pulse-soft">
                还有 {pendingCount} 项待复核
              </span>
            )}
            <button onClick={() => navigate('/batch-report')} className="lab-btn bg-lab-navy text-white hover:bg-lab-navyLight flex items-center gap-2">
              <FileBarChart size={16} /> 查看批次报告
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="lab-card p-4 text-center">
            <p className="text-3xl font-mono font-bold text-lab-navy">{reviewItems.length}</p>
            <p className="text-sm text-gray-500 mt-1">总检查项</p>
          </div>
          <div className="lab-card p-4 text-center bg-green-50/50">
            <p className="text-3xl font-mono font-bold text-lab-green">{summary.passCount}</p>
            <p className="text-sm text-gray-500 mt-1">已通过</p>
          </div>
          <div className="lab-card p-4 text-center bg-amber-50/50">
            <p className="text-3xl font-mono font-bold text-lab-amber">{summary.retestCount + summary.pendingReviewCount}</p>
            <p className="text-sm text-gray-500 mt-1">待处理</p>
          </div>
          <div className="lab-card p-4 text-center bg-red-50/50">
            <p className="text-3xl font-mono font-bold text-lab-red">{summary.reviewCount}</p>
            <p className="text-sm text-gray-500 mt-1">必须复核</p>
          </div>
        </div>

        <div className="lab-card p-5 bg-lab-cream/40 border-lab-amber/30">
          <div className="flex items-start gap-3">
            <ClipboardList size={22} className="text-lab-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-lab-ink">复核说明</h3>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li>• 点击检查项右侧的下拉箭头 <strong>⌄</strong> 可展开查看 <strong>"为什么需要复核"</strong> 的详细说明</li>
                <li>• 如空白对照缺失、反应时间漏记等问题，系统会给出药化研究员的经验解释</li>
                <li>• 确认数据无误后点击"通过"，确认需要重新实验则点击"需复测"</li>
                <li>• 所有操作会被记录到批次时间线，可追溯到原始行号和图片来源</li>
              </ul>
            </div>
          </div>
        </div>

        <ReviewChecklist items={reviewItems} onUpdate={handleUpdate} />

        <div className="flex justify-between">
          <button onClick={() => navigate('/calculator')} className="lab-btn bg-white border border-lab-line text-lab-ink hover:bg-gray-50">
            返回计算工具
          </button>
          <button onClick={() => navigate('/batch-report')} className="lab-btn bg-lab-green text-white hover:bg-lab-greenLight flex items-center gap-2">
            <FileBarChart size={16} /> 完成复核，查看批次报告
          </button>
        </div>
      </div>
    </div>
  );
}
