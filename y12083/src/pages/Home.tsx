import { useEffect } from 'react';
import { Scene3D } from '../components/Scene3D';
import { ControlPanel } from '../components/ControlPanel';
import { Timeline } from '../components/Timeline';
import { DiagnosticPanel } from '../components/DiagnosticPanel';
import { AngleLabelsGroup } from '../components/Annotations/AngleLabel';
import { Timestamp } from '../components/Annotations/Timestamp';
import { RemarksDisplay, DataQualityBadge } from '../components/Annotations/AnnotationText';
import { usePlaybackControl } from '../hooks/usePlaybackControl';
import { useDataLoader } from '../hooks/useDataLoader';
import { useAttitudeStore } from '../store/useAttitudeStore';

export default function Home() {
  usePlaybackControl();
  const { loadSampleData } = useDataLoader();
  const { isPanelCollapsed } = useAttitudeStore();

  useEffect(() => {
    loadSampleData('gimbal-lock');
  }, [loadSampleData]);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: '#0a1628' }}>
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          right: isPanelCollapsed ? 0 : '320px',
          bottom: '140px',
        }}
      >
        <Scene3D className="w-full h-full" />

        <AngleLabelsGroup />

        <Timestamp />

        <DataQualityBadge />

        <RemarksDisplay />
      </div>

      <DiagnosticPanel />

      <ControlPanel />

      <Timeline />

      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-2 rounded-lg"
        style={{
          backgroundColor: 'rgba(10, 22, 40, 0.9)',
          border: '1px solid #1e3a5f',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h1
          className="text-lg font-bold tracking-wider"
          style={{
            color: '#e8f4ff',
            fontFamily: 'Orbitron, sans-serif',
          }}
        >
          航天器姿态可视化系统
        </h1>
      </div>
    </div>
  );
}
