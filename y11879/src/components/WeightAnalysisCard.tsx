import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store/appStore';
import { Scale } from 'lucide-react';

const COLORS = ['#EAB308', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

const WeightAnalysisCard = () => {
  const { events, selectedAthleteId, calculationResult, scores, athletes } = useAppStore();

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const selectedResult = calculationResult?.results.find(
    (r) => r.athleteId === selectedAthleteId
  );

  const chartData = events.map((event, index) => {
    const weightedScore = selectedResult?.weightedScores[event.id] || 0;
    const rawScore = scores.find(
      (s) => s.athleteId === selectedAthleteId && s.eventId === event.id
    )?.value || 0;
    return {
      name: event.name,
      value: weightedScore,
      rawScore,
      weight: event.weight,
      color: COLORS[index % COLORS.length],
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-white">{data.name}</p>
          <p className="text-sm text-dark-300">原始分: {data.rawScore}</p>
          <p className="text-sm text-dark-300">权重: {data.weight}</p>
          <p className="text-sm text-primary-400 font-medium">
            加权分: {data.value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-primary-500" />
        <h3 className="font-display font-semibold text-white">权重分析</h3>
      </div>

      {selectedAthleteId && selectedResult ? (
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-sm text-dark-400">当前选手</span>
            <p className="text-lg font-semibold text-white">
              {selectedAthlete?.name}
            </p>
            <p className="text-sm text-primary-400">
              第 {selectedResult.rank} 名 · 总分 {selectedResult.totalScore.toFixed(2)}
            </p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-dark-200">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-white font-medium">
                    {item.value.toFixed(1)}
                  </span>
                  <span className="text-xs text-dark-400 ml-1">
                    ({item.weight}×)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-dark-400">
          <p>点击排名列表中的选手</p>
          <p className="text-sm">查看权重构成分析</p>
        </div>
      )}
    </div>
  );
};

export default WeightAnalysisCard;
