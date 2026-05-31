import { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'

const COLUMN_MAPS: Record<string, Record<string, string>> = {
  orders: {
    '订单id': 'orderId',
    'orderid': 'orderId',
    '订单id/orderid': 'orderId',
    '国家': 'country',
    'country': 'country',
    '国家/country': 'country',
    '期间': 'period',
    'period': 'period',
    '期间/period': 'period',
    '金额': 'grossAmount',
    'grossamount': 'grossAmount',
    '金额/grossamount': 'grossAmount',
    '税率': 'vatRate',
    'vatrate': 'vatRate',
    '税率/vatrate': 'vatRate',
  },
  returns: {
    '退货id': 'returnId',
    'returnid': 'returnId',
    '退货id/returnid': 'returnId',
    '原订单id': 'originalOrderId',
    'originalorderid': 'originalOrderId',
    '原订单id/originalorderid': 'originalOrderId',
    '国家': 'country',
    'country': 'country',
    '国家/country': 'country',
    '期间': 'period',
    'period': 'period',
    '期间/period': 'period',
    '金额': 'grossAmount',
    'grossamount': 'grossAmount',
    '金额/grossamount': 'grossAmount',
    '税率': 'vatRate',
    'vatrate': 'vatRate',
    '税率/vatrate': 'vatRate',
  },
  bills: {
    '国家': 'country',
    'country': 'country',
    '国家/country': 'country',
    '期间': 'period',
    'period': 'period',
    '期间/period': 'period',
    '账单vat': 'billedVat',
    'billedvat': 'billedVat',
    '账单vat/billedvat': 'billedVat',
    '账单金额': 'billedGross',
    'billedgross': 'billedGross',
    '账单金额/billedgross': 'billedGross',
  },
}

function mapRow(row: Record<string, unknown>, dataKey: string): Record<string, unknown> {
  const columnMap = COLUMN_MAPS[dataKey] || {}
  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.trim().toLowerCase()
    const mappedKey = columnMap[normalizedKey]
    if (mappedKey) {
      mapped[mappedKey] = value
    } else {
      mapped[key] = value
    }
  }
  return mapped
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  title: string
  apiEndpoint: string
  dataKey: string
  onImported: () => void
}

export default function ImportModal({
  open,
  onClose,
  title,
  apiEndpoint,
  dataKey,
  onImported,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown>[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as Record<string, unknown>[]
        const mappedRows = rawRows.map((row) => mapRow(row, dataKey))
        setPreview(mappedRows)
      },
      error: () => {
        setError('CSV解析失败，请检查文件格式')
      },
    })
  }

  const handleImport = async () => {
    if (!preview.length) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [dataKey]: preview }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || '导入失败')
      }
      setFile(null)
      setPreview([])
      onImported()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    if (!importing) {
      setFile(null)
      setPreview([])
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-serif text-navy-500">{title}</h2>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-navy-300 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 mb-1">点击或拖拽上传CSV文件</p>
            <p className="text-xs text-gray-400">支持 .csv 格式</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="mt-4 flex items-center gap-2 text-sm text-navy-500">
              <FileText size={16} />
              <span>{file.name}</span>
              <span className="text-gray-400">({preview.length} 条记录)</span>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-coral-500 bg-coral-50 px-4 py-3 rounded-lg">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-4 overflow-auto max-h-48 border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {Object.keys(preview[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {String(val ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 5 && (
                <p className="text-xs text-gray-400 px-3 py-2">... 还有 {preview.length - 5} 条记录</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!preview.length || importing}
            className="px-4 py-2 text-sm text-white bg-navy-500 rounded-lg hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? '导入中...' : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
