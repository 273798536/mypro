import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { students } from '../services/api'
import ScoreBadge from '../components/ScoreBadge'
import type { Student, WarningLevel } from '../../../../shared/types'

const StudentList: React.FC = () => {
  const navigate = useNavigate()
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [courseType, setCourseType] = useState('')
  const [warningLevel, setWarningLevel] = useState<WarningLevel | ''>('')
  const [teacherId, setTeacherId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const result = await students.getList()
      const mapped = (result.list || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        age: s.age,
        courseType: s.course_type || s.courseType,
        teacherId: s.teacher_id || s.teacherId,
        teacherName: s.teacherName,
        remainingLessons: s.remaining_lessons || s.remainingLessons,
        totalLessons: s.total_lessons || s.totalLessons,
        renewalDate: s.renewal_date || s.renewalDate,
        notes: s.notes,
        latestScore: s.latestScore,
      }))
      setAllStudents(mapped)
    } catch (error) {
      console.error('加载学员列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const courseTypes = useMemo(() => {
    const types = new Set(allStudents.map(s => s.courseType))
    return Array.from(types)
  }, [allStudents])

  const teachers = useMemo(() => {
    const teacherMap = new Map<string, string>()
    allStudents.forEach(s => {
      if (s.teacherName) {
        teacherMap.set(s.teacherId, s.teacherName)
      }
    })
    return Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name }))
  }, [allStudents])

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      if (searchName && !student.name.includes(searchName)) return false
      if (courseType && student.courseType !== courseType) return false
      if (teacherId && student.teacherId !== teacherId) return false
      if (warningLevel && student.latestScore?.level !== warningLevel) return false
      return true
    })
  }, [allStudents, searchName, courseType, teacherId, warningLevel])

  const totalPages = Math.ceil(filteredStudents.length / pageSize)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, courseType, warningLevel, teacherId])

  const getLevelColor = (level?: WarningLevel) => {
    switch (level) {
      case 'red': return 'bg-red-100 text-red-700 border-red-200'
      case 'yellow': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'green': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  const getLevelText = (level?: WarningLevel) => {
    switch (level) {
      case 'red': return '红色预警'
      case 'yellow': return '黄色预警'
      case 'green': return '正常'
      default: return '未评估'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">学员样本</h1>
        <span className="text-sm text-slate-500">共 {filteredStudents.length} 名学员</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索学员姓名..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={courseType}
              onChange={(e) => setCourseType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">全部课程</option>
              {courseTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={warningLevel}
              onChange={(e) => setWarningLevel(e.target.value as WarningLevel | '')}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">全部预警级别</option>
              <option value="red">红色预警</option>
              <option value="yellow">黄色预警</option>
              <option value="green">正常</option>
            </select>

            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">全部教师</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">年龄</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">课程</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">剩余课时</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">预警评分</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  暂无符合条件的学员
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{student.name}</div>
                    {student.teacherName && (
                      <div className="text-sm text-slate-500">教师: {student.teacherName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                    {student.age}岁
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {student.courseType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-slate-900">{student.remainingLessons}</div>
                    <div className="text-xs text-slate-500">共 {student.totalLessons} 课时</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.latestScore ? (
                      <div className="flex items-center gap-3">
                        <ScoreBadge score={student.latestScore.overallScore} level={getLevelText(student.latestScore.level)} />
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getLevelColor(student.latestScore.level)}`}>
                          {getLevelText(student.latestScore.level)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">未评估</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredStudents.length)} 条，共 {filteredStudents.length} 条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentList
