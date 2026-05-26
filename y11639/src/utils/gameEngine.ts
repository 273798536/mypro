import type {
  GameState,
  LevelConfig,
  RepairTeam,
  Area,
  LogEntry,
  FailReason,
  DispatchAction,
  ValidationResult
} from '../types/game';
import { getWeatherForRound } from '../data/levels';
import { validateDispatch, validateRecall, checkTimeouts } from './validation';
import { SKILL_LABELS, AREA_TYPE_LABELS, TEAM_STATUS_LABELS } from '../types/game';

interface InternalGameState extends GameState {
  level: LevelConfig;
  baseExecuteRounds: number;
  baseCooldownRounds: number;
}

export function createInitialState(level: LevelConfig): InternalGameState {
  const teams: RepairTeam[] = level.initialTeams.map(t => ({
    ...t,
    status: 'idle',
    cooldown: 0,
    currentTarget: null,
    executeRounds: 0
  }));

  const areas: Area[] = level.initialAreas.map(a => ({
    ...a,
    powerStatus: 'blackout',
    timeoutRounds: level.timeoutThreshold
  }));

  const weather = getWeatherForRound(level, 0);

  const initialLog: LogEntry = {
    round: 0,
    timestamp: Date.now(),
    type: 'system',
    level: 'info',
    message: `关卡 [${level.name}] 开始！共 ${level.maxRounds} 回合，当前天气: ${weather.description}`,
    source: 'game.init'
  };

  return {
    currentRound: 1,
    maxRounds: level.maxRounds,
    teams,
    areas,
    spareParts: [...level.initialSpareParts],
    weather,
    logs: [initialLog],
    score: 0,
    gameOver: false,
    failReasons: [],
    dispatchHistory: [],
    stateSnapshots: [],
    level,
    baseExecuteRounds: level.baseExecuteRounds,
    baseCooldownRounds: level.baseCooldownRounds,
    sparePartPerRepair: level.sparePartPerRepair
  };
}

function createLog(
  round: number,
  type: LogEntry['type'],
  level: LogEntry['level'],
  message: string,
  source: string,
  line?: number
): LogEntry {
  return { round, timestamp: Date.now(), type, level, message, source, line };
}

function createFailReason(
  round: number,
  type: FailReason['type'],
  description: string,
  detail: string,
  source: string,
  areaId?: string,
  teamId?: string
): FailReason {
  return { round, type, description, detail, source, areaId, teamId };
}

function cloneState(state: InternalGameState): InternalGameState {
  return JSON.parse(JSON.stringify(state));
}

export function dispatchTeam(
  state: InternalGameState,
  teamId: string,
  areaId: string
): { state: InternalGameState; validation: ValidationResult } {
  const team = state.teams.find(t => t.id === teamId);
  const area = state.areas.find(a => a.id === areaId);

  if (!team) {
    return {
      state,
      validation: {
        valid: false,
        error: {
          type: 'other',
          message: '队伍不存在',
          detail: `找不到ID为 [${teamId}] 的队伍`,
          source: `teams.find(t => t.id === ${teamId})`
        }
      }
    };
  }

  if (!area) {
    return {
      state,
      validation: {
        valid: false,
        error: {
          type: 'other',
          message: '区域不存在',
          detail: `找不到ID为 [${areaId}] 的区域`,
          source: `areas.find(a => a.id === ${areaId})`
        }
      }
    };
  }

  const validation = validateDispatch(team, area, state);
  if (!validation.valid && validation.error) {
    const newState = cloneState(state);
    newState.logs.push(
      createLog(
        state.currentRound,
        'error',
        'error',
        `派遣失败: ${validation.error.message}`,
        validation.error.source
      )
    );
    newState.failReasons.push(
      createFailReason(
        state.currentRound,
        validation.error.type,
        validation.error.message,
        validation.error.detail,
        validation.error.source,
        areaId,
        teamId
      )
    );
    return { state: newState, validation };
  }

  const newState = cloneState(state);
  const newTeam = newState.teams.find(t => t.id === teamId)!;
  const newArea = newState.areas.find(a => a.id === areaId)!;

  const executeRounds = state.baseExecuteRounds + state.weather.cooldownModifier;
  newTeam.status = 'executing';
  newTeam.currentTarget = areaId;
  newTeam.executeRounds = executeRounds;

  const sparePartName = getSparePartName(area.requiredSkill);
  const sparePart = newState.spareParts.find(p => p.name === sparePartName);
  if (sparePart) {
    sparePart.quantity -= state.sparePartPerRepair;
  }

  const action: DispatchAction = {
    teamId,
    areaId,
    round: state.currentRound,
    timestamp: Date.now()
  };
  newState.dispatchHistory.push(action);

  newState.logs.push(
    createLog(
      state.currentRound,
      'dispatch',
      'success',
      `派遣 ${team.name} → ${area.name}（${AREA_TYPE_LABELS[area.type]}），预计 ${executeRounds} 回合完成`,
      `teams[${teamId}].dispatch → areas[${areaId}]`,
      state.currentRound
    )
  );

  return { state: newState, validation };
}

