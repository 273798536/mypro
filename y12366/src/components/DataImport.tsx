import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, Image, CheckCircle, RotateCcw, Database, AlertTriangle, Info } from 'lucide-react'
import { parseAccelerationCSV, parseDisplacementCSV, type ParseResult } from '@/utils/csvParser'
import { useSeismicStore } from '@/store/useSeismicStore'
import type { AccelerationRecord, DisplacementRecord, DamagePhoto } from '@/types'
import { format } from 'date-fns'

interface DropZoneConfig {
  key: 'acceleration' | 'displacement' | 'photos'
  icon: React.ReactNode
  label: string
  hint: string
  accept: string
  unit: string
}

const dropZones: DropZoneConfig[] = [
  {
    key: 'acceleration',
    icon: <FileText className="h-6 w-6" />,
    label: '加速度 CSV',
    hint: '列名: timestamp, value, saturated',
    accept: '.csv',
    unit: '点',
  },
  {
    key: 'displacement',
    icon: <Upload className="h-6 w-6" />,
    label: '位移 CSV',
    hint: '列名: timestamp, value',
    accept: '.csv',
    unit: '点',
  },
  {
    key: 'photos',
    icon: <Image className="h-6 w-6" />,
    label: '损伤照片',
    hint: 'JPG / PNG 图片文件',
    accept: 'image/*',
    unit: '张',
  },
]

interface ImportStatus {
  count: number
  warnings: string[]
  errors: string[]
  fileName: string
}

