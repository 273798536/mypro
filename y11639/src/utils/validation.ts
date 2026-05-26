import type { GameState, ValidationResult, RepairTeam, Area, SparePart } from '../types/game';
import { TEAM_STATUS_LABELS } from '../types/game';

export function validateDispatch(
  team: RepairTeam,
  area: Area,
  state: GameState
): ValidationResult {
  if (team.status === 'executing') {
    return {
      valid: false,
      error: {
        type: 'duplicate_dispatch',
        message: `${team.name} 正在执行任务，无法重复派遣`,
        detail: `队伍 [${team.name}] 当前状态: ${TEAM_STATUS_LABELS[team.status]}，目标: ${team.currentTarget || '未知'}。请等待执行完成或撤回。`,
        source: `teams[${team.id}].status === 'executing'`
      }
    };
  }

  if (team.status === 'cooling') {
    return {
      valid: false,
      error: {
        type: 'team_cooling',
        message: `${team.name} 正在冷却中（剩余 ${team.cooldown} 回合）`,
        detail: `队伍 [${team.name}] 冷却剩余: ${team.cooldown} 回合。请等待冷却结束后再派遣。`,
        source: `teams[${team.id}].cooldown > 0`
      }
    };
  }

  if (area.powerStatus === 'normal') {
    return {
      valid: false,
      error: {
        type: 'other',
        message: `${area.name} 供电正常，无需抢修`,
        detail: `区域 [${area.name}] 当前供电状态: 正常。请选择受损或停电的区域。`,
        source: `areas[${area.id}].powerStatus === 'normal'`
      }
    };
  }

  if (!team.skills.includes(area.requiredSkill)) {
    return {
      valid: false,
      error: {
        type: 'skill_mismatch',
        message: `${team.name} 不具备 ${area.name} 所需的抢修技能`,
        detail: `队伍 [${team.name}] 技能: ${team.skills.join('、')}。区域 [${area.name}] 需要: ${area.requiredSkill}。技能不匹配。`,
        source: `teams[${team.id}].skills.includes(areas[${area.id}].requiredSkill)`
      }
    };
  }

  const sparePart = findSparePart(state.spareParts, area.requiredSkill);
  if (sparePart && sparePart.quantity < state.sparePartPerRepair) {
    return {
      valid: false,
      error: {
        type: 'spare_parts_insufficient',
        message: `备件不足：${sparePart.name} 剩余 ${sparePart.quantity}，需要 ${state.sparePartPerRepair}`,
        detail: `区域 [${area.name}] 需要备件: ${sparePart.name}，当前库存: ${sparePart.quantity}，每次抢修消耗: ${state.sparePartPerRepair}。`,
        source: `spareParts[${sparePart.id}].quantity < sparePartPerRepair`
      }
    };
  }

  return { valid: true };
}

export function validateRecall(
  team: RepairTeam,
  _state: GameState
): ValidationResult {
  if (team.status === 'idle') {
    return {
      valid: false,
      error: {
        type: 'other',
        message: `${team.name} 处于待命状态，无需撤回`,
        detail: `队伍 [${team.name}] 当前状态: 待命。撤回操作仅适用于执行中的队伍。`,
        source: `teams[${team.id}].status === 'idle'`
      }
    };
  }

  if (team.status === 'cooling') {
    return {
      valid: false,
      error: {
        type: 'team_cooling',
        message: `${team.name} 正在冷却中，无法撤回`,
        detail: `队伍 [${team.name}] 冷却剩余: ${team.cooldown} 回合。冷却中的队伍无法撤回。`,
        source: `teams[${team.id}].status === 'cooling'`
      }
    };
  }

  return { valid: true };
}

function findSparePart(spareParts: SparePart[], skill: string): SparePart | undefined {
  const skillToPartMap: Record<string, string> = {
    line_repair: '电缆',
    transformer: '变压器',
    cable: '电缆',
    substation: '绝缘子'
  };
  const partName = skillToPartMap[skill] || skill;
  return spareParts.find(p => p.name === partName);
}

export function checkTimeouts(state: GameState): { timedOut: Area[] } {
  const timedOut = state.areas.filter(
    a => (a.powerStatus === 'damaged' || a.powerStatus === 'blackout') && a.timeoutRounds <= 0
  );
  return { timedOut };
}