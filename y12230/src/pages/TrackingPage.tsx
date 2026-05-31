import { useState } from 'react'
import { Clock, GitCommit, GitCompare } from 'lucide-react'
import { useStore } from '@/store'
import type { ChangeLogEntry, ExpenseAggregation } from '@/types'

const OP_COLORS: Record<string, string> = {
  create: 'bg-[#4caf82] text-white',
  update: 'bg-blue-500 text-white',
  delete: 'bg-[#e8635a] text-white',
}

const OP_LABELS: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
}

const ENTITY_LABELS: Record<string, string> = {
  project: '项目',
  timeRecord: '工时',
  material: '材料',
  invoice: '发票',
}

const fmt = (n: number) => n.toLocaleString()

function ImpactChain({ entry }: { entry: ChangeLogEntry }) {
  const { getProjectName, snapshots } = useStore()
  const snapshot = snapshots.find((s) => s.id === entry.snapshotId)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#d4a853]">
        <GitCommit size={16} />
        影响链路
      </h3>
      <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#d4a853]" />
          <span>
            {ENTITY_LABELS[entry.entityType]}: {entry.entityName}
          </span>
        </div>
        {entry.affectedProjectIds.map((pid) => {
          const name = getProjectName(pid)
          const agg = snapshot?.aggregations.find((a) => a.projectId === pid)
          return (
            <div key={pid} className="ml-4 border-l border-gray-300 pl-4 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
                <span>项目: {name}</span>
              </div>
              {agg && (
                <div className="ml-4 space-y-1 border-l border-gray-200 pl-4 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    <span>人工费: {fmt(agg.laborCost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    <span>材料费: {fmt(agg.materialCost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    <span>其他费用: {fmt(agg.otherCost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
                    <span className="font-semibold">合计: {fmt(agg.totalCost)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SnapshotDiff({
  leftId,
  rightId,
}: {
  leftId: string
  rightId: string
}) {
  const { snapshots, getProjectName } = useStore()
  const left = snapshots.find((s) => s.id === leftId)
  const right = snapshots.find((s) => s.id === rightId)
  if (!left || !right) return null

  const allProjectIds = Array.from(
    new Set([
      ...left.aggregations.map((a) => a.projectId),
      ...right.aggregations.map((a) => a.projectId),
    ])
  )

  const fields: { key: string; label: string }[] = [
    { key: 'laborCost', label: '人工费' },
    { key: 'materialCost', label: '材料费' },
    { key: 'otherCost', label: '其他费用' },
    { key: 'totalCost', label: '合计' },
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th className="px-3 py-2 font-semibold text-[#d4a853]">项目</th>
            <th className="px-3 py-2 font-semibold text-[#d4a853]">字段</th>
            <th className="px-3 py-2 font-semibold text-[#d4a853]">
              {new Date(left.timestamp).toLocaleString()}
            </th>
            <th className="px-3 py-2 font-semibold text-[#d4a853]">
              {new Date(right.timestamp).toLocaleString()}
            </th>
          </tr>
        </thead>
        <tbody>
          {allProjectIds.map((pid) =>
            fields.map((field) => {
              const leftAgg = left.aggregations.find((a) => a.projectId === pid)
              const rightAgg = right.aggregations.find((a) => a.projectId === pid)
              const lv = leftAgg ? (leftAgg as unknown as Record<string, number>)[field.key] ?? 0 : 0
              const rv = rightAgg ? (rightAgg as unknown as Record<string, number>)[field.key] ?? 0 : 0
              const diff = lv !== rv
              return (
                <tr
                  key={`${pid}-${field.key}`}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                    {getProjectName(pid)}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                    {field.label}
                  </td>
                  <td
                    className={`px-3 py-1.5 font-mono text-right ${diff ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}
                  >
                    {fmt(lv)}
                  </td>
                  <td
                    className={`px-3 py-1.5 font-mono text-right ${diff ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}
                  >
                    {fmt(rv)}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function TrackingPage() {
  const { changelog, snapshots, getProjectName } = useStore()
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [leftSnapshotId, setLeftSnapshotId] = useState('')
  const [rightSnapshotId, setRightSnapshotId] = useState('')

  const selectedEntry = changelog.find((e) => e.id === selectedEntryId) ?? null

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
        <Clock size={22} className="text-[#d4a853]" />
        变更追踪
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">变更日志</h2>
          {changelog.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">暂无变更记录</p>
          )}
          <div className="space-y-2">
            {changelog.map((entry) => {
              const isSelected = selectedEntryId === entry.id
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntryId(isSelected ? null : entry.id)}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-[#d4a853] bg-[#d4a853]/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${OP_COLORS[entry.operation]}`}
                    >
                      {OP_LABELS[entry.operation]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {ENTITY_LABELS[entry.entityType]}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {entry.entityName}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.affectedProjectIds.map((pid) => (
                      <span
                        key={pid}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      >
                        {getProjectName(pid)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          {selectedEntry ? (
            <ImpactChain entry={selectedEntry} />
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400 dark:border-gray-600">
              点击变更条目查看影响链路
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center gap-1.5 rounded-lg bg-[#d4a853] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <GitCompare size={16} />
            版本快照对比
          </button>
        </div>

        {showDiff && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <select
                value={leftSnapshotId}
                onChange={(e) => setLeftSnapshotId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">选择左侧快照</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.timestamp).toLocaleString()} — {s.trigger}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-400">vs</span>
              <select
                value={rightSnapshotId}
                onChange={(e) => setRightSnapshotId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">选择右侧快照</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.timestamp).toLocaleString()} — {s.trigger}
                  </option>
                ))}
              </select>
            </div>

            {leftSnapshotId && rightSnapshotId ? (
              <SnapshotDiff leftId={leftSnapshotId} rightId={rightSnapshotId} />
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">
                请选择两个快照进行对比
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
