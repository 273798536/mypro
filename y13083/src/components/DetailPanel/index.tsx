import { useState } from 'react';
import { Info, MessageSquare, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import type { DataSource } from '@/types';
import NoteEditor from './NoteEditor';
import SnapshotList from './SnapshotList';

const sourceColorMap: Record<DataSource, string> = {
  normal: '#10b981',
  cad_old: '#64748b',
  verbal: '#fbbf24',
};

const sourceLabelMap: Record<DataSource, string> = {
  normal: '正式数据',
  cad_old: 'CAD旧版',
  verbal: '口头备注',
};

const typeLabelMap: Record<string, string> = {
  tank: '储罐',
  pipe: '管道',
  valve: '阀门',
  storage: '仓储',
};

type TabKey = 'info' | 'note' | 'snapshot';
const tabs: { key: TabKey; label: string; icon: typeof Info }[] = [
  { key: 'info', label: '详情', icon: Info },
  { key: 'note', label: '备注', icon: MessageSquare },
  { key: 'snapshot', label: '快照', icon: Camera },
];

export default function DetailPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const { selectedObjectId, objects } = useAppStore();
  const obj = objects.find((o) => o.id === selectedObjectId);

  return (
    <div
      className="h-full bg-slate-900/90 backdrop-blur border-l border-slate-700 flex flex-col"
      style={{ width: 340 }}
    >
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors',
                active
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && (
          <div className="p-4">
            {!obj ? (
              <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4 py-12">
                点击场景中对象查看详情
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-100 mb-1">
                    {obj.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${sourceColorMap[obj.source]}20`,
                        color: sourceColorMap[obj.source],
                        border: `1px solid ${sourceColorMap[obj.source]}40`,
                      }}
                    >
                      {sourceLabelMap[obj.source]}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600">
                      {typeLabelMap[obj.type] || obj.type}
                    </span>
                    {obj.isAbnormal && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                        异常
                      </span>
                    )}
                    {obj.isOverlapping && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        重叠
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2.5 text-sm">
                  <Row label="位置坐标">
                    <span className="font-mono text-cyan-400">
                      [{obj.position.map((v) => v.toFixed(2)).join(', ')}]
                    </span>
                  </Row>
                  <Row label="尺寸">
                    <span className="font-mono text-slate-400">
                      [{obj.size.map((v) => v.toFixed(2)).join(', ')}]
                    </span>
                  </Row>
                  <Row label="描述">
                    <span className="text-slate-300 leading-relaxed flex-1">
                      {obj.description}
                    </span>
                  </Row>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'note' && (
          <div className="p-4">
            {selectedObjectId ? (
              <NoteEditor objectId={selectedObjectId} sourceColor={obj ? sourceColorMap[obj.source] : '#10b981'} />
            ) : (
              <div className="flex items-center justify-center text-slate-500 text-sm text-center px-4 py-12">
                点击场景中对象查看备注
              </div>
            )}
          </div>
        )}

        {activeTab === 'snapshot' && <SnapshotList />}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-500 shrink-0 w-16">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
