import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import {
  Shield,
  Plus,
  CheckCircle,
  XCircle,
  User,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';

const Permissions: React.FC = () => {
  const {
    permissionRequests,
    currentUser,
    loading,
    fetchPermissionRequests,
    createPermissionRequest,
    approvePermission,
    rejectPermission
  } = useStore();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestedPermission, setRequestedPermission] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPermissionRequests();
  }, []);

  const handleSubmitRequest = async () => {
    if (requestedPermission && requestReason) {
      await createPermissionRequest(requestedPermission, requestReason);
      setShowRequestModal(false);
      setRequestedPermission('');
      setRequestReason('');
    }
  };

  const handleApprove = async (id: string) => {
    await approvePermission(id);
  };

  const handleReject = (id: string) => {
    setSelectedRequestId(id);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (selectedRequestId && rejectReason) {
      await rejectPermission(selectedRequestId, rejectReason);
      setShowRejectModal(false);
      setSelectedRequestId(null);
      setRejectReason('');
    }
  };

  const permissionOptions = [
    { value: 'diagnosis:import', label: '导入诊断数据' },
    { value: 'diagnosis:confirm', label: '确认诊断结果' },
    { value: 'diagnosis:rollback', label: '回滚诊断版本' },
    { value: 'dictionary:edit', label: '修改数据字典' },
    { value: 'permission:approve', label: '审批权限申请' },
    { value: 'boundary:run', label: '运行边界案例' },
  ];

  const isReviewer = currentUser.role === 'sre_reviewer' || currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">权限管理</h1>
          <p className="text-navy-400 mt-1 text-sm">管理权限申请和审批流程，所有操作均有审计记录</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => setShowRequestModal(true)}
        >
          提交申请
        </Button>
      </div>

      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="p-4 border-b border-navy-700">
          <h3 className="text-lg font-semibold text-white">权限申请列表</h3>
        </div>
        <div className="max-h-[600px] overflow-auto">
          {permissionRequests.length === 0 ? (
            <div className="p-12 text-center text-navy-400">
              <Shield size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无权限申请记录</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-navy-700/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-navy-300">申请人</th>
                  <th className="text-left p-3 text-sm font-medium text-navy-300">申请权限</th>
                  <th className="text-left p-3 text-sm font-medium text-navy-300">申请原因</th>
                  <th className="text-left p-3 text-sm font-medium text-navy-300">状态</th>
                  <th className="text-left p-3 text-sm font-medium text-navy-300">审批人</th>
                  <th className="text-left p-3 text-sm font-medium text-navy-300">申请时间</th>
                  {isReviewer && <th className="text-left p-3 text-sm font-medium text-navy-300">操作</th>}
                </tr>
              </thead>
              <tbody>
                {permissionRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-navy-700 hover:bg-navy-700/30 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-navy-600 rounded-full flex items-center justify-center">
                          <User size={14} className="text-navy-300" />
                        </div>
                        <span className="text-sm text-white">{request.requesterName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-mono">
                        <Shield size={12} />
                        {request.requestedPermission}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-navy-300 max-w-xs">
                      <div className="flex items-start gap-1">
                        <FileText size={12} className="text-navy-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{request.reason}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={request.status}>
                        {request.status === 'pending' ? '待审批' : request.status === 'approved' ? '已通过' : '已驳回'}
                      </StatusBadge>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-navy-300">
                        {request.approverName || '-'}
                      </span>
                      {request.rejectReason && (
                        <p className="text-xs text-red-400 mt-1">
                          驳回原因：{request.rejectReason}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-navy-400">
                        <Clock size={12} />
                        {new Date(request.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </td>
                    {isReviewer && (
                      <td className="p-3">
                        {request.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              icon={<CheckCircle size={14} />}
                              onClick={() => handleApprove(request.id)}
                              loading={loading}
                            >
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon={<XCircle size={14} />}
                              onClick={() => handleReject(request.id)}
                            >
                              驳回
                            </Button>
                          </div>
                        )}
                        {request.status !== 'pending' && (
                          <span className="text-xs text-navy-500">
                            {new Date(request.approvedAt || 0).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {permissionRequests.filter(r => r.status === 'pending').length}
              </p>
              <p className="text-sm text-navy-400">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {permissionRequests.filter(r => r.status === 'approved').length}
              </p>
              <p className="text-sm text-navy-400">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {permissionRequests.filter(r => r.status === 'rejected').length}
              </p>
              <p className="text-sm text-navy-400">已驳回</p>
            </div>
          </div>
        </div>
      </div>

      {isReviewer && permissionRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">有待审批的权限申请</p>
            <p className="text-sm text-navy-300 mt-1">
              请及时处理权限申请。越权审批会被记录在审计日志中，包含审批人、时间和原因。
            </p>
          </div>
        </div>
      )}

      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="提交权限申请"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-navy-300 mb-1 block">申请权限</label>
            <select
              value={requestedPermission}
              onChange={(e) => setRequestedPermission(e.target.value)}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">选择要申请的权限...</option>
              {permissionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-navy-300 mb-1 block">申请原因</label>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="请详细说明申请此权限的原因和用途..."
              rows={4}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              <strong>注意：</strong>所有权限申请和审批都会被完整记录到审计日志中，
              包括申请人、审批人、申请时间和原因。请确保申请理由充分合理。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRequestModal(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitRequest}
              disabled={!requestedPermission || !requestReason.trim()}
            >
              提交申请
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequestId(null);
          setRejectReason('');
        }}
        title="驳回权限申请"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-navy-300 mb-1 block">驳回原因</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写驳回原因..."
              rows={4}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-400">
              <strong>注意：</strong>驳回原因会被记录到审计日志中，并通知申请人。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setShowRejectModal(false);
              setSelectedRequestId(null);
              setRejectReason('');
            }}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim()}
            >
              确认驳回
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Permissions;
