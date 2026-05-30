import { MaintenanceRecord, ConflictRecord, NetworkNode } from '../types/game';

export function detectConflicts(
  actions: MaintenanceRecord[],
  nodes: NetworkNode[]
): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  
  const nodeActions: Map<string, MaintenanceRecord[]> = new Map();
  
  actions.forEach(action => {
    const existing = nodeActions.get(action.nodeId) || [];
    nodeActions.set(action.nodeId, [...existing, action]);
  });
  
  nodeActions.forEach((nodeActionList, nodeId) => {
    if (nodeActionList.length >= 2) {
      const iceTeamRecord = nodeActionList.find(a => a.operator === 'ice_team');
      const recycleTeamRecord = nodeActionList.find(a => a.operator === 'recycle_team');
      
      if (iceTeamRecord && recycleTeamRecord) {
        const hasConflict = 
          (iceTeamRecord.effect.health !== undefined && recycleTeamRecord.effect.health !== undefined) ||
          (iceTeamRecord.effect.capacity !== undefined && recycleTeamRecord.effect.capacity !== undefined);
        
        if (hasConflict) {
          const node = nodes.find(n => n.id === nodeId);
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            round: iceTeamRecord.round,
            nodeId,
            iceTeamRecord,
            recycleTeamRecord,
            resolved: false,
          });
        }
      }
    }
  });
  
  return conflicts;
}

export function applyAction(
  nodes: NetworkNode[],
  action: MaintenanceRecord
): NetworkNode[] {
  return nodes.map(node => {
    if (node.id !== action.nodeId) return node;
    
    const updated = { ...node };
    
    if (action.effect.health !== undefined) {
      updated.health = Math.min(100, Math.max(0, updated.health + action.effect.health));
    }
    
    if (action.effect.capacity !== undefined) {
      updated.capacity = Math.max(0, updated.capacity + action.effect.capacity);
    }
    
    return updated;
  });
}

export function resolveConflictAndApply(
  nodes: NetworkNode[],
  conflict: ConflictRecord,
  chosenSide: 'ice' | 'recycle'
): { updatedNodes: NetworkNode[]; resolvedConflict: ConflictRecord } {
  const chosenRecord = chosenSide === 'ice' 
    ? conflict.iceTeamRecord 
    : conflict.recycleTeamRecord;
  
  const updatedNodes = applyAction(nodes, chosenRecord);
  
  const resolvedConflict: ConflictRecord = {
    ...conflict,
    resolved: true,
    chosenSide,
  };
  
  return { updatedNodes, resolvedConflict };
}
