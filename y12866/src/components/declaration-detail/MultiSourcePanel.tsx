import { useState } from 'react';
import { FileWarning, Waves, Navigation } from 'lucide-react';
import type { Declaration } from '@/types';
import TideChart from '@/components/common/TideChart';
import ShipTrackMap from '@/components/common/ShipTrackMap';

interface Props {
  declaration: Declaration;
}

type TabKey = 'risk-notice' | 'tide' | 'track';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'risk-notice', label: '风险通报', icon: <FileWarning className="w-4 h-4" /> },
  { key: 'tide', label: '潮汐曲线', icon: <Waves className="w-4 h-4" /> },
  { key: 'track', label: '船舶轨迹', icon: <Navigation className="w-4 h-4" /> },
];

export default function MultiSourcePanel({ declaration }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('risk-notice');

  return (
    <div className="card-ocean overflow-hidden">
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors ${
              activeTab === tab.key ? 'tab-active' : 'text-slate-500 hover:text-slate-700 border-b-[3px] border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'risk-notice' && declaration.riskNotices.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full font-mono">
                {declaration.riskNotices.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'risk-notice' && (
          <div className="space-y-3">
            {declaration.riskNotices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">当前无风险通报</p>
            ) : (
              declaration.riskNotices.map((notice) => (
                <div key={notice.id} className={`card-risk ${notice.level === 'high' ? 'card-risk-high' : notice.level === 'medium' ? 'card-risk-medium' : 'card-risk-low'} p-3`}>
                  <div className="flex items-start justify-between pl-3">
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">{notice.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{notice.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                        <span>来源：{notice.source}</span>
                        <span>{notice.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="text-[10px] text-slate-400 pt-2 border-t border-gray-50">
              📁 数据来源：共享盘 {declaration.sources.find(s => s.id === 'risk-notice')?.sourcePath}
            </div>
          </div>
        )}

        {activeTab === 'tide' && (
          <div>
            <TideChart
              records={declaration.tideRecords}
              highlightTime={declaration.arrivalTime}
            />
            <div className="text-[10px] text-slate-400 pt-2 border-t border-gray-50 mt-2">
              📁 数据来源：旧表 {declaration.sources.find(s => s.id === 'tide-table')?.sourcePath}
            </div>
          </div>
        )}

        {activeTab === 'track' && (
          <div>
            <ShipTrackMap points={declaration.shipTrack} />
            <div className="text-[10px] text-slate-400 pt-2 border-t border-gray-50 mt-2">
              📁 数据来源：AIS系统 + 人工备注夹 {declaration.sources.find(s => s.id === 'ship-track')?.sourcePath}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
