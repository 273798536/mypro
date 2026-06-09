import { useAppStore } from '../store';
import { Play, Pause, RotateCcw, Trophy, Search, Camera, Upload, Download, GitCompare, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ControlPanel() {
  const session = useAppStore((s) => s.session);
  const records = useAppStore((s) => s.records);
  const anomalies = useAppStore((s) => s.anomalies);
  const snapshots = useAppStore((s) => s.snapshots);
  const startGame = useAppStore((s) => s.startGame);
  const pauseGame = useAppStore((s) => s.pauseGame);
  const resumeGame = useAppStore((s) => s.resumeGame);
  const resetGame = useAppStore((s) => s.resetGame);
  const finishGame = useAppStore((s) => s.finishGame);
  const startReview = useAppStore((s) => s.startReview);
  const saveSnapshot = useAppStore((s) => s.saveSnapshot);
  const initMockData = useAppStore((s) => s.initMockData);
  const importData = useAppStore((s) => s.importData);

  const navigate = useNavigate();

  const pendingCount = anomalies.filter((a) => a.status === 'pending').length;
  const confirmedCount = anomalies.filter((a) => a.status === 'confirmed').length;
  const dismissedCount = anomalies.filter((a) => a.status === 'dismissed').length;

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          importData(data);
        }
      } catch {
        alert('文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const report = {
      generatedAt: Date.now(),
      sessionId: session?.id || 'N/A',
      totalRecords: records.length,
      anomaliesFound: anomalies.length,
      anomaliesConfirmed: confirmedCount,
      anomaliesDismissed: dismissedCount,
      records,
      anomalies,
      snapshots,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro_flow_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRunning = session?.status === 'running';
  const isPaused = session?.status === 'paused';
  const isFinished = session?.status === 'finished';
  const isReviewing = session?.status === 'reviewing';

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 px-3 py-1.5 bg-metro-bg border border-metro-border rounded-lg">
          <span
            className={`status-dot ${
              isRunning ? 'bg-metro-success animate-pulse'
                : isPaused ? 'bg-metro-warning'
                : isFinished ? 'bg-metro-primary'
                : isReviewing ? 'bg-metro-accent'
                : 'bg-metro-muted'
            }`}
          />
          <span className="font-mono text-xs text-metro-text ml-1">
            {isRunning ? '运行中'
              : isPaused ? '已暂停'
              : isFinished ? '已结算'
              : isReviewing ? '复盘中'
              : '待启动'}
          </span>
        </div>

        {records.length === 0 && (
          <button onClick={initMockData} className="btn-control btn-primary flex items-center gap-1.5">
            <Play size={14} />
            加载示例数据
          </button>
        )}

        {records.length > 0 && !session && (
          <button onClick={startGame} className="btn-control btn-primary flex items-center gap-1.5">
            <Play size={14} />
            开始检测
          </button>
        )}

        {session && isRunning && (
          <button onClick={pauseGame} className="btn-control btn-warning flex items-center gap-1.5">
            <Pause size={14} />
            暂停
          </button>
        )}

        {session && isPaused && (
          <button onClick={resumeGame} className="btn-control btn-primary flex items-center gap-1.5">
            <Play size={14} />
            继续
          </button>
        )}

        {session && (isRunning || isPaused) && (
          <>
            <button onClick={finishGame} className="btn-control btn-success flex items-center gap-1.5">
              <Trophy size={14} />
              结算
            </button>
            <button onClick={resetGame} className="btn-control btn-danger flex items-center gap-1.5">
              <RotateCcw size={14} />
              重开
            </button>
          </>
        )}

        {session && isFinished && (
          <>
            <button onClick={startReview} className="btn-control btn-primary flex items-center gap-1.5">
              <Search size={14} />
              复盘
            </button>
            <button onClick={resetGame} className="btn-control flex items-center gap-1.5">
              <RotateCcw size={14} />
              重开
            </button>
          </>
        )}

        {session && isReviewing && (
          <button onClick={resetGame} className="btn-control btn-danger flex items-center gap-1.5">
            <RotateCcw size={14} />
            结束复盘
          </button>
        )}

        <div className="flex-1" />

        <label className="btn-control flex items-center gap-1.5 cursor-pointer">
          <Upload size={14} />
          导入
          <input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
        </label>

        <button onClick={() => saveSnapshot(`快照 ${snapshots.length + 1}`)} className="btn-control flex items-center gap-1.5">
          <Camera size={14} />
          保存剖面
        </button>

        <button onClick={handleExport} className="btn-control flex items-center gap-1.5">
          <Download size={14} />
          导出
        </button>

        <button onClick={() => navigate('/compare')} className="btn-control flex items-center gap-1.5">
          <GitCompare size={14} />
          剖面图对比
        </button>

        <button onClick={() => navigate('/anomalies')} className="btn-control btn-warning flex items-center gap-1.5">
          <AlertTriangle size={14} />
          异常处理
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-metro-danger text-white rounded text-xs font-bold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="px-3 py-2 bg-metro-bg border border-metro-border rounded-lg">
          <div className="data-label">总记录</div>
          <div className="data-value text-lg font-semibold">{records.length}</div>
        </div>
        <div className="px-3 py-2 bg-metro-bg border border-metro-border rounded-lg">
          <div className="data-label">异常总数</div>
          <div className="data-value text-lg font-semibold text-metro-anomaly">{anomalies.length}</div>
        </div>
        <div className="px-3 py-2 bg-metro-bg border border-metro-border rounded-lg">
          <div className="data-label">待复核</div>
          <div className="data-value text-lg font-semibold text-metro-warning">{pendingCount}</div>
        </div>
        <div className="px-3 py-2 bg-metro-bg border border-metro-border rounded-lg">
          <div className="data-label">已确认</div>
          <div className="data-value text-lg font-semibold text-metro-danger">{confirmedCount}</div>
        </div>
        <div className="px-3 py-2 bg-metro-bg border border-metro-border rounded-lg">
          <div className="data-label">得分</div>
          <div className="data-value text-lg font-semibold text-metro-success">{session?.score ?? 0}</div>
        </div>
      </div>

      {session?.collisionEvents && session.collisionEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-metro-border">
          <div className="data-label mb-2">碰撞检测记录（与剖面图共用处理记录）</div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {session.collisionEvents.slice(-5).map((ev) => (
              <div key={ev.recordId + ev.timestamp} className="flex items-center gap-2 text-xs font-mono">
                <span className="status-dot bg-metro-primary" />
                <span className="text-metro-muted">
                  [{new Date(ev.timestamp).toLocaleTimeString('zh-CN')}]
                </span>
                <span className="text-metro-text">{ev.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
