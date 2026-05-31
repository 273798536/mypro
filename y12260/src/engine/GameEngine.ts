import { GameState, Position, PlacedDevice, Cable, WalkPath, Action, DeviceType, ToolType, Level } from '@/types';
import { ConflictDetector } from './ConflictDetector';
import { ScoreCalculator } from './ScoreCalculator';
import { getDeviceOccupiedCells, isPositionInGrid, isPositionBlocked, isSamePosition } from '@/utils/gridUtils';
import { generateCablePath } from '@/utils/cableUtils';
import { DEVICES, CABLE_COLORS, MUSICIAN_COLORS } from '@/data/devices';
import { DEFAULT_LEVEL } from '@/data/levels';

const GAME_VERSION = 'v1.0.0';

export class GameEngine {
  static createInitialState(level: Level = DEFAULT_LEVEL): GameState {
    return {
      status: 'idle',
      timeLeft: level.timeLimit,
      totalTime: level.timeLimit,
      score: 0,
      baseScore: 0,
      penalties: 0,
      level,
      placedDevices: [],
      cables: [],
      walkPaths: [],
      conflicts: [],
      history: [],
      currentTool: 'select',
      selectedDevice: null,
      cableStart: null,
      walkStart: null,
      walkPoints: [],
      gameStartTime: null,
      gameEndTime: null,
      reportMetadata: null
    };
  }

  private static generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static addHistory(state: GameState, action: Omit<Action, 'id' | 'timestamp'>): GameState {
    const historyAction: Action = {
      id: this.generateId('action'),
      timestamp: Date.now(),
      ...action
    };
    return {
      ...state,
      history: [...state.history, historyAction]
    };
  }

  static startGame(state: GameState): GameState {
    const newState: GameState = {
      ...state,
      status: 'playing',
      gameStartTime: Date.now(),
      reportMetadata: {
        gameVersion: GAME_VERSION,
        playedAt: new Date().toISOString()
      }
    };
    return this.addHistory(newState, { type: 'place_device' as any, payload: { action: 'start_game' } });
  }

  static pauseGame(state: GameState): GameState {
    if (state.status !== 'playing') return state;
    return { ...state, status: 'paused' };
  }

  static resumeGame(state: GameState): GameState {
    if (state.status !== 'paused') return state;
    return { ...state, status: 'playing' };
  }

  static restartGame(state: GameState): GameState {
    return this.createInitialState(state.level);
  }

  static finishGame(state: GameState): GameState {
    const conflicts = ConflictDetector.detectAll({
      placedDevices: state.placedDevices,
      cables: state.cables,
      walkPaths: state.walkPaths,
      level: state.level
    });

    const scoreResult = ScoreCalculator.calculate(
      state.placedDevices,
      state.cables,
      state.walkPaths,
      conflicts,
      state.level,
      state.timeLeft,
      state.totalTime
    );

    return {
      ...state,
      status: 'finished',
      conflicts,
      score: scoreResult.totalScore,
      baseScore: scoreResult.baseScore,
      penalties: scoreResult.penalties,
      gameEndTime: Date.now()
    };
  }

  static tick(state: GameState): GameState {
    if (state.status !== 'playing') return state;
    
    const newTimeLeft = state.timeLeft - 1;
    
    if (newTimeLeft <= 0) {
      return this.finishGame({ ...state, timeLeft: 0 });
    }

    const conflicts = ConflictDetector.detectAll({
      placedDevices: state.placedDevices,
      cables: state.cables,
      walkPaths: state.walkPaths,
      level: state.level
    });

    const scoreResult = ScoreCalculator.calculate(
      state.placedDevices,
      state.cables,
      state.walkPaths,
      conflicts,
      state.level,
      newTimeLeft,
      state.totalTime
    );

    return {
      ...state,
      timeLeft: newTimeLeft,
      conflicts,
      score: scoreResult.totalScore,
      baseScore: scoreResult.baseScore,
      penalties: scoreResult.penalties
    };
  }

  static setTool(state: GameState, tool: ToolType): GameState {
    return {
      ...state,
      currentTool: tool,
      cableStart: null,
      walkStart: null,
      walkPoints: []
    };
  }

