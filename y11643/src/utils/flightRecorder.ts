import type { FlightFrame, FlightRecord, RocketState, EnvironmentState } from '../types/game';
import { calculateFlightSummary } from './scoring';

const STORAGE_KEY = 'rocket_landing_records';
const MAX_RECORDS = 50;

export function createFlightFrame(
  timestamp: number,
  rocket: RocketState,
  thrustInput: number
): FlightFrame {
  return {
    timestamp,
    rocket: { ...rocket },
    thrustInput,
  };
}

export function createFlightRecord(
  frames: FlightFrame[],
  env: EnvironmentState,
  success: boolean,
  score: number,
  failureReason?: string
): FlightRecord {
  const summary = calculateFlightSummary(frames, env);

  return {
    id: generateId(),
    startTime: frames[0]?.timestamp || Date.now(),
    endTime: frames[frames.length - 1]?.timestamp || Date.now(),
    success,
    score,
    failureReason,
    frames,
    summary,
    createdAt: Date.now(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function saveFlightRecord(record: FlightRecord): void {
  try {
    const records = loadFlightRecords();
    records.unshift(record);
    
    if (records.length > MAX_RECORDS) {
      records.splice(MAX_RECORDS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save flight record:', error);
  }
}

export function loadFlightRecords(): FlightRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const records = JSON.parse(data) as FlightRecord[];
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to load flight records:', error);
    return []
  }
}

export function clearFlightRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function deleteFlightRecord(id: string): void {
  try {
    const records = loadFlightRecords();
    const filtered = records.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete flight record:', error);
  }
}

export function getRecordById(id: string): FlightRecord | undefined {
  const records = loadFlightRecords();
  return records.find(r => r.id === id);
}
