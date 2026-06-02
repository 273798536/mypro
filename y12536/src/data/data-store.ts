import {
  Member,
  StatusHistory,
  TouchRecord,
  RenewalRecord,
  Strategy,
  MemberStatus,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class DataStore {
  private members: Map<string, Member> = new Map();
  private statusHistory: StatusHistory[] = [];
  private touchRecords: TouchRecord[] = [];
  private renewalRecords: RenewalRecord[] = [];
  private strategies: Map<string, Strategy> = new Map();
  private version: string;
  private source: string;
  private dataDir: string;

  constructor(version: string = '1.0.0', source: string = 'data-store', dataDir?: string) {
    this.version = version;
    this.source = source;
    this.dataDir = dataDir || path.join(process.cwd(), 'data');
    this.ensureDataDirs();
  }

  private ensureDataDirs(): void {
    const dirs = ['raw', 'processed', 'touch_history', 'reports'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.dataDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  addMember(member: Omit<Member, 'id' | 'version' | 'source' | 'createdAt' | 'updatedAt'>): Member {
    const now = new Date().toISOString();
    const newMember: Member = {
      ...member,
      id: uuidv4(),
      version: this.version,
      source: this.source,
      createdAt: now,
      updatedAt: now,
    };
    this.members.set(newMember.id, newMember);
    this.appendToFile('processed', 'members.json', newMember);
    return newMember;
  }

  getMember(id: string): Member | undefined {
    return this.members.get(id);
  }

  getAllMembers(): Member[] {
    return Array.from(this.members.values());
  }

  updateMemberStatus(memberId: string, newStatus: MemberStatus, source: string): boolean {
    const member = this.members.get(memberId);
    if (!member) return false;

    const oldStatus = member.currentStatus;
    member.currentStatus = newStatus;
    member.updatedAt = new Date().toISOString();

    this.addStatusHistory({
      memberId,
      status: newStatus,
      date: new Date().toISOString(),
      daysInStatus: this.calculateDaysInStatus(memberId),
      source,
    });

    return true;
  }

  private calculateDaysInStatus(memberId: string): number {
    const history = this.getStatusHistoryByMember(memberId);
    if (history.length === 0) return 0;

    const lastRecord = history[history.length - 1];
    const now = new Date();
    const lastDate = new Date(lastRecord.date);
    return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  addStatusHistory(record: Omit<StatusHistory, 'source'> & { source?: string }): StatusHistory {
    const newRecord: StatusHistory = {
      ...record,
      source: record.source || this.source,
    };
    this.statusHistory.push(newRecord);
    this.appendToFile('processed', 'status_history.json', newRecord);
    return newRecord;
  }

  getStatusHistoryByMember(memberId: string): StatusHistory[] {
    return this.statusHistory
      .filter(h => h.memberId === memberId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  getAllStatusHistory(): StatusHistory[] {
    return [...this.statusHistory];
  }

  addTouchRecord(
    record: Omit<TouchRecord, 'id' | 'version' | 'source' | 'timestamp'> & {
      timestamp?: string;
    }
  ): TouchRecord {
    const now = new Date().toISOString();
    const newRecord: TouchRecord = {
      ...record,
      id: uuidv4(),
      timestamp: record.timestamp || now,
      version: this.version,
      source: this.source,
    };
    this.touchRecords.push(newRecord);
    this.appendToFile('touch_history', `touch_${new Date().toISOString().split('T')[0]}.json`, newRecord);
    return newRecord;
  }

  getTouchRecordsByMember(memberId: string): TouchRecord[] {
    return this.touchRecords
      .filter(t => t.memberId === memberId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getTouchRecordsByStrategy(strategyId: string): TouchRecord[] {
    return this.touchRecords.filter(t => t.strategyId === strategyId);
  }

  getAllTouchRecords(): TouchRecord[] {
    return [...this.touchRecords];
  }

  getLastTouchByMember(memberId: string, channel?: string): TouchRecord | undefined {
    const records = this.getTouchRecordsByMember(memberId);
    if (channel) {
      return records.find(t => t.channel === channel);
    }
    return records[0];
  }

  addRenewalRecord(
    record: Omit<RenewalRecord, 'id' | 'version' | 'source' | 'timestamp'> & {
      timestamp?: string;
    }
  ): RenewalRecord {
    const now = new Date().toISOString();
    const newRecord: RenewalRecord = {
      ...record,
      id: uuidv4(),
      timestamp: record.timestamp || now,
      version: this.version,
      source: this.source,
    };
    this.renewalRecords.push(newRecord);
    this.appendToFile('processed', 'renewals.json', newRecord);
    return newRecord;
  }

  getRenewalsByMember(memberId: string): RenewalRecord[] {
    return this.renewalRecords
      .filter(r => r.memberId === memberId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getAllRenewals(): RenewalRecord[] {
    return [...this.renewalRecords];
  }

  addStrategy(
    strategy: Omit<Strategy, 'id' | 'version' | 'createdAt'> & {
      createdAt?: string;
    }
  ): Strategy {
    const now = new Date().toISOString();
    const newStrategy: Strategy = {
      ...strategy,
      id: uuidv4(),
      version: this.version,
      createdAt: strategy.createdAt || now,
    };
    this.strategies.set(newStrategy.id, newStrategy);
    this.writeFile('processed', `strategy_${newStrategy.id}.json`, JSON.stringify(newStrategy, null, 2));
    return newStrategy;
  }

  getStrategy(id: string): Strategy | undefined {
    return this.strategies.get(id);
  }

  getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  getActiveStrategies(): Strategy[] {
    return this.getAllStrategies().filter(s => s.isActive);
  }

  private appendToFile(subDir: string, filename: string, data: unknown): void {
    const filePath = path.join(this.dataDir, subDir, filename);
    let existing: unknown[] = [];

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        existing = JSON.parse(content);
        if (!Array.isArray(existing)) {
          existing = [existing];
        }
      } catch {
        existing = [];
      }
    }

    existing.push({
      ...(data as Record<string, unknown>),
      _recordedAt: new Date().toISOString(),
    });

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  }

  private writeFile(subDir: string, filename: string, content: string): void {
    const filePath = path.join(this.dataDir, subDir, filename);
    fs.writeFileSync(filePath, content);
  }

  exportAll(): Record<string, unknown> {
    return {
      members: Array.from(this.members.values()),
      statusHistory: this.statusHistory,
      touchRecords: this.touchRecords,
      renewalRecords: this.renewalRecords,
      strategies: Array.from(this.strategies.values()),
      metadata: {
        version: this.version,
        source: this.source,
        exportedAt: new Date().toISOString(),
      },
    };
  }

  getVersion(): string {
    return this.version;
  }

  getSource(): string {
    return this.source;
  }

  calculateStatusDistribution(): Record<MemberStatus, number> {
    const distribution: Record<MemberStatus, number> = {
      new: 0,
      active: 0,
      silent: 0,
      churned: 0,
      resurrected: 0,
    };

    const members = this.getAllMembers();
    members.forEach(m => {
      distribution[m.currentStatus]++;
    });

    return distribution;
  }

  getCurrentDistribution(): number[] {
    const dist = this.calculateStatusDistribution();
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const states: MemberStatus[] = ['new', 'active', 'silent', 'churned', 'resurrected'];
    return states.map(s => total > 0 ? dist[s] / total : 0);
  }
}
