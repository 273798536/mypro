import React, { useMemo } from 'react';
import { FileText, User, Calendar, MapPin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const SourceCard: React.FC = () => {
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const trackPoints = useAppStore(state => state.trackPoints);
  const dataVersion = useAppStore(state => state.dataVersion);
  const currentBatch = useAppStore(state => state.currentBatch);
  const getQualityMetrics = useAppStore(state => state.getQualityMetrics);
  const submitForReview = useAppStore(state => state.submitForReview);
  const getFilteredPoints = useAppStore(state => state.getFilteredPoints);

  const metrics = useMemo(() => getQualityMetrics(), [getQualityMetrics, dataVersion]);

  const materialsWithStats = useMemo(() => {
    return sourceMaterials.map(mat => {
      const matPoints = trackPoints.filter(p => p.sourceMaterial === mat.id);
      const anomalies = matPoints.filter(p => p.status !== 'normal');
      const boundaryIssues = matPoints.filter(p => p.boundaryCollision);
      return {
        ...mat,
        total: matPoints.length,
        anomalies: anomalies.length,
        boundaryIssues: boundaryIssues.length,
        anomalyRate: matPoints.length > 0 ? Math.round((anomalies.length / matPoints.length) * 100) : 0
      };
    });
  }, [sourceMaterials, trackPoints, dataVersion]);

  const handleSubmitReview = () => {
    const success = submitForReview();
    if (success) {
      alert('已提交复核申请！');
    }
  };

  return (
    <div className="bg-xuan-50 border border-ochre-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-ink-600">来源材料</h3>
        <button
          onClick={handleSubmitReview}
          className="px-3 py-1 bg-cinnabar-500 text-white text-xs rounded hover:bg-cinnabar-600 flex items-center gap-1"
        >
          提交复核
        </button>
      </div>

      {currentBatch && (
        <div className="bg-xuan-100 border border-ochre-200 rounded p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-ochre-600" />
              <span className="text-ochre-600">批次：</span>
              <span className="text-ink-600">{currentBatch.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-ochre-600" />
              <span className="text-ochre-600">操作：</span>
              <span className="text-ink-600">{currentBatch.operator}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-64 overflow-auto">
        {materialsWithStats.map(mat => (
          <div
            key={mat.id}
            className={`p-3 bg-white border rounded-lg hover:shadow-card transition-shadow ${
              mat.boundaryIssues > 0
                ? 'border-cinnabar-300 bg-cinnabar-50'
                : mat.anomalies > 0
                ? 'border-rattan-300 bg-rattan-50'
                : 'border-ochre-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-serif text-ink-700 text-sm">{mat.name}</h4>
                <p className="text-xs text-ochre-600">{mat.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                mat.boundaryIssues > 0
                  ? 'bg-cinnabar-100 text-cinnabar-700'
                  : mat.anomalies > 0
                  ? 'bg-rattan-100 text-rattan-700'
                  : 'bg-azure-100 text-azure-700'
              }`}>
                {mat.anomalyRate}% 异常
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-ochre-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {mat.total} 点
              </span>
              {mat.boundaryIssues > 0 && (
                <span className="text-cinnabar-600">
                  边界碰撞：{mat.boundaryIssues} 点
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SourceCard;
