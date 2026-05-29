import { useState } from 'react';
import {
  Lock,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  User,
  FileText,
  Link2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useYardStore } from '@/store/yardStore';

type TabType = 'lock' | 'playback' | 'conflicts';

export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<TabType>('conflicts');

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'lock', label: '箱位锁定', icon: Lock },
    { id: 'playback', label: '作业回放', icon: Play },
    { id: 'conflicts', label: '冲突详情', icon: AlertTriangle },
  ];

  return (
    <div className="w-80 bg-yard-darker/90 border-l border-yard-light/20 flex flex-col h-full backdrop-blur-sm">
      <div className="flex border-b border-yard-light/20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                isActive
                  ? 'bg-yard-light/20 text-accent-blue border-b-2 border-accent-blue'
                  : 'text-neutral-gray hover:text-neutral-light hover:bg-yard-light/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'lock' && <SlotLockPanel />}
        {activeTab === 'playback' && <PlaybackPanel />}
        {activeTab === 'conflicts' && <ConflictPanel />}
      </div>
    </div>
  );
}

function SlotLockPanel() {
  const { slots, selectedSlotId, lockSlot, unlockSlot, getSlotById } = useYardStore();
  const [lockReason, setLockReason] = useState('');

  const lockedSlots = slots.filter((s) => s.isLocked);
  const selectedSlot = selectedSlotId ? getSlotById(selectedSlotId) : null;

  const handleLock = () => {
    if (selectedSlotId && lockReason.trim()) {
      lockSlot(selectedSlotId, lockReason, '当前调度员');
      setLockReason('');
    }
  };

  const handleUnlock = (slotId: string) => {
    unlockSlot(slotId);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {selectedSlot && (
        <div className="p-3 border-b border-yard-light/20">
          <div className="text-xs text-neutral-gray mb-2">当前选中箱位</div>
          <div className="bg-yard-dark/50 border border-yard-light/20 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-light font-mono font-bold">
                {selectedSlot.id}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  selectedSlot.isLocked
                    ? 'bg-accent-orange/20 text-accent-orange'
                    : 'bg-accent-green/20 text-accent-green'
                }`}
              >
                {selectedSlot.isLocked ? '已锁定' : '可操作'}
              </span>
            </div>
            {!selectedSlot.isLocked && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="锁定原因..."
                  className="w-full bg-yard-dark border border-yard-light/30 text-neutral-light text-sm px-2 py-1.5 rounded focus:outline-none focus:border-accent-blue"
                />
                <button
                  onClick={handleLock}
                  disabled={!lockReason.trim()}
                  className="w-full bg-accent-blue hover:bg-accent-blue/80 disabled:bg-yard-light/30 disabled:cursor-not-allowed text-white text-sm py-1.5 rounded transition-colors"
                >
                  锁定此箱位
                </button>
              </div>
            )}
            {selectedSlot.isLocked && selectedSlot.lockRecord && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-gray">锁定人</span>
                  <span className="text-neutral-light">{selectedSlot.lockRecord.lockedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-gray">原因</span>
                  <span className="text-neutral-light">{selectedSlot.lockRecord.reason}</span>
                </div>
                <button
                  onClick={() => handleUnlock(selectedSlot.id)}
                  className="w-full mt-2 bg-accent-red/20 hover:bg-accent-red/30 text-accent-red text-sm py-1.5 rounded transition-colors"
                >
                  解锁
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-xs text-neutral-gray mb-2">
          已锁定箱位 ({lockedSlots.length})
        </div>
        <div className="space-y-2">
          {lockedSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-yard-dark/50 border border-yard-light/20 rounded p-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-accent-orange" />
                  <span className="text-neutral-light font-mono text-sm">
                    {slot.id}
                  </span>
                </div>
                <button
                  onClick={() => handleUnlock(slot.id)}
                  className="text-accent-red hover:text-accent-red/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {slot.lockRecord && (
                <div className="mt-1 text-xs text-neutral-gray truncate">
                  {slot.lockRecord.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaybackPanel() {
  const { playbackTime, isPlaying, playbackSpeed, setPlaybackTime, setPlaying, setPlaybackSpeed, jobs } =
    useYardStore();

  const maxTime = 100;

  const criticalPoints = [
    { time: 20, label: '危险品检测', type: 'critical' },
    { time: 45, label: '吊机冲突', type: 'warning' },
    { time: 75, label: '翻箱高峰', type: 'info' },
  ];

  return (
    <div className="h-full flex flex-col p-3">
      <div className="mb-4">
        <div className="text-xs text-neutral-gray mb-2">时间轴</div>
        <div className="relative">
          <input
            type="range"
            min={0}
            max={maxTime}
            value={playbackTime}
            onChange={(e) => setPlaybackTime(Number(e.target.value))}
            className="w-full h-2 bg-yard-dark rounded-lg appearance-none cursor-pointer"
          />
          {criticalPoints.map((point) => (
            <div
              key={point.time}
              className="absolute top-0 -translate-y-1"
              style={{ left: `${(point.time / maxTime) * 100}%` }}
            >
              <div
                className={`w-2 h-4 rounded-sm ${
                  point.type === 'critical'
                    ? 'bg-accent-red'
                    : point.type === 'warning'
                    ? 'bg-accent-orange'
                    : 'bg-accent-blue'
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-neutral-gray font-mono">
          <span>08:00</span>
          <span>{Math.floor(playbackTime / 100 * 8 + 8).toString().padStart(2, '0')}:00</span>
          <span>18:00</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => setPlaybackTime(0)}
          className="p-2 bg-yard-dark hover:bg-yard-light/20 rounded transition-colors"
        >
          <SkipBack className="w-4 h-4 text-neutral-light" />
        </button>
        <button
          onClick={() => setPlaying(!isPlaying)}
          className="p-3 bg-accent-blue hover:bg-accent-blue/80 rounded-full transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </button>
        <button
          onClick={() => setPlaybackTime(maxTime)}
          className="p-2 bg-yard-dark hover:bg-yard-light/20 rounded transition-colors"
        >
          <SkipForward className="w-4 h-4 text-neutral-light" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs text-neutral-gray">倍速:</span>
        {[0.5, 1, 2, 4].map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              playbackSpeed === speed
                ? 'bg-accent-blue text-white'
                : 'bg-yard-dark text-neutral-light hover:bg-yard-light/20'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="text-xs text-neutral-gray mb-2">
        关键节点 ({criticalPoints.length})
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {criticalPoints.map((point) => (
          <button
            key={point.time}
            onClick={() => setPlaybackTime(point.time)}
            className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
              playbackTime >= point.time && playbackTime < point.time + 10
                ? 'bg-yard-light/20'
                : 'bg-yard-dark/50 hover:bg-yard-light/10'
            }`}
          >
            {point.type === 'critical' && (
              <AlertCircle className="w-4 h-4 text-accent-red" />
            )}
            {point.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-accent-orange" />
            )}
            {point.type === 'info' && (
              <Info className="w-4 h-4 text-accent-blue" />
            )}
            <div className="flex-1">
              <div className="text-sm text-neutral-light">{point.label}</div>
              <div className="text-xs text-neutral-gray font-mono">
                {Math.floor(point.time / 100 * 8 + 8).toString().padStart(2, '0')}:00
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-gray" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ConflictPanel() {
  const { conflicts, selectedConflictId, selectConflict, resolveConflict, ignoreConflict, getContainerById } =
    useYardStore();

  const openConflicts = conflicts.filter((c) => c.status === 'open');

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-accent-red/20 text-accent-red border-accent-red/50';
      case 'warning':
        return 'bg-accent-orange/20 text-accent-orange border-accent-orange/50';
      case 'info':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/50';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const selectedConflict = conflicts.find((c) => c.id === selectedConflictId);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-yard-light/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-gray">
            待处理冲突 ({openConflicts.length})
          </span>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-accent-red/20 text-accent-red">
              严重 {openConflicts.filter(c => c.severity === 'critical').length}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-orange/20 text-accent-orange">
              警告 {openConflicts.filter(c => c.severity === 'warning').length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {openConflicts.map((conflict) => {
          const Icon = getSeverityIcon(conflict.severity);
          const isSelected = selectedConflictId === conflict.id;
          return (
            <div
              key={conflict.id}
              onClick={() => selectConflict(isSelected ? null : conflict.id)}
              className={`bg-yard-dark/50 border rounded cursor-pointer transition-all ${
                isSelected
                  ? 'border-accent-blue/50 ring-1 ring-accent-blue/30'
                  : 'border-yard-light/20 hover:border-yard-light/40'
              }`}
            >
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <Icon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      conflict.severity === 'critical'
                        ? 'text-accent-red'
                        : conflict.severity === 'warning'
                        ? 'text-accent-orange'
                        : 'text-accent-blue'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border ${getSeverityStyle(
                          conflict.severity
                        )}`}
                      >
                        {conflict.severity === 'critical'
                          ? '严重'
                          : conflict.severity === 'warning'
                          ? '警告'
                          : '提示'}
                      </span>
                      <span className="text-xs text-neutral-gray font-mono">
                        {conflict.id}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-light line-clamp-2">
                      {conflict.description}
                    </p>
                  </div>
                </div>
              </div>

              {isSelected && (
                <div className="border-t border-yard-light/20 p-3 space-y-3">
                  <div>
                    <div className="text-xs text-neutral-gray mb-2 flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      追溯链
                    </div>
                    <div className="bg-yard-darker rounded p-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-gray">规则</span>
                        <span className="text-accent-green font-mono">
                          {conflict.traceChain.ruleName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-gray">版本</span>
                        <span className="text-neutral-light font-mono">
                          {conflict.traceChain.ruleVersion}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-gray">计算时间</span>
                        <span className="text-neutral-light font-mono">
                          {conflict.traceChain.computedAt.split('T')[1]}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-yard-light/20">
                        <div className="text-neutral-gray mb-1">数据来源:</div>
                        {conflict.traceChain.dataSources.map((ds, i) => (
                          <div key={i} className="flex justify-between text-neutral-gray">
                            <span className="font-mono truncate max-w-32">
                              {ds.sourceFile}:{ds.sourceLine}
                            </span>
                            <span className="text-neutral-light">{ds.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-neutral-gray mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      下一步处置
                    </div>
                    <div className="space-y-2">
                      {conflict.actionItems.map((action) => (
                        <div
                          key={action.id}
                          className="bg-yard-darker rounded p-2"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-neutral-gray" />
                              <span className="text-xs text-neutral-light">
                                {action.assignee}
                              </span>
                              <span className="text-xs text-neutral-gray">
                                ({action.assigneeRole})
                              </span>
                            </div>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                action.priority === 'high'
                                  ? 'bg-accent-red/20 text-accent-red'
                                  : action.priority === 'medium'
                                  ? 'bg-accent-orange/20 text-accent-orange'
                                  : 'bg-accent-blue/20 text-accent-blue'
                              }`}
                            >
                              {action.priority === 'high'
                                ? '高'
                                : action.priority === 'medium'
                                ? '中'
                                : '低'}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-light mb-1">
                            {action.description}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-neutral-gray">
                            <FileText className="w-3 h-3" />
                            <span>
                              修改 {action.documentToModify} - {action.documentSection}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveConflict(conflict.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green text-sm py-1.5 rounded transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      标记解决
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        ignoreConflict(conflict.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 bg-yard-light/20 hover:bg-yard-light/30 text-neutral-light text-sm py-1.5 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                      忽略
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
