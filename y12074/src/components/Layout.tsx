import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/store/useAppStore';
import {
  generateMockChuteModels,
  generateMockSortingPorts,
  generateMockLuggageData,
  generateMockAnomalies,
  generateMockBadRows,
} from '@/utils/mockData';
import { detectAllAnomalies } from '@/utils/anomalyDetector';

export function Layout() {
  const {
    setChuteModels,
    setSortingPorts,
    setLuggageData,
    setAnomalies,
    setBadRows,
    setDataLoaded,
    isDataLoaded,
    anomalies,
    badRows,
    setSelectedChuteId,
  } = useAppStore();

  useEffect(() => {
    if (!isDataLoaded) {
      const chutes = generateMockChuteModels();
      const ports = generateMockSortingPorts();
      const luggage = generateMockLuggageData();
      const badRowsData = generateMockBadRows();

      const detectedAnomalies = luggage.length > 0 && chutes.length > 0
        ? detectAllAnomalies(luggage, chutes[0])
        : generateMockAnomalies();

      setChuteModels(chutes);
      setSortingPorts(ports);
      setLuggageData(luggage);
      setAnomalies(detectedAnomalies);
      setBadRows(badRowsData);
      setSelectedChuteId(chutes[0]?.id || null);
      setDataLoaded(true);
    }
  }, [isDataLoaded, setChuteModels, setSortingPorts, setLuggageData, setAnomalies, setBadRows, setDataLoaded, setSelectedChuteId]);

  const unreviewedCount = anomalies.filter((a) => !a.reviewed).length;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar anomalyCount={unreviewedCount} badRowCount={badRows.length} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
