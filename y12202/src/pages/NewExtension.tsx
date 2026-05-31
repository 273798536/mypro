import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Upload, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import useStore from '@/store/app'
import { extensionApi } from '@/lib/api'
import { Card, Button, StatusBadge, Loading, Input, Textarea, Select, Tag, RiskBadge, Modal } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import type { DetectedRisk, Material } from '@/types'

type Step = 'basic' | 'materials' | 'confirm'

export default function NewExtension() {
  const navigate = useNavigate()
  const location = useLocation()
  const { contracts, fetchContracts, currentUser, addNotification } = useStore()

  const [step, setStep] = useState<Step>('basic')
  const [selectedContractId, setSelectedContractId] = useState(location.state?.contractId || '')
  const [originalEndDate, setOriginalEndDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [extensionReason, setExtensionReason] = useState('')
  const [extensionId, setExtensionId] = useState<string | null>(null)
  const [detectedRisks, setDetectedRisks] = useState<DetectedRisk[]>([])
  const [materials, setMaterials] = useState<{ name: string; type: string; category: string; source_person: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [detectingRisks, setDetectingRisks] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [newMaterial, setNewMaterial] = useState({ name: '', type: 'pdf', category: 'original', source_person: currentUser.name })

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    if (selectedContractId) {
      const contract = contracts.find(c => c.id === selectedContractId)
      if (contract) {
        setOriginalEndDate(contract.end_date)
      }
    }
  }, [selectedContractId, contracts])

  const selectedContract = contracts.find(c => c.id === selectedContractId)

  const autoSaveDraft = async () => {
    if (!selectedContractId || !newEndDate || !extensionReason) return

    try {
      if (!extensionId) {
        const result = await extensionApi.create({
          contract_id: selectedContractId,
          original_end_date: originalEndDate,
          new_end_date: newEndDate,
          extension_reason: extensionReason,
          created_by: currentUser.name,
        })
        if (result.success) {
          setExtensionId(result.data.id)
          localStorage.setItem('extension_draft_id', result.data.id)
        }
      } else {
        await extensionApi.update(extensionId, {
          new_end_date: newEndDate,
          extension_reason: extensionReason,
        })
      }
    } catch (err) {
      console.error('Auto save failed:', err)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedContractId && newEndDate && extensionReason && step === 'basic') {
        autoSaveDraft()
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [selectedContractId, newEndDate, extensionReason, step])

  useEffect(() => {
    if (extensionId && step === 'confirm' && detectedRisks.length === 0) {
      detectRisks()
    }
  }, [extensionId, step])

  const detectRisks = async () => {
    if (!extensionId) return
    setDetectingRisks(true)
    try {
      const result = await extensionApi.detectRisks(extensionId)
      if (result.success) {
        setDetectedRisks(result.data)
      }
    } finally {
      setDetectingRisks(false)
    }
  }

  const handleNext = () => {
    if (step === 'basic') {
      if (!selectedContractId || !newEndDate || !extensionReason) {
        addNotification('error', '请填写完整的展期信息')
        return
      }
      autoSaveDraft()
      setStep('materials')
    } else if (step === 'materials') {
      setStep('confirm')
    }
  }

  const handleAddMaterial = () => {
    if (!newMaterial.name || !newMaterial.source_person) return
    setMaterials([...materials, { ...newMaterial }])
    setNewMaterial({ name: '', type: 'pdf', category: 'original', source_person: currentUser.name })
    setShowMaterialModal(false)
  }

  const handleSubmit = async () => {
    if (!extensionId) return
    setLoading(true)
    try {
      for (const mat of materials) {
        await extensionApi.addMaterial(extensionId, mat)
      }

      const result = await extensionApi.submit(extensionId)
      if (result.success) {
        localStorage.removeItem('extension_draft_id')
        addNotification('success', '展期申请提交成功')
        navigate(`/extensions/${result.data.extension.id}`)
      } else {
        addNotification('error', result.error || '提交失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'basic', label: '基本信息', icon: <Clock size={18} /> },
    { key: 'materials', label: '上传材料', icon: <Upload size={18} /> },
    { key: 'confirm', label: '确认提交', icon: <CheckCircle size={18} /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/extensions')}>
          <ArrowLeft size={16} className="mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-semibold text-slate-800 font-serif">新建展期申请</h1>
        {extensionId && <StatusBadge status="draft" />}
      </div>

      <Card>
        <div className="flex items-center p-6 border-b border-slate-200">
          {steps.map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === s.key ? 'bg-slate-100 text-slate-800' :
                steps.findIndex(x => x.key === step) > index ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === s.key ? 'bg-slate-800 text-white' :
                  steps.findIndex(x => x.key === step) > index ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {steps.findIndex(x => x.key === step) > index ? <CheckCircle size={16} /> : index + 1}
                </div>
                <span className="font-medium text-sm hidden sm:inline">{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  steps.findIndex(x => x.key === step) > index ? 'bg-emerald-500' : 'bg-slate-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6">
          {step === 'basic' && (
            <div className="max-w-2xl space-y-6">
              <Select
                label="选择借款合同"
                required
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                options={[
                  { value: '', label: '请选择合同' },
                  ...contracts.map(c => ({ value: c.id, label: `${c.contract_no} - ${c.borrower_name} (¥${(c.amount / 10000).toFixed(0)}万)` }))
                ]}
              />

              {selectedContract && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">借款人：</span>
                      <span className="text-slate-800">{selectedContract.borrower_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">借款金额：</span>
                      <span className="text-slate-800">¥{(selectedContract.amount / 10000).toFixed(0)}万</span>
                    </div>
                    <div>
                      <span className="text-slate-500">原到期日：</span>
                      <span className="text-slate-800">{formatDate(selectedContract.end_date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">合同状态：</span>
                      <StatusBadge status={selectedContract.status} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="原到期日"
                  type="date"
                  value={originalEndDate}
                  readOnly
                  className="bg-slate-50"
                />
                <Input
                  label="新到期日"
                  type="date"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={originalEndDate}
                />
              </div>

              <Textarea
                label="展期原因"
                required
                rows={4}
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="请详细说明展期原因..."
              />
            </div>
          )}

          {step === 'materials' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800">申请材料</h3>
                <Button variant="outline" size="sm" onClick={() => setShowMaterialModal(true)}>
                  <Upload size={16} className="mr-2" />
                  添加材料
                </Button>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Upload size={48} className="mx-auto mb-4 text-slate-300" />
                  <p>暂无材料</p>
                  <p className="text-sm mt-1">点击右上角添加申请材料</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {materials.map((mat, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center">
                        <Upload size={20} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{mat.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Tag variant="default">{mat.category === 'original' ? '原始材料' : '处理结果'}</Tag>
                          <span className="text-xs text-slate-500">来源: {mat.source_person}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setMaterials(materials.filter((_, i) => i !== index))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <h3 className="font-medium text-slate-800">展期信息确认</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">合同编号：</span>
                    <span className="text-slate-800">{selectedContract?.contract_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">借款人：</span>
                    <span className="text-slate-800">{selectedContract?.borrower_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">原到期日：</span>
                    <span className="text-slate-800">{formatDate(originalEndDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">新到期日：</span>
                    <span className="text-slate-800">{formatDate(newEndDate)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">展期原因：</span>
                  <p className="text-slate-800 mt-1">{extensionReason}</p>
                </div>
                <div>
                  <span className="text-slate-500">材料数量：</span>
                  <span className="text-slate-800">{materials.length} 份</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    风险检测
                  </h3>
                  <Button variant="outline" size="sm" onClick={detectRisks} disabled={detectingRisks}>
                    {detectingRisks ? <Loading size="sm" /> : '重新检测'}
                  </Button>
                </div>

                {detectingRisks ? (
                  <div className="text-center py-8">
                    <Loading />
                    <p className="text-sm text-slate-500 mt-2">正在检测风险...</p>
                  </div>
                ) : detectedRisks.length === 0 ? (
                  <div className="p-6 bg-emerald-50 rounded-lg text-center">
                    <CheckCircle size={32} className="mx-auto text-emerald-500" />
                    <p className="mt-2 text-emerald-700">未检测到风险项</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detectedRisks.map((risk, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <RiskBadge type={risk.type} severity={risk.severity} />
                        <p className="text-sm text-slate-700">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button variant="ghost" onClick={() => step !== 'basic' ? setStep(steps[steps.findIndex(s => s.key === step) - 1].key) : navigate('/extensions')}>
            {step === 'basic' ? '取消' : '上一步'}
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={autoSaveDraft}>
              <Save size={16} className="mr-2" />
              保存草稿
            </Button>
            {step === 'confirm' ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? <Loading size="sm" /> : null}
                提交审批
              </Button>
            ) : (
              <Button onClick={handleNext}>下一步</Button>
            )}
          </div>
        </div>
      </Card>

      <Modal
        open={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="添加材料"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowMaterialModal(false)}>取消</Button>
            <Button onClick={handleAddMaterial}>添加</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="材料名称"
            required
            value={newMaterial.name}
            onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
            placeholder="请输入材料名称"
          />
          <Select
            label="材料类型"
            value={newMaterial.type}
            onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
            options={[
              { value: 'pdf', label: 'PDF文档' },
              { value: 'docx', label: 'Word文档' },
              { value: 'image', label: '图片' },
              { value: 'other', label: '其他' },
            ]}
          />
          <Select
            label="材料分类"
            value={newMaterial.category}
            onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
            options={[
              { value: 'original', label: '原始材料（合同/担保）' },
              { value: 'processing_result', label: '处理结果（申请/审批）' },
            ]}
          />
          <Input
            label="来源人"
            required
            value={newMaterial.source_person}
            onChange={(e) => setNewMaterial({ ...newMaterial, source_person: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}
