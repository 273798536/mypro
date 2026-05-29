import { useGameStore } from '../../store/useGameStore';
import { formatTime } from '../../utils/judgeUtils';
import { AlertTriangle, Clock, Volume2, XCircle } from 'lucide-react';
import { ProblemPoint } from '../../types';

export function ProblemList() {
  const { gameResult } = useGameStore();

  if (!gameResult) return null;

  const problems: ProblemPoint[] = [];

  gameResult.judgeRecords.forEach(record => {
    if (record.result === 'early') {
      problems.push({
        time: record.expectedTime,
        type: 'early',
        partName: record.partName,
        description: `抢拍 ${Math.abs(record.offset)}ms`,
      });
    } else if (record.result === 'late') {
      problems.push({
        time: record.expectedTime,
        type: 'late',
        partName: record.partName,
        description: `延迟 ${record.offset}ms`,
      });
    } else if (record.result === 'missed') {
      problems.push({
        time: record.expectedTime,
        type: 'missed',
        partName: record.partName,
        description: '未能及时进入',
      });
    }
  });

  gameResult.volumeRecords.forEach(record => {
    if (record.isOverpowering) {
      problems.push({
        time: record.time,
        type: 'overpower',
        partName: record.partName,
        description: `音量过大 (${record.volume})`,
      });
    }
  });

  problems.sort((a, b) => a.time - b.time);

  const getIcon = (type: ProblemPoint['type']) => {
    switch (type) {
      case 'early':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'late':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'missed':
        return <XCircle className="w-5 h-5 text-slate-400" />;
      case 'overpower':
        return <Volume2 className="w-5 h-5 text-orange-400" />;
    }
  };

  const getBgColor = (type: ProblemPoint['type']) => {
    switch (type) {
      case 'early':
        return 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20';
      case 'late':
        return 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20';
      case 'missed':
        return 'bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20';
      case 'overpower':
        return 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-700/50">
      <h3 className="text-xl font-bold text-white mb-4">问题点列表</h3>
      
      {problems.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          🎉 太棒了！没有发现问题
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {problems.map((problem, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer ${getBgColor(problem.type)}`}
            >
              <div className="font-mono text-sm text-slate-400 w-20">
                {formatTime(problem.time)}
              </div>
              {getIcon(problem.type)}
              <div className="flex-1">
                <div className="font-medium text-white">{problem.partName}</div>
                <div className="text-sm text-slate-400">{problem.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
