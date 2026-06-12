import { X, Fish, MapPin, Droplets, Waves, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import {
  fishingSpots,
  fishingRecords,
  waterQualityList,
  tideDataList,
  riskNotices,
  buoys,
  buoyStatusRecords,
  waterQualityLevelMap,
  riskLevelMap,
} from '@/data/mockData';
import { cn } from '@/lib/utils';
import { TideChart } from './TideChart';

export function DetailPanel() {
  const {
    selection,
    showDetailPanel,
    selectedDetailTab,
    setShowDetailPanel,
    setSelectedDetailTab,
    updateReviewItem,
    reviewItems,
  } = useAppStore();

  const { selectedSpotId, selectedRecordId, selectedBuoyId } = selection;

  const selectedSpot = fishingSpots.find((s) => s.id === selectedSpotId);
  const selectedRecord = fishingRecords.find((r) => r.id === selectedRecordId);
  const selectedBuoy = buoys.find((b) => b.id === selectedBuoyId);

  const relatedRecords = selectedSpot
    ? fishingRecords.filter((r) => r.spotId === selectedSpot.id)
    : [];

  const relatedWaterQuality = selectedSpot
    ? waterQualityList.filter((wq) => wq.spotId === selectedSpot.id)
    : [];

  const relatedTideData = selectedSpot
    ? tideDataList.filter((td) => td.spotId === selectedSpot.id)
    : [];

  const relatedRiskNotices = selectedSpot
    ? riskNotices.filter((rn) => rn.spotId === selectedSpot.id)
    : [];

  const relatedBuoyStatus = selectedBuoy
    ? buoyStatusRecords.filter((bsr) => bsr.buoyId === selectedBuoy.id)
    : [];

  const currentReviewItem = selectedRecord
    ? reviewItems.find((ri) => ri.recordId === selectedRecord.id)
    : null;

  if (!showDetailPanel || (!selectedSpot && !selectedRecord && !selectedBuoy)) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'water', label: '水质' },
    { id: 'tide', label: '潮汐' },
    { id: 'risk', label: '风险' },
  ];

  if (selectedBuoy) {
    tabs.splice(1, 0, { id: 'buoy', label: '浮标状态' });
  }

  const getTitle = () => {
    if (selectedRecord) return selectedRecord.fishSpecies;
    if (selectedBuoy) return selectedBuoy.name;
    if (selectedSpot) return selectedSpot.name;
    return '';
  };

  const getSubtitle = () => {
    if (selectedRecord) {
      const spot = fishingSpots.find((s) => s.id === selectedRecord.spotId);
      return `${spot?.name || '未知渔点'} · ${selectedRecord.angler}`;
    }
    if (selectedBuoy) {
      const spot = fishingSpots.find((s) => s.id === selectedBuoy.spotId);
      return `关联渔点: ${spot?.name || '未知'}`;
    }
    if (selectedSpot) {
      return `${selectedSpot.area} · 水深 ${selectedSpot.depth}m`;
    }
    return '';
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 z-10 flex flex-col">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{getTitle()}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{getSubtitle()}</p>
          </div>
          <button
            onClick={() => setShowDetailPanel(false)}
            className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-slate-700/50 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDetailTab(tab.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors relative',
                selectedDetailTab === tab.id
                  ? 'text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {tab.label}
              {selectedDetailTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedDetailTab === 'overview' && (
            <div className="space-y-4">
              {selectedRecord && (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">重量</span>
                      <span className="text-white font-medium">{selectedRecord.weight} kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">钓获时间</span>
                      <span className="text-white text-sm">{selectedRecord.catchTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">钓手</span>
                      <span className="text-white text-sm">{selectedRecord.angler}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">状态</span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          selectedRecord.status === 'normal' && 'bg-emerald-500/20 text-emerald-400',
                          selectedRecord.status === 'warning' && 'bg-orange-500/20 text-orange-400',
                          selectedRecord.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                          selectedRecord.status === 'invalid' && 'bg-red-500/20 text-red-400'
                        )}
                      >
                        {selectedRecord.status === 'normal' && '正常'}
                        {selectedRecord.status === 'warning' && '预警'}
                        {selectedRecord.status === 'pending' && '待复核'}
                        {selectedRecord.status === 'invalid' && '无效'}
                      </span>
                    </div>
                  </div>

                  {selectedRecord.isBadData && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <AlertTriangle size={14} />
                        <span className="text-sm font-medium">数据异常</span>
                      </div>
                      <p className="text-xs text-red-300/80">{selectedRecord.reviewNote}</p>
                    </div>
                  )}

                  {currentReviewItem && (
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-200 mb-2">复核状态</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateReviewItem(selectedRecord.id, 'confirmed')}
                          className={cn(
                            'flex-1 px-2 py-1.5 text-xs rounded-md flex items-center justify-center gap-1 transition-colors',
                            currentReviewItem.status === 'confirmed'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          )}
                        >
                          <CheckCircle size={12} />
                          通过
                        </button>
                        <button
                          onClick={() => updateReviewItem(selectedRecord.id, 'rejected')}
                          className={cn(
                            'flex-1 px-2 py-1.5 text-xs rounded-md flex items-center justify-center gap-1 transition-colors',
                            currentReviewItem.status === 'rejected'
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          )}
                        >
                          <XCircle size={12} />
                          驳回
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedSpot && (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-slate-200 mb-2">
                      <MapPin size={14} className="text-cyan-400" />
                      <span className="text-sm font-medium">渔点信息</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">所属区域</span>
                      <span className="text-white text-sm">{selectedSpot.area}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">水深</span>
                      <span className="text-white text-sm">{selectedSpot.depth} 米</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">纬度</span>
                      <span className="text-white text-sm font-mono">{selectedSpot.lat.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">经度</span>
                      <span className="text-white text-sm font-mono">{selectedSpot.lng.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-slate-200 mb-2">
                      <Fish size={14} className="text-emerald-400" />
                      <span className="text-sm font-medium">渔获记录 ({relatedRecords.length})</span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {relatedRecords.map((record) => (
                        <div
                          key={record.id}
                          className={cn(
                            'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                            selectedRecordId === record.id
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'hover:bg-slate-700/50 text-slate-300'
                          )}
                          onClick={() =>
                            useAppStore.getState().selectRecord(
                              selectedRecordId === record.id ? null : record.id
                            )
                          }
                        >
                          <span className="text-sm">{record.fishSpecies}</span>
                          <span className="text-xs">{record.weight}kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedBuoy && (
                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">设备状态</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        selectedBuoy.status === 'online' && 'bg-emerald-500/20 text-emerald-400',
                        selectedBuoy.status === 'offline' && 'bg-red-500/20 text-red-400',
                        selectedBuoy.status === 'maintenance' && 'bg-yellow-500/20 text-yellow-400'
                      )}
                    >
                      {selectedBuoy.status === 'online' && '在线'}
                      {selectedBuoy.status === 'offline' && '离线'}
                      {selectedBuoy.status === 'maintenance' && '维护中'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">纬度</span>
                    <span className="text-white text-sm font-mono">{selectedBuoy.lat.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">经度</span>
                    <span className="text-white text-sm font-mono">{selectedBuoy.lng.toFixed(4)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedDetailTab === 'water' && (
            <div className="space-y-3">
              {relatedWaterQuality.length > 0 ? (
                relatedWaterQuality.map((wq) => {
                  const levelInfo = waterQualityLevelMap[wq.level];
                  return (
                    <div
                      key={wq.id}
                      className={cn(
                        'bg-slate-800/50 rounded-lg p-3 border-l-2',
                        wq.isWarning ? 'border-red-500' : 'border-cyan-500/50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{wq.measureTime}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${levelInfo.color}20`, color: levelInfo.color }}
                        >
                          {levelInfo.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-lg font-semibold text-white">{wq.ph}</div>
                          <div className="text-xs text-slate-400">pH</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-white">{wq.dissolvedOxygen}</div>
                          <div className="text-xs text-slate-400">溶解氧</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-white">{wq.turbidity}</div>
                          <div className="text-xs text-slate-400">浊度</div>
                        </div>
                      </div>
                      {wq.isWarning && (
                        <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
                          <AlertTriangle size={12} />
                          水质异常预警
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无水质数据
                </div>
              )}
            </div>
          )}

          {selectedDetailTab === 'tide' && (
            <div className="space-y-3">
              {relatedTideData.length > 0 ? (
                <>
                  <TideChart tideData={relatedTideData} />
                  {relatedTideData.map((td) => (
                    <div key={td.id} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-200 mb-2">{td.date}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-700/30 rounded-md p-2">
                          <div className="text-xs text-slate-400">高潮位</div>
                          <div className="text-lg font-semibold text-cyan-400">{td.highTideHeight}m</div>
                          <div className="text-xs text-slate-400">{td.highTideTime}</div>
                        </div>
                        <div className="bg-slate-700/30 rounded-md p-2">
                          <div className="text-xs text-slate-400">低潮位</div>
                          <div className="text-lg font-semibold text-orange-400">{td.lowTideHeight}m</div>
                          <div className="text-xs text-slate-400">{td.lowTideTime}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无潮汐数据
                </div>
              )}
            </div>
          )}

          {selectedDetailTab === 'risk' && (
            <div className="space-y-3">
              {relatedRiskNotices.length > 0 ? (
                relatedRiskNotices.map((rn) => {
                  const levelInfo = riskLevelMap[rn.level];
                  if (rn.isMissing) {
                    return (
                      <div
                        key={rn.id}
                        className="bg-red-500/10 border border-dashed border-red-500/40 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 text-red-400 mb-1">
                          <AlertTriangle size={14} />
                          <span className="text-sm font-medium">风险通报缺失</span>
                        </div>
                        <p className="text-xs text-red-300/70">
                          {rn.publishTime} 该渔点风险通报材料缺失
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={rn.id}
                      className="bg-slate-800/50 rounded-lg p-3 border-l-2"
                      style={{ borderColor: levelInfo.color }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-200">{rn.title}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${levelInfo.color}20`, color: levelInfo.color }}
                        >
                          {levelInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{rn.content}</p>
                      <div className="text-xs text-slate-500">{rn.publishTime}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无风险通报
                </div>
              )}
            </div>
          )}

          {selectedDetailTab === 'buoy' && selectedBuoy && (
            <div className="space-y-3">
              {relatedBuoyStatus.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-200">状态记录</div>
                  {relatedBuoyStatus.map((bsr, index) => (
                    <div
                      key={bsr.id}
                      className="bg-slate-800/50 rounded-lg p-3 relative"
                    >
                      {index < relatedBuoyStatus.length - 1 && (
                        <div className="absolute left-4 top-full w-px h-2 bg-slate-600" />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            bsr.isOnline ? 'bg-emerald-400' : 'bg-red-400'
                          )}
                        />
                        <span className="text-sm text-slate-200">
                          {bsr.isOnline ? '在线' : '离线'}
                        </span>
                        <span className="text-xs text-slate-500 ml-auto">{bsr.timestamp}</span>
                      </div>
                      {bsr.offlineReason && (
                        <p className="text-xs text-slate-400 ml-4">
                          原因: {bsr.offlineReason}
                        </p>
                      )}
                      {bsr.materialSource && (
                        <p className="text-xs text-slate-500 ml-4 mt-1">
                          材料来源: {bsr.materialSource}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无状态记录
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
