import { useReviewStore } from '@/store/useReviewStore'
import { Package, FileText, Clock, AlertTriangle, Database } from 'lucide-react'

export function SideDetailPanel() {
  const {
    selectedLocation,
    selectedGoods,
    selectedComments,
    selectedTimeline,
    descriptions,
    hasBadData,
    getLocationBadData,
  } = useReviewStore()

  if (!selectedLocation) {
    return (
      <div className="panel w-80 flex flex-col">
        <div className="panel-header">
          <span className="panel-title">侧边明细</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-steel-500 text-sm p-6">
          请从左侧场景图中选择一个库位
        </div>
      </div>
    )
  }

  const usagePercent = ((selectedLocation.used / selectedLocation.capacity) * 100).toFixed(1)
  const locationBadData = getLocationBadData(selectedLocation.id)
  const timelineGaps = selectedTimeline.filter(t => t.hasGap)
  const incompleteComments = selectedComments.filter(c => c.isIncomplete)

  return (
    <div className="panel w-80 flex flex-col overflow-hidden">
      <div className="panel-header">
        <span className="panel-title">侧边明细</span>
        {hasBadData && (
          <span className="tag tag-danger flex items-center gap-1">
            <AlertTriangle size={12} />
            异常 {locationBadData.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-wharf-200">
            <Package size={16} />
            <span className="text-sm font-medium">基本信息</span>
          </div>
          <div className="bg-wharf-900/40 border border-steel-700/50 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">库位编码</span>
              <span className="font-mono text-wharf-100">{selectedLocation.code}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">所属库区</span>
              <span className="text-steel-200">{selectedLocation.area}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">危险等级</span>
              <span className="tag tag-warning">{selectedLocation.hazardClass || '未分类'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">当前状态</span>
              <span className={`tag tag-${selectedLocation.status === 'normal' ? 'normal' : selectedLocation.status === 'warning' ? 'warning' : 'danger'}`}>
                {selectedLocation.status === 'normal' ? '正常' : selectedLocation.status === 'warning' ? '预警' : '危险'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-wharf-200">
            <Database size={16} />
            <span className="text-sm font-medium">空间数据</span>
          </div>
          <div className="bg-wharf-900/40 border border-steel-700/50 p-3 space-y-3">
            <div className="w-full h-3 bg-steel-700/50 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  selectedLocation.status === 'danger' ? 'bg-red-500' :
                  selectedLocation.status === 'warning' ? 'bg-danger-400' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">容量 / 已用</span>
              <span className="font-mono text-steel-200">
                {selectedLocation.used} / {selectedLocation.capacity} m³
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-steel-400">使用率</span>
              <span className={`font-mono font-bold ${
                Number(usagePercent) > 90 ? 'text-red-400' :
                Number(usagePercent) > 70 ? 'text-danger-400' : 'text-green-400'
              }`}>
                {usagePercent}%
              </span>
            </div>
          </div>
        </div>

        {selectedGoods.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-wharf-200">
              <Package size={16} />
              <span className="text-sm font-medium">存储危险品</span>
            </div>
            <div className="bg-wharf-900/40 border border-steel-700/50 p-3 space-y-2">
              {selectedGoods.map(goods => (
                <div key={goods.id} className="flex justify-between text-sm">
                  <span className="text-steel-300">{goods.name}</span>
                  <span className="font-mono text-wharf-200">
                    {goods.quantity} {goods.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-wharf-200">
            <FileText size={16} />
            <span className="text-sm font-medium">评审批注</span>
            {incompleteComments.length > 0 && (
              <span className="tag tag-danger text-[10px]">不齐 {incompleteComments.length}</span>
            )}
          </div>
          <div className="space-y-2">
            {selectedComments.length > 0 ? (
              selectedComments.map(comment => (
                <div
                  key={comment.id}
                  className={`bg-wharf-900/40 border p-3 space-y-2 ${
                    comment.isIncomplete
                      ? 'border-red-600/50 border-l-4 border-l-red-500'
                      : 'border-steel-700/50'
                  }`}
                >
                  {comment.isIncomplete ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-400 font-medium">⚠️ 批注不齐整</span>
                        <span className="font-mono text-[10px] text-steel-500">
                          {comment.originalSource}
                        </span>
                      </div>
                      <div className="text-xs text-steel-400">
                        缺失字段：{comment.missingFields.join('、')}
                      </div>
                      <div className="text-sm text-steel-300 font-mono bg-black/30 p-2 border border-steel-800">
                        原始内容："{comment.content || '空'}"
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-wharf-200 font-medium">{comment.reviewer}</span>
                        <span className="text-xs text-steel-500">{comment.createdAt}</span>
                      </div>
                      <div className="text-sm text-steel-300">{comment.content}</div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-steel-500 text-center py-4">暂无评审批注</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-wharf-200">
            <Clock size={16} />
            <span className="text-sm font-medium">时间轴记录</span>
            {timelineGaps.length > 0 && (
              <span className="tag tag-danger text-[10px]">缺段 {timelineGaps.length}</span>
            )}
          </div>
          <div className="bg-wharf-900/40 border border-steel-700/50 p-3 space-y-2">
            {selectedTimeline.length > 0 ? (
              selectedTimeline.map(record => (
                <div
                  key={record.id}
                  className={`flex items-center justify-between text-sm py-1 border-l-2 pl-2 ${
                    record.hasGap
                      ? 'border-red-500 bg-red-900/20 -mx-2 px-2'
                      : 'border-green-500/50'
                  }`}
                >
                  <span className="font-mono text-steel-300">
                    {record.startTime} - {record.endTime}
                  </span>
                  <span className="text-steel-400 text-xs">{record.operator}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-steel-500 text-center py-2">暂无时间轴记录</div>
            )}
          </div>
        </div>

        <div className="border-t border-dashed border-steel-700/50 pt-4">
          <div className="text-xs text-steel-500 font-mono">
            场景标注：{descriptions.annotation.split('｜').slice(0, 2).join('｜')}...
          </div>
        </div>
      </div>
    </div>
  )
}
