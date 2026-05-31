import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, FileText, Shield, User, Clock, AlertTriangle } from 'lucide-react'
import useStore from '@/store/app'
import { extensionApi, auditTrailApi } from '@/lib/api'
import { Card, Button, StatusBadge, Loading, Modal, Textarea, Tag, RiskBadge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { ApprovalRecord, AuditEntry, Material } from '@/types'

export default function ExtensionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedExtension, contracts, selectedContract, loadingExtensionDetail, fetchExtensionDetail, fetchContractDetail, currentUser, addNotification, extensionRisks, fetchExtensionRisks } = useStore()

  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [opinion, setOpinion] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchExtensionDetail(id)
      fetchExtensionRisks(id)
      loadApprovals()
      loadMaterials()
    }
  }, [id])

  useEffect(() => {
    if (selectedExtension) {
      fetchContractDetail(selectedExtension.extension.contract_id)
    }
  }, [selectedExtension])

  const loadApprovals = async () => {
    if (!id) return
    const result = await auditTrailApi.getByExtension(id)
    if (result.success) {
      setApprovals(result.data.map(d => d.approval))
    }
  }

  const loadMaterials = async () => {
    if (!id) return
    const result = await extensionApi.getMaterials(id)
    if (result.success) {
      setMaterials(result.data)
    }
  }

  const handleApprove = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await extensionApi.approve(id, {
        approver_name: currentUser.name,
        approver_role: currentUser.role,
        opinion,
      })
      if (result.success) {
        addNotification('success', '审批通过')
        setShowApproveModal(false)
        fetchExtensionDetail(id)
        loadApprovals()
      } else {
        addNotification('error', result.error || '审批失败')
      }
    } finally {
      setLoading(false)
      setOpinion('')
    }
  }

  const handleReject = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await extensionApi.reject(id, {
        approver_name: currentUser.name,
        approver_role: currentUser.role,
        opinion,
      })
      if (result.success) {
        addNotification('error', '已驳回')
        setShowRejectModal(false)
        fetchExtensionDetail(id)
        loadApprovals()
      } else {
        addNotification('error', result.error || '操作失败')
      }
    } finally {
      setLoading(false)
      setOpinion('')
    }
  }

  if (loadingExtensionDetail || !selectedExtension) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading size="lg" />
      </div>
    )
  }

  const { extension } = selectedExtension
  const originalMaterials = materials.filter(m => m.category === 'original')
  const resultMaterials = materials.filter(m => m.category === 'processing_result')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/extensions')}>
            <ArrowLeft size={16} className="mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800 font-serif">
              第{extension.extension_no}次展期 - {selectedContract?.contract.contract_no}
            </h1>
            <p className="text-sm text-slate-500">借款人：{selectedContract?.contract.borrower_name}</p>
          </div>
          <StatusBadge status={extension.status} />
        </div>
        {extension.status === 'submitted' && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRejectModal(true)}>
              <X size={16} className="mr-2" />
              驳回
            </Button>
            <Button onClick={() => setShowApproveModal(true)}>
              <Check size={16} className="mr-2" />
              通过
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4">展期信息</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-slate-500 uppercase">展期次数</label>
                  <p className="text-slate-800 mt-1">第{extension.extension_no}次展期</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">申请人</label>
                  <p className="text-slate-800 mt-1">{extension.created_by}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">原到期日</label>
                  <p className="text-slate-800 mt-1">{formatDate(extension.original_end_date)}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">新到期日</label>
                  <p className="text-slate-800 mt-1">{formatDate(extension.new_end_date)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 uppercase">展期原因</label>
                  <p className="text-slate-700 mt-1">{extension.extension_reason}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4 flex items-center gap-2">
                <FileText size={20} />
                材料归集
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-3">原始材料</h3>
                  {originalMaterials.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">暂无原始材料</div>
                  ) : (
                    <div className="space-y-2">
                      {originalMaterials.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <FileText size={18} className="text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{m.name}</p>
                            <p className="text-xs text-slate-500">来源: {m.source_person}</p>
                          </div>
                          <Tag>{m.type}</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-3">处理结果</h3>
                  {resultMaterials.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">暂无处理结果</div>
                  ) : (
                    <div className="space-y-2">
                      {resultMaterials.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                          <Shield size={18} className="text-emerald-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{m.name}</p>
                            <p className="text-xs text-slate-500">来源: {m.source_person}</p>
                          </div>
                          <Tag variant="success">{m.type}</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4 flex items-center gap-2">
                <User size={20} />
                审批留痕
              </h2>
              {approvals.length === 0 ? (
                <div className="text-center py-8 text-slate-400">暂无审批记录</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"></div>
                  <div className="space-y-6">
                    {approvals.map(approval => (
                      <div key={approval.id} className="relative pl-12">
                        <div className={`absolute left-3 w-3 h-3 rounded-full border-2 border-white
                          ${approval.action === 'approve' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{approval.approver_name}</span>
                              <Tag>{approval.approver_role}</Tag>
                              <StatusBadge status={approval.action === 'approve' ? 'approved' : 'rejected'} />
                            </div>
                            <span className="text-xs text-slate-500">{formatDate(approval.created_at)}</span>
                          </div>
                          {approval.opinion && (
                            <p className="text-sm text-slate-600">
                              <span className="text-slate-500">意见：</span>
                              {approval.opinion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className={extensionRisks.length > 0 ? 'text-amber-500' : 'text-slate-300'} />
                风险检测
              </h2>
              {extensionRisks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check size={24} className="text-emerald-600" />
                  </div>
                  <p className="text-slate-600">未检测到风险</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extensionRisks.map(flag => (
                    <div key={flag.id} className="p-3 rounded-lg border">
                      <div className="mb-2">
                        <RiskBadge type={flag.type} severity={flag.severity} />
                      </div>
                      <p className="text-sm text-slate-600">{flag.description}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        检测于 {formatDate(flag.detected_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4 flex items-center gap-2">
                <Clock size={20} />
                操作时间
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">创建时间</span>
                  <span className="text-slate-700">{formatDate(extension.created_at)}</span>
                </div>
                {extension.submitted_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">提交时间</span>
                    <span className="text-slate-700">{formatDate(extension.submitted_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="审批通过"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowApproveModal(false)}>取消</Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? <Loading size="sm" /> : '确认通过'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">确认通过该展期申请？</p>
          <Textarea
            label="审批意见（可选）"
            rows={3}
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="请输入审批意见..."
          />
        </div>
      </Modal>

      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="驳回申请"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>取消</Button>
            <Button variant="danger" onClick={handleReject} disabled={loading}>
              {loading ? <Loading size="sm" /> : '确认驳回'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">确认驳回该展期申请？</p>
          <Textarea
            label="驳回原因"
            rows={3}
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="请输入驳回原因..."
          />
        </div>
      </Modal>
    </div>
  )
}
