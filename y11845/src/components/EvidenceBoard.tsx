import { useGameStore } from '@/store/useGameStore';
import { getCategoryColor, getCategoryLabel, getSourceTypeLabel } from '@/utils/evidenceValidator';
import { Unlink, Trash2, ArrowRight } from 'lucide-react';

export default function EvidenceBoard() {
  const {
    clues,
    markedClueIds,
    evidenceLinks,
    selectedClueId,
    selectClue,
    createLink,
    deleteLink,
  } = useGameStore();

  const markedClues = clues.filter((c) => markedClueIds.includes(c.id));

  const handleClueClick = (clueId: string) => {
    if (!selectedClueId) {
      selectClue(clueId);
      return;
    }

    if (selectedClueId === clueId) {
      selectClue(null);
      return;
    }

    createLink(selectedClueId, clueId, '关联');
    selectClue(null);
  };

  const isLinked = (clueId: string) =>
    evidenceLinks.some((l) => l.fromClueId === clueId || l.toClueId === clueId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-slate-200">证据板</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            点击两个已钉选的线索建立关联 {selectedClueId && '（已选中第一个线索，请点击第二个）'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            已钉选: {markedClues.length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            已关联: {evidenceLinks.length}
          </span>
        </div>
      </div>

      {markedClues.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
              <Unlink size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">暂无钉选线索</p>
            <p className="text-xs text-slate-600 mt-1">在材料审阅区钉选线索后，它们会出现在这里</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-3">
          {evidenceLinks.length > 0 && (
            <div className="space-y-1.5 mb-3">
              <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <ArrowRight size={12} />
                已建立的关联
              </h4>
              {evidenceLinks.map((link) => {
                const from = clues.find((c) => c.id === link.fromClueId);
                const to = clues.find((c) => c.id === link.toClueId);
                return (
                  <div
                    key={link.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                      link.isValid
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : 'border-red-500/30 bg-red-950/10'
                    }`}
                  >
                    <span className={link.isValid ? 'text-emerald-300' : 'text-red-300'}>
                      {from ? getCategoryLabel(from.category) : '?'}
                    </span>
                    <ArrowRight size={12} className="text-slate-500" />
                    <span className={link.isValid ? 'text-emerald-300' : 'text-red-300'}>
                      {to ? getCategoryLabel(to.category) : '?'}
                    </span>
                    <span className="text-slate-500 truncate flex-1">
                      {from?.content.slice(0, 15)}... ↔ {to?.content.slice(0, 15)}...
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      link.isValid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {link.isValid ? `+${link.scoreImpact}` : link.scoreImpact}
                    </span>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <h4 className="text-xs font-medium text-slate-400">钉选的线索</h4>
          <div className="grid gap-2">
            {markedClues.map((clue) => (
              <button
                key={clue.id}
                onClick={() => handleClueClick(clue.id)}
                className={`text-left p-3 rounded-lg border transition-all duration-200 ${
                  selectedClueId === clue.id
                    ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-950/20'
                    : isLinked(clue.id)
                    ? 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50'
                    : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(
                          clue.category
                        )}`}
                      >
                        {getCategoryLabel(clue.category)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {getSourceTypeLabel(clue.sourceType)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{clue.content}</p>
                    {selectedClueId === clue.id && (
                      <p className="text-[10px] text-amber-400 mt-1">↑ 点击另一个线索建立关联</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
