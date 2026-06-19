import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppStore } from '@/store/useAppStore'
import { Link } from 'react-router-dom'
import { Search, Filter, AlertTriangle, X, ArrowRight, ExternalLink } from 'lucide-react'

type TaskStatus = 'success' | 'failed' | 'running' | 'pending'

const STATUS_COLORS: Record<TaskStatus, string> = {
  success: '#10b981',
  failed: '#ef4444',
  running: '#f59e0b',
  pending: '#3b82f6',
}

const STATUS_BG: Record<TaskStatus, string> = {
  success: 'rgba(16,185,129,0.15)',
  failed: 'rgba(239,68,68,0.15)',
  running: 'rgba(245,158,11,0.15)',
  pending: 'rgba(59,130,246,0.15)',
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  pending: '待执行',
}

interface TaskNodeData {
  id: string
  name: string
  status: TaskStatus
  lastRunAt: string
  upstream: string[]
  [key: string]: unknown
}

function computeLayeredLayout(tasks: TaskNodeData[]) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const depth = new Map<string, number>()

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!
    const task = taskMap.get(id)
    if (!task || task.upstream.length === 0) {
      depth.set(id, 0)
      return 0
    }
    const d = Math.max(...task.upstream.map((uid) => getDepth(uid))) + 1
    depth.set(id, d)
    return d
  }

  tasks.forEach((t) => getDepth(t.id))

  const layers = new Map<number, string[]>()
  depth.forEach((d, id) => {
    if (!layers.has(d)) layers.set(d, [])
    layers.get(d)!.push(id)
  })

  const positions = new Map<string, { x: number; y: number }>()
  const sortedLayers = [...layers.entries()].sort((a, b) => a[0] - b[0])
  sortedLayers.forEach(([, ids]) => {
    ids.forEach((id, idx) => {
      positions.set(id, {
        x: (depth.get(id) ?? 0) * 280,
        y: idx * 100,
      })
    })
  })

  return positions
}

function TaskCustomNode({ data }: NodeProps<Node<TaskNodeData>>) {
  const status = data.status
  const borderColor = STATUS_COLORS[status]
  const isFailed = status === 'failed'

  const lastRun = data.lastRunAt
    ? new Date(data.lastRunAt).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  return (
    <div
      className={`rounded-lg px-3 py-2 ${isFailed ? 'animate-pulse-glow' : ''}`}
      style={{
        background: '#1e293b',
        border: `2px solid ${borderColor}`,
        width: 220,
        minHeight: 60,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor, width: 8, height: 8 }}
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-sm font-medium truncate"
          style={{ color: '#f1f5f9' }}
        >
          {data.name}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            background: STATUS_BG[status],
            color: borderColor,
          }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
        最近运行: {lastRun}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: borderColor, width: 8, height: 8 }}
      />
    </div>
  )
}

const nodeTypes = { taskNode: TaskCustomNode }

