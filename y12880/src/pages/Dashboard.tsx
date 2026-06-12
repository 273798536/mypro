import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Shield,
  FileText,
  ChevronRight,
  Clock,
  Database,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import api from '@/lib/api';
import { RiskBadge, DataStatusBadge } from '@/components/Badges';
import type { ConflictRecord, BatchInfo } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { riskOverview, viewMode, currentBatchId, fetchRiskOverview } = useAppStore();
  const [recentConflicts, setRecentConflicts] = useState<ConflictRecord[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskOverview();
    loadData();
  }, [currentBatchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [conflictsRes, batchesRes] = await Promise.all([
        api.getConflicts({ pageSize: 5 }),
        api.getBatches(),
      ]);
      setRecentConflicts(conflictsRes.items);
      setBatches(batchesRes.items);
    } finally {
      setLoading(false);
    }
  };

  const riskData = riskOverview
    ? [
        { name: '高风险', value: riskOverview.high, color: '#FF4D4D' },
        { name: '中风险', value: riskOverview.medium, color: '#FFB020' },
        { name: '低风险', value: riskOverview.low, color: '#00D4AA' },
      ]
    : [];

  const totalEquipment = riskOverview
    ? riskOverview.high + riskOverview.medium + riskOverview.low
    : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">总览仪表盘</h1>
          <p className="text-sm text-ocean-200/50 mt-1">
            {viewMode === 'fleet'
              ? '船队视图：绿色可直接使用，黄色请联系海洋老师'
              : '专业视图：完整数据与溯源信息'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-ocean-200/40">数据更新时间</div>
          <div className="text-sm font-mono text-teal-glow-400">
            {new Date().toLocaleString('zh-CN')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="设备总数"
          value={totalEquipment}
          color="teal"
          onClick={() => navigate('/risks')}
        />
        <StatCard
          icon={AlertTriangle}
          label="高风险"
          value={riskOverview?.high || 0}
          color="red"
          onClick={() => navigate('/risks?level=high')}
        />
        <StatCard
          icon={Clock}
          label="待复核"
          value={riskOverview?.pending || 0}
          color="yellow"
          onClick={() => navigate('/conflicts')}
        />
        <StatCard
          icon={Database}
          label="数据可用率"
          value={totalEquipment > 0 ? `${Math.round(((riskOverview?.available || 0) / totalEquipment) * 100)}%` : '--'}
          color="green"
          onClick={() => navigate('/data')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-ocean rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">风险分层统计</h2>
            <button
              onClick={() => navigate('/risks')}
              className="text-sm text-teal-glow-400 hover:text-teal-glow-300 flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" stroke="rgba(230,244,248,0.3)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="rgba(230,244,248,0.5)" fontSize={12} width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#061726',
                    border: '1px solid rgba(0,212,170,0.2)',
                    borderRadius: '4px',
                    color: '#e6f4f8',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-teal-glow-500/10">
            <div className="text-sm text-ocean-200/50 mb-3">数据状态分布</div>
            <div className="h-3 rounded-full bg-ocean-800 overflow-hidden flex">
              <div
                className="bg-data-status-available transition-all duration-500"
                style={{ width: riskOverview ? `${(riskOverview.available / totalEquipment) * 100}%` : '0%' }}
              />
              <div
                className="bg-data-status-pending transition-all duration-500"
                style={{ width: riskOverview ? `${(riskOverview.pending / totalEquipment) * 100}%` : '0%' }}
              />
              <div
                className="bg-data-status-recollect transition-all duration-500"
                style={{ width: riskOverview ? `${(riskOverview.recollect / totalEquipment) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-data-status-available" />
                <span className="text-ocean-200/60">可用 {riskOverview?.available || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-data-status-pending" />
                <span className="text-ocean-200/60">暂缓 {riskOverview?.pending || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-data-status-recollect" />
                <span className="text-ocean-200/60">重采 {riskOverview?.recollect || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-ocean rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">最近批次</h2>
            <button
              onClick={() => navigate('/data')}
              className="text-sm text-teal-glow-400 hover:text-teal-glow-300 flex items-center gap-1"
            >
              更多 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {batches.slice(0, 5).map((batch, idx) => (
              <div
                key={batch.id}
                className={`p-3 rounded border border-teal-glow-500/10 hover:border-teal-glow-500/20 transition-colors cursor-pointer ${
                  batch.id === currentBatchId ? 'bg-teal-glow-500/5 border-teal-glow-500/30' : ''
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{batch.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    batch.status === 'completed'
                      ? 'bg-data-status-available/15 text-data-status-available'
                      : 'bg-data-status-pending/15 text-data-status-pending'
                  }`}>
                    {batch.status === 'completed' ? '已完成' : '处理中'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-ocean-200/40">
                    完整度 {(batch.dataCompleteness * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-ocean-200/30">
                    {batch.createdAt?.slice(0, 10)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-ocean rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-risk-medium" />
            最近数据冲突
          </h2>
          <button
            onClick={() => navigate('/conflicts')}
            className="text-sm text-teal-glow-400 hover:text-teal-glow-300 flex items-center gap-1"
          >
            冲突中心 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-ocean-200/40">加载中...</div>
        ) : recentConflicts.length === 0 ? (
          <div className="text-center py-8 text-ocean-200/40">暂无数据冲突</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3">设备</th>
                  <th className="px-4 py-3">时间</th>
                  <th className="px-4 py-3">严重度</th>
                  <th className="px-4 py-3">偏差率</th>
                  <th className="px-4 py-3">说明</th>
                  <th className="px-4 py-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {recentConflicts.map((conflict) => (
                  <tr key={conflict.id} className="cursor-pointer" onClick={() => navigate('/conflicts')}>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{conflict.equipmentName}</div>
                      <div className="text-xs text-ocean-200/40">{conflict.platformName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ocean-100/70 font-mono">
                      {conflict.timestamp}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={conflict.severity} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-mono ${
                        conflict.severity === 'high' ? 'text-risk-high' :
                        conflict.severity === 'medium' ? 'text-risk-medium' : 'text-risk-low'
                      }`}>
                        {conflict.diffRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ocean-100/60 max-w-xs truncate">
                      {conflict.explanation}
                    </td>
                    <td className="px-4 py-3">
                      {conflict.status === 'pending' ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-risk-medium/15 text-risk-medium">
                          待处理
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-risk-low/15 text-risk-low">
                          已解决
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewMode === 'fleet' && (
        <div className="card-ocean rounded-lg p-5 border-l-4 border-l-teal-glow-500">
          <h3 className="text-base font-medium text-white mb-2">船队作业须知</h3>
          <ul className="text-sm text-ocean-100/70 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-data-status-available mt-1.5" />
              <span><strong className="text-data-status-available">绿色（可用）</strong>：数据可直接用于作业决策</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-data-status-pending mt-1.5" />
              <span><strong className="text-data-status-pending">黄色（暂缓）</strong>：请联系海洋老师确认判读口径后使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-data-status-recollect mt-1.5" />
              <span><strong className="text-data-status-recollect">红色（重采）</strong>：数据不可用，等待现场重新采集</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: 'teal' | 'red' | 'yellow' | 'green';
  onClick?: () => void;
}) {
  const colorMap = {
    teal: 'text-teal-glow-400 from-teal-glow-500/20 to-transparent',
    red: 'text-risk-high from-risk-high/20 to-transparent',
    yellow: 'text-risk-medium from-risk-medium/20 to-transparent',
    green: 'text-risk-low from-risk-low/20 to-transparent',
  };

  return (
    <div
      className={`card-ocean rounded-lg p-5 cursor-pointer transition-all hover:translate-y-[-2px] bg-gradient-to-br ${colorMap[color]}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-ocean-200/60">{label}</span>
        <Icon className={`w-5 h-5 ${colorMap[color].split(' ')[0]}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}
