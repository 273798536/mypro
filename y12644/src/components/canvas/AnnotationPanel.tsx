import { useState } from 'react';
import {
  MessageSquarePlus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Tag,
  MapPin,
  User,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { RecordStatus } from '../../types';
import {
  getStatusLabel,
  getTypeLabel,
  getStatusColor,
  formatDateTime,
} from '../../utils/coordinateUtils';

export default function AnnotationPanel() {
  const {
    records,
    devices,
    selectedRecordId,
    changeRecordStatus,
    annotateRecord,
    assignDeviceToRecord,
    deleteRecord,
  } = useAppStore();

  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');

  const selectedRecord = records.find((r) => r.id === selectedRecordId);

  if (!selectedRecord) {
    return (
      <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-primary-500" />
            标注面板
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">点击画布上的标记</p>
            <p className="text-xs mt-1">查看详情并进行标注</p>
          </div>
        </div>
      </div>
    );
  }

  const color = getStatusColor(selectedRecord.status, selectedRecord.isFlipped);

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    annotateRecord(selectedRecord.id, noteContent.trim(), noteAuthor.trim() || '未署名');
    setNoteContent('');
    setNoteAuthor('');
  };

  return (
    <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-primary-500" />
          标注面板
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <div className="card p-4 animate-fade-in">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{selectedRecord.label}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{getTypeLabel(selectedRecord.type)}</p>
            </div>
            <span
              className="status-badge"
              style={{
                backgroundColor: color + '15',
                color: color,
              }}
            >
              {selectedRecord.isFlipped ? '坐标翻转' : getStatusLabel(selectedRecord.status)}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              坐标：
              <span className="font-mono text-gray-800">
                ({selectedRecord.xCoordinate.toFixed(0)}, {selectedRecord.yCoordinate.toFixed(0)})
              </span>
              {selectedRecord.isFlipped && (
                <AlertTriangle className="w-3.5 h-3.5 text-accent-500 ml-1" />
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              更新：{formatDateTime(selectedRecord.updatedAt)}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              评分：
              <span className="font-semibold text-primary-600 tabular-nums">
                {selectedRecord.score ?? 0}
              </span>
              <span className="text-gray-400">/ 100</span>
            </div>
          </div>
        </div>

        {selectedRecord.isFlipped && (
          <div className="card p-4 border-l-4 border-accent-500 bg-accent-50/50 animate-slide-up">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent-700 mb-1">坐标翻转检测</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedRecord.flipExplanation}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">状态标注</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => changeRecordStatus(selectedRecord.id, 'success')}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium transition-all ${
                selectedRecord.status === 'success' && !selectedRecord.isFlipped
                  ? 'bg-success-500 text-white shadow-soft'
                  : 'bg-success-50 text-success-700 hover:bg-success-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              顺利
            </button>
            <button
              onClick={() => changeRecordStatus(selectedRecord.id, 'pending')}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium transition-all ${
                selectedRecord.status === 'pending' || selectedRecord.isFlipped
                  ? 'bg-warning-500 text-white shadow-soft'
                  : 'bg-warning-50 text-warning-700 hover:bg-warning-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              待确认
            </button>
            <button
              onClick={() => changeRecordStatus(selectedRecord.id, 'error')}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium transition-all ${
                selectedRecord.status === 'error'
                  ? 'bg-danger-500 text-white shadow-soft'
                  : 'bg-danger-50 text-danger-700 hover:bg-danger-100'
              }`}
            >
              <XCircle className="w-4 h-4" />
              坏数据
            </button>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">关联设备</p>
          <select
            className="input-field text-sm"
            value={selectedRecord.deviceId || ''}
            onChange={(e) =>
              assignDeviceToRecord(selectedRecord.id, e.target.value || undefined)
            }
          >
            <option value="">未关联设备</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}（{d.location}）
              </option>
            ))}
          </select>
          {selectedRecord.deviceId && (
            <p className="text-xs text-gray-500 mt-1.5">
              状态：
              {devices.find((d) => d.id === selectedRecord.deviceId)?.status === 'active'
                ? '运行中'
                : '已停用'}
            </p>
          )}
        </div>

        {selectedRecord.annotation && (
          <div className="card p-4 bg-primary-50/50 border-l-4 border-primary-400">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-3.5 h-3.5 text-primary-500" />
              <span className="text-xs font-semibold text-primary-700">
                {selectedRecord.annotation.author}的备注
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                {formatDateTime(selectedRecord.annotation.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selectedRecord.annotation.content}
            </p>
          </div>
        )}

        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">添加人工备注</p>
          <input
            type="text"
            className="input-field text-sm mb-2"
            placeholder="你的名字（可选）"
            value={noteAuthor}
            onChange={(e) => setNoteAuthor(e.target.value)}
          />
          <textarea
            className="input-field text-sm resize-none"
            rows={3}
            placeholder="添加备注内容，原话保留不做修改..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <button
            onClick={handleSaveNote}
            disabled={!noteContent.trim()}
            className="btn-primary w-full mt-2 text-xs disabled:opacity-50"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            保存备注
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm(`确认删除「${selectedRecord.label}」？`)) {
              deleteRecord(selectedRecord.id);
            }
          }}
          className="w-full py-2 text-xs text-danger-600 hover:bg-danger-50 rounded-lg transition-all flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除该记录
        </button>
      </div>
    </div>
  );
}
