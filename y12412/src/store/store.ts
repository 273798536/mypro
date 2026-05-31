import * as fs from 'fs';
import * as path from 'path';
import {
  SidePocket,
  InvestorShare,
  FeeRule,
  FeeDeduction,
  ValuationVersion,
  RedemptionFreeze,
  EstimationRecord,
} from '../models/types';

interface StoreData {
  sidePockets: Map<string, SidePocket>;
  investorShares: Map<string, InvestorShare>;
  feeRules: Map<string, FeeRule>;
  feeDeductions: Map<string, FeeDeduction>;
  valuationVersions: Map<string, ValuationVersion>;
  redemptionFreezes: Map<string, RedemptionFreeze>;
  estimationRecords: Map<string, EstimationRecord>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function mapToObj<V>(map: Map<string, V>): Record<string, V> {
  const obj: Record<string, V> = {};
  for (const [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

function objToMap<V>(obj: Record<string, V>): Map<string, V> {
  const map = new Map<string, V>();
  for (const [k, v] of Object.entries(obj)) {
    map.set(k, v);
  }
  return map;
}

function serialize(data: StoreData): object {
  return {
    sidePockets: mapToObj(data.sidePockets),
    investorShares: mapToObj(data.investorShares),
    feeRules: mapToObj(data.feeRules),
    feeDeductions: mapToObj(data.feeDeductions),
    valuationVersions: mapToObj(data.valuationVersions),
    redemptionFreezes: mapToObj(data.redemptionFreezes),
    estimationRecords: mapToObj(data.estimationRecords),
  };
}

function deserialize(raw: any): StoreData {
  return {
    sidePockets: objToMap<SidePocket>(raw.sidePockets || {}),
    investorShares: objToMap<InvestorShare>(raw.investorShares || {}),
    feeRules: objToMap<FeeRule>(raw.feeRules || {}),
    feeDeductions: objToMap<FeeDeduction>(raw.feeDeductions || {}),
    valuationVersions: objToMap<ValuationVersion>(raw.valuationVersions || {}),
    redemptionFreezes: objToMap<RedemptionFreeze>(raw.redemptionFreezes || {}),
    estimationRecords: objToMap<EstimationRecord>(raw.estimationRecords || {}),
  };
}

class Store {
  private data: StoreData;

  constructor() {
    this.data = {
      sidePockets: new Map(),
      investorShares: new Map(),
      feeRules: new Map(),
      feeDeductions: new Map(),
      valuationVersions: new Map(),
      redemptionFreezes: new Map(),
      estimationRecords: new Map(),
    };
    this.load();
  }

  private load(): void {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        this.data = deserialize(raw);
      } catch {
        this.data = {
          sidePockets: new Map(),
          investorShares: new Map(),
          feeRules: new Map(),
          feeDeductions: new Map(),
          valuationVersions: new Map(),
          redemptionFreezes: new Map(),
          estimationRecords: new Map(),
        };
      }
    }
  }

  save(): void {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(serialize(this.data), null, 2), 'utf-8');
  }

  get sidePockets() { return this.data.sidePockets; }
  get investorShares() { return this.data.investorShares; }
  get feeRules() { return this.data.feeRules; }
  get feeDeductions() { return this.data.feeDeductions; }
  get valuationVersions() { return this.data.valuationVersions; }
  get redemptionFreezes() { return this.data.redemptionFreezes; }
  get estimationRecords() { return this.data.estimationRecords; }
}

export const store = new Store();
