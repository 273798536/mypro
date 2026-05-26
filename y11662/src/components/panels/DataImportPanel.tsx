import { useRef, useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle, Database } from 'lucide-react'
import { useBondStore } from '../../stores/bondStore'
import { validateCashFlows, getAnomalyTypeLabel } from '../../utils/dataValidator'

export function DataImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationResult, setValidationResult] = useState<{
    totalRecords: number
    anomalyCount: number
    valid: boolean
  } | null>(null)

  const holdings = useBondStore((state) => state.holdings)
  const cashFlows = useBondStore((state) => state.cashFlows)
  const dataSource = useBondStore((state) => state.dataSource)
  const isLoaded = useBondStore((state) => state.isLoaded)
  const setHoldings = useBondStore((state) => state.setHoldings)
  const setCashFlows = useBondStore((state) => state.setCashFlows)
  const setDataSource = useBondStore((state) => state.setDataSource)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)
  }

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return

    setUploadStatus('uploading')
    setUploadMessage('正在解析数据文件...')

    try {
      let totalRecords = 0
      let anomalyCount = 0

      for (const file of files) {
        const content = await file.text()
        const lines = content.split('\n').filter((l) => l.trim() !== '')

        if (lines.length < 2) continue

        const headers = lines[0].split(',').map((h) => h.trim())
        const rows = lines.slice(1)

        if (headers.includes('债券代码') && headers.includes('持仓金额')) {
          const parsedHoldings = rows.map((line, idx) => {
            const cells = line.split(',').map((c) => c.trim())
            const getValue = (key: string) => {
              const idx = headers.indexOf(key)
              return idx >= 0 ? cells[idx] : ''
            }
            return {
              bondCode: getValue('债券代码'),
              bondName: getValue('债券名称'),
              holdingAmount: parseFloat(getValue('持仓金额')) || 0,
              rating: getValue('评级'),
              duration: parseFloat(getValue('久期')) || 0,
              yieldRate: parseFloat(getValue('收益率')) || 0,
              issueDate: getValue('发行日期'),
              maturityDate: getValue('到期日期'),
              source: file.name,
              sourceLine: idx + 2,
            }
          })

          setHoldings(parsedHoldings)
          totalRecords += parsedHoldings.length
        } else if (headers.includes('债券代码') && headers.includes('现金流日期')) {
          const parsedFlows = rows.map((line, idx) => {
            const cells = line.split(',').map((c) => c.trim())
            const getValue = (key: string) => {
              const idx = headers.indexOf(key)
              return idx >= 0 ? cells[idx] : ''
            }
            return {
              id: `cf-${file.name}-${idx}`,
              bondCode: getValue('债券代码'),
              flowDate: getValue('现金流日期'),
              amount: parseFloat(getValue('现金流金额')) || 0,
              flowType: getValue('现金流类型') as 'coupon' | 'principal' | 'call' | 'put' || 'coupon',
              scenarioId: getValue('情景ID') || 'scenario-base',
              source: file.name,
              sourceLine: idx + 2,
            }
          })

          const currentFlows = useBondStore.getState().cashFlows
          setCashFlows([...currentFlows, ...parsedFlows])
          totalRecords += parsedFlows.length
        }
      }

      const currentHoldings = useBondStore.getState().holdings
      const currentFlows = useBondStore.getState().cashFlows
      const validation = validateCashFlows(currentFlows, currentHoldings)

      anomalyCount = validation.anomalies.length
      setValidationResult({
        totalRecords: validation.totalRecords,
        anomalyCount,
        valid: validation.valid,
      })

      setDataSource(files.map((f) => f.name).join(', '))
      setUploadStatus('success')
      setUploadMessage(
        `成功导入 ${totalRecords} 条记录，检测到 ${anomalyCount} 条异常`
      )
    } catch (error) {
      setUploadStatus('error')
      setUploadMessage(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#21262d]">
        <h2 className="text-sm font-semibold text-[#c9d1d9] flex items-center gap-2">
          <Database size={16} className="text-[#58a6ff]" />
          数据导入
        </h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 cursor-pointer
            transition-all duration-200 text-center
            ${isDragging
              ? 'border-[#00d4aa] bg-[#00d4aa]/10'
              : 'border-[#30363d] hover:border-[#58a6ff] hover:bg-[#58a6ff]/5'
            }
          `}
        >
          <Upload
            size={32}
            className={`mx-auto mb-3 ${isDragging ? 'text-[#00d4aa]' : 'text-[#6e7681]'}`}
          />
          <p className="text-sm text-[#8b949e]">
            拖拽CSV文件到此处或点击上传
          </p>
          <p className="text-xs text-[#6e7681] mt-1">
            支持: 债券持仓、现金流、利率情景
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {uploadStatus !== 'idle' && (
          <div className={`mt-3 p-3 rounded-lg text-xs ${
            uploadStatus === 'success'
              ? 'bg-[#00d4aa]/10 border border-[#00d4aa]/30'
              : uploadStatus === 'error'
              ? 'bg-[#f85149]/10 border border-[#f85149]/30'
              : 'bg-[#58a6ff]/10 border border-[#58a6ff]/30'
          }`}>
            <div className="flex items-center gap-2">
              {uploadStatus === 'success' && <CheckCircle size={14} className="text-[#00d4aa]" />}
              {uploadStatus === 'error' && <AlertTriangle size={14} className="text-[#f85149]" />}
              {uploadStatus === 'uploading' && <FileText size={14} className="text-[#58a6ff] animate-pulse" />}
              <span className={
                uploadStatus === 'success' ? 'text-[#00d4aa]' :
                uploadStatus === 'error' ? 'text-[#f85149]' :
                'text-[#58a6ff]'
              }>
                {uploadMessage}
              </span>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-xs font-medium text-[#8b949e] mb-2 flex items-center gap-1.5">
            <Database size={12} />
            数据概况
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#6e7681]">数据来源</span>
              <span className="text-[#c9d1d9] font-mono">{dataSource || '未加载'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6e7681]">债券数量</span>
              <span className="text-[#c9d1d9] font-mono">{holdings.length} 只</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6e7681]">现金流记录</span>
              <span className="text-[#c9d1d9] font-mono">{cashFlows.length} 条</span>
            </div>
            {validationResult && (
              <div className="flex justify-between text-xs">
                <span className="text-[#6e7681]">异常记录</span>
                <span className={validationResult.anomalyCount > 0 ? 'text-[#f85149]' : 'text-[#00d4aa]'}>
                  {validationResult.anomalyCount} 条
                </span>
              </div>
            )}
          </div>
        </div>

        {isLoaded && holdings.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium text-[#8b949e] mb-2">债券持仓预览</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6e7681]">
                    <th className="text-left py-1 px-1 font-normal">代码</th>
                    <th className="text-left py-1 px-1 font-normal">名称</th>
                    <th className="text-left py-1 px-1 font-normal">评级</th>
                    <th className="text-right py-1 px-1 font-normal">持仓(万)</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.slice(0, 10).map((bond, idx) => (
                    <tr
                      key={bond.bondCode}
                      className={idx % 2 === 0 ? 'bg-[#161b22]/50' : 'bg-transparent'}
                    >
                      <td className="py-1 px-1 font-mono text-[#58a6ff]">{bond.bondCode}</td>
                      <td className="py-1 px-1 text-[#c9d1d9] truncate max-w-[80px]">{bond.bondName}</td>
                      <td className="py-1 px-1 text-[#c9d1d9]">{bond.rating}</td>
                      <td className="py-1 px-1 text-right text-[#c9d1d9] font-mono">
                        {(bond.holdingAmount / 10000).toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}