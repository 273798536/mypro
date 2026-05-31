import React, { useState, useEffect } from 'react'
import { students } from '../services/api'
import type { AttendanceRecord, AbsentReason, MakeupRequest } from '../../../shared/types'

const getAbsentReasonText = (reason: AbsentReason) => {
  switch (reason) {
    case 'sick': return '生病'
    case 'leave': return '请假'
    case 'tired': return '疲劳'
    case 'other': return '其他'
    default: return '未注明'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'absent': return '待处理'
    case 'makeup': return '已补录'
    default: return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'absent': return 'text-red-600 bg-red-50'
    case 'makeup': return 'text-green-600 bg-green-50'
    default: return 'text-slate-600 bg-slate-50'
  }
}

interface ProcessDialogProps {
  record: AttendanceRecord | null
  onClose: () => void
  onSubmit: (data: MakeupRequest) => Promise<void>
}

const ProcessDialog: React.FC<ProcessDialogProps> = ({ record, onClose, onSubmit }) => {
  const [processType, setProcessType] = useState<'makeup' | 'leave' | 'exclude'>('makeup')
  const [notes, setNotes] = useState('')
  const [parentCommunication, setParentCommunication] = useState('')
  const [loading, setLoading] = useState(false)

  if (!record) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentCommunication.trim()) {
      alert('请填写家长沟通情况')
      return
    }

    let absentReason: Exclude<AbsentReason, null>
    if (processType === 'leave') {
      absentReason = 'leave'
    } else if (processType === 'exclude') {
      absentReason = 'other'
    } else {
      absentReason = record.absentReason || 'other'
    }

    const data: MakeupRequest = {
      attendanceId: record.id,
      absentReason,
      parentCommunication: parentCommunication.trim(),
      notes: notes.trim() || undefined,
      makeupDate: processType === 'makeup' ? new Date().toISOString().split('T')[0] : undefined,
    }

    setLoading(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('处理失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">处理缺课补录</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">
            <span className="font-medium">学员：</span>{record.studentName}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            <span className="font-medium">缺课日期：</span>
            {new Date(record.lessonDate).toLocaleDateString('zh-CN')}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            <span className="font-medium">缺课原因：</span>
            {getAbsentReasonText(record.absentReason)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              处理方式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'makeup' as const, label: '已补课', icon: '✅' },
                { value: 'leave' as const, label: '请假', icon: '📝' },
                { value: 'exclude' as const, label: '不计入', icon: '🚫' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProcessType(option.value)}
                  className={`p-3 rounded-lg border-2 transition-colors text-center ${
                    processType === option.value
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              家长沟通情况 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={parentCommunication}
              onChange={(e) => setParentCommunication(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none resize-none"
              rows={3}
              placeholder="请填写与家长沟通的情况..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none resize-none"
              rows={2}
              placeholder="可选，填写其他备注信息..."
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !parentCommunication.trim()}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '提交中...' : '确认提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MakeUpList: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const result = await students.getPendingMakeup()
      setRecords(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleProcessMakeup = async (data: MakeupRequest) => {
    if (!selectedRecord) return
    const result = await students.processMakeup(selectedRecord.studentId, data)
    setSuccessMessage(`处理成功！${result.conclusion}`)
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
        {error}
        <button
          onClick={fetchData}
          className="ml-4 text-primary hover:underline"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">缺课补录</h2>
        <div className="text-sm text-slate-500">
          共 {records.length} 条待处理记录
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg">
          {successMessage}
        </div>
      )}

      {records.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg font-medium text-slate-800">暂无待处理的缺课记录</p>
          <p className="text-sm text-slate-500 mt-2">所有缺课都已处理完毕</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    学员
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    缺课日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    缺课原因
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    待补状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{record.studentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(record.lessonDate).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                        {getAbsentReasonText(record.absentReason)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {getStatusText(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        处理补录
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProcessDialog
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onSubmit={handleProcessMakeup}
      />
    </div>
  )
}

export default MakeUpList
