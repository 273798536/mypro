import React, { useState, useRef } from 'react'
import { importApi } from '../services/api'
import type { ImportPreview, ImportConfirm, ImportResult } from '../../../shared/types'
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, ArrowRight, RefreshCw } from 'lucide-react'

const DATA_TYPES = [
  { value: 'students', label: '学员档案', icon: '👥' },
  { value: 'attendance', label: '上课记录', icon: '📅' },
  { value: 'practice', label: '练习记录', icon: '📝' },
  { value: 'feedback', label: '家长反馈', icon: '💬' },
]

const FIELD_LABELS: Record<string, string> = {
  name: '姓名',
  age: '年龄',
  courseType: '课程类型',
  teacherId: '教师ID',
  teacherName: '教师姓名',
  remainingLessons: '剩余课时',
  totalLessons: '总课时',
  renewalDate: '续费日期',
  notes: '备注',
  studentId: '学员ID',
  studentName: '学员姓名',
  lessonDate: '上课日期',
  status: '出勤状态',
  absentReason: '缺勤原因',
  practiceDate: '练习日期',
  submittedDate: '提交日期',
  durationMinutes: '练习时长(分钟)',
  completionRate: '完成率',
  teacherComment: '教师评语',
  isLate: '是否逾期',
  feedbackDate: '反馈日期',
  content: '反馈内容',
  sentimentScore: '情感分数',
}

const DataImport: React.FC = () => {
  const [dataType, setDataType] = useState('students')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [skipInvalid, setSkipInvalid] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      setError('请上传 Excel 或 CSV 格式的文件')
      return
    }

    setSelectedFile(file)
    setPreviewData(null)
    setFieldMapping({})
    setImportResult(null)
    setError(null)
    setUploading(true)

    try {
      const preview = await importApi.uploadFile(file, dataType)
      setPreviewData(preview)
      setFieldMapping({ ...preview.suggestedMapping })
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleFieldMappingChange = (sourceField: string, targetField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [sourceField]: targetField,
    }))
  }

  const handleConfirmImport = async () => {
    if (!previewData) return

    setImporting(true)
    setError(null)

    try {
      const request: ImportConfirm = {
        fileName: previewData.fileName,
        mapping: fieldMapping,
        dataType: dataType as ImportConfirm['dataType'],
        skipInvalid,
      }

      const result = await importApi.confirmImport(request)
      setImportResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewData(null)
    setFieldMapping({})
    setImportResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getMappedFields = () => {
    if (!previewData) return []
    return previewData.columns.map(col => ({
      source: col,
      target: fieldMapping[col] || '',
    }))
  }

  const errorCount = previewData?.issues.filter(i => i.severity === 'error').length || 0
  const warningCount = previewData?.issues.filter(i => i.severity === 'warning').length || 0

  const availableTargetFields = Object.entries(FIELD_LABELS).map(([key, label]) => ({
    value: key,
    label: `${label} (${key})`,
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">数据导入</h1>
        {selectedFile && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            重新导入
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">选择数据类型</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DATA_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                if (!selectedFile) {
                  setDataType(type.value)
                }
              }}
              disabled={!!selectedFile}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                dataType === type.value
                  ? 'border-primary bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              } ${selectedFile ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-3xl mb-2">{type.icon}</span>
              <span className={`text-sm font-medium ${
                dataType === type.value ? 'text-primary' : 'text-slate-600'
              }`}>
                {type.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-white rounded-xl shadow-sm border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-blue-50'
              : 'border-slate-300 hover:border-primary hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <div className={`p-4 rounded-full mb-4 ${
              isDragging ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Upload className={`w-12 h-12 ${isDragging ? 'text-primary' : 'text-slate-400'}`} />
            </div>
            <p className="text-lg font-medium text-slate-700 mb-2">
              {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处，或点击选择'}
            </p>
            <p className="text-sm text-slate-400">
              支持 Excel (.xlsx, .xls) 和 CSV 格式
            </p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-600">正在解析文件...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">导入出错</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {previewData && !uploading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileSpreadsheet className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">文件名</p>
                  <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                    {previewData.fileName}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">数据行数</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {previewData.validRows} / {previewData.totalRows}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${errorCount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <AlertTriangle className={errorCount > 0 ? 'text-red-600' : 'text-green-600'} size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">数据问题</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {errorCount > 0 && <span className="text-red-600">{errorCount} 错误</span>}
                    {warningCount > 0 && (
                      <span className="text-yellow-600 text-sm ml-2">{warningCount} 警告</span>
                    )}
                    {errorCount === 0 && warningCount === 0 && (
                      <span className="text-green-600">无问题</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {previewData.issues.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">脏数据提醒</h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">行号</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">列名</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">问题</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">级别</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.issues.slice(0, 20).map((issue, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-slate-600">{issue.row}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{issue.column}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{issue.issue}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            issue.severity === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {issue.severity === 'error' ? '错误' : '警告'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.issues.length > 20 && (
                  <div className="px-4 py-2 text-sm text-slate-500 text-center border-t border-slate-200">
                    仅显示前 20 条问题，共 {previewData.issues.length} 条
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">字段映射</h3>
              <p className="text-sm text-slate-500 mt-1">请确认文件列名与系统字段的对应关系</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMappedFields().map(({ source, target }) => (
                  <div key={source} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">文件列名</label>
                      <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-700">
                        {source}
                      </div>
                    </div>
                    <ArrowRight className="text-slate-300 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">系统字段</label>
                      <select
                        value={target}
                        onChange={(e) => handleFieldMappingChange(source, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">-- 不导入 --</option>
                        {availableTargetFields.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">数据预览</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {previewData.columns.map((col, index) => (
                      <th key={index} className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewData.sampleData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50">
                      {previewData.columns.map((col, colIndex) => (
                        <td key={colIndex} className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!importResult && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-600">跳过无效数据行</span>
                </label>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      确认导入
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div className={`rounded-xl p-6 border ${
              importResult.errors.length > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {importResult.errors.length > 0 ? (
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {importResult.errors.length > 0 ? '导入完成（部分失败）' : '导入成功'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    成功导入 {importResult.totalImported} 条，跳过 {importResult.totalSkipped} 条
                  </p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">错误详情：</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.errors.slice(0, 5).map((err, index) => (
                      <li key={index}>• {err}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-yellow-600">... 还有 {importResult.errors.length - 5} 条错误</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DataImport
