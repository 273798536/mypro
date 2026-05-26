import type { Level, LevelRecord, GameSession, ImportStrategy, ImportResult, ConflictInfo } from '../types';
import { defaultLevels } from '../data/levels';

const STORAGE_KEYS = {
  LEVELS: 'cold-chain-levels',
  RECORDS: 'cold-chain-records',
  SESSIONS: 'cold-chain-sessions',
  CURRENT_SESSION: 'cold-chain-current-session',
};

export function getLevels(): Level[] {
  const stored = localStorage.getItem(STORAGE_KEYS.LEVELS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultLevels;
    }
  }
  saveLevels(defaultLevels);
  return defaultLevels;
}

export function saveLevels(levels: Level[]): void {
  localStorage.setItem(STORAGE_KEYS.LEVELS, JSON.stringify(levels));
}

export function getLevelById(id: string): Level | undefined {
  const levels = getLevels();
  return levels.find((l) => l.id === id);
}

export function importLevels(
  incomingLevels: Level[],
  strategy: ImportStrategy
): ImportResult {
  const existingLevels = getLevels();
  const result: ImportResult = {
    added: 0,
    updated: 0,
    skipped: 0,
    conflicts: [],
  };

  const mergedLevels = [...existingLevels];

  incomingLevels.forEach((incoming) => {
    const existingIndex = mergedLevels.findIndex((l) => l.id === incoming.id);
    
    if (existingIndex === -1) {
      mergedLevels.push({
        ...incoming,
        lastModified: Date.now(),
        version: 1,
      });
      result.added++;
    } else {
      const existing = mergedLevels[existingIndex];
      const conflicts = findConflicts(existing, incoming);
      
      if (conflicts.length > 0) {
        result.conflicts.push(...conflicts);
      }

      switch (strategy) {
        case 'skip':
          result.skipped++;
          break;
        case 'overwrite':
          mergedLevels[existingIndex] = {
            ...incoming,
            lastModified: Date.now(),
            version: existing.version + 1,
          };
          result.updated++;
          break;
        case 'append':
          mergedLevels.push({
            ...incoming,
            id: `${incoming.id}-${Date.now()}`,
            lastModified: Date.now(),
            version: 1,
          });
          result.added++;
          break;
      }
    }
  });

  saveLevels(mergedLevels);
  return result;
}

function findConflicts(existing: Level, incoming: Level): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const fieldsToCheck: (keyof Level)[] = ['name', 'difficulty', 'timeLimit', 'cargoBoxes', 'compartments', 'stations'];

  fieldsToCheck.forEach((field) => {
    const existingValue = existing[field];
    const incomingValue = incoming[field];
    
    if (JSON.stringify(existingValue) !== JSON.stringify(incomingValue)) {
      conflicts.push({
        existingId: existing.id,
        incomingId: incoming.id,
        field: field as string,
        existingValue,
        incomingValue,
      });
    }
  });

  return conflicts;
}

export function getRecords(): Record<string, LevelRecord> {
  const stored = localStorage.getItem(STORAGE_KEYS.RECORDS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

export function saveRecord(record: LevelRecord): void {
  const records = getRecords();
  records[record.levelId] = record;
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
}

export function getSessions(): GameSession[] {
  const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((s: GameSession) => ({
        ...s,
        placedCargos: new Map(Object.entries(s.placedCargos || {})),
      }));
    } catch {
      return [];
    }
  }
  return [];
}

export function saveSession(session: GameSession): void {
  const sessions = getSessions();
  const plainSession = {
    ...session,
    placedCargos: Object.fromEntries(session.placedCargos),
  };
  
  const existingIndex = sessions.findIndex((s) => s.id === session.id);
  if (existingIndex !== -1) {
    sessions[existingIndex] = plainSession as unknown as GameSession;
  } else {
    sessions.push(plainSession as unknown as GameSession);
  }

  const maxSessions = 50;
  if (sessions.length > maxSessions) {
    sessions.splice(0, sessions.length - maxSessions);
  }

  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(plainSession));
}

export function getSessionById(id: string): GameSession | undefined {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id);
}

export function getCurrentSession(): GameSession | undefined {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        placedCargos: new Map(Object.entries(parsed.placedCargos || {})),
      };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function clearCurrentSession(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}
