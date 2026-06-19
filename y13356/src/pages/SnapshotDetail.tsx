import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSnapshotStore } from '@/store/snapshotStore';
import { getStepsBySnapshotId } from '@/data/steps';
import StepTimeline from '@/components/StepTimeline';
import { NoteList } from '@/components/NoteBubble';
import { StatusBadge, JudgmentBadge, GrayErrorBadge } from '@/components/StatusBadge';
import { exportSnapshotDetailToCsv } from '@/utils/csv';
import { formatDateTime } from '@/utils/date';
import type { JudgmentResult } from '@/types';
import {
  ArrowLeft,
  Download,
  Plus,
  Send,
  CheckCircle,
  AlertTriangle,
  Layers,
  User,
  Clock,
  MessageSquare,
  Gavel,
} from 'lucide-react';

const SnapshotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { snapshots, notes, judgments, addNote, setJudgment, toggleGrayError } = useSnapshotStore();

  const snapshot = snapshots.find((s) => s.id === id);
  const steps = getStepsBySnapshotId(id || '');
  const snapshotNotes = notes[id || ''] || [];
  const stepNotes = snapshotNotes.filter((n) => n.stepId);
  const globalNotes = snapshotNotes.filter((n) => !n.stepId);
  const judgment = judgments[id || '']?.[0] || null;

  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const [showJudgment, setShowJudgment] = useState(false);
  const [judgmentResult, setJudgmentResult] = useState<JudgmentResult>('need_supplement');
  const [judgmentComment, setJudgmentComment] = useState('');

  if (!snapshot) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">快照不存在</p>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    addNote(id!, {
      snapshotId: id!,
      stepId: selectedStepId || undefined,
      content: newNoteContent,
      createdBy: '小林',
    });

    setNewNoteContent('');
    setShowAddNote(false);
    setSelectedStepId(null);
  };

  const handleSetJudgment = () => {
    if (!judgmentComment.trim()) return;

    setJudgment(id!, {
      snapshotId: id!,
      modelVersion: snapshot.modelVersion,
      result: judgmentResult,
      comment: judgmentComment,
      judgedBy: '李主管',
    });

    setShowJudgment(false);
    setJudgmentComment('');
  };

  const handleExport = () => {
    exportSnapshotDetailToCsv(snapshot, steps, snapshotNotes);
  };

  const renderStepNotes = (stepId: string) => {
    const notesForStep = stepNotes.filter((n) => n.stepId === stepId);
    if (notesForStep.length === 0) {
      return null;
    }
    return (
      <div className="mt-4 pt-3 border-t border-slate-200">
        <h6 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" />
          步骤备注 ({notesForStep.length})
        </h6>
        <div className="space-y-2">
          {notesForStep.map((note) => (
            <div key={note.id} className="text-xs bg-white rounded-lg p-2 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-700">{note.createdBy}</span>
                <span className="text-slate-400">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="text-slate-600">{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{snapshot.name}</h1>
              {snapshot.hasGrayError && <GrayErrorBadge hasError={true} />}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              模型版本 {snapshot.modelVersion} · {snapshot.createdBy} 创建于{' '}
              {formatDateTime(snapshot.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={snapshot.status} />
          <button
            onClick={() => toggleGrayError(id!)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              snapshot.hasGrayError
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {snapshot.hasGrayError ? '取消灰度错误' : '标记灰度错误'}
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
          >
            <Download className="w-4 h-4" />
            导出明细
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  训练步骤时间线
                </h2>
                <span className="text-sm text-slate-500">
                  共 {steps.length} 步，{snapshot.changeCount} 处变化
                </span>
              </div>
            </div>
            <div className="p-4">
              <StepTimeline steps={steps} showStepNotes={renderStepNotes} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  后补备注
                </h2>
                <button
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加备注
                </button>
              </div>
            </div>
            <div className="p-5">
              {showAddNote && (
                <div className="mb-5 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      备注位置
                    </label>
                    <select
                      value={selectedStepId || ''}
                      onChange={(e) => setSelectedStepId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">快照级备注（全局）</option>
                      {steps.map((step) => (
                        <option key={step.id} value={step.id}>
                          步骤 {step.stepIndex}: {step.stepName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      备注内容
                    </label>
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="请输入备注内容..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowAddNote(false);
                        setNewNoteContent('');
                        setSelectedStepId(null);
                      }}
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!newNoteContent.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      发布
                    </button>
                  </div>
                </div>
              )}

              <NoteList notes={globalNotes} emptyText="暂无全局备注，点击右上角添加" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                快照信息
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">状态</p>
                <StatusBadge status={snapshot.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">模型版本</p>
                <p className="text-sm font-medium text-slate-900">{snapshot.modelVersion}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">创建人</p>
                <p className="text-sm font-medium text-slate-900">{snapshot.createdBy}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">创建时间</p>
                <p className="text-sm text-slate-700">{formatDateTime(snapshot.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">步骤数</p>
                <p className="text-sm font-medium text-slate-900">{snapshot.stepCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">参数变化数</p>
                <p className="text-sm font-medium text-blue-600">{snapshot.changeCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">灰度比例</p>
                <p
                  className={`text-sm font-medium ${
                    snapshot.hasGrayError ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {snapshot.grayRatio || '-'}
                  {snapshot.hasGrayError && (
                    <span className="ml-2 text-xs text-red-500">（配置错误）</span>
                  )}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">备注</p>
                <p className="text-sm text-slate-700">{snapshot.remark}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-amber-600" />
                  人工判断
                </h2>
                <button
                  onClick={() => setShowJudgment(!showJudgment)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {judgment ? '更新' : '添加'}
                </button>
              </div>
            </div>
            <div className="p-5">
              {showJudgment ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      判断结果
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setJudgmentResult('pass')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          judgmentResult === 'pass'
                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                            : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 inline mr-1.5" />
                        放行
                      </button>
                      <button
                        onClick={() => setJudgmentResult('need_supplement')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          judgmentResult === 'need_supplement'
                            ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                            : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                        需补充
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      判断说明
                    </label>
                    <textarea
                      value={judgmentComment}
                      onChange={(e) => setJudgmentComment(e.target.value)}
                      placeholder="请输入判断说明..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowJudgment(false);
                        setJudgmentComment('');
                      }}
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSetJudgment}
                      disabled={!judgmentComment.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      确认
                    </button>
                  </div>
                </div>
              ) : judgment ? (
                <div>
                  <div className="mb-3">
                    <JudgmentBadge result={judgment.result} />
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{judgment.comment}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    {judgment.judgedBy}
                    <Clock className="w-3.5 h-3.5 ml-2" />
                    {formatDateTime(judgment.judgedAt)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      关联模型版本：{judgment.modelVersion}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      此判断独立于快照版本，模型更换后旧判断保留
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  <Gavel className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无人工判断</p>
                  <p className="text-xs mt-1">负责人可添加审核意见</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnapshotDetail;
