import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  FileText,
  Music,
  CreditCard,
  IdCard,
  MessageSquare,
  History,
  Download,
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  AlertCircle,
  Save,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/Card'
import { StatusBadge, AnomalyBadgeList } from '@/components/StatusBadge'
import { RegistrationStatus, AnomalyType } from '@/types'
import {
  formatDateTime,
  formatDate,
  getExamLevelText,
  getGenderText,
  getMaterialTypeName,
  getEvidenceTypeText,
  formatCurrency,
} from '@/utils/format'
import { cn } from '@/lib/utils'

export default function RegistrationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    currentRegistration,
    currentMaterials,
    currentRepertoires,
    currentPayment,
    currentDocuments,
    currentTeacherNotes,
    loadRegistrationDetail,
    updateRegistration,
    addTeacherNote,
    generateAuditReport,
    loading,
    clearCurrent,
  } = useAppStore()

  const [showNoteForm, setShowNoteForm] = useState(false)
  const [newNote, setNewNote] = useState({
    teacherName: '',
    content: '',
    evidenceType: 'other' as 'repertoire' | 'payment' | 'document' | 'other',
    isContradictory: false,
  })
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<RegistrationStatus>(RegistrationStatus.PENDING)
  const [updateReason, setUpdateReason] = useState('')

  useEffect(() => {
    if (id) {
      loadRegistrationDetail(id)
    }
    return () => clearCurrent()
  }, [id])

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newNote.teacherName || !newNote.content) return

    await addTeacherNote(id, newNote)
    setNewNote({
      teacherName: '',
      content: '',
      evidenceType: 'other',
      isContradictory: false,
    })
    setShowNoteForm(false)
  }

  const handleUpdateStatus = async () => {
    if (!id) return
    await updateRegistration(id, { status: newStatus }, '当前用户', updateReason || '状态更新')
    setShowStatusModal(false)
    setUpdateReason('')
  }

  const handleGenerateReport = async () => {
    if (!id) return
    const { html, title } = await generateAuditReport(id)

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!currentRegistration) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    )
  }

  const appRepertoires = currentRepertoires.filter((r) => r.source === 'application')
  const actualRepertoires = currentRepertoires.filter((r) => r.source === 'actual')

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-800">
              {currentRegistration.studentName}
            </h1>
            <p className="text-slate-500">报名详情</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={currentRegistration.status} size="lg" />
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            更新状态
          </button>
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            生成报告
          </button>
          <Link
            to={`/registration/${id}/history`}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <History className="w-4 h-4" />
            历史记录
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧 - 基本信息 */}
        <div className="col-span-2 space-y-6">
          {/* 学生信息卡片 */}
          <Card title="学生基本信息">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">
                    {currentRegistration.studentName}
                  </h3>
                  <p className="text-slate-500">
                    {getGenderText(currentRegistration.gender)} · {getExamLevelText(currentRegistration.examLevel)}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    指导老师：{currentRegistration.guideTeacher}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">身份证号</span>
                  <span className="font-mono text-slate-700">{currentRegistration.idNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">联系电话</span>
                  <span className="font-mono text-slate-700">{currentRegistration.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">提交时间</span>
                  <span className="text-slate-700">{formatDateTime(currentRegistration.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">版本号</span>
                  <span className="font-mono text-slate-700">v{currentRegistration.version}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 材料清单 */}
          <Card title="提交材料">
            <div className="space-y-3">
              {currentMaterials.map((material) => (
                <div
                  key={material.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    material.status === 'submitted'
                      ? 'bg-green-50 border-green-200'
                      : material.status === 'rejected'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FileText
                      className={cn(
                        'w-5 h-5',
                        material.status === 'submitted'
                          ? 'text-green-600'
                          : material.status === 'rejected'
                          ? 'text-red-600'
                          : 'text-slate-400'
                      )}
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {getMaterialTypeName(material.type)}
                      </p>
                      <p className="text-sm text-slate-500">
                        提交于 {formatDateTime(material.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {material.status === 'submitted' && (
                      <span className="flex items-center gap-1 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        已提交
                      </span>
                    )}
                    {material.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-sm text-red-700">
                        <XCircle className="w-4 h-4" />
                        需重新提交
                      </span>
                    )}
                    {material.status === 'pending' && (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        待提交
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 曲目核对 */}
          <Card title="曲目版本核对" subtitle="报名曲目与实际提交曲目对比">
            <div className="space-y-4">
              {appRepertoires.map((appRep, idx) => {
                const actualRep = actualRepertoires[idx]
                const isMatched = appRep.name === actualRep?.name && appRep.version === actualRep?.version

                return (
                  <div
                    key={appRep.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      isMatched ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 mb-1">报名曲目</p>
                        <p className="font-semibold text-slate-900">{appRep.name}</p>
                        <p className="text-sm text-slate-600">
                          {appRep.composer} · {appRep.version}
                        </p>
                      </div>
                      <div className="py-4">
                        {isMatched ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm text-slate-500 mb-1">实际提交</p>
                        <p
                          className={cn(
                            'font-semibold',
                            isMatched ? 'text-slate-900' : 'text-orange-700'
                          )}
                        >
                          {actualRep?.name || '-'}
                        </p>
                        <p className="text-sm text-slate-600">
                          {actualRep?.composer} · {actualRep?.version}
                        </p>
                      </div>
                    </div>
                    {!isMatched && actualRep?.mismatchReason && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-sm text-orange-700">
                          <span className="font-medium">差异说明：</span>
                          {actualRep.mismatchReason}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 证件查验 */}
          <Card title="证件查验">
            <div className="grid grid-cols-2 gap-4">
              {currentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    doc.status === 'valid'
                      ? 'bg-green-50 border-green-200'
                      : doc.status === 'missing'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IdCard
                        className={cn(
                          'w-5 h-5',
                          doc.status === 'valid'
                            ? 'text-green-600'
                            : doc.status === 'missing'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        )}
                      />
                      <span className="font-medium text-slate-900">
                        {doc.type === 'id_card' && '身份证'}
                        {doc.type === 'previous_certificate' && '上一级证书'}
                        {doc.type === 'photo' && '证件照片'}
                        {doc.type === 'other' && '其他材料'}
                      </span>
                    </div>
                    {doc.status === 'valid' && (
                      <span className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        有效
                      </span>
                    )}
                    {doc.status === 'missing' && (
                      <span className="text-sm text-red-700 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        缺失
                      </span>
                    )}
                    {doc.status === 'expired' && (
                      <span className="text-sm text-yellow-700 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        已过期
                      </span>
                    )}
                  </div>
                  {doc.expiryDate && (
                    <p className="text-sm text-slate-500">
                      有效期至：{formatDate(doc.expiryDate)}
                    </p>
                  )}
                  {doc.missingNote && (
                    <p className="text-sm text-red-600 mt-1">{doc.missingNote}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* 老师备注 */}
          <Card
            title="老师备注"
            subtitle="作为补充证据保留，特别是与系统结论不一致时"
            headerAction={
              <button
                onClick={() => setShowNoteForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                添加备注
              </button>
            }
          >
            {showNoteForm && (
              <form onSubmit={handleSubmitNote} className="mb-6 p-4 bg-note-bg border border-note-border rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      老师姓名
                    </label>
                    <input
                      type="text"
                      value={newNote.teacherName}
                      onChange={(e) => setNewNote({ ...newNote, teacherName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      备注类型
                    </label>
                    <select
                      value={newNote.evidenceType}
                      onChange={(e) =>
                        setNewNote({
                          ...newNote,
                          evidenceType: e.target.value as typeof newNote.evidenceType,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="repertoire">曲目相关</option>
                      <option value="payment">缴费相关</option>
                      <option value="document">证件相关</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      备注内容
                    </label>
                    <textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="请输入备注内容，作为补充证据保留..."
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isContradictory"
                      checked={newNote.isContradictory}
                      onChange={(e) => setNewNote({ ...newNote, isContradictory: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="isContradictory" className="text-sm text-slate-700">
                      此备注与系统结论不一致（作为争议证据标记）
                    </label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNoteForm(false)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      保存备注
                    </button>
                  </div>
                </div>
              </form>
            )}

            {currentTeacherNotes.length === 0 ? (
              <p className="text-slate-500 text-center py-8">暂无老师备注</p>
            ) : (
              <div className="space-y-4">
                {currentTeacherNotes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      note.isContradictory
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-note-bg border-note-border'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{note.teacherName}</span>
                        <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded">
                          {getEvidenceTypeText(note.evidenceType)}
                        </span>
                        {note.isContradictory && (
                          <span className="px-2 py-0.5 text-xs bg-amber-200 text-amber-800 rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            与系统结论不一致
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-500">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 右侧 - 缴费信息和异常 */}
        <div className="space-y-6">
          {/* 缴费信息 */}
          <Card title="缴费信息">
            {currentPayment ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">应缴金额</span>
                  <span className="text-2xl font-bold text-primary-800">
                    {formatCurrency(currentPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">应到账日期</span>
                  <span className="text-slate-700">{formatDate(currentPayment.expectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">实际到账</span>
                  <span className={cn(
                    'font-medium',
                    currentPayment.actualDate ? 'text-green-700' : 'text-red-600'
                  )}>
                    {currentPayment.actualDate ? formatDate(currentPayment.actualDate) : '未到账'}
                  </span>
                </div>
                {currentPayment.isLate && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">缴费晚到</span>
                    </div>
                    {currentPayment.lateFee && (
                      <p className="text-sm text-orange-600">
                        滞纳金：{formatCurrency(currentPayment.lateFee)}
                      </p>
                    )}
                  </div>
                )}
                {currentPayment.lateFee && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">滞纳金</span>
                      <span className="text-red-600 font-medium">
                        {formatCurrency(currentPayment.lateFee)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-slate-200">
                  <span className="font-medium text-slate-700">缴费状态</span>
                  <span
                    className={cn(
                      'font-medium',
                      currentPayment.status === 'paid'
                        ? 'text-green-700'
                        : currentPayment.status === 'overdue'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    )}
                  >
                    {currentPayment.status === 'paid' && '已缴费'}
                    {currentPayment.status === 'pending' && '待缴费'}
                    {currentPayment.status === 'overdue' && '已逾期'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">暂无缴费记录</p>
            )}
          </Card>

          {/* 异常汇总 */}
          <Card title="异常汇总">
            {currentRegistration.anomalies.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-700 font-medium">无异常</p>
                <p className="text-sm text-slate-500 mt-1">报名材料齐全，审核顺利</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnomalyBadgeList anomalies={currentRegistration.anomalies} />
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  {currentRegistration.anomalies.includes(AnomalyType.REPERTOIRE_MISMATCH) && (
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="font-medium text-orange-800">曲目版本不符</p>
                      <p className="text-sm text-orange-600 mt-1">
                        报名曲目与实际提交曲目不一致，请人工复核确认
                      </p>
                    </div>
                  )}
                  {currentRegistration.anomalies.includes(AnomalyType.PAYMENT_LATE) && (
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="font-medium text-orange-800">缴费晚到</p>
                      <p className="text-sm text-orange-600 mt-1">
                        费用未在规定时间内到账，需关注后续处理
                      </p>
                    </div>
                  )}
                  {currentRegistration.anomalies.includes(AnomalyType.DOCUMENT_MISSING) && (
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="font-medium text-orange-800">证件缺失</p>
                      <p className="text-sm text-orange-600 mt-1">
                        部分证件材料缺失，已保存当前版本快照防止后续覆盖
                      </p>
                    </div>
                  )}
                  {currentRegistration.anomalies.includes(AnomalyType.TEACHER_CONTRADICTION) && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="font-medium text-amber-800">存在老师补充说明</p>
                      <p className="text-sm text-amber-600 mt-1">
                        有老师备注与系统结论不一致，请仔细阅读并结合实际情况判断
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 状态更新弹窗 */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-display text-xl font-semibold text-slate-900 mb-4">
              更新报名状态
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择新状态
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as RegistrationStatus)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={RegistrationStatus.PENDING}>待审核</option>
                  <option value={RegistrationStatus.REVIEWING}>审核中</option>
                  <option value={RegistrationStatus.REPERTOIRE_MISMATCH}>曲目不符</option>
                  <option value={RegistrationStatus.PAYMENT_LATE}>缴费晚到</option>
                  <option value={RegistrationStatus.DOCUMENT_MISSING}>证件缺失</option>
                  <option value={RegistrationStatus.PASSED}>审核通过</option>
                  <option value={RegistrationStatus.REJECTED}>审核驳回</option>
                  <option value={RegistrationStatus.SUPPLEMENT}>待补充材料</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  变更原因（可选）
                </label>
                <textarea
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请说明状态变更的原因..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  确认更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
