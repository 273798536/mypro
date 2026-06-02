import type { Device, BorrowRecord, Anomaly, InventoryCheck } from '../../shared/types';
import { mockDevices, mockRecords, mockAnomalies, mockInventoryChecks } from './mockData';

class DataStore {
  private devices: Device[] = [...mockDevices];
  private records: BorrowRecord[] = [...mockRecords];
  private anomalies: Anomaly[] = [...mockAnomalies];
  private inventoryChecks: InventoryCheck[] = [...mockInventoryChecks];

  getDevices(): Device[] {
    return [...this.devices];
  }

  getDeviceById(id: string): Device | undefined {
    return this.devices.find(d => d.id === id);
  }

  addDevice(device: Device): void {
    this.devices.push(device);
  }

  updateDevice(id: string, updates: Partial<Device>): Device | undefined {
    const index = this.devices.findIndex(d => d.id === id);
    if (index !== -1) {
      this.devices[index] = { ...this.devices[index], ...updates, updatedAt: new Date().toISOString() };
      return this.devices[index];
    }
    return undefined;
  }

  getRecords(): BorrowRecord[] {
    return [...this.records];
  }

  getRecordById(id: string): BorrowRecord | undefined {
    return this.records.find(r => r.id === id);
  }

  getRecordsByDeviceId(deviceId: string): BorrowRecord[] {
    return this.records.filter(r => r.deviceId === deviceId);
  }

  addRecord(record: BorrowRecord): void {
    this.records.push(record);
  }

  updateRecord(id: string, updates: Partial<BorrowRecord>): BorrowRecord | undefined {
    const index = this.records.findIndex(r => r.id === id);
    if (index !== -1) {
      this.records[index] = { ...this.records[index], ...updates, updatedAt: new Date().toISOString() };
      return this.records[index];
    }
    return undefined;
  }

  getAnomalies(): Anomaly[] {
    return [...this.anomalies];
  }

  getAnomalyById(id: string): Anomaly | undefined {
    return this.anomalies.find(a => a.id === id);
  }

  addAnomaly(anomaly: Anomaly): void {
    this.anomalies.push(anomaly);
  }

  updateAnomaly(id: string, updates: Partial<Anomaly>): Anomaly | undefined {
    const index = this.anomalies.findIndex(a => a.id === id);
    if (index !== -1) {
      this.anomalies[index] = { ...this.anomalies[index], ...updates };
      return this.anomalies[index];
    }
    return undefined;
  }

  getInventoryChecks(): InventoryCheck[] {
    return [...this.inventoryChecks];
  }

  getInventoryCheckById(id: string): InventoryCheck | undefined {
    return this.inventoryChecks.find(i => i.id === id);
  }

  addInventoryCheck(check: InventoryCheck): void {
    this.inventoryChecks.push(check);
  }

  updateInventoryCheck(id: string, updates: Partial<InventoryCheck>): InventoryCheck | undefined {
    const index = this.inventoryChecks.findIndex(i => i.id === id);
    if (index !== -1) {
      this.inventoryChecks[index] = { ...this.inventoryChecks[index], ...updates };
      return this.inventoryChecks[index];
    }
    return undefined;
  }

  resetToSample(): void {
    this.devices = [...mockDevices];
    this.records = [...mockRecords];
    this.anomalies = [...mockAnomalies];
    this.inventoryChecks = [...mockInventoryChecks];
  }

  importData(data: { devices?: Device[]; records?: BorrowRecord[]; anomalies?: Anomaly[]; inventoryChecks?: InventoryCheck[] }): void {
    if (data.devices) this.devices = data.devices;
    if (data.records) this.records = data.records;
    if (data.anomalies) this.anomalies = data.anomalies;
    if (data.inventoryChecks) this.inventoryChecks = data.inventoryChecks;
  }

  getAllData() {
    return {
      devices: this.devices,
      records: this.records,
      anomalies: this.anomalies,
      inventoryChecks: this.inventoryChecks
    };
  }
}

export const store = new DataStore();
