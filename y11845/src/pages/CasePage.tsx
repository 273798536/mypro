import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cases } from '@/data/cases';
import { useGameStore } from '@/store/useGameStore';
import { SongClipCard, ContractCard, TakedownCard } from '@/components/MaterialCard';
import ClueCard from '@/components/ClueCard';
import EvidenceBoard from '@/components/EvidenceBoard';
import { getSourceTypeLabel } from '@/utils/evidenceValidator';
import {
  Music,
  FileText,
  AlertTriangle,
  LayoutDashboard,
  ArrowLeft,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import type { MainIssue, Severity, Conclusion } from '@/types';

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const caseData = cases.find((c) => c.id === caseId);

  const {
    clues,
    markedClueIds,
    evidenceLinks,
    activeTab,
    expandedMaterialId,
    markClue,
    unmarkClue,
    selectClue,
    selectedClueId,
    setActiveTab,
    setExpandedMaterialId,
    submitConclusion,
    isCompleted,
  } = useGameStore();

  const [showConclusionModal, setShowConclusionModal] = useState(false);
  const [conclusion, setConclusion] = useState<Conclusion>({
    mainIssue: 'COVER_OK',
    severity: 'LOW',
    recommendedAction: '',
  });

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">案件未找到</p>
      </div>
    );
  }

  const handleSourceTrace = (clueId: string) => {
    const clue = clues.find((c) => c.id === clueId);
    if (!clue) return;

    const sourceType = clue.sourceType;
    if (sourceType === 'SONG_CLIP') setActiveTab('songs');
    else if (sourceType === 'CONTRACT') setActiveTab('contracts');
    else setActiveTab('takedowns');

    setExpandedMaterialId(clue.sourceId);
  };

  const handleSubmitConclusion = () => {
    submitConclusion(conclusion);
    setShowConclusionModal(false);
    navigate(`/case/${caseId}/report`);
  };

  const tabs = [
    { key: 'songs' as const, label: '歌曲片段', icon: Music, count: caseData.materials.songClips.length },
    { key: 'contracts' as const, label: '授权合同', icon: FileText, count: caseData.materials.contracts.length },
    { key: 'takedowns' as const, label: '下架单', icon: AlertTriangle, count: caseData.materials.takedownNotices.length },
    { key: 'board' as const, label: '证据板', icon: LayoutDashboard, count: evidenceLinks.length },
  ];

  const cluesForMaterial = (materialId: string) =>
    clues.filter((c) => c.sourceId === materialId);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-sm font-medium text-slate-200">{caseData.title}</h1>
              <p className="text-[10px] text-slate-500">案件调查中</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                线索: {markedClueIds.length}/{clues.length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                关联: {evidenceLinks.length}
              </span>
            </div>

            {!isCompleted && (
              <button
                onClick={() => setShowConclusionModal(true)}
                disabled={markedClueIds.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={14} />
                提交结论
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-slate-800/80 text-amber-300 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeTab === tab.key ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/50 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'songs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-300">歌曲片段材料</h2>
              <p className="text-xs text-slate-500">点击展开详情，查看隐藏线索</p>
            </div>
            {caseData.materials.songClips.map((clip) => (
              <div key={clip.id}>
                <SongClipCard
                  clip={clip}
                  isExpanded={expandedMaterialId === clip.id}
                  onToggle={() =>
                    setExpandedMaterialId(expandedMaterialId === clip.id ? null : clip.id)
                  }
                />
                {expandedMaterialId === clip.id && cluesForMaterial(clip.id).length > 0 && (
                  <div className="mt-2 ml-4 space-y-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertOctagon size={12} />
                      从此材料中可提取的线索:
                    </p>
                    {cluesForMaterial(clip.id).map((clue) => (
                      <ClueCard
                        key={clue.id}
                        clue={clue}
                        isMarked={markedClueIds.includes(clue.id)}
                        isSelected={selectedClueId === clue.id}
                        onMark={() => markClue(clue.id)}
                        onUnmark={() => unmarkClue(clue.id)}
                        onSelect={() => selectClue(clue.id)}
                        onViewSource={() => handleSourceTrace(clue.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-300">授权合同材料</h2>
              <p className="text-xs text-slate-500">注意查看有效期和限制条款</p>
            </div>
            {caseData.materials.contracts.map((contract) => (
              <div key={contract.id}>
                <ContractCard
                  contract={contract}
                  isExpanded={expandedMaterialId === contract.id}
                  onToggle={() =>
                    setExpandedMaterialId(expandedMaterialId === contract.id ? null : contract.id)
                  }
                />
                {expandedMaterialId === contract.id && cluesForMaterial(contract.id).length > 0 && (
                  <div className="mt-2 ml-4 space-y-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertOctagon size={12} />
                      从此合同中可提取的线索:
                    </p>
                    {cluesForMaterial(contract.id).map((clue) => (
                      <ClueCard
                        key={clue.id}
                        clue={clue}
                        isMarked={markedClueIds.includes(clue.id)}
                        isSelected={selectedClueId === clue.id}
                        onMark={() => markClue(clue.id)}
                        onUnmark={() => unmarkClue(clue.id)}
                        onSelect={() => selectClue(clue.id)}
                        onViewSource={() => handleSourceTrace(clue.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'takedowns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-300">平台下架单材料</h2>
              <p className="text-xs text-slate-500">注意区分已争议和未争议的下架单</p>
            </div>
            {caseData.materials.takedownNotices.map((notice) => (
              <div key={notice.id}>
                <TakedownCard
                  notice={notice}
                  isExpanded={expandedMaterialId === notice.id}
                  onToggle={() =>
                    setExpandedMaterialId(expandedMaterialId === notice.id ? null : notice.id)
                  }
                />
                {expandedMaterialId === notice.id && cluesForMaterial(notice.id).length > 0 && (
                  <div className="mt-2 ml-4 space-y-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertOctagon size={12} />
                      从此下架单中可提取的线索:
                    </p>
                    {cluesForMaterial(notice.id).map((clue) => (
                      <ClueCard
                        key={clue.id}
                        clue={clue}
                        isMarked={markedClueIds.includes(clue.id)}
                        isSelected={selectedClueId === clue.id}
                        onMark={() => markClue(clue.id)}
                        onUnmark={() => unmarkClue(clue.id)}
                        onSelect={() => selectClue(clue.id)}
                        onViewSource={() => handleSourceTrace(clue.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'board' && <EvidenceBoard />}
      </main>

      {showConclusionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-medium text-slate-200 mb-4">提交判定结论</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  主要问题判定
                </label>
                <select
                  value={conclusion.mainIssue}
                  onChange={(e) =>
                    setConclusion({ ...conclusion, mainIssue: e.target.value as MainIssue })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="COVER_OK">翻唱授权正常</option>
                  <option value="COVER_NO_AUTH">翻唱无授权</option>
                  <option value="SAMPLE_DECLARED">采样已申报</option>
                  <option value="SAMPLE_UNDECLARED">采样未申报</option>
                  <option value="BGM_AUTHORIZED">BGM授权有效</option>
                  <option value="BGM_EXPIRED">BGM授权过期</option>
                  <option value="NAME_CONFLICT">同名歌曲误判</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  严重程度
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setConclusion({ ...conclusion, severity: s })}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        conclusion.severity === s
                          ? s === 'LOW'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : s === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : s === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800/50 text-slate-400 border border-transparent'
                      }`}
                    >
                      {{ LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '严重' }[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  建议措施
                </label>
                <textarea
                  value={conclusion.recommendedAction}
                  onChange={(e) =>
                    setConclusion({ ...conclusion, recommendedAction: e.target.value })
                  }
                  placeholder="例如：立即下架、补办声明、续签合同..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConclusionModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                继续调查
              </button>
              <button
                onClick={handleSubmitConclusion}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
