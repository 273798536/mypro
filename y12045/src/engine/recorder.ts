import type { GameState, GameEvent } from './types';

interface Snapshot {
  timestamp: number;
  state: GameState;
}

class GameRecorder {
  private snapshots: Snapshot[] = [];
  private events: GameEvent[] = [];
  private snapshotInterval = 1;
  private lastSnapshotTime = 0;

  reset(): void {
    this.snapshots = [];
    this.events = [];
    this.lastSnapshotTime = 0;
  }

  recordSnapshot(state: GameState): void {
    if (state.time - this.lastSnapshotTime >= this.snapshotInterval) {
      this.snapshots.push({
        timestamp: state.time,
        state: JSON.parse(JSON.stringify(state)),
      });
      this.lastSnapshotTime = state.time;
    }
  }

  recordEvent(event: GameEvent): void {
    this.events.push(event);
  }

  getStateAtTime(time: number): GameState | null {
    if (this.snapshots.length === 0) return null;
    
    let closestSnapshot = this.snapshots[0];
    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp <= time) {
        closestSnapshot = snapshot;
      } else {
        break;
      }
    }
    
    return JSON.parse(JSON.stringify(closestSnapshot.state));
  }

  getEventsInRange(startTime: number, endTime: number): GameEvent[] {
    return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  getEventsByType(type: string): GameEvent[] {
    return this.events.filter(e => e.type === type);
  }

  getAllEvents(): GameEvent[] {
    return [...this.events];
  }

  getAllSnapshots(): Snapshot[] {
    return [...this.snapshots];
  }

  getTotalDuration(): number {
    if (this.snapshots.length === 0) return 0;
    return this.snapshots[this.snapshots.length - 1].timestamp;
  }
}

export const gameRecorder = new GameRecorder();
