import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, AlertTriangle, Check, X, Music } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { formatDate, formatDateTime } from '@/utils/dataMapper';

const SchedulePanel = () => {
  const { selectedInstrumentId, getScheduleByInstrumentId, getTransportByInstrumentId } = useAppStore();
  const schedule = selectedInstrumentId ? getScheduleByInstrumentId(selectedInstrumentId) : null;
  const transport = selectedInstrumentId ? getTransportByInstrumentId(selectedInstrumentId) : null;

  if (!selectedInstrumentId) {
    return (
      <div className="flex-1 flex items-center justify-center text-midnight-400 p-8">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">请选择一件乐器</p>
          <p className="text-sm mt-1">查看对应的城市日程信息</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex-1 flex items-center justify-center text-midnight-400 p-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无城市日程信息</p>
          <p className="text-sm mt-1">该乐器未关联城市日程</p>
        </div>
      </div>
    );
  }

  const scheduleCity = schedule.city;
  const transportCity = transport?.toCity;
  const isCityMismatch = scheduleCity && transportCity && scheduleCity !== transportCity;

  const isLate = schedule.status === '晚到';
  const hasConflict = isCityMismatch || isLate;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className="mb-4">
        <h3 className="title-section flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          城市日程信息
        </h3>
      </div>

      <div className={`card p-4 mb-4 ${hasConflict ? 'animate-pulse-red' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-midnight-500 mb-1">日程编号</p>
            <p className="font-mono text-midnight-100">{schedule.id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            schedule.status === '按计划'
              ? 'bg-success-green/20 text-success-green'
              : schedule.status === '晚到'
              ? 'bg-alert-red/20 text-alert-red'
              : 'bg-amber-gold-500/20 text-amber-gold-400'
          }`}>
            {schedule.status === '按计划' && '准时'}
            {schedule.status === '晚到' && '晚到'}
            {schedule.status === '错配' && '错配'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-midnight-500 mb-1">演出城市</p>
            <p className="text-sm text-midnight-200 font-medium">{schedule.city}</p>
          </div>
          <div>
            <p className="text-xs text-midnight-500 mb-1">演出地点</p>
            <p className="text-sm text-midnight-200">{schedule.venue}</p>
          </div>
          <div>
            <p className="text-xs text-midnight-500 mb-1">演出日期</p>
            <p className="text-sm text-midnight-200">{formatDate(schedule.performanceDate)}</p>
          </div>
          <div>
            <p className="text-xs text-midnight-500 mb-1">演出时间</p>
            <p className="text-sm text-midnight-200">{schedule.performanceTime}</p>
          </div>
        </div>

        {isCityMismatch && (
          <div className="mb-4 p-3 bg-alert-red/10 border border-alert-red/30 rounded-btn">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-alert-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-alert-red mb-1">城市错配</p>
                <p className="text-xs text-midnight-300">
                  日程城市：<span className="text-alert-red">{scheduleCity}</span>
                  {' ≠ '}
                  运输到达：<span className="text-alert-red">{transportCity}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {isLate && (
          <div className="mb-4 p-3 bg-alert-red/10 border border-alert-red/30 rounded-btn">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-alert-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-alert-red mb-1">晚到</p>
                <p className="text-xs text-midnight-300">{schedule.notes}</p>
                {schedule.delayHours && (
                  <p className="text-xs text-alert-red mt-1">延误约 {schedule.delayHours} 小时</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-midnight-700/50 rounded-btn">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-amber-gold-400" />
            <span className="text-sm font-medium text-midnight-100">{schedule.program}</span>
          </div>
          <p className="text-xs text-midnight-400">演出曲目/安排</p>
        </div>

        {schedule.notes && !isLate && (
          <div className="mt-4">
            <p className="text-xs text-midnight-500 mb-1">备注</p>
            <p className="text-sm text-midnight-300">{schedule.notes}</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h4 className="font-medium text-midnight-100 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          行程时间轴
        </h4>
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-midnight-600" />
          
          <div className="space-y-4">
            <div className="relative pl-10">
              <div className="absolute left-1.5 w-3 h-3 rounded-full bg-success-green" />
              <p className="text-xs text-midnight-400">乐器出发</p>
              <p className="text-sm text-midnight-200">{formatDate(schedule.departureDate)}</p>
            </div>
            <div className="relative pl-10">
              <div className="absolute left-1.5 w-3 h-3 rounded-full bg-blue-500" />
              <p className="text-xs text-midnight-400">预到达日期</p>
              <p className="text-sm text-midnight-200">{formatDate(schedule.arrivalDate)}</p>
            </div>
            <div className="relative pl-10">
              <div className={`absolute left-1.5 w-3 h-3 rounded-full ${isLate ? 'bg-alert-red' : 'bg-amber-gold-500'}`} />
              <p className="text-xs text-midnight-400">彩排日期</p>
              <p className="text-sm text-midnight-200">{formatDate(schedule.rehearsalDate)}</p>
            </div>
            <div className="relative pl-10">
              <div className="absolute left-1.5 w-3 h-3 rounded-full gold-gradient" />
              <p className="text-xs text-midnight-400">演出日期</p>
              <p className="text-sm text-midnight-200">{formatDate(schedule.performanceDate)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 card p-4">
        <h4 className="font-medium text-midnight-100 mb-3">关联信息</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">关联乐器ID</span>
            <span className="font-mono text-amber-gold-400">{schedule.instrumentId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">联系人</span>
            <span className="text-midnight-300">{schedule.contactPerson}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">联系电话</span>
            <span className="text-midnight-300">{schedule.contactPhone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">创建时间</span>
            <span className="text-midnight-300">{formatDateTime(schedule.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-midnight-400">更新时间</span>
            <span className="text-midnight-300">{formatDateTime(schedule.updatedAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SchedulePanel;
