import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Clock, Link2 } from 'lucide-react';
import { Alarm, AlarmLevel } from '../../types';
import { useAlarmStore } from '../../store/useAlarmStore';
import { useFilterStore } from '../../store/useFilterStore';
import { useSceneStore } from '../../store/useSceneStore';
import { mockRacks, mockVents } from '../../data/mockData';

const levelConfig: Record<AlarmLevel, { icon: any; color: string; bgColor: string; label: string }> = {
  critical: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50', label: '严重' },
  warning: { icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/50', label: '警告' },
  info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50', label: '信息' },
};

const alarmTypeLabels: Record<string, string> = {
  sensor_offline: '探头离线',
  vent_blocked: '风口遮挡',
  rack_duplicate: '机柜重号',
};

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return date.toLocaleDateString('zh-CN');
}

function getObjectPosition(alarm: Alarm): [number, number, number] | null {
  const rack = mockRacks.find((r) => r.id === alarm.relatedObjectId);
  if (rack) return rack.position;

  const vent = mockVents.find((v) => v.id === alarm.relatedObjectId);
  if (vent) return vent.position;

  if (alarm.clues.length > 0) {
    const clueRack = mockRacks.find((r) => r.id === alarm.clues[0].relatedId);
    if (clueRack) return clueRack.position;
  }

  return null;
}

interface AlarmCardProps {
  alarm: Alarm;
  isSelected: boolean;
  onSelect: (alarm: Alarm) => void;
}

function AlarmCard({ alarm, isSelected, onSelect }: AlarmCardProps) {
  const config = levelConfig[alarm.level];
  const Icon = config.icon;
  const { focusOnObject, setSelectedObject } = useSceneStore();

  const handleClick = () => {
    onSelect(alarm);
    const position = getObjectPosition(alarm);
    if (position) {
      focusOnObject(alarm.clues[0]?.type || 'rack', alarm.relatedObjectId, alarm.message, position);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
          : `${config.bgColor} hover:bg-white/5`
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
              {alarmTypeLabels[alarm.type] || alarm.type}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(alarm.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-200 font-medium truncate">{alarm.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <Link2 className="w-3 h-3" />
            <span>{alarm.clues.length} 个关联线索</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AlarmList() {
  const { alarms, selectedAlarm, setSelectedAlarm } = useAlarmStore();
  const { alarmLevels, searchKeyword } = useFilterStore();

  const filteredAlarms = alarms.filter((alarm) => {
    if (!alarmLevels.includes(alarm.level)) return false;
    if (searchKeyword && !alarm.message.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    return true;
  });

  const sortedAlarms = [...filteredAlarms].sort((a, b) => {
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-200">告警列表</h3>
        <span className="text-xs text-gray-400">
          {sortedAlarms.length} 条告警
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence>
          {sortedAlarms.map((alarm) => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              isSelected={selectedAlarm?.id === alarm.id}
              onSelect={setSelectedAlarm}
            />
          ))}
        </AnimatePresence>
        {sortedAlarms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无告警</p>
          </div>
        )}
      </div>
    </div>
  );
}
