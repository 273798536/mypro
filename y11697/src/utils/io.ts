import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { InputData, Schedule } from '../types';

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

export function writeJsonFile(filePath: string, data: unknown, pretty: boolean = true): void {
  ensureDir(path.dirname(filePath));
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function generateUniqueFilename(baseName: string, extension: string = 'json'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shortUuid = uuidv4().slice(0, 8);
  return `${baseName}_${timestamp}_${shortUuid}.${extension}`;
}

export function readInputData(inputDir: string): InputData | null {
  const doctors = readJsonFile(path.join(inputDir, 'doctors.json'));
  const departments = readJsonFile(path.join(inputDir, 'departments.json'));
  const leaveRequests = readJsonFile(path.join(inputDir, 'leave-requests.json'));
  const shiftRequirements = readJsonFile(path.join(inputDir, 'shift-requirements.json'));
  const fatigueRules = readJsonFile(path.join(inputDir, 'fatigue-rules.json'));
  const lockedShifts = readJsonFile(path.join(inputDir, 'locked-shifts.json')) || [];
  const existingSchedule = readJsonFile<Schedule>(path.join(inputDir, 'existing-schedule.json'));

  if (!doctors || !departments || !leaveRequests || !shiftRequirements || !fatigueRules) {
    return null;
  }

  return {
    doctors,
    departments,
    leaveRequests,
    shiftRequirements,
    fatigueRules,
    lockedShifts,
    existingSchedule
  } as InputData;
}

export function writeSchedule(outputDir: string, schedule: Schedule, name?: string): string {
  ensureDir(outputDir);
  const filename = name || generateUniqueFilename('schedule');
  const filePath = path.join(outputDir, filename);
  writeJsonFile(filePath, schedule);
  return filePath;
}

export function listSchedules(outputDir: string): string[] {
  if (!fs.existsSync(outputDir)) {
    return [];
  }
  return fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.json') && f.startsWith('schedule_'))
    .sort()
    .reverse();
}

export function readSchedule(outputDir: string, filename: string): Schedule | null {
  return readJsonFile<Schedule>(path.join(outputDir, filename));
}
