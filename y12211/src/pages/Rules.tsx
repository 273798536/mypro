import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { Plus, Clock, User, GitCompare } from 'lucide-react'

export function Rules() {
  const { rules, fetchRules, fetchRuleVersions } = useStore()
  const [selectedRule, setSelectedRule] = useState<string | null>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  useEffect(() => {
    if (selectedRule) {
      fetchRuleVersions(selectedRule).then(setVersions)
    }
  }, [selectedRule, fetchRuleVersions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">分账规则</h1>
          <p className="text-slate-500 mt-1">配置和管理分账规则，支持版本追溯</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          新增规则
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => setSelectedRule(rule.id)}
              className={`bg-white rounded-xl border p-5 cursor-pointer transition-all ${
                selectedRule === rule.id
                  ? 'border-indigo-500 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{rule.ruleName}</h3>
                  <p className="text-sm text-slate-500 mt-1">展览ID: {rule.exhibitionId}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  rule.isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {rule.isActive ? '启用' : '停用'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                <span>当前版本: v{rule.currentVersion}</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(rule.updatedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div>
          {selectedRule ? (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">版本历史</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {versions.map((v, i) => (
                  <div key={v.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">v{v.version}</span>
                      {i === 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          当前版本
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{v.changeNote}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {v.createdBy || '系统'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(v.effectiveTime).toLocaleDateString('zh-CN')} 生效
                      </span>
                    </div>
                    {v.waterfallConfig && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-2">分账配置:</p>
                        <div className="space-y-1">
                          {v.waterfallConfig.slice(0, 3).map((step: any) => (
                            <div key={step.id} className="flex justify-between text-xs">
                              <span className="text-slate-600">{step.name}</span>
                              <span>
                                {step.type === 'FIXED' ? `¥${step.value}` : `${step.value}%`}
                              </span>
                            </div>
                          ))}
                          {v.waterfallConfig.length > 3 && (
                            <span className="text-xs text-slate-400">+{v.waterfallConfig.length - 3} 项...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">请选择一个规则查看版本历史</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
