import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GitCompare, Calendar, Users, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Eye, ArrowLeftRight } from 'lucide-react'
import { versions } from '../services/api'
import type { WarningVersion, VersionComparison, WarningLevel } from '../../../../shared/types'

const VersionList: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [versionList, setVersionList] = useState<WarningVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion1, setSelectedVersion1] = useState('')
  const [selectedVersion2, setSelectedVersion2] = useState('')
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadVersions()
  }, [])

  const handleCompare = useCallback(async (v1?: string, v2?: string) => {
    const vid1 = v1 || selectedVersion1
    const vid2 = v2 || selectedVersion2
    if (!vid1 || !vid2 || vid1 === vid2) return

    try {
      const data = await versions.compare(vid1, vid2)
      setComparison(data)
      setSearchParams({ v1: vid1, v2: vid2 })
    } catch (error) {
      console.error('版本对比失败:', error)
    }
  }, [selectedVersion1, selectedVersion2, setSearchParams])

  useEffect(() => {
    const v1 = searchParams.get('v1')
    const v2 = searchParams.get('v2')
    if (v1 && v2) {
      setSelectedVersion1(v1)
      setSelectedVersion2(v2)
      handleCompare(v1, v2)
    }
  }, [searchParams, handleCompare])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const data = await versions.getList()
      setVersionList(data)
      if (data.length >= 2) {
        setSelectedVersion1(data[0].id)
        setSelectedVersion2(data[1].id)
      }
    } catch (error) {
      console.error('加载版本列表失败:', error)
    } finally {
      setLoading(false)
    }
  }



  const toggleRow = (versionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId)
    } else {
      newExpanded.add(versionId)
    }
    setExpandedRows(newExpanded)
  }

  const getTriggerText = (trigger: string) => {
    const map: Record<string, string> = {
      auto: '自动生成',
      manual: '手动生成',
      makeup: '缺课补录',
      correction: '人工修正',
    }
    return map[trigger] || trigger
  }

  const getTriggerColor = (trigger: string) => {
    const map: Record<string, string> = {
      auto: 'bg-blue-100 text-blue-700',
      manual: 'bg-purple-100 text-purple-700',
      makeup: 'bg-amber-100 text-amber-700',
      correction: 'bg-green-100 text-green-700',
    }
    return map[trigger] || 'bg-slate-100 text-slate-700'
  }

  const getLevelColor = (level?: WarningLevel) => {
    switch (level) {
      case 'red': return 'text-red-600'
      case 'yellow': return 'text-amber-600'
      case 'green': return 'text-green-600'
      default: return 'text-slate-600'
    }
  }

  const getLevelBgColor = (level?: WarningLevel) => {
    switch (level) {
      case 'red': return 'bg-red-500'
      case 'yellow': return 'bg-amber-500'
      case 'green': return 'bg-green-500'
      default: return 'bg-slate-500'
    }
  }

  const versionStats = useMemo(() => {
    return versionList.map(version => {
      const mockStats = {
        redCount: Math.floor(Math.random() * 20) + 5,
        yellowCount: Math.floor(Math.random() * 30) + 10,
        greenCount: Math.floor(Math.random() * 50) + 20,
        avgScore: Math.floor(Math.random() * 40) + 20,
      }
      return { ...version, ...mockStats }
    })
  }, [versionList])

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
        <h1 className="text-2xl font-bold text-slate-800">版本追踪</h1>
        <span className="text-sm text-slate-500">共 {versionList.length} 个版本</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <GitCompare className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-slate-800">版本对比</h3>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">版本 1</label>
            <select
              value={selectedVersion1}
              onChange={(e) => setSelectedVersion1(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">请选择版本</option>
              {versionList.map(v => (
                <option key={v.id} value={v.id}>{v.version} - {v.description}</option>
              ))}
            </select>
          </div>
          <div className="p-2">
            <ArrowLeftRight className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">版本 2</label>
            <select
              value={selectedVersion2}
              onChange={(e) => setSelectedVersion2(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">请选择版本</option>
              {versionList.map(v => (
                <option key={v.id} value={v.id}>{v.version} - {v.description}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => handleCompare()}
            disabled={!selectedVersion1 || !selectedVersion2 || selectedVersion1 === selectedVersion2}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            开始对比
          </button>
        </div>
      </div>

      {comparison && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            对比结果: {comparison.version1.version} → {comparison.version2.version}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500 mb-1">整体趋势</div>
              <div className="flex items-center gap-2">
                {comparison.overallTrend === 'improving' ? (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                ) : comparison.overallTrend === 'worsening' ? (
                  <TrendingUp className="w-5 h-5 text-red-500" />
                ) : (
                  <Minus className="w-5 h-5 text-slate-500" />
                )}
                <span className={`text-xl font-bold ${
                  comparison.overallTrend === 'improving' ? 'text-green-600' :
                  comparison.overallTrend === 'worsening' ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {comparison.overallTrend === 'improving' ? '整体改善' :
                   comparison.overallTrend === 'worsening' ? '整体恶化' : '保持稳定'}
                </span>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 mb-1">红色预警变化</div>
              <div className="text-xl font-bold text-red-700">
                {(comparison.levelTransitions['green→red'] || 0) +
                 (comparison.levelTransitions['yellow→red'] || 0)} 人新增
              </div>
              <div className="text-sm text-red-500">
                {(comparison.levelTransitions['red→green'] || 0) +
                 (comparison.levelTransitions['red→yellow'] || 0)} 人解除
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 mb-1">转为正常</div>
              <div className="text-xl font-bold text-green-700">
                {(comparison.levelTransitions['red→green'] || 0) +
                 (comparison.levelTransitions['yellow→green'] || 0)} 人
              </div>
              <div className="text-sm text-green-500">
                风险等级下降至绿色
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-slate-700 mb-3">状态转换统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(comparison.levelTransitions).map(([transition, count]) => {
                const [from, to] = transition.split('→')
                return (
                  <div key={transition} className="p-3 border border-slate-200 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className={`w-3 h-3 rounded-full ${getLevelBgColor(from as WarningLevel)}`}></span>
                      <span className="text-slate-400">→</span>
                      <span className={`w-3 h-3 rounded-full ${getLevelBgColor(to as WarningLevel)}`}></span>
                    </div>
                    <div className="text-lg font-bold text-slate-800">{count}</div>
                    <div className="text-xs text-slate-500">{transition}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-700 mb-3">学员评分变化</h4>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">学员姓名</th>
                    <th className="px-4 py-2 text-center font-medium text-slate-600">{comparison.version1.version}</th>
                    <th className="px-4 py-2 text-center font-medium text-slate-600">{comparison.version2.version}</th>
                    <th className="px-4 py-2 text-center font-medium text-slate-600">变化</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparison.scoreChanges.map((change) => (
                    <tr key={change.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{change.studentName}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${getLevelColor(change.levelV1)}`}>{change.scoreV1}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${getLevelColor(change.levelV2)}`}>{change.scoreV2}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${
                          change.diff > 0 ? 'text-red-600' : change.diff < 0 ? 'text-green-600' : 'text-slate-600'
                        }`}>
                          {change.diff > 0 ? '+' : ''}{change.diff}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {change.reasons.slice(0, 2).map((reason, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                              {reason}
                            </span>
                          ))}
                          {change.reasons.length > 2 && (
                            <span className="px-1.5 py-0.5 text-xs text-slate-500">
                              +{change.reasons.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"></th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">版本号</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">生成时间</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">触发方式</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">学员数</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">红/黄/绿</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">平均分</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {versionStats.map((version) => (
              <React.Fragment key={version.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleRow(version.id)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      {expandedRows.has(version.id) ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{version.version}</div>
                    <div className="text-sm text-slate-500">{version.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(version.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(version.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getTriggerColor(version.trigger)}`}>
                      {getTriggerText(version.trigger)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-900">
                      <Users className="w-4 h-4" />
                      {version.studentCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                        <span className="text-sm text-red-600 font-medium">{version.redCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                        <span className="text-sm text-amber-600 font-medium">{version.yellowCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                        <span className="text-sm text-green-600 font-medium">{version.greenCount}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">{version.avgScore}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/versions/${version.id}`)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedVersion1(version.id)
                          setSelectedVersion2(versionList[0]?.id || '')
                          setSearchParams({ v1: version.id, v2: versionList[0]?.id || '' })
                          handleCompare(version.id, versionList[0]?.id)
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="版本对比"
                      >
                        <GitCompare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRows.has(version.id) && (
                  <tr className="bg-slate-50">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                          <div className="text-sm text-slate-500 mb-1">数据周期</div>
                          <div className="font-medium text-slate-900">
                            {new Date(version.dataStartDate).toLocaleDateString('zh-CN')} ~ {new Date(version.dataEndDate).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                          <div className="text-sm text-red-500 mb-1">红色预警占比</div>
                          <div className="text-xl font-bold text-red-600">
                            {((version.redCount / version.studentCount) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                          <div className="text-sm text-amber-500 mb-1">黄色预警占比</div>
                          <div className="text-xl font-bold text-amber-600">
                            {((version.yellowCount / version.studentCount) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                          <div className="text-sm text-green-500 mb-1">正常占比</div>
                          <div className="text-xl font-bold text-green-600">
                            {((version.greenCount / version.studentCount) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default VersionList
