import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  MapPin,
  Calendar,
  FlaskConical,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Versus,
  User,
  FileText,
  Save,
} from 'lucide-react';
import { useSampleStore } from '../store/useSampleStore';
import { StatusBadge } from '../components/StatusBadge';
import { ReviewModal } from '../components/ReviewModal';
import { formatDate, formatDateTime, getExpiryStatus } from '../utils/dateUtils';
import { SampleStatus, SAMPLING_LOCATIONS, STATUS_LABELS } from '../../shared/types';

export const SampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getSampleById,
    getReviewHistoriesBySampleId,
    getLocationChangesBySampleId,
    updateSamplingLocation,
  } = useSampleStore();

  const sample = getSampleById(id || '');
  const reviewHistories = getReviewHistoriesBySampleId(id || '');
  const locationChanges = getLocationChangesBySampleId(id || '');

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [locationChangeReason, setLocationChangeReason] = useState('');

  if (!sample) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">样本不存在</p>
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          返回列表
        </Link>
      </div>
    );
  }

  const expiryStatus = getExpiryStatus(sample.expiryDate);

  const handleLocationChange = () => {
    if (!newLocation || newLocation === sample.samplingLocation) return;
    if (!locationChangeReason.trim()) {
      alert('请填写修改原因');
      return;
    }
    updateSamplingLocation(sample.id, newLocation, locationChangeReason);
    setIsEditingLocation(false);
    setNewLocation('');
    setLocationChangeReason('');
  };

  const getStatusColor = (status: SampleStatus) => {
    switch (status) {
      case 'normal':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'borderline':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'contaminated':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 hover:bg-white rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {sample.strainCode} - {sample.strainName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            批次：{sample.batchNumber}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={sample.status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              基本信息
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">
                  菌株编号
                </label>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {sample.strainCode}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">
                  菌株名称
                </label>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {sample.strainName}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">
                  菌株类型
                </label>
                <p className="text-sm text-slate-600 mt-1">{sample.strainType}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">
                  采样地点
                </label>
                {!isEditingLocation ? (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-600">{sample.samplingLocation}</p>
                    <button
                      onClick={() => {
                        setIsEditingLocation(true);
                        setNewLocation(sample.samplingLocation);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <select
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {SAMPLING_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={locationChangeReason}
                      onChange={(e) => setLocationChangeReason(e.target.value)}
                      placeholder="请填写修改原因..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleLocationChange}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingLocation(false);
                          setNewLocation('');
                          setLocationChangeReason('');
                        }}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">
                  保藏日期
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    {formatDate(sample.preservationDate)}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">
                  到期日期
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    {formatDate(sample.expiryDate)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${expiryStatus.className} bg-opacity-10`}>
                    {expiryStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {sample.contaminationMarks && sample.contaminationMarks.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-rose-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                污染标记
              </h2>
              <ul className="space-y-2">
                {sample.contaminationMarks.map((mark, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-rose-700">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {mark}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              备注信息
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">{sample.notes}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              复核历史
            </h2>
            {reviewHistories.length > 0 ? (
              <div className="space-y-4">
                {reviewHistories.map((history) => (
                  <div
                    key={history.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">
                          {history.reviewer}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(history.reviewDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                            history.oldStatus
                          )}`}
                        >
                          {STATUS_LABELS[history.oldStatus]}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(
                            history.newStatus
                          )}`}
                        >
                          {STATUS_LABELS[history.newStatus]}
                        </span>
                      </div>
                    </div>
                    {history.opinion && (
                      <p className="text-sm text-slate-600 mb-1">
                        <span className="font-medium">复核意见：</span>
                        {history.opinion}
                      </p>
                    )}
                    <p className="text-sm text-slate-500">
                      <span className="font-medium">变更原因：</span>
                      {history.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">暂无复核记录</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">系统判断 vs 人工判断</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-2">系统自动判断</p>
                <StatusBadge status={sample.autoJudge} />
              </div>
              <div className="flex justify-center">
                <Versus className="w-6 h-6 text-slate-300" />
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-600 mb-2">人工复核判断</p>
                {sample.manualJudge ? (
                  <StatusBadge status={sample.manualJudge} />
                ) : (
                  <p className="text-sm text-slate-400">待复核</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowReviewModal(true)}
              className="w-full mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              进行复核
            </button>
          </div>

          {locationChanges.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">地点变更对比</h2>
              {locationChanges.map((change) => (
                <div key={change.id} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border-2 ${
                      change.oldConclusion === 'normal' ? 'border-emerald-200 bg-emerald-50' :
                      change.oldConclusion === 'borderline' ? 'border-amber-200 bg-amber-50' :
                      'border-rose-200 bg-rose-50'
                    }`}>
                      <p className="text-xs font-medium text-slate-500 mb-1">变更前</p>
                      <p className="text-sm font-medium text-slate-700">{change.oldLocation}</p>
                      <div className="mt-2">
                        <StatusBadge status={change.oldConclusion} size="sm" />
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg border-2 ${
                      change.newConclusion === 'normal' ? 'border-emerald-300 bg-emerald-100' :
                      change.newConclusion === 'borderline' ? 'border-amber-300 bg-amber-100' :
                      'border-rose-300 bg-rose-100'
                    }`}>
                      <p className="text-xs font-medium text-slate-500 mb-1">变更后</p>
                      <p className="text-sm font-medium text-slate-700">{change.newLocation}</p>
                      <div className="mt-2">
                        <StatusBadge status={change.newConclusion} size="sm" />
                      </div>
                    </div>
                  </div>

                  {change.oldConclusion !== change.newConclusion && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-700 mb-1">⚠️ 结论变更影响</p>
                      <p className="text-xs text-amber-600">
                        分组统计中，{change.oldLocation} 的 {STATUS_LABELS[change.oldConclusion]} 减少 1，
                        {change.newLocation} 的 {STATUS_LABELS[change.newConclusion]} 增加 1
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{change.operator}</span>
                    <span>·</span>
                    <span>{formatDateTime(change.changeTime)}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">原因：</span>{change.reason}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h2 className="text-sm font-semibold text-blue-800 mb-3">创建信息</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600/70">创建时间</span>
                <span className="text-blue-800 font-medium">{formatDateTime(sample.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600/70">更新时间</span>
                <span className="text-blue-800 font-medium">{formatDateTime(sample.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        sampleId={sample.id}
        sampleCode={sample.strainCode}
        sampleName={sample.strainName}
        currentStatus={sample.status}
        isContaminated={sample.autoJudge === 'contaminated'}
      />
    </div>
  );
};
