import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrackerStore } from '@/store/useTrackerStore';
import {
  Radio,
  CloudRain,
  Camera,
  CheckCircle,
  FileText,
  PlusCircle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  File,
  Image,
  Navigation,
  StickyNote,
  Clock,
  User,
  Upload,
} from 'lucide-react';
import dayjs from 'dayjs';
import type {
  EventRecord,
  OperationType,
  SourceMaterialType,
} from '@/types';
import {
  OPERATION_TYPE_LABEL,
  SOURCE_MATERIAL_LABEL,
  BUOY_STATUS_LABEL,
} from '@/types';
import { cn } from '@/lib/utils';
import DiffViewer from '@/components/DiffViewer';

const OPERATION_ICON_MAP: Record<OperationType, { Icon: any; color: string }> = {
  offline_detected: { Icon: Radio, color: 'text-coral-400' },
  forecast_updated: { Icon: CloudRain, color: 'text-cyan-400' },
  photo_modified: { Icon: Camera, color: 'text-sand-400' },
  status_checked: { Icon: CheckCircle, color: 'text-blue-400' },
  note_added: { Icon: FileText, color: 'text-ocean-400' },
  data_supplemented: { Icon: PlusCircle, color: 'text-seaweed-400' },
  caliber_adjusted: { Icon: Sliders, color: 'text-purple-400' },
};

const SOURCE_MATERIAL_ICON_MAP: Record<SourceMaterialType, any> = {
  forecast_file: File,
  inspection_photo: Image,
  ship_track: Navigation,
  manual_note: StickyNote,
};

const DIFF_TITLE_MAP: Partial<Record<OperationType, string>> = {
  forecast_updated: '气象预报补版前后对比',
  photo_modified: '巡检照片修改前后对比',
  caliber_adjusted: '数据口径调整前后对比',
  data_supplemented: '补充数据前后对比',
};

function truncateText(text: string, maxLen = 60) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

