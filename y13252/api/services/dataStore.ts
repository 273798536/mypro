import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Complaint, SystemStatus } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const STATUS_FILE = path.join(DATA_DIR, 'status.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSONFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    writeJSONFile(filePath, defaultValue);
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeJSONFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getComplaints(): Complaint[] {
  return readJSONFile<Complaint[]>(COMPLAINTS_FILE, []);
}

export function saveComplaints(complaints: Complaint[]): void {
  writeJSONFile(COMPLAINTS_FILE, complaints);
}

export function getComplaintById(id: string): Complaint | undefined {
  const complaints = getComplaints();
  return complaints.find(c => c.id === id);
}

export function updateComplaint(complaint: Complaint): void {
  const complaints = getComplaints();
  const index = complaints.findIndex(c => c.id === complaint.id);
  if (index !== -1) {
    complaints[index] = { ...complaint, updatedAt: new Date().toISOString() };
    saveComplaints(complaints);
  }
}

export function addComplaint(complaint: Complaint): void {
  const complaints = getComplaints();
  complaints.push(complaint);
  saveComplaints(complaints);
}

export function getSystemStatus(): SystemStatus {
  return readJSONFile<SystemStatus>(STATUS_FILE, {
    lastProcessedAt: new Date().toISOString(),
    currentComplaintId: null,
    reportVersion: 1
  });
}

export function updateSystemStatus(status: Partial<SystemStatus>): void {
  const current = getSystemStatus();
  writeJSONFile(STATUS_FILE, { ...current, ...status });
}

export function clearAllData(): void {
  saveComplaints([]);
  writeJSONFile(STATUS_FILE, {
    lastProcessedAt: new Date().toISOString(),
    currentComplaintId: null,
    reportVersion: 1
  });
}
