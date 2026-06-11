import { useMemo, useState } from 'react';
import { X, Info, Clock, Link2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDataStore } from '@/store/useDataStore';
import PointInfo from './PointInfo';
import RemarkEditor from './RemarkEditor';
import HistoryTimeline from './HistoryTimeline';
import MaterialTrace from './MaterialTrace';

const tabs = [
  { id: 'detail', label: '详情', icon: Info },
  { id: 'history', label: '历史', icon: Clock },
  { id: 'trace', label: '追溯', icon: Link2 },
] as const;

export default function DetailPanel() {
  const { selectedPointId, showDetailPanel, toggleDetailPanel, activeTab, setActiveTab } = useAppStore();
  const { points } = useDataStore();
  const [remarkInput, setRemarkInput] = useState('');

  const selectedPoint = useMemo(() => {
    return points.find(p => p.id === selectedPointId) || null;
  }, [points, selectedPointId]);

  if (!showDetailPanel) {
    return null;
  }

  return (
    <aside className="w-96 glass-card border-l border-border-glow/30 flex flex-col h-full animate-slide-in-right">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-glow/20">
        <div className="flex items-center gap-2">
          {selectedPoint ? (
            <>
              <span className="text-sm font-medium text-text-primary">
                {selectedPoint.boomId}
              </span>
              <span className={`tag ${selectedPoint.isAnomaly ? 'tag-danger' : 'tag-success'}`}>
                {selectedPoint.isAnomaly ? '异常' : '正常'}
              </span>
            </>
          ) : (
            <span className="text-sm text-text-muted">未选中点位</span>
          )}
        </div>
        <button
          onClick={toggleDetailPanel}
          className="p-1 rounded hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {selectedPoint ? (
        <>
          <div className="flex border-b border-border-glow/20">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all duration-200 border-b-2 ${
                    isActive
                      ? 'text-tech-blue border-tech-blue'
                      : 'text-text-muted border-transparent hover:text-text-secondary hover:border-border-glow/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {activeTab === 'detail' && (
              <div className="p-4 space-y-4">
                <PointInfo point={selectedPoint} />
                <RemarkEditor
                  point={selectedPoint}
                  remarkInput={remarkInput}
                  setRemarkInput={setRemarkInput}
                />
              </div>
            )}
            {activeTab === 'history' && (
              <div className="p-4">
                <HistoryTimeline pointId={selectedPoint.id} />
              </div>
            )}
            {activeTab === 'trace' && (
              <div className="p-4">
                <MaterialTrace pointId={selectedPoint.id} />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          <div className="text-center">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>点击图表上的点位查看详情</p>
          </div>
        </div>
      )}
    </aside>
  );
}
