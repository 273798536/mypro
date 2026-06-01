import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useStore } from './store'
import { generateSampleData } from './utils/sampleData'

function InitializeApp() {
  const loadData = useStore(state => state.loadData);
  const coils = useStore(state => state.coils);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (coils.length === 0) {
      const hasInitialized = localStorage.getItem('emi_calc_initialized');
      if (!hasInitialized) {
        generateSampleData();
        localStorage.setItem('emi_calc_initialized', 'true');
        loadData();
      }
    }
  }, [coils.length, loadData]);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InitializeApp />
  </StrictMode>,
)
