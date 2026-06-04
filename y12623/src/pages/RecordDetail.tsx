import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Truck, FileText, Calendar, User, Edit3, Plus, AlertCircle, Save, MessageSquare } from 'lucide-react';
import { recordApi } from '../api/client';
import { useStore } from '../store/useStore';
import type { RecordDetail as IRecordDetail } from '../../shared/types';
import { StatusBadge } from '../components/StatusBadge';
import { ScoreTimeline } from '../components/ScoreTimeline';
import { formatDate } from '../utils/format';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchRecords, fetchStats, fetchAnomalies } = useStore();
  const [record, setRecord] = useState<IRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreNote, setScoreNote] = useState('');
  const [reason, setReason] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadRecord();
    }
  }, [id]);

  const loadRecord = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recordApi.getRecordDetail(id!);
      setRecord(data);
      if (data.latestScore !== undefined) {
        setScore(data.latestScore);
      }
      if (data.latestScoreNote) {
        setScoreNote(data.latestScoreNote);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScore = async () => {
    if (!reason.trim()) {
      setError('请填写修正原因');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await recordApi.updateScore(id!, {
        score,
        scoreNote,
        reason,
        scorer: '当前用户',
      });
      await loadRecord();
      await fetchRecords();
      await fetchStats();
      await fetchAnomalies();
      setIsEditing(false);
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    try {
      await recordApi.addNote(id!, {
        content: noteContent,
        author: '当前用户',
      });
      setNoteContent('');
      await loadRecord();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
            <div className="card p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
              <div className="h-24 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="card p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-16 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium text-slate-700 mb-2">记录不存在</h3>
        <Link to="/" className="btn">返回主页</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="font-mono text-2xl font-semibold text-slate-900">
            {record.batchNo}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            月台 {record.platformNo} · {record.vehicleNo}
          </p>
        </div>
        <StatusBadge status={record.status} anomalyType={record.anomalyType} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="font-mono text-lg font-semibold text-slate-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">月台号</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{record.platformNo}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">车牌号</p>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{record.vehicleNo}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">来源</p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>{record.source}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">导入时间</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{formatDate(record.importTime)}</span>
                </div>
              </div>
              {record.isSupplement && (
                <div className="col-span-2 p-3 bg-industrial-50 rounded">
                  <p className="text-sm text-industrial-700">
                    <span className="font-medium">补录记录</span> · 原来源：{record.supplementFrom}
                  </p>
                </div>
              )}
              {!record.sketchImage && (
                <div className="col-span-2 p-3 bg-amber-50 rounded">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    草图素材缺失，请补充上传
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-lg font-semibold text-slate-900">评分历史</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-sm"
              >
                <Edit3 className="w-4 h-4" />
                修改评分
              </button>
            </div>

            {isEditing && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-medium text-slate-700 mb-4">修改评分</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">评分（0-100）</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input"
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">评分说明</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="例如：装载规范、需要改进等"
                      value={scoreNote}
                      onChange={(e) => setScoreNote(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">
                      修正原因 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="input min-h-[80px]"
                      placeholder="请详细说明修改评分的原因..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      修改评分必须填写原因，系统将自动记录历史版本
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveScore}
                      disabled={saving || !reason.trim()}
                      className="btn btn-primary"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? '保存中...' : '保存评分'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ScoreTimeline history={record.history} />
          </div>

          <div className="card p-6">
            <h2 className="font-mono text-lg font-semibold text-slate-900 mb-4">处理意见</h2>
            <div className="space-y-4 mb-4">
              {record.notes.length > 0 ? (
                record.notes.map((note) => (
                  <div key={note.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{note.author}</span>
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(note.createTime)}</span>
                    </div>
                    <p className="text-sm text-slate-600">{note.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">暂无处理意见</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="添加处理意见..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-mono text-lg font-semibold text-slate-900 mb-4">当前评分</h2>
            {record.latestScore !== undefined ? (
              <div className="text-center">
                <div className={`text-5xl font-mono font-bold mb-2 ${
                  record.latestScore >= 80 ? 'text-emerald-600' :
                  record.latestScore >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {record.latestScore}
                  <span className="text-2xl">分</span>
                </div>
                {record.latestScoreNote && (
                  <p className="text-sm text-slate-600 mb-2">{record.latestScoreNote}</p>
                )}
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <User className="w-4 h-4" />
                  <span>{record.scorer}</span>
                  <span>·</span>
                  <Calendar className="w-4 h-4" />
                  <span>{record.scoreTime ? formatDate(record.scoreTime) : '-'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-500">暂无评分</p>
                <button onClick={() => setIsEditing(true)} className="btn btn-sm mt-3">
                  <Edit3 className="w-4 h-4" />
                  立即评分
                </button>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              快捷操作
            </h3>
            <div className="space-y-2">
              <Link to="/anomalies" className="btn btn-sm w-full justify-start">
                <AlertCircle className="w-4 h-4" />
                查看其他异常
              </Link>
              <Link to="/export" className="btn btn-sm w-full justify-start">
                <FileText className="w-4 h-4" />
                导出复盘报告
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
