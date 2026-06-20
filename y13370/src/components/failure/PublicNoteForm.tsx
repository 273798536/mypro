import React, { useState } from 'react';
import { X, ArrowRight, FileWarning, Users } from 'lucide-react';
import { useFailureStore } from '@/stores/failureStore';
import type { FailureGroup } from '@/types';

interface Props {
  open: boolean;
  group: FailureGroup | null;
  onClose: () => void;
}

export const PublicNoteForm: React.FC<Props> = ({ open, group, onClose }) => {
  const addNote = useFailureStore(s => s.addPublicNote);
  const addCorrection = useFailureStore(s => s.addCorrection);
  const updateStatus = useFailureStore(s => s.updateGroupStatus);

  const [step, setStep] = useState<'correction' | 'note'>('correction');
  const [original, setOriginal] = useState('');
  const [newJudge, setNewJudge] = useState('');
  const [reason, setReason] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [changedList, setChangedList] = useState('');

  const handleSubmit = () => {
    if (!group) return;
    if (step === 'correction') {
      if (original && newJudge) {
        addCorrection({
          groupId: group.id,
          operator: '阿岑',
          originalJudgment: original,
          newJudgment: newJudge,
          reason
        });
        setStep('note');
      }
    } else {
      if (noteContent) {
        const judgments = changedList.split('\n').map(s => s.trim()).filter(Boolean);
        addNote({
          groupId: group.id,
          content: noteContent,
          changedJudgments: judgments,
          operator: '阿岑'
        });
        updateStatus(group.id, 'noted');
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setStep('correction');
    setOriginal('');
    setNewJudge('');
    setReason('');
    setNoteContent('');
    setChangedList('');
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      >
        <div
          className={`w-full max-w-2xl rounded-2xl bg-surface border border-border-emphasis shadow-2xl overflow-hidden transition-transform duration-300 ${
            open ? 'scale-100' : 'scale-95'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <header className="px-6 py-4 border-b border-border-default bg-gradient-to-r from-amber/10 via-transparent to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber/20 border border-amber/40 flex items-center justify-center">
                <FileWarning className="w-4 h-4 text-amber" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-primary">
                  {step === 'correction' ? '人工修正锚点' : '社区公示备注 · 判断变更记录'}
                </h3>
                <div className="text-[11px] text-muted mt-0.5">
                  {group?.title} · 归属分组 {group?.id}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-elevated border border-border-default flex items-center justify-center text-secondary hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/50">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 'correction' ? 'bg-amber text-black' : 'bg-emerald/30 text-emerald'}`}>1</div>
              <span className={`text-[12px] ${step === 'correction' ? 'text-primary font-semibold' : 'text-muted'}`}>人工修正（原判断 → 新判断）</span>
              <div className="w-8 h-px bg-border-emphasis mx-1" />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 'note' ? 'bg-amber text-black' : 'bg-elevated text-muted'}`}>2</div>
              <span className={`text-[12px] ${step === 'note' ? 'text-primary font-semibold' : 'text-muted'}`}>公示备注（说明改变了哪些判断）</span>
            </div>

            {step === 'correction' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                      <Users className="w-3 h-3" /> 原判断
                    </label>
                    <textarea
                      rows={4}
                      value={original}
                      onChange={e => setOriginal(e.target.value)}
                      placeholder="例如：缺失特征直接丢弃该样本批次..."
                      className="w-full rounded-lg bg-root border border-border-default p-3 text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-danger resize-none"
                    />
                  </div>
                  <div className="relative">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                      <ArrowRight className="w-3 h-3 text-amber" /> 新判断
                    </label>
                    <textarea
                      rows={4}
                      value={newJudge}
                      onChange={e => setNewJudge(e.target.value)}
                      placeholder="例如：采用上一小时特征均值填充后继续训练..."
                      className="w-full rounded-lg bg-root border border-amber/40 p-3 text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-amber resize-none"
                    />
                    <div className="absolute left-1/2 -top-6 -translate-x-1/2 w-7 h-7 rounded-full bg-amber text-black flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">修正原因（供后续追溯）</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="说明做出该修正判断的背景和依据..."
                    className="w-full rounded-lg bg-root border border-border-default p-3 text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-emphasis resize-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">公示备注内容</label>
                  <textarea
                    rows={3}
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    placeholder="社区公示前将对外展示的补充说明..."
                    className="w-full rounded-lg bg-root border border-border-default p-3 text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-amber resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                    此备注改变的判断结论（每行一条，将单独拎出对外说明）
                  </label>
                  <textarea
                    rows={4}
                    value={changedList}
                    onChange={e => setChangedList(e.target.value)}
                    placeholder={[
                      '精度结论：v2.4.1 离线 AUC 0.956 中，约 0.004 来源于填充特征贡献，已单独标注',
                      '发布节奏：由"无风险全量"调整为"灰度 10% 观察 12h"'
                    ].join('\n')}
                    className="w-full rounded-lg bg-root border border-border-default p-3 text-[12px] font-mono text-primary placeholder:text-muted/60 focus:outline-none focus:border-amber resize-none"
                  />
                </div>
              </>
            )}
          </div>

          <footer className="px-6 py-4 border-t border-border-default bg-elevated/30 flex items-center justify-between">
            <div className="text-[10px] text-muted font-mono">操作人：阿岑 · 平台算法部</div>
            <div className="flex items-center gap-2">
              <button onClick={handleClose} className="btn-operate">取消</button>
              <button
                onClick={handleSubmit}
                disabled={step === 'correction' ? !(original && newJudge) : !noteContent}
                className="btn-operate btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 'correction' ? '提交修正 → 下一步' : '提交公示备注并同步时间线'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};
