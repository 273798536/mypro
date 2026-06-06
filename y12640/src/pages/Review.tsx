import { Download, FileJson, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '@/store/canvasStore';
import { generateJSONReport, generateHTMLReport } from '@/utils/exporter';
import type { ReviewScore } from '@/types';

export default function Review() {
  const navigate = useNavigate();
  const { hotspots, detections, scores, mapConfig, currentSample } = useCanvasStore();
  
  const downloadJSON = () => {
    if (!mapConfig) return;
    const jsonContent = generateJSONReport(hotspots, detections, scores, mapConfig);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `检测报告-${currentSample?.name || '未知'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const downloadHTML = () => {
    if (!mapConfig) return;
    const htmlContent = generateHTMLReport(hotspots, detections, scores, mapConfig);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `检测报告-${currentSample?.name || '未知'}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded-full text-xs">通过</span>;
      case 'review':
        return <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-xs">待复核</span>;
      case 'fail':
        return <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded-full text-xs">不合格</span>;
      default:
        return null;
    }
  };
  
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const maxTotalScore = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const overallStatus = scores.some(s => s.status === 'fail') ? 'fail' :
                        scores.some(s => s.status === 'review') ? 'review' : 'pass';
  
  if (!mapConfig) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-sm mb-4">请先在主画板完成检测和结算</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
          >
            返回主画板
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
            >
              <ArrowLeft size={16} />
              返回
            </button>
            <div>
              <h1 className="text-white font-bold text-xl">检测复盘报告</h1>
              <p className="text-slate-400 text-sm mt-1">
                {currentSample?.name} - {currentSample?.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              <FileJson size={16} />
              JSON导出
            </button>
            <button
              onClick={downloadHTML}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
            >
              <FileText size={16} />
              HTML导出
            </button>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">总体评分</h2>
            {getStatusBadge(overallStatus)}
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    overallStatus === 'pass' ? 'bg-green-500' :
                    overallStatus === 'review' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${(totalScore / maxTotalScore) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <span className="text-white font-bold text-lg">{totalScore}</span>
              <span className="text-slate-400 text-sm"> / {maxTotalScore}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-900/20 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">通过项</p>
              <p className="text-lg font-bold text-green-400">
                {scores.filter(s => s.status === 'pass').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">待复核</p>
              <p className="text-lg font-bold text-yellow-400">
                {scores.filter(s => s.status === 'review').length}
              </p>
            </div>
            <div className="p-3 bg-red-900/20 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">不合格</p>
              <p className="text-lg font-bold text-red-400">
                {scores.filter(s => s.status === 'fail').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-white font-semibold text-lg mb-4">评分表</h2>
          
          <div className="space-y-3">
            {scores.map((score: ReviewScore) => (
              <div key={score.category} className="p-4 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{score.category}</span>
                  {getStatusBadge(score.status)}
                </div>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          score.status === 'pass' ? 'bg-green-500' :
                          score.status === 'review' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(score.score / score.maxScore) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {score.score} / {score.maxScore}
                  </span>
                </div>
                
                {score.details.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-600">
                    <p className="text-xs text-slate-400 mb-1">问题详情:</p>
                    {score.details.map((detail, idx) => (
                      <p key={idx} className="text-xs text-slate-300 mt-1">
                        {detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-white font-semibold text-lg mb-4">检测结果汇总</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">总记录数</p>
              <p className="text-lg font-bold text-white">{hotspots.length}</p>
            </div>
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">检测问题数</p>
              <p className="text-lg font-bold text-white">{detections.length}</p>
            </div>
          </div>
          
          {detections.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-2">问题分类:</p>
              <div className="space-y-2">
                {['empty', 'duplicate', 'flipped', 'scale_error', 'mixed_notes'].map(type => {
                  const typeDetections = detections.filter(d => d.type === type);
                  if (typeDetections.length === 0) return null;
                  
                  const typeLabels = {
                    empty: '空值',
                    duplicate: '重复',
                    flipped: '翻转',
                    scale_error: '比例尺',
                    mixed_notes: '备注混写'
                  };
                  
                  return (
                    <div key={type} className="flex items-center justify-between p-2 bg-slate-700 rounded">
                      <span className="text-xs text-slate-300">{typeLabels[type]}</span>
                      <span className={`text-xs font-medium ${
                        typeDetections.some(d => d.severity === 'error') ? 'text-red-400' :
                        typeDetections.some(d => d.severity === 'warning') ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {typeDetections.length} 条
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}