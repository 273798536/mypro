import { StatusBar } from './components/StatusBar';
import { PlanetMap } from './components/PlanetMap';
import { SamplePanel } from './components/SamplePanel';
import { PackagePanel } from './components/PackagePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { useGameStore } from './store/gameStore';

function App() {
  const { resetGame } = useGameStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#18181b', borderBottom: '1px solid #27272a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>🎵 音乐采样星际邮局</span>
          <span style={{ fontSize: '12px', color: '#71717a' }}>收集声音样本，合成节奏包裹</span>
        </div>
        <button className="btn btn-secondary btn-small" onClick={resetGame}>
          重新开始
        </button>
      </div>

      <StatusBar />

      <div className="app">
        <SamplePanel />
        
        <div className="center-panel">
          <PlanetMap />
          <HistoryPanel />
        </div>
        
        <PackagePanel />
      </div>

      <div style={{ padding: '12px 16px', background: '#18181b', borderTop: '1px solid #27272a', fontSize: '12px', color: '#71717a', display: 'flex', justifyContent: 'space-between' }}>
        <span>操作说明: 点击星球航行 → 采集采样 → 添加到包裹 → 合成投递</span>
        <span>提示: 高风险采样得分高但可能触发版权冲突，需要权衡取舍</span>
      </div>
    </div>
  );
}

export default App;