export default function EventTracker() {
  const { buoyId } = useParams<{ buoyId?: string }>();
  const navigate = useNavigate();
  const { buoys, getEventsByBuoy, addEventRecord, compareVersions } = useTrackerStore();

  const offlineBuoys = useMemo(() => buoys.filter((b) => b.status === 'offline'), [buoys]);
  const defaultBuoyId = buoyId ?? offlineBuoys[0]?.id ?? buoys[0]?.id ?? '';

  const [selectedBuoyId, setSelectedBuoyId] = useState(defaultBuoyId);
  const [buoyDropdownOpen, setBuoyDropdownOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [exifExpanded, setExifExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newOperation, setNewOperation] = useState<OperationType>('note_added');
  const [newContent, setNewContent] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceMaterialType | ''>('');
  const [newSourceName, setNewSourceName] = useState('');

  const events = useMemo(
    () => (selectedBuoyId ? getEventsByBuoy(selectedBuoyId) : []),
    [selectedBuoyId, getEventsByBuoy]
  );

  useEffect(() => {
    if (selectedBuoyId && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [selectedBuoyId, events, selectedEventId]);

  useEffect(() => {
    if (buoyId && buoyId !== selectedBuoyId) {
      setSelectedBuoyId(buoyId);
      setSelectedEventId(null);
    }
  }, [buoyId, selectedBuoyId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;
  const selectedBuoy = buoys.find((b) => b.id === selectedBuoyId);

  const diffs = useMemo(() => {
    if (!selectedEvent?.versionBefore || !selectedEvent?.versionAfter) return [];
    return compareVersions(selectedEvent.versionBefore.fields, selectedEvent.versionAfter.fields);
  }, [selectedEvent, compareVersions]);

  const diffTitle = useMemo(() => {
    if (!selectedEvent) return '';
    return DIFF_TITLE_MAP[selectedEvent.operationType] ?? '数据变更前后对比';
  }, [selectedEvent]);

  function handleBuoyChange(id: string) {
    setSelectedBuoyId(id);
    setSelectedEventId(null);
    setBuoyDropdownOpen(false);
    navigate(`/events/${id}`);
  }

  function handleAddRecord() {
    if (!selectedBuoyId || !newContent.trim()) return;
    addEventRecord({
      buoyId: selectedBuoyId,
      operator: '当前用户',
      operationType: newOperation,
      content: newContent.trim(),
      sourceMaterial:
        newSourceType && newSourceName.trim()
          ? {
              id: `src-${Date.now()}`,
              type: newSourceType,
              name: newSourceName.trim(),
              uploadedAt: dayjs().toISOString(),
              uploader: '当前用户',
            }
          : undefined,
    });
    setNewOperation('note_added');
    setNewContent('');
    setNewSourceType('');
    setNewSourceName('');
    setModalOpen(false);
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-[calc(100vh-3rem)]">
        <div className="w-full md:w-[40%] flex flex-col gap-4">
          <div className="nautical-card p-4">
            <h2 className="section-title mb-4">浮标选择</h2>
            <div className="relative">
              <button
                onClick={() => setBuoyDropdownOpen(!buoyDropdownOpen)}
                className="nautical-btn w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  {selectedBuoy && (
                    <span className={`status-dot status-${selectedBuoy.status}`} />
                  )}
                  <span>{selectedBuoy?.name ?? '请选择浮标'}</span>
                  {selectedBuoy && (
                    <span className="text-ocean-400 text-xs">({selectedBuoy.code})</span>
                  )}
                </span>
                {buoyDropdownOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {buoyDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-2 nautical-card p-2 max-h-72 overflow-y-auto">
                  {buoys.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBuoyChange(b.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md flex items-center gap-2 hover:bg-ocean-700/50 transition-colors',
                        b.id === selectedBuoyId && 'bg-ocean-700/50'
                      )}
                    >
                      <span className={`status-dot status-${b.status}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ocean-100 font-medium truncate">
                          {b.name}
                        </div>
                        <div className="text-xs text-ocean-400">
                          {b.code} · {BUOY_STATUS_LABEL[b.status]}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="nautical-card p-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">事件时间线</h2>
              <span className="text-xs text-ocean-400">共 {events.length} 条</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              {events.length === 0 ? (
                <div className="h-full flex items-center justify-center text-ocean-400 text-sm">
                  暂无事件记录
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-ocean-700/60" />
                  <div className="space-y-4">
                    {events.map((event) => {
                      const { Icon, color } = OPERATION_ICON_MAP[event.operationType];
                      const isSelected = event.id === selectedEventId;
                      return (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          className={cn(
                            'relative w-full text-left pl-14 pr-3 py-3 rounded-lg transition-all',
                            isSelected
                              ? 'bg-ocean-700/40 border border-ocean-600/50'
                              : 'hover:bg-ocean-800/40 border border-transparent'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute left-0 top-3.5 w-10 h-10 rounded-full flex items-center justify-center bg-ocean-800 border-2 border-ocean-600',
                              isSelected && 'border-seafoam-400/60 shadow-[0_0_12px_rgba(44,166,164,0.3)]'
                            )}
                          >
                            <Icon className={cn('w-5 h-5', color)} />
                          </div>
                          <div className="flex items-center gap-2 mb-1.5 text-xs">
                            <span className="text-seafoam-300 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dayjs(event.timestamp).format('HH:mm')}
                            </span>
                            <span className="text-ocean-400">·</span>
                            <span className="text-ocean-300 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {event.operator}
                            </span>
                            <span className="tag bg-ocean-700/50 text-ocean-300 border-ocean-600/40 ml-auto">
                              {OPERATION_TYPE_LABEL[event.operationType]}
                            </span>
                          </div>
                          <p className="text-sm text-ocean-200 leading-relaxed">
                            {truncateText(event.content, 70)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-[60%] flex flex-col gap-4">
          <div className="nautical-card p-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">记录详情</h2>
              {selectedEvent && (
                <span className="text-xs text-ocean-400 font-mono">
                  {dayjs(selectedEvent.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
              {!selectedEvent ? (
                <div className="h-full flex items-center justify-center text-ocean-400">
                  请选择左侧事件记录查看详情
                </div>
              ) : (
                <>
                  {selectedEvent.sourceMaterial && (
                    <div className="nautical-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-ocean-100 flex items-center gap-2">
                          {(() => {
                            const SrcIcon =
                              SOURCE_MATERIAL_ICON_MAP[selectedEvent.sourceMaterial!.type];
                            return <SrcIcon className="w-4 h-4 text-seafoam-400" />;
                          })()}
                          来源材料
                        </h3>
                        <span className="tag bg-ocean-700/50 text-ocean-300 border-ocean-600/40">
                          {SOURCE_MATERIAL_LABEL[selectedEvent.sourceMaterial.type]}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-ocean-400">文件名称</span>
                          <span className="text-ocean-100 font-medium">
                            {selectedEvent.sourceMaterial.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-ocean-400">上传时间</span>
                          <span className="text-ocean-200 font-mono text-xs">
                            {dayjs(selectedEvent.sourceMaterial.uploadedAt).format(
                              'YYYY-MM-DD HH:mm'
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-ocean-400">上传人</span>
                          <span className="text-ocean-200">
                            {selectedEvent.sourceMaterial.uploader}
                          </span>
                        </div>
                        {selectedEvent.sourceMaterial.size && (
                          <div className="flex items-center justify-between">
                            <span className="text-ocean-400">文件大小</span>
                            <span className="text-ocean-200">
                              {selectedEvent.sourceMaterial.size}
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedEvent.sourceMaterial.exifInfo &&
                        Object.keys(selectedEvent.sourceMaterial.exifInfo).length > 0 && (
                          <div className="mt-4">
                            <button
                              onClick={() => setExifExpanded(!exifExpanded)}
                              className="flex items-center gap-1 text-xs text-seafoam-400 hover:text-seafoam-300 transition-colors"
                            >
                              {exifExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                              EXIF 信息
                            </button>
                            {exifExpanded && (
                              <div className="mt-2 rounded-md bg-ocean-800/60 border border-ocean-700/40 p-3 space-y-1.5">
                                {Object.entries(selectedEvent.sourceMaterial.exifInfo).map(
                                  ([k, v]) => (
                                    <div
                                      key={k}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span className="text-ocean-400">{k}</span>
                                      <span className="text-ocean-200 font-mono">{v}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}

                  {selectedEvent.versionBefore && selectedEvent.versionAfter && diffs.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-5 w-1 bg-seafoam-500 rounded" />
                        <h3 className="font-medium text-seafoam-300">{diffTitle}</h3>
                      </div>
                      <DiffViewer before={selectedEvent.versionBefore} after={selectedEvent.versionAfter} />
                    </div>
                  )}

                  {(!selectedEvent.versionBefore ||
                    !selectedEvent.versionAfter ||
                    diffs.length === 0) && (
                    <div className="nautical-card p-4">
                      <h3 className="font-medium text-ocean-100 mb-3">处理内容</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-ocean-400">
                          <span className="tag bg-ocean-700/50 text-ocean-300 border-ocean-600/40">
                            {OPERATION_TYPE_LABEL[selectedEvent.operationType]}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {selectedEvent.operator}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {dayjs(selectedEvent.timestamp).format('YYYY-MM-DD HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-ocean-200 leading-relaxed whitespace-pre-wrap">
                          {selectedEvent.content}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="pt-4 mt-4 border-t border-ocean-700/50">
              <button
                onClick={() => setModalOpen(true)}
                disabled={!selectedBuoyId}
                className="nautical-btn-primary w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                添加处理记录
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="nautical-card w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title !text-lg">添加处理记录</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-md hover:bg-ocean-700/50 text-ocean-400 hover:text-ocean-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-ocean-300 mb-1.5">操作类型</label>
                <select
                  value={newOperation}
                  onChange={(e) => setNewOperation(e.target.value as OperationType)}
                  className="input-nautical"
                >
                  {Object.entries(OPERATION_TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-ocean-300 mb-1.5">处理内容</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  placeholder="请输入处理内容说明…"
                  className="input-nautical resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-ocean-300 mb-1.5">来源材料类型</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as SourceMaterialType | '')}
                    className="input-nautical"
                  >
                    <option value="">无</option>
                    {Object.entries(SOURCE_MATERIAL_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-ocean-300 mb-1.5">材料名称</label>
                  <div className="relative">
                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-500" />
                    <input
                      type="text"
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      disabled={!newSourceType}
                      placeholder={newSourceType ? '文件名' : '先选类型'}
                      className="input-nautical pl-9 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="nautical-btn flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAddRecord}
                disabled={!newContent.trim()}
                className="nautical-btn-primary flex-1 gap-2"
              >
                <Plus className="w-4 h-4" />
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