  static selectDevice(state: GameState, deviceType: DeviceType | null): GameState {
    return {
      ...state,
      selectedDevice: deviceType,
      currentTool: deviceType ? 'place' : 'select',
      cableStart: null,
      walkStart: null,
      walkPoints: []
    };
  }

  static canPlaceDevice(
    state: GameState,
    position: Position,
    deviceType: DeviceType
  ): { canPlace: boolean; reason?: string } {
    const device = DEVICES[deviceType];
    const cells = getDeviceOccupiedCells(position, deviceType);

    for (const cell of cells) {
      if (!isPositionInGrid(cell, state.level.gridSize)) {
        return { canPlace: false, reason: '设备超出舞台边界' };
      }
      if (isPositionBlocked(cell, state.level.blockedAreas)) {
        return { canPlace: false, reason: '位置是禁止区域' };
      }
      for (const placedDevice of state.placedDevices) {
        const placedCells = getDeviceOccupiedCells(placedDevice.position, placedDevice.deviceType);
        if (placedCells.some(c => isSamePosition(c, cell))) {
          return { canPlace: false, reason: '与其他设备重叠' };
        }
      }
    }

    const required = state.level.requiredDevices.find(d => d.type === deviceType);
    const placedCount = state.placedDevices.filter(d => d.deviceType === deviceType).length;
    if (required && placedCount >= required.count) {
      return { canPlace: false, reason: `${device.name}已达到要求数量` };
    }

    return { canPlace: true };
  }

  static placeDevice(state: GameState, position: Position, deviceType: DeviceType, name: string): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;
    
    const { canPlace } = this.canPlaceDevice(state, position, deviceType);
    if (!canPlace) return state;

    const placedDevice: PlacedDevice = {
      id: this.generateId('device'),
      deviceType,
      position,
      placedAt: Date.now(),
      name
    };

    let newState = {
      ...state,
      placedDevices: [...state.placedDevices, placedDevice]
    };

    newState = this.addHistory(newState, {
      type: 'place_device',
      payload: { device: placedDevice }
    });

    if (state.status === 'playing') {
      const conflicts = ConflictDetector.detectAll({
        placedDevices: newState.placedDevices,
        cables: newState.cables,
        walkPaths: newState.walkPaths,
        level: newState.level
      });

      const scoreResult = ScoreCalculator.calculate(
        newState.placedDevices,
        newState.cables,
        newState.walkPaths,
        conflicts,
        newState.level,
        newState.timeLeft,
        newState.totalTime
      );

      newState = {
        ...newState,
        conflicts,
        score: scoreResult.totalScore,
        baseScore: scoreResult.baseScore,
        penalties: scoreResult.penalties
      };
    }

