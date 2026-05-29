import type { GameEvent, EventType, ScoreBreakdown } from '../types/game';

export class EventRecorder {
  private events: GameEvent[] = [];
  private eventIdCounter = 0;

  recordEvent(type: EventType, data: Record<string, unknown> = {}): void {
    const event: GameEvent = {
      id: `evt_${++this.eventIdCounter}`,
      type,
      timestamp: Date.now(),
      data,
    };
    this.events.push(event);
  }

  getEvents(): GameEvent[] {
    return [...this.events];
  }

  getEventsByType(type: EventType): GameEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getEventTimeline(): Array<{ time: number; events: GameEvent[] }> {
    const grouped: Record<number, GameEvent[]> = {};
    this.events.forEach(event => {
      const second = Math.floor((event.timestamp - this.events[0].timestamp) / 1000);
      if (!grouped[second]) grouped[second] = [];
      grouped[second].push(event);
    });
    return Object.entries(grouped).map(([time, events]) => ({
      time: parseInt(time),
      events,
    }));
  }

  clear(): void {
    this.events = [];
    this.eventIdCounter = 0;
  }

  getStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.events.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });
    return stats;
  }

  generateScoreBreakdown(): ScoreBreakdown[] {
    const breakdown: ScoreBreakdown[] = [];
    let breakdownId = 0;

    this.events.forEach(event => {
      switch (event.type) {
        case 'sample_collect':
          breakdown.push({
            id: `sb_${++breakdownId}`,
            type: 'collect',
            description: `收集 ${(event.data.soundType as string) || '未知'} 采样`,
            points: 100,
            timestamp: event.timestamp,
          });
          break;
        case 'sample_place':
          breakdown.push({
            id: `sb_${++breakdownId}`,
            type: 'place',
            description: `放置采样到第 ${(event.data.beatIndex as number) + 1} 拍`,
            points: 50,
            timestamp: event.timestamp,
          });
          break;
        case 'sample_conflict':
          breakdown.push({
            id: `sb_${++breakdownId}`,
            type: 'penalty',
            description: '采样冲突',
            points: -30,
            timestamp: event.timestamp,
          });
          break;
        case 'rhythm_mismatch':
          breakdown.push({
            id: `sb_${++breakdownId}`,
            type: 'penalty',
            description: '节奏错位',
            points: -50,
            timestamp: event.timestamp,
          });
          break;
        case 'storm_hit':
          breakdown.push({
            id: `sb_${++breakdownId}`,
            type: 'penalty',
            description: '噪声风暴命中',
            points: -20,
            timestamp: event.timestamp,
          });
          break;
      }
    });

    return breakdown;
  }
}

export const eventRecorder = new EventRecorder();
