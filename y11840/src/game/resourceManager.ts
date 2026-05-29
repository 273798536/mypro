import type { AgentResource, BusyLevel } from '@/types';

export class ResourceManager {
  private resources: AgentResource;

  constructor(initialResources?: Partial<AgentResource>) {
    this.resources = {
      totalAgents: 10,
      busyAgents: 4,
      queueLength: 2,
      avgWaitTime: 3,
      busyLevel: 'medium',
      ...initialResources,
    };
    this.updateBusyLevel();
  }

  getResources(): AgentResource {
    return { ...this.resources };
  }

  private updateBusyLevel(): void {
    const busyRatio = this.resources.busyAgents / this.resources.totalAgents;
    let busyLevel: BusyLevel;

    if (busyRatio < 0.3) {
      busyLevel = 'low';
    } else if (busyRatio < 0.6) {
      busyLevel = 'medium';
    } else if (busyRatio < 0.85) {
      busyLevel = 'high';
    } else {
      busyLevel = 'critical';
    }

    this.resources.busyLevel = busyLevel;
    this.updateWaitTime();
  }

  private updateWaitTime(): void {
    const baseWaitTime = 2;
    const queueFactor = this.resources.queueLength * 1.5;
    const busyFactor = this.resources.busyAgents / Math.max(1, this.resources.totalAgents - this.resources.busyAgents) * 3;
    this.resources.avgWaitTime = Math.round(baseWaitTime + queueFactor + busyFactor);
  }

  assignAgent(): boolean {
    if (this.resources.busyAgents >= this.resources.totalAgents) {
      this.resources.queueLength++;
      this.updateBusyLevel();
      return false;
    }

    this.resources.busyAgents++;
    this.updateBusyLevel();
    return true;
  }

  releaseAgent(): void {
    if (this.resources.busyAgents > 0) {
      this.resources.busyAgents--;
    }
    if (this.resources.queueLength > 0) {
      this.resources.queueLength--;
      this.resources.busyAgents++;
    }
    this.updateBusyLevel();
  }

  addToQueue(): void {
    this.resources.queueLength++;
    this.updateBusyLevel();
  }

  randomFluctuate(): void {
    const fluctuation = Math.floor(Math.random() * 3) - 1;
    this.resources.busyAgents = Math.max(
      0,
      Math.min(this.resources.totalAgents, this.resources.busyAgents + fluctuation)
    );

    const queueChange = Math.floor(Math.random() * 3) - 1;
    this.resources.queueLength = Math.max(0, this.resources.queueLength + queueChange);

    this.updateBusyLevel();
  }

  getEscalationCost(): number {
    const busyLevelCosts: Record<BusyLevel, number> = {
      low: 1,
      medium: 2,
      high: 4,
      critical: 8,
    };
    return busyLevelCosts[this.resources.busyLevel];
  }

  canEscalate(): { allowed: boolean; reason?: string } {
    if (this.resources.busyLevel === 'critical' && this.resources.queueLength > 5) {
      return {
        allowed: false,
        reason: '坐席资源严重不足，建议先观察或AI处理非紧急问题',
      };
    }
    return { allowed: true };
  }

  reset(): void {
    this.resources = {
      totalAgents: 10,
      busyAgents: 4,
      queueLength: 2,
      avgWaitTime: 3,
      busyLevel: 'medium',
    };
  }
}

export const resourceManager = new ResourceManager();
