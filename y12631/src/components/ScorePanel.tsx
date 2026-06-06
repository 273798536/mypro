import { ScoreDetail, LayerOcclusionIssue, ScoreSnapshot } from '../types';

interface ScorePanelProps {
  scoreDetails: ScoreDetail[];
  totalScore: number;
  occlusionIssues?: LayerOcclusionIssue[];
  scoreHistory?: ScoreSnapshot[];
}

const getIssueIcon = (type?: string) => {
  switch (type) {
    case 'error': return '❌';
    case 'warning': return '⚠️';
    default: return '✅';
  }
};

const getIssueColor = (type?: string) => {
  switch (type) {
    case 'error': return 'text-red-700 bg-red-50 border-red-200';
    case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    default: return 'text-green-700 bg-green-50 border-green-200';
  }
};

export const ScorePanel = ({ scoreDetails, totalScore, occlusionIssues = [], scoreHistory = [] }: ScorePanelProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '需改进';
    return '需重做';
  };

  const prevScore = scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 2].totalScore : null;
  const scoreDiff = prevScore !== null ? totalScore - prevScore : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">📊 评分面板</h3>

      <div className="flex items-center justify-center mb-4">
        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center ${getScoreBgColor(totalScore)}`}>
          <div className="text-center">
            <span className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
              {totalScore}
            </span>
            <div className={`text-sm font-medium ${getScoreColor(totalScore)}`}>
              {getScoreLabel(totalScore)}
            </div>
            {prevScore !== null && scoreDiff !== 0 && (
              <div className={`text-xs mt-0.5 font-medium ${scoreDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {scoreDiff > 0 ? '↑' : '↓'} {Math.abs(scoreDiff)} 分
              </div>
            )}
          </div>
        </div>
      </div>

      {occlusionIssues.length > 0 && (
        <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <span>🎭</span>
            <span className="font-medium text-sm">检测到 {occlusionIssues.length} 处图层遮挡</span>
          </div>
          <div className="space-y-1">
            {occlusionIssues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className="text-xs text-purple-600 flex items-start gap-1">
                <span>•</span>
                <span>{issue.description}（扣 {issue.impactOnScore} 分）</span>
              </div>
            ))}
            {occlusionIssues.length > 3 && (
              <div className="text-xs text-purple-500 italic">还有 {occlusionIssues.length - 3} 处...</div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {scoreDetails.map((detail, index) => (
          <div key={index} className={`p-3 rounded-lg border ${getIssueColor(detail.issueType)}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{detail.category}</span>
                {detail.affectedByLayer && (
                  <span className="text-xs px-1.5 py-0.5 bg-purple-200 text-purple-700 rounded">受图层影响</span>
                )}
              </div>
              <span className="text-sm font-bold">{detail.score}/{detail.maxScore}</span>
            </div>
            <div className="flex items-start gap-2 mb-1">
              <span className="flex-shrink-0">{getIssueIcon(detail.issueType)}</span>
              <div className="text-xs">
                <p className="font-medium">{detail.humanReadableReason || detail.reason}</p>
                {detail.humanReadableReason && detail.humanReadableReason !== detail.reason && (
                  <p className="text-gray-500 mt-0.5 italic">（系统提示：{detail.reason}）</p>
                )}
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  detail.issueType === 'error' ? 'bg-red-500' :
                  detail.issueType === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${(detail.score / detail.maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {scoreHistory.length >= 2 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-700 mb-2">📈 评分变化</h4>
          <div className="flex items-end gap-1 h-12">
            {scoreHistory.slice(-8).map((s, idx) => {
              const height = Math.max(10, (s.totalScore / 100) * 40);
              const isLast = idx === scoreHistory.slice(-8).length - 1;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${isLast ? 'bg-primary-500' : 'bg-primary-300'}`}
                    style={{ height: `${height}px` }}
                    title={`${s.operationDescription || '操作'}: ${s.totalScore}分`}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">最近 {Math.min(scoreHistory.length, 8)} 次操作后的分数</p>
        </div>
      )}
    </div>
  );
};
