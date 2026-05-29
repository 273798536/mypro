import { useParams, useNavigate } from 'react-router-dom';
import { cases } from '@/data/cases';
import { useGameStore } from '@/store/useGameStore';
import ScoreRing from '@/components/ScoreRing';
import {
  getMainIssueLabel,
  getSeverityLabel,
  getSeverityColor,
  getErrorFlagLabel,
} from '@/utils/scoringEngine';
import {
  getCategoryLabel,
  getSourceTypeLabel,
  getCategoryColor,
} from '@/utils/evidenceValidator';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  RotateCcw,
  Link2,
  Filter,
} from 'lucide-react';
import { useState } from 'react';
import type { ErrorFlag } from '@/types';

export default function ReportPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const caseData = cases.find((c) => c.id === caseId);

  const { score, userConclusion, clues, evidenceLinks, operationHistory } = useGameStore();

  const [errorFilter, setErrorFilter] = useState<ErrorFlag | 'ALL'>('ALL');
  const [traceSource, setTraceSource] = useState<string | null>(null);

  if (!caseData || !score || !userConclusion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">尚未完成案件调查</p>
      </div>
    );
  }

  const filteredLinks = evidenceLinks.filter((link) => {
    if (errorFilter === 'ALL') return true;
    const fromClue = clues.find((c) => c.id === link.fromClueId);
    const toClue = clues.find((c) => c.id === link.toClueId);

    const matchesFlag = (clue: typeof fromClue, flag: ErrorFlag) => {
      if (!clue) return false;
      if (flag === 'SAMPLE_UNDECLARED')
        return clue.category === 'SAMPLE' || clue.category === 'UNDECLARED';
      if (flag === 'BGM_EXPIRED') return clue.category === 'EXPIRED' || clue.category === 'BGM';
      if (flag === 'NAME_CONFLICT') return clue.category === 'NAME_CONFLICT';
      return false;
    };

    return matchesFlag(fromClue, errorFilter) || matchesFlag(toClue, errorFilter);
  });

  const traceInfo = traceSource
    ? (() => {
        const link = evidenceLinks.find((l) => l.id === traceSource);
        if (!link) return null;
        const fromClue = clues.find((c) => c.id === link.fromClueId);
        const toClue = clues.find((c) => c.id === link.toClueId);
        return {
          link,
          fromClue,
          toClue,
          fromSource: fromClue
            ? `${getSourceTypeLabel(fromClue.sourceType)}: ${fromClue.sourceId}`
            : '',
          toSource: toClue
            ? `${getSourceTypeLabel(toClue.sourceType)}: ${toClue.sourceId}`
            : '',
        };
      })()
    : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/case/${caseId}`)}
              className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-sm font-medium text-slate-200">{caseData.title} - 判定报告</h1>
              <p className="text-[10px] text-slate-500">每条结论可追溯到来源材料</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/case/${caseId}/review`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
          >
            <Eye size={14} />
            案件回顾
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreRing score={score.total} size={140} label="总分" />
          <div className="flex-1 space-y-3 w-full">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <p className="text-xs text-slate-400 mb-1">证据链评分</p>
                <p className="text-2xl font-bold text-amber-400">{score.evidenceChainScore}</p>
                <p className="text-[10px] text-slate-500 mt-1">满分 40 分</p>
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                <p className="text-xs text-slate-400 mb-1">结论准确性</p>
                <p className="text-2xl font-bold text-blue-400">{score.conclusionAccuracy}</p>
                <p className="text-[10px] text-slate-500 mt-1">满分 60 分</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400 mb-2">你的判定</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-300">
                  {getMainIssueLabel(userConclusion.mainIssue)}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(userConclusion.severity)}`}>
                  严重程度: {getSeverityLabel(userConclusion.severity)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{userConclusion.recommendedAction}</p>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400 mb-2">正确判定</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300">
                  {getMainIssueLabel(caseData.correctConclusion.mainIssue)}
                </span>
                <span className="px-2 py-1 rounded text-xs text-emerald-400">
                  严重程度: {getSeverityLabel(caseData.correctConclusion.severity)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{caseData.correctConclusion.recommendedAction}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              错误类型判定
            </h2>
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-slate-500" />
              <select
                value={errorFilter}
                onChange={(e) => setErrorFilter(e.target.value as ErrorFlag | 'ALL')}
                className="px-2 py-1 rounded text-xs bg-slate-800 border border-slate-700/50 text-slate-300"
              >
                <option value="ALL">全部类型</option>
                <option value="SAMPLE_UNDECLARED">采样未申报</option>
                <option value="BGM_EXPIRED">授权过期</option>
                <option value="NAME_CONFLICT">同名歌曲误判</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {(
              [
                { flag: 'SAMPLE_UNDECLARED' as ErrorFlag, data: score.errorBreakdown.SAMPLE_UNDECLARED },
                { flag: 'BGM_EXPIRED' as ErrorFlag, data: score.errorBreakdown.BGM_EXPIRED },
                { flag: 'NAME_CONFLICT' as ErrorFlag, data: score.errorBreakdown.NAME_CONFLICT },
              ] as const
            )
              .filter(({ flag }) => errorFilter === 'ALL' || errorFilter === flag)
              .map(({ flag, data }) => (
                <div
                  key={flag}
                  className={`rounded-xl border p-4 ${
                    data.correct
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : data.found
                      ? 'border-orange-500/30 bg-orange-950/10'
                      : 'border-red-500/30 bg-red-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {data.correct ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <XCircle size={16} className={data.found ? 'text-orange-400' : 'text-red-400'} />
                      )}
                      <span className="text-sm font-medium text-slate-200">
                        {getErrorFlagLabel(flag)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        data.correct
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : data.found
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {data.correct ? '判定正确' : data.found ? '判定有误' : '未识别'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{data.detail}</p>
                </div>
              ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <Link2 size={16} className="text-emerald-400" />
              证据关联详情
              <span className="text-xs text-slate-500 font-normal">（点击追溯来源）</span>
            </h2>
          </div>

          <div className="space-y-2">
            {(errorFilter === 'ALL' ? evidenceLinks : filteredLinks).map((link) => {
              const fromClue = clues.find((c) => c.id === link.fromClueId);
              const toClue = clues.find((c) => c.id === link.toClueId);

              return (
                <button
                  key={link.id}
                  onClick={() => setTraceSource(traceSource === link.id ? null : link.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    link.isValid
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-red-500/30 bg-red-950/10'
                  } ${traceSource === link.id ? 'ring-2 ring-amber-400/30' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {fromClue && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${getCategoryColor(
                          fromClue.category
                        )}`}
                      >
                        {getCategoryLabel(fromClue.category)}
                      </span>
                    )}
                    <span className="text-slate-500">→</span>
                    {toClue && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${getCategoryColor(
                          toClue.category
                        )}`}
                      >
                        {getCategoryLabel(toClue.category)}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ml-auto ${
                        link.isValid
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {link.isValid ? `+${link.scoreImpact}` : link.scoreImpact} 分
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    {fromClue?.content} ↔ {toClue?.content}
                  </p>

                  {traceSource === link.id && (
                    <div className="mt-2 pt-2 border-t border-slate-700/30 space-y-1">
                      <p className="text-[10px] text-amber-400 font-medium">来源追溯:</p>
                      {link.sourceTrace.map((src, i) => (
                        <p key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
                          <FileText size={10} />
                          {src}
                        </p>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center pt-4">
          <button
            onClick={() => navigate(`/case/${caseId}/review`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            <Eye size={16} />
            查看案件回顾
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
