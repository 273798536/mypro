import { useState, useCallback } from 'react';
import type { DataSource } from '../engine/types';
import { useGameStore } from '../store/useGameStore';

interface UseTraceabilityReturn {
  showTracePanel: boolean;
  currentDataSource: DataSource | null;
  openTracePanel: (dataSourceId: string) => void;
  closeTracePanel: () => void;
  getEventDataSources: (eventId: string) => DataSource[];
  getDecisionDataSources: (decisionId: string) => DataSource[];
}

export function useTraceability(): UseTraceabilityReturn {
  const [showTracePanel, setShowTracePanel] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<DataSource | null>(null);
  
  const getDataSourceById = useGameStore(state => state.getDataSourceById);
  const availableDataSources = useGameStore(state => state.availableDataSources);
  const gameState = useGameStore(state => state.state);

  const openTracePanel = useCallback((dataSourceId: string) => {
    const dataSource = getDataSourceById(dataSourceId);
    if (dataSource) {
      setCurrentDataSource(dataSource);
      setShowTracePanel(true);
    }
  }, [getDataSourceById]);

  const closeTracePanel = useCallback(() => {
    setShowTracePanel(false);
    setCurrentDataSource(null);
  }, []);

  const getEventDataSources = useCallback((eventId: string): DataSource[] => {
    if (!gameState) return [];
    
    const event = gameState.events.find(e => e.id === eventId);
    if (!event) return [];

    const sources: DataSource[] = [];
    const source = availableDataSources.find(ds => ds.id === event.dataSourceId);
    if (source) {
      sources.push(source);
    }

    return sources;
  }, [gameState, availableDataSources]);

  const getDecisionDataSources = useCallback((decisionId: string): DataSource[] => {
    if (!gameState) return [];
    
    const decision = gameState.decisions.find(d => d.id === decisionId);
    if (!decision) return [];

    return decision.dataSourceIds
      .map(id => availableDataSources.find(ds => ds.id === id))
      .filter((ds): ds is DataSource => ds !== undefined);
  }, [gameState, availableDataSources]);

  return {
    showTracePanel,
    currentDataSource,
    openTracePanel,
    closeTracePanel,
    getEventDataSources,
    getDecisionDataSources
  };
}