    return newState;
  }

  static removeDevice(state: GameState, deviceId: string): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;

    const device = state.placedDevices.find(d => d.id === deviceId);
    if (!device) return state;

    const remainingCables = state.cables.filter(cable => {
      const fromOnDevice = getDeviceOccupiedCells(device.position, device.deviceType)
        .some(c => isSamePosition(c, cable.from));
      const toOnDevice = getDeviceOccupiedCells(device.position, device.deviceType)
        .some(c => isSamePosition(c, cable.to));
      return !fromOnDevice && !toOnDevice;
    });

    let newState = {
      ...state,
      placedDevices: state.placedDevices.filter(d => d.id !== deviceId),
      cables: remainingCables
    };

    newState = this.addHistory(newState, {
      type: 'remove_device',
      payload: { deviceId }
    });

    if (state.status === 'playing') {
      const conflicts = ConflictDetector.detectAll({
        placedDevices: newState.placedDevices,
        cables: newState.cables,
        walkPaths: newState.walkPaths,
        level: newState.level
      });

      const scoreResult = ScoreCalculator.calculate(
        newState.placedDevices,
        newState.cables,
        newState.walkPaths,
        conflicts,
        newState.level,
        newState.timeLeft,
        newState.totalTime
      );

      newState = {
        ...newState,
        conflicts,
        score: scoreResult.totalScore,
        baseScore: scoreResult.baseScore,
        penalties: scoreResult.penalties
      };
    }

    return newState;
  }

  static handleCableClick(state: GameState, position: Position): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;

    if (!state.cableStart) {
      const hasDevice = state.placedDevices.some(d => {
        const cells = getDeviceOccupiedCells(d.position, d.deviceType);
        return cells.some(c => isSamePosition(c, position));
      });

      if (!hasDevice) return state;

      return { ...state, cableStart: position };
    }

    const hasDevice = state.placedDevices.some(d => {
      const cells = getDeviceOccupiedCells(d.position, d.deviceType);
      return cells.some(c => isSamePosition(c, position));
    });

    if (!hasDevice || isSamePosition(state.cableStart, position)) {
      return { ...state, cableStart: null };
    }

    const fromDevice = state.placedDevices.find(d => {
      const cells = getDeviceOccupiedCells(d.position, d.deviceType);
      return cells.some(c => isSamePosition(c, state.cableStart!));
    });
    const toDevice = state.placedDevices.find(d => {
      const cells = getDeviceOccupiedCells(d.position, d.deviceType);
      return cells.some(c => isSamePosition(c, position));
    });

    const cableColor = CABLE_COLORS[state.cables.length % CABLE_COLORS.length];
    const cable: Cable = {
      id: this.generateId('cable'),
      from: state.cableStart,
      to: position,
      color: cableColor,
      points: generateCablePath(state.cableStart, position),
      label: `${fromDevice?.name || '设备'} → ${toDevice?.name || '设备'}`
    };

    let newState = {
      ...state,
      cables: [...state.cables, cable],
      cableStart: null
    };

    newState = this.addHistory(newState, {
      type: 'draw_cable',
      payload: { cable }
    });

    if (state.status === 'playing') {
      const conflicts = ConflictDetector.detectAll({
        placedDevices: newState.placedDevices,
        cables: newState.cables,
        walkPaths: newState.walkPaths,
        level: newState.level
      });

      const scoreResult = ScoreCalculator.calculate(
        newState.placedDevices,
        newState.cables,
        newState.walkPaths,
        conflicts,
        newState.level,
        newState.timeLeft,
        newState.totalTime
      );

      newState = {
        ...newState,
        conflicts,
        score: scoreResult.totalScore,
        baseScore: scoreResult.baseScore,
        penalties: scoreResult.penalties
      };
    }

    return newState;
  }

  static removeCable(state: GameState, cableId: string): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;

    let newState = {
      ...state,
      cables: state.cables.filter(c => c.id !== cableId)
    };

    newState = this.addHistory(newState, {
      type: 'remove_cable',
      payload: { cableId }
    });

    if (state.status === 'playing') {
      const conflicts = ConflictDetector.detectAll({
        placedDevices: newState.placedDevices,
        cables: newState.cables,
        walkPaths: newState.walkPaths,
        level: newState.level
      });

      const scoreResult = ScoreCalculator.calculate(
        newState.placedDevices,
        newState.cables,
        newState.walkPaths,
        conflicts,
        newState.level,
        newState.timeLeft,
        newState.totalTime
      );

      newState = {
        ...newState,
        conflicts,
        score: scoreResult.totalScore,
        baseScore: scoreResult.baseScore,
        penalties: scoreResult.penalties
      };
    }

    return newState;
  }

  static handleWalkClick(state: GameState, position: Position, musician: string): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;

    if (!state.walkStart) {
      return { ...state, walkStart: position, walkPoints: [position] };
    }

    const lastPoint = state.walkPoints[state.walkPoints.length - 1];
    const isAdjacent = 
      (Math.abs(position.x - lastPoint.x) === 1 && position.y === lastPoint.y) ||
      (Math.abs(position.y - lastPoint.y) === 1 && position.x === lastPoint.x);

    if (!isAdjacent) {
      return { ...state, walkStart: position, walkPoints: [position] };
    }

    const isEndpoint = state.walkPoints.length > 2 && 
      (isSamePosition(position, state.walkPoints[0]) || 
       state.placedDevices.some(d => {
         const cells = getDeviceOccupiedCells(d.position, d.deviceType);
         return cells.some(c => isSamePosition(c, position));
       }));

    const newWalkPoints = [...state.walkPoints, position];

    if (isEndpoint) {
      const walkPath: WalkPath = {
        id: this.generateId('path'),
        musician,
        points: newWalkPoints,
        color: MUSICIAN_COLORS[musician] || '#A855F7'
      };

      let newState = {
        ...state,
        walkPaths: [...state.walkPaths, walkPath],
        walkStart: null,
        walkPoints: []
      };

      newState = this.addHistory(newState, {
        type: 'draw_path',
        payload: { path: walkPath }
      });

      if (state.status === 'playing') {
        const conflicts = ConflictDetector.detectAll({
          placedDevices: newState.placedDevices,
          cables: newState.cables,
          walkPaths: newState.walkPaths,
          level: newState.level
        });

        const scoreResult = ScoreCalculator.calculate(
          newState.placedDevices,
          newState.cables,
          newState.walkPaths,
          conflicts,
          newState.level,
          newState.timeLeft,
          newState.totalTime
        );

        newState = {
          ...newState,
          conflicts,
          score: scoreResult.totalScore,
          baseScore: scoreResult.baseScore,
          penalties: scoreResult.penalties
        };
      }

      return newState;
    }

    return { ...state, walkPoints: newWalkPoints };
  }

  static removeWalkPath(state: GameState, pathId: string): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;

    let newState = {
      ...state,
      walkPaths: state.walkPaths.filter(p => p.id !== pathId)
    };

    newState = this.addHistory(newState, {
      type: 'remove_path',
      payload: { pathId }
    });

    if (state.status === 'playing') {
      const conflicts = ConflictDetector.detectAll({
        placedDevices: newState.placedDevices,
        cables: newState.cables,
        walkPaths: newState.walkPaths,
        level: newState.level
      });

      const scoreResult = ScoreCalculator.calculate(
        newState.placedDevices,
        newState.cables,
        newState.walkPaths,
        conflicts,
        newState.level,
        newState.timeLeft,
        newState.totalTime
      );

      newState = {
        ...newState,
        conflicts,
        score: scoreResult.totalScore,
        baseScore: scoreResult.baseScore,
        penalties: scoreResult.penalties
      };
    }

    return newState;
  }

  static handleGridClick(state: GameState, position: Position): GameState {
    if (state.status !== 'playing' && state.status !== 'idle') return state;

    switch (state.currentTool) {
      case 'place':
        if (state.selectedDevice) {
          const count = state.placedDevices.filter(d => d.deviceType === state.selectedDevice).length;
          const name = `${DEVICES[state.selectedDevice].name}${count > 0 ? count + 1 : ''}`;
          return this.placeDevice(state, position, state.selectedDevice, name);
        }
        return state;
      
      case 'cable':
        return this.handleCableClick(state, position);
      
      case 'walk':
        return this.handleWalkClick(state, position, '主唱');
      
      case 'delete':
        const deviceToRemove = state.placedDevices.find(d => {
          const cells = getDeviceOccupiedCells(d.position, d.deviceType);
          return cells.some(c => isSamePosition(c, position));
        });
        if (deviceToRemove) {
          return this.removeDevice(state, deviceToRemove.id);
        }

        const cableToRemove = state.cables.find(c => 
          c.points.some(p => isSamePosition(p, position))
        );
        if (cableToRemove) {
          return this.removeCable(state, cableToRemove.id);
        }

        const pathToRemove = state.walkPaths.find(p =>
          p.points.some(pt => isSamePosition(pt, position))
        );
        if (pathToRemove) {
          return this.removeWalkPath(state, pathToRemove.id);
        }
        return state;
      
      default:
        return state;
    }
  }

  static generateHumanReport(state: GameState): string {
    const scoreResult = ScoreCalculator.calculate(
      state.placedDevices,
      state.cables,
      state.walkPaths,
      state.conflicts,
      state.level,
      state.timeLeft,
      state.totalTime
    );

    const cableConflicts = state.conflicts.filter(c => c.type === 'cable_cross');
    const deviceConflicts = state.conflicts.filter(c => c.type === 'device_block');
    const walkConflicts = state.conflicts.filter(c => c.type === 'walk_conflict');

    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN');

    let report = `# 乐队设备抢修夜 - 调度报告\n\n`;
    report += `**生成时间**: ${timeStr}\n`;
    report += `**游戏版本**: ${state.reportMetadata?.gameVersion || GAME_VERSION}\n`;
    report += `**关卡**: ${state.level.name}\n`;
    report += `**关卡版本**: ${state.level.version}\n`;
    report += `**关卡来源**: ${state.level.source}\n\n`;
    
    report += `## 📊 得分总览\n\n`;
    report += `| 项目 | 分数 |\n`;
    report += `|------|------|\n`;
    report += `| 设备摆放 | +${scoreResult.deviceScore} |\n`;
    report += `| 线缆连接 | +${scoreResult.cableScore} |\n`;
    report += `| 走位规划 | +${scoreResult.pathScore} |\n`;
    report += `| 时间奖励 | +${scoreResult.timeBonus} |\n`;
    report += `| **冲突扣分** | **-${scoreResult.penalties}** |\n`;
    report += `| **最终得分** | **${scoreResult.totalScore}** |\n\n`;
    
    report += `### 评级: ${scoreResult.rating}\n\n`;
    report += `> ${ScoreCalculator.getRatingDescription(scoreResult.rating)}\n\n`;
    
    report += `## ⚠️  冲突详情\n\n`;
    
    if (cableConflicts.length > 0) {
      report += `### 🔗 线缆穿越问题 (${cableConflicts.length}处)\n\n`;
      cableConflicts.forEach((conflict, idx) => {
        report += `#### ${idx + 1}. ${conflict.description}\n\n`;
        report += `- **扣分**: ${conflict.penalty}分\n`;
        report += `- **位置**: ${conflict.positions.map(p => `(${p.x},${p.y})`).join('、')}\n\n`;
        report += `**人话解释**:\n\n${conflict.humanExplanation}\n\n`;
      });
    }
    
    if (deviceConflicts.length > 0) {
      report += `### 📦 设备遮挡问题 (${deviceConflicts.length}处)\n\n`;
      deviceConflicts.forEach((conflict, idx) => {
        report += `#### ${idx + 1}. ${conflict.description}\n\n`;
        report += `- **扣分**: ${conflict.penalty}分\n`;
        report += `- **位置**: ${conflict.positions.map(p => `(${p.x},${p.y})`).join('、')}\n\n`;
        report += `**人话解释**:\n\n${conflict.humanExplanation}\n\n`;
      });
    }
    
    if (walkConflicts.length > 0) {
      report += `### 🚶 走位冲突问题 (${walkConflicts.length}处)\n\n`;
      walkConflicts.forEach((conflict, idx) => {
        report += `#### ${idx + 1}. ${conflict.description}\n\n`;
        report += `- **扣分**: ${conflict.penalty}分\n`;
        report += `- **位置**: ${conflict.positions.map(p => `(${p.x},${p.y})`).join('、')}\n\n`;
        report += `**人话解释**:\n\n${conflict.humanExplanation}\n\n`;
      });
    }
    
    if (state.conflicts.length === 0) {
      report += `🎉 **太棒了！没有发现任何冲突！** 你的调度非常完美，可以直接用于现场演出。\n\n`;
    }
    
    report += `## 💡 改进建议\n\n`;
    
    if (cableConflicts.length > 0) {
      report += `1. **线缆管理**: 尝试让线缆走不同的高度层（横向走上面、纵向走下面），避免直接交叉。如果设备位置允许，也可以调整设备摆放位置来缩短线缆距离。\n`;
    }
    
    if (deviceConflicts.length > 0) {
      report += `2. **设备摆放**: 先放大设备（调音台、主音箱），再放小设备（麦克风架、效果器）。注意避开标记的禁止区域，那是为演出安全预留的空间。\n`;
    }
    
    if (walkConflicts.length > 0) {
      report += `3. **走位规划**: 乐手的移动路线要尽量简洁，不要让他们频繁穿线或者穿过设备区。想象一下乐手拿着乐器在台上走的样子，路线要自然流畅。\n`;
    }
    
    if (state.conflicts.length === 0) {
      report += `继续保持！可以挑战更短的时间完成布置，或者尝试更复杂的关卡。\n`;
    }
    
    report += `\n---\n\n`;
    report += `*本报告由「乐队设备抢修夜」游戏生成，用于演出制作团队的调度训练和沟通。*\n`;

    return report;
  }
}
