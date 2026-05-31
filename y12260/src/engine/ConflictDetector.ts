import { Conflict, PlacedDevice, Cable, WalkPath, Position, Level } from '@/types';
import { doCablesIntersect } from '@/utils/cableUtils';
import { getDeviceOccupiedCells, isSamePosition, isPositionBlocked, positionToKey } from '@/utils/gridUtils';
import { doesPathPassThroughPositions, doPathsCross } from '@/utils/pathUtils';
import { DEVICES } from '@/data/devices';

export interface ConflictDetectionInput {
  placedDevices: PlacedDevice[];
  cables: Cable[];
  walkPaths: WalkPath[];
  level: Level;
}

export class ConflictDetector {
  private static generateId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static detectAll(input: ConflictDetectionInput): Conflict[] {
    const conflicts: Conflict[] = [];
    
    conflicts.push(...this.detectCableCrosses(input.cables));
    conflicts.push(...this.detectDeviceBlocks(input.placedDevices, input.level));
    conflicts.push(...this.detectWalkConflicts(input.walkPaths, input.placedDevices, input.cables));
    
    return conflicts;
  }

  static detectCableCrosses(cables: Cable[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    for (let i = 0; i < cables.length; i++) {
      for (let j = i + 1; j < cables.length; j++) {
        const intersections = doCablesIntersect(cables[i].points, cables[j].points);
        
        if (intersections.length > 0) {
          const conflict: Conflict = {
            id: this.generateId(),
            type: 'cable_cross',
            severity: 'error',
            positions: intersections,
            description: `线缆"${cables[i].label}"与"${cables[j].label}"发生交叉`,
            penalty: 30,
            involvedElements: [cables[i].id, cables[j].id],
            humanExplanation: `这就像两条路在十字路口没有红绿灯——"${cables[i].label}"和"${cables[j].label}"这两根线缆在网格位置${intersections.map(p => `(${p.x},${p.y})`).join('、')}处缠在了一起。演出时如果有人绊到或者信号互相干扰，那就是现场事故了！试着让它们走不同的"车道"，一根走高、一根走低，或者调整设备位置从源头避开。`
          };
          conflicts.push(conflict);
        }
      }
    }
    
    return conflicts;
  }

  static detectDeviceBlocks(placedDevices: PlacedDevice[], level: Level): Conflict[] {
    const conflicts: Conflict[] = [];
    const occupiedCells: Map<string, string> = new Map();
    
    for (const device of placedDevices) {
      const deviceInfo = DEVICES[device.deviceType];
      const cells = getDeviceOccupiedCells(device.position, device.deviceType);
      
      for (const cell of cells) {
        if (!isSamePosition(cell, device.position)) {
          if (isPositionBlocked(cell, level.blockedAreas)) {
            conflicts.push({
              id: this.generateId(),
              type: 'device_block',
              severity: 'error',
              positions: [cell],
              description: `${deviceInfo.name}放置在了禁止区域(${cell.x},${cell.y})`,
              penalty: 50,
              involvedElements: [device.id],
              humanExplanation: `${deviceInfo.name}被放在了舞台的"禁停区"——位置(${cell.x},${cell.y})是预先标记不能放东西的地方（可能是舞台升降口、消防通道或者预留的表演区）。这就像把车停在了消防通道上，演到一半可能就要出问题！赶紧挪到允许的区域吧。`
            });
          }
        }
      }
      
      for (const cell of cells) {
        const key = positionToKey(cell);
        if (occupiedCells.has(key)) {
          const otherDeviceId = occupiedCells.get(key)!;
          const otherDevice = placedDevices.find(d => d.id === otherDeviceId);
          if (otherDevice && otherDevice.id !== device.id) {
            const otherDeviceInfo = DEVICES[otherDevice.deviceType];
            conflicts.push({
              id: this.generateId(),
              type: 'device_block',
              severity: 'error',
              positions: [cell],
              description: `${deviceInfo.name}与${otherDeviceInfo.name}在位置(${cell.x},${cell.y})发生重叠`,
              penalty: 40,
              involvedElements: [device.id, otherDeviceId],
              humanExplanation: `在位置(${cell.x},${cell.y})，${deviceInfo.name}和${otherDeviceInfo.name}这两个设备"撞车"了！它们都想占据同一个格子，但舞台上的空间是有限的，设备不能叠放。请至少移动其中一个，让它们各自有独立的摆放空间。`
            });
          }
        } else {
          occupiedCells.set(key, device.id);
        }
      }
    }
    
    return conflicts;
  }

  static detectWalkConflicts(
    walkPaths: WalkPath[],
    placedDevices: PlacedDevice[],
    cables: Cable[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];
    
    const allDeviceCells: Position[] = [];
    for (const device of placedDevices) {
      allDeviceCells.push(...getDeviceOccupiedCells(device.position, device.deviceType));
    }
    
    for (const path of walkPaths) {
      const deviceIntersections = doesPathPassThroughPositions(path.points, allDeviceCells);
      
      if (deviceIntersections.length > 0) {
        const deviceNames = deviceIntersections.map(pos => {
          const device = placedDevices.find(d => {
            const cells = getDeviceOccupiedCells(d.position, d.deviceType);
            return cells.some(c => isSamePosition(c, pos));
          });
          return device ? DEVICES[device.deviceType].name : '设备';
        });
        
        conflicts.push({
          id: this.generateId(),
          type: 'walk_conflict',
          severity: 'error',
          positions: deviceIntersections,
          description: `${path.musician}的走位路径穿过了${[...new Set(deviceNames)].join('、')}`,
          penalty: 35,
          involvedElements: [path.id],
          humanExplanation: `${path.musician}的演出路线规划有问题——在位置${deviceIntersections.map(p => `(${p.x},${p.y})`).join('、')}，乐手会直接撞到${[...new Set(deviceNames)].join('和')}！这就像设计了一条穿墙的路线，实际演出时要么乐手绕路导致走位出错，要么设备被碰倒。请调整走位路径绕开这些设备。`
        });
      }
    }
    
    for (let i = 0; i < walkPaths.length; i++) {
      for (let j = i + 1; j < walkPaths.length; j++) {
        const crossings = doPathsCross(walkPaths[i].points, walkPaths[j].points);
        
        if (crossings.length > 0) {
          conflicts.push({
            id: this.generateId(),
            type: 'walk_conflict',
            severity: 'warning',
            positions: crossings,
            description: `${walkPaths[i].musician}与${walkPaths[j].musician}的走位在位置${crossings.map(p => `(${p.x},${p.y})`).join('、')}交叉`,
            penalty: 15,
            involvedElements: [walkPaths[i].id, walkPaths[j].id],
            humanExplanation: `在位置${crossings.map(p => `(${p.x},${p.y})`).join('、')}，${walkPaths[i].musician}和${walkPaths[j].musician}的走位路线交叉了。虽然不是致命错误，但演出时两人可能会撞上或者互相干扰。建议调整其中一条路线，让他们的移动轨迹互不交叉。`
          });
        }
      }
    }
    
    for (const path of walkPaths) {
      for (const cable of cables) {
        const cableCrossings = doesPathPassThroughPositions(path.points, cable.points);
        
        if (cableCrossings.length >= 3) {
          conflicts.push({
            id: this.generateId(),
            type: 'walk_conflict',
            severity: 'warning',
            positions: cableCrossings.slice(0, 3),
            description: `${path.musician}的走位多次穿越线缆"${cable.label}"`,
            penalty: 20,
            involvedElements: [path.id, cable.id],
            humanExplanation: `${path.musician}的演出路线要跨过线缆"${cable.label}"多达${cableCrossings.length}次！虽然线缆是贴地的，但频繁跨越增加了绊倒的风险。试着调整走位路径或者线缆走向，让乐手尽量少跨线。`
          });
        }
      }
    }
    
    return conflicts;
  }

  static getConflictTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      cable_cross: '线缆穿越',
      device_block: '设备遮挡',
      walk_conflict: '走位冲突'
    };
    return labels[type] || type;
  }

  static getConflictTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      cable_cross: 'Link2Off',
      device_block: 'Blocked',
      walk_conflict: 'Users'
    };
    return icons[type] || 'AlertTriangle';
  }
}
