import { Upload, FileText, Scissors, FileSpreadsheet } from 'lucide-react'
import type { InputFile, InputType } from '@/types'

interface InputPanelProps {
  inputFiles: InputFile[]
}

const typeConfig: Record<InputType, { label: string; icon: React.ReactNode; color: string; borderColor: string; bgColor: string }> = {
  model: {
    label: '牙模模型',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-upper',
    borderColor: 'border-upper/30',
    bgColor: 'bg-upper/10',
  },
  grinding: {
    label: '磨改建议',
    icon: <Scissors className="w-4 h-4" />,
    color: 'text-misaligned',
    borderColor: 'border-misaligned/30',
    bgColor: 'bg-misaligned/10',
  },
  report: {
    label: '接触报告',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    color: 'text-lower',
    borderColor: 'border-lower/30',
    bgColor: 'bg-lower/10',
  },
}

export default function InputPanel({ inputFiles }: InputPanelProps) {
  const grouped = inputFiles.reduce<Record<InputType, InputFile[]>>((acc, file) => {
    if (!acc[file.type]) acc[file.type] = []
    acc[file.type].push(file)
    return acc
  }, {} as Record<InputType, InputFile[]>)

  return (
    <div className="w-[250px] shrink-0 bg-bg-surface/80 backdrop-blur-sm border-r border-mono-dim/20 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-mono-dim/20">
        <h2 className="text-sm font-semibold text-mono tracking-wide">输入数据</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {(Object.keys(typeConfig) as InputType[]).map((type) => {
          const config = typeConfig[type]
          const files = grouped[type] || []

          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={config.color}>{config.icon}</span>
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                <span className="text-xs text-mono-dim ml-auto">{files.length}</span>
              </div>

              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.borderColor} ${config.bgColor} text-xs`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{
                    backgroundColor: file.loaded ? '#4ECDC4' : '#FF3B3B',
                  }} />
                  <span className="text-mono truncate flex-1">{file.name}</span>
                  {file.hasConflict && (
                    <span className="text-overlap text-[10px] font-semibold shrink-0">冲突</span>
                  )}
                </div>
              ))}

              <button className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed ${config.borderColor} ${config.color} text-xs hover:${config.bgColor} transition-colors`}>
                <Upload className="w-3 h-3" />
                <span>导入{config.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-mono-dim/20">
        <p className="text-[10px] text-mono-dim leading-relaxed">
          仅支持导入牙模模型、磨改建议、接触报告三类数据。材料数据冲突时，系统同时展示各方数据，不自动修改。
        </p>
      </div>
    </div>
  )
}
