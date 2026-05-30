import Dexie, { Table } from 'dexie';
import type { GameState, GameHistory, DataSource, GameSnapshot } from '../engine/types';

export class GameDatabase extends Dexie {
  gameStates!: Table<GameState, string>;
  gameHistories!: Table<GameHistory, string>;
  dataSources!: Table<DataSource, string>;
  snapshots!: Table<{ id: string; gameId: string; snapshot: GameSnapshot; timestamp: number }, string>;

  constructor() {
    super('FestivalSecurityDB');
    this.version(2).stores({
      gameStates: 'id, mapId, status, startTime',
      gameHistories: 'id, gameId, hash, createdAt, finalScore, grade',
      dataSources: 'id, type, hash, timestamp',
      snapshots: 'id, gameId, timestamp, [gameId+timestamp]'
    });
  }
}

export const db = new GameDatabase();

export async function saveGameState(state: GameState): Promise<void> {
  try {
    await db.gameStates.put(state);
  } catch (error) {
    console.error('Failed to save game state:', error);
    throw error;
  }
}

export async function loadGameState(gameId: string): Promise<GameState | undefined> {
  try {
    return await db.gameStates.get(gameId);
  } catch (error) {
    console.error('Failed to load game state:', error);
    return undefined;
  }
}

export async function saveGameHistory(history: GameHistory): Promise<void> {
  try {
    const existing = await db.gameHistories.where('hash').equals(history.hash).first();
    if (existing) {
      console.log('Duplicate game history detected, skipping save');
      return;
    }
    await db.gameHistories.put(history);
  } catch (error) {
    console.error('Failed to save game history:', error);
    throw error;
  }
}

export async function loadGameHistory(gameId: string): Promise<GameHistory | undefined> {
  try {
    return await db.gameHistories.where('gameId').equals(gameId).first();
  } catch (error) {
    console.error('Failed to load game history:', error);
    return undefined;
  }
}

export async function loadAllGameHistories(): Promise<GameHistory[]> {
  try {
    return await db.gameHistories.orderBy('createdAt').reverse().toArray();
  } catch (error) {
    console.error('Failed to load game histories:', error);
    return [];
  }
}

export async function deleteGameHistory(historyId: string): Promise<void> {
  try {
    await db.gameHistories.delete(historyId);
  } catch (error) {
    console.error('Failed to delete game history:', error);
    throw error;
  }
}

export async function saveDataSource(dataSource: DataSource): Promise<void> {
  try {
    const existing = await db.dataSources.where('hash').equals(dataSource.hash).first();
    if (existing) {
      console.log('Duplicate data source detected, skipping save');
      return;
    }
    await db.dataSources.put(dataSource);
  } catch (error) {
    console.error('Failed to save data source:', error);
    throw error;
  }
}

export async function loadDataSource(id: string): Promise<DataSource | undefined> {
  try {
    return await db.dataSources.get(id);
  } catch (error) {
    console.error('Failed to load data source:', error);
    return undefined;
  }
}

export async function saveSnapshot(
  gameId: string,
  snapshot: GameSnapshot
): Promise<string> {
  try {
    const id = `${gameId}-${snapshot.timestamp}`;
    await db.snapshots.put({ id, gameId, snapshot, timestamp: snapshot.timestamp });
    return id;
  } catch (error) {
    console.error('Failed to save snapshot:', error);
    throw error;
  }
}

export async function loadSnapshots(gameId: string): Promise<GameSnapshot[]> {
  try {
    const results = await db.snapshots
      .where('[gameId+timestamp]')
      .between([gameId, -Infinity], [gameId, Infinity])
      .toArray();
    return results.map(r => r.snapshot);
  } catch (error) {
    console.error('Failed to load snapshots:', error);
    return [];
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem('currentGameId');
  localStorage.removeItem('lastViewedHistory');
}

export function setCurrentGameId(gameId: string): void {
  localStorage.setItem('currentGameId', gameId);
}

export function getCurrentGameId(): string | null {
  return localStorage.getItem('currentGameId');
}
