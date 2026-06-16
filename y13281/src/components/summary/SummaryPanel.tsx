import { StatusCard } from './StatusCard';
import { useSummaryStats, useAppStore, usePointPhotos } from '../../store/useAppStore';
import { getStatusText, getStatusColor, getTimePeriodText } from '../../mock/data';
import {
  Layers,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileWarning,
  AlertTriangle,
  Settings,
  UserCheck,
  MapPin,
  Volume2,
  User,
  Calendar,
  History,
  Image as ImageIcon,
  FileText,
  Camera,
  ChevronRight,
  X,
} from 'lucide-react';

export function SummaryPanel() {
  const stats = useSummaryStats();
  const { selectedPointId, monitorPoints, reviewRecords, materials, timePeriod } = useAppStore();
  const selectedPoint = monitorPoints.find((p) => p.id === selectedPointId) || null;
  const pointPhotos = usePointPhotos(selectedPointId);

  const pointReviews = selectedPointId
    ? reviewRecords.filter((r) => r.monitorPointId === selectedPointId)
    : [];

  const pointMaterials = selectedPointId
    ? materials.filter((m) => m.monitorPointId === selectedPointId)
    : [];

  const changeTimeline = [
    ...pointMaterials.map((m) => ({
      id: m.id,
      type: 'material' as const,
      title: m.title,
      time: m.submittedAt,
      description: m.description,
      user: m.submittedBy,
      icon: m.type === 'photo' ? Camera : m.type === 'boundary' ? Volume2 : FileText,
    })),
    ...pointPhotos.map((p) => ({
      id: p.id,
      type: 'photo' as const,
      title: p.description,
      time: p.recordedAt,
      description: p.changes.join('；'),
      user: p.recordedBy,
      icon: ImageIcon,
    })),
    ...pointReviews.map((r) => ({
      id: r.id,
      type: 'review' as const,
      title: `复核记录 - ${getTimePeriodText(r.timePeriod)}`,
      time: r.reviewedAt,
      description: r.nextStep || (r.status === 'confirmed' ? '复核通过' : r.status === 'rejected' ? '复核拒绝' : '待复核'),
      user: r.reviewedBy,
      icon: ClipboardCheck,
    })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-white font-bold text-base">整体统计</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400">
            {getTimePeriodText(timePeriod)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatusCard
            title="监测点总数"
            value={stats.total}
            icon={Layers}
            color="purple"
          />
          <StatusCard
            title="已确认"
            value={stats.confirmed}
            icon={CheckCircle2}
            color="green"
          />
          <StatusCard
            title="已处理"
            value={stats.processed}
            icon={ClipboardCheck}
            color="blue"
          />
          <StatusCard
            title="待复核"
            value={stats.pending}
            icon={Clock}
            color="amber"
          />
          <StatusCard
            title="待补证"
            value={stats.needEvidence}
            icon={FileWarning}
            color="red"
          />
        </div>
      </div>

      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-white font-bold text-base">风险预警</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatusCard
            title="超限数量"
            value={stats.overLimitCount}
            icon={AlertTriangle}
            color="orange"
            trend={stats.overLimitCount > 0 ? 'up' : 'neutral'}
          />
          <StatusCard
            title="口径变更"
            value={stats.caliberChangedCount}
            icon={Settings}
            color="cyan"
          />
          <StatusCard
            title="需人工确认"
            value={stats.needManualConfirmCount}
            icon={UserCheck}
            color="pink"
            trend={stats.needManualConfirmCount > 0 ? 'up' : 'neutral'}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedPoint ? (
          <div className="h-full flex flex-col gap-4 overflow-y-auto pr-1">
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700 shrink-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-base">监测点详情</h2>
                </div>
                <button
                  onClick={() => useAppStore.getState().setSelectedPointId(null)}
                  className="w-7 h-7 rounded-lg bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300 text-sm">{selectedPoint.name}</span>
                  </div>
                  <span
                    className="px-2 py-1 rounded-md text-xs font-bold"
                    style={{
                      backgroundColor: `${getStatusColor(selectedPoint.status)}20`,
                      color: getStatusColor(selectedPoint.status),
                    }}
                  >
                    {getStatusText(selectedPoint.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-slate-500 text-xs">噪声容量</p>
                      <p className="text-white text-sm font-semibold">{selectedPoint.noiseCapacity} dB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="text-slate-500 text-xs">所属区域</p>
                      <p className="text-white text-sm font-semibold">{selectedPoint.area}</p>
                    </div>
                  </div>
                </div>

                {pointReviews.length > 0 && (
                  <div className="p-3 bg-slate-900/50 rounded-lg space-y-2">
                    <p className="text-slate-400 text-xs font-medium">复核记录</p>
                    {pointReviews.slice(0, 2).map((review) => (
                      <div key={review.id} className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              review.isOverLimit ? 'bg-red-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="text-slate-300 text-xs">
                            {getTimePeriodText(review.timePeriod)}测量值：{review.measuredValue}dB
                          </span>
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: getStatusColor(review.status === 'confirmed' ? 'confirmed' : review.status === 'pending' ? 'pending' : 'need_evidence'),
                          }}
                        >
                          {review.status === 'confirmed' ? '已通过' : review.status === 'rejected' ? '已拒绝' : '待处理'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {changeTimeline.length > 0 && (
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-white font-bold text-base">变更记录时间线</h2>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                  {changeTimeline.map((item, index) => {
                    const ItemIcon = item.icon;
                    const isLast = index === changeTimeline.length - 1;
                    const isPhoto = item.type === 'photo';
                    const isReview = item.type === 'review';

                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center shrink-0
                              ${isPhoto
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                : isReview
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                  : 'bg-gradient-to-br from-amber-500 to-orange-600'
                              }
                            `}
                          >
                            <ItemIcon className="w-4 h-4 text-white" />
                          </div>
                          {!isLast && (
                            <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-600 to-slate-700/30 my-1" />
                          )}
                        </div>

                        <div
                          className={`
                            flex-1 pb-4 ${isLast ? 'pb-0' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white text-sm font-medium">{item.title}</h4>
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <Calendar className="w-3 h-3" />
                              {item.time}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-slate-400 text-xs mb-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded text-slate-400 text-xs">
                              <User className="w-3 h-3" />
                              {item.user}
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-slate-300 font-medium mb-1">未选择监测点</h3>
            <p className="text-slate-500 text-sm">点击地图上的监测点查看详细信息</p>
          </div>
        )}
      </div>
    </div>
  );
}