export default function DataImport() {
  const {
    accelerationData,
    displacementData,
    damagePhotos,
    setAccelerationData,
    setDisplacementData,
    setDamagePhotos,
    loadSampleData,
    resetAll,
  } = useSeismicStore()

  const [dragOverKey, setDragOverKey] = useState<DropZoneConfig['key'] | null>(null)
  const [importStatus, setImportStatus] = useState<Record<DropZoneConfig['key'], ImportStatus | null>>({
    acceleration: null,
    displacement: null,
    photos: null,
  })
  const fileInputRefs = useRef<Record<DropZoneConfig['key'], HTMLInputElement | null>>({
    acceleration: null,
    displacement: null,
    photos: null,
  })

  const loadedState = {
    acceleration: accelerationData.length > 0,
    displacement: displacementData.length > 0,
    photos: damagePhotos.length > 0,
  }

  const allLoaded = loadedState.acceleration && loadedState.displacement && loadedState.photos

  const hasAnyError = Object.values(importStatus).some(
    (s) => s && s.errors.length > 0
  )
  const hasAnyWarning = Object.values(importStatus).some(
    (s) => s && s.warnings.length > 0
  )

  const tryRunAlignment = useCallback(() => {
    const state = useSeismicStore.getState()
    if (
      state.accelerationData.length > 0 &&
      state.displacementData.length > 0 &&
      state.damagePhotos.length > 0
    ) {
      state.runAlignment()
    }
  }, [])

  const handleParseResult = <T,>(
    key: DropZoneConfig['key'],
    result: ParseResult<T>,
    fileName: string,
    setter: (data: T[]) => void,
    unit: string
  ) => {
    const status: ImportStatus = {
      count: result.data.length,
      warnings: result.warnings,
      errors: result.errors,
      fileName,
    }

    setImportStatus((prev) => ({ ...prev, [key]: status }))

    if (result.success && result.data.length > 0) {
      setter(result.data as T[])
      tryRunAlignment()
    }
  }

  const handleAccelerationDrop = useCallback(async (file: File) => {
    try {
      const result = await parseAccelerationCSV(file)
      handleParseResult('acceleration', result, file.name, setAccelerationData, '点')
    } catch (e) {
      const status: ImportStatus = {
        count: 0,
        warnings: [],
        errors: [`加速度 CSV 解析失败: ${e instanceof Error ? e.message : String(e)}`],
        fileName: file.name,
      }
      setImportStatus((prev) => ({ ...prev, acceleration: status }))
    }
  }, [setAccelerationData, tryRunAlignment])

  const handleDisplacementDrop = useCallback(async (file: File) => {
    try {
      const result = await parseDisplacementCSV(file)
      handleParseResult('displacement', result, file.name, setDisplacementData, '点')
    } catch (e) {
      const status: ImportStatus = {
        count: 0,
        warnings: [],
        errors: [`位移 CSV 解析失败: ${e instanceof Error ? e.message : String(e)}`],
        fileName: file.name,
      }
      setImportStatus((prev) => ({ ...prev, displacement: status }))
    }
  }, [setDisplacementData, tryRunAlignment])

  const handlePhotosDrop = useCallback((files: FileList) => {
    try {
      const photos: DamagePhoto[] = Array.from(files).map((file, i) => ({
        id: `photo-import-${i}`,
        timestamp: null,
        imageUrl: URL.createObjectURL(file),
        stage: file.name.replace(/\.[^/.]+$/, ''),
        missingPhase: false,
      }))

      setDamagePhotos(photos)
      tryRunAlignment()

      const status: ImportStatus = {
        count: photos.length,
        warnings: [],
        errors: [],
        fileName: `${files.length} 张照片`,
      }
      setImportStatus((prev) => ({ ...prev, photos: status }))
    } catch (e) {
      const status: ImportStatus = {
        count: 0,
        warnings: [],
        errors: [`照片导入失败: ${e instanceof Error ? e.message : String(e)}`],
        fileName: '导入失败',
      }
      setImportStatus((prev) => ({ ...prev, photos: status }))
    }
  }, [setDamagePhotos, tryRunAlignment])

  const handleDrop = useCallback((key: DropZoneConfig['key'], e: React.DragEvent) => {
    e.preventDefault()
    setDragOverKey(null)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    if (key === 'acceleration') {
      handleAccelerationDrop(files[0])
    } else if (key === 'displacement') {
      handleDisplacementDrop(files[0])
    } else if (key === 'photos') {
      handlePhotosDrop(files)
    }
  }, [handleAccelerationDrop, handleDisplacementDrop, handlePhotosDrop])

  const handleDragOver = useCallback((key: DropZoneConfig['key'], e: React.DragEvent) => {
    e.preventDefault()
    setDragOverKey(key)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverKey(null)
  }, [])

  const handleFileSelect = useCallback((key: DropZoneConfig['key'], e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (key === 'acceleration') {
      handleAccelerationDrop(files[0])
    } else if (key === 'displacement') {
      handleDisplacementDrop(files[0])
    } else if (key === 'photos') {
      handlePhotosDrop(files)
    }
  }, [handleAccelerationDrop, handleDisplacementDrop, handlePhotosDrop])

  const handleClick = useCallback((key: DropZoneConfig['key']) => {
    fileInputRefs.current[key]?.click()
  }, [])

  const handleLoadSample = useCallback(() => {
    loadSampleData()
    const sampleTime = format(new Date(), 'HH:mm:ss')
    setImportStatus({
      acceleration: { count: 500, warnings: [], errors: [], fileName: 'sample_accel.csv' },
      displacement: { count: 500, warnings: [], errors: [], fileName: 'sample_disp.csv' },
      photos: { count: 7, warnings: [], errors: [], fileName: '7 张样本照片' },
    })
    console.log(`[${sampleTime}] 已加载示例数据：加速度500点，位移500点，照片7张`)
  }, [loadSampleData])

  const handleReset = useCallback(() => {
    resetAll()
    setImportStatus({ acceleration: null, displacement: null, photos: null })
  }, [resetAll])

  return (
    <div className="rounded-lg border border-steel-800 bg-steel-900 p-6 w-full max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-sans text-lg font-semibold text-white">数据导入</h2>
          <p className="mt-0.5 font-sans text-xs text-steel-500">
            支持拖拽或点击上传。加速度/位移 CSV 常用列名：timestamp、time、时间 / value、acceleration、加速度
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 rounded bg-steel-700 px-3 py-1.5 font-sans text-sm text-white transition-colors hover:bg-steel-600"
          >
            <Database className="h-4 w-4" />
            加载示例数据
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded bg-steel-700 px-3 py-1.5 font-sans text-sm text-warn transition-colors hover:bg-steel-600"
          >
            <RotateCcw className="h-4 w-4" />
            重置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {dropZones.map((zone) => {
          const isLoaded = loadedState[zone.key]
          const isDragOver = dragOverKey === zone.key
          const status = importStatus[zone.key]
          const hasError = status && status.errors.length > 0
          const hasWarning = status && status.warnings.length > 0

          return (
            <div
              key={zone.key}
              onDrop={(e) => handleDrop(zone.key, e)}
              onDragOver={(e) => handleDragOver(zone.key, e)}
              onDragLeave={handleDragLeave}
              onClick={() => handleClick(zone.key)}
              className={`
                relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors
                ${isDragOver
                  ? 'border-signal bg-steel-700/50'
                  : hasError
                    ? 'border-saturated bg-saturated/10'
                    : isLoaded
                      ? 'border-signal/40 bg-steel-800/50'
                      : 'border-steel-700 bg-steel-800 hover:border-steel-600'
                }
              `}
            >
              <input
                ref={(el) => { fileInputRefs.current[zone.key] = el }}
                type="file"
                accept={zone.accept}
                multiple={zone.key === 'photos'}
                onChange={(e) => handleFileSelect(zone.key, e)}
                className="hidden"
              />

              {isLoaded && !hasError && (
                <CheckCircle className="absolute right-2 top-2 h-5 w-5 text-signal" />
              )}
              {hasError && (
                <AlertTriangle className="absolute right-2 top-2 h-5 w-5 text-saturated" />
              )}
              {hasWarning && !hasError && (
                <AlertTriangle className="absolute right-2 top-2 h-5 w-5 text-warn" />
              )}

              <div className={`mb-2 ${isLoaded && !hasError ? 'text-signal' : hasError ? 'text-saturated' : 'text-steel-500'}`}>
                {zone.icon}
              </div>

              <span className="font-sans text-sm font-medium text-white">
                {zone.label}
              </span>

              <span className="mt-1 font-mono text-[10px] text-steel-500">
                {zone.hint}
              </span>

              {status && (
                <div className="mt-2 w-full space-y-0.5 text-center">
                  <span className={`block font-mono text-xs ${hasError ? 'text-saturated' : isLoaded ? 'text-signal' : 'text-steel-400'}`}>
                    {status.fileName}
                  </span>
                  <span className={`block font-mono text-[10px] ${hasError ? 'text-saturated' : 'text-steel-500'}`}>
                    {hasError ? '导入失败' : `${status.count} ${zone.unit}`}
                  </span>
                  {hasWarning && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-warn">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{status.warnings.length} 条警告</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasAnyError && (
        <div className="mt-4 space-y-1">
          {Object.entries(importStatus).map(([key, status]) =>
            status?.errors.map((error, idx) => (
              <div key={`${key}-err-${idx}`} className="flex items-start gap-2 rounded bg-saturated/10 px-3 py-2 font-sans text-sm text-saturated">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ))
          )}
        </div>
      )}

      {hasAnyWarning && !hasAnyError && (
        <div className="mt-4 space-y-1">
          {Object.entries(importStatus).map(([key, status]) =>
            status?.warnings.map((warning, idx) => (
              <div key={`${key}-warn-${idx}`} className="flex items-start gap-2 rounded bg-warn/10 px-3 py-2 font-sans text-sm text-warn">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))
          )}
        </div>
      )}

      {allLoaded && (
        <div className="mt-3 flex items-center gap-2 font-sans text-sm text-signal">
          <CheckCircle className="h-4 w-4" />
          <span>
            全部数据已加载 — 加速度 {accelerationData.length} 点 / 位移 {displacementData.length} 点 / 照片 {damagePhotos.length} 张
          </span>
        </div>
      )}
    </div>
  )
}
