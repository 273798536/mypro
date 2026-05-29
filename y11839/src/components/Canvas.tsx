import { useState, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { BridgeNode, BridgeMember } from '../types';
import { getStressColor } from '../utils/physics';

const NODE_R = 8;
const LINE_W = 3;

function snapToGrid(v: number, gs: number) {
  return Math.round(v / gs);
}

function Grid({ w, h, gs }: { w: number; h: number; gs: number }) {
  const lines: React.ReactElement[] = [];
  for (let x = 0; x <= w; x += gs) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#1F4A6E" strokeWidth={0.5} />);
  for (let y = 0; y <= h; y += gs) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke="#1F4A6E" strokeWidth={0.5} />);
  return <g>{lines}</g>;
}

function Tooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  const tw = 180;
  const th = lines.length * 16 + 12;
  const tx = Math.max(4, Math.min(x - tw / 2, 0));
  const ty = y - th - 8;
  return (
    <g>
      <rect x={tx} y={ty} width={tw} height={th} rx={4} fill="#0A1628" fillOpacity={0.92} stroke="#2A4A6C" />
      {lines.map((l, i) => (
        <text key={i} x={tx + tw / 2} y={ty + 14 + i * 16} textAnchor="middle" fill="#C8D8E8" fontSize={11} fontFamily="monospace">{l}</text>
      ))}
    </g>
  );
}

