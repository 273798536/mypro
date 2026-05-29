import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { SidebarLeft } from './components/layout/SidebarLeft';
import { SidebarRight } from './components/layout/SidebarRight';
import { Building3D } from './components/three/Building3D';
import { DataManagement } from './components/modals/DataManagement';
import { HistoryRecords } from './components/modals/HistoryRecords';
import type { CameraState } from './types';

function App() {
  const {
    buildingModel,
    meterData,
    energyType,
    selectedFloor,
    selectedDevice,
    cameraState,
    setSelectedFloor,
    setSelectedDevice,
    setCameraState,
    loadHistoryRecords,
  } = useAppStore();

  useEffect(() => {
    loadHistoryRecords();
  }, [loadHistoryRecords]);

  const handleCameraChange = (state: CameraState) => {
    setCameraState(state);
  };

  return (
    <div
      id="app-container"
      className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden"
    >
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <SidebarLeft />

        <main className="flex-1 relative">
          <Building3D
            buildingModel={buildingModel}
            meterData={meterData}
            energyType={energyType}
            selectedFloor={selectedFloor}
            selectedDevice={selectedDevice}
            cameraState={cameraState}
            onSelectFloor={setSelectedFloor}
            onSelectDevice={setSelectedDevice}
            onCameraChange={handleCameraChange}
          />

          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400 border border-slate-700">
            <div>🖱️ 左键拖拽旋转 · 滚轮缩放 · 右键平移</div>
          </div>
        </main>

        <SidebarRight />
      </div>

      <DataManagement />
      <HistoryRecords />
    </div>
  );
}

export default App;
