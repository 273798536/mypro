import { createContext, useContext, ReactNode } from 'react';
import { ScoreRecord, AnomalyRecord, LayerItem, Annotation, ColorRule } from '../types';
import { sampleScoreRecords, sampleAnomalies, sampleLayers, sampleColorRule } from '../data/sampleData';

interface AppState {
  scoreRecords: ScoreRecord[];
  anomalies: AnomalyRecord[];
  layers: LayerItem[];
  annotations: Annotation[];
  colorRules: ColorRule[];
  activeColorRule: ColorRule | null;
  selectedRecordId: string | null;
  selectedAnomalyId: string | null;
  gridSize: number;
  snapToGrid: boolean;
}

interface AppContextType extends AppState {
  setScoreRecords: (records: ScoreRecord[]) => void;
  setAnomalies: (anomalies: AnomalyRecord[]) => void;
  setLayers: (layers: LayerItem[]) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setActiveColorRule: (rule: ColorRule | null) => void;
  setSelectedRecordId: (id: string | null) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  updateRecordStatus: (recordId: string, status: ScoreRecord['status']) => void;
  resolveAnomaly: (anomalyId: string, resolver: string) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    scoreRecords: sampleScoreRecords,
    anomalies: sampleAnomalies,
    layers: sampleLayers,
    annotations: [],
    colorRules: [sampleColorRule],
    activeColorRule: sampleColorRule,
    selectedRecordId: null,
    selectedAnomalyId: null,
    gridSize: 20,
    snapToGrid: true,
  });

  const setScoreRecords = (records: ScoreRecord[]) =>
    setState(s => ({ ...s, scoreRecords: records }));

  const setAnomalies = (anomalies: AnomalyRecord[]) =>
    setState(s => ({ ...s, anomalies }));

  const setLayers = (layers: LayerItem[]) =>
    setState(s => ({ ...s, layers }));

  const setAnnotations = (annotations: Annotation[]) =>
    setState(s => ({ ...s, annotations }));

  const setActiveColorRule = (rule: ColorRule | null) =>
    setState(s => ({ ...s, activeColorRule: rule }));

  const setSelectedRecordId = (id: string | null) =>
    setState(s => ({ ...s, selectedRecordId: id }));

  const setSelectedAnomalyId = (id: string | null) =>
    setState(s => ({ ...s, selectedAnomalyId: id }));

  const setGridSize = (size: number) =>
    setState(s => ({ ...s, gridSize: size }));

  const setSnapToGrid = (snap: boolean) =>
    setState(s => ({ ...s, snapToGrid: snap }));

  const addAnnotation = (annotation: Annotation) =>
    setState(s => ({ ...s, annotations: [...s.annotations, annotation] }));

  const updateAnnotation = (id: string, updates: Partial<Annotation>) =>
    setState(s => ({
      ...s,
      annotations: s.annotations.map(a =>
        a.id === id ? { ...a, ...updates } : a
      )
    }));

  const deleteAnnotation = (id: string) =>
    setState(s => ({
      ...s,
      annotations: s.annotations.filter(a => a.id !== id)
    }));

  const toggleLayerVisibility = (layerId: string) =>
    setState(s => ({
      ...s,
      layers: s.layers.map(l =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      )
    }));

  const updateRecordStatus = (recordId: string, status: ScoreRecord['status']) =>
    setState(s => ({
      ...s,
      scoreRecords: s.scoreRecords.map(r =>
        r.id === recordId ? { ...r, status, reviewTime: new Date().toISOString() } : r
      )
    }));

  const resolveAnomaly = (anomalyId: string, resolver: string) =>
    setState(s => ({
      ...s,
      anomalies: s.anomalies.map(a =>
        a.id === anomalyId
          ? { ...a, status: 'resolved', resolvedAt: new Date().toISOString(), resolver }
          : a
      )
    }));

  return (
    <AppContext.Provider
      value={{
        ...state,
        setScoreRecords,
        setAnomalies,
        setLayers,
        setAnnotations,
        setActiveColorRule,
        setSelectedRecordId,
        setSelectedAnomalyId,
        setGridSize,
        setSnapToGrid,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        toggleLayerVisibility,
        updateRecordStatus,
        resolveAnomaly,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

import { useState } from 'react';
