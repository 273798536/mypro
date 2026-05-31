import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'
import { ArrowLeft, Calendar, BookOpen, MessageSquare, UserCheck, TrendingUp, TrendingDown, Minus, Plus, Edit, GitCompare } from 'lucide-react'
import { students, corrections } from '../services/api'
import ScoreBadge from '../components/ScoreBadge'
import type { Student, WarningLevel, TimelineEvent, TimelineEventType, ScoreDimensions, FollowUpRecord, AttendanceRecord, PracticeRecord, FeedbackRecord, FollowUpMethod } from '../../../../shared/types'

interface StudentDetailData extends Student {
  attendanceRecords?: AttendanceRecord[]
  practiceRecords?: PracticeRecord[]
  feedbackRecords?: FeedbackRecord[]
  followUpRecords?: FollowUpRecord[]
}

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [followUpForm, setFollowUpForm] = useState({
    followUpDate: new Date().toISOString().split('T')[0],
    method: 'phone' as const,
    content: '',
    nextAction: '',
    parentResponse: '',
  })
  const [correctionForm, setCorrectionForm] = useState({
    correctedScore: 0,
    correctedLevel: 'green' as WarningLevel,
    reason: '',
  })

  const loadStudentDetail = useCallback(async () => {
    if (!studentId) return
    try {
      setLoading(true)
      const data = await students.getDetail(studentId) as StudentDetailData
      setStudent(data)
      if (data.latestScore) {
        setCorrectionForm(prev => ({
          ...prev,
          correctedScore: data.latestScore!.overallScore,
          correctedLevel: data.latestScore!.level,
        }))
      }
    } catch (error) {
      console.error('加载学员详情失败:', error)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    loadStudentDetail()
  }, [loadStudentDetail])

  const radarData = useMemo(() => {
    if (!student?.latestScore?.dimensions) return []
    const dims: ScoreDimensions = student.latestScore.dimensions
    return [
      { dimension: '出勤率', score: 100 - dims.absence, fullMark: 100 },
      { dimension: '练习完成', score: 100 - dims.practice, fullMark: 100 },
      { dimension: '反馈积极度', score: 100 - dims.feedback, fullMark: 100 },
      { dimension: '课程进度', score: 100 - dims.lessonProgress, fullMark: 100 },
    ]
  }, [student?.latestScore?.dimensions])

  const timelineEvents = useMemo((): TimelineEvent[] => {
    if (!student) return []
    
    const events: TimelineEvent[] = []
    
    student.attendanceRecords?.forEach(record => {
      const isAbnormal = record.status === 'absent' || record.status === 'late'
      events.push({
        id: `att-${record.id}`,
        type: record.status === 'absent' ? 'absence' : 'attendance',
        date: record.lessonDate,
        title: record.status === 'attended' ? '出勤' : record.status === 'absent' ? '缺勤' : '迟到',
        description: record.notes || (record.status === 'absent' ? `原因: ${record.absentReason || '未记录'}` : ''),
        isAbnormal,
        linkedId: record.id,
      })
    })

    student.practiceRecords?.forEach(record => {
      const isAbnormal = record.completionRate < 70 || record.isLate
      events.push({
        id: `prc-${record.id}`,
        type: 'practice',
        date: record.practiceDate,
        title: `练习完成 (${record.completionRate}%)`,
        description: `时长: ${record.durationMinutes}分钟${record.teacherComment ? ` | 教师点评: ${record.teacherComment}` : ''}`,
        isAbnormal,
        linkedId: record.id,
      })
    })

    student.feedbackRecords?.forEach(record => {
      const isAbnormal = record.sentimentScore < 50
      events.push({
        id: `fb-${record.id}`,
        type: 'feedback',
        date: record.feedbackDate,
        title: '家长反馈',
        description: record.content.substring(0, 100) + (record.content.length > 100 ? '...' : ''),
        isAbnormal,
        linkedId: record.id,
      })
    })

    student.followUpRecords?.forEach(record => {
      events.push({
        id: `fu-${record.id}`,
        type: 'followup',
        date: record.followUpDate,
        title: `跟进记录 (${getMethodText(record.method)})`,
        description: record.content.substring(0, 100) + (record.content.length > 100 ? '...' : ''),
        isAbnormal: false,
        linkedId: record.id,
      })
    })

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [student])

  const getMethodText = (method: string) => {
    const map: Record<string, string> = {
      phone: '电话',
      wechat: '微信',
      in_person: '面谈',
      other: '其他',
    }
    return map[method] || method
  }

  const getLevelText = (level?: WarningLevel) => {
    switch (level) {
      case 'red': return '红色预警'
      case 'yellow': return '黄色预警'
      case 'green': return '正常'
      default: return '未评估'
    }
  }

  const getLevelColor = (level?: WarningLevel) => {
    switch (level) {
      case 'red': return 'bg-red-100 text-red-700 border-red-200'
      case 'yellow': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'green': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getTimelineIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'attendance': return <Calendar className="w-4 h-4" />
      case 'absence': return <Calendar className="w-4 h-4 text-red-500" />
      case 'practice': return <BookOpen className="w-4 h-4" />
      case 'feedback': return <MessageSquare className="w-4 h-4" />
      case 'followup': return <UserCheck className="w-4 h-4" />
      case 'warning': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  const getTimelineColor = (type: TimelineEventType, isAbnormal: boolean) => {
    if (isAbnormal) return 'bg-red-500'
    switch (type) {
      case 'attendance': return 'bg-green-500'
      case 'absence': return 'bg-red-500'
      case 'practice': return 'bg-blue-500'
      case 'feedback': return 'bg-purple-500'
      case 'followup': return 'bg-amber-500'
      default: return 'bg-slate-500'
    }
  }

  const handleAddFollowUp = async () => {
    if (!studentId) return
    try {
      await students.addFollowUp(studentId, followUpForm)
      setShowFollowUpModal(false)
      setFollowUpForm({
        followUpDate: new Date().toISOString().split('T')[0],
        method: 'phone',
        content: '',
        nextAction: '',
        parentResponse: '',
      })
      loadStudentDetail()
    } catch (error) {
      console.error('添加跟进记录失败:', error)
    }
  }

  const handleAddCorrection = async () => {
    if (!studentId || !student?.latestScore?.versionId) return
    try {
      await corrections.create({
        studentId,
        versionId: student.latestScore.versionId,
        ...correctionForm,
      })
      setShowCorrectionModal(false)
      loadStudentDetail()
    } catch (error) {
      console.error('添加人工修正失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12 text-slate-500">
        未找到学员信息
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/students')}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">学员详情</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {student.age}岁
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {student.courseType}
                </span>
                <span className="flex items-center gap-1">
                  剩余课时: <span className="font-semibold text-slate-900">{student.remainingLessons}</span> / {student.totalLessons}
                </span>
                {student.teacherName && (
                  <span className="flex items-center gap-1">
                    教师: <span className="font-medium">{student.teacherName}</span>
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">
                续费日期: {new Date(student.renewalDate).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>

          {student.latestScore && (
            <div className="flex items-center gap-4">
              <ScoreBadge score={student.latestScore.overallScore} level={getLevelText(student.latestScore.level)} />
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full border ${getLevelColor(student.latestScore.level)}`}>
                {getLevelText(student.latestScore.level)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增跟进
          </button>
          <button
            onClick={() => setShowCorrectionModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            人工修正
          </button>
          <button
            onClick={() => navigate(`/versions?compareStudentId=${student.id}`)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            查看版本对比
          </button>
        </div>
      </div>

      {student.latestScore?.changeFromPrev && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">评分变化对比 (与上一版本)</h3>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className={`p-2 rounded-full ${
              student.latestScore.changeFromPrev.scoreDiff > 0 
                ? 'bg-red-100 text-red-600' 
                : student.latestScore.changeFromPrev.scoreDiff < 0 
                  ? 'bg-green-100 text-green-600'
                  : 'bg-slate-100 text-slate-600'
            }`}>
              {student.latestScore.changeFromPrev.scoreDiff > 0 ? (
                <TrendingUp className="w-6 h-6" />
              ) : student.latestScore.changeFromPrev.scoreDiff < 0 ? (
                <TrendingDown className="w-6 h-6" />
              ) : (
                <Minus className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-lg font-bold">
                {student.latestScore.changeFromPrev.scoreDiff > 0 ? '+' : ''}
                {student.latestScore.changeFromPrev.scoreDiff} 分
              </div>
              <div className="text-sm text-slate-500">
                {student.latestScore.changeFromPrev.scoreDiff > 0 ? '风险上升' : student.latestScore.changeFromPrev.scoreDiff < 0 ? '风险下降' : '无变化'}
              </div>
            </div>
            <div className="ml-6 flex-1">
              <div className="text-sm font-medium text-slate-700 mb-1">变化原因:</div>
              <div className="flex flex-wrap gap-2">
                {student.latestScore.changeFromPrev.reasons.map((reason, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-full text-slate-600">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">四维度评分雷达图</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#64748b', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar
                  name="当前评分"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {student.latestScore?.dimensions && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600">缺勤维度</div>
                <div className="text-xl font-bold text-red-700">{student.latestScore.dimensions.absence}分</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="text-sm text-amber-600">练习维度</div>
                <div className="text-xl font-bold text-amber-700">{student.latestScore.dimensions.practice}分</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600">反馈维度</div>
                <div className="text-xl font-bold text-blue-700">{student.latestScore.dimensions.feedback}分</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600">进度维度</div>
                <div className="text-xl font-bold text-purple-700">{student.latestScore.dimensions.lessonProgress}分</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">时间线记录</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
            {timelineEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                暂无记录
              </div>
            ) : (
              timelineEvents.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getTimelineColor(event.type, event.isAbnormal)}`}>
                      {getTimelineIcon(event.type)}
                    </div>
                    {index < timelineEvents.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{event.title}</span>
                      {event.isAbnormal && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                          异常
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(event.date).toLocaleDateString('zh-CN')}
                    </div>
                    {event.description && (
                      <div className="text-sm text-slate-600 mt-1 p-2 bg-slate-50 rounded-lg">
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">新增跟进记录</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">跟进日期</label>
                <input
                  type="date"
                  value={followUpForm.followUpDate}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">跟进方式</label>
                <select
                  value={followUpForm.method}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, method: e.target.value as FollowUpMethod }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="phone">电话</option>
                  <option value="wechat">微信</option>
                  <option value="in_person">面谈</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">跟进内容</label>
                <textarea
                  value={followUpForm.content}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="请输入跟进内容..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">家长反馈</label>
                <textarea
                  value={followUpForm.parentResponse}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, parentResponse: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="请输入家长反馈..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">下一步行动</label>
                <input
                  type="text"
                  value={followUpForm.nextAction}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, nextAction: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="请输入下一步行动..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddFollowUp}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">人工修正评分</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">修正后评分</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={correctionForm.correctedScore}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, correctedScore: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">修正后预警级别</label>
                <select
                  value={correctionForm.correctedLevel}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, correctedLevel: e.target.value as WarningLevel }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="green">正常</option>
                  <option value="yellow">黄色预警</option>
                  <option value="red">红色预警</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">修正原因</label>
                <textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="请输入修正原因..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddCorrection}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存修正
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDetail
