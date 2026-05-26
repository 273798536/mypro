import { Chemical, Shelf, ShelfSlot, RiskEvent, RiskType, Severity } from '../types';

export class RiskEngine {
  private chemicals: Chemical[];
  private shelf: Shelf;

  constructor(chemicals: Chemical[], shelf: Shelf) {
    this.chemicals = chemicals;
    this.shelf = shelf;
  }

  public updateShelf(shelf: Shelf): void {
    this.shelf = shelf;
  }

  public checkAllRisks(): RiskEvent[] {
    const risks: RiskEvent[] = [];
    
    for (const slot of this.shelf.slots) {
      if (slot.chemicalId) {
        const slotRisks = this.checkSlotRisks(slot);
        risks.push(...slotRisks);
      }
    }

    return this.deduplicateRisks(risks);
  }

  public checkSlotRisks(slot: ShelfSlot): RiskEvent[] {
    if (!slot.chemicalId) return [];

    const risks: RiskEvent[] = [];
    const chemical = this.getChemical(slot.chemicalId);
    if (!chemical) return [];

    const tempRisk = this.checkTemperature(slot, chemical);
    if (tempRisk) risks.push(tempRisk);

    const humidityRisk = this.checkHumidity(slot, chemical);
    if (humidityRisk) risks.push(humidityRisk);

    const categoryRisk = this.checkCategoryRestriction(slot, chemical);
    if (categoryRisk) risks.push(categoryRisk);

    const neighborRisks = this.checkNeighbors(slot, chemical);
    risks.push(...neighborRisks);

    const distanceRisks = this.checkIsolationDistance(slot, chemical);
    risks.push(...distanceRisks);

    return risks;
  }

  private checkTemperature(slot: ShelfSlot, chemical: Chemical): RiskEvent | null {
    if (slot.temperature < chemical.minTemp || slot.temperature > chemical.maxTemp) {
      const isTooCold = slot.temperature < chemical.minTemp;
      const severity = this.calculateSeverity(
        isTooCold ? chemical.minTemp - slot.temperature : slot.temperature - chemical.maxTemp,
        5,
        10
      );
      
      return {
        id: `risk-temp-${slot.id}-${chemical.id}`,
        type: RiskType.TEMPERATURE_EXCEED,
        severity,
        description: `${chemical.name} ${isTooCold ? '温度过低' : '温度过高'}。当前: ${slot.temperature}°C，允许范围: ${chemical.minTemp}°C ~ ${chemical.maxTemp}°C`,
        chemicalIds: [chemical.id],
        slotIds: [slot.id],
        timestamp: Date.now(),
        penalty: this.getPenaltyBySeverity(severity)
      };
    }
    return null;
  }

  private checkHumidity(slot: ShelfSlot, chemical: Chemical): RiskEvent | null {
    if (slot.humidity < chemical.minHumidity || slot.humidity > chemical.maxHumidity) {
      const isTooDry = slot.humidity < chemical.minHumidity;
      const severity = this.calculateSeverity(
        isTooDry ? chemical.minHumidity - slot.humidity : slot.humidity - chemical.maxHumidity,
        10,
        25
      );
      
      return {
        id: `risk-humidity-${slot.id}-${chemical.id}`,
        type: RiskType.HUMIDITY_EXCEED,
        severity,
        description: `${chemical.name} ${isTooDry ? '湿度过低' : '湿度过高'}。当前: ${slot.humidity}%RH，允许范围: ${chemical.minHumidity}%RH ~ ${chemical.maxHumidity}%RH`,
        chemicalIds: [chemical.id],
        slotIds: [slot.id],
        timestamp: Date.now(),
        penalty: this.getPenaltyBySeverity(severity)
      };
    }
    return null;
  }

  private checkCategoryRestriction(slot: ShelfSlot, chemical: Chemical): RiskEvent | null {
    const restricted = slot.restrictedCategories.includes(chemical.category);
    const notAllowed = slot.allowedCategories.length > 0 && !slot.allowedCategories.includes(chemical.category);
    
    if (restricted || notAllowed) {
      return {
        id: `risk-category-${slot.id}-${chemical.id}`,
        type: RiskType.RESTRICTED_CATEGORY,
        severity: Severity.WARNING,
        description: `${chemical.name} (${this.getCategoryName(chemical.category)}) 不允许存放在此格位。${slot.allowedCategories.length > 0 ? `该区域仅限: ${slot.allowedCategories.map(c => this.getCategoryName(c)).join('、')}` : ''}`,
        chemicalIds: [chemical.id],
        slotIds: [slot.id],
        timestamp: Date.now(),
        penalty: 50
      };
    }
    return null;
  }

  private checkNeighbors(slot: ShelfSlot, chemical: Chemical): RiskEvent[] {
    const risks: RiskEvent[] = [];
    const neighbors = this.getNeighborSlots(slot);

    for (const neighbor of neighbors) {
      if (neighbor.chemicalId && chemical.incompatibleWith.includes(neighbor.chemicalId)) {
        const neighborChemical = this.getChemical(neighbor.chemicalId);
        if (neighborChemical) {
          risks.push({
            id: `risk-incompatible-${slot.id}-${neighbor.id}`,
            type: RiskType.INCOMPATIBLE_NEIGHBOR,
            severity: Severity.DANGER,
            description: `禁忌相邻警告：${chemical.name} 与 ${neighborChemical.name} 不能相邻存放！`,
            chemicalIds: [chemical.id, neighbor.chemicalId],
            slotIds: [slot.id, neighbor.id],
            timestamp: Date.now(),
            penalty: 150
          });
        }
      }
    }

    return risks;
  }

  private checkIsolationDistance(slot: ShelfSlot, chemical: Chemical): RiskEvent[] {
    if (chemical.isolationDistance <= 1) return [];

    const risks: RiskEvent[] = [];
    const nearbySlots = this.getSlotsWithinDistance(slot, chemical.isolationDistance);

    for (const nearbySlot of nearbySlots) {
      if (nearbySlot.id === slot.id) continue;
      if (nearbySlot.chemicalId && nearbySlot.chemicalId !== chemical.id) {
        const distance = this.getSlotDistance(slot, nearbySlot);
        if (distance < chemical.isolationDistance) {
          const nearbyChemical = this.getChemical(nearbySlot.chemicalId);
          if (nearbyChemical) {
            risks.push({
              id: `risk-distance-${slot.id}-${nearbySlot.id}`,
              type: RiskType.INSUFFICIENT_DISTANCE,
              severity: Severity.WARNING,
              description: `隔离距离不足：${chemical.name} 需要至少 ${chemical.isolationDistance} 格隔离距离，与 ${nearbyChemical.name} 仅相距 ${distance} 格`,
              chemicalIds: [chemical.id, nearbySlot.chemicalId],
              slotIds: [slot.id, nearbySlot.id],
              timestamp: Date.now(),
              penalty: 100
            });
          }
        }
      }
    }

    return risks;
  }

  private getNeighborSlots(slot: ShelfSlot): ShelfSlot[] {
    return this.shelf.slots.filter(s => {
      const rowDiff = Math.abs(s.row - slot.row);
      const colDiff = Math.abs(s.col - slot.col);
      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    });
  }

  private getSlotsWithinDistance(slot: ShelfSlot, distance: number): ShelfSlot[] {
    return this.shelf.slots.filter(s => {
      const dist = this.getSlotDistance(slot, s);
      return dist <= distance;
    });
  }

  private getSlotDistance(slot1: ShelfSlot, slot2: ShelfSlot): number {
    return Math.abs(slot1.row - slot2.row) + Math.abs(slot1.col - slot2.col);
  }

  private getChemical(id: string): Chemical | undefined {
    return this.chemicals.find(c => c.id === id);
  }

  private calculateSeverity(value: number, warnThreshold: number, dangerThreshold: number): Severity {
    if (value >= dangerThreshold) return Severity.CRITICAL;
    if (value >= warnThreshold) return Severity.DANGER;
    return Severity.WARNING;
  }

  private getPenaltyBySeverity(severity: Severity): number {
    switch (severity) {
      case Severity.CRITICAL: return 200;
      case Severity.DANGER: return 150;
      case Severity.WARNING: return 75;
      default: return 0;
    }
  }

  private deduplicateRisks(risks: RiskEvent[]): RiskEvent[] {
    const seen = new Set<string>();
    return risks.filter(risk => {
      const key = `${risk.type}-${risk.slotIds.sort().join('-')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public getCategoryName(category: string): string {
    const names: Record<string, string> = {
      flammable: '易燃物',
      explosive: '爆炸物',
      corrosive: '腐蚀性',
      toxic: '有毒物',
      oxidizer: '氧化剂',
      radioactive: '放射性',
      compressed: '压缩气体',
      refrigerated: '冷藏品'
    };
    return names[category] || category;
  }

  public getRiskTypeName(type: RiskType): string {
    const names: Record<RiskType, string> = {
      [RiskType.INCOMPATIBLE_NEIGHBOR]: '禁忌相邻',
      [RiskType.TEMPERATURE_EXCEED]: '温度超限',
      [RiskType.HUMIDITY_EXCEED]: '湿度超限',
      [RiskType.INSUFFICIENT_DISTANCE]: '距离不足',
      [RiskType.RESTRICTED_CATEGORY]: '类别限制'
    };
    return names[type] || type;
  }
}