export function recallTeam(
  state: InternalGameState,
  teamId: string
): { state: InternalGameState; validation: ValidationResult } {
  const team = state.teams.find(t => t.id === teamId);

  if (!team) {
    return {
      state,
      validation: {
        valid: false,
        error: {
          type: 'other',
          message: '队伍不存在',
          detail: `找不到ID为 [${teamId}] 的队伍`,
          source: `teams.find(t => t.id === ${teamId})`
        }
      }
    };
  }

  const validation = validateRecall(team, state);
  if (!validation.valid && validation.error) {
    const newState = cloneState(state);
    newState.logs.push(
      createLog(
        state.currentRound,
        'error',
        'error',
        `撤回失败: ${validation.error.message}`,
        validation.error.source
      )
    );
    return { state: newState, validation };
  }

  const newState = cloneState(state);
  const newTeam = newState.teams.find(t => t.id === teamId)!;
  const targetArea = newTeam.currentTarget
    ? newState.areas.find(a => a.id === newTeam.currentTarget)
    : null;

  newTeam.status = 'idle';
  newTeam.currentTarget = null;
  newTeam.executeRounds = 0;

  newState.logs.push(
    createLog(
      state.currentRound,
      'recall',
      'warning',
      `撤回 ${team.name}${targetArea ? `（原目标: ${targetArea.name}）` : ''}`,
      `teams[${teamId}].recall`,
      state.currentRound
    )
  );

  return { state: newState, validation };
}

export function endRound(state: InternalGameState): InternalGameState {
  let newState = cloneState(state);

  newState.teams.forEach(team => {
    if (team.status === 'executing') {
      team.executeRounds -= 1;
      if (team.executeRounds <= 0) {
        const area = newState.areas.find(a => a.id === team.currentTarget);
        if (area) {
          area.powerStatus = 'normal';
          area.timeoutRounds = newState.level.timeoutThreshold;
          newState.score += area.reward;
          newState.logs.push(
            createLog(
              state.currentRound,
              'score',
              'success',
              `${team.name} 完成 ${area.name} 抢修！+${area.reward} 分`,
              `teams[${team.id}].complete → areas[${area.id}]`,
              state.currentRound
            )
          );
        }
        team.status = 'cooling';
        team.cooldown = newState.baseCooldownRounds + newState.weather.cooldownModifier;
        team.currentTarget = null;
        team.executeRounds = 0;
      }
    } else if (team.status === 'cooling') {
      team.cooldown -= 1;
      if (team.cooldown <= 0) {
        team.status = 'idle';
        team.cooldown = 0;
      }
    }
  });

  newState.areas.forEach(area => {
    if (area.powerStatus !== 'normal') {
      area.timeoutRounds -= 1;
    }
  });

  const { timedOut } = checkTimeouts(newState);
  timedOut.forEach(area => {
    newState.score -= area.penalty;
    newState.logs.push(
      createLog(
        state.currentRound,
        'error',
        'error',
        `⚠ ${area.name}（${AREA_TYPE_LABELS[area.type]}）抢修超时！-${area.penalty} 分`,
        `areas[${area.id}].timeoutRounds <= 0`,
        state.currentRound
      )
    );
    newState.failReasons.push(
      createFailReason(
        state.currentRound,
        'timeout',
        `${area.name} 抢修超时`,
        `区域 [${area.name}]（${AREA_TYPE_LABELS[area.type]}）优先级 ${area.priority}，超时未完成抢修，扣除 ${area.penalty} 分`,
        `areas[${area.id}].timeoutRounds <= 0`,
        area.id
      )
    );
  });

  newState.currentRound += 1;

  if (newState.currentRound > newState.maxRounds) {
    newState.gameOver = true;
    const totalRepaired = newState.areas.filter(a => a.powerStatus === 'normal').length;
    newState.logs.push(
      createLog(
        state.currentRound,
        'system',
        'info',
        `游戏结束！最终得分: ${newState.score}，已修复区域: ${totalRepaired}/${newState.areas.length}`,
        'game.end'
      )
    );
  } else {
    newState.weather = getWeatherForRound(newState.level, newState.currentRound - 1);
    newState.logs.push(
      createLog(
        newState.currentRound,
        'weather',
        newState.weather.type === 'normal' ? 'info' : 'warning',
        `第 ${newState.currentRound} 回合 - 天气: ${newState.weather.description}`,
        `weather[${newState.currentRound - 1}]`
      )
    );
  }

  newState.stateSnapshots.push(cloneState(newState));

  return newState;
}

function getSparePartName(skill: string): string {
  const map: Record<string, string> = {
    line_repair: '电缆',
    transformer: '变压器',
    cable: '电缆',
    substation: '绝缘子'
  };
  return map[skill] || skill;
}

export function calculateMaxScore(level: LevelConfig): number {
  return level.initialAreas.reduce((sum, a) => sum + a.reward, 0);
}

export function toPublicState(state: InternalGameState): GameState {
  const { level, baseExecuteRounds, baseCooldownRounds, ...publicState } = state;
  return publicState;
}

export { type InternalGameState };