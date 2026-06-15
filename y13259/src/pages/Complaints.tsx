import { useEffect, useMemo, useState } from 'react';
import { Search, AlertCircle, Merge, CheckCircle, Eye, X, ChevronRight, FileText, User, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useComplaintStore } from '@/store/useComplaintStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { usePublicListStore } from '@/store/usePublicListStore';
import { formatDate } from '@/services/traceService';
import { getStatusLabel } from '@/services/detectionService';
import StatusBadge from '@/components/StatusBadge';
import MergePrompt from '@/components/MergePrompt';
import ConfirmModal from '@/components/ConfirmModal';
import type { Complaint, ComplaintStatus, MergeableComplaintGroup } from '@/types';
import { cn } from '@/lib/utils';

const statusOptions: Array<{ value: ComplaintStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'merged', label: '已归并' },
  { value: 'resolved', label: '已解决' },
];

export default function Complaints() {
  const {
    complaints,
    loading,
    mergeableGroups,
    showMergePrompt,
    pendingMergeGroup,
    fetchComplaints,
    setShowMergePrompt,
    mergeComplaints,
    resolveComplaint,
  } = useComplaintStore();

  const { addRecord } = useHistoryStore();
  const { items: publicListItems, fetchItems: fetchPublicListItems } = usePublicListStore();

  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MergeableComplaintGroup | null>(null);
  const [showMergeBanner, setShowMergeBanner] = useState(false);
  const [firstMergeableGroup, setFirstMergeableGroup] = useState<MergeableComplaintGroup | null>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [pendingResolveId, setPendingResolveId] = useState<string | null>(null);
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    fetchComplaints();
    fetchPublicListItems();
  }, [fetchComplaints, fetchPublicListItems]);

  useEffect(() => {
    if (mergeableGroups.length > 0) {
      setFirstMergeableGroup(mergeableGroups[0]);
      setShowMergeBanner(true);
    } else {
      setShowMergeBanner(false);
      setFirstMergeableGroup(null);
    }
  }, [mergeableGroups]);

  const stats = useMemo(() => {
    return {
      pending: complaints.filter(c => c.status === 'pending').length,
      merged: complaints.filter(c => c.status === 'merged').length,
      resolved: complaints.filter(c => c.status === 'resolved').length,
      mergeable: mergeableGroups.reduce((sum, g) => sum + g.complaints.length, 0),
    };
  }, [complaints, mergeableGroups]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(complaint => {
      if (statusFilter !== 'all' && complaint.status !== statusFilter) return false;
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const listItem = publicListItems.find(item => item.id === complaint.listItemId);
        const schoolName = listItem?.schoolName || '';
        return (
          complaint.id.toLowerCase().includes(searchLower) ||
          complaint.content.toLowerCase().includes(searchLower) ||
          complaint.reporter.toLowerCase().includes(searchLower) ||
          complaint.street.toLowerCase().includes(searchLower) ||
          schoolName.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [complaints, statusFilter, searchText, publicListItems]);

  const getSchoolName = (listItemId: string): string => {
    const item = publicListItems.find(i => i.id === listItemId);
    return item?.schoolName || '未知学校';
  };

  const isComplaintMergeable = (complaint: Complaint): boolean => {
    return mergeableGroups.some(group =>
      group.complaints.some(c => c.id === complaint.id)
    );
  };

  const getMergeGroupForComplaint = (complaintId: string): MergeableComplaintGroup | undefined => {
    return mergeableGroups.find(group =>
      group.complaints.some(c => c.id === complaintId)
    );
  };

  const handleMergeClick = (group: MergeableComplaintGroup) => {
    setShowMergePrompt(true, group);
  };

  const handleMergeConfirm = (explanation: string) => {
    if (!pendingMergeGroup) return;

    const beforeData = {
      complaintIds: pendingMergeGroup.complaints.map(c => c.id),
      count: pendingMergeGroup.complaints.length,
      street: pendingMergeGroup.street,
    };

    mergeComplaints(pendingMergeGroup, explanation);

    const originalIds = pendingMergeGroup.complaints.map(c => c.id).join(',');
    const afterData = {
      originalIds,
      count: 1,
      street: pendingMergeGroup.street,
      explanation,
    };

    addRecord('老曹', 'merge', beforeData, afterData, explanation);

    if (selectedGroup?.key === pendingMergeGroup.key) {
      setSelectedGroup(null);
    }
  };

  const handleResolveClick = (id: string) => {
    setPendingResolveId(id);
    setResolveModalOpen(true);
  };

  const handleResolveConfirm = () => {
    if (!pendingResolveId) return;

    const complaint = complaints.find(c => c.id === pendingResolveId);
    if (!complaint) return;

    const beforeData = {
      complaintId: pendingResolveId,
      status: complaint.status,
    };

    resolveComplaint(pendingResolveId);

    const afterData = {
      complaintId: pendingResolveId,
      status: 'resolved',
    };

    addRecord('老曹', 'confirm', beforeData, afterData, '投诉已处理完成，问题已解决。');

    setResolveModalOpen(false);
    setPendingResolveId(null);
  };

  const handleCardClick = (complaint: Complaint) => {
    if (complaint.status === 'pending') {
      const group = getMergeGroupForComplaint(complaint.id);
      if (group) {
        setSelectedGroup(group === selectedGroup ? null : group);
      } else {
        setSelectedGroup(null);
      }
    } else {
      setSelectedGroup(null);
    }
  };

  const handleViewDetail = (complaint: Complaint) => {
    setDetailComplaint(complaint);
  };

  const handleBannerMerge = () => {
    if (firstMergeableGroup) {
      handleMergeClick(firstMergeableGroup);
    }
  };

  const getTagStyle = (status: ComplaintStatus, isMergeable: boolean): string => {
    if (isMergeable && status === 'pending') {
      return 'bg-warning-100 text-warning-700 border-warning-200';
    }
    if (status === 'merged') {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (status === 'resolved') {
      return 'bg-success-100 text-success-700 border-success-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTagLabel = (status: ComplaintStatus, isMergeable: boolean): string => {
    if (isMergeable && status === 'pending') {
      return '可归并';
    }
    if (status === 'merged') {
      return '已归并';
    }
    if (status === 'resolved') {
      return '已解决';
    }
    return getStatusLabel(status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">投诉处理</h1>
          <p className="mt-2 text-gray-600">同街口智能归并，保留原始记录</p>
        </div>

        <AnimatePresence>
          {showMergeBanner && firstMergeableGroup && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">
                    检测到同街口 {firstMergeableGroup.complaints.length} 条投诉，是否人工确认归并？
                  </p>
                  <p className="text-sm text-amber-600">
                    街口：{firstMergeableGroup.street}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMergeBanner(false)}
                  className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <X className="w-5 h-5 text-amber-600" />
                </button>
                <button
                  onClick={handleBannerMerge}
                  className="px-5 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                  <Merge className="w-4 h-4" />
                  立即归并
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">状态：</span>
              <div className="flex gap-1">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      statusFilter === option.value
                        ? 'bg-municipal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索投诉ID、内容、投诉人、街口、学校..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-municipal-500 focus:border-municipal-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">待处理</p>
                <p className="mt-1 text-3xl font-bold text-warning-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">可归并</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">{stats.mergeable}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Merge className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">已归并</p>
                <p className="mt-1 text-3xl font-bold text-purple-600">{stats.merged}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">已解决</p>
                <p className="mt-1 text-3xl font-bold text-success-600">{stats.resolved}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className={cn(
            'space-y-4 transition-all duration-300',
            selectedGroup ? 'flex-1 min-w-0' : 'w-full'
          )}>
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-municipal-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-500">加载中...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-500">暂无匹配的投诉数据</p>
              </div>
            ) : (
              filteredComplaints.map(complaint => {
                const isMergeable = isComplaintMergeable(complaint);
                const schoolName = getSchoolName(complaint.listItemId);
                const isSelected = selectedGroup?.complaints.some(c => c.id === complaint.id);
                const tagStyle = getTagStyle(complaint.status, isMergeable);
                const tagLabel = getTagLabel(complaint.status, isMergeable);

                return (
                  <motion.div
                    key={complaint.id}
                    onClick={() => handleCardClick(complaint)}
                    layout
                    className={cn(
                      'bg-white rounded-xl shadow-sm border transition-all cursor-pointer',
                      'hover:shadow-md hover:-translate-y-0.5',
                      isSelected && 'ring-2 ring-municipal-500 shadow-md',
                      isMergeable && complaint.status === 'pending' && 'border-amber-200'
                    )}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm font-mono text-gray-500">{complaint.id}</span>
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border',
                              tagStyle
                            )}>
                              {tagLabel}
                            </span>
                            <StatusBadge status={complaint.status} />
                            {isMergeable && complaint.status === 'pending' && (
                              <ChevronRight className="w-4 h-4 text-amber-500" />
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 truncate">{complaint.street}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 truncate">{schoolName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 truncate">{complaint.reporter}</span>
                            </div>
                          </div>

                          <p className="text-gray-900 mb-3 leading-relaxed">{complaint.content}</p>

                          {complaint.status === 'merged' && complaint.originalIds && (
                            <p className="text-xs text-gray-500 mb-3">
                              原始ID：{complaint.originalIds}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(complaint.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {complaint.status === 'pending' && isMergeable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const group = getMergeGroupForComplaint(complaint.id);
                                if (group) handleMergeClick(group);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <Merge className="w-4 h-4" />
                              归并
                            </button>
                          )}
                          {complaint.status !== 'resolved' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveClick(complaint.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-700 bg-success-50 rounded-lg hover:bg-success-100 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              标记已解决
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(complaint);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            查看详情
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <AnimatePresence>
            {selectedGroup && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-[480px] flex-shrink-0"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-8">
                  <div className="px-6 py-4 border-b border-gray-200 bg-amber-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">同街口投诉对比</h3>
                      <p className="text-sm text-gray-600">{selectedGroup.street}</p>
                    </div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <p className="text-center text-gray-700 font-medium">
                      共 {selectedGroup.complaints.length} 条投诉，人工判断是否相关
                    </p>

                    <div className="space-y-4">
                      {selectedGroup.complaints.map((complaint, index) => {
                        const schoolName = getSchoolName(complaint.listItemId);
                        return (
                          <div key={complaint.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="inline-flex items-center px-2 py-1 bg-municipal-100 text-municipal-700 text-xs font-medium rounded">
                                投诉 #{index + 1}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">{complaint.id}</span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-900">{complaint.reporter}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-600">{schoolName}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-900 leading-relaxed">{complaint.content}</p>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(complaint.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Merge className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-800 mb-1">归并说明</p>
                          <p className="text-blue-700">
                            如确认两条投诉内容相关，可点击下方按钮进行人工归并。归并后原始记录保留，状态标记为「已归并」。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setSelectedGroup(null)}
                        className={cn(
                          'px-5 py-2.5 rounded-lg font-medium transition-colors',
                          'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        暂不归并
                      </button>
                      <button
                        onClick={() => handleMergeClick(selectedGroup)}
                        className={cn(
                          'px-5 py-2.5 rounded-lg font-medium transition-colors',
                          'bg-municipal-600 text-white hover:bg-municipal-700'
                        )}
                      >
                        人工确认归并
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <MergePrompt
        group={showMergePrompt ? pendingMergeGroup : null}
        onConfirm={handleMergeConfirm}
        onCancel={() => setShowMergePrompt(false, null)}
      />

      <ConfirmModal
        isOpen={resolveModalOpen}
        title="确认标记已解决"
        message={
          <div className="space-y-2">
            <p className="text-gray-600">确定要将此投诉标记为已解决吗？</p>
            <p className="text-sm text-gray-500">此操作将记入历史记录。</p>
          </div>
        }
        onConfirm={handleResolveConfirm}
        onCancel={() => {
          setResolveModalOpen(false);
          setPendingResolveId(null);
        }}
        confirmText="确认解决"
        cancelText="取消"
        confirmVariant="primary"
      />

      <AnimatePresence>
        {detailComplaint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setDetailComplaint(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">投诉详情</h3>
                <button
                  onClick={() => setDetailComplaint(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-500">{detailComplaint.id}</span>
                  <StatusBadge status={detailComplaint.status} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">街口</label>
                    <p className="text-sm font-medium text-gray-900">{detailComplaint.street}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">学校</label>
                    <p className="text-sm font-medium text-gray-900">{getSchoolName(detailComplaint.listItemId)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">投诉人</label>
                    <p className="text-sm font-medium text-gray-900">{detailComplaint.reporter}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">投诉时间</label>
                    <p className="text-sm font-medium text-gray-900">{formatDate(detailComplaint.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">投诉内容</label>
                  <p className="text-sm text-gray-900 mt-1 leading-relaxed whitespace-pre-wrap">{detailComplaint.content}</p>
                </div>

                {detailComplaint.originalIds && (
                  <div>
                    <label className="text-xs text-gray-500">原始投诉ID</label>
                    <p className="text-sm text-gray-900 mt-1 font-mono">{detailComplaint.originalIds}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setDetailComplaint(null)}
                  className="px-5 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
