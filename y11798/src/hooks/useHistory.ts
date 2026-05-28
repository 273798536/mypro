import { useState, useEffect, useCallback } from 'react';
import { HistoryRecord, CalculationInput, CalculationResult, ValidationError, Correction } from '../types';

const STORAGE_KEY = 'hydraulic-jack-history';

export function useHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveToStorage = useCallback((records: HistoryRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, []);

  const addRecord = useCallback((
    input: CalculationInput, result: CalculationResult, errors: ValidationError[], corrections: Correction[]) => {
    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      input,
      result,
      errors,
      corrections,
    };

    setHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 50);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const deleteRecord = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    addRecord,
    deleteRecord,
    clearHistory,
  };
}
