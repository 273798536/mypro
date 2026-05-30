import { useState } from 'react';
import { AlertTriangle, Info, Edit3, X, TrendingUp } from 'lucide-react';
import { useRiskStore } from '../../store/useRiskStore';
import {
  INSTITUTION_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  ANOMALY_TYPE_LABELS,
} from '../../types';

export const InfoPanel = () => {
  const selectedInstitutionId = useRiskStore((state) => state.selectedInstitutionId);
  const institutions = useRiskStore((state) => state.institutions);
  const anomalies = useRiskStore((state) => state.anomalies);
  const getInstitutionScore = useRiskStore((state) => state.getInstitutionScore);
  const setSelectedInstitution = useRiskStore((state) => state.setSelectedInstitution);
  const dataBatch = useRiskStore((state) => state.dataBatch);
  const loadSecondBatch = useRiskStore((state) => state.loadSecondBatch);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionScore, setCorrectionScore] = useState(0);
  const [correctionReason, setCorrectionReason] = useState('');
  const addCorrection = useRiskStore((state) => state.addCorrection);

  const selectedInstitution = institutions.find((i) => i.id === selectedInstitutionId);
  const selectedScore = selectedInstitutionId ? getInstitutionScore(selectedInstitutionId) : null;
  const selectedAnomalies = anomalies.filter((a) => a.institutionId === selectedInstitutionId);

  const handleCorrection = () => {
    if (selectedInstitutionId) {
      addCorrection(selectedInstitutionId, correctionScore, correctionReason);
      setShowCorrectionModal(false);
      setCorrectionScore(0);
      setCorrectionReason('');
    }
  };

  const errorAnomalies = anomalies.filter((a) => a.severity === 'error');
  const warningAnomalies = anomalies.filter((a) => a.severity === 'warning');

  return (
    <div className="w-72 h-full panel p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Info className="text-accent-blue" size={20} />
          <h2 className="text-lg font-bold text-text-primary font-mono">详情信息</h2>
        </div>
        {dataBatch === 1 && (
          <button
            onClick={loadSecondBatch}
            className="text-xs btn-primary"
          >
            导入第二批
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-bg-tertiary rounded p-3 text-center">
          <div className="text-2xl font-bold text-accent-blue">{institutions.length}</div>
          <div className="text-xs text-text-muted">机构总数</div>
        </div>
        <div className="bg-bg-tertiary rounded p-3 text-center">
          <div className="text-2xl font-bold text-risk-critical">{errorAnomalies.length}</div>
          <div className="text-xs text-text-muted">严重异常</div>
        </div>
        <div className="bg-bg-tertiary rounded p-3 text-center">
          <div className="text-2xl font-bold text-risk-medium">{warningAnomalies.length}</div>
          <div className="text-xs text-text-muted">警告异常</div>
        </div>
        <div className="bg-bg-tertiary rounded p-3 text-center">
          <div className="text-2xl font-bold text-accent-cyan">{anomalies.length}</div>
          <div className="text-xs text-text-muted">总异常数</div>
        </div>
      </div>

      {selectedInstitution ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">{selectedInstitution.name}</h3>
            <button
              onClick={() => setSelectedInstitution(null)}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">机构类型:</span>
              <span className="text-text-primary">{INSTITUTION_TYPE_LABELS[selectedInstitution.type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">所属区域:</span>
              <span className="text-text-primary">{selectedInstitution.region}</span>
            </div>
            {selectedInstitution.industry && (
              <div className="flex justify-between">
                <span className="text-text-muted">行业标签:</span>
                <span className="text-text-primary">{selectedInstitution.industry}</span>
              </div>
            )}
            {selectedScore && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-muted">风险得分:</span>
                  <span className={`font-bold text-risk-${selectedScore.level}`}>
                    {selectedScore.score.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">风险等级:</span>
                  <span className={`text-risk-${selectedScore.level}`}>
                    {RISK_LEVEL_LABELS[selectedScore.level]}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setCorrectionScore(selectedScore?.score || 50);
              setShowCorrectionModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-bg-tertiary rounded text-sm text-accent-blue hover:bg-bg-secondary transition-colors"
          >
            <Edit3 size={14} />
            手动修正得分
          </button>

          {selectedAnomalies.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-risk-critical mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                异常检测 ({selectedAnomalies.length})
              </h4>
              <div className="space-y-2">
                {selectedAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={`p-2 rounded text-xs ${
                      anomaly.severity === 'error'
                        ? 'bg-risk-critical/20 border border-risk-critical/50'
                        : 'bg-risk-medium/20 border border-risk-medium/50'
                    }`}
                  >
                    <div className={`font-semibold ${
                      anomaly.severity === 'error' ? 'text-risk-critical' : 'text-risk-medium'
                    }`}>
                      {ANOMALY_TYPE_LABELS[anomaly.type]}
                    </div>
                    <div className="text-text-secondary mt-1">{anomaly.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-text-muted py-8">
          <Info size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">点击3D视图中的机构标记查看详情</p>
        </div>
      )}

      {anomalies.length > 0 && !selectedInstitution && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-risk-critical" />
            全部异常列表
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {anomalies.slice(0, 10).map((anomaly) => {
              const inst = institutions.find((i) => i.id === anomaly.institutionId);
              return (
                <button
                  key={anomaly.id}
                  onClick={() => setSelectedInstitution(anomaly.institutionId)}
                  className={`w-full p-2 rounded text-left text-xs transition-colors ${
                    anomaly.severity === 'error'
                      ? 'bg-risk-critical/10 hover:bg-risk-critical/20 border border-risk-critical/30'
                      : 'bg-risk-medium/10 hover:bg-risk-medium/20 border border-risk-medium/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text-primary">{inst?.name}</span>
                    <span className={`${
                      anomaly.severity === 'error' ? 'text-risk-critical' : 'text-risk-medium'
                    }`}>
                      {ANOMALY_TYPE_LABELS[anomaly.type]}
                    </span>
                  </div>
                  <div className="text-text-muted mt-1 truncate">{anomaly.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="panel p-6 w-96">
            <h3 className="text-lg font-bold text-text-primary mb-4">手动修正风险得分</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">新得分 (0-100)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={correctionScore}
                  onChange={(e) => setCorrectionScore(Number(e.target.value))}
                  className="w-full mb-2"
                />
                <div className="text-center text-2xl font-bold text-accent-blue">
                  {correctionScore}
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">修正原因</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full p-2 bg-bg-tertiary rounded border border-border-glow text-text-primary text-sm resize-none h-24"
                  placeholder="请输入修正原因..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="flex-1 py-2 bg-bg-tertiary rounded text-text-secondary hover:text-text-primary transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCorrection}
                  className="flex-1 btn-primary"
                >
                  确认修正
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
