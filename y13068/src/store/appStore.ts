import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Batten, ViewAngle, NoteHistoryItem, Screenshot } from '../types'
import { mockBattens, mockHandoffLogs } from '../data/mockData'

interface AppState {
  battens: Batten[]
  selectedBattenId: string | null
  currentView: ViewAngle
  showHandoffModal: boolean
  showExportModal: boolean
  showSuspensionConfirm: boolean

  selectBatten: (id: string | null) => void
  setCurrentView: (view: ViewAngle) => void
  toggleHandoffModal: () => void
  toggleExportModal: () => void
  toggleSuspensionConfirm: () => void

  updateUnifiedDescription: (battenId: string, description: string) => void
  addNote: (battenId: string, author: string, content: string, type: NoteHistoryItem['type']) => void
  addScreenshot: (battenId: string, screenshot: Omit<Screenshot, 'id' | 'timestamp' | 'version'>) => void

  suspendBatten: (battenId: string, reason: string, author: string) => void
  confirmBatten: (battenId: string, author: string, resolvedUnit?: Batten['floorUnit']) => void

  exportBattenReport: (battenId: string) => string
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function getCurrentTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      battens: mockBattens,
      selectedBattenId: mockBattens[0]?.id ?? null,
      currentView: 'front',
      showHandoffModal: false,
      showExportModal: false,
      showSuspensionConfirm: false,

      selectBatten: (id) => set({ selectedBattenId: id }),

      setCurrentView: (view) => set({ currentView: view }),

      toggleHandoffModal: () => set((s) => ({ showHandoffModal: !s.showHandoffModal })),
      toggleExportModal: () => set((s) => ({ showExportModal: !s.showExportModal })),
      toggleSuspensionConfirm: () => set((s) => ({ showSuspensionConfirm: !s.showSuspensionConfirm })),

      updateUnifiedDescription: (battenId, description) =>
        set((state) => ({
          battens: state.battens.map((b) =>
            b.id === battenId
              ? {
                  ...b,
                  sceneAnnotation: description,
                  sideDescription: description,
                  screenshotDescription: description
                }
              : b
          )
        })),

      addNote: (battenId, author, content, type) =>
        set((state) => ({
          battens: state.battens.map((b) =>
            b.id === battenId
              ? {
                  ...b,
                  noteHistory: [
                    ...b.noteHistory,
                    {
                      id: generateId('n'),
                      timestamp: getCurrentTimestamp(),
                      author,
                      content,
                      type
                    }
                  ]
                }
              : b
          )
        })),

      addScreenshot: (battenId, screenshot) =>
        set((state) => ({
          battens: state.battens.map((b) => {
            if (b.id !== battenId) return b
            const nextVersion = b.screenshots.length > 0
              ? Math.max(...b.screenshots.map((s) => s.version)) + 1
              : 1
            return {
              ...b,
              screenshots: [
                ...b.screenshots,
                {
                  ...screenshot,
                  id: generateId('sc'),
                  timestamp: getCurrentTimestamp(),
                  version: nextVersion
                }
              ]
            }
          })
        })),

      suspendBatten: (battenId, reason, author) =>
        set((state) => ({
          battens: state.battens.map((b) => {
            if (b.id !== battenId) return b
            const suspendNote: NoteHistoryItem = {
              id: generateId('n'),
              timestamp: getCurrentTimestamp(),
              author,
              content: `挂起：${reason}`,
              type: 'suspension'
            }
            const unifiedDesc = `${b.label}：${reason}——已挂起等待现场老师确认，不给出假稳定结论`
            return {
              ...b,
              isSuspended: true,
              suspensionReason: reason,
              status: 'suspended',
              sceneAnnotation: unifiedDesc,
              sideDescription: unifiedDesc,
              screenshotDescription: unifiedDesc,
              noteHistory: [...b.noteHistory, suspendNote]
            }
          })
        })),

      confirmBatten: (battenId, author, resolvedUnit) =>
        set((state) => ({
          battens: state.battens.map((b) => {
            if (b.id !== battenId) return b
            const confirmNote: NoteHistoryItem = {
              id: generateId('n'),
              timestamp: getCurrentTimestamp(),
              author,
              content: resolvedUnit
                ? `现场老师确认：单位采用 ${resolvedUnit}，高度 ${b.floorLevel} ${resolvedUnit} 正确`
                : '现场老师确认：当前状态正确',
              type: 'confirmation'
            }
            const newStatus = b.status === 'error' ? 'error' : b.status === 'warning' ? 'warning' : 'normal'
            const unifiedDesc = resolvedUnit
              ? `${b.label}：标高 ${b.floorLevel} ${resolvedUnit}，已由现场老师确认。${newStatus !== 'normal' ? '当前状态：' + newStatus : ''}`
              : `${b.label}：状态已由现场老师确认`
            return {
              ...b,
              isSuspended: false,
              confirmedByTeacher: true,
              hasUnitMismatch: resolvedUnit ? false : b.hasUnitMismatch,
              detectedFloorUnits: resolvedUnit ? [resolvedUnit] : b.detectedFloorUnits,
              floorUnit: resolvedUnit ?? b.floorUnit,
              status: newStatus,
              sceneAnnotation: unifiedDesc,
              sideDescription: unifiedDesc,
              screenshotDescription: unifiedDesc,
              noteHistory: [...b.noteHistory, confirmNote]
            }
          })
        })),