export default function TopologyPage() {
  const { tasks, selectedTaskId, fetchTasks, setSelectedTaskId } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchName = t.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchName && matchStatus
    })
  }, [tasks, search, statusFilter])

  const failedCount = useMemo(
    () => tasks.filter((t) => t.status === 'failed').length,
    [tasks],
  )

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const taskData: TaskNodeData[] = filteredTasks.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status as TaskStatus,
      lastRunAt: t.lastRunAt,
      upstream: t.upstream,
    }))

    const positions = computeLayeredLayout(taskData)
    const filteredIds = new Set(filteredTasks.map((t) => t.id))

    const nodes: Node<TaskNodeData>[] = filteredTasks.map((t) => ({
      id: t.id,
      type: 'taskNode',
      position: positions.get(t.id) ?? { x: 0, y: 0 },
      data: {
        id: t.id,
        name: t.name,
        status: t.status as TaskStatus,
        lastRunAt: t.lastRunAt,
        upstream: t.upstream,
      },
    }))

    const edges: Edge[] = []
    filteredTasks.forEach((t) => {
      t.upstream.forEach((upId) => {
        if (filteredIds.has(upId)) {
          edges.push({
            id: `${upId}-${t.id}`,
            source: upId,
            target: t.id,
            animated: false,
            style: { stroke: '#475569', strokeWidth: 2 },
            markerEnd: {
              type: 'arrowclosed' as const,
              color: '#475569',
              width: 16,
              height: 16,
            },
          })
        }
      })
    })

    return { nodes, edges }
  }, [filteredTasks])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedTaskId(node.id)
    },
    [setSelectedTaskId],
  )

  const onPaneClick = useCallback(() => {
    setSelectedTaskId(null)
  }, [setSelectedTaskId])

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const upstreamNames = useMemo(() => {
    if (!selectedTask) return []
    return selectedTask.upstream
      .map((uid) => tasks.find((t) => t.id === uid)?.name)
      .filter(Boolean) as string[]
  }, [selectedTask, tasks])

  const downstreamNames = useMemo(() => {
    if (!selectedTask) return []
    return selectedTask.downstream
      .map((did) => tasks.find((t) => t.id === did)?.name)
      .filter(Boolean) as string[]
  }, [selectedTask, tasks])

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: '#0f172a' }}>
      <div
        className="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 px-4 py-2"
        style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#94a3b8' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索任务名称..."
            className="rounded-md py-1.5 pl-8 pr-3 text-sm outline-none"
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#f1f5f9',
              width: 200,
            }}
          />
        </div>

        <div className="relative">
          <Filter
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: '#94a3b8' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-md py-1.5 pl-8 pr-8 text-sm outline-none"
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#f1f5f9',
            }}
          >
            <option value="all">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="running">运行中</option>
            <option value="pending">待执行</option>
          </select>
        </div>

        {failedCount > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={14} />
            {failedCount} 个失败
          </div>
        )}
      </div>

      <div className="h-full pt-11">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={20} />
          <Controls
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              const status = node.data?.status as TaskStatus | undefined
              return status ? STATUS_COLORS[status] : '#475569'
            }}
            maskColor="rgba(15,23,42,0.7)"
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>

      {selectedTask && (
        <div
          className="animate-slide-in-right absolute right-0 top-0 z-20 h-full"
          style={{
            width: 320,
            background: '#1e293b',
            borderLeft: '1px solid #334155',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #334155' }}
          >
            <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>
              任务详情
            </span>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="rounded p-1 transition-colors hover:bg-brand-elevated"
              style={{ color: '#94a3b8' }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="mb-4">
              <div className="text-xs" style={{ color: '#94a3b8' }}>
                任务名称
              </div>
              <div className="mt-1 text-sm font-medium" style={{ color: '#f1f5f9' }}>
                {selectedTask.name}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs" style={{ color: '#94a3b8' }}>
                状态
              </div>
              <div className="mt-1">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background: STATUS_BG[selectedTask.status as TaskStatus],
                    color: STATUS_COLORS[selectedTask.status as TaskStatus],
                  }}
                >
                  {STATUS_LABEL[selectedTask.status as TaskStatus]}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs" style={{ color: '#94a3b8' }}>
                最近运行时间
              </div>
              <div className="mt-1 text-sm" style={{ color: '#f1f5f9' }}>
                {selectedTask.lastRunAt
                  ? new Date(selectedTask.lastRunAt).toLocaleString('zh-CN')
                  : '-'}
              </div>
            </div>

            {selectedTask.workorderId && (
              <div className="mb-4">
                <div className="text-xs" style={{ color: '#94a3b8' }}>
                  关联工单
                </div>
                <div className="mt-1">
                  <Link
                    to={`/workorders/${selectedTask.workorderId}`}
                    className="inline-flex items-center gap-1 text-sm transition-colors hover:underline"
                    style={{ color: '#3b82f6' }}
                  >
                    <ExternalLink size={14} />
                    查看工单
                  </Link>
                </div>
              </div>
            )}

            {upstreamNames.length > 0 && (
              <div className="mb-4">
                <div className="text-xs" style={{ color: '#94a3b8' }}>
                  上游任务
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {upstreamNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1 text-sm"
                      style={{ color: '#f1f5f9' }}
                    >
                      <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {downstreamNames.length > 0 && (
              <div className="mb-4">
                <div className="text-xs" style={{ color: '#94a3b8' }}>
                  下游任务
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {downstreamNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1 text-sm"
                      style={{ color: '#f1f5f9' }}
                    >
                      <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
