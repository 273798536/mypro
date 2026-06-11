import { create } from 'zustand'
import type { CadLayer, Judgment, Withdrawal, ObjectOverlap, ReviewSnapshot, HandoverReport, OverlapStep, PendingMaterial, LayerObject } from '@/types'
import { mockCadLayers, mockJudgments, mockWithdrawals, mockOverlaps, mockSnapshots, mockReport } from '@/data/mockData'

interface AppState {
  cadLayers: CadLayer[]
  judgments: Judgment[]
  withdrawals: Withdrawal[]
  overlaps: ObjectOverlap[]
  snapshots: ReviewSnapshot[]
  report: HandoverReport
  activeSnapshotId: string | null
  filterRestoredFrom: string | null
  isDetectingOverlap: boolean
  isExporting: boolean
  locatedObjectId: string | null
  uploadPending: boolean
  lastDetectionReport: string | null

  toggleStepCompleted: (overlapId: string, stepOrder: number) => void
  setOverlapStatus: (overlapId: string, status: ObjectOverlap['status']) => void
  setActiveSnapshot: (id: string | null) => void
  restoreFilterFromSnapshot: (snapshotId: string) => void
  getImpactedJudgments: (withdrawalId: string) => Judgment[]
  getJudgmentWithdrawals: (judgmentId: string) => Withdrawal | undefined
  reDetectOverlaps: () => Promise<{ newCount: number; resolvedCount: number; detected: number; newAdded: number; total: number; report: string }>
  createNewSnapshot: (name: string) => Promise<ReviewSnapshot>
  locateObject: (objectId: string) => Promise<void>
  openPathInExplorer: (path: string) => Promise<{ success: boolean; copied: boolean; path: string }>
  handleExport: (modeId: string, params: Record<string, boolean | string>) => Promise<{ fileName: string; size: string; bytes: number }>
  uploadSupplementMaterial: (file: File) => Promise<PendingMaterial>
  addPendingMaterial: (material: PendingMaterial) => void
  setLocatedObject: (id: string | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  cadLayers: mockCadLayers,
  judgments: mockJudgments,
  withdrawals: mockWithdrawals,
  overlaps: mockOverlaps,
  snapshots: mockSnapshots,
  report: mockReport,
  activeSnapshotId: null,
  filterRestoredFrom: null,
  isDetectingOverlap: false,
  isExporting: false,
  locatedObjectId: null,
  uploadPending: false,
  lastDetectionReport: null,

  toggleStepCompleted: (overlapId, stepOrder) =>
    set((state) => ({
      overlaps: state.overlaps.map((o) =>
        o.id === overlapId
          ? {
              ...o,
              steps: o.steps.map((s: OverlapStep) =>
                s.order === stepOrder ? { ...s, completed: !s.completed } : s,
              ),
            }
          : o,
      ),
    })),

  setOverlapStatus: (overlapId, status) =>
    set((state) => ({
      overlaps: state.overlaps.map((o) => (o.id === overlapId ? { ...o, status } : o)),
    })),

  setActiveSnapshot: (id) => set({ activeSnapshotId: id }),

  restoreFilterFromSnapshot: (snapshotId) => set({ filterRestoredFrom: snapshotId }),

  getImpactedJudgments: (withdrawalId) => {
    const wd = get().withdrawals.find((w) => w.id === withdrawalId)
    if (!wd) return []
    return get().judgments.filter((j) => wd.impacts.includes(j.id))
  },

  getJudgmentWithdrawals: (judgmentId) =>
    get().withdrawals.find((w) => w.judgmentId === judgmentId),

  reDetectOverlaps: async () => {
    set({ isDetectingOverlap: true })
    const detectionLines: string[] = []
    const timestamp = new Date().toLocaleString('zh-CN', { hour12: false })
    detectionLines.push(`[${timestamp}] 开始图层对象重叠检测...`)
    await new Promise((r) => setTimeout(r, 400))

    const layers = get().cadLayers
    const allObjects: (LayerObject & { layerName: string; layerId: string })[] = []
    layers.forEach((layer) => {
      detectionLines.push(`  加载图层 ${layer.name}（坐标系：${layer.coordinateSystem}，对象数：${layer.objects.length}）`)
      layer.objects.forEach((obj) => {
        allObjects.push({ ...obj, layerName: layer.name, layerId: layer.id })
      })
    })
    await new Promise((r) => setTimeout(r, 400))

    detectionLines.push(`  共加载 ${allObjects.length} 个对象，开始两两进行 AABB 碰撞检测...`)
    const detectedPairs: Array<{
      a: LayerObject & { layerName: string; layerId: string }
      b: LayerObject & { layerName: string; layerId: string }
      overlap: { x: number; y: number; w: number; h: number }
    }> = []

    for (let i = 0; i < allObjects.length; i++) {
      for (let j = i + 1; j < allObjects.length; j++) {
        const a = allObjects[i]
        const b = allObjects[j]
        if (a.layerId === b.layerId) continue
        const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
        const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
        if (xOverlap > 0 && yOverlap > 0) {
          detectedPairs.push({
            a,
            b,
            overlap: {
              x: Math.max(a.x, b.x),
              y: Math.max(a.y, b.y),
              w: xOverlap,
              h: yOverlap,
            },
          })
          const area = xOverlap * yOverlap
          detectionLines.push(`    ⚠ 检测到重叠：[${a.name}](${a.layerName}) ⟷ [${b.name}](${b.layerName})，重叠区 ${xOverlap}×${yOverlap} = ${area}px²`)
        }
      }
    }
    await new Promise((r) => setTimeout(r, 500))

    const existingOverlaps = get().overlaps
    const makeKey = (a: string, b: string, la: string, lb: string) => {
      const pair = [a, b].sort()
      const layers = [la, lb].sort()
      return `${pair[0]}|${pair[1]}|${layers[0]}|${layers[1]}`
    }
    const existingKeys = new Set(
      existingOverlaps.map((o) => makeKey(o.objectA, o.objectB, o.layerA, o.layerB)),
    )

    const newOverlaps: ObjectOverlap[] = []
    for (const pair of detectedPairs) {
      const key = makeKey(pair.a.name, pair.b.name, pair.a.layerId, pair.b.layerId)
      if (existingKeys.has(key)) continue

      const area = pair.overlap.w * pair.overlap.h
      const totalA = pair.a.width * pair.a.height
      const totalB = pair.b.width * pair.b.height
      const overlapRatio = Math.max(area / totalA, area / totalB)

      let severity: 'critical' | 'warning' | 'minor' = 'minor'
      if (overlapRatio > 0.5) severity = 'critical'
      else if (overlapRatio > 0.2) severity = 'warning'

      const steps: OverlapStep[] = [
        {
          order: 1,
          instruction: `打开图层 [${pair.a.layerName}]`,
          codeHint: pair.a.layerId,
          completed: false,
        },
        {
          order: 2,
          instruction: `打开图层 [${pair.b.layerName}]`,
          codeHint: pair.b.layerId,
          completed: false,
        },
        {
          order: 3,
          instruction: `定位重叠区域：坐标 (${pair.overlap.x}, ${pair.overlap.y})，尺寸 ${pair.overlap.w}×${pair.overlap.h}`,
          codeHint: `重叠面积: ${area}px²`,
          completed: false,
        },
        {
          order: 4,
          instruction:
            severity === 'critical'
              ? `严重重叠，优先调整 [${pair.a.name}] 或 [${pair.b.name}] 的位置`
              : severity === 'warning'
                ? `评估重叠影响，考虑微调 [${pair.a.name}] 坐标`
                : `确认轻微重叠是否在允许公差范围内`,
          codeHint: `建议调整量: ${Math.ceil(pair.overlap.w / 2)}mm`,
          completed: false,
        },
      ]

      const newOv: ObjectOverlap = {
        id: `ov-detected-${Date.now()}-${newOverlaps.length}`,
        severity,
        objectA: pair.a.name,
        objectB: pair.b.name,
        layerA: pair.a.layerId,
        layerB: pair.b.layerId,
        status: 'pending',
        steps,
      }
      newOverlaps.push(newOv)
      detectionLines.push(`    🆕 新增重叠项 [${severity.toUpperCase()}]：${pair.a.name} ⟷ ${pair.b.name}`)
    }

    const progressedOverlaps = existingOverlaps.map((o) => {
      if (o.status === 'resolved') return o
      const shouldProgress = Math.random() > 0.4
      if (!shouldProgress) return o
      const uncompletedSteps = o.steps.filter((s) => !s.completed)
      if (uncompletedSteps.length === 0) {
        return { ...o, status: 'resolved' as const }
      }
      const stepToComplete = uncompletedSteps[0]
      return {
        ...o,
        status: 'processing' as const,
        steps: o.steps.map((s) => (s.order === stepToComplete.order ? { ...s, completed: true } : s)),
      }
    })

    const allOverlaps = [...progressedOverlaps, ...newOverlaps]
    const newAddedCount = newOverlaps.length
    const finalResolved = allOverlaps.filter((o) => o.status === 'resolved').length
    const finalPending = allOverlaps.filter((o) => o.status !== 'resolved').length
    const totalDetected = detectedPairs.length

    detectionLines.push(``)
    detectionLines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    detectionLines.push(`  检测完成：共检测对象对 ${allObjects.length * (allObjects.length - 1) / 2} 组`)
    detectionLines.push(`  存在空间重叠：${totalDetected} 组`)
    detectionLines.push(`  已有记录：${existingOverlaps.length} 项，新增发现：${newAddedCount} 项`)
    detectionLines.push(`  当前待处理：${finalPending} 项，已处理：${finalResolved} 项`)
    detectionLines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    const report = detectionLines.join('\n')
    set({ overlaps: allOverlaps, isDetectingOverlap: false, lastDetectionReport: report })
    console.log(report)
    return {
      newCount: finalPending,
      resolvedCount: finalResolved,
      detected: totalDetected,
      newAdded: newAddedCount,
      total: allOverlaps.length,
      report,
    }
  },

  createNewSnapshot: async (name: string) => {
    await new Promise((r) => setTimeout(r, 1200))
    const newSnapshot: ReviewSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=hospital%20logistics%20robot%20CAD%20screenshot%20technical%20blueprint&image_size=landscape_16_9',
      hotspots: [],
      filterCondition: {
        visibleLayers: get().cadLayers.map((l) => l.id),
        coordinateSystem: 'BJ-54',
        showGrid: true,
        zoomLevel: 1.0,
      },
    }
    set((state) => ({ snapshots: [...state.snapshots, newSnapshot] }))
    return newSnapshot
  },

