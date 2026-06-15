import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '@/store';
import type { Point, PointStatus } from '@/types';
import { pointStatusMeta } from '../common/StatusBadge';
import { GitBranch, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusToBg: Record<PointStatus, string> = {
  normal: 'from-accent-normal/30 to-accent-normal/10',
  merged: 'from-accent-merged/30 to-accent-merged/10',
  abnormal: 'from-accent-abnormal/30 to-accent-abnormal/10',
  pending: 'from-accent-pending/30 to-accent-pending/10',
};
const statusToRing: Record<PointStatus, string> = {
  normal: 'ring-accent-normal/40',
  merged: 'ring-accent-merged/40',
  abnormal: 'ring-accent-abnormal/60 animate-pulse-red',
  pending: 'ring-accent-pending/60 animate-breath-yellow',
};

function PointNode({ data, selected }: NodeProps<Node<{ point: Point; materials: number }>>) {
  const p = data.point;
  const m = pointStatusMeta[p.status];
  const setSelectedPoint = useStore(s => s.setSelectedPoint);
  const setSelectedMerge = useStore(s => s.setSelectedMerge);
  const setHighlight = useStore(s => s.setHighlight);
  return (
    <div
      className={cn(
        'group relative min-w-[180px] max-w-[220px] rounded-xl border border-border bg-gradient-to-br p-2.5 ring-1 transition-all cursor-pointer backdrop-blur-sm',
        statusToBg[p.status],
        statusToRing[p.status],
        selected && 'ring-2 ring-accent-export scale-[1.03]',
      )}
      onClick={() => {
        setSelectedPoint(p.id);
        if (p.mergeId) setSelectedMerge(p.mergeId);
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-border" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-border" />
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', m.dot)} />
          <div className="text-xs font-bold text-text leading-tight truncate">{p.name}</div>
        </div>
        <span className={cn('text-[9px] shrink-0 px-1.5 py-0.5 rounded border font-mono', m.text, `border-current/30 bg-current/10`)}>
          {m.label}
        </span>
      </div>
      <div className="mt-1.5 text-[10px] text-text-muted line-clamp-1">📍 {p.location}</div>
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <span className="text-[10px] text-text-dim">📄 {data.materials} 份材料</span>
        {p.mergeId && (
          <button
            onClick={e => {
              e.stopPropagation();
              setSelectedMerge(p.mergeId!);
            }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-bg-hover text-text-muted hover:text-accent-export flex items-center gap-0.5"
            title="查看归并详情"
          >
            <GitBranch className="w-2.5 h-2.5" />
            归并
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            if (p.materialIds[0]) setHighlight({ type: 'material', id: p.materialIds[0], triggeredAt: Date.now() });
          }}
          className="text-[10px] px-1.5 py-0.5 rounded bg-bg-hover text-text-muted hover:text-accent-caliber flex items-center gap-0.5"
          title="追溯到材料卡片"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          材料
        </button>
      </div>
    </div>
  );
}

const nodeTypes = { point: PointNode };

export function MergeGraph() {
  const points = useStore(s => s.points);
  const merges = useStore(s => s.merges);
  const materials = useStore(s => s.materials);
  const selectedMergeId = useStore(s => s.selectedMergeId);
  const selectedPointId = useStore(s => s.selectedPointId);
  const setSelectedMerge = useStore(s => s.setSelectedMerge);
  const setSelectedPoint = useStore(s => s.setSelectedPoint);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    const mergeIdToPoints = new Map<string, Point[]>();
    points.forEach(p => {
      if (p.mergeId) {
        if (!mergeIdToPoints.has(p.mergeId)) mergeIdToPoints.set(p.mergeId, []);
        mergeIdToPoints.get(p.mergeId)!.push(p);
      }
    });

    const cols = 4;
    let cursor = { x: 0, y: 0 };
    const cellW = 260;
    const cellH = 170;

    // 先放独立点位
    const soloPoints = points.filter(p => !p.mergeId);
    soloPoints.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      ns.push({
        id: p.id,
        type: 'point',
        position: { x: col * cellW, y: row * cellH + cursor.y },
        data: { point: p, materials: p.materialIds.length },
      });
    });

    const rowOffset = Math.ceil(soloPoints.length / cols) * cellH + 40;
    let y = rowOffset;
    merges.forEach((mg, mi) => {
      const members = mergeIdToPoints.get(mg.id) || [];
      const isPending = mg.status === 'pending_review';
      const isAbnormal = mg.status !== 'pending_review' && members.some(m => m.status === 'abnormal');
      ns.push({
        id: `mg_root_${mg.id}`,
        position: { x: 80, y },
        data: { label: mg.canonicalName },
        style: {
          background: isPending
            ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.05))'
            : isAbnormal
              ? 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.05))'
              : 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.05))',
          border: `1px solid ${isPending ? 'rgba(245,158,11,0.5)' : isAbnormal ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'}`,
          borderRadius: 10,
          padding: '8px 12px',
          color: '#F1F5F9',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          minWidth: 140,
        },
        draggable: true,
      });
      members.forEach((p, j) => {
        const px = 80 + (j + 1) * cellW;
        ns.push({
          id: p.id,
          type: 'point',
          position: { x: px, y },
          data: { point: p, materials: p.materialIds.length },
        });
        es.push({
          id: `e_${mg.id}_${j}`,
          source: `mg_root_${mg.id}`,
          target: p.id,
          animated: isPending || isAbnormal,
          label: mg.confidence >= 0.8 ? '高置信' : mg.confidence >= 0.6 ? '中置信' : '待确认',
          labelStyle: { fill: isPending ? '#F59E0B' : isAbnormal ? '#EF4444' : '#94A3B8', fontSize: 10 },
          style: {
            stroke: isPending ? '#F59E0B' : isAbnormal ? '#EF4444' : '#3B82F6',
            strokeWidth: 1 + mg.confidence,
            opacity: 0.75,
          },
        });
      });
      y += cellH;
    });

    // 材料关联点（虚线连接材料数量）
    materials.forEach(() => {});

    return { nodes: ns, edges: es };
  }, [points, merges, materials]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  useEffect(() => {
    setNodes(prev =>
      prev.map(n => {
        let sel = false;
        if (n.id.startsWith('mg_root_')) {
          sel = n.id === `mg_root_${selectedMergeId}`;
        } else {
          sel = n.id === selectedPointId || (selectedMergeId && points.find(p => p.id === n.id)?.mergeId === selectedMergeId) || false;
        }
        return { ...n, selected: !!sel };
      }),
    );
  }, [selectedMergeId, selectedPointId, points, setNodes]);

  const onPaneClick = useCallback(() => {
    setSelectedMerge(null);
    setSelectedPoint(null);
  }, [setSelectedMerge, setSelectedPoint]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id.startsWith('mg_root_')) {
      const id = node.id.replace('mg_root_', '');
      setSelectedMerge(id);
      setSelectedPoint(null);
    } else {
      setSelectedPoint(node.id);
      const p = points.find(x => x.id === node.id);
      if (p?.mergeId) setSelectedMerge(p.mergeId);
    }
  }, [points, setSelectedMerge, setSelectedPoint]);

  return (
    <div className="h-full w-full rounded-xl border border-border overflow-hidden bg-bg-soft relative animate-fade-in" style={{ animationDelay: '420ms' }}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-accent-merged" />
        <h2 className="text-base font-bold tracking-wide text-text drop-shadow">图表区 · 归并关系</h2>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-bg-card/70 backdrop-blur border border-border text-text-muted">
          支持缩放拖拽 · 点击节点看详情
        </span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.4}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-bg-card !border-border" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={n => {
            const id = n.id.startsWith('mg_root_') ? n.id.replace('mg_root_', '') : n.id;
            const p = points.find(x => x.id === id);
            if (n.id.startsWith('mg_root_')) {
              const mg = merges.find(m => m.id === id);
              return mg?.status === 'pending_review' ? '#F59E0B' : '#3B82F6';
            }
            if (!p) return '#94A3B8';
            if (p.status === 'abnormal') return '#EF4444';
            if (p.status === 'pending') return '#F59E0B';
            if (p.status === 'merged') return '#3B82F6';
            return '#10B981';
          }}
          maskColor="rgba(11,17,32,0.75)"
          style={{ background: '#0F172A', border: '1px solid #334155' }}
        />
      </ReactFlow>
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[10px] text-text-muted bg-bg-card/70 backdrop-blur px-2 py-1 rounded-md border border-border">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-normal" />独立</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-merged" />已归并</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-pending" />挂起</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-abnormal animate-ping" />异常</span>
      </div>
    </div>
  );
}
