import { useNavigate } from 'react-router-dom';
import { cases } from '@/data/cases';
import { getDifficultyLabel, getDifficultyColor } from '@/utils/evidenceValidator';
import { useGameStore } from '@/store/useGameStore';
import {
  Search,
  Music,
  FileText,
  AlertTriangle,
  Clock,
  ChevronRight,
  Shield,
  BookOpen,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const startCase = useGameStore((s) => s.startCase);

  const handleStartCase = (caseId: string) => {
    startCase(caseId);
    navigate(`/case/${caseId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 mb-6">
            <Search size={36} className="text-amber-400" />
          </div>
          <h1
            className="text-4xl font-bold text-slate-100 mb-3"
            style={{ fontFamily: '"Playfair Display", "Noto Sans SC", serif' }}
          >
            音乐版权侦探局
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
            通过推理游戏训练证据链思维，学会区分翻唱、采样和背景音乐授权。
            <br />
            每个选择都会真实改变局面和最终报告。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Music size={18} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">歌曲片段</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              分析歌曲的版权标注、采样来源和翻唱信息，识别隐藏的版权风险
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">授权合同</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              审阅授权类型、有效期和限制条款，注意授权过期不自动通过
            </p>
          </div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-orange-400" />
              <span className="text-sm font-medium text-orange-300">平台下架单</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              查看投诉原因和争议标记，将下架信息与合同和歌曲关联起来
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h2
            className="text-xl font-semibold text-slate-200 mb-1"
            style={{ fontFamily: '"Playfair Display", "Noto Sans SC", serif' }}
          >
            待侦案件
          </h2>
          <p className="text-xs text-slate-500">选择一个案件开始调查</p>
        </div>

        <div className="space-y-4">
          {cases.map((caseData) => (
            <button
              key={caseData.id}
              onClick={() => handleStartCase(caseData.id)}
              className="w-full text-left rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 hover:border-amber-500/30 hover:bg-slate-800/60 transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                  <Shield size={22} className="text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-slate-200 group-hover:text-amber-300 transition-colors">
                      {caseData.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${getDifficultyColor(
                        caseData.difficulty
                      )}`}
                    >
                      {getDifficultyLabel(caseData.difficulty)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2 line-clamp-2">
                    {caseData.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      预计 {caseData.estimatedTime} 分钟
                    </span>
                    <span className="flex items-center gap-1">
                      <Music size={12} />
                      {caseData.materials.songClips.length} 首歌曲
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      {caseData.materials.contracts.length} 份合同
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {caseData.materials.takedownNotices.length} 份下架单
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      {caseData.clues.length} 条线索
                    </span>
                  </div>
                </div>

                <ChevronRight
                  size={20}
                  className="text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-3"
                />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center text-xs text-slate-600">
          <p>每条结论都可追溯到来源材料 · 授权过期不会自动通过 · 采样未申报和同名误判可单独筛出</p>
        </div>
      </div>
    </div>
  );
}
