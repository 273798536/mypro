import { useState } from 'react'
import { useReviewStore } from '@/store/useReviewStore'
import { ArrowLeft, AlertTriangle, Clock, FileText, Search, Eye } from 'lucide-react'
import type { BadDataRecord } from '@/types'

export default function BadData() {
  const { badData, locations, comments, timelineRecords, selectLocation } = useReviewStore()
  const [activeTab, setActiveTab] = useState<'all' | 'timeline_gap' | 'comment_incomplete'>('all')
  const [selectedBadData, setSelectedBadData] = useState<BadDataRecord | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredBadData = badData.filter(item => {
    if (activeTab !== 'all' && item.type !== activeTab) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        item.description.toLowerCase().includes(search) ||
        item.originalRef.toLowerCase().includes(search) ||
        getLocationCode(item.locationId)?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const getLocationCode = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.code || locationId
  }

  const getLocationArea = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.area || ''
  }

  const getSeverityLabel = (severity: string) => {
    const map: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低',
    }
    return map[severity] || severity
  }

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      timeline_gap: '时间轴缺段',
      comment_incomplete: '评审批注不齐',
    }
    return map[type] || type
  }

  const getTypeIcon = (type: string) => {
    if (type === 'timeline_gap') return <Clock size={16} />
    return <FileText size={16} />
  }

  const handleGoBack = () => {
    window.location.hash = '#/'
  }

  const handleViewSource = (item: BadDataRecord) => {
    setSelectedBadData(item)
  }

  const getOriginalContent = (item: BadDataRecord) => {
    if (item.type === 'comment_incomplete') {
      const comment = comments.find(c => c.id === item.sourceId)
      if (comment) {
        return {
          title: '评审批注原始数据',
          lines: [
            `原始来源：${comment.originalSource}`,
            `原始行号：第 ${comment.originalLine} 行`,
            `评审人：${comment.reviewer || '(空)'}`,
            `批注内容：${comment.content || '(空)'}`,
            `创建时间：${comment.createdAt}`,
            `缺失字段：${comment.missingFields.join('、')}`,
          ],
          highlightLines: comment.missingFields.length > 0 ? [2, 3, 4, 5] : [],
        }
      }
    } else if (item.type === 'timeline_gap') {
      const record = timelineRecords.find(t => t.id === item.sourceId)
      if (record) {
        return {
          title: '时间轴原始记录',
          lines: [
            `原始来源：作业记录_${record.date}.xlsx`,
            `库位编码：${getLocationCode(record.locationId)}`,
            `日期：${record.date}`,
            `开始时间：${record.startTime}`,
            `结束时间：${record.endTime}`,
            `操作员：${record.operator}`,
            `缺段描述：${record.gapDescription}`,
            `缺段时长：${record.gapDuration} 小时`,
          ],
          highlightLines: [6, 7],
        }
      }
    }
    return { title: '原始数据', lines: ['暂无原始数据'], highlightLines: [] }
  }

  const stats = {
    total: badData.length,
    timelineGap: badData.filter(b => b.type === 'timeline_gap').length,
    commentIncomplete: badData.filter(b => b.type === 'comment_incomplete').length,
    high: badData.filter(b => b.severity === 'high').length,
  }

  const originalData = selectedBadData ? getOriginalContent(selectedBadData) : null

  return (
    <div className="min-h-screen bg-wharf-950 text-steel-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="btn-ghost flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              返回复核
            </button>
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-danger-400" size={24} />
              <h1 className="font-mono text-xl font-bold text-wharf-100">
                坏数据专区
              </h1>
              <span className="tag tag-danger">
                共 {stats.total} 条异常
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-steel-400">高风险:</span>
              <span className="text-red-400 font-bold font-mono">{stats.high}</span>
            </div>
            <div className="w-px h-5 bg-steel-700" />
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-danger-400" />
              <span className="text-steel-400">时间缺段:</span>
              <span className="font-mono text-steel-200">{stats.timelineGap}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-danger-400" />
              <span className="text-steel-400">批注不齐:</span>
              <span className="font-mono text-steel-200">{stats.commentIncomplete}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 panel overflow-hidden">
            <div className="panel-header">
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {[
                    { value: 'all', label: '全部' },
                    { value: 'timeline_gap', label: '时间轴缺段' },
                    { value: 'comment_incomplete', label: '评审批注不齐' },
                  ].map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value as typeof activeTab)}
                      className={`px-4 py-1.5 text-sm transition-all border
                        ${activeTab === tab.value
                          ? 'bg-wharf-600 text-white border-wharf-400/50'
                          : 'bg-transparent text-steel-400 border-transparent hover:text-steel-200'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-500" />
                <input
                  type="text"
                  placeholder="搜索库位、描述、来源..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-wharf-900/60 border border-steel-700/50 pl-9 pr-4 py-1.5 text-sm 
                           text-steel-200 w-64 focus:outline-none focus:border-wharf-500"
                />
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[calc(100vh-280px)] overflow-auto">
              {filteredBadData.length > 0 ? (
                filteredBadData.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 border transition-all cursor-pointer
                      ${selectedBadData?.id === item.id
                        ? 'border-wharf-500 bg-wharf-800/80'
                        : 'border-steel-700/50 bg-wharf-900/40 hover:border-steel-600/50 hover:bg-wharf-800/40'
                      }`}
                    onClick={() => handleViewSource(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 ${
                          item.severity === 'high'
                            ? 'bg-red-900/40 text-red-400'
                            : item.severity === 'medium'
                              ? 'bg-danger-900/40 text-danger-400'
                              : 'bg-yellow-900/40 text-yellow-400'
                        }`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm font-bold text-wharf-200">
                              {getLocationCode(item.locationId)}
                            </span>
                            <span className="tag tag-normal text-[10px]">
                              {getLocationArea(item.locationId)}
                            </span>
                            <span className={`tag ${
                              item.severity === 'high' ? 'tag-danger' : 'tag-warning'
                            } text-[10px]`}>
                              {getSeverityLabel(item.severity)}风险
                            </span>
                          </div>
                          <div className="text-sm text-steel-300 mb-2">
                            {item.description}
                          </div>
                          <div className="text-xs text-steel-500 font-mono">
                            类型：{getTypeLabel(item.type)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            selectLocation(item.locationId)
                            window.location.hash = '#/'
                          }}
                          className="text-xs text-wharf-400 hover:text-wharf-300 
                                   flex items-center gap-1"
                        >
                          <Eye size={14} />
                          查看库位
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-steel-700/50 flex items-center justify-between">
                      <span className="text-xs text-steel-500 font-mono">
                        原始引用：{item.originalRef}
                      </span>
                      <span className="text-xs text-steel-600">
                        检测时间：{item.detectedAt}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-steel-500 py-12">
                  暂无符合条件的坏数据
                </div>
              )}
            </div>
          </div>

          <div className="w-96 panel overflow-hidden flex flex-col">
            <div className="panel-header">
              <span className="panel-title">原始来源查看器</span>
              <span className="text-xs text-steel-500">不做清洗，保留原貌</span>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              {originalData ? (
                <div className="space-y-4">
                  <div className="text-sm text-wharf-200 font-medium">
                    {originalData.title}
                  </div>

                  <div className="bg-black/50 border border-steel-800 p-4 font-mono text-xs space-y-1">
                    {originalData.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 py-1 ${
                          originalData.highlightLines.includes(idx)
                            ? 'bg-red-900/30 -mx-2 px-2 text-red-300'
                            : 'text-steel-300'
                        }`}
                      >
                        <span className="text-steel-600 w-6 text-right flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-steel-500 bg-wharf-900/50 p-3 border border-steel-700/50">
                    <div className="font-medium text-steel-400 mb-1">说明</div>
                    <p>以上为原始数据原貌，系统未做任何修改或清洗。
                       红色高亮行为存在问题的字段，请结合具体业务场景判断是否需要人工补录。</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-steel-500 text-sm">
                  点击左侧列表查看原始数据
                </div>
              )}
            </div>

            <div className="border-t border-steel-700/50 p-4 bg-wharf-900/40">
              <div className="text-xs text-steel-400 mb-2">处理建议</div>
              <ul className="text-xs text-steel-500 space-y-1 list-disc list-inside">
                <li>先核对原始文件，确认数据是否确实缺失</li>
                <li>联系数据提供方补录或修正原始数据</li>
                <li>无法补录的，在评审批注中注明原因</li>
                <li>坏数据不参与正常复核结果统计</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-steel-600 font-mono">
          坏数据隔离原则：单独展示、保留原貌、追溯来源、不混入正常结果
        </div>
      </div>
    </div>
  )
}
