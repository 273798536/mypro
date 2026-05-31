import { useState } from 'react';
import { Plus, Clock, CheckCircle, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { cn } from '../lib/utils';

export function Segments() {
  const { trackSegments, updateSegment, addSegment, currentConcertId, feedbacks } = useFeedbackStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSegment, setNewSegment] = useState({ name: '', startTime: 0, endTime: 0 });

  const getFeedbackCount = (segmentId: string) => {
    return feedbacks.filter(f => f.segmentId === segmentId).length;
  };

  const handleSaveEdit = (id: string) => {
    updateSegment(id, { name: editName });
    setEditingId(null);
  };

  const handleAddSegment = () => {
    if (newSegment.name.trim()) {
      addSegment({
        concertId: currentConcertId,
        name: newSegment.name,
        startTime: newSegment.startTime,
        endTime: newSegment.endTime,
        status: 'pending',
      });
      setNewSegment({ name: '', startTime: 0, endTime: 0 });
      setShowAddForm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">曲目段落管理</h1>
          <p className="text-slate-500 mt-1">管理演唱会的曲目段落，支持延迟补录</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          添加段落
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">总段落数</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{trackSegments.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">已确认</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {trackSegments.filter(s => s.status === 'confirmed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">待确认</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {trackSegments.filter(s => s.status === 'pending').length}
          </p>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">添加新段落</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">段落名称</label>
              <input
                type="text"
                value={newSegment.name}
                onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="如：第一首歌"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">开始时间 (秒)</label>
              <input
                type="number"
                value={newSegment.startTime}
                onChange={(e) => setNewSegment({ ...newSegment, startTime: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">结束时间 (秒)</label>
              <input
                type="number"
                value={newSegment.endTime}
                onChange={(e) => setNewSegment({ ...newSegment, endTime: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAddSegment}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">段落列表</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {trackSegments.map((segment, index) => (
            <div
              key={segment.id}
              className={cn(
                'p-5 hover:bg-slate-50 transition-colors',
                segment.status === 'pending' && 'bg-yellow-50/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="font-semibold text-slate-600">{index + 1}</span>
                  </div>
                  <div>
                    {editingId === segment.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(segment.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-500 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-800">{segment.name}</h3>
                        <button
                          onClick={() => {
                            setEditingId(segment.id);
                            setEditName(segment.name);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {getFeedbackCount(segment.id)} 条反馈
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {segment.status === 'confirmed' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3" />
                      已确认
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      <AlertCircle className="w-3 h-3" />
                      待确认
                    </span>
                  )}
                  <button
                    onClick={() => updateSegment(segment.id, { 
                      status: segment.status === 'confirmed' ? 'pending' : 'confirmed' 
                    })}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {segment.status === 'confirmed' ? '标记待确认' : '确认段落'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
