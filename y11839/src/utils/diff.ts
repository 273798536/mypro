import type { BridgeNode, BridgeMember, DiffEntry } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function computeDiffs(
  currentNodes: BridgeNode[],
  currentMembers: BridgeMember[],
  incomingNodes: BridgeNode[],
  incomingMembers: BridgeMember[]
): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  const currentNodeMap = new Map(currentNodes.map((n) => [n.id, n]));
  const incomingNodeMap = new Map(incomingNodes.map((n) => [n.id, n]));

  for (const cn of currentNodes) {
    const inc = incomingNodeMap.get(cn.id);
    if (!inc) {
      diffs.push({
        type: 'removed',
        entityType: 'node',
        entityId: cn.id,
        field: 'all',
        currentSideValue: cn,
        incomingSideValue: null,
        description: `节点 ${cn.id} 在新方案中被删除（位置 ${cn.x.toFixed(1)}, ${cn.y.toFixed(1)}）`,
      });
    } else {
      if (Math.abs(cn.x - inc.x) > 0.01 || Math.abs(cn.y - inc.y) > 0.01) {
        diffs.push({
          type: 'modified',
          entityType: 'node',
          entityId: cn.id,
          field: 'position',
          currentSideValue: { x: cn.x, y: cn.y },
          incomingSideValue: { x: inc.x, y: inc.y },
          description: `节点 ${cn.id} 位置从 (${cn.x.toFixed(1)}, ${cn.y.toFixed(1)}) 改为 (${inc.x.toFixed(1)}, ${inc.y.toFixed(1)})`,
        });
      }
      if (cn.type !== inc.type) {
        diffs.push({
          type: 'modified',
          entityType: 'node',
          entityId: cn.id,
          field: 'type',
          currentSideValue: cn.type,
          incomingSideValue: inc.type,
          description: `节点 ${cn.id} 类型从 ${cn.type} 改为 ${inc.type}`,
        });
      }
    }
  }

  for (const inc of incomingNodes) {
    if (!currentNodeMap.has(inc.id)) {
      diffs.push({
        type: 'added',
        entityType: 'node',
        entityId: inc.id,
        field: 'all',
        currentSideValue: null,
        incomingSideValue: inc,
        description: `新增节点 ${inc.id}（位置 ${inc.x.toFixed(1)}, ${inc.y.toFixed(1)}，类型 ${inc.type}）`,
      });
    }
  }

  const currentMemberMap = new Map(currentMembers.map((m) => [m.id, m]));
  const incomingMemberMap = new Map(incomingMembers.map((m) => [m.id, m]));

  for (const cm of currentMembers) {
    const inc = incomingMemberMap.get(cm.id);
    if (!inc) {
      diffs.push({
        type: 'removed',
        entityType: 'member',
        entityId: cm.id,
        field: 'all',
        currentSideValue: cm,
        incomingSideValue: null,
        description: `杆件 ${cm.id}（${cm.nodeAId}-${cm.nodeBId}）在新方案中被删除`,
      });
    } else {
      if (cm.materialType !== inc.materialType) {
        diffs.push({
          type: 'modified',
          entityType: 'member',
          entityId: cm.id,
          field: 'materialType',
          currentSideValue: cm.materialType,
          incomingSideValue: inc.materialType,
          description: `杆件 ${cm.id} 材料从 ${cm.materialType} 改为 ${inc.materialType}`,
        });
      }
      if (Math.abs(cm.crossSection - inc.crossSection) > 0.01) {
        diffs.push({
          type: 'modified',
          entityType: 'member',
          entityId: cm.id,
          field: 'crossSection',
          currentSideValue: cm.crossSection,
          incomingSideValue: inc.crossSection,
          description: `杆件 ${cm.id} 截面积从 ${cm.crossSection} cm² 改为 ${inc.crossSection} cm²`,
        });
      }
    }
  }

  for (const inc of incomingMembers) {
    if (!currentMemberMap.has(inc.id)) {
      diffs.push({
        type: 'added',
        entityType: 'member',
        entityId: inc.id,
        field: 'all',
        currentSideValue: null,
        incomingSideValue: inc,
        description: `新增杆件 ${inc.id}（${inc.nodeAId}-${inc.nodeBId}，材料 ${inc.materialType}）`,
      });
    }
  }

  return diffs;
}

