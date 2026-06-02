import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { usePracticeStore } from '@/store/practiceStore';

export default function PracticeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conflictId = searchParams.get('conflictId');
  const { currentPractice, loading, fetchPracticeDetail, createCorrection } = usePracticeStore();

  const [rhythmData, setRhythmData] = useState({ bpm: '', confidence: '', reason: '' });
  const [tierData, setTierData] = useState({ tiers: '', reason: '' });
  const [beatData, setBeatData] = useState({ markers: '', reason: '' });

  const loadDetail = useCallback(() => {
    if (id) fetchPracticeDetail(id);
  }, [id, fetchPracticeDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSubmit = async () => {
    if (!id) return;

    const operator = '当前操作员';

    if (rhythmData.bpm && rhythmData.reason) {
      await createCorrection(id, {
        field: 'detectedBPM',
        oldValue: String(currentPractice?.rhythmDetection.detectedBPM || ''),
        newValue: rhythmData.bpm,
        reason: rhythmData.reason,
        operator,
      });
    }

    if (tierData.tiers && tierData.reason) {
      await createCorrection(id, {
        field: 'tiers',
        oldValue: JSON.stringify(currentPractice?.speedTier.tiers || []),
        newValue: tierData.tiers,
        reason: tierData.reason,
        operator,
      });
    }

    if (beatData.markers && beatData.reason) {
      await createCorrection(id, {
        field: 'markers',
        oldValue: JSON.stringify(currentPractice?.beatMarkers.markers || []),
        newValue: beatData.markers,
        reason: beatData.reason,
        operator,
      });
    }

    navigate(`/practices/${id}`);
  };

  if (loading && !currentPractice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPractice) {
    return <div className="text-center py-20 text-text-muted">未找到练习记录</div>;
  }

  const { rhythmDetection, speedTier, beatMarkers } = currentPractice;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button onClick={() => navigate(`/practices/${id}`)} className="hover:text-text-primary transition-colors">
          练习详情
        </button>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary">数据修正</span>
      </div>

      {conflictId && (
        <div className="bg-conflict-red/10 border border-conflict-red/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-conflict-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-conflict-red font-medium">关联冲突</p>
            <p className="text-xs text-text-secondary mt-1">冲突ID: {conflictId}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-4">节奏检测修正</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">当前BPM</label>
              <div className="px-3 py-2 bg-dark-tertiary rounded-lg text-sm text-text-muted border border-dark-border">
                {rhythmDetection?.detectedBPM ?? '-'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-amber-primary mb-1.5">新BPM值</label>
              <input
                type="number"
                value={rhythmData.bpm}
                onChange={(e) => setRhythmData({ ...rhythmData, bpm: e.target.value })}
                placeholder="输入新的BPM值"
                className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">当前置信度</label>
              <div className="px-3 py-2 bg-dark-tertiary rounded-lg text-sm text-text-muted border border-dark-border">
                {rhythmDetection ? (rhythmDetection.confidenceScore * 100).toFixed(1) : '-'}%
              </div>
            </div>
            <div>
              <label className="block text-xs text-amber-primary mb-1.5">新置信度</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={rhythmData.confidence}
                onChange={(e) => setRhythmData({ ...rhythmData, confidence: e.target.value })}
                placeholder="0.00 - 1.00"
                className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-amber-primary mb-1.5">修正原因</label>
            <textarea
              value={rhythmData.reason}
              onChange={(e) => setRhythmData({ ...rhythmData, reason: e.target.value })}
              rows={2}
              placeholder="请说明修正原因..."
              className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-4">速度分层修正</h3>
          <div className="mb-4">
            <label className="block text-xs text-text-muted mb-1.5">当前分层</label>
            <div className="bg-dark-tertiary rounded-lg border border-dark-border p-3 space-y-1">
              {(speedTier?.tiers || []).map((tier) => (
                <div key={tier.tierIndex} className="text-xs text-text-muted">
                  {tier.label}: {tier.bpmRange[0]}-{tier.bpmRange[1]} BPM ({tier.startTime} - {tier.endTime})
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-amber-primary mb-1.5">新分层数据 (JSON)</label>
            <textarea
              value={tierData.tiers}
              onChange={(e) => setTierData({ ...tierData, tiers: e.target.value })}
              rows={4}
              placeholder='[{"tierIndex":1,"bpmRange":[60,80],...}]'
              className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors resize-none font-mono"
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs text-amber-primary mb-1.5">修正原因</label>
            <textarea
              value={tierData.reason}
              onChange={(e) => setTierData({ ...tierData, reason: e.target.value })}
              rows={2}
              placeholder="请说明修正原因..."
              className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <h3 className="font-display font-semibold text-sm text-text-primary mb-4">节拍标记修正</h3>
          <div className="mb-4">
            <label className="block text-xs text-text-muted mb-1.5">当前标记数量</label>
            <div className="px-3 py-2 bg-dark-tertiary rounded-lg text-sm text-text-muted border border-dark-border">
              {beatMarkers?.markers?.length ?? 0} 个标记
            </div>
          </div>
          <div>
            <label className="block text-xs text-amber-primary mb-1.5">新标记数据 (JSON)</label>
            <textarea
              value={beatData.markers}
              onChange={(e) => setBeatData({ ...beatData, markers: e.target.value })}
              rows={4}
              placeholder='[{"timeOffset":0,"type":"normal",...}]'
              className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors resize-none font-mono"
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs text-amber-primary mb-1.5">修正原因</label>
            <textarea
              value={beatData.reason}
              onChange={(e) => setBeatData({ ...beatData, reason: e.target.value })}
              rows={2}
              placeholder="请说明修正原因..."
              className="w-full px-3 py-2 bg-dark-primary border border-amber-primary/40 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-amber-primary transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => navigate(`/practices/${id}`)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-dark-tertiary text-text-secondary hover:text-text-primary hover:bg-dark-border transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-amber-primary text-dark-primary hover:bg-amber-hover shadow-lg shadow-amber-primary/20 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          提交修正
        </button>
      </div>
    </div>
  );
}
