import { useState } from 'react';
import { PointStatus } from '../types';
import { usePointStore } from '../store';
import { PointCard } from '../components/PointCard';
import { EmptyState } from '../components/EmptyState';
import { STATUS_LABELS } from '../types';

const TABS: PointStatus[] = ['pending', 'confirmed', 'onsite', 'conflict'];

export function Home() {
  const [activeTab, setActiveTab] = useState<PointStatus>('pending');
  const { mergedPoints, confirmPoint, markOnsite, markConflict, withdrawStatus } = usePointStore();

  const filteredPoints = mergedPoints.filter(p => p.status === activeTab);
  const hasData = mergedPoints.length > 0;

  const handleBatchConfirm = () => {
    filteredPoints.forEach(p => confirmPoint(p.id));
  };

  const handleBatchOnsite = () => {
    filteredPoints.forEach(p => markOnsite(p.id));
  };

  const handleBatchWithdraw = () => {
    filteredPoints.forEach(p => withdrawStatus(p.id));
  };

  if (!hasData) {
    return <EmptyState />;
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-2xl font-serif-cn font-bold text-gray-800 mb-2">
          点位列表
        </h2>
        <p className="text-gray-500 text-sm">
          按状态分类管理公交港湾点位，支持批量操作和快速筛选
        </p>
      </div>

      <div className="bg-white rounded-t-lg border border-b-0 border-gray-200">
        <div className="flex items-center justify-between px-4">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-btn ${
                  activeTab === tab ? 'tab-btn-active' : 'tab-btn-inactive'
                }`}
              >
                {STATUS_LABELS[tab]}
                <span className="ml-1.5 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {mergedPoints.filter(p => p.status === tab).length}
                </span>
              </button>
            ))}
          </div>

          {filteredPoints.length > 0 && (
            <div className="flex items-center gap-2">
              {activeTab === 'pending' && (
                <>
                  <button onClick={handleBatchConfirm} className="text-xs btn-primary py-1.5 px-3">
                    全部确认
                  </button>
                  <button onClick={handleBatchOnsite} className="text-xs btn-secondary py-1.5 px-3">
                    全部标记待现场
                  </button>
                </>
              )}
              {activeTab !== 'pending' && (
                <button onClick={handleBatchWithdraw} className="text-xs btn-danger py-1.5 px-3">
                  全部撤回
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {filteredPoints.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPoints.map((point, index) => (
            <PointCard key={point.id} point={point} index={index} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-b-lg border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-sm">
            暂无{STATUS_LABELS[activeTab]}的点位
          </div>
        </div>
      )}
    </div>
  );
}
