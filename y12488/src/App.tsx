import { useEffect } from 'react';
import Scene3D from './components/Scene3D';
import Sidebar from './components/Sidebar';
import { useProjectStore } from './store/projectStore';
import {
  sampleBuildings,
  sampleSoundSources,
  sampleWindData,
  sampleComplaints,
  sampleTimeline,
  sampleHeatmap,
} from './data/sampleData';
import './App.css';

function App() {
  const {
    setBuildings,
    setSoundSources,
    setWindData,
    setComplaints,
    setTimeline,
    setHeatmap,
  } = useProjectStore();

  useEffect(() => {
    setBuildings(sampleBuildings);
    setSoundSources(sampleSoundSources);
    setWindData(sampleWindData);
    setComplaints(sampleComplaints);
    setTimeline(sampleTimeline);
    setHeatmap(sampleHeatmap);
  }, [setBuildings, setSoundSources, setWindData, setComplaints, setTimeline, setHeatmap]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      background: '#1a1a2e',
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Scene3D />
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(15, 52, 96, 0.9)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#fff',
          backdropFilter: 'blur(10px)',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>3D 声风场视图</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#8892b0' }}>
            鼠标拖拽旋转 · 滚轮缩放 · 右键平移
          </p>
        </div>
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(15, 52, 96, 0.9)',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600 }}>图例</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: '#4a90d9', borderRadius: '2px' }}></div>
              <span>居民楼</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: '#e74c3c', borderRadius: '2px' }}></div>
              <span>商业楼</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: '#f39c12', borderRadius: '2px' }}></div>
              <span>舞台</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: '#ff6b6b', borderRadius: '50%' }}></div>
              <span>声源</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: '#6bcfff', borderRadius: '50%' }}></div>
              <span>风场粒子</span>
            </div>
          </div>
        </div>
      </div>
      <Sidebar />
    </div>
  );
}

export default App;
