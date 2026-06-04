import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAppStore } from './store/useAppStore';
import { loadMockData } from './data/mockData';

export default function App() {
  const init = useAppStore((state) => state.init);
  const initialized = useAppStore((state) => state.initialized);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      await init();
      const state = useAppStore.getState();
      if (state.equipment.length === 0 && state.sourceImages.length === 0) {
        await loadMockData(state);
      }
      setReady(true);
    };
    bootstrap();
  }, [init]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
