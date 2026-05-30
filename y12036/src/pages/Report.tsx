import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import {
  FileText,
  Lock,
  Anchor,
  AlertTriangle,
  Copy,
  Download,
  ArrowLeft,
  RotateCcw,
  Check,
  Ship,
  Fuel,
  Waves,
  ClipboardList,
} from 'lucide-react'

const LOCK_TYPE_LABEL: Record<string, string> = {
  fuel: '燃油锁定',
  berth: '泊位锁定',
  cargo: '货物锁定',
}

const CONFLICT_TYPE_LABEL: Record<string, string> = {
  berth_collision: '泊位碰撞',
  tide_mismatch: '潮汐不匹配',
  fuel_shortage: '燃油不足',
  data_inconsistency: '数据不一致',
}

const RESOLUTION_LABEL: Record<string, string> = {
  keep_ship: '保留船舶卡',
  keep_dock: '保留码头格',
  manual_fix: '手动修正',
  unresolved: '未裁决',
}

export default function Report() {
  const {
    session,
    dispatchHistory,
    conflicts,
    deductions,
    resourceLocks,
    generateReport,
    getShipById,
    getPortById,
    restartGame,
  } = useGameStore()

  const [copied, setCopied] = useState(false)

  const reportText = generateReport()
  const reportLines = reportText.split('\n')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleExportJSON = () => {
    const data = {
      session,
      dispatchHistory,
      conflicts,
      deductions,
      resourceLocks,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${session.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRestart = () => {
    restartGame()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <header className="flex items-center gap-3 mb-8">
          <FileText size={28} style={{ color: '#00D4AA' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#00D4AA' }}>
            海岛港口补给棋 · 调度报告
          </h1>
          <span
            className="ml-auto px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: session.status === 'finished' ? '#FF8C00' : '#00D4AA',
              color: '#0A1628',
            }}
          >
            {session.status === 'finished' ? '已结束' : '进行中'}
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div
            className="lg:col-span-2 rounded-xl p-6"
            style={{ backgroundColor: '#0D1F3C', border: '1px solid #1A3A5C' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} style={{ color: '#00D4AA' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#00D4AA' }}>
                报告预览
              </h2>
            </div>
            <div
              className="rounded-lg p-4 font-mono text-sm leading-relaxed overflow-auto max-h-[600px]"
              style={{
                backgroundColor: '#070F1E',
                border: '1px solid #1A3A5C',
                color: '#C8D6E5',
              }}
            >
              {reportLines.map((line, i) => (
                <div key={i} className="whitespace-pre">
                  {line.includes('═') || line.includes('──') ? (
                    <span style={{ color: '#00D4AA' }}>{line}</span>
                  ) : line.includes('海岛港口补给棋') ? (
                    <span className="font-bold" style={{ color: '#00D4AA' }}>
                      {line}
                    </span>
                  ) : (
                    line
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: '#0D1F3C', border: '1px solid #1A3A5C' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} style={{ color: '#FF8C00' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#FF8C00' }}>
                资源锁定口径说明
              </h2>
            </div>
            {resourceLocks.length === 0 ? (
              <p className="text-sm" style={{ color: '#5A7A9A' }}>
                当前无资源锁定记录
              </p>
            ) : (
              <div className="space-y-4 overflow-auto max-h-[600px]">
                {resourceLocks.map((lock) => {
                  const ship = getShipById(lock.shipId)
                  return (
                    <div
                      key={lock.id}
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: '#0A1628',
                        border: '1px solid #1A3A5C',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor:
                              lock.type === 'fuel'
                                ? '#FF8C00'
                                : lock.type === 'berth'
                                  ? '#00D4AA'
                                  : '#5B8DEF',
                            color: '#0A1628',
                          }}
                        >
                          {LOCK_TYPE_LABEL[lock.type] ?? lock.type}
                        </span>
                        <span className="text-sm" style={{ color: '#C8D6E5' }}>
                          第{lock.round}回合
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-start gap-2">
                          <Ship size={14} className="mt-0.5 shrink-0" style={{ color: '#00D4AA' }} />
                          <div>
                            <span style={{ color: '#5A7A9A' }}>关联船舶：</span>
                            <span style={{ color: '#C8D6E5' }}>
                              {ship?.name ?? lock.shipId}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#FF8C00' }} />
                          <div>
                            <span style={{ color: '#5A7A9A' }}>锁定原因：</span>
                            <span style={{ color: '#C8D6E5' }}>{lock.reason}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Lock size={14} className="mt-0.5 shrink-0" style={{ color: '#00D4AA' }} />
                          <div>
                            <span style={{ color: '#5A7A9A' }}>解锁条件：</span>
                            <span style={{ color: '#00D4AA' }}>{lock.unlockCondition}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: '#0D1F3C', border: '1px solid #1A3A5C' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Anchor size={18} style={{ color: '#00D4AA' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#00D4AA' }}>
                调度记录摘要
              </h2>
            </div>
            {dispatchHistory.length === 0 ? (
              <p className="text-sm" style={{ color: '#5A7A9A' }}>
                暂无调度记录
              </p>
            ) : (
              <div className="space-y-3 overflow-auto max-h-[400px]">
                {dispatchHistory.map((action) => {
                  const ship = getShipById(action.shipId)
                  const fromPort = getPortById(action.fromPortId)
                  const toPort = getPortById(action.toPortId)
                  return (
                    <div
                      key={action.id}
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: '#0A1628',
                        border: '1px solid #1A3A5C',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ backgroundColor: '#00D4AA', color: '#0A1628' }}
                        >
                          回合 {action.round}
                        </span>
                        <span className="text-sm font-medium" style={{ color: '#C8D6E5' }}>
                          {ship?.name ?? action.shipId}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Anchor size={14} style={{ color: '#5A7A9A' }} />
                          <span style={{ color: '#C8D6E5' }}>
                            {fromPort?.name ?? action.fromPortId} → {toPort?.name ?? action.toPortId}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Fuel size={14} style={{ color: '#FF8C00' }} />
                          <span style={{ color: '#C8D6E5' }}>
                            燃油消耗: {action.fuelCost}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Waves size={14} style={{ color: action.tideWindowMatched ? '#00D4AA' : '#FF8C00' }} />
                          <span
                            style={{
                              color: action.tideWindowMatched ? '#00D4AA' : '#FF8C00',
                            }}
                          >
                            潮汐匹配: {action.tideWindowMatched ? '是' : '否'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: '#0D1F3C', border: '1px solid #1A3A5C' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} style={{ color: '#FF8C00' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#FF8C00' }}>
                冲突裁决摘要
              </h2>
            </div>
            {conflicts.length === 0 ? (
              <p className="text-sm" style={{ color: '#5A7A9A' }}>
                暂无冲突记录
              </p>
            ) : (
              <div className="space-y-3 overflow-auto max-h-[400px]">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: '#0A1628',
                      border: `1px solid ${conflict.resolution === 'unresolved' ? '#FF8C00' : '#1A3A5C'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          backgroundColor:
                            conflict.type === 'berth_collision'
                              ? '#FF8C00'
                              : conflict.type === 'tide_mismatch'
                                ? '#5B8DEF'
                                : conflict.type === 'fuel_shortage'
                                  ? '#E74C3C'
                                  : '#9B59B6',
                          color: '#0A1628',
                        }}
                      >
                        {CONFLICT_TYPE_LABEL[conflict.type] ?? conflict.type}
                      </span>
                      <span className="text-sm" style={{ color: '#5A7A9A' }}>
                        回合 {conflict.round} · {conflict.fieldName}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-start gap-2">
                        <Ship size={14} className="mt-0.5 shrink-0" style={{ color: '#00D4AA' }} />
                        <div>
                          <span style={{ color: '#5A7A9A' }}>船舶卡值：</span>
                          <span style={{ color: '#C8D6E5' }}>{conflict.shipCardValue}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Anchor size={14} className="mt-0.5 shrink-0" style={{ color: '#5B8DEF' }} />
                        <div>
                          <span style={{ color: '#5A7A9A' }}>码头格值：</span>
                          <span style={{ color: '#C8D6E5' }}>{conflict.dockGridValue}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          size={14}
                          className="mt-0.5 shrink-0"
                          style={{
                            color: conflict.resolution === 'unresolved' ? '#FF8C00' : '#00D4AA',
                          }}
                        />
                        <div>
                          <span style={{ color: '#5A7A9A' }}>裁决结果：</span>
                          <span
                            style={{
                              color: conflict.resolution === 'unresolved' ? '#FF8C00' : '#00D4AA',
                            }}
                          >
                            {RESOLUTION_LABEL[conflict.resolution] ?? conflict.resolution}
                          </span>
                        </div>
                      </div>
                      {conflict.resolutionReason && (
                        <div className="flex items-start gap-2">
                          <FileText size={14} className="mt-0.5 shrink-0" style={{ color: '#5A7A9A' }} />
                          <div>
                            <span style={{ color: '#5A7A9A' }}>裁决理由：</span>
                            <span style={{ color: '#C8D6E5' }}>
                              {conflict.resolutionReason}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="rounded-xl p-6 mb-6"
          style={{ backgroundColor: '#0D1F3C', border: '1px solid #1A3A5C' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#00D4AA' }}>
            一键分享
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: copied ? '#00D4AA' : 'transparent',
                border: `1px solid ${copied ? '#00D4AA' : '#00D4AA'}`,
                color: copied ? '#0A1628' : '#00D4AA',
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? '已复制' : '复制报告文本'}
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #FF8C00',
                color: '#FF8C00',
              }}
            >
              <Download size={18} />
              导出JSON
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium"
            style={{
              backgroundColor: '#1A3A5C',
              color: '#C8D6E5',
            }}
          >
            <ArrowLeft size={18} />
            返回棋盘
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #FF8C00',
              color: '#FF8C00',
            }}
          >
            <RotateCcw size={18} />
            重新开始
          </button>
        </div>
      </div>
    </div>
  )
}