      exportBattenReport: (battenId) => {
        const batten = get().battens.find((b) => b.id === battenId)
        if (!batten) return ''

        const unitName: Record<string, string> = {
          meters: '米(m)',
          feet: '英尺(ft)',
          millimeters: '毫米(mm)'
        }
        const statusName: Record<string, string> = {
          normal: '正常',
          warning: '警告',
          error: '异常',
          pending: '待处理',
          suspended: '已挂起'
        }

        const lines: string[] = []
        lines.push('========================================')
        lines.push('  剧院吊杆阵列剖面讲解 - 异常对象导出报告')
        lines.push('========================================')
        lines.push('')
        lines.push(`【吊杆标识】${batten.name} (${batten.label})`)
        lines.push(`【当前状态】${statusName[batten.status]}${batten.isSuspended ? ' - 已挂起等待确认' : ''}`)
        lines.push('')
        lines.push('【空间位置】')
        lines.push(`  坐标系统: ${batten.coordinateSystem}`)
        lines.push(`  三维坐标: X=${batten.currentPosition.x}, Y=${batten.currentPosition.y}, Z=${batten.currentPosition.z}`)
        lines.push(`  楼层标高: ${batten.floorLevel} ${unitName[batten.floorUnit]}`)
        if (batten.hasUnitMismatch) {
          lines.push(`  ⚠ 单位混写异常！检测到单位: ${batten.detectedFloorUnits.map((u) => unitName[u]).join(' / ')}`)
        }
        lines.push('')
        lines.push('【统一说明】')
        lines.push(`  场景标注: ${batten.sceneAnnotation}`)
        lines.push(`  侧边说明: ${batten.sideDescription}`)
        lines.push(`  截图说明: ${batten.screenshotDescription}`)
        if (batten.sceneAnnotation === batten.sideDescription && batten.sideDescription === batten.screenshotDescription) {
          lines.push('  ✓ 三处说明内容一致，数据源统一')
        } else {
          lines.push('  ✗ 警告：三处说明不一致！')
        }
        lines.push('')
        lines.push('【传感器记录 - 原始说法追溯】')
        batten.sensorRecords.forEach((rec, idx) => {
          lines.push(`  ${idx + 1}. [${rec.timestamp}] ${rec.source}`)
          lines.push(`     坐标系: ${rec.coordinateSystem}${rec.hasCoordinateMismatch ? ' (坐标系异常)' : ''}`)
          lines.push(`     位置: X=${rec.position.x} Y=${rec.position.y} Z=${rec.position.z}`)
          lines.push(`     单位: 记录=${unitName[rec.floorUnit]} 原始=${unitName[rec.rawFloorUnit]}${rec.rawFloorUnit !== rec.floorUnit ? ' (已转换)' : ''}`)
          lines.push(`     张力=${rec.tension}N 倾角=${rec.tilt}° 温度=${rec.temperature}°C`)
          lines.push(`     原始备注: ${rec.originalNote}`)
        })
        lines.push('')
        lines.push('【历史备注】')
        batten.noteHistory.forEach((note, idx) => {
          lines.push(`  ${idx + 1}. [${note.timestamp}] ${note.author} (${note.type})`)
          lines.push(`     ${note.content}`)
        })
        lines.push('')
        lines.push('【截图说明 - 处理结果追溯】')
        batten.screenshots.forEach((sc, idx) => {
          lines.push(`  ${idx + 1}. v${sc.version} [${sc.timestamp}] ${sc.author} - 视角: ${sc.viewAngle}`)
          lines.push(`     说明: ${sc.description}`)
          lines.push(`     处理结果: ${sc.processingResult ?? '无'}`)
        })
        lines.push('')
        lines.push('========================================')
        lines.push(`报告生成时间: ${getCurrentTimestamp()}`)
        lines.push('========================================')

        return lines.join('\n')
      }
    }),
    {
      name: 'theater-batten-array-store',
      partialize: (state) => ({
        battens: state.battens,
        selectedBattenId: state.selectedBattenId
      })
    }
  )
)

export { mockHandoffLogs }
