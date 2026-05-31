import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { CleaningPage } from './pages/CleaningPage';
import { CalculationPage } from './pages/CalculationPage';
import { ReviewPage } from './pages/ReviewPage';
import { TracePage } from './pages/TracePage';
import { ChartsPage } from './pages/ChartsPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { initDatabase } from './db';
import { useDataStore } from './stores/dataStore';

const App: React.FC = () => {
  const { isLoading, setIsLoading } = useDataStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error('Database initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [setIsLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/cleaning" element={<CleaningPage />} />
          <Route path="/calculation" element={<CalculationPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/trace/:id" element={<TracePage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
