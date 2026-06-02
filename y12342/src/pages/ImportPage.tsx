import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import {
  Upload,
  FileSpreadsheet,
  Gauge,
  Video,
  Trash2,
  Play,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { detectCollisions } from '@/utils/calculationEngine'
import type { SpeedRecord, MassTable } from '@/types'
import { sampleSpeedRecords, sampleMassTable, sampleCollisions } from '@/data/sampleData'

export default function ImportPage() {
  const navigate = useNavigate()
  const {
    speedRecords,
    massTable,
    importedFiles,
    videoNotes,
    setSpeedRecords,
    setMassTable,
    setCollisions,
    addImportedFile,
    setVideoNotes,
    clearSpeedRecords,
    clearMassTable,
  } = useAppStore()

  const [isDraggingSpeed, setIsDraggingSpeed] = useState(false)
  const [isDraggingMass, setIsDraggingMass] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseSpeedFile = useCallback(
    (file: File) => {
      setError(null)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const records: SpeedRecord[] = results.data
              .filter((row: any) => row.ballId && row.timestamp)
              .map((row: any, index: number) => ({
                id: `speed_${index}_${Date.now()}`,
                sourceFile: file.name,
                ballId: Number(row.ballId),
                timestamp: Number(row.timestamp),
                velocityX: Number(row.velocityX || row.vx || 0),
                velocityY: Number(row.velocityY || row.vy || 0),
                remarks: row.remarks || '',
              }))

            if (records.length === 0) {
              setError('速度记录文件格式不正确，请确保包含 ballId 和 timestamp 列')
              return
            }

            setSpeedRecords(records, file.name)
            addImportedFile({
              id: `file_${Date.now()}`,
              name: file.name,
              type: 'speed',
              size: file.size,
              uploadedAt: new Date(),
              recordCount: records.length,
            })
          } catch {
            setError('解析速度记录文件时出错')
          }
        },
        error: () => {
          setError('读取速度记录文件失败')
        },
      })
    },
    [setSpeedRecords, addImportedFile]
  )

  const parseMassFile = useCallback(
    (file: File) => {
      setError(null)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const table: MassTable[] = results.data
              .filter((row: any) => row.ballId)
              .map((row: any, index: number) => ({
                id: `mass_${index}_${Date.now()}`,
                sourceFile: file.name,
                ballId: Number(row.ballId),
                mass: Number(row.mass),
                remarks: row.remarks || '',
              }))

            if (table.length === 0) {
              setError('质量表文件格式不正确，请确保包含 ballId 和 mass 列')
              return
            }

            setMassTable(table, file.name)
            addImportedFile({
              id: `file_${Date.now()}`,
              name: file.name,
              type: 'mass',
              size: file.size,
              uploadedAt: new Date(),
              recordCount: table.length,
            })
          } catch {
            setError('解析质量表文件时出错')
          }
        },
        error: () => {
          setError('读取质量表文件失败')
        },
      })
    },
    [setMassTable, addImportedFile]
  )

  const handleSpeedFile = (files: FileList | null) => {
    if (files && files[0]) {
      parseSpeedFile(files[0])
    }
  }

  const handleMassFile = (files: FileList | null) => {
    if (files && files[0]) {
      parseMassFile(files[0])
    }
  }

  const loadSampleData = () => {
    const sampleVideoNotes = '实验视频备注：\n1. 0:00.210 - 小球1与小球2发生斜碰，碰撞角度约15度，小球2略有偏移\n2. 0:00.610 - 小球1与小球3发生对心碰撞，小球3质量较大\n3. 0:00.850 - 小球2与小球4发生边缘碰撞，角度较大'
    setVideoNotes(sampleVideoNotes)
    setSpeedRecords(sampleSpeedRecords, '示例速度记录.csv')
    setMassTable(sampleMassTable, '示例质量表.xlsx')
    setCollisions(sampleCollisions.map((c, index) => ({
      ...c,
      videoNotes: index === 0 
        ? '碰撞角度约15度，小球2略有偏移' 
        : index === 1 
          ? '对心碰撞，小球3质量较大' 
          : '边缘碰撞，角度较大'
    })))
    addImportedFile({
      id: `sample_speed_${Date.now()}`,
      name: '示例速度记录.csv',
      type: 'speed',
      size: 1024,
      uploadedAt: new Date(),
      recordCount: sampleSpeedRecords.length,
    })
    addImportedFile({
      id: `sample_mass_${Date.now()}`,
      name: '示例质量表.xlsx',
      type: 'mass',
      size: 512,
      uploadedAt: new Date(),
      recordCount: sampleMassTable.length,
    })
  }

  const processData = () => {
    if (speedRecords.length === 0 || massTable.length === 0) {
      setError('请先导入速度记录和质量表')
      return
    }

    setIsProcessing(true)
    setError(null)

    setTimeout(() => {
      try {
        const speedSource = importedFiles.find((f) => f.type === 'speed')?.name || ''
        const massSource = importedFiles.find((f) => f.type === 'mass')?.name || ''
        const collisions = detectCollisions(
          speedRecords,
          massTable,
          speedSource,
          massSource,
          videoNotes
        )
        setCollisions(collisions)
        setIsProcessing(false)
        navigate('/analysis')
      } catch {
        setError('处理数据时出错')
        setIsProcessing(false)
      }
    }, 500)
  }

  const canProcess = speedRecords.length > 0 && massTable.length > 0

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">数据导入</h2>
        <p className="mt-2 text-slate-600">
          导入速度记录和质量表，系统将自动分析碰撞事件并检测异常
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div
          className={`file-drop-zone rounded-xl p-8 bg-white ${
            isDraggingSpeed ? 'dragover' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingSpeed(true)
          }}
          onDragLeave={() => setIsDraggingSpeed(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDraggingSpeed(false)
            handleSpeedFile(e.dataTransfer.files)
          }}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-full flex items-center justify-center">
              <Gauge className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">速度记录</h3>
            <p className="mt-1 text-sm text-slate-500">
              支持 CSV 格式，需包含 ballId, timestamp, velocityX, velocityY 列
            </p>
            <label className="mt-4 inline-block">
              <span className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                选择文件
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleSpeedFile(e.target.files)}
              />
            </label>
            {speedRecords.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-800">
                      {importedFiles.find((f) => f.type === 'speed')?.name}
                    </p>
                    <p className="text-xs text-green-600">{speedRecords.length} 条记录</p>
                  </div>
                </div>
                <button
                  onClick={clearSpeedRecords}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className={`file-drop-zone rounded-xl p-8 bg-white ${
            isDraggingMass ? 'dragover' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingMass(true)
          }}
          onDragLeave={() => setIsDraggingMass(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDraggingMass(false)
            handleMassFile(e.dataTransfer.files)
          }}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">质量表</h3>
            <p className="mt-1 text-sm text-slate-500">
              支持 CSV 格式，需包含 ballId, mass 列
            </p>
            <label className="mt-4 inline-block">
              <span className="px-4 py-2 bg-amber-500 text-white rounded-lg cursor-pointer hover:bg-amber-600 transition-colors inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                选择文件
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleMassFile(e.target.files)}
              />
            </label>
            {massTable.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-800">
                      {importedFiles.find((f) => f.type === 'mass')?.name}
                    </p>
                    <p className="text-xs text-green-600">{massTable.length} 条记录</p>
                  </div>
                </div>
                <button
                  onClick={clearMassTable}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <Video className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800">视频备注</h3>
        </div>
        <textarea
          value={videoNotes}
          onChange={(e) => setVideoNotes(e.target.value)}
          placeholder="输入实验视频的观察备注，例如：碰撞角度、小球编号对应关系、特殊现象等..."
          className="w-full h-24 px-4 py-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800">快速体验</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          没有准备好数据？点击下方按钮加载示例数据，体验完整的分析功能
        </p>
        <button
          onClick={loadSampleData}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors inline-flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          加载示例数据
        </button>
      </div>

      <div className="flex justify-center">
        <button
          onClick={processData}
          disabled={!canProcess || isProcessing}
          className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center gap-2 ${
            canProcess && !isProcessing
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/30'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              开始分析
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-3">CSV 文件格式说明</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-medium text-blue-700 mb-2">速度记录格式：</p>
            <pre className="bg-white p-3 rounded border border-blue-200 text-xs font-mono overflow-x-auto">
{`ballId,timestamp,velocityX,velocityY,remarks
1,0.0,2.0,0.0,初始
1,0.1,2.0,0.0,
2,0.0,0.0,0.0,静止`}
            </pre>
          </div>
          <div>
            <p className="font-medium text-blue-700 mb-2">质量表格式：</p>
            <pre className="bg-white p-3 rounded border border-blue-200 text-xs font-mono overflow-x-auto">
{`ballId,mass,remarks
1,0.5,钢球
2,0.5,钢球
3,1.0,大钢球`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
