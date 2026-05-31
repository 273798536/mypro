import { useEffect, useState } from 'react'
import { Download, FileText, CheckCircle, AlertTriangle, Check } from 'lucide-react'
import useStore from '@/store/app'
import { exportApi, downloadBlob } from '@/lib/api'
import { Card, Button, Loading, Tag, Empty } from '@/components/ui'

export default function ExportCenter() {
  const { consistencyCheck, loadingConsistencyCheck, fetchConsistencyCheck, allRiskFlags, fetchAllRiskFlags } = useStore()
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchConsistencyCheck()
    fetchAllRiskFlags()
  }, [])

  const mismatches = consistencyCheck.filter(c => c.mismatch)

  const exportItems = [
    {
      id: 'approval-list',
      name: '展期审批列表',
      description: '导出所有展期申请的完整列表',
      exportFn: exportApi.approvalList,
      filename: '展期审批列表.csv',
      iconType: 'file',
    },
    {
      id: 'review-report',
      name: '审批审查报告',
      description: '包含审批意见的详细报告',
      exportFn: exportApi.reviewReport,
      filename: '审批审查报告.csv',
      iconType: 'file',
    },
    {
      id: 'risk-flags',
      name: '风险标记报告',
      description: () => `包含${allRiskFlags.length}条风险标记`,
      exportFn: exportApi.riskFlags,
      filename: '风险标记报告.csv',
      iconType: 'warning',
      showRiskBadge: true,
    },
    {
      id: 'consistency-check',
      name: '口径一致性检查',
      description: '检查展期状态与审批留痕一致性',
      exportFn: exportApi.consistencyCheck,
      filename: '一致性检查报告.csv',
      iconType: 'consistency',
      showConsistencyBadge: true,
    },
  ]

  const handleExport = async (item: typeof exportItems[0]) => {
    setExportingId(item.id)
    try {
      const blob = await item.exportFn()
      downloadBlob(blob, item.filename)
      setExportedIds(prev => new Set([...prev, item.id]))
    } finally {
      setExportingId(null)
    }
  }

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'warning':
        return <AlertTriangle size={24} className="text-amber-500" />
      case 'consistency':
        return mismatches.length > 0
          ? <AlertTriangle size={24} className="text-red-500" />
          : <CheckCircle size={24} className="text-emerald-500" />
      default:
        return <FileText size={24} className="text-slate-600" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 font-serif mb-6">导出中心</h2>
          <p className="text-sm text-slate-500 mb-6">
            导出的报告将包含页面展示的所有风险标记，便于事后复盘和审计追踪。
          </p>

          <div className="grid grid-cols-2 gap-4">
            {exportItems.map(item => (
              <Card key={item.id} hover>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        {getIcon(item.iconType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-800">{item.name}</h3>
                          {item.showRiskBadge && allRiskFlags.length > 0 && (
                            <Tag variant="warning">{allRiskFlags.length}条风险</Tag>
                          )}
                          {item.showConsistencyBadge && (
                            mismatches.length > 0 ? (
                              <Tag variant="danger">{mismatches.length}处不一致</Tag>
                            ) : (
                              <Tag variant="success">全部一致</Tag>
                            )
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {typeof item.description === 'function' ? item.description() : item.description}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Button
                        variant={exportedIds.has(item.id) ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleExport(item)}
                        disabled={exportingId === item.id}
                      >
                        {exportingId === item.id ? (
                          <>
                            <Loading size="sm" />
                            <span className="ml-2">导出中</span>
                          </>
                        ) : exportedIds.has(item.id) ? (
                          <>
                            <Check size={16} className="mr-1" />
                            已导出
                          </>
                        ) : (
                          <>
                            <Download size={16} className="mr-1" />
                            导出
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4">口径一致性检查结果</h2>

          {loadingConsistencyCheck ? (
            <div className="py-8"><Loading /></div>
          ) : mismatches.length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-500" />
                  <span className="font-medium text-amber-800">
                    发现 {mismatches.length} 处口径不一致
                  </span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  以下展期的日常状态与审批留痕状态不一致，请核查。
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-zebra">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">展期ID</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">展期状态</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">最新审批动作</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">是否一致</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mismatches.map(item => (
                      <tr key={item.extension_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-sm text-slate-700">{item.extension_id}</td>
                        <td className="px-4 py-3"><Tag>{item.extension_status}</Tag></td>
                        <td className="px-4 py-3"><Tag variant="warning">{item.latest_approval_action}</Tag></td>
                        <td className="px-4 py-3"><Tag variant="danger">不一致</Tag></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Empty
              icon={<CheckCircle size={48} className="text-emerald-500" />}
              title="全部一致"
              description="所有展期状态与审批留痕完全一致"
            />
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4">导出说明</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium mt-0.5">1</div>
              <div>
                <p className="font-medium text-slate-700">风险标记包含</p>
                <p>所有导出的报告都会包含页面上展示的所有风险标记，包括重复展期、逾期遮盖、担保过期等。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium mt-0.5">2</div>
              <div>
                <p className="font-medium text-slate-700">审批留痕完整</p>
                <p>审批审查报告包含完整的审批意见、操作人、操作时间，便于事后审计追踪。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-medium mt-0.5">3</div>
              <div>
                <p className="font-medium text-slate-700">口径一致性保证</p>
                <p>导出前系统会自动检查展期状态与审批留痕是否一致，确保导出数据的准确性。</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
