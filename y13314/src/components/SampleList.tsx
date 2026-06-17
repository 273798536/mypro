import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { Eye, FileWarning, Clock, Link2, User } from 'lucide-react';

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { dot: string; text: string; label: string }> = {
    pending: { dot: 'status-pending', text: 'text-amber-700', label: '待处理' },
    approved: { dot: 'status-approved', text: 'text-moss-700', label: '已批准' },
    rejected: { dot: 'status-rejected', text: 'text-rust-700', label: '已拒绝' },
    suspended: { dot: 'status-suspended', text: 'text-sky-700', label: '已挂起' },
  };
  return configs[status] || configs.pending;
};

export const SampleList = () => {
  const { filteredSamples, selectSample } = useAppStore();
  const navigate = useNavigate();

  const handleViewDetail = (sampleId: string) => {
    selectSample(sampleId);
    navigate(`/sample/${sampleId}`);
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-200 flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-navy-800">样本列表</h3>
        <div className="text-xs text-navy-500">
          共 <span className="font-mono font-semibold text-navy-700">{filteredSamples.length}</span> 条记录
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto scrollbar-thin">
        <table className="data-table">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th>样本ID</th>
              <th>客户名称</th>
              <th>客户分层</th>
              <th>申请日期</th>
              <th>当前状态</th>
              <th>最新评分</th>
              <th>阈值</th>
              <th>模型版本</th>
              <th>特殊标记</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSamples.map((sample, index) => {
              const statusConfig = getStatusConfig(sample.status);
              const isMisjudgeSample = sample.id === 'MISJUDGE001';
              
              return (
                <tr 
                  key={sample.id} 
                  className={`${sample.isSuspended ? 'suspended-row' : ''} animate-fade-in animate-stagger-${(index % 8) + 1}`}
                >
                  <td className="font-mono text-sm text-navy-600">{sample.id}</td>
                  <td className="font-medium text-navy-800">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-navy-400" />
                      {sample.customerName}
                      {isMisjudgeSample && (
                        <span className="tag tag-amber ml-1">误判测试</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="tag">{sample.segmentName}</span>
                  </td>
                  <td className="font-mono text-navy-600">{formatDate(sample.applyDate)}</td>
                  <td>
                    <span className="flex items-center gap-1">
                      <span className={`status-dot ${statusConfig.dot}`}></span>
                      <span className={`text-sm font-medium ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <span className={`font-mono font-bold text-lg ${
                        sample.latestResult === 'pass' ? 'text-moss-600' : 'text-rust-600'
                      }`}>
                        {sample.latestScore}
                      </span>
                      <span className={`text-xs ${
                        sample.latestResult === 'pass' ? 'text-moss-500' : 'text-rust-500'
                      }`}>
                        {sample.latestResult === 'pass' ? '通过' : '未通过'}
                      </span>
                    </div>
                  </td>
                  <td className="font-mono text-navy-600">≥{sample.threshold}</td>
                  <td className="font-mono text-xs text-navy-500">{sample.modelVersion}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {sample.isSuspended && (
                        <span className="tag tag-sky" title={sample.suspendReason}>
                          <FileWarning className="w-3 h-3 mr-1" />
                          已挂起
                        </span>
                      )}
                      {sample.hasLateAttachment && (
                        <span className="tag tag-amber" title="包含晚到附件">
                          <Clock className="w-3 h-3 mr-1" />
                          晚到附件
                        </span>
                      )}
                      {!sample.referenceComplete && !sample.isSuspended && (
                        <span className="tag tag-rust">
                          <Link2 className="w-3 h-3 mr-1" />
                          引用缺失
                        </span>
                      )}
                      {sample.isSuspended && sample.assignedTo && (
                        <span className="text-xs text-navy-500">
                          → {sample.assignedTo}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleViewDetail(sample.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-navy-600 border border-navy-300 hover:bg-navy-50 hover:border-navy-500 hover:text-navy-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看详情
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
