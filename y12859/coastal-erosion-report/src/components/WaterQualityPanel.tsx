import { useState } from 'react';
import { Droplets, AlertTriangle, CheckCircle, Clock, FileWarning, RefreshCw, Edit3 } from 'lucide-react';
import type { WaterQualityRecord } from '../types';
import { getWaterQualityLevelInfo, getReviewStatusInfo, updateReviewRecord } from '../utils/waterQuality';
import { mockWaterQualityRecords } from '../data/mockData';

export default function WaterQualityPanel() {
  const [records, setRecords] = useState<WaterQualityRecord[]>(mockWaterQualityRecords);
  const [selectedRecord, setSelectedRecord] = useState<WaterQualityRecord | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewer, setReviewer] = useState('李海洋');
  const [filterLevel, setFilterLevel] = useState<'all' | 'normal' | 'attention' | 'warning' | 'danger'>('all');
  const [showSupplementOnly, setShowSupplementOnly] = useState(false);

  const filteredRecords = records.filter(r => {
    if (filterLevel !== 'all' && r.warningLevel !== filterLevel) return false;
    if (showSupplementOnly && !r.isSupplement) return false;
    return true;
  });

  const pendingCount = records.filter(r => r.reviewStatus === 'pending').length;
  const supplementCount = records.filter(r => r.isSupplement).length;
  const dangerCount = records.filter(r => r.warningLevel === 'danger').length;

  const handleReview = (status: 'reviewed' | 'rejected') => {
    if (!selectedRecord || !reviewRemark.trim()) return;
    
    const updated = updateReviewRecord(selectedRecord, status, reviewRemark, reviewer);
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedRecord(updated);
    setReviewRemark('');
  };

  const levelInfo = (level: string) => getWaterQualityLevelInfo(level as any);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Droplets className="w-7 h-7 text-ocean-600" />
            水质监测预警
          </h2>
          <p className="text-slate-500 mt-1">非一次性判断，补录后复核备注同步更新</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">监测记录</span>
            <Droplets className="w-5 h-5 text-ocean-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{records.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">待复核</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">补录记录</span>
            <RefreshCw className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{supplementCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">预警级</span>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-2">
            {records.filter(r => r.warningLevel === 'warning').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 bg-red-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-600">危险级</span>
            <FileWarning className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">{dangerCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {(['all', 'normal', 'attention', 'warning', 'danger'] as const).map((level) => {
            const info = level === 'all' ? null : levelInfo(level);
            const isActive = filterLevel === level;
            return (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-ocean-600 text-white' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {level === 'all' ? '全部' : info?.label}
              </button>
            );
          })}
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showSupplementOnly}
            onChange={(e) => setShowSupplementOnly(e.target.checked)}
            className="w-4 h-4 text-ocean-600 rounded"
          />
          <span className="text-sm text-slate-600">只看补录记录</span>
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-600">监测站</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">时间</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">pH</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">溶解氧</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">浊度</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">氨氮</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">预警等级</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">补录</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">复核状态</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const wqInfo = levelInfo(record.warningLevel);
              const rsInfo = getReviewStatusInfo(record.reviewStatus);
              
              return (
                <tr 
                  key={record.id}
                  className="border-t border-slate-100 table-row-hover cursor-pointer"
                  onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{record.stationName}</div>
                    <div className="text-xs text-slate-400">{record.stationId}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div>{record.timestamp}</div>
                    {record.isSupplement && record.supplementTime && (
                      <div className="text-xs text-blue-500">补录于 {record.supplementTime}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700">{record.ph}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{record.dissolvedOxygen} mg/L</td>
                  <td className="py-3 px-4 text-center text-slate-700">{record.turbidity} NTU</td>
                  <td className="py-3 px-4 text-center text-slate-700">{record.ammoniaNitrogen} mg/L</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${wqInfo.bg} ${wqInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wqInfo.dot}`}></span>
                      {wqInfo.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {record.isSupplement ? (
                      <span className="text-blue-600 text-xs font-medium">补录</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${rsInfo.bg} ${rsInfo.color} border ${rsInfo.border}`}>
                      {rsInfo.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRecord && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-ocean-500" />
              {selectedRecord.stationName} 详细数据
            </h3>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'pH值', value: selectedRecord.ph, unit: '' },
                { label: '溶解氧', value: selectedRecord.dissolvedOxygen, unit: 'mg/L' },
                { label: '浊度', value: selectedRecord.turbidity, unit: 'NTU' },
                { label: '氨氮', value: selectedRecord.ammoniaNitrogen, unit: 'mg/L' },
                { label: '总磷', value: selectedRecord.totalPhosphorus, unit: 'mg/L' },
                { label: '化学需氧量', value: selectedRecord.cod, unit: 'mg/L' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">{item.label}</div>
                  <div className="text-lg font-bold text-slate-800">
                    {item.value} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedRecord.isSupplement && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800 text-sm">补录记录</div>
                    <div className="text-xs text-blue-600 mt-0.5">
                      原始时间：{selectedRecord.timestamp}，补录时间：{selectedRecord.supplementTime}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedRecord.reviewRemark && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">
                  复核备注 {selectedRecord.reviewer && `— ${selectedRecord.reviewer}`}
                  {selectedRecord.reviewTime && ` · ${selectedRecord.reviewTime}`}
                </div>
                <div className="text-sm text-slate-700">{selectedRecord.reviewRemark}</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-slate-500" />
              复核操作
            </h3>

            {selectedRecord.reviewStatus === 'pending' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    复核人
                  </label>
                  <input
                    type="text"
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    复核备注
                  </label>
                  <textarea
                    value={reviewRemark}
                    onChange={(e) => setReviewRemark(e.target.value)}
                    rows={4}
                    placeholder="请输入复核意见..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview('reviewed')}
                    disabled={!reviewRemark.trim()}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    通过复核
                  </button>
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={!reviewRemark.trim()}
                    className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    驳回
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {selectedRecord.reviewStatus === 'reviewed' ? (
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                ) : (
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                )}
                <div className="text-sm text-slate-600">
                  该记录已{getReviewStatusInfo(selectedRecord.reviewStatus).label}
                </div>
                <button
                  onClick={() => {
                    const reset: WaterQualityRecord = {
                      ...selectedRecord,
                      reviewStatus: 'pending',
                      reviewRemark: undefined,
                      reviewer: undefined,
                      reviewTime: undefined,
                    };
                    setRecords(prev => prev.map(r => r.id === reset.id ? reset : r));
                    setSelectedRecord(reset);
                  }}
                  className="mt-4 text-sm text-ocean-600 hover:text-ocean-700"
                >
                  重新复核
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 mb-2">预警等级判定</div>
              <div className="space-y-2">
                {(['normal', 'attention', 'warning', 'danger'] as const).map((level) => {
                  const info = levelInfo(level);
                  const isCurrent = selectedRecord.warningLevel === level;
                  return (
                    <div key={level} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isCurrent ? info.bg : ''}`}>
                      <span className={`w-2 h-2 rounded-full ${info.dot}`}></span>
                      <span className={info.color}>{info.label}</span>
                      {isCurrent && <span className="ml-auto text-xs text-slate-500">当前</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
