import { useParams, useNavigate } from 'react-router-dom';
import { cases } from '@/data/cases';
import { useGameStore } from '@/store/useGameStore';
import Timeline from '@/components/Timeline';
import {
  getMainIssueLabel,
  getSeverityLabel,
  getSeverityColor,
  getErrorFlagLabel,
} from '@/utils/scoringEngine';
import { getCategoryLabel, getSourceTypeLabel } from '@/utils/evidenceValidator';
import {
  ArrowLeft,
  RotateCcw,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Link2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
} from 'lucide-react';
import { useState } from 'react';

export default function ReviewPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const caseData = cases.find((c) => c.id === caseId);

  const { score, userConclusion, clues, evidenceLinks, operationHistory } = useGameStore();
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  if (!caseData || !score || !userConclusion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">尚未完成案件调查</p>
      </div>
    );
  }

  const linkTriggerOps = operationHistory.filter((op) => op.type === 'CREATE_LINK');
  const conclusionOps = operationHistory.filter((op) => op.type === 'SUBMIT_CONCLUSION');

  const selectedOp = selectedOpId
    ? operationHistory.find((o) => o.id === selectedOpId)
    : null;

  const selectedLink = selectedOp?.linkId
    ? evidenceLinks.find((l) => l.id === selectedOp.linkId)
    : null;

  const selectedLinkFromClue = selectedLink
    ? clues.find((c) => c.id === selectedLink.fromClueId)
    : null;
  const selectedLinkToClue = selectedLink
    ? clues.find((c) => c.id === selectedLink.toClueId)
    : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/case/${caseId}/report`)}
              className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-sm font-medium text-slate-200">{caseData.title} - 案件回顾</h1>
              <p className="text-[10px] text-slate-500">查看操作历史和分数影响</p>
            </div>
          </div>
          <button
            onClick={() => {
              useGameStore.getState().resetGame();
              navigate('/');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
          >
            <RotateCcw size={14} />
            返回大厅
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={16} className="text-amber-400" />
              <span className="text-xs font-medium text-slate-300">线索关联触发</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{linkTriggerOps.length}</p>
            <p className="text-[10px] text-slate-500 mt-1">
              你建立了 {linkTriggerOps.length} 条线索关联
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">正确关联</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {evidenceLinks.filter((l) => l.isValid).length}/{evidenceLinks.length}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              正确率{' '}
              {evidenceLinks.length > 0
                ? Math.round(
                    (evidenceLinks.filter((l) => l.isValid).length / evidenceLinks.length) * 100
                  )
                : 0}
              %
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-blue-400" />
              <span className="text-xs font-medium text-slate-300">用时</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {operationHistory.length > 1
                ? Math.round(
                    (operationHistory[operationHistory.length - 1].timestamp -
                      operationHistory[0].timestamp) /
                      60000
                  )
                : 0}
              分钟
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              预计 {caseData.estimatedTime} 分钟
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-400" />
            线索关联触发点分析
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            以下是你在哪一步触发了线索关联，以及每条关联对分数的影响
          </p>

          <div className="space-y-3">
            {linkTriggerOps.map((op) => {
              const link = evidenceLinks.find((l) => l.id === op.linkId);
              if (!link) return null;
              const fromClue = clues.find((c) => c.id === link.fromClueId);
              const toClue = clues.find((c) => c.id === link.toClueId);
              const isSelected = selectedOpId === op.id;

              return (
                <button
                  key={op.id}
                  onClick={() => setSelectedOpId(isSelected ? null : op.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    link.isValid
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-red-500/30 bg-red-950/10'
                  } ${isSelected ? 'ring-2 ring-amber-400/30' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(op.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                      {link.isValid ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${
                        op.scoreImpact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {op.scoreImpact > 0 ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      {op.scoreImpact > 0 ? '+' : ''}
                      {op.scoreImpact} 分
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    {fromClue && (
                      <span className="text-xs text-slate-300">
                        [{getCategoryLabel(fromClue.category)}] {fromClue.content.slice(0, 25)}...
                      </span>
                    )}
                    <span className="text-slate-500">→</span>
                    {toClue && (
                      <span className="text-xs text-slate-300">
                        [{getCategoryLabel(toClue.category)}] {toClue.content.slice(0, 25)}...
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-2">
                      <div>
                        <p className="text-[10px] text-amber-400 font-medium mb-1">完整线索内容</p>
                        {fromClue && (
                          <p className="text-xs text-slate-400">
                            <span className="text-amber-300">线索A:</span> {fromClue.content}
                          </p>
                        )}
                        {toClue && (
                          <p className="text-xs text-slate-400">
                            <span className="text-amber-300">线索B:</span> {toClue.content}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-400 font-medium mb-1">来源追溯</p>
                        {fromClue && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <FileText size={10} />
                            线索A来源: {getSourceTypeLabel(fromClue.sourceType)} ({fromClue.sourceId})
                          </p>
                        )}
                        {toClue && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <FileText size={10} />
                            线索B来源: {getSourceTypeLabel(toClue.sourceType)} ({toClue.sourceId})
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-400 font-medium mb-1">分数影响原因</p>
                        <p className="text-xs text-slate-400">
                          {link.isValid
                            ? '此关联与正确证据链匹配，获得 +8 分。正确的线索关联有助于构建完整证据链。'
                            : '此关联不在正确证据链中，扣除 5 分。建议检查线索之间的逻辑关系是否成立。'}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-400" />
            合同判定对分数的影响
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            以下分析你的结论判定如何影响了最终分数
          </p>

          <div className="space-y-2">
            {score.conclusionDetails.impacts.map((impact, i) => {
              const labels = ['主要问题判定', '严重程度判定', '建议措施判定'];
              const corrects = [
                score.conclusionDetails.mainIssueCorrect,
                score.conclusionDetails.severityCorrect,
                score.conclusionDetails.actionCorrect,
              ];

              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${
                    corrects[i]
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-red-500/30 bg-red-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {corrects[i] ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                      <span className="text-xs text-slate-300">{labels[i]}</span>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        impact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {impact > 0 ? '+' : ''}
                      {impact} 分
                    </span>
                  </div>
                  {!corrects[i] && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {i === 0 &&
                        `你判定为"${getMainIssueLabel(userConclusion.mainIssue)}"，正确答案是"${getMainIssueLabel(caseData.correctConclusion.mainIssue)}"`}
                      {i === 1 &&
                        `你判定严重程度为"${getSeverityLabel(userConclusion.severity)}"，正确答案为"${getSeverityLabel(caseData.correctConclusion.severity)}"`}
                      {i === 2 && '你的建议措施不够完整，未包含关键行动项'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-200 mb-3">完整操作时间线</h2>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-4">
            <Timeline history={operationHistory} clues={clues} links={evidenceLinks} />
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center pt-4">
          <button
            onClick={() => navigate(`/case/${caseId}/report`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            <FileText size={16} />
            返回报告
          </button>
          <button
            onClick={() => {
              useGameStore.getState().resetGame();
              navigate('/');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
          >
            <RotateCcw size={16} />
            返回案件大厅
          </button>
        </div>
      </main>
    </div>
  );
}
