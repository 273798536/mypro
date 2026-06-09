import { useEffect } from 'react';
import { useAppStore } from '../store';
import ControlPanel from '../components/ControlPanel';
import ProfileCanvas from '../components/ProfileCanvas';
import RecordDetail from '../components/RecordDetail';
import { Train } from 'lucide-react';

export default function Home() {
  const initMockData = useAppStore((s) => s.initMockData);
  const records = useAppStore((s) => s.records);

  useEffect(() => {
    if (records.length === 0) {
      initMockData();
    }
  }, [records.length, initMockData]);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-metro-primary/20 border border-metro-primary flex items-center justify-center text-metro-primary">
              <Train size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-metro-text">
                地铁换乘楼层人流分析系统
              </h1>
              <p className="text-sm text-metro-muted">
                Metro Transfer Floor Flow Analytics · 异常离群点检测与复核
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-metro-panel border border-metro-border rounded-lg">
            <span className="status-dot bg-metro-success animate-pulse" />
            <span className="font-mono text-xs text-metro-text">系统在线</span>
          </div>
        </header>

        <ControlPanel />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          <div className="panel overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
            <div className="panel-header">
              <h3 className="panel-title">人流剖面图</h3>
              <div className="flex items-center gap-4 text-xs font-mono text-metro-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-metro-profile/80" />
                  正常人流
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-metro-anomaly animate-pulse" />
                  待复核
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-metro-danger" />
                  已确认
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-metro-muted" />
                  已排除
                </span>
              </div>
            </div>
            <div className="p-3 h-[calc(100%-49px)]">
              <ProfileCanvas />
            </div>
          </div>

          <div style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
            <RecordDetail />
          </div>
        </div>
      </div>
    </div>
  );
}
