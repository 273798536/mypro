import { useState } from 'react';
import type { Sample } from '@/types';
import { useReviewStore } from '@/store/useReviewStore';
import {
  Edit3,
  Check,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  Lightbulb,
  Send,
  History,
  ChevronRight,
} from 'lucide-react';
import { getLeakGuidance, generateVerdictExplanation } from '@/utils/analysis';
import { relativeTime } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

interface ActionPanelProps {
  sample: Sample;
}

export function ActionPanel({ sample }: ActionPanelProps) {
  const { session, toggleBoundary, addNote, updateAttribute, confirmReview } =
    useReviewStore();
  const navigate = useNavigate();
  const [noteText, setNoteText] = useState('');
  const [authorName, setAuthorName] = useState('小乔');

  const leakGuidance = getLeakGuidance(sample.leakRisk);
  const explanation = generateVerdictExplanation(
    sample,
    session.modelVersions,
    session.history,
  );

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote(sample.id, noteText.trim(), authorName);
    setNoteText('');
  };

  const handleToggleBoundary = () => {
    toggleBoundary(sample.id, authorName);
  };

  const handleConfirm = () => {
    confirmReview(sample.id, authorName);
  };

  return (
    <div className="h-full flex flex-col bg-midnight/30">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-200">复核操作</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              快速操作
            </div>

            <button
              onClick={handleToggleBoundary}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                sample.isBoundary
                  ? 'bg-amber-warn/15 border-amber-warn/40 text-amber-warn'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600/50'
              }`}
            >
              <AlertTriangle size={18} />
              <span className="flex-1 text-left">
                {sample.isBoundary ? '取消边界标记' : '标记为边界样本'}
              </span>
              {sample.isBoundary && <Check size={16} />}
            </button>

            <button
              onClick={handleConfirm}
              disabled={sample.reviewStatus === 'confirmed'}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              <span>确认复核结果</span>
            </button>
          </div>

          <div className="h-px bg-slate-700/50" />

          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              人工改判
            </div>

            <div className="space-y-2">
              {Object.entries(sample.attributes).map(([attrName, attr]) => (
                <AttributeEditor
                  key={attrName}
                  sampleId={sample.id}
                  attributeName={attrName}
                  attribute={attr}
                  operator={authorName}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-700/50" />

          <div className="space-y-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              改判解释
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-amber-warn mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  {explanation.summary}
                </p>
              </div>
              <div className="mt-3 space-y-1.5">
                {explanation.factors.slice(0, 3).map((factor, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-400">{factor.description}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-accent rounded-full"
                          style={{ width: `${factor.weight}%` }}
                        />
                      </div>
                      <span className="text-slate-500 w-8 text-right">
                        {factor.weight}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sample.leakRisk !== 'none' && (
            <>
              <div className="h-px bg-slate-700/50" />

              <div className="space-y-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert
                    size={14}
                    className={
                      leakGuidance.severity === 'danger'
                        ? 'text-rose-alert'
                        : leakGuidance.severity === 'warning'
                        ? 'text-amber-warn'
                        : 'text-cyan-accent'
                    }
                  />
                  {leakGuidance.title}
                </div>
                <div
                  className={`p-3 rounded-lg border ${
                    leakGuidance.severity === 'danger'
                      ? 'bg-rose-alert/10 border-rose-alert/30'
                      : leakGuidance.severity === 'warning'
                      ? 'bg-amber-warn/10 border-amber-warn/30'
                      : 'bg-cyan-accent/10 border-cyan-accent/30'
                  }`}
                >
                  <p className="text-xs text-slate-300 font-medium mb-2">
                    处理步骤：
                  </p>
                  <ol className="space-y-1.5">
                    {leakGuidance.steps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-400"
                      >
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-slate-700/50" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                备注记录
              </div>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-cyan-accent hover:text-cyan-300 flex items-center gap-1"
              >
                <History size={12} />
                完整历史
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sample.notes.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  暂无备注
                </div>
              ) : (
                sample.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-cyan-accent">
                        {note.author}
                      </span>
                      <span className="text-slate-500">
                        {relativeTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="操作人"
                  className="w-20 px-2 py-1.5 text-xs bg-slate-800/50 border border-slate-700/50 rounded text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-accent/50"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder="添加备注..."
                    className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-800/50 border border-slate-700/50 rounded text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-accent/50"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-cyan-accent hover:bg-cyan-accent/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributeEditor({
  sampleId,
  attributeName,
  attribute,
  operator,
}: {
  sampleId: string;
  attributeName: string;
  attribute: import('@/types').AttributeOutput;
  operator: string;
}) {
  const { updateAttribute } = useReviewStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    attribute.finalValue ||
      attribute.manualValue ||
      Object.values(attribute.versions)[0]?.value ||
      '',
  );

  const currentValue =
    attribute.finalValue ||
    attribute.manualValue ||
    Object.values(attribute.versions)[0]?.value ||
    '-';

  const handleSave = () => {
    updateAttribute(sampleId, attributeName, editValue, operator);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(currentValue === '-' ? '' : currentValue);
    setIsEditing(false);
  };

  return (
    <div className="p-2.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{attributeName}</span>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-slate-500 hover:text-cyan-accent rounded transition-colors"
          >
            <Edit3 size={12} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-2 py-1 text-sm bg-slate-900/50 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-cyan-accent/50"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-slate-500 hover:bg-slate-700 rounded"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="text-sm text-slate-200 font-medium">{currentValue}</div>
      )}

      {(attribute.finalValue || attribute.manualValue) && !isEditing && (
        <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
          <Check size={10} />
          人工判定
        </div>
      )}
    </div>
  );
}
