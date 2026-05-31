import type { ModeTower, Position, Note } from '../../types';
import { TOWER_TEMPLATES } from '../../data/levels';

export function createTower(templateKey: string): ModeTower {
  const template = TOWER_TEMPLATES[templateKey as keyof typeof TOWER_TEMPLATES];
  if (!template) {
    throw new Error(`Unknown tower template: ${templateKey}`);
  }
  
  return {
    id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: template.type,
    modeName: template.modeName,
    characteristicNotes: [...template.characteristicNotes] as Note[],
    damage: template.damage,
    range: template.range,
    attackSpeed: template.attackSpeed,
    level: 1,
    maxLevel: template.maxLevel,
    position: null,
    attackTime: null,
    isLate: false,
    cost: template.cost,
    upgradeCost: template.upgradeCost
  };
}

export function upgradeTower(tower: ModeTower): ModeTower {
  if (tower.level >= tower.maxLevel) {
    return tower;
  }
  
  const levelMultiplier = 1 + (tower.level * 0.3);
  
  return {
    ...tower,
    level: tower.level + 1,
    damage: Math.floor(tower.damage * levelMultiplier),
    range: tower.range + 0.3,
    attackSpeed: Math.floor(tower.attackSpeed * 0.9),
    upgradeCost: Math.floor(tower.upgradeCost * 1.5)
  };
}

export function getTowerTemplate(templateKey: string) {
  return TOWER_TEMPLATES[templateKey as keyof typeof TOWER_TEMPLATES] || null;
}

export function canPlaceTower(
  position: Position,
  towerSlots: Position[],
  existingTowers: ModeTower[]
): boolean {
  const isSlot = towerSlots.some(
    slot => slot.x === position.x && slot.y === position.y
  );
  
  if (!isSlot) return false;
  
  const isOccupied = existingTowers.some(
    tower => tower.position?.x === position.x && tower.position?.y === position.y
  );
  
  return !isOccupied;
}

export function isMonsterInRange(
  tower: ModeTower,
  monsterPosition: Position
): boolean {
  if (!tower.position) return false;
  
  const dx = tower.position.x - monsterPosition.x;
  const dy = tower.position.y - monsterPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= tower.range;
}

export function getUpgradeCost(tower: ModeTower): number {
  return tower.upgradeCost;
}

export function getSellValue(tower: ModeTower): number {
  let totalCost = tower.cost;
  for (let i = 1; i < tower.level; i++) {
    totalCost += Math.floor(tower.upgradeCost * Math.pow(1.5, i - 1));
  }
  return Math.floor(totalCost * 0.6);
}