  locateObject: async (objectId: string) => {
    set({ locatedObjectId: objectId })
    await new Promise((r) => setTimeout(r, 500))
  },

  openPathInExplorer: async (path: string) => {
    await new Promise((r) => setTimeout(r, 300))
    let copied = false
    try {
      await navigator.clipboard.writeText(path)
      copied = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = path
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        copied = true
      } catch {
        copied = false
      }
      document.body.removeChild(ta)
    }
    let opened = false
    try {
      const fileUrl = `file://${path}`
      const win = window.open(fileUrl, '_blank', 'noopener,noreferrer')
      if (win) {
        opened = true
        setTimeout(() => win.close(), 500)
      }
    } catch {
      opened = false
    }
    console.log(`[Path Explorer] Path: ${path}, Copied: ${copied}, File URL opened: ${opened}`)
    return { success: copied || opened, copied, path }
  },

  handleExport: async (modeId, params) => {
    set({ isExporting: true })
    const mode = get().report.navigation.exportModes.find((m) => m.id === modeId)
    const timestamp = new Date().toISOString().slice(0, 10)
    const format = (params.format as string) || 'PDF'
    const ext = format === 'DWG' ? 'dxf' : format === 'PNG' ? 'png' : 'pdf'
    const fileName = `XX医院_B1层_剖面讲解_${mode?.name ?? '导出'}_${timestamp}.${ext}`

    const state = get()
    const report = state.report
    const layers = state.cadLayers
    const judgments = state.judgments
    const overlaps = state.overlaps

    await new Promise((r) => setTimeout(r, 600))

    let blob: Blob
    let mimeType: string

    if (format === 'PNG') {
      mimeType = 'image/png'
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 800
      const ctx = canvas.getContext('2d')!
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 800)
      bgGrad.addColorStop(0, '#f8fafc')
      bgGrad.addColorStop(1, '#e2e8f0')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, 1200, 800)
      ctx.strokeStyle = 'rgba(30, 58, 95, 0.08)'
      ctx.lineWidth = 1
      for (let gx = 0; gx <= 1200; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 800); ctx.stroke()
      }
      for (let gy = 0; gy <= 800; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(1200, gy); ctx.stroke()
      }
      const colors: Record<string, string> = {
        layer1: '#1e3a5f', layer2: '#d97706', layer3: '#059669', layer4: '#7c3aed',
      }
      const allObjs = layers.flatMap((l) => l.objects.map((o) => ({ ...o, layerColor: colors[l.id] || '#64748b' })))
      const scale = 0.12
      const offX = 80
      const offY = 80
      allObjs.forEach((obj) => {
        ctx.fillStyle = obj.layerColor + '33'
        ctx.strokeStyle = obj.layerColor
        ctx.lineWidth = 2
        ctx.fillRect(offX + obj.x * scale, offY + obj.y * scale, obj.width * scale, obj.height * scale)
        ctx.strokeRect(offX + obj.x * scale, offY + obj.y * scale, obj.width * scale, obj.height * scale)
        ctx.fillStyle = obj.layerColor
        ctx.font = '11px JetBrains Mono, monospace'
        ctx.fillText(obj.name, offX + obj.x * scale + 4, offY + obj.y * scale + 14)
      })
      ctx.fillStyle = '#1e3a5f'
      ctx.font = 'bold 22px "Noto Sans SC", sans-serif'
      ctx.fillText(report.projectName + ' - ' + (mode?.name || ''), 80, 45)
      ctx.font = '13px "Noto Sans SC", sans-serif'
      ctx.fillStyle = '#475569'
      ctx.fillText(`导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })} | 图层数：${layers.length} | 对象数：${allObjs.length}`, 80, 68)
      if (params.withAnnotation) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillRect(880, 80, 300, 680)
        ctx.strokeStyle = '#cbd5e1'
        ctx.strokeRect(880, 80, 300, 680)
        ctx.fillStyle = '#1e3a5f'
        ctx.font = 'bold 14px "Noto Sans SC", sans-serif'
        ctx.fillText('标注信息', 900, 105)
        ctx.font = '11px "Noto Sans SC", sans-serif'
        let annY = 130
        judgments.slice(-3).forEach((j) => {
          ctx.fillStyle = '#334155'
          ctx.fillText(`[${j.version}] ${j.content}`, 900, annY)
          annY += 18
        })
        overlaps.forEach((o) => {
          ctx.fillStyle = o.status === 'resolved' ? '#059669' : o.status === 'processing' ? '#d97706' : '#dc2626'
          ctx.fillText(`● ${o.objectA} ⟷ ${o.objectB} [${o.status}]`, 900, annY)
          annY += 18
        })
      }
      const pngDataUrl = canvas.toDataURL('image/png')
      const b64 = pngDataUrl.split(',')[1]
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      blob = new Blob([bytes], { type: mimeType })
    } else if (format === 'DWG') {
      mimeType = 'application/dxf'
      const dxfLines: string[] = []
      dxfLines.push('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009')
      dxfLines.push('9', '$INSBASE', '10', '0.0', '20', '0.0', '30', '0.0')
      dxfLines.push('0', 'ENDSEC', '0', 'SECTION', '2', 'TABLES')
      dxfLines.push('0', 'TABLE', '2', 'LAYER', '70', layers.length.toString())
      layers.forEach((l, i) => {
        const colorNum = (i + 1) * 10
        dxfLines.push('0', 'LAYER', '2', l.id, '70', '0', '62', colorNum.toString(), '6', 'CONTINUOUS')
      })
      dxfLines.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES')
      layers.forEach((l) => {
        l.objects.forEach((o) => {
          dxfLines.push('0', 'RECTANG')
          dxfLines.push('8', l.id)
          dxfLines.push('10', o.x.toString(), '20', o.y.toString())
          dxfLines.push('11', (o.x + o.width).toString(), '21', (o.y + o.height).toString())
          dxfLines.push('1', o.name)
        })
      })
      dxfLines.push('0', 'ENDSEC', '0', 'SECTION', '2', 'CLASSES', '0', 'ENDSEC', '0', 'EOF')
      if (params.withAnnotation) {
        dxfLines.splice(dxfLines.length - 2, 0, '0', 'SECTION', '2', 'OBJECTS')
        judgments.forEach((j) => {
          dxfLines.push('0', 'MTEXT', '1', `[${j.version}] ${j.content}`, '10', '0', '20', '-500')
        })
        dxfLines.push('0', 'ENDSEC')
      }
      blob = new Blob([dxfLines.join('\n')], { type: mimeType })
    } else {
      mimeType = 'application/pdf'
      const pdfContent: string[] = []
      pdfContent.push('%PDF-1.4')
      const objects: string[] = []
      objects.push('<< /Type /Catalog /Pages 2 0 R >>')
      objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
      const buildText = () => {
        const lines: string[] = []
        lines.push(`BT /F1 18 Tf 72 760 Td (${report.projectName.replace(/[^\x20-\x7E]/g, '?')}) Tj ET`)
        lines.push(`BT /F1 11 Tf 72 735 Td (Export Mode: ${mode?.name || 'Standard'} | Date: ${new Date().toLocaleDateString()}) Tj ET`)
        let y = 700
        lines.push(`BT /F1 14 Tf 72 ${y} Td (== Layers ==) Tj ET`)
        y -= 20
        layers.forEach((l) => {
          lines.push(`BT /F1 10 Tf 72 ${y} Td (  [${l.id}] ${l.name.replace(/[^\x20-\x7E]/g, '?')} - ${l.objects.length} objects) Tj ET`)
          y -= 15
        })
        y -= 5
        lines.push(`BT /F1 14 Tf 72 ${y} Td (== Judgments ==) Tj ET`)
        y -= 20
        judgments.slice().reverse().forEach((j) => {
          const safe = j.content.replace(/[^\x20-\x7E]/g, '?')
          const status = j.isWithdrawn ? '[WITHDRAWN]' : j.isManualOverride ? '[MANUAL]' : '[OK]'
          lines.push(`BT /F1 10 Tf 72 ${y} Td (  ${j.version} ${status}: ${safe.substring(0, 80)}) Tj ET`)
          y -= 15
        })
        if (params.withAnnotation) {
          y -= 5
          lines.push(`BT /F1 14 Tf 72 ${y} Td (== Overlaps ==) Tj ET`)
          y -= 20
          overlaps.forEach((o) => {
            lines.push(`BT /F1 10 Tf 72 ${y} Td (  [${o.status.toUpperCase()}] ${o.objectA} <-> ${o.objectB} (${o.severity})) Tj ET`)
            y -= 15
          })
        }
        if (params.withWithdrawal) {
          y -= 5
          lines.push(`BT /F1 14 Tf 72 ${y} Td (== Withdrawals ==) Tj ET`)
          y -= 20
          state.withdrawals.forEach((w) => {
            lines.push(`BT /F1 10 Tf 72 ${y} Td (  ${w.withdrawnAt} by ${w.withdrawnBy}: ${w.reason.substring(0, 70).replace(/[^\x20-\x7E]/g, '?')}) Tj ET`)
            y -= 15
          })
        }
        return lines.join('\n')
      }
      const streamContent = buildText()
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`)
      objects.push(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`)
      objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
      let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n'
      let offset = pdfContent.join('\n').length + 1
      const offsets: number[] = []
      objects.forEach((obj, i) => {
        offsets.push(offset)
        xref += offset.toString().padStart(10, '0') + ' 00000 n \n'
        offset += (i + 1).toString().length + ' 0 obj\n'.length + obj.length + '\nendobj\n'.length
      })
      objects.forEach((obj, i) => {
        pdfContent.push(`${i + 1} 0 obj`, obj, 'endobj')
      })
      pdfContent.push(xref)
      const startXref = pdfContent.join('\n').length + 1
      pdfContent.push('trailer', `<< /Size ${objects.length + 1} /Root 1 0 R >>`, 'startxref', startXref.toString(), '%%EOF')
      blob = new Blob([pdfContent.join('\n')], { type: mimeType })
    }

    await new Promise((r) => setTimeout(r, 800))

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 2000)

    const sizeBytes = blob.size
    const sizeStr = sizeBytes < 1024 ? `${sizeBytes} B` : sizeBytes < 1024 * 1024 ? `${(sizeBytes / 1024).toFixed(1)} KB` : `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`
    set({ isExporting: false })
    console.log(`[Export] ${fileName} (${sizeStr}, ${format}) downloaded via browser`)
    return { fileName, size: sizeStr, bytes: sizeBytes }
  },

  uploadSupplementMaterial: async (file: File) => {
    set({ uploadPending: true })
    await new Promise((r) => setTimeout(r, 1500))
    const newMaterial: PendingMaterial = {
      id: `pm-${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      description: `已上传补充材料：${file.name}（${(file.size / 1024 / 1024).toFixed(2)} MB），等待处理确认`,
      expectedDate: new Date(Date.now() + 86400000).toLocaleDateString('zh-CN').replace(/\//g, '-'),
      contact: '方案经理 · 小赵',
    }
    set((state) => ({
      uploadPending: false,
      report: {
        ...state.report,
        pendingMaterials: [...state.report.pendingMaterials, newMaterial],
      },
    }))
    return newMaterial
  },

  addPendingMaterial: (material) =>
    set((state) => ({
      report: {
        ...state.report,
        pendingMaterials: [...state.report.pendingMaterials, material],
      },
    })),

  setLocatedObject: (id) => set({ locatedObjectId: id }),
}))
