import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Skull,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Hand,
  ChevronRight,
  BarChart3,
  MapPin,
  FlaskConical,
  Calendar,
} from 'lucide-react';
import { useSampleStore } from '../store/useSampleStore';
import { StatusBadge } from '../components/StatusBadge';
import { ReviewModal } from '../components/ReviewModal';
import { SupplementModal } from '../components/SupplementModal';
import { ManualConfirmModal } from '../components/ManualConfirmModal';
import { formatDate, getExpiryStatus, getDaysUntilExpiry } from '../utils/dateUtils';
import { Sample, SampleStatus, SAMPLING_LOCATIONS, STRAIN_TYPES, STATUS_LABELS } from '../../shared/types';

export const SampleListPage: React.FC = () => {
  const {
    samples,
    statSnapshots,
    rerunBatch,
    currentBatchNumber,
  } = useSampleStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [showManualConfirmModal, setShowManualConfirmModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  const latestStats = statSnapshots[0]?.statsData;

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let expiringToday = 0;
    let expiringSoon = 0;
    let expired = 0;

    samples.forEach((s) => {
      const days = getDaysUntilExpiry(s.expiryDate);
      if (days < 0) expired++;
      else if (days === 0) expiringToday++;
      else if (days <= 7) expiringSoon++;
    });

    return {
      expiringToday,
      expiringSoon,
      expired,
      total: samples.length,
    };
  }, [samples]);

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchesSearch =
        sample.strainCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.strainName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
      const matchesLocation = locationFilter === 'all' || sample.samplingLocation === locationFilter;
      const matchesType = typeFilter === 'all' || sample.strainType === typeFilter;
      return matchesSearch && matchesStatus && matchesLocation && matchesType;
    });
  }, [samples, searchTerm, statusFilter, locationFilter, typeFilter]);

  const handleReview = (sample: Sample) => {
    setSelectedSample(sample);
    setShowReviewModal(true);
  };

  const handleManualConfirm = (sample: Sample) => {
    setSelectedSample(sample);
    setShowManualConfirmModal(true);
  };

  const handleRerun = () => {
    if (confirm('确定要重复运行提醒批次吗？这将更新所有样本的批次号并生成新的统计快照。')) {
      rerunBatch();
    }
  };

  const getStatusIcon = (status: SampleStatus) => {
    switch (status) {
      case 'normal':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'borderline':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'contaminated':
        return <Skull className="w-5 h-5 text-rose-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">今日到期</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{stats.expiringToday}</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">7天内到期</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.expiringSoon}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">已过期</p>
              <p className="text-2xl font-bold text-slate-600 mt-1">{stats.expired}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">样本总数</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {latestStats && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            分组统计
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                按采样地点
              </h4>
              <div className="space-y-2">
                {Object.entries(latestStats.byLocation).map(([location, statusCounts]) => (
                  <div key={location} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-24 truncate">{location}</span>
                    <div className="flex-1 flex gap-1">
                      {(['normal', 'borderline', 'contaminated', 'pending'] as SampleStatus[]).map((status) => (
                        <div
                          key={status}
                          className={`h-6 rounded flex items-center justify-center text-xs font-medium text-white ${
                            status === 'normal'
                              ? 'bg-emerald-500'
                              : status === 'borderline'
                              ? 'bg-amber-500'
                              : status === 'contaminated'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.max(statusCounts[status] * 8, 20)}px` }}
                          title={`${STATUS_LABELS[status]}: ${statusCounts[status]}`}
                        >
                          {statusCounts[status] > 0 && statusCounts[status]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                按菌株类型
              </h4>
              <div className="space-y-2">
                {Object.entries(latestStats.byStrainType).map(([type, statusCounts]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-24 truncate">{type}</span>
                    <div className="flex-1 flex gap-1">
                      {(['normal', 'borderline', 'contaminated', 'pending'] as SampleStatus[]).map((status) => (
                        <div
                          key={status}
                          className={`h-6 rounded flex items-center justify-center text-xs font-medium text-white ${
                            status === 'normal'
                              ? 'bg-emerald-500'
                              : status === 'borderline'
                              ? 'bg-amber-500'
                              : status === 'contaminated'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.max(statusCounts[status] * 8, 20)}px` }}
                          title={`${STATUS_LABELS[status]}: ${statusCounts[status]}`}
                        >
                          {statusCounts[status] > 0 && statusCounts[status]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索菌株编号或名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SampleStatus | 'all')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="pending">待复核</option>
                <option value="normal">正常样本</option>
                <option value="borderline">边界样本</option>
                <option value="contaminated">污染样本</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部地点</option>
                {SAMPLING_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部类型</option>
                {STRAIN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRerun}
              className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              重复运行
            </button>
            <button
              onClick={() => setShowSupplementModal(true)}
              className="px-3 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              补录样本
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  菌株信息
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  采样地点
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  保藏日期
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  到期日期
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSamples.map((sample) => {
                const expiryStatus = getExpiryStatus(sample.expiryDate);
                return (
                  <tr
                    key={sample.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      sample.status === 'contaminated' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(sample.status)}
                        <div>
                          <p className="font-medium text-slate-900">{sample.strainCode}</p>
                          <p className="text-sm text-slate-500">{sample.strainName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {sample.samplingLocation}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {sample.strainType}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(sample.preservationDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-600">{formatDate(sample.expiryDate)}</p>
                        <p className={`text-xs ${expiryStatus.className}`}>
                          {expiryStatus.label}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sample.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleReview(sample)}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          复核
                        </button>
                        <button
                          onClick={() => handleManualConfirm(sample)}
                          className="px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Hand className="w-3 h-3" />
                          人工确认
                        </button>
                        <Link
                          to={`/sample/${sample.id}`}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
                        >
                          详情
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSamples.length === 0 && (
          <div className="p-12 text-center">
            <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">没有找到匹配的样本</p>
          </div>
        )}
      </div>

      {selectedSample && (
        <>
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setSelectedSample(null);
            }}
            sampleId={selectedSample.id}
            sampleCode={selectedSample.strainCode}
            sampleName={selectedSample.strainName}
            currentStatus={selectedSample.status}
            isContaminated={selectedSample.autoJudge === 'contaminated'}
          />
          <ManualConfirmModal
            isOpen={showManualConfirmModal}
            onClose={() => {
              setShowManualConfirmModal(false);
              setSelectedSample(null);
            }}
            sampleId={selectedSample.id}
            sampleCode={selectedSample.strainCode}
            sampleName={selectedSample.strainName}
            currentStatus={selectedSample.status}
            autoJudge={selectedSample.autoJudge}
          />
        </>
      )}

      <SupplementModal
        isOpen={showSupplementModal}
        onClose={() => setShowSupplementModal(false)}
      />
    </div>
  );
};
