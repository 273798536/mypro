import { useState } from 'react';
import { Volume2, Users, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

type TabType = 'sources' | 'mood' | 'governance';

export function RecordsPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('sources');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { records } = useGameStore();

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'sources', label: '声源卡记录', icon: <Volume2 size={16} />, count: records.soundSources.length },
    { id: 'mood', label: '居民情绪', icon: <Users size={16} />, count: records.residentMood.length },
    { id: 'governance', label: '治理报告', icon: <FileText size={16} />, count: records.governance.length },
  ];

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'place':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">放置</span>;
      case 'remove':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">移除</span>;
      default:
        return null;
    }
  };

  const getMoodChangeColor = (before: number, after: number) => {
    if (after > before) return 'text-green-600';
    if (after < before) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'sources' && (
          <div className="space-y-2">
            {records.soundSources.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">暂无声源操作记录</p>
            ) : (
              records.soundSources.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-2">
                      {getActionBadge(record.action)}
                      <span className="text-sm font-medium text-gray-800">{record.detail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">第{record.turn}回合</span>
                      {expandedItems.has(record.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandedItems.has(record.id) && (
                    <div className="px-3 pb-3 text-xs text-gray-600 border-t bg-gray-50">
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <p><strong>区域：</strong>{record.areaName}</p>
                        <p><strong>声源：</strong>{record.sourceName}</p>
                        <p><strong>分贝：</strong>{record.decibel}dB</p>
                        <p><strong>时段：</strong>{record.period === 'day' ? '☀️ 白天' : '🌙 夜间'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'mood' && (
          <div className="space-y-2">
            {records.residentMood.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">暂无情绪变化记录</p>
            ) : (
              records.residentMood.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getMoodChangeColor(record.beforeMood, record.afterMood)}`}>
                        {record.areaName}: {record.beforeMood}% → {record.afterMood}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">第{record.turn}回合</span>
                      {expandedItems.has(record.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandedItems.has(record.id) && (
                    <div className="px-3 pb-3 text-xs text-gray-600 border-t bg-gray-50">
                      <p className="mt-2"><strong>变化原因：</strong>{record.changeReason}</p>
                      {record.relatedSources.length > 0 && (
                        <p className="mt-1"><strong>相关声源：</strong>{record.relatedSources.join('、')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'governance' && (
          <div className="space-y-2">
            {records.governance.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">暂无治理措施记录</p>
            ) : (
              records.governance.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-eco-100 text-eco-700 text-xs rounded-full">治理</span>
                      <span className="text-sm font-medium text-gray-800">{record.measure}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">第{record.turn}回合</span>
                      {expandedItems.has(record.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandedItems.has(record.id) && (
                    <div className="px-3 pb-3 text-xs text-gray-600 border-t bg-gray-50">
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <p><strong>效果：</strong>{record.effect}</p>
                        <p><strong>成本：</strong>¥{record.cost}</p>
                        {record.targetArea && <p><strong>目标区域：</strong>{record.targetArea}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
