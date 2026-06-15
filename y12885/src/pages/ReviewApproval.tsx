import { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Eye,
  ArrowRight,
  ArrowLeft,
  Download,
  Filter,
  Check,
  X,
  AlertTriangle,
  MessageSquare,
  History,
  Ship,
  Droplets,
  MapPin,
} from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, getVersionHistory } from '../mock/data';
import { ReviewTask, ReviewStatus, DataQuality, REVIEW_TASK_TYPES, SHIP_LIST } from '../types';
import StatCard from '../components/StatCard';
import ActionableErrorCard from '../components/ActionableErrorCard';

export default function ReviewApproval() {
  const {
    reviewTasks,
    versionRecords,
    trackPoints,
    actionableErrors,
    viewMode,
    approveReviewTask,
    rejectReviewTask,
    updateTrackPoint,
    addNotification,
  } = useAppStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    let filtered = reviewTasks.filter(t => t.status === activeTab);
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }
    
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [reviewTasks, activeTab, selectedType]);

  const selectedTask = useMemo(() => 
    reviewTasks.find(t => t.id === selectedTaskId) || null,
    [reviewTasks, selectedTaskId]
  );

  const taskRelatedRecords = useMemo(() => {
    if (!selectedTask) return [];
    return versionRecords.filter(r => 
      selectedTask.relatedRecordIds.includes(r.recordId)
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedTask, versionRecords]);

  const relatedPoints = useMemo(() => {
    if (!selectedTask) return [];
    return trackPoints.filter(p => 
      selectedTask.relatedRecordIds.includes(p.id)
    );
  }, [selectedTask, trackPoints]);

  const taskStats = useMemo(() => ({
    pending: reviewTasks.filter(t => t.status === 'pending').length,
    approved: reviewTasks.filter(t => t.status === 'approved').length,
    rejected: reviewTasks.filter(t => t.status === 'rejected').length,
  }), [reviewTasks]);

  const handleApprove = () => {
    if (!selectedTask) return;
    
    approveReviewTask(selectedTask.id, '数据复核通过，符合海洋碳汇核算要求');
    relatedPoints.forEach(p => {
      updateTrackPoint(p.id, { dataQuality: 'available' as DataQuality });
    });
    addNotification(`已通过复核：${selectedTask.title}`, 'success');
    setSelectedTaskId(null);
  };

  const handleReject = () => {
    if (!selectedTask || !rejectReason.trim()) return;
    
    rejectReviewTask(selectedTask.id, rejectReason);
    addNotification(`已驳回复核：${selectedTask.title}`, 'error');
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedTaskId(null);
  };

  const getTaskTypeIcon = (type: string) => {
    if (type.includes('轨迹')) return Ship;
    if (type.includes('水质')) return Droplets;
    return FileText;
  };

  const tabs = [
    { key: 'pending' as ReviewStatus, label: '待复核', icon: Clock, count: taskStats.pending, color: 'pending' },
    { key: 'approved' as ReviewStatus, label: '已通过', icon: CheckCircle, count: taskStats.approved, color: 'available' },
    { key: 'rejected' as ReviewStatus, label: '已驳回', icon: XCircle, count: taskStats.rejected, color: 'recollect' },
  ];

  return (
    <div className="min-h-screen bg-ocean-gradient bg-grid-pattern bg-grid p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ocean-100">
              {viewMode === 'marine_affairs' ? '复核审批' : '任务提交'}
            </h1>
            <p className="text-sm text-ocean-400 mt-1">
              {viewMode === 'marine_affairs' 
                ? '海事处复核审批，确认数据质量状态' 
                : '海事安全员提交复核任务，等待海事处审批'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出审批记录
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            title="待复核"
            value={taskStats.pending}
            icon={Clock}
            color="pending"
            subtitle={`${taskStats.pending > 0 ? '需要及时处理' : '暂无待办'}`}
          />
          <StatCard
            title="本月已通过"
            value={taskStats.approved}
            icon={CheckCircle}
            color="available"
            trend="up"
            trendValue="+12%"
          />
          <StatCard
            title="已驳回"
            value={taskStats.rejected}
            icon={XCircle}
            color="recollect"
          />
        </div>

        {actionableErrors.filter(e => e.code.startsWith('AP')).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ocean-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              审批相关问题
            </h3>
            {actionableErrors.filter(e => e.code.startsWith('AP')).slice(0, 1).map(error => (
              <ActionableErrorCard key={error.id} error={error} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setSelectedTaskId(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        activeTab === tab.key
                          ? 'bg-ocean-700/50 text-ocean-100'
                          : 'text-ocean-400 hover:bg-ocean-800/50 hover:text-ocean-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      <span className="px-1.5 py-0.5 text-xs bg-ocean-800 rounded-full">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="input-field text-xs py-1.5 flex-1"
                >
                  <option value="all">全部类型</option>
                  {REVIEW_TASK_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  筛选
                </button>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-ocean-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无{tabs.find(t => t.key === activeTab)?.label}任务</p>
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    const TypeIcon = getTaskTypeIcon(task.type);
                    const isSelected = selectedTaskId === task.id;

                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full p-4 text-left rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-ocean-700/30 border-ocean-500 shadow-lg shadow-ocean-500/10'
                            : 'bg-ocean-900/50 border-ocean-700/30 hover:border-ocean-600/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              task.type.includes('轨迹') 
                                ? 'bg-ocean-500/20 text-ocean-400' 
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <StatusBadge status={task.status} type="review" />
                                <span className="text-xs text-ocean-400 font-mono">{task.type}</span>
                              </div>
                              <p className="text-sm font-medium text-ocean-100 truncate">{task.title}</p>
                              <p className="text-xs text-ocean-400 mt-1 line-clamp-2">{task.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-ocean-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {task.submitterName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDateTime(task.createdAt).slice(5, 16)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {task.relatedRecordIds.length} 条记录
                                </span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-transform ${
                            isSelected ? 'text-ocean-400 translate-x-1' : 'text-ocean-600'
                          }`} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-4">
            {!selectedTask ? (
              <div className="glass-panel p-12 text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-ocean-600" />
                <h3 className="text-lg font-medium text-ocean-200 mb-2">选择任务查看详情</h3>
                <p className="text-sm text-ocean-400">
                  从左侧列表中选择一个复核任务，查看详细信息并进行审批操作
                </p>
              </div>
            ) : (
              <>
                <div className="glass-panel p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <StatusBadge status={selectedTask.status} type="review" />
                        <StatusBadge status={selectedTask.priority} type="severity" />
                        <span className="text-xs text-ocean-400 font-mono bg-ocean-800/50 px-2 py-0.5 rounded">
                          {selectedTask.type}
                        </span>
                      </div>
                      <h2 className="text-xl font-display font-bold text-ocean-100 mb-2">
                        {selectedTask.title}
                      </h2>
                      <p className="text-sm text-ocean-300">{selectedTask.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedTaskId(null)}
                      className="p-2 hover:bg-ocean-700/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-ocean-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-ocean-900/50 rounded-lg">
                    <div>
                      <p className="text-xs text-ocean-400 mb-1">提交人</p>
                      <p className="text-sm text-ocean-100 flex items-center gap-2">
                        <User className="w-4 h-4 text-ocean-500" />
                        {selectedTask.submitterName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ocean-400 mb-1">提交时间</p>
                      <p className="text-sm text-ocean-100 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-ocean-500" />
                        {formatDateTime(selectedTask.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ocean-400 mb-1">关联记录</p>
                      <p className="text-sm text-ocean-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-ocean-500" />
                        {selectedTask.relatedRecordIds.length} 条
                      </p>
                    </div>
                  </div>

                  {relatedPoints.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-ocean-100 mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        关联轨迹点
                      </h4>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                        {relatedPoints.map(point => (
                          <div key={point.id} className="p-3 bg-ocean-900/50 rounded-lg text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-ocean-300">{point.shipName}</span>
                              <StatusBadge status={point.dataQuality} type="data-quality" />
                            </div>
                            <p className="text-ocean-400 font-mono">
                              {point.longitude.toFixed(4)}°E, {point.latitude.toFixed(4)}°N
                            </p>
                            <p className={`font-mono ${point.depth < 0 ? 'text-data-recollect' : 'text-ocean-300'}`}>
                              深度: {point.depth.toFixed(2)}m
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {taskRelatedRecords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-ocean-100 mb-3 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        修改历史记录
                      </h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {taskRelatedRecords.map((record, index) => (
                          <div key={record.id} className="relative pl-6 pb-4">
                            {index < taskRelatedRecords.length - 1 && (
                              <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-ocean-700/50" />
                            )}
                            <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-ocean-700 border-2 border-ocean-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-ocean-400" />
                            </div>
                            <div className="p-3 bg-ocean-900/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-ocean-100">
                                  {record.operatorName}
                                </span>
                                <span className="text-xs text-ocean-500">
                                  {formatDateTime(record.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-ocean-300 mb-2">{record.changeType}</p>
                              {record.before && record.after && (
                                <div className="flex items-center gap-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-ocean-500">原值:</span>
                                    <span className="line-through text-data-recollect font-mono">
                                      {JSON.stringify(record.before)}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-ocean-600" />
                                  <div className="flex items-center gap-1">
                                    <span className="text-ocean-500">新值:</span>
                                    <span className="text-data-available font-mono">
                                      {JSON.stringify(record.after)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {record.remark && (
                                <p className="text-xs text-ocean-400 mt-2 italic">
                                  备注: {record.remark}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedTask.status === 'pending' && viewMode === 'marine_affairs' && (
                  <div className="glass-panel p-4 bg-gradient-to-r from-ocean-800/50 to-ocean-700/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-ocean-400" />
                        <div>
                          <p className="text-sm font-medium text-ocean-100">审批操作</p>
                          <p className="text-xs text-ocean-400">
                            请仔细核对数据修改内容和历史记录后进行审批
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="btn-danger flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          驳回
                        </button>
                        <button
                          onClick={handleApprove}
                          className="btn-success flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          通过
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.status === 'pending' && viewMode === 'safety_officer' && (
                  <div className="glass-panel p-4 bg-gradient-to-r from-data-pending/10 to-ocean-700/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-data-pending" />
                        <div>
                          <p className="text-sm font-medium text-ocean-100">等待海事处审批</p>
                          <p className="text-xs text-ocean-400">
                            任务已提交，正在等待海事处复核审批
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.status === 'approved' && (
                  <div className="glass-panel p-4 bg-gradient-to-r from-data-available/10 to-ocean-700/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-data-available" />
                      <div>
                        <p className="text-sm font-medium text-ocean-100">已通过审批</p>
                        <p className="text-xs text-ocean-400">
                          审批人: {selectedTask.reviewerName || '系统'} · {formatDateTime(selectedTask.reviewedAt || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.status === 'rejected' && (
                  <div className="glass-panel p-4 bg-gradient-to-r from-data-recollect/10 to-ocean-700/30">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-data-recollect" />
                      <div>
                        <p className="text-sm font-medium text-ocean-100">已被驳回</p>
                        <p className="text-xs text-ocean-400">
                          驳回原因: {selectedTask.rejectReason || '未填写原因'}
                        </p>
                        <p className="text-xs text-ocean-500 mt-1">
                          审批人: {selectedTask.reviewerName || '系统'} · {formatDateTime(selectedTask.reviewedAt || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-display font-bold text-ocean-100 mb-2">驳回复核</h3>
            <p className="text-sm text-ocean-400 mb-4">
              请填写驳回原因，以便海事安全员进行修正
            </p>
            <textarea
              className="input-field w-full h-24 resize-none mb-4"
              placeholder="请输入驳回原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="btn-danger flex items-center gap-2"
                disabled={!rejectReason.trim()}
              >
                <X className="w-4 h-4" />
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
