import type { UnitCheckResult } from '../types'

interface UnitCheckPanelProps {
  unitCheck: UnitCheckResult
  formulaUnit?: string
  studentUnit?: string
  correctUnit?: string
}

export default function UnitCheckPanel({
  unitCheck,
  formulaUnit,
  studentUnit,
  correctUnit
}: UnitCheckPanelProps) {
  const { passed, missingUnits, unitMismatch, conversionHint } = unitCheck

  return (
    <div className={`rounded-lg border p-4 ${
      passed 
        ? 'bg-success-50 border-success-200' 
        : 'bg-warning-50 border-warning-200'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{passed ? '✅' : '⚠️'}</span>
        <h4 className="font-semibold text-gray-800">单位校验结果</h4>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
          passed ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
        }`}>
          {passed ? '通过' : '异常'}
        </span>
      </div>

      {passed ? (
        <p className="text-sm text-gray-600">单位一致，无缺失，校验通过。</p>
      ) : (
        <div className="space-y-3">
          {missingUnits.length > 0 && (
            <div>
              <p className="text-sm font-medium text-warning-700 mb-1">
                缺失单位 ({missingUnits.length}项)
              </p>
              <div className="flex flex-wrap gap-1">
                {missingUnits.map(u => (
                  <span key={u} className="px-2 py-0.5 bg-warning-100 text-warning-600 text-xs rounded">
                    {u}
                  </span>
                ))}
              </div>
              <p className="text-xs text-warning-600 mt-1">
                提示：单位缺失会导致无法准确判断答案正确性，请补全后重新校验。
              </p>
            </div>
          )}

          {unitMismatch && (
            <div>
              <p className="text-sm font-medium text-warning-700 mb-1">
                单位不匹配
              </p>
              <div className="bg-white/60 rounded p-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-500 w-20">公式单位:</span>
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">
                    {unitMismatch.formulaUnit || '无'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-500 w-20">答案单位:</span>
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">
                    {unitMismatch.answerUnit || '无'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">换算关系:</span>
                  <span className="text-warning-700 text-xs">
                    {unitMismatch.suggestion}
                  </span>
                </div>
              </div>
            </div>
          )}

          {conversionHint && (
            <div className="bg-white/60 rounded p-2 border-l-2 border-warning-400">
              <p className="text-xs text-gray-700">
                💡 {conversionHint}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-warning-200/50">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-500">公式单位</span>
            <p className="font-mono text-gray-700 mt-0.5">{formulaUnit || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">学生答案单位</span>
            <p className="font-mono text-gray-700 mt-0.5">{studentUnit || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">参考答案单位</span>
            <p className="font-mono text-gray-700 mt-0.5">{correctUnit || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
