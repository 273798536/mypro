import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  MapPinOff,
  AlertTriangle,
  Undo2,
  Send,
} from 'lucide-react';
import { usePointStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { CoordinateDisplay } from '../components/CoordinateDisplay';
import { RawDataDisplay } from '../components/RawDataDisplay';
import { formatDateTime } from '../utils/geo';

export function PointDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    mergedPoints,
    rawPoints,
    confirmPoint,
    markOnsite,
    markConflict,
    withdrawStatus,
    addNote,
  } = usePointStore();

  const [noteContent, setNoteContent] = useState('');
  const [isSupplementary, setIsSupplementary] = useState(false);
  const [activeTab, setActiveTab] = useState<'coordinates' | 'raw' | 'notes'>('coordinates');

  const point = mergedPoints.find(p => p.id === id);
  const rawPointsForPoint = rawPoints.filter(rp => point?.rawPointIds.includes(rp.id));

  if (!point) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">点位不存在</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-4">
          返回列表
        </button>
      </div>
    );
  }

  const hasOffset = rawPointsForPoint.some(rp => rp.isOffset);

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNote(point.id, noteContent, isSupplementary);
    setNoteContent('');
    setIsSupplementary(false);
  };

  return (
    <div className="animate-fade-in-up">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-serif-cn font-bold text-gray-800 mb-2">
              {point.canonicalName}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>创建于 {formatDateTime(point.createdAt)}</span>
              <span>更新于 {formatDateTime(point.updatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasOffset && (
              <span className="offset-pulse flex items-center gap-1 bg-orange-100 text-orange-600 text-xs px-3 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                存在坐标偏移
              </span>
            )}
            <StatusBadge status={point.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {point.status === 'pending' && (
            <>
              <button onClick={() => confirmPoint(point.id)} className="btn-primary flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                确认归并
              </button>
              <button onClick={() => markOnsite(point.id)} className="btn-secondary flex items-center gap-2">
                <MapPinOff className="w-4 h-4" />
                标记待现场
              </button>
              <button onClick={() => markConflict(point.id)} className="btn-danger flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                标记冲突
              </button>
            </>
          )}
          {point.status !== 'pending' && (
            <button onClick={() => withdrawStatus(point.id)} className="btn-danger flex items-center gap-2">
              <Undo2 className="w-4 h-4" />
              撤回操作
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-4">
              <div className="flex gap-0">
                <button
                  onClick={() => setActiveTab('coordinates')}
                  className={`tab-btn ${activeTab === 'coordinates' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                >
                  坐标对比 ({rawPointsForPoint.length})
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`tab-btn ${activeTab === 'raw' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                >
                  原始数据
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`tab-btn ${activeTab === 'notes' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                >
                  备注 ({point.notes.length})
                </button>
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'coordinates' && (
                <div className="space-y-4">
                  {rawPointsForPoint.map((rp) => (
                    <CoordinateDisplay
                      key={rp.id}
                      rawPoint={rp}
                      canonicalLat={point.canonicalLat}
                      canonicalLng={point.canonicalLng}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="space-y-6">
                  {rawPointsForPoint.map((rp) => (
                    <div key={rp.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <RawDataDisplay rawPoint={rp} />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  {point.notes.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      {point.notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 rounded border ${
                            note.isSupplementary
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {note.isSupplementary && (
                              <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded">
                                后补备注
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatDateTime(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm mb-6">
                      暂无备注
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-start gap-3">
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="添加备注..."
                        className="input-field flex-1 resize-none h-20 text-sm"
                      />
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSupplementary}
                            onChange={(e) => setIsSupplementary(e.target.checked)}
                            className="rounded"
                          />
                          后补备注
                        </label>
                        <button
                          onClick={handleAddNote}
                          disabled={!noteContent.trim()}
                          className="btn-primary flex items-center gap-1 py-2"
                        >
                          <Send className="w-3 h-3" />
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-serif-cn font-semibold text-gray-700 mb-3">
              点位信息
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">规范坐标</span>
                <span className="font-mono-data text-gray-700">
                  {point.canonicalLat.toFixed(6)}, {point.canonicalLng.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">关联原始数据</span>
                <span className="text-gray-700">{rawPointsForPoint.length} 条</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">数据来源</span>
                <span className="text-gray-700">
                  {new Set(rawPointsForPoint.map(rp => rp.source)).size} 个来源
                </span>
              </div>
              {point.hasSupplementaryNote && (
                <div className="flex justify-between">
                  <span className="text-amber-600">后补备注</span>
                  <span className="text-amber-600">有</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-serif-cn font-semibold text-gray-700 mb-3">
              归并的原始名称
            </h3>
            <div className="space-y-2">
              {rawPointsForPoint.map((rp) => (
                <div
                  key={rp.id}
                  className={`flex items-center justify-between text-sm p-2 rounded ${
                    rp.isOffset ? 'bg-orange-50' : 'bg-gray-50'
                  }`}
                >
                  <span className={`${rp.isOffset ? 'line-through text-orange-600' : 'text-gray-700'}`}>
                    {rp.rawName}
                  </span>
                  <span className="text-xs text-gray-400">
                    第 {rp.sourceLine} 行
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-city-blue-50 rounded-lg border border-city-blue-200 p-4">
            <div className="text-xs text-city-blue-600 space-y-1">
              <p>💡 <strong>原始数据永不修改</strong></p>
              <p>所有原始数据完整保留，包括不规范的名称和偏移的坐标。归并操作仅作用于规范名称和坐标，原始数据始终可追溯。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