function NodeVisual({ node, gs, selected, startNode }: { node: BridgeNode; gs: number; selected: boolean; startNode: boolean }) {
  const cx = node.x * gs;
  const cy = node.y * gs;
  const fill = node.type === 'deck' ? '#E87722' : node.type === 'support' ? '#2ECC71' : '#FFFFFF';

  return (
    <g>
      {node.isStable === false && (
        <circle cx={cx} cy={cy} r={NODE_R + 6} fill="none" stroke="#E74C3C" strokeWidth={2} opacity={0.7}>
          <animate attributeName="r" values={`${NODE_R + 4};${NODE_R + 10};${NODE_R + 4}`} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {selected && <circle cx={cx} cy={cy} r={NODE_R + 4} fill="none" stroke="#00BFFF" strokeWidth={2} />}
      {startNode && <circle cx={cx} cy={cy} r={NODE_R + 5} fill="none" stroke="#FFD700" strokeWidth={2} strokeDasharray="4 2" />}
      <circle cx={cx} cy={cy} r={NODE_R} fill={fill} stroke="#0A1628" strokeWidth={1.5} />
      {node.type === 'support' && (
        <polygon points={`${cx},${cy + NODE_R} ${cx - 6},${cy + NODE_R + 8} ${cx + 6},${cy + NODE_R + 8}`} fill="#2ECC71" opacity={0.8} />
      )}
    </g>
  );
}

function MemberVisual({ m, nodeMap, gs, selected }: { m: BridgeMember; nodeMap: Record<string, BridgeNode>; gs: number; selected: boolean }) {
  const a = nodeMap[m.nodeAId];
  const b = nodeMap[m.nodeBId];
  if (!a || !b) return null;
  const x1 = a.x * gs, y1 = a.y * gs, x2 = b.x * gs, y2 = b.y * gs;
  const color = getStressColor(m.stressRatio);
  return (
    <g>
      {selected && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00BFFF" strokeWidth={LINE_W + 4} />}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={LINE_W} strokeLinecap="round" />
    </g>
  );
}

export default function Canvas() {
  const store = useGameStore();
  const { config, nodes, members, buildTool, selectedNodeId, selectedMemberId, memberStartNodeId } = store;
  const svgW = config.gridWidth * config.gridSize;
  const svgH = config.gridHeight * config.gridSize;
  const gs = config.gridSize;
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const [hovered, setHovered] = useState<{ type: 'node' | 'member'; id: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toSvg = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { gx: 0, gy: 0 };
    const rect = svg.getBoundingClientRect();
    const sx = svgW / rect.width;
    const sy = svgH / rect.height;
    return {
      gx: snapToGrid((e.clientX - rect.left) * sx, gs),
      gy: snapToGrid((e.clientY - rect.top) * sy, gs),
    };
  }, [svgW, svgH, gs]);

  const onCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return;
    if ((e.target as Element).closest('[data-interactive]')) return;
    const { gx, gy } = toSvg(e);
    if (gx < 0 || gx > config.gridWidth || gy < 0 || gy > config.gridHeight) return;
    if (buildTool === 'addNode') store.addNode(gx, gy, 'free');
    else if (buildTool === 'addSupport') store.addNode(gx, gy, 'support');
    else if (buildTool === 'select') { store.selectNode(null); store.selectMember(null); }
  }, [buildTool, toSvg, dragging, config.gridWidth, config.gridHeight, store]);

  const onNodeInteract = useCallback((node: BridgeNode) => {
    if (buildTool === 'addMember') {
      if (!memberStartNodeId) {
        useGameStore.setState({ memberStartNodeId: node.id });
      } else if (memberStartNodeId !== node.id) {
        store.addMember(memberStartNodeId, node.id);
        useGameStore.setState({ memberStartNodeId: null });
      }
    } else if (buildTool === 'delete') {
      store.removeNode(node.id);
    } else if (buildTool === 'select') {
      store.selectNode(node.id);
    }
  }, [buildTool, memberStartNodeId, store]);

  const onMemberInteract = useCallback((m: BridgeMember) => {
    if (buildTool === 'delete') store.removeMember(m.id);
    else if (buildTool === 'select') store.selectMember(m.id);
  }, [buildTool, store]);

  const onNodeDown = useCallback((id: string) => {
    if (buildTool === 'select') setDragging(id);
  }, [buildTool]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const { gx, gy } = toSvg(e);
    store.moveNode(dragging, gx, gy);
  }, [dragging, toSvg, store]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  const hNode = hovered?.type === 'node' ? hovered.id : null;
  const hMember = hovered?.type === 'member' ? hovered.id : null;
  const hNodeData = hNode ? nodes.find((n) => n.id === hNode) : null;
  const hMemberData = hMember ? members.find((m) => m.id === hMember) : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full h-full"
      style={{ backgroundColor: '#1B3A5C' }}
      onClick={onCanvasClick}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <Grid w={svgW} h={svgH} gs={gs} />
      {members.map((m) => <MemberVisual key={m.id} m={m} nodeMap={nodeMap} gs={gs} selected={selectedMemberId === m.id} />)}
      {nodes.map((n) => <NodeVisual key={n.id} node={n} gs={gs} selected={selectedNodeId === n.id} startNode={memberStartNodeId === n.id} />)}

      {/* Interaction overlays - members */}
      {members.map((m) => {
        const a = nodeMap[m.nodeAId], b = nodeMap[m.nodeBId];
        if (!a || !b) return null;
        return (
          <line
            key={`i-${m.id}`}
            data-interactive="member"
            x1={a.x * gs} y1={a.y * gs} x2={b.x * gs} y2={b.y * gs}
            stroke="transparent" strokeWidth={14}
            style={{ cursor: buildTool === 'delete' || buildTool === 'select' ? 'pointer' : 'default' }}
            onMouseEnter={() => setHovered({ type: 'member', id: m.id })}
            onMouseLeave={() => setHovered(null)}
            onClick={(e) => { e.stopPropagation(); onMemberInteract(m); }}
          />
        );
      })}

      {/* Interaction overlays - nodes */}
      {nodes.map((n) => (
        <circle
          key={`i-${n.id}`}
          data-interactive="node"
          cx={n.x * gs} cy={n.y * gs} r={NODE_R + 6}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHovered({ type: 'node', id: n.id })}
          onMouseLeave={() => setHovered(null)}
          onClick={(e) => { e.stopPropagation(); onNodeInteract(n); }}
          onMouseDown={(e) => { e.stopPropagation(); onNodeDown(n.id); }}
        />
      ))}

      {/* Tooltips */}
      {hNodeData && (
        <Tooltip x={hNodeData.x * gs} y={hNodeData.y * gs} lines={[
          hNodeData.id,
          `(${hNodeData.x}, ${hNodeData.y}) ${hNodeData.type === 'deck' ? '桥面' : hNodeData.type === 'support' ? '支座' : '自由'}`,
          ...(hNodeData.type === 'support' && hNodeData.reactionForce
            ? [`反力: Fx=${hNodeData.reactionForce.fx.toFixed(1)} Fy=${hNodeData.reactionForce.fy.toFixed(1)}`]
            : []),
          ...(hNodeData.isStable === false ? ['⚠ 不稳定'] : []),
        ]} />
      )}
      {hMemberData && (
        <Tooltip
          x={(nodeMap[hMemberData.nodeAId]!.x + nodeMap[hMemberData.nodeBId]!.x) / 2 * gs}
          y={(nodeMap[hMemberData.nodeAId]!.y + nodeMap[hMemberData.nodeBId]!.y) / 2 * gs}
          lines={[
            hMemberData.id,
            `内力: ${hMemberData.internalForce.toFixed(1)} kN`,
            `应力比: ${hMemberData.stressRatio.toFixed(2)}`,
            `材料: ${hMemberData.materialType}`,
          ]}
        />
      )}
    </svg>
  );
}
