import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, Link2, FileCheck, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePortfolioStore } from '@/store/portfolioStore'

function AuditTrailPage() {
  const { auditRecords, constraintChecks } = usePortfolioStore()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getOperationColor = (operation: string) => {
    if (operation.includes('删除') || operation.includes('禁买')) return 'text-accent-danger bg-accent-danger/10'
    if (operation.includes('新增') || operation.includes('导入')) return 'text-accent-emerald bg-accent-emerald/10'
    if (operation.includes('检查')) return 'text-primary bg-primary/10'
    return 'text-accent-amber bg-accent-amber/10'
  }

  const getConstraintCheck = (id: string) => {
    return constraintChecks.find((c) => c.id === id)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">修正留痕</h2>
          <p className="text-neutral-muted mt-1">查看所有操作的历史记录，支持回溯至约束检查结果</p>
        </div>
        <div className="text-sm text-neutral-muted">
          共 <span className="font-bold text-primary">{auditRecords.length}</span> 条记录
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {auditRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">暂无操作记录</h3>
            <p className="text-neutral-muted">
              导入样例或编辑组合后，操作记录将自动在此处显示
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {auditRecords.map((record) => {
              const isExpanded = expandedId === record.id
              const constraintCheck = record.constraintCheckId
                ? getConstraintCheck(record.constraintCheckId)
                : null

              return (
                <div key={record.id} className="hover:bg-gray-50 transition-colors">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            record.operation.includes('检查') ? 'bg-primary' : 'bg-accent-amber'
                          }`}
                        />
                        <div className="w-px h-8 bg-gray-200 mt-1" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getOperationColor(
                              record.operation
                            )}`}
                          >
                            {record.operation}
                          </span>
                          <span className="text-sm font-medium">{record.field}</span>
                          {record.oldValue && record.newValue && (
                            <span className="text-sm text-neutral-muted flex items-center gap-1">
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                {record.oldValue}
                              </span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded text-primary">
                                {record.newValue}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-neutral-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(record.createdAt)}
                          </span>
                          {record.reason && <span>原因：{record.reason}</span>}
                          {constraintCheck && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate('/risk-budget')
                              }}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Link2 className="w-3 h-3" />
                              查看关联检查结果
                            </button>
                          )}
                        </div>
                      </div>

                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && constraintCheck && (
                    <div className="px-16 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                          <FileCheck className="w-4 h-4" />
                          关联约束检查结果
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-xs text-neutral-muted mb-1">权重检查</div>
                            <div
                              className={`text-sm font-medium ${
                                constraintCheck.weightCheck.passed ? 'text-accent-emerald' : 'text-accent-danger'
                              }`}
                            >
                              {constraintCheck.weightCheck.passed ? '通过' : '未通过'}
                            </div>
                            <div className="text-xs text-neutral-muted mt-1">
                              {constraintCheck.weightCheck.totalWeight.toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-xs text-neutral-muted mb-1">行业检查</div>
                            <div
                              className={`text-sm font-medium ${
                                constraintCheck.industryCheck.passed ? 'text-accent-emerald' : 'text-accent-danger'
                              }`}
                            >
                              {constraintCheck.industryCheck.passed ? '通过' : '未通过'}
                            </div>
                            <div className="text-xs text-neutral-muted mt-1">
                              {constraintCheck.industryCheck.violations.length} 个超限
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg">
                            <div className="text-xs text-neutral-muted mb-1">禁买检查</div>
                            <div
                              className={`text-sm font-medium ${
                                constraintCheck.prohibitedCheck.passed ? 'text-accent-emerald' : 'text-accent-danger'
                              }`}
                            >
                              {constraintCheck.prohibitedCheck.passed ? '通过' : '未通过'}
                            </div>
                            <div className="text-xs text-neutral-muted mt-1">
                              {constraintCheck.prohibitedCheck.prohibitedFunds.length} 只禁买
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditTrailPage
