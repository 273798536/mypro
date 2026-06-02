import { create } from 'zustand';
import type { Device, BorrowRecord, Anomaly, InventoryCheck, ExportData } from '../../shared/types';
import { api } from '../utils/api';
import { generateConclusions } from '../utils/conclusions';

interface StoreState {
  devices: Device[];
  records: BorrowRecord[];
  anomalies: Anomaly[];
  inventoryChecks: InventoryCheck[];
  loading: boolean;
  error: string | null;
  exportData: ExportData | null;
  conclusions: string[];

  fetchAllData: () => Promise<void>;
  fetchDevices: () => Promise<void>;
  fetchRecords: () => Promise<void>;
  fetchAnomalies: () => Promise<void>;
  fetchInventory: () => Promise<void>;

  createBorrow: (data: {
    deviceId: string;
    deviceName: string;
    borrower: string;
    expectedReturnDate: string;
  }) => Promise<boolean>;
  returnDevice: (id: string, data?: { damageNote?: string; damagePhotoUrl?: string }) => Promise<boolean>;
  extendBorrow: (id: string, data: {
    newExpectedReturnDate: string;
    reason: string;
    author: string;
  }) => Promise<boolean>;
  addDeviceNote: (id: string, content: string, author: string) => Promise<boolean>;
  resolveAnomaly: (id: string, resolutionNote: string, newDeviceStatus?: string) => Promise<boolean>;
  detectAnomalies: () => Promise<boolean>;
  loadSampleData: () => Promise<boolean>;
  exportExcel: () => Promise<void>;
  generateExportData: () => Promise<void>;
  calculateConclusions: () => void;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  devices: [],
  records: [],
  anomalies: [],
  inventoryChecks: [],
  loading: false,
  error: null,
  exportData: null,
  conclusions: [],

  fetchAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [devicesRes, recordsRes, anomaliesRes, inventoryRes] = await Promise.all([
        api.devices.getAll(),
        api.records.getAll(),
        api.anomalies.getAll(),
        api.inventory.getAll()
      ]);

      if (devicesRes.success && devicesRes.data) {
        set({ devices: devicesRes.data });
      }
      if (recordsRes.success && recordsRes.data) {
        set({ records: recordsRes.data });
      }
      if (anomaliesRes.success && anomaliesRes.data) {
        set({ anomalies: anomaliesRes.data });
      }
      if (inventoryRes.success && inventoryRes.data) {
        set({ inventoryChecks: inventoryRes.data });
      }

      get().calculateConclusions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载数据失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchDevices: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.devices.getAll();
      if (res.success && res.data) {
        set({ devices: res.data });
        get().calculateConclusions();
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载设备失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchRecords: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.records.getAll();
      if (res.success && res.data) {
        set({ records: res.data });
        get().calculateConclusions();
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载记录失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchAnomalies: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.anomalies.getAll();
      if (res.success && res.data) {
        set({ anomalies: res.data });
        get().calculateConclusions();
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载异常失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchInventory: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.inventory.getAll();
      if (res.success && res.data) {
        set({ inventoryChecks: res.data });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载盘点失败' });
    } finally {
      set({ loading: false });
    }
  },

  createBorrow: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.records.borrow(data);
      if (res.success) {
        await get().fetchAllData();
        return true;
      }
      set({ error: res.error || '借出登记失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '借出登记失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  returnDevice: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.records.return(id, data);
      if (res.success) {
        await get().fetchAllData();
        return true;
      }
      set({ error: res.error || '归还登记失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '归还登记失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  extendBorrow: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.records.extend(id, data);
      if (res.success) {
        await get().fetchAllData();
        return true;
      }
      set({ error: res.error || '延期失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '延期失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  addDeviceNote: async (id, content, author) => {
    set({ loading: true, error: null });
    try {
      const res = await api.devices.addNote(id, { content, author });
      if (res.success) {
        await get().fetchDevices();
        return true;
      }
      set({ error: res.error || '添加备注失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '添加备注失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  resolveAnomaly: async (id, resolutionNote, newDeviceStatus) => {
    set({ loading: true, error: null });
    try {
      const res = await api.anomalies.resolve(id, { resolutionNote, newDeviceStatus });
      if (res.success) {
        await get().fetchAllData();
        return true;
      }
      set({ error: res.error || '处理异常失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '处理异常失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  detectAnomalies: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.anomalies.detect();
      if (res.success) {
        await get().fetchAllData();
        return true;
      }
      set({ error: res.error || '异常检测失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '异常检测失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  loadSampleData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.importExport.loadSample();
      if (res.success) {
        await get().fetchAllData();
        return true;
      }
      set({ error: res.error || '加载样例数据失败' });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '加载样例数据失败' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  exportExcel: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.importExport.exportExcel();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `音乐社团设备借还清单_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '导出失败' });
    } finally {
      set({ loading: false });
    }
  },

  generateExportData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.importExport.exportData();
      if (res.success && res.data) {
        set({ exportData: res.data });
        console.log('终端摘要 - 导出数据结论:');
        res.data.conclusions.forEach((c, i) => {
          console.log(`${i + 1}. ${c}`);
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '生成导出数据失败' });
    } finally {
      set({ loading: false });
    }
  },

  calculateConclusions: () => {
    const { devices, records, anomalies } = get();
    const conclusions = generateConclusions(devices, records, anomalies);
    set({ conclusions });

    console.log('终端摘要 - 借还状态结论:');
    conclusions.forEach((c, i) => {
      console.log(`${i + 1}. ${c}`);
    });
  },

  setError: (error) => set({ error })
}));
