import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppHeader from '@/components/layout/AppHeader';
import ToastStack from '@/components/layout/ToastStack';
import AppRoutes from '@/router';
import { useAppStore } from '@/store/useAppStore';
import { mockReactorParts } from '@/data/mockReactor';
import { mockRiskNotes, mockConclusions } from '@/data/mockRecords';

export default function App() {
  const bootstrapIfFirstRun = useAppStore((s) => s.bootstrapIfFirstRun);

  useEffect(() => {
    bootstrapIfFirstRun(mockReactorParts, mockRiskNotes, mockConclusions);
  }, [bootstrapIfFirstRun]);

  return (
    <BrowserRouter>
      <AppHeader />
      <ToastStack />
      <main className="h-[calc(100vh-56px)]">
        <AppRoutes />
      </main>
    </BrowserRouter>
  );
}
