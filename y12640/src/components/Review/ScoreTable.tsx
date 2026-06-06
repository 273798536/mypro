import { useCanvasStore } from '@/store/canvasStore';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const ScoreTable = () => {
  const { scores } = useCanvasStore();
  
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const totalMax = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = Math.round((totalScore / totalMax) * 100);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle size={20} className="text-green-500" />;
      case 'review': return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'fail': return <XCircle size={20} className="text-red-500" />;
      default: return null;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'fail': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pass': return '通过';
      case 'review': return '待复核';
      case 'fail': return '不合格';
      default: return '未知';
    }
  };
  
  const getBarColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-gradient-to-r from-green-500 to-green-400';
      case 'review': return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
      case 'fail': return 'bg-gradient-to-r from-red-500 to-red-400';
      default: return 'bg-gray-400';
    }
  };
  
  if (scores.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">评分表</h3>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">综合评分</span>
          <span className="text-3xl font-bold text-indigo-600">{percentage}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{totalScore}/{totalMax} 分</span>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            percentage >= 80 ? 'bg-green-100 text-green-700' : 
            percentage >= 60 ? 'bg-yellow-100 text-yellow-700' : 
            'bg-red-100 text-red-700'
          }`}>
            {percentage >= 80 ? '可直接使用' : percentage >= 60 ? '需复核' : '需修正'}
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        {scores.map((score, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(score.status)}
                <span className="font-medium text-gray-700">{score.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{score.score}/{score.maxScore}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadge(score.status)}`}>
                  {getStatusText(score.status)}
                </span>
              </div>
            </div>
            
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getBarColor(score.status)} transition-all duration-500`}
                style={{ width: `${(score.score / score.maxScore) * 100}%` }}
              />
            </div>
            
            {score.details.length > 0 && (
              <ul className="mt-2 space-y-1">
                {score.details.map((detail, idx) => (
                  <li key={idx} className="text-xs text-gray-500 flex items-start gap-1">
                    <span className="text-gray-400">-</span>
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
