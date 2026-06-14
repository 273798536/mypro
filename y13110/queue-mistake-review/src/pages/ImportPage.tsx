import { useState } from 'react'
import { useMistakeData } from '../hooks/useMistakeData'
import type { DataSource, FieldMapping } from '../types'
import type { RawImportRecord } from '../utils/fieldMapping'

const SAMPLE_DATA: RawImportRecord[] = [
  {
    "题目名称": "浮力计算",
    "科目": "物理",
    "知识点": "浮力",
    "难度": "中等",
    "题干": "一个体积为200cm³的木块漂浮在水面上，有2/5的体积露出水面，求木块受到的浮力。（g取10N/kg，ρ水=1.0×10³kg/m³）",
    "解题公式": "F浮 = ρ液gV排",
    "公式单位": "N",
    "答题内容": "1.2",
    "正确答案": "1.2N",
    "录入人": "老叶",
    "来源": "旧系统导入",
    "状态": "待人工确认",
    "备注": "学生答案缺单位，只有数值1.2"
  },
  {
    "题目名称": "电功率计算",
    "科目": "物理",
    "知识点": "电功率",
    "难度": "困难",
    "题干": "一个标有\"220V 100W\"的灯泡，正常工作时的电流是多少？如果把它接在110V的电路中，实际功率是多少？",
    "解题公式": "P = UI, P实 = (U实/U额)² × P额",
    "公式单位": "W",
    "答题内容": "0.45A 25J",
    "正确答案": "0.45A 25W",
    "录入人": "老叶",
    "来源": "旧系统导入",
    "备注": "学生将功率单位W写成J，混淆了功和功率"
  },
  {
    "题目名称": "重力势能计算",
    "科目": "物理",
    "知识点": "机械能",
    "难度": "简单",
    "题干": "一个质量为2kg的物体放在3m高的桌面上，求其重力势能。（g取10N/kg）",
    "解题公式": "Ep = mgh",
    "公式单位": "J",
    "答题内容": "60J",
    "正确答案": "60J",
    "录入人": "周老师",
    "来源": "新系统导入",
    "备注": "全对"
  }
]

export default function ImportPage() {
  const { importRecords } = useMistakeData()
  const [jsonText, setJsonText] = useState('')
  const [source, setSource] = useState<DataSource>('import_old')
  const [result, setResult] = useState<{
    imported: number
    warnings: string[]
    mapped: FieldMapping[]
  } | null>(null)
  const [error, setError] = useState('')

  const handleImport = () => {
    setError('')
    setResult(null)
    try {
      let records: RawImportRecord[]
      try {
        const parsed = JSON.parse(jsonText)
        records = Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        throw new Error('JSON 格式不正确，请检查后重试')
      }

      if (records.length === 0) {
        throw new Error('导入数据为空')
      }

      const importResult = importRecords(records, source)
      setResult(importResult)
      setJsonText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
    }
  }

  const handleLoadSample = () => {
    setJsonText(JSON.stringify(SAMPLE_DATA, null, 2))
    setSource('import_old')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-1">导入历史答案</h2>
      <p className="text-sm text-gray-500 mb-6">
        接手同事交来的历史数据，字段名不一致会自动归一化，来源和处理状态会被保留
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                粘贴 JSON 数据
              </label>
              <button
                onClick={handleLoadSample}
                className="text-xs text-primary-600 hover:text-primary-700 underline"
              >
                加载演示数据（老叶交来的旧系统格式）
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              rows={16}
              placeholder={`[\n  {\n    "题目名称": "浮力计算",\n    "题干": "一个体积为200cm³的木块...",\n    "答题内容": "1.2",\n    "正确答案": "1.2N",\n    "知识点": "浮力",\n    "录入人": "老叶"\n  }\n]`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-md text-sm text-danger-700">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-success-50 border border-success-200 rounded-md">
              <p className="text-sm font-medium text-success-700 mb-2">
                ✅ 成功导入 {result.imported} 条记录
              </p>
              {result.mapped.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-600 mb-1">字段映射记录：</p>
                  <div className="flex flex-wrap gap-1">
                    {result.mapped.map((m, i) => (
                      <span key={i} className="inline-flex items-center text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5">
                        <span className="text-gray-500">{m.oldFieldName}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-primary-600">{m.newFieldName}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.warnings.length > 0 && (
                <div>
                  <p className="text-xs text-warning-600 mb-1">⚠️ 处理提示：</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={!jsonText.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              导入并归一化
            </button>
            <button
              onClick={() => { setJsonText(''); setResult(null); setError('') }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              清空
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">数据来源</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value as DataSource)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="import_old">旧系统导入</option>
              <option value="import_new">新系统导入</option>
              <option value="manual">手工录入</option>
              <option value="api_sync">接口同步</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">支持的旧字段名</h4>
            <div className="space-y-1 text-xs text-gray-500 max-h-64 overflow-y-auto">
              {[
                ['题目名称 / 标题', '→ title'],
                ['题干 / 题目', '→ questionContent'],
                ['答题内容 / 学生答案', '→ studentAnswer'],
                ['参考答案 / 正确答案', '→ correctAnswer'],
                ['标准答案', '→ referenceAnswer'],
                ['解题公式 / 公式', '→ formula'],
                ['公式单位', '→ formulaUnit'],
                ['知识点 / 章节', '→ chapter'],
                ['科目', '→ subject'],
                ['难度', '→ difficulty'],
                ['录入人 / 提交人', '→ submittedBy'],
                ['来源 / 数据来源', '→ dataSource'],
                ['状态', '→ status'],
                ['附件 / 附属材料', '→ attachments'],
                ['复盘笔记 / 备注', '→ reviewNotes'],
              ].map(([old, arrow], i) => (
                <div key={i} className="flex justify-between">
                  <span>{old}</span>
                  <span className="text-primary-600 font-mono">{arrow}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">导入流程说明</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>粘贴或输入 JSON 格式的错题数据</li>
              <li>选择数据来源（影响来源标签）</li>
              <li>点击"导入并归一化"</li>
              <li>系统自动映射字段名，保留原始状态</li>
              <li>单位缺失的记录自动标记"待人工确认"</li>
              <li>导入后跳转列表页可查看新记录</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