export function generateIncomingChanges(
  currentNodes: BridgeNode[],
  currentMembers: BridgeMember[]
): { nodes: BridgeNode[]; members: BridgeMember[] } {
  const newNodes = currentNodes.map((n) => ({ ...n }));
  const newMembers = currentMembers.map((m) => ({ ...m }));

  const deckNodes = newNodes.filter((n) => n.type === 'deck');
  if (deckNodes.length > 0) {
    const target = deckNodes[Math.floor(Math.random() * deckNodes.length)];
    target.x += (Math.random() - 0.5) * 1.0;
    target.y += (Math.random() - 0.5) * 0.5;
    target.x = Math.round(target.x * 2) / 2;
    target.y = Math.round(target.y * 2) / 2;
  }

  if (Math.random() > 0.6 && deckNodes.length > 1) {
    const baseNode = deckNodes[Math.floor(Math.random() * deckNodes.length)];
    const newNode: BridgeNode = {
      id: `n-merge-${generateId()}`,
      x: Math.round((baseNode.x + (Math.random() - 0.5) * 2) * 2) / 2,
      y: Math.round((baseNode.y + (Math.random() - 0.5)) * 2) / 2,
      type: 'free',
      isFixed: false,
    };
    newNodes.push(newNode);
  }

  if (newMembers.length > 0 && Math.random() > 0.5) {
    const target = newMembers[Math.floor(Math.random() * newMembers.length)];
    const materials: Array<'steel' | 'aluminum' | 'wood'> = ['steel', 'aluminum', 'wood'];
    const currentIdx = materials.indexOf(target.materialType);
    const newIdx = (currentIdx + 1 + Math.floor(Math.random() * 2)) % 3;
    target.materialType = materials[newIdx];
  }

  if (newMembers.length > 2 && Math.random() > 0.7) {
    const idx = Math.floor(Math.random() * newMembers.length);
    newMembers.splice(idx, 1);
  }

  return { nodes: newNodes, members: newMembers };
}

export function applyMergeResolution(
  currentNodes: BridgeNode[],
  currentMembers: BridgeMember[],
  incomingNodes: BridgeNode[],
  incomingMembers: BridgeMember[],
  diffs: DiffEntry[],
  resolution: Record<string, 'current' | 'incoming'>
): { nodes: BridgeNode[]; members: BridgeMember[] } {
  const resultNodes = new Map(currentNodes.map((n) => [n.id, { ...n }]));
  const resultMembers = new Map(currentMembers.map((m) => [m.id, { ...m }]));
  const incomingNodeMap = new Map(incomingNodes.map((n) => [n.id, { ...n }]));
  const incomingMemberMap = new Map(incomingMembers.map((m) => [m.id, { ...m }]));

  for (const diff of diffs) {
    const choice = resolution[diff.entityId + '.' + diff.field] || resolution[diff.entityId] || 'current';

    if (choice === 'incoming') {
      if (diff.entityType === 'node') {
        if (diff.type === 'added') {
          const inc = incomingNodeMap.get(diff.entityId);
          if (inc) resultNodes.set(diff.entityId, inc);
        } else if (diff.type === 'removed') {
          resultNodes.delete(diff.entityId);
        } else if (diff.type === 'modified') {
          const existing = resultNodes.get(diff.entityId);
          const inc = incomingNodeMap.get(diff.entityId);
          if (existing && inc) {
            if (diff.field === 'position') {
              existing.x = inc.x;
              existing.y = inc.y;
            } else if (diff.field === 'type') {
              existing.type = inc.type;
            } else if (diff.field === 'all') {
              resultNodes.set(diff.entityId, inc);
            }
          }
        }
      } else if (diff.entityType === 'member') {
        if (diff.type === 'added') {
          const inc = incomingMemberMap.get(diff.entityId);
          if (inc) resultMembers.set(diff.entityId, inc);
        } else if (diff.type === 'removed') {
          resultMembers.delete(diff.entityId);
        } else if (diff.type === 'modified') {
          const existing = resultMembers.get(diff.entityId);
          const inc = incomingMemberMap.get(diff.entityId);
          if (existing && inc) {
            if (diff.field === 'materialType') {
              existing.materialType = inc.materialType;
            } else if (diff.field === 'crossSection') {
              existing.crossSection = inc.crossSection;
            } else if (diff.field === 'all') {
              resultMembers.set(diff.entityId, inc);
            }
          }
        }
      }
    }
  }

  return {
    nodes: Array.from(resultNodes.values()),
    members: Array.from(resultMembers.values()),
  };
}
