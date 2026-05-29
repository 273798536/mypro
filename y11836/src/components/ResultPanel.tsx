import { AlertTriangle, Car, Flame, Leaf, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { DeductionItem } from '@/types';

function ScoreBar({ label, score, maxScore, color, icon }: {
  label: string;
  score: number;
  maxScore: number;
  color: string;
  icon: React.ReactNode;
}) {
  const percentage = Math.round((score / maxScore) * 100);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-800">{score}/{maxScore}</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DeductionCard({ deduction }: { deduction: DeductionItem }) {
  const categoryConfig = {
    traffic: { icon: <Car size={18} />, color: 'bg-blue-100 text-blue-600 border-blue-200', label: '交通' },
    fire: { icon: <Flame size={18} />, color: 'bg-red-100 text-red-600 border-red-200', label: '消防' },
    green: { icon: <Leaf size={18} />, color: 'bg-green-100 text-green-600 border-green-200', label: '绿地' }
  };
  
  const config = categoryConfig[deduction.category];
  
  return (
    <div className={`p-3 rounded-xl border ${config.color} mb-2`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-semibold text-sm">{deduction.reason}</span>
        </div>
        <span className="font-bold text-red-500">-{deduction.points}</span>
      </div>
      <p className="text-xs mt-2 opacity-80">{deduction.description}</p>
      {deduction.positions.length > 0 && (
        <p className="text-xs mt-1 opacity-60">
          涉及位置：{deduction.positions.slice(0, 5).map(p => `(${p.row},${p.col})`).join(' ')}
          {deduction.positions.length > 5 && ` 等${deduction.positions.length}处`}
        </p>
      )}
    </div>
  );
}

export default function ResultPanel() {
  const { score, firstRunScore } = useGameStore();
  
  if (!score) return null;

  const getGrade = (totalScore: number) => {
    if (totalScore >= 90) return { grade: 'S', color: 'text-yellow-500', message: '🏆 完美规划！' };
    if (totalScore >= 80) return { grade: 'A', color: 'text-green-500', message: '🌟 优秀！' };
    if (totalScore >= 70) return { grade: 'B', color: 'text-blue-500', message: '👍 良好！' };
    if (totalScore >= 60) return { grade: 'C', color: 'text-orange-500', message: '💪 及格！' };
    return { grade: 'D', color: 'text-red-500', message: '🔧 需要改进！' };
  };

  const gradeInfo = getGrade(score.totalScore);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 w-full max-h-[80vh] overflow-y-auto">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="text-yellow-500" size={28} />
          <h2 className="text-2xl font-bold text-slate-800">规划成果</h2>
        </div>
        <div className={`text-6xl font-black ${gradeInfo.color} mb-2`}>
          {gradeInfo.grade}
        </div>
        <p className="text-lg text-slate-600">{gradeInfo.message}</p>
        <div className="text-4xl font-bold text-slate-800 mt-2">
          {score.totalScore}
          <span className="text-xl text-slate-400">/{score.maxScore}</span>
        </div>
      </div>

      {firstRunScore && (
        <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h4 className="font-semibold text-purple-700 mb-2">📊 与第一次对比</h4>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-sm text-slate-500">第一次</p>
              <p className="text-2xl font-bold text-slate-700">{firstRunScore.totalScore}</p>
            </div>
            <div className="text-2xl font-bold text-purple-500">→</div>
            <div>
              <p className="text-sm text-slate-500">本次</p>
              <p className="text-2xl font-bold text-slate-700">{score.totalScore}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">变化</p>
              <p className={`text-2xl font-bold ${score.totalScore >= firstRunScore.totalScore ? 'text-green-500' : 'text-red-500'}`}>
                {score.totalScore >= firstRunScore.totalScore ? '+' : ''}{score.totalScore - firstRunScore.totalScore}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-700 mb-3">📈 各项得分</h3>
        <ScoreBar 
          label="交通状况" 
          score={score.trafficScore.score} 
          maxScore={score.trafficScore.maxScore}
          color="bg-blue-500"
          icon={<Car size={18} className="text-blue-500" />}
        />
        <ScoreBar 
          label="消防安全" 
          score={score.fireScore.score} 
          maxScore={score.fireScore.maxScore}
          color="bg-red-500"
          icon={<Flame size={18} className="text-red-500" />}
        />
        <ScoreBar 
          label="绿地覆盖" 
          score={score.greenScore.score} 
          maxScore={score.greenScore.maxScore}
          color="bg-green-500"
          icon={<Leaf size={18} className="text-green-500" />}
        />
      </div>

      {score.deductions.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-500" size={20} />
            <h3 className="text-lg font-bold text-slate-700">扣分原因</h3>
            <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {score.deductions.length} 项
            </span>
          </div>
          {score.deductions.map((deduction, index) => (
            <DeductionCard key={index} deduction={deduction} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-green-50 rounded-xl">
          <p className="text-green-600 font-semibold">🎉 完美！没有任何扣分！</p>
          <p className="text-sm text-green-500 mt-1">你的城市规划堪称典范</p>
        </div>
      )}
    </div>
  );
}
