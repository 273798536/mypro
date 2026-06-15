import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ChorusAlertRecord,
  FilterCriteria,
  HistoryAction,
  ManualNote,
  AlertLevel,
  RecordStatus,
} from '../types';
import { defaultFilterCriteria } from '../types';
import {
  getAllRecords,
  saveRecord,
  getAllHistory,
  addHistoryAction,
  getFilterCriteria,
  saveFilterCriteria,
  filterRecords as applyFilter,
  saveRecords,
  saveHistory,
} from '../db';
import { mockRecords, generateMockHistory } from '../data/mockData';

interface AppContextValue {
  records: ChorusAlertRecord[];
  filteredRecords: ChorusAlertRecord[];
  filterCriteria: FilterCriteria;
  selectedRecordId: string | null;
  history: HistoryAction[];
  selectRecord: (id: string | null) => void;
  setFilterCriteria: (criteria: FilterCriteria) => void;
  resetFilterCriteria: () => void;
  updateRecordStatus: (id: string, status: RecordStatus) => void;
  updateRecordLevel: (id: string, level: AlertLevel, note?: string) => void;
  addManualNote: (recordId: string, content: string, author: string) => void;
  updateManualNote: (recordId: string, noteId: string, content: string) => void;
  reloadMockData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<ChorusAlertRecord[]>([]);
  const [filterCriteria, setFilterCriteriaState] = useState<FilterCriteria>(defaultFilterCriteria);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function loadData() {
      const storedRecords = await getAllRecords();
      const storedHistory = await getAllHistory();
      const storedFilters = await getFilterCriteria();

      if (storedRecords.length === 0) {
        const initialRecords = mockRecords;
        const initialHistory = generateMockHistory(initialRecords);
        await saveRecords(initialRecords);
        await saveHistory(initialHistory);
        setRecords(initialRecords);
        setHistory(initialHistory);
      } else {
        setRecords(storedRecords);
        setHistory(storedHistory);
      }

      if (storedFilters) {
        setFilterCriteriaState(storedFilters);
      }
      setInitialized(true);
    }
    loadData();
  }, []);

  const setFilterCriteria = useCallback(async (criteria: FilterCriteria) => {
    setFilterCriteriaState(criteria);
    await saveFilterCriteria(criteria);
  }, []);

  const resetFilterCriteria = useCallback(async () => {
    setFilterCriteriaState(defaultFilterCriteria);
    await saveFilterCriteria(defaultFilterCriteria);
  }, []);

  const selectRecord = useCallback((id: string | null) => {
    setSelectedRecordId(id);
  }, []);

  const pushHistory = useCallback(async (action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    const fullAction: HistoryAction = {
      ...action,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => [...prev, fullAction]);
    await addHistoryAction(fullAction);
  }, []);

  const updateRecordStatus = useCallback(
    async (id: string, status: RecordStatus) => {
      setRecords((prev) => {
        const next = prev.map((r) =>
          r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
        );
        const target = next.find((r) => r.id === id);
        if (target) saveRecord(target);
        return next;
      });
      const oldRecord = records.find((r) => r.id === id);
      await pushHistory({
        recordId: id,
        actionType: 'update_status',
        fieldName: 'status',
        oldValue: oldRecord?.status,
        newValue: status,
        operator: '阿蓝',
        description: `更新状态：${oldRecord?.status ?? ''} → ${status}`,
      });
    },
    [records, pushHistory]
  );

  const updateRecordLevel = useCallback(
    async (id: string, level: AlertLevel, note?: string) => {
      setRecords((prev) => {
        const next = prev.map((r) =>
          r.id === id
            ? {
                ...r,
                alertLevel: level,
                operatorOverride: {
                  overrideLevel: level,
                  overrideNote: note,
                  operator: '阿蓝',
                  timestamp: new Date().toISOString(),
                },
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        const target = next.find((r) => r.id === id);
        if (target) saveRecord(target);
        return next;
      });
      const oldRecord = records.find((r) => r.id === id);
      await pushHistory({
        recordId: id,
        actionType: 'update_judgment',
        fieldName: 'alertLevel',
        oldValue: oldRecord?.alertLevel,
        newValue: level,
        operator: '阿蓝',
        description: note || `人工调整异常等级：${oldRecord?.alertLevel ?? ''} → ${level}`,
      });
    },
    [records, pushHistory]
  );

  const addManualNote = useCallback(
    async (recordId: string, content: string, author: string) => {
      const now = new Date().toISOString();
      const newNote: ManualNote = {
        id: uuidv4(),
        content,
        author,
        createdAt: now,
        updatedAt: now,
      };
      setRecords((prev) => {
        const next = prev.map((r) =>
          r.id === recordId
            ? { ...r, manualNotes: [...r.manualNotes, newNote], updatedAt: now }
            : r
        );
        const target = next.find((r) => r.id === recordId);
        if (target) saveRecord(target);
        return next;
      });
      await pushHistory({
        recordId,
        actionType: 'add_note',
        operator: author,
        description: `添加人工备注：${content.slice(0, 30)}${content.length > 30 ? '...' : ''}`,
      });
    },
    [pushHistory]
  );

  const updateManualNote = useCallback(
    async (recordId: string, noteId: string, content: string) => {
      const now = new Date().toISOString();
      setRecords((prev) => {
        const next = prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                manualNotes: r.manualNotes.map((n) =>
                  n.id === noteId ? { ...n, content, updatedAt: now } : n
                ),
                updatedAt: now,
              }
            : r
        );
        const target = next.find((r) => r.id === recordId);
        if (target) saveRecord(target);
        return next;
      });
      await pushHistory({
        recordId,
        actionType: 'update_note',
        operator: '阿蓝',
        description: `更新备注：${content.slice(0, 30)}${content.length > 30 ? '...' : ''}`,
      });
    },
    [pushHistory]
  );

  const reloadMockData = useCallback(async () => {
    const initialRecords = mockRecords;
    const initialHistory = generateMockHistory(initialRecords);
    await saveRecords(initialRecords);
    await saveHistory(initialHistory);
    setRecords(initialRecords);
    setHistory(initialHistory);
    setFilterCriteriaState(defaultFilterCriteria);
    setSelectedRecordId(null);
  }, []);

  const filteredRecords = useMemo(
    () => applyFilter(records, filterCriteria),
    [records, filterCriteria]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      records,
      filteredRecords,
      filterCriteria,
      selectedRecordId,
      history,
      selectRecord,
      setFilterCriteria,
      resetFilterCriteria,
      updateRecordStatus,
      updateRecordLevel,
      addManualNote,
      updateManualNote,
      reloadMockData,
    }),
    [
      records,
      filteredRecords,
      filterCriteria,
      selectedRecordId,
      history,
      selectRecord,
      setFilterCriteria,
      resetFilterCriteria,
      updateRecordStatus,
      updateRecordLevel,
      addManualNote,
      updateManualNote,
      reloadMockData,
    ]
  );

  if (!initialized) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        合唱声部异常提醒系统加载中...
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
