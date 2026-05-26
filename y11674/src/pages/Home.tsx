import { useEffect } from 'react';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { ControlPanel } from '../components/ControlPanel/ControlPanel';
import { InfoPanel } from '../components/InfoPanel/InfoPanel';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { NetworkGraph } from '../components/NetworkGraph/NetworkGraph';
import { useNetworkStore } from '../store/useNetworkStore';

export default function Home() {
  const { generateMockData, loadParams, nodes } = useNetworkStore();

  useEffect(() => {
    loadParams();
    if (nodes.length === 0) {
      generateMockData();
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />
        <div className="flex-1 relative">
          <NetworkGraph />
        </div>
        <InfoPanel />
      </div>
      <StatusBar />
    </div>
  );
}
