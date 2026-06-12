import { useEffect, useState } from 'react';
import {
  Shield,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { RiskBadge, DataStatusBadge, ActionBadge } from '@/components/Badges';
import type { RiskRecord, RiskLevel, RiskFactor } from '@/types';

export default function RisksPage() {
  const { viewMode, currentBatchId } = useAppStore();
  const [risks, setRisks] = useState<RiskRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<RiskLevel | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRisks();
  }, [levelFilter, currentBatchId]);

  const loadRisks = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 20 };
      if (levelFilter !== 'all') params.level = levelFilter;
      params.batchId = currentBatchId;

      const res = await api.getRisks(params);
      setRisks(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    return { high: '#FF4D4D', medium: '#FFB020', low: '#00D4AA' }[level];
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-teal-glow-400" />
            风险分层
          </h1>
          <p className="text-sm text-ocean-200/50 mt-1">
            设备风险等级、影响因素拆解与下一步行动建议
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ocean-200/40">共 {total} 台设备</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded bg-ocean-700 p-0.5">
          {(['all', 'high', 'medium', 'low'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-4 py-1.5 text-sm rounded transition-colors ${
                levelFilter === level
                  ? 'bg-teal-glow-500 text-ocean-900 font-medium'
                  : 'text-ocean-200/60 hover:text-white'
              }`}
            >
              {level === 'all' ? '全部' : level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ocean-200/40">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {risks.map((risk, idx) => (
            <div
              key={risk.id}
              className="card-ocean rounded-lg overflow-hidden transition-all"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div
                className="p-5 cursor-pointer hover:bg-ocean-700/30 transition-colors"
                onClick={() => setExpandedId(expandedId === risk.id ? null : risk.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-white">{risk.equipmentName}</h3>
                      <RiskBadge level={risk.riskLevel} size="sm" />
                    </div>
                    <p className="text-sm text-ocean-200/50 mt-1">
                      {risk.platformName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ocean-200/40">风险得分</div>
                    <div
                      className="text-2xl font-mono font-semibold"
                      style={{ color: getRiskColor(risk.riskLevel) }}
                    >
                      {risk.riskScore.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <DataStatusBadge status={risk.dataStatus} size="sm" />
                  {!viewMode && <ActionBadge action={risk.action} />}
                  {expandedId === risk.id ? (
                    <ChevronUp className="w-4 h-4 text-ocean-200/40 ml-auto" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ocean-200/40 ml-auto" />
                  )}
                </div>

                <div className="mt-3 h-2 rounded-full bg-ocean-800 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, risk.riskScore)}%`,
                      backgroundColor: getRiskColor(risk.riskLevel),
                      boxShadow: `0 0 8px ${getRiskColor(risk.riskLevel)}40`,
                    }}
                  />
                </div>
              </div>

              {expandedId === risk.id && (
                <div className="border-t border-teal-glow-500/10 p-5 bg-ocean-800/30">
                  <h4 className="text-sm font-medium text-white mb-4">风险构成因素</h4>

                  <div className="h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={risk.factors} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <XAxis type="number" stroke="rgba(230,244,248,0.3)" fontSize={11} domain={[0, 100]} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="rgba(230,244,248,0.5)"
                          fontSize={12}
                          width={70}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#061726',
                            border: '1px solid rgba(0,212,170,0.2)',
                            borderRadius: '4px',
                            color: '#e6f4f8',
                            fontSize: '12px',
                          }}
                          formatter={(value: number, name: string, props: any) => {
                            const factor = risk.factors.find(f => f.name === props.payload.name);
                            return [`${value} (权重 ${factor?.weight}%)`, name];
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {risk.factors.map((_: RiskFactor, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={risk.riskLevel === 'high' ? '#FF4D4D' : risk.riskLevel === 'medium' ? '#FFB020' : '#00D4AA'}
                              fillOpacity={0.3 + (risk.factors[index].value / 100) * 0.7}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {risk.factors.map((factor) => (
                      <div key={factor.name} className="flex items-center justify-between text-sm">
                        <span className="text-ocean-200/60">{factor.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-ocean-200/40 text-xs">权重 {factor.weight}%</span>
                          <span
                            className="font-mono w-12 text-right"
                            style={{ color: factor.value > 70 ? '#FF4D4D' : factor.value > 40 ? '#FFB020' : '#00D4AA' }}
                          >
                            {factor.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-teal-glow-500/10">
                    <h4 className="text-sm font-medium text-white mb-3">下一步行动</h4>
                    <div className="p-4 rounded bg-ocean-700/50 border border-teal-glow-500/10">
                      {risk.action === 'supplement' && (
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-risk-high mt-0.5" />
                          <div>
                            <div className="text-white font-medium">需要补充材料</div>
                            <p className="text-sm text-ocean-200/60 mt-1">
                              当前数据不足以支撑风险判断，建议补充采集相关数据或提供更多背景材料后重新评估。
                            </p>
                          </div>
                        </div>
                      )}
                      {risk.action === 'adjust' && (
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-risk-medium mt-0.5" />
                          <div>
                            <div className="text-white font-medium">建议调整判读口径</div>
                            <p className="text-sm text-ocean-200/60 mt-1">
                              数据存在冲突或偏差，建议海洋老师复核判读标准，调整后重新计算风险等级。
                            </p>
                          </div>
                        </div>
                      )}
                      {risk.action === 'normal' && (
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-risk-low mt-0.5" />
                          <div>
                            <div className="text-white font-medium">正常流转</div>
                            <p className="text-sm text-ocean-200/60 mt-1">
                              数据质量良好，风险等级合理，可正常用于作业决策。
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode && (
        <div className="card-ocean rounded-lg p-5 border-l-4 border-l-teal-glow-500">
          <h3 className="text-base font-medium text-white mb-2">数据使用说明</h3>
          <ul className="text-sm text-ocean-100/70 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-data-status-available mt-1.5" />
              <span><strong className="text-data-status-available">可用</strong>：数据可直接用于作业决策</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-data-status-pending mt-1.5" />
              <span><strong className="text-data-status-pending">暂缓</strong>：请联系海洋老师确认判读口径后使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-data-status-recollect mt-1.5" />
              <span><strong className="text-data-status-recollect">重采</strong>：数据不可用，等待现场重新采集</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
