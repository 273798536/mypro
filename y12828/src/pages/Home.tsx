import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Bot,
  FileText,
  Users,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { DiffList } from '@/components/DiffList';
import { VersionTimeline } from '@/components/VersionTimeline';
import { useSampleStore } from '@/stores/sampleStore';
import { Empty } from '@/components/Empty';
import { cn } from '@/lib/utils';

export default function Home() {
  const {
    statistics,
    pendingDiffs,
    getFilteredDiffs,
    getVersionHistory,
    selectedBarcode,
    setSelectedBarcode,
    versions,
    isLoading,
    initializeData,
  } = useSampleStore();

  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (versions.length === 0 && !isLoading) {
      initializeData();
    }
  }, [versions.length, isLoading, initializeData]);

  const filteredDiffs = getFilteredDiffs();

  const handleViewVersion = (versionId: string) => {
    const version = versions.find((v) => v.versionId === versionId);
    if (version) {
      setSelectedBarcode(version.barcode);
      setShowTimeline(true);
    }
  };

  const handleAddCorrection = (versionId: string) => {
    const version = versions.find((v) => v.versionId === versionId);
    if (version) {
      const field = prompt('请输入要修正的字段名：');
      if (!field) return;
      const oldValue = prompt('请输入原值：');
      const newValue = prompt('请输入新值：');
      if (!newValue) return;
      const reason = prompt('请输入修正原因：');
      if (!reason) return;

      const { addManualCorrection, users } = useSampleStore.getState();
      const currentUser = users[0];
      addManualCorrection(
        versionId,
        { fieldName: field, oldValue, newValue, reason },
        currentUser.id
      );
      alert('修正已提交');
    }
  };

  const handleAddReview = (barcode: string, versionId: string) => {
    const content = prompt('请输入复核意见：');
    if (!content) return;

    const { addReviewComment, users } = useSampleStore.getState();
    const currentUser = users[0];
    addReviewComment(barcode, versionId, content, currentUser.id, currentUser.name);
    alert('复核意见已提交');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lab-textMuted">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日导入"
          value={statistics.todayImports}
          icon={Upload}
          color="primary"
          subtitle="新增样本记录"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="待处理差异"
          value={statistics.pendingDiffs}
          icon={Activity}
          color="accent"
          subtitle="需要人工确认"
          trend={{ value: 5, isPositive: false }}
        />
        <StatCard
          title="重复预警"
          value={statistics.duplicateWarnings}
          icon={AlertTriangle}
          color="warning"
          subtitle="条码重复记录"
        />
        <StatCard
          title="AI分析"
          value="运行中"
          icon={Bot}
          color="primary"
          subtitle="模型版本 v2.3.1"
          progress={statistics.aiAnalysisProgress}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <div className="lab-card p-4 space-y-4">
            <h3 className="font-medium text-lab-text flex items-center gap-2">
              <FileText size={18} className="text-primary-500" />
              数据概览
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-lab-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FileText size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-lab-textMuted">样本总数</p>
                    <p className="font-bold text-lg text-lab-text">{statistics.totalSamples}</p>
                  </div>
                </div>
                <TrendingUp size={16} className="text-accent-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-lab-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-accent-600" />
                  </div>
                  <div>
                    <p className="text-xs text-lab-textMuted">已确认结论</p>
                    <p className="font-bold text-lg text-lab-text">{statistics.confirmedConclusions}</p>
                  </div>
                </div>
                <CheckCircle2 size={16} className="text-accent-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-lab-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center">
                    <Users size={16} className="text-warning-600" />
                  </div>
                  <div>
                    <p className="text-xs text-lab-textMuted">待复核</p>
                    <p className="font-bold text-lg text-lab-text">{statistics.pendingReviews}</p>
                  </div>
                </div>
                <AlertTriangle size={16} className="text-warning-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-lab-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <FileText size={16} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-lab-textMuted">本月审计</p>
                    <p className="font-bold text-lg text-lab-text">{statistics.thisMonthAudits}</p>
                  </div>
                </div>
                <FileText size={16} className="text-primary-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <SearchFilterBar />

          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lab-text">
              差异列表
              <span className="ml-2 text-sm text-lab-textMuted">
                共 {filteredDiffs.length} 条待处理
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  showTimeline
                    ? 'bg-primary-600 text-white'
                    : 'bg-lab-bg text-lab-text hover:bg-primary-50'
                )}
              >
                {showTimeline ? '隐藏版本时间线' : '显示版本时间线'}
              </button>
            </div>
          </div>

          {showTimeline && selectedBarcode && (
            <div className="lab-card p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-lab-text">
                  版本时间线 - 样本条码:
                  <span className="ml-2 font-mono text-primary-600">{selectedBarcode}</span>
                </h4>
                <button
                  onClick={() => setShowTimeline(false)}
                  className="text-sm text-lab-textMuted hover:text-lab-text"
                >
                  关闭
                </button>
              </div>
              <VersionTimeline
                versions={getVersionHistory(selectedBarcode)}
                onSelectVersion={(v) => setSelectedBarcode(v.barcode)}
              />
            </div>
          )}

          {filteredDiffs.length > 0 ? (
            <DiffList
              diffs={filteredDiffs}
              onViewVersion={handleViewVersion}
              onAddCorrection={handleAddCorrection}
              onAddReview={handleAddReview}
            />
          ) : (
            <Empty
              title="暂无待处理差异"
              description="所有样本数据已同步，无需人工干预"
              icon={CheckCircle2}
            />
          )}
        </div>
      </div>
    </div>
  );
}
