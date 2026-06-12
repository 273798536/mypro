import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Fish,
  MapPin,
  Droplets,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import {
  fishingRecords,
  fishingSpots,
  waterQualityList,
  riskNotices,
  fishSpeciesList,
  waterQualityLevelMap,
} from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Review() {
  const { reviewItems, updateReviewItem, getBadRecords } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  const badRecords = getBadRecords();

  const filteredRecords = fishingRecords.filter((record) => {
    const matchSearch =
      record.fishSpecies.includes(searchTerm) ||
      record.angler.includes(searchTerm) ||
      record.id.includes(searchTerm);

    const reviewItem = reviewItems.find((ri) => ri.recordId === record.id);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && reviewItem?.status === 'pending') ||
      (statusFilter === 'confirmed' && reviewItem?.status === 'confirmed') ||
      (statusFilter === 'rejected' && reviewItem?.status === 'rejected') ||
      (statusFilter === 'bad' && record.isBadData);

    return matchSearch && matchStatus;
  });

  const currentRecord = filteredRecords[currentIndex];
  const currentReviewItem = currentRecord
    ? reviewItems.find((ri) => ri.recordId === currentRecord.id)
    : null;

  const spot = currentRecord
    ? fishingSpots.find((s) => s.id === currentRecord.spotId)
    : null;

  const waterQuality = currentRecord
    ? waterQualityList.find((wq) => wq.spotId === currentRecord.spotId)
    : null;

  const riskNotice = currentRecord
    ? riskNotices.find(
        (rn) => rn.spotId === currentRecord.spotId && !rn.isMissing
      )
    : null;

  const hasMissingRisk = currentRecord
    ? riskNotices.some(
        (rn) => rn.spotId === currentRecord.spotId && rn.isMissing
      )
    : false;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredRecords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const pendingCount = reviewItems.filter((i) => i.status === 'pending').length;
  const confirmedCount = reviewItems.filter((i) => i.status === 'confirmed').length;
  const rejectedCount = reviewItems.filter((i) => i.status === 'rejected').length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">复核工作台</h2>
              <p className="text-sm text-slate-400">逐条复核渔获记录，标记通过或驳回</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{confirmedCount}</div>
              <div className="text-xs text-slate-400">已通过</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
              <div className="text-xs text-slate-400">待复核</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{rejectedCount}</div>
              <div className="text-xs text-slate-400">已驳回</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">{fishingRecords.length}</div>
              <div className="text-xs text-slate-400">总计</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索鱼种、钓手、记录编号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            {['all', 'pending', 'confirmed', 'rejected', 'bad'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentIndex(0);
                }}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  statusFilter === status
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                )}
              >
                {status === 'all' && '全部'}
                {status === 'pending' && '待复核'}
                {status === 'confirmed' && '已通过'}
                {status === 'rejected' && '已驳回'}
                {status === 'bad' && '异常数据'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-64 border-r border-slate-800 overflow-y-auto">
          {filteredRecords.map((record, index) => {
            const reviewItem = reviewItems.find((ri) => ri.recordId === record.id);
            return (
              <div
                key={record.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'p-3 border-b border-slate-800/50 cursor-pointer transition-colors',
                  index === currentIndex
                    ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400'
                    : 'hover:bg-slate-800/30'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{record.fishSpecies}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{record.angler}</div>
                  </div>
                  {reviewItem?.status === 'confirmed' && (
                    <CheckCircle size={16} className="text-emerald-400" />
                  )}
                  {reviewItem?.status === 'rejected' && (
                    <XCircle size={16} className="text-red-400" />
                  )}
                  {reviewItem?.status === 'pending' && (
                    <Clock size={16} className="text-yellow-400" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{record.weight}kg</span>
                  {record.isBadData && (
                    <span className="text-xs text-orange-400 flex items-center gap-0.5">
                      <AlertTriangle size={10} />
                      异常
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 p-6">
          {currentRecord ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    currentIndex === 0
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="text-sm text-slate-400">
                  {currentIndex + 1} / {filteredRecords.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === filteredRecords.length - 1}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    currentIndex === filteredRecords.length - 1
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-700/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{currentRecord.fishSpecies}</h3>
                      <p className="text-slate-400 mt-1">记录编号: {currentRecord.id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-cyan-400">
                        {currentRecord.weight} <span className="text-lg">kg</span>
                      </div>
                      <div className="text-sm text-slate-400">渔获重量</div>
                    </div>
                  </div>

                  {currentRecord.isBadData && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle size={18} />
                        <span className="font-medium">数据异常提醒</span>
                      </div>
                      <p className="text-sm text-red-300/80">{currentRecord.reviewNote}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Fish size={18} className="text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">鱼种</div>
                        <div className="text-sm font-medium text-white">{currentRecord.fishSpecies}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <MapPin size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">钓点</div>
                        <div className="text-sm font-medium text-white">{spot?.name || '未知'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Clock size={18} className="text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">钓获时间</div>
                        <div className="text-sm font-medium text-white">{currentRecord.catchTime}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Droplets size={18} className="text-orange-400" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">钓手</div>
                        <div className="text-sm font-medium text-white">{currentRecord.angler}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-700/50 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-200">关联数据核查</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">水质状况</span>
                        {waterQuality && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${waterQualityLevelMap[waterQuality.level].color}20`,
                              color: waterQualityLevelMap[waterQuality.level].color,
                            }}
                          >
                            {waterQualityLevelMap[waterQuality.level].label}
                          </span>
                        )}
                      </div>
                      {waterQuality ? (
                        <div className="text-sm text-white">
                          pH {waterQuality.ph} · 溶解氧 {waterQuality.dissolvedOxygen}mg/L
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">暂无水质数据</div>
                      )}
                      {waterQuality?.isWarning && (
                        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          水质异常，影响渔获有效性判断
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">风险通报</span>
                        {!hasMissingRisk && riskNotice && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={12} />
                            已获取
                          </span>
                        )}
                        {hasMissingRisk && (
                          <span className="text-xs text-orange-400 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            有缺失
                          </span>
                        )}
                      </div>
                      {riskNotice ? (
                        <div className="text-sm text-white truncate">{riskNotice.title}</div>
                      ) : (
                        <div className="text-sm text-slate-500">暂无通报</div>
                      )}
                      {hasMissingRisk && (
                        <div className="mt-2 text-xs text-orange-400">
                          部分日期通报缺失，已先按可用数据计算
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-700/50">
                  <div className="flex gap-4">
                    <button
                      onClick={() => updateReviewItem(currentRecord.id, 'rejected', '数据异常，需核实后重新提交')}
                      className="flex-1 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} />
                      驳回
                    </button>
                    <button
                      onClick={() => updateReviewItem(currentRecord.id, 'confirmed')}
                      className="flex-1 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      通过
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p>没有找到匹配的记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
