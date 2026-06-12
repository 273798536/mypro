import { useState, useRef } from 'react';
import {
  X,
  MapPin,
  Info,
  FileText,
  Camera,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { HistoryItem } from '@/components/history/HistoryItem';
import type { Point, PointStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { usePointStore } from '@/store/usePointStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useHistory } from '@/hooks/useHistory';
import { formatCoord } from '@/utils/coord';
import { formatDateTime } from '@/utils/storage';
import { cn } from '@/lib/utils';

interface DetailPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function DetailPanel({ isOpen, onToggle }: DetailPanelProps) {
  const { selectedPointId, points, updatePointStatus, updatePointRemark } = usePointStore();
  const { getHistoryByPointId } = useHistoryStore();
  const { logStatusChange, logRemark, logScreenshot } = useHistory();
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [remarkInput, setRemarkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const point = points.find(p => p.id === selectedPointId);
  const history = selectedPointId ? getHistoryByPointId(selectedPointId) : [];

  if (!point) {
    return (
      <div
        className={cn(
          'h-full bg-space-900/95 border-l border-space-700 backdrop-blur-sm flex flex-col items-center justify-center panel-transition',
          isOpen ? 'w-80' : 'w-0 overflow-hidden'
        )}
      >
        {isOpen && (
          <div className="text-center px-6">
            <MapPin className="mx-auto text-space-600 mb-3" size={32} />
            <p className="text-sm text-space-400">点击地图上的点位</p>
            <p className="text-xs text-space-500 mt-1">查看详细信息</p>
          </div>
        )}
      </div>
    );
  }

  const handleStatusChange = (newStatus: PointStatus) => {
    if (point.status === newStatus) return;
    const oldStatus = point.status;
    updatePointStatus(point.id, newStatus, '当前用户');
    logStatusChange(point.id, oldStatus, newStatus);
  };

  const handleAddRemark = () => {
    if (!remarkInput.trim()) return;
    updatePointRemark(point.id, remarkInput, '当前用户');
    logRemark(point.id, remarkInput);
    setRemarkInput('');
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      logScreenshot(point.id, dataUrl, true, '现场复核截图');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        'h-full bg-space-900/95 border-l border-space-700 backdrop-blur-sm flex flex-col panel-transition',
        isOpen ? 'w-80' : 'w-0 overflow-hidden'
      )}
    >
      {isOpen && (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-space-700">
            <div>
              <h3 className="text-sm font-semibold text-space-100">{point.name}</h3>
              <p className="text-[10px] text-space-500 font-mono">{point.id}</p>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded hover:bg-space-800 text-space-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex border-b border-space-700">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'flex-1 px-4 py-2 text-xs font-medium transition-colors',
                activeTab === 'info'
                  ? 'text-space-100 border-b-2 border-space-400'
                  : 'text-space-500 hover:text-space-300'
              )}
            >
              <span className="flex items-center justify-center gap-1">
                <Info size={12} />
                基本信息
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex-1 px-4 py-2 text-xs font-medium transition-colors',
                activeTab === 'history'
                  ? 'text-space-100 border-b-2 border-space-400'
                  : 'text-space-500 hover:text-space-300'
              )}
            >
              <span className="flex items-center justify-center gap-1">
                <Clock size={12} />
                历史记录
                {history.length > 0 && (
                  <span className="bg-space-700 px-1.5 py-0.5 rounded text-[9px]">
                    {history.length}
                  </span>
                )}
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'info' && (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-space-500 uppercase tracking-wider">
                    当前状态
                  </label>
                  <div className="flex gap-2">
                    {(['normal', 'pending', 'abnormal', 'unchecked'] as PointStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded text-xs border transition-all',
                          point.status === status
                            ? 'border-transparent'
                            : 'border-space-700 bg-space-800/50 hover:bg-space-800 text-space-400'
                        )}
                      >
                        <Badge status={status} className="justify-center w-full" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-space-400">
                    <MapPin size={12} />
                    <span>坐标信息</span>
                  </div>
                  <div className="font-mono text-xs text-space-200">
                    {formatCoord(point.lng, point.lat, point.altitude)}
                  </div>
                  <div className="text-[10px] text-space-500 pt-1 border-t border-space-700/50">
                    <span className="text-space-400">来源：</span>
                    {point.source}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-space-500 uppercase tracking-wider">
                    航线走廊
                  </label>
                  <div className="text-xs text-space-200">
                    {mockCorridors.find(c => c.id === point.corridorId)?.name || point.corridorId}
                  </div>
                </div>

                {point.remark && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-space-500 uppercase tracking-wider">
                      当前备注
                    </label>
                    <div className="text-xs text-space-300 bg-space-800/50 rounded p-2 border-l-2 border-space-500">
                      {point.remark}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-space-500 uppercase tracking-wider">
                    添加备注
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={remarkInput}
                      onChange={(e) => setRemarkInput(e.target.value)}
                      placeholder="输入备注..."
                      className="flex-1 px-3 py-2 bg-space-800 border border-space-700 rounded text-xs text-space-100 placeholder-space-500 focus:outline-none focus:border-space-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRemark()}
                    />
                    <button
                      onClick={handleAddRemark}
                      disabled={!remarkInput.trim()}
                      className="px-3 py-2 bg-space-700 hover:bg-space-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-space-100 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-medium text-space-500 uppercase tracking-wider">
                    上传截图
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-space-800 hover:bg-space-700 border border-dashed border-space-600 rounded text-xs text-space-400 hover:text-space-200 transition-colors"
                  >
                    <Camera size={16} />
                    点击上传截图（自动保存当前视图）
                  </button>
                </div>

                <div className="pt-2 border-t border-space-700 space-y-1 text-[10px] text-space-500">
                  <div className="flex justify-between">
                    <span>创建时间</span>
                    <span className="font-mono">{formatDateTime(point.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>更新时间</span>
                    <span className="font-mono">{formatDateTime(point.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-space-500">
                    <Clock className="mx-auto mb-2" size={24} />
                    <p className="text-xs">暂无历史记录</p>
                  </div>
                ) : (
                  history.map((record, index) => (
                    <div key={record.id} className="history-item" style={{ animationDelay: `${index * 0.05}s` }}>
                      <HistoryItem record={record} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const mockCorridors = [
  { id: 'COR-001', name: '东部干线 A段' },
  { id: 'COR-002', name: '东部干线 B段' },
];
