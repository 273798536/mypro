import { useEffect } from 'react';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Samples from './pages/Samples';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const viewMode = useAppStore(state => state.viewMode);
  const loadSampleData = useAppStore(state => state.loadSampleData);
  const trackPoints = useAppStore(state => state.trackPoints);

  useEffect(() => {
    if (trackPoints.length === 0) {
      loadSampleData('boundary-misjudge');
    }
  }, [loadSampleData, trackPoints.length]);

  const renderView = () => {
    switch (viewMode) {
      case 'dashboard':
        return <Dashboard />;
      case 'report':
        return <Report />;
      case 'samples':
        return <Samples />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
}
