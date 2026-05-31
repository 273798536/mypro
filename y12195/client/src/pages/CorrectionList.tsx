import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { corrections, students, versions } from '../services/api'
import type { ManualCorrection, CorrectionEffectiveness, Student, WarningVersion, CreateCorrectionRequest, WarningLevel } from '../../../shared/types'
import { X, Plus, TrendingUp, Target, Calendar, Filter } from 'lucide-react'

const CORRECTION_TYPES = [
  { value: 'feedback_duplicate', label: '反馈重复' },
  { value: 'renewal_extension', label: '续费延期' },
  { value: 'score_adjustment', label: '评分调整' },
  { value: 'other', label: '其他' },
]

const CORRECTION_TYPE_MAP: Record<string, string> = {
  feedback_duplicate: '反馈重复',
  renewal_extension: '续费延期',
  score_adjustment: '评分调整',
  other: '其他',
}

const CorrectionList: React.FC = () => {
  const navigate = useNavigate()
  const [correctionList, setCorrectionList] = useState<ManualCorrection[]>([])
  const [effectiveness, setEffectiveness] = useState<CorrectionEffectiveness | null>(null)
  const [studentList, setStudentList] = useState<Student[]>([])
  const [versionList, setVersionList] = useState<WarningVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formData, setFormData] = useState({
    studentId: '',
    correctionType: 'score_adjustment',
    reason: '',
    adjustValue: 0,
    versionId: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterCorrections()
  }, [filterType, startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const [correctionsData, effectivenessData, studentsData, versionsData] = await Promise.all([
        corrections.getList(),
        corrections.getEffectiveness(),
        students.getList(),
        versions.getList(),
      ])
      setCorrectionList(correctionsData)
      setEffectiveness(effectivenessData)
      setStudentList(studentsData)
      setVersionList(versionsData)
      if (versionsData.length > 0) {
        setFormData(prev => ({ ...prev, versionId: versionsData[0].id }))
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCorrections = () => {
    let filtered = [...correctionList]
    
    if (filterType) {
      filtered = filtered.filter(c => {
        const reason = c.reason.toLowerCase()
        if (filterType === 'feedback_duplicate') return reason.includes('重复')
        if (filterType === 'renewal_extension') return reason.includes('延期')
        if (filterType === 'score_adjustment') return reason.includes('评分') || reason.includes('调整')
        if (filterType === 'other') return !reason.includes('重复') && !reason.includes('延期') && !reason.includes('评分') && !reason.includes('调整')
        return true
      })
    }
    
    if (startDate) {
      filtered = filtered.filter(c => new Date(c.createdAt) >= new Date(startDate))
    }
    if (endDate) {
      filtered = filtered.filter(c => new Date(c.createdAt) <= new Date(endDate))
    }
    
    return filtered
  }

  const handleCreateCorrection = async () => {
    const errors: Record<string, string> = {}
    if (!formData.studentId) errors.studentId = '请选择学员'
    if (!formData.reason.trim()) errors.reason = '请输入修正原因'
    if (!formData.versionId) errors.versionId = '请选择版本'
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const selectedStudent = studentList.find(s => s.id === formData.studentId)
    const originalScore = selectedStudent?.latestScore?.overallScore || 50
    const correctedScore = Math.max(0, Math.min(100, originalScore + formData.adjustValue))
    
    const getLevel = (score: number): WarningLevel => {
      if (score >= 60) return 'red'
      if (score >= 35) return 'yellow'
      return 'green'
    }

    const request: CreateCorrectionRequest = {
      studentId: formData.studentId,
      versionId: formData.versionId,
      correctedScore,
      correctedLevel: getLevel(correctedScore),
      reason: `[${CORRECTION_TYPE_MAP[formData.correctionType]}] ${formData.reason}`,
    }

    try {
      await corrections.create(request)
      setShowDialog(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('创建修正失败:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      studentId: '',
      correctionType: 'score_adjustment',
      reason: '',
      adjustValue: 0,
      versionId: versionList[0]?.id || '',
    })
    setFormErrors({})
  }

  const getLevelColor = (level: string) => {
    if (level === 'red') return 'bg-red-100 text-red-700'
    if (level === 'yellow') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  const filteredList = filterCorrections()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">人工修正</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          新增修正
        </button>
      </div>

      {effectiveness && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">准确率</p>
                <p className="text-2xl font-bold text-slate-800">
                  {(effectiveness.correctionAccuracy * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">续费转化率</p>
                <p className="text-2xl font-bold text-slate-800">
                  {(effectiveness.renewalRateAfterCorrection * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">总修正次数</p>
                <p className="text-2xl font-bold text-slate-800">
                  {effectiveness.totalCorrections}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">筛选:</span>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">全部类型</option>
              {CORRECTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="开始日期"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="结束日期"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">学员</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">修正类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">修正原因</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作人</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">原分数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">修正后</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">加载中...</td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">暂无修正记录</td>
                </tr>
              ) : (
                filteredList.map((correction) => (
                  <tr 
                    key={correction.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/corrections/${correction.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{correction.studentName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                        {Object.entries(CORRECTION_TYPE_MAP).find(([k]) => 
                          correction.reason.includes(k) || correction.reason.includes(CORRECTION_TYPE_MAP[k])
                        )?.[1] || '其他'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm max-w-xs truncate block">
                        {correction.reason.replace(/\[.*?\]\s*/, '')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {correction.correctedByName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(correction.originalLevel)}`}>
                        {correction.originalScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(correction.correctedLevel)}`}>
                        {correction.correctedScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(correction.createdAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">新增修正</h3>
              <button
                onClick={() => { setShowDialog(false); resetForm(); }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择学员</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    formErrors.studentId ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">请选择学员</option>
                  {studentList.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
                {formErrors.studentId && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.studentId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">修正类型</label>
                <select
                  value={formData.correctionType}
                  onChange={(e) => setFormData(prev => ({ ...prev, correctionType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {CORRECTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">版本</label>
                <select
                  value={formData.versionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, versionId: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    formErrors.versionId ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">请选择版本</option>
                  {versionList.map(version => (
                    <option key={version.id} value={version.id}>{version.version}</option>
                  ))}
                </select>
                {formErrors.versionId && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.versionId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">修正原因</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
                    formErrors.reason ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="请输入修正原因..."
                />
                {formErrors.reason && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.reason}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  调整值: <span className={formData.adjustValue >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formData.adjustValue >= 0 ? '+' : ''}{formData.adjustValue}
                  </span>
                </label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={formData.adjustValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, adjustValue: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>-30</span>
                  <span>0</span>
                  <span>+30</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => { setShowDialog(false); resetForm(); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateCorrection}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CorrectionList
