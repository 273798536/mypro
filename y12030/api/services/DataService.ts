import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Employee,
  VestingPlan,
  Grant,
  Exercise,
  CorrectionHistory,
  VestingSchedule,
} from '../../shared/types.js';
import { sampleData } from '../data/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data', 'persisted');

interface DataStore {
  employees: Employee[];
  plans: VestingPlan[];
  grants: Grant[];
  exercises: Exercise[];
  corrections: CorrectionHistory[];
  schedules: Record<string, VestingSchedule[]>;
}

export class DataService {
  private static instance: DataService;
  private store: DataStore;

  private constructor() {
    this.store = this.initializeStore();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private initializeStore(): DataStore {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const dataFile = path.join(DATA_DIR, 'store.json');
    if (fs.existsSync(dataFile)) {
      try {
        const data = fs.readFileSync(dataFile, 'utf-8');
        return JSON.parse(data);
      } catch {
        return this.createFreshStore();
      }
    } else {
      const store = this.createFreshStore();
      this.saveStore(store);
      return store;
    }
  }

  private createFreshStore(): DataStore {
    return {
      employees: sampleData.employees,
      plans: sampleData.plans,
      grants: sampleData.grants,
      exercises: sampleData.exercises,
      corrections: sampleData.corrections,
      schedules: {},
    };
  }

  private saveStore(store: DataStore): void {
    const dataFile = path.join(DATA_DIR, 'store.json');
    fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
  }

  private persist(): void {
    this.saveStore(this.store);
  }

  public getEmployees(): Employee[] {
    return [...this.store.employees];
  }

  public getEmployee(id: string): Employee | undefined {
    return this.store.employees.find((e) => e.id === id);
  }

  public getPlans(): VestingPlan[] {
    return [...this.store.plans];
  }

  public getPlan(id: string): VestingPlan | undefined {
    return this.store.plans.find((p) => p.id === id);
  }

  public getGrants(): Grant[] {
    return [...this.store.grants];
  }

  public getGrant(id: string): Grant | undefined {
    return this.store.grants.find((g) => g.id === id);
  }

  public getGrantsByEmployee(employeeId: string): Grant[] {
    return this.store.grants.filter((g) => g.employeeId === employeeId);
  }

  public getExercises(): Exercise[] {
    return [...this.store.exercises];
  }

  public getExercisesByEmployee(employeeId: string): Exercise[] {
    return this.store.exercises.filter((e) => e.employeeId === employeeId);
  }

  public getExercise(id: string): Exercise | undefined {
    return this.store.exercises.find((e) => e.id === id);
  }

  public addExercise(exercise: Exercise): Exercise {
    this.store.exercises.push(exercise);
    this.persist();
    return exercise;
  }

  public updateExercise(id: string, updates: Partial<Exercise>): Exercise | undefined {
    const index = this.store.exercises.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    this.store.exercises[index] = { ...this.store.exercises[index], ...updates };
    this.persist();
    return this.store.exercises[index];
  }

  public getCorrections(): CorrectionHistory[] {
    return [...this.store.corrections];
  }

  public getCorrectionsByGrant(grantId: string): CorrectionHistory[] {
    return this.store.corrections.filter((c) => c.grantId === grantId);
  }

  public addCorrection(correction: CorrectionHistory): CorrectionHistory {
    this.store.corrections.push(correction);
    this.persist();
    return correction;
  }

  public updateGrant(id: string, updates: Partial<Grant>): Grant | undefined {
    const index = this.store.grants.findIndex((g) => g.id === id);
    if (index === -1) return undefined;
    this.store.grants[index] = { ...this.store.grants[index], ...updates };
    this.persist();
    return this.store.grants[index];
  }

  public getSchedules(grantId: string): VestingSchedule[] | undefined {
    return this.store.schedules[grantId];
  }

  public setSchedules(grantId: string, schedules: VestingSchedule[]): void {
    this.store.schedules[grantId] = schedules;
    this.persist();
  }

  public clearSchedules(grantId: string): void {
    delete this.store.schedules[grantId];
    this.persist();
  }
}
