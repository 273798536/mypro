import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Batch, DataRecord, SectionData, RecordType, RecordStatus } from '../types';
import { generateId, detectConflicts, recordSignature } from '../utils/helpers';
import { generateMockBatches, generateMockRecords, generateMockSections } from '../mock/data';

interface DataContextType {
  records: DataRecord[];
  batches: Batch[];
  sections: SectionData[];
  addBatch: (name: string, fileNames: string[], records: DataRecord[]) => Batch;
  addRecords: (records: DataRecord[]) => void;
  updateRecord: (id: string, patch: Partial<DataRecord>) => void;
  updateRecordOpinion: (id: string, opinion: string) => void;
  updateRecordStatus: (id: string, status: RecordStatus) => void;
  getRecordById: (id: string) => DataRecord | undefined;
  getBatchById: (id: string) => Batch | undefined;
  getRelatedRecords: (id: string) => DataRecord[];
  getSectionsByRecordId: (recordId: string) => SectionData[];
  filterRecords: (filters: { status?: RecordStatus[]; type?: RecordType[]; keyword?: string; batchId?: string }) => DataRecord[];
  deleteRecord: (id: string) => void;
  resetAll: () => void;
  stats: {
    total: number;
    normal: number;
    duplicate: number;
    conflict: number;
    missingCamera: number;
  };
}

const DataContext = createContext<DataContextType | null>(null);

const STORAGE_KEY_RECORDS = 'buoy_stereo_records_v1';
const STORAGE_KEY_BATCHES = 'buoy_stereo_batches_v1';
const STORAGE_KEY_SECTIONS = 'buoy_stereo_sections_v1';

export function DataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);

  useEffect(() => {
    const savedRecords = localStorage.getItem(STORAGE_KEY_RECORDS);
    const savedBatches = localStorage.getItem(STORAGE_KEY_BATCHES);
    const savedSections = localStorage.getItem(STORAGE_KEY_SECTIONS);

    if (savedRecords && savedBatches) {
      setRecords(JSON.parse(savedRecords));
      setBatches(JSON.parse(savedBatches));
      setSections(savedSections ? JSON.parse(savedSections) : []);
    } else {
      const mockBatches = generateMockBatches();
      const mockRecords = generateMockRecords(mockBatches);
      const mockSections = generateMockSections(mockRecords);
      setBatches(mockBatches);
      setRecords(mockRecords);
      setSections(mockSections);
    }
  }, []);

  useEffect(() => {
    if (records.length > 0) localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    if (batches.length > 0) localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    if (sections.length > 0) localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(sections));
  }, [sections]);

  const recomputeStatuses = useCallback((allRecords: DataRecord[]): DataRecord[] => {
    const signatureMap = new Map<string, DataRecord[]>();
    for (const r of allRecords) {
      const sig = recordSignature(r);
      if (!signatureMap.has(sig)) signatureMap.set(sig, []);
      signatureMap.get(sig)!.push(r);
    }

    return allRecords.map(r => {
      const sig = recordSignature(r);
      const group = signatureMap.get(sig) || [];
      let newStatus: RecordStatus = r.status;
      let duplicateOfId: string | undefined = r.duplicateOfId;

      if (r.type === 'model' && r.data.cameraAngle == null && r.status !== 'normal') {
        newStatus = 'missing_camera';
      } else if (group.length > 1) {
        const sorted = [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const original = sorted[0];
        if (original.id === r.id) {
          newStatus = 'normal';
          duplicateOfId = undefined;
        } else {
          const hasDataDiff = group.some(other => {
            if (other.id === r.id) return false;
            return JSON.stringify(other.data) !== JSON.stringify(r.data);
          });
          newStatus = hasDataDiff ? 'conflict' : 'duplicate';
          duplicateOfId = original.id;
        }
      } else {
        if (r.type === 'model' && r.data.cameraAngle == null) {
          newStatus = 'missing_camera';
        } else {
          newStatus = 'normal';
        }
        duplicateOfId = undefined;
      }

      return { ...r, status: newStatus, duplicateOfId, updatedAt: new Date().toISOString() };
    });
  }, []);

  const addBatch = useCallback((name: string, fileNames: string[], newRecords: DataRecord[]): Batch => {
    const batch: Batch = {
      id: generateId(),
      name,
      importTime: new Date().toISOString(),
      recordCount: newRecords.length,
      status: 'completed',
      fileNames,
    };
    setBatches(prev => [batch, ...prev]);

    setRecords(prev => {
      const combined = [...prev, ...newRecords];
      return recomputeStatuses(combined);
    });

    return batch;
  }, [recomputeStatuses]);

  const addRecords = useCallback((newRecords: DataRecord[]) => {
    setRecords(prev => recomputeStatuses([...prev, ...newRecords]));
  }, [recomputeStatuses]);

  const updateRecord = useCallback((id: string, patch: Partial<DataRecord>) => {
    setRecords(prev => recomputeStatuses(prev.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)));
  }, [recomputeStatuses]);

  const updateRecordOpinion = useCallback((id: string, opinion: string) => {
    updateRecord(id, { processingOpinion: opinion });
  }, [updateRecord]);

  const updateRecordStatus = useCallback((id: string, status: RecordStatus) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r));
  }, []);

  const getRecordById = useCallback((id: string) => records.find(r => r.id === id), [records]);
  const getBatchById = useCallback((id: string) => batches.find(b => b.id === id), [batches]);

  const getRelatedRecords = useCallback((id: string): DataRecord[] => {
    const record = records.find(r => r.id === id);
    if (!record) return [];
    const sig = recordSignature(record);
    return records.filter(r => r.id !== id && recordSignature(r) === sig);
  }, [records]);

  const getSectionsByRecordId = useCallback((recordId: string) => sections.filter(s => s.recordId === recordId), [sections]);

  const filterRecords = useCallback((filters: { status?: RecordStatus[]; type?: RecordType[]; keyword?: string; batchId?: string }): DataRecord[] => {
    return records.filter(r => {
      if (filters.status && !filters.status.includes(r.status)) return false;
      if (filters.type && !filters.type.includes(r.type)) return false;
      if (filters.batchId && r.batchId !== filters.batchId) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const inData = Object.values(r.data).some(v => String(v).toLowerCase().includes(kw));
        const inMeta = [r.fileName, r.sourceRemark, r.imageName || '', r.processingOpinion || ''].join(' ').toLowerCase().includes(kw);
        if (!inData && !inMeta) return false;
      }
      return true;
    });
  }, [records]);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => recomputeStatuses(prev.filter(r => r.id !== id)));
  }, [recomputeStatuses]);

  const resetAll = useCallback(() => {
    const mockBatches = generateMockBatches();
    const mockRecords = generateMockRecords(mockBatches);
    const mockSections = generateMockSections(mockRecords);
    setBatches(mockBatches);
    setRecords(mockRecords);
    setSections(mockSections);
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_BATCHES);
    localStorage.removeItem(STORAGE_KEY_SECTIONS);
  }, []);

  const stats = {
    total: records.length,
    normal: records.filter(r => r.status === 'normal').length,
    duplicate: records.filter(r => r.status === 'duplicate').length,
    conflict: records.filter(r => r.status === 'conflict').length,
    missingCamera: records.filter(r => r.status === 'missing_camera').length,
  };

  return (
    <DataContext.Provider value={{
      records, batches, sections,
      addBatch, addRecords, updateRecord, updateRecordOpinion, updateRecordStatus,
      getRecordById, getBatchById, getRelatedRecords, getSectionsByRecordId,
      filterRecords, deleteRecord, resetAll, stats,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
