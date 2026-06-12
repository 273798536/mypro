import { useState, useMemo } from 'react';
import {
  X,
  Thermometer,
  Droplets,
  FlaskConical,
  Wind,
  Edit3,
  Save,
  AlertCircle,
  MapPin,
  Calendar,
  Anchor,
  Eye,
  GitCompare,
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useReviewStore } from '@/store/useReviewStore';
import { INITIAL_WATER_QUALITIES } from '@/utils/mockData';
import {
  WATER_LAYER_LABELS,
  STATUS_LABELS,
  RISK_LABELS,
  RiskLevel,
} from '@/types';
import { formatCoords, getRiskColor } from '@/utils/colorUtils';

function InfoRow({ icon, label, value, highlight }: { icon?: any; label: string; value: React.ReactNode; highlight?: boolean }) {
  const Icon = icon;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon size={13} className="text-ocean-300 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-ocean-400 uppercase tracking-wider">{label}</div>
        <div className={`text-sm ${highlight ? 'text-cyan-glow font-semibold' : 'text-ocean-100'} break-words`}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function SampleDetail() {
  const { samples, selectedSampleId, selectSample } = useSampleStore();
  const { createRevision, reviews, setDiffMode, diffMode } = useReviewStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editCount, setEditCount] = useState<number>(0);
  const [editRisk, setEditRisk] = useState<RiskLevel>('none');
  const [editNote, setEditNote] = useState('');
  const [reviewer, setReviewer] = useState('潜水教练');

  const sample = useMemo(
    () => samples.find((s) => s.id === selectedSampleId),
    [samples, selectedSampleId],
  );

  const waterQuality = useMemo(
    () => INITIAL_WATER_QUALITIES.find((w) => w.sampleId === selectedSampleId),
    [selectedSampleId],
  );

  const sampleReviews = useMemo(
    () => reviews.filter((r) => r.sampleId === selectedSampleId),
    [reviews, selectedSampleId],
  );

  if (!sample) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center text-ocean-300" style={{ width: 340 }}>
        <Eye size={32} className="mb-3 opacity-40" />
        <p className="text-sm">点击 3D 场景或地图中的</p>
        <p className="text-sm">浮游生物查看详细信息</p>
        <div className="divider-glow w-full my-4" />
        <p className="text-[11px] text-ocean-400 text-center">
          支持旋转、缩放、剖切与筛选交互
        </p>
      </div>
    );
  }

  const startEdit = () => {
    setIsEditing(true);
    setEditCount(sample.count);
    setEditRisk(sample.riskLevel);
    setEditNote(sample.notes || '');
  };

  const saveRevision = () => {
    createRevision(
      sample.id,
      editCount,
      editRisk !== sample.riskLevel ? editRisk : undefined,
      editNote,
      reviewer,
    );
    setIsEditing(false);
  };

  const isCountChanged = sample.originalCount !== undefined && sample.originalCount !== sample.count;

  return (
    <div className="glass-panel-strong flex flex-col" style={{ width: 340, height: '100%' }}>
      <div className="flex items-center justify-between p-4 border-b border-ocean-700/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-ocean-50">{sample.id}</span>
            <span className={`badge-status-${sample.status}`}>{STATUS_LABELS[sample.status]}</span>
          </div>
          <div className="text-xs text-ocean-300 mt-0.5">{sample.species}</div>
        </div>
        <button
          onClick={() => selectSample(null)}
          className="p-1.5 rounded-md text-ocean-400 hover:text-ocean-100 hover:bg-ocean-800/50 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-ocean-300 font-semibold uppercase tracking-wider">
              核心数据
            </span>
            {sample.riskLevel !== 'none' && (
              <span className={`badge-risk-${sample.riskLevel}`}>
                {RISK_LABELS[sample.riskLevel]}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 bg-ocean-950/50 rounded-lg p-3">
            <InfoRow
              label="计数值"
              value={
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-display" style={{ color: getRiskColor(sample.riskLevel) }}>
                    {sample.count}
                  </span>
                  {isCountChanged && (
                    <span className="text-[10px] text-crimson-risk line-through">
                      {sample.originalCount}
                    </span>
                  )}
                </div>
              }
              highlight
            />
            <InfoRow icon={Anchor} label="浮标" value={sample.buoyId} />
            <InfoRow label="水层" value={WATER_LAYER_LABELS[sample.waterLayer]} />
            <InfoRow icon={MapPin} label="坐标" value={formatCoords(sample.x, sample.y, sample.z)} />
            <InfoRow icon={Calendar} label="采样时间" value={sample.sampledAt} />
          </div>
        </div>

        {sample.notes && !isEditing && (
          <div className="bg-cyan-glow/5 border border-cyan-glow/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-cyan-glow mb-1.5">
              <Edit3 size={12} /> 复核备注
            </div>
            <p className="text-xs text-ocean-100 leading-relaxed">{sample.notes}</p>
          </div>
        )}

        <div>
          <div className="text-xs text-ocean-300 font-semibold uppercase tracking-wider mb-2">
            水质参数
          </div>
          <div className="bg-ocean-950/50 rounded-lg p-3 space-y-0.5">
            {waterQuality?.isMissing && (
              <div className="flex items-center gap-1.5 text-amber-risk text-[11px] mb-2 pb-2 border-b border-ocean-800">
                <AlertCircle size={12} />
                <span>部分参数缺失：{waterQuality.missingFields?.join('、')}</span>
              </div>
            )}
            <InfoRow
              icon={Thermometer}
              label="水温"
              value={
                waterQuality?.temperature !== undefined
                  ? `${waterQuality.temperature}°C`
                  : <span className="text-crimson-risk">缺失</span>
              }
            />
            <InfoRow
              icon={Droplets}
              label="盐度"
              value={
                waterQuality?.salinity !== undefined
                  ? `${waterQuality.salinity}‰`
                  : <span className="text-crimson-risk">缺失</span>
              }
            />
            <InfoRow
              icon={FlaskConical}
              label="pH值"
              value={
                waterQuality?.ph !== undefined
                  ? waterQuality.ph.toFixed(2)
                  : <span className="text-crimson-risk">缺失</span>
              }
            />
            <InfoRow
              icon={Wind}
              label="溶解氧"
              value={
                waterQuality?.dissolvedOxygen !== undefined
                  ? `${waterQuality.dissolvedOxygen} mg/L`
                  : <span className="text-crimson-risk">缺失</span>
              }
            />
          </div>
        </div>

        {sampleReviews.length > 0 && (
          <div>
            <div className="text-xs text-ocean-300 font-semibold uppercase tracking-wider mb-2">
              复核记录
            </div>
            <div className="space-y-2">
              {sampleReviews.map((r) => (
                <div key={r.id} className="bg-ocean-950/50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs text-cyan-glow font-medium">{r.reviewer}</span>
                    <span className="text-[10px] text-ocean-400">{r.reviewedAt}</span>
                  </div>
                  {r.judgmentChange && (
                    <div className="flex items-center gap-2 text-[11px] mb-1.5">
                      <span className="text-crimson-risk line-through">{r.originalCount}</span>
                      <GitCompare size={12} className="text-ocean-500" />
                      <span className="text-cyan-glow font-semibold">{r.revisedCount}</span>
                      <span className="text-amber-risk ml-auto">判定已变更</span>
                    </div>
                  )}
                  <p className="text-xs text-ocean-200 leading-relaxed">{r.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div className="bg-ocean-900/80 border border-cyan-glow/30 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-cyan-glow font-semibold">
              <Edit3 size={12} /> 复核修正
            </div>
            <div>
              <label className="text-[11px] text-ocean-300 block mb-1">计数值</label>
              <input
                type="number"
                value={editCount}
                onChange={(e) => setEditCount(Number(e.target.value))}
                className="input-ocean w-full text-sm"
              />
              {editCount !== sample.count && (
                <p className="text-[10px] text-crimson-risk mt-1">
                  原数值：{sample.count}，变化：{editCount - sample.count > 0 ? '+' : ''}{editCount - sample.count}
                </p>
              )}
            </div>
            <div>
              <label className="text-[11px] text-ocean-300 block mb-1">风险等级</label>
              <select
                value={editRisk}
                onChange={(e) => setEditRisk(e.target.value as RiskLevel)}
                className="input-ocean w-full text-sm"
              >
                <option value="none">正常</option>
                <option value="low">低风险</option>
                <option value="medium">中风险</option>
                <option value="high">高风险</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-ocean-300 block mb-1">复核备注</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                className="input-ocean w-full text-sm resize-none"
                placeholder="输入复核说明..."
              />
            </div>
            <div>
              <label className="text-[11px] text-ocean-300 block mb-1">复核人</label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="input-ocean w-full text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-ocean-700/50 flex gap-2">
        {!isEditing ? (
          <>
            <button onClick={startEdit} className="btn-glow flex-1 flex items-center justify-center gap-1.5 text-sm">
              <Edit3 size={14} /> 复核修正
            </button>
            <button
              onClick={() => setDiffMode(diffMode === 'none' ? 'overlay' : 'none')}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                diffMode !== 'none'
                  ? 'bg-cyan-glow/20 text-cyan-glow border border-cyan-glow/40'
                  : 'bg-ocean-800/50 text-ocean-300 hover:bg-ocean-800 border border-ocean-700'
              }`}
            >
              <GitCompare size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg text-sm bg-ocean-800/50 text-ocean-300 hover:bg-ocean-800 border border-ocean-700 transition-all"
            >
              取消
            </button>
            <button onClick={saveRevision} className="btn-glow flex-1 flex items-center justify-center gap-1.5 text-sm">
              <Save size={14} /> 保存复核
            </button>
          </>
        )}
      </div>
    </div>
  );
}
