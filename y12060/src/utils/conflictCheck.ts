import { Forklift } from '../types/forklift';
import { Shelf } from '../types/shelf';
import { DataConflict, RiskLevel } from '../types/game';

export interface ConflictCheckOptions {
  safeMargin?: number;
  cargoWeight?: number;
  cargoHeight?: number;
}

const DEFAULT_OPTIONS: Required<ConflictCheckOptions> = {
  safeMargin: 0.5,
  cargoWeight: 1000,
  cargoHeight: 1.0
};

export function checkDataConflicts(
  forklift: Forklift,
  shelves: Shelf[],
  options: ConflictCheckOptions = {}
): DataConflict[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const conflicts: DataConflict[] = [];
  
  if (shelves.length === 0) return conflicts;
  
  const minAisleWidth = Math.min(...shelves.map(s => s.aisleWidth));
  const maxShelfHeight = Math.max(...shelves.map(s => s.height));
  
  if (forklift.turnRadius > minAisleWidth - opts.safeMargin) {
    conflicts.push({
      id: `conflict-aisle-${Date.now()}`,
      type: 'aisle_width',
      forkliftParam: '最小转弯半径',
      shelfParam: '最小通道宽度',
      forkliftValue: forklift.turnRadius,
      shelfValue: minAisleWidth,
      description: `叉车转弯半径(${forklift.turnRadius}m) 接近最小通道宽度(${minAisleWidth}m)，安全余量不足${opts.safeMargin}m，可能无法顺利转弯`,
      riskLevel: 'danger'
    });
  }
  
  if (forklift.maxHeight < maxShelfHeight) {
    conflicts.push({
      id: `conflict-height-${Date.now()}`,
      type: 'height_mismatch',
      forkliftParam: '最大举升高度',
      shelfParam: '最高货架高度',
      forkliftValue: forklift.maxHeight,
      shelfValue: maxShelfHeight,
      description: `叉车最大举升高度(${forklift.maxHeight}m) 低于最高货架高度(${maxShelfHeight}m)，无法存取最高层货物`,
      riskLevel: 'warning'
    });
  }
  
  if (opts.cargoWeight > forklift.maxLoad) {
    conflicts.push({
      id: `conflict-load-${Date.now()}`,
      type: 'load_exceed',
      forkliftParam: '最大载重',
      shelfParam: '货物重量',
      forkliftValue: forklift.maxLoad,
      shelfValue: opts.cargoWeight,
      description: `货物重量(${opts.cargoWeight}kg) 超过叉车载重上限(${forklift.maxLoad}kg)，存在侧翻风险`,
      riskLevel: 'danger'
    });
  }
  
  const blindZoneOverlap = checkBlindZoneOverlap(shelves);
  if (blindZoneOverlap > 30) {
    conflicts.push({
      id: `conflict-blindzone-${Date.now()}`,
      type: 'blindzone_overlap',
      forkliftParam: '叉车视野范围',
      shelfParam: '盲区覆盖率',
      forkliftValue: 100 - blindZoneOverlap,
      shelfValue: blindZoneOverlap,
      description: `货架盲区覆盖率达到${blindZoneOverlap}%，超过安全阈值30%，建议调整货架布局`,
      riskLevel: 'warning'
    });
  }
  
  return conflicts;
}

function checkBlindZoneOverlap(shelves: Shelf[]): number {
  if (shelves.length === 0) return 0;
  
  let totalBlindArea = 0;
  const warehouseArea = 400;
  
  for (const shelf of shelves) {
    for (const zone of shelf.blindZones) {
      totalBlindArea += Math.PI * zone.radius * zone.radius;
    }
  }
  
  return Math.min(100, Math.round((totalBlindArea / warehouseArea) * 100));
}

export function getConflictIcon(type: string): string {
  const icons: Record<string, string> = {
    'aisle_width': 'ArrowLeftRight',
    'height_mismatch': 'ArrowUpDown',
    'blindzone_overlap': 'EyeOff',
    'load_exceed': 'Weight'
  };
  return icons[type] || 'AlertTriangle';
}

export function getConflictColor(riskLevel: RiskLevel): string {
  return riskLevel === 'danger' ? '#E63946' : '#FFD700';
}

export function getConflictBgColor(riskLevel: RiskLevel): string {
  return riskLevel === 'danger' ? 'rgba(230, 57, 70, 0.1)' : 'rgba(255, 215, 0, 0.1)';
}

export function getConflictBorderColor(riskLevel: RiskLevel): string {
  return riskLevel === 'danger' ? 'rgba(230, 57, 70, 0.3)' : 'rgba(255, 215, 0, 0.3)';
}

export function explainConflictInPlainChinese(conflict: DataConflict): string {
  const explanations: Record<string, (c: DataConflict) => string> = {
    'aisle_width': (c) => 
      `这就好比你开着一辆需要${c.forkliftValue}米才能转弯的大车，却要钻进只有${c.shelfValue}米宽的小巷子。不是说完全过不去，但只要稍微打方向慢一点，就会蹭到两边的货架。建议要么换台小点的叉车，要么把通道拓宽一些。`,
    
    'height_mismatch': (c) => 
      `叉车最多只能举到${c.forkliftValue}米高，但货架最上层有${c.shelfValue}米。这就像你踩着梯子想够到天花板上的东西，梯子不够长怎么都够不到。要么换台能举更高的叉车，要么把最上层的货物移到下层。`,
    
    'blindzone_overlap': (c) => 
      `仓库里有${c.shelfValue}%的地方是司机坐在叉车上看不到的盲区。这就像开车时前挡风玻璃被遮住了三分之一，很容易撞到突然出现的人或东西。建议调整货架位置，减少盲区范围。`,
    
    'load_exceed': (c) => 
      `这台叉车最多只能拉${c.forkliftValue}公斤，但这次要拉的货有${c.shelfValue}公斤。超载就像人扛着超过自己体重的东西走路，很容易闪到腰甚至摔倒，叉车超载会增加侧翻风险，非常危险。`
  };
  
  return explanations[conflict.type]?.(conflict) || conflict.description;
}

export function getImprovementSuggestions(conflicts: DataConflict[]): string[] {
  const suggestions: string[] = [];
  
  for (const conflict of conflicts) {
    switch (conflict.type) {
      case 'aisle_width':
        suggestions.push('更换转弯半径更小的前移式叉车');
        suggestions.push('重新规划货架布局，拓宽通道至3米以上');
        suggestions.push('在狭窄通道设置单行通行标志');
        break;
      case 'height_mismatch':
        suggestions.push('更换举升高度更高的叉车');
        suggestions.push('将高频存取的货物放在中低层货架');
        suggestions.push('考虑使用登高作业车辅助存取高层货物');
        break;
      case 'blindzone_overlap':
        suggestions.push('调整货架朝向，减少交叉盲区');
        suggestions.push('在盲区安装反光镜或监控摄像头');
        suggestions.push('在盲区地面喷涂警示标线');
        break;
      case 'load_exceed':
        suggestions.push('严格按照叉车载重上限装载货物');
        suggestions.push('分批次搬运超重货物');
        suggestions.push('更换载重能力更强的叉车');
        break;
    }
  }
  
  return [...new Set(suggestions)];
}
