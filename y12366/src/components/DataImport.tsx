import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, Image, CheckCircle, RotateCcw, Database } from 'lucide-react'
import { parseAccelerationCSV, parseDisplacementCSV } from '@/utils/csvParser'
import { useSeismicStore } from '@/store/useSeismicStore'
import type { AccelerationRecord, DisplacementRecord, DamagePhoto } from '@/types'

interface DropZoneConfig {
  key: 'acceleration' | 'displacement' | 'photos'
  icon: React.ReactNode
  label: string
  hint: string
  accept: string
}

const dropZones: DropZoneConfig[] = [
  {
    key: 'acceleration',
    icon: <FileText className="h-6 w-6" />,
    label: '加速度 CSV',
    hint: 'timestamp, value, saturated',
    accept: '.csv',
  },
  {
    key: 'displacement',
    icon: <Upload className="h-6 w-6" />,
    label: '位移 CSV',
    hint: 'timestamp, value',
    accept: '.csv',
  },
  {
    key: 'photos',
    icon: <Image className="h-6 w-6" />,
    label: '损伤照片',
    hint: 'JPG / PNG 图片文件',
    accept: 'image/*',
  },
]

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
  const [fileNames, setFileNames] = useState<Record<DropZoneConfig['key'], string | null>>({
    acceleration: null,
    displacement: null,
    photos: null,
  })
  const [parseError, setParseError] = useState<string | null>(null)
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

  const handleAccelerationDrop = useCallback(async (file: File) => {
    try {
      setParseError(null)
      const data: AccelerationRecord[] = await parseAccelerationCSV(file)
      setAccelerationData(data)
      setFileNames(prev => ({ ...prev, acceleration: file.name }))
      tryRunAlignment()
    } catch (e) {
      setParseError(`加速度 CSV 解析失败: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [setAccelerationData, tryRunAlignment])

  const handleDisplacementDrop = useCallback(async (file: File) => {
    try {
      setParseError(null)
      const data: DisplacementRecord[] = await parseDisplacementCSV(file)
      setDisplacementData(data)
      setFileNames(prev => ({ ...prev, displacement: file.name }))
      tryRunAlignment()
    } catch (e) {
      setParseError(`位移 CSV 解析失败: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [setDisplacementData, tryRunAlignment])

  const handlePhotosDrop = useCallback((files: FileList) => {
    try {
      setParseError(null)
      const photos: DamagePhoto[] = Array.from(files).map((file, i) => ({
        id: `photo-import-${i}`,
        timestamp: null,
        imageUrl: URL.createObjectURL(file),
        stage: file.name.replace(/\.[^/.]+$/, ''),
        missingPhase: false,
      }))
      setDamagePhotos(photos)
      setFileNames(prev => ({ ...prev, photos: `${files.length} 张照片` }))
      tryRunAlignment()
    } catch (e) {
      setParseError(`照片导入失败: ${e instanceof Error ? e.message : String(e)}`)
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
    setFileNames({
      acceleration: 'sample_accel.csv',
      displacement: 'sample_disp.csv',
      photos: '7 张样本照片',
    })
  }, [loadSampleData])

  const handleReset = useCallback(() => {
    resetAll()
    setFileNames({ acceleration: null, displacement: null, photos: null })
    setParseError(null)
  }, [resetAll])

  return (
    <div className="rounded-lg border border-steel-800 bg-steel-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold text-white">数据导入</h2>
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
          const fileName = fileNames[zone.key]

          return (
            <div
              key={zone.key}
              onDrop={(e) => handleDrop(zone.key, e)}
              onDragOver={(e) => handleDragOver(zone.key, e)}
              onDragLeave={handleDragLeave}
              onClick={() => handleClick(zone.key)}
              className={`
                relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors
                ${isDragOver
                  ? 'border-signal bg-steel-700/50'
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

              {isLoaded && (
                <CheckCircle className="absolute right-2 top-2 h-5 w-5 text-signal" />
              )}

              <div className={`mb-2 ${isLoaded ? 'text-signal' : 'text-steel-500'}`}>
                {zone.icon}
              </div>

              <span className="font-sans text-sm font-medium text-white">
                {zone.label}
              </span>

              <span className="mt-1 font-mono text-xs text-steel-500">
                {zone.hint}
              </span>

              {fileName && (
                <span className="mt-2 max-w-full truncate font-mono text-xs text-signal">
                  {fileName}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {parseError && (
        <div className="mt-3 rounded bg-saturated/10 px-3 py-2 font-sans text-sm text-saturated">
          {parseError}
        </div>
      )}

      {allLoaded && (
        <div className="mt-3 flex items-center gap-2 font-sans text-sm text-signal">
          <CheckCircle className="h-4 w-4" />
          全部数据已加载，对齐完成
        </div>
      )}
    </div>
  )
}
