import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Package, X, Wrench, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { exceptionTypeLabels, dataSourceLabels, ExceptionType, Project } from '../types';

const typeColors: Record<ExceptionType, { bg: string; text: string; border: string }> = {
  physical_value_missing: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  project_mismatch: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  refund_not_reversed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  data_mismatch: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  duplicate_invoice: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
};

export const ExceptionsPage: React.FC = () => {
  const exceptions = useAppStore(state => state.exceptions);
  const donations = useAppStore(state => state.donations);
  const projects = useAppStore(state => state.projects);
  const physicalGoods = useAppStore(state => state.physicalGoods);
  const refunds = useAppStore(state => state.refunds);
  const isDataLoaded = useAppStore(state => state.isDataLoaded);
  const fixProjectMismatch = useAppStore(state => state.fixProjectMismatch);
  const fixPhysicalValue = useAppStore(state => state.fixPhysicalValue);
  const fixRefundReversal = useAppStore(state => state.fixRefundReversal);

  const [activeType, setActiveType] = useState<ExceptionType | 'all'>('all');
  const [showFixModal, setShowFixModal] = useState<{ type: ExceptionType; recordId: string } | null>(null);
  const [fixValue, setFixValue] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const typeCounts = exceptions.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredExceptions = exceptions.filter(e =>
    activeType === 'all' ? !e.resolved : e.type === activeType && !e.resolved
  );

  const getRelatedInfo = (exception: any) => {
    if (exception.recordType === 'donation') {
      return donations.find(d => d.id === exception.recordId);
    } else if (exception.recordType === 'physical') {
      const physical = physicalGoods.find(p => p.id === exception.recordId);
      if (physical) {
        return donations.find(d => d.id === physical.donationId);
      }
    } else if (exception.recordType === 'refund') {
      const refund = refunds.find(r => r.id === exception.recordId);
      if (refund) {
        return donations.find(d => d.id === refund.donationId);
      }
    }
    return null;
  };

  const handleFix = (exception: any) => {
    setShowFixModal({ type: exception.type, recordId: exception.recordId });
    setFixValue('');
    setSelectedProject('');
  };

  const submitFix = () => {
    if (!showFixModal) return;

    const { type, recordId } = showFixModal;

    if (type === 'project_mismatch' && selectedProject) {
      const project = projects.find(p => p.id === selectedProject);
      if (project) {
        fixProjectMismatch(recordId, project.id, project.name);
      }
    } else if (type === 'physical_value_missing' && fixValue) {
      const physical = physicalGoods.find(p => p.id === recordId);
      if (physical) {
        fixPhysicalValue(physical.donationId, parseFloat(fixValue));
      }
    } else if (type === 'refund_not_reversed') {
      const refund = refunds.find(r => r.id === recordId);
      if (refund) {
        fixRefundReversal(refund.donationId);
      }
    }

    setShowFixModal(null);
  };

  if (!isDataLoaded) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">请先导入数据或加载样例数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">异常清单</h2>
        <p className="text-sm text-gray-500 mt-1">
          共发现 <span className="font-semibold text-red-600">{filteredExceptions.length}</span> 条待处理异常
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeType === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({exceptions.filter(e => !e.resolved).length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setActiveType(type as ExceptionType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeType === type
                ? typeColors[type as ExceptionType].bg + ' ' + typeColors[type as ExceptionType].text + ' ring-1 ring-inset ' + typeColors[type as ExceptionType].border
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {exceptionTypeLabels[type as ExceptionType]} ({count})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredExceptions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <p className="text-gray-500">暂无待处理异常</p>
          </div>
        ) : (
          filteredExceptions.map(exception => {
            const colors = typeColors[exception.type];
            const relatedInfo = getRelatedInfo(exception);

            return (
              <div
                key={exception.id}
                className={`bg-white rounded-lg border ${colors.border} p-5`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <AlertTriangle size={20} className={colors.text} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {exceptionTypeLabels[exception.type]}
                        </span>
                        <span className="text-xs text-gray-400">
                          发现于 {new Date(exception.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800">{exception.description}</p>
                      <p className="text-sm text-gray-500 mt-1">{exception.suggestion}</p>

                      {relatedInfo && (
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} className="text-gray-400" />
                            <span className="text-gray-600">捐赠人：</span>
                            <span className="font-medium text-gray-800">{relatedInfo.donorName}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">金额：</span>
                            <span className="font-medium text-gray-800">¥{relatedInfo.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <span className="text-gray-400">
                          来源：<span className="text-gray-600">{dataSourceLabels[exception.source]}</span>
                        </span>
                        <span className="text-gray-400">
                          原始行号：<span className="font-mono text-gray-600">第 {exception.sourceLine} 行</span>
                        </span>
                        <span className="text-gray-400">
                          记录ID：<span className="font-mono text-gray-600">{exception.recordId}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFix(exception)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Wrench size={14} />
                    修复
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showFixModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                修复{exceptionTypeLabels[showFixModal.type]}
              </h3>
              <button
                onClick={() => setShowFixModal(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {showFixModal.type === 'project_mismatch' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择正确的项目
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择项目</option>
                  {projects.map((project: Project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showFixModal.type === 'physical_value_missing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  输入实物估值金额（元）
                </label>
                <input
                  type="number"
                  value={fixValue}
                  onChange={(e) => setFixValue(e.target.value)}
                  placeholder="请输入金额"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {showFixModal.type === 'refund_not_reversed' && (
              <div className="text-sm text-gray-600">
                <p className="mb-4">确认对该退款对应的票据执行冲销操作？</p>
                <p className="text-gray-500">冲销后票据状态将变更为「已冲销」，不再计入正常核销结果。</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFixModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitFix}
                disabled={
                  (showFixModal.type === 'project_mismatch' && !selectedProject) ||
                  (showFixModal.type === 'physical_value_missing' && !fixValue)
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认修复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
