
import { GameSession } from '../types';

const STORAGE_KEY = 'chorus_defense_sessions';
const MAX_SESSIONS = 50;

export function saveSession(session: GameSession): void {
  try {
    const sessions = getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
      if (sessions.length > MAX_SESSIONS) {
        sessions.pop();
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

export function getSessions(): GameSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const sessions = JSON.parse(data) as GameSession[];
    return sessions.sort((a, b) => b.startTime - a.startTime);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
}

export function getSessionById(id: string): GameSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function deleteSession(id: string): void {
  try {
    const sessions = getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear sessions:', error);
  }
}

