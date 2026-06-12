import RiskList from '@/components/RiskPanel/RiskList';
import { AlertTriangle, AlertOctagon, Database, Radio, TrendingUp } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { useSampleStore } from '@/store/useSampleStore';
import { INITIAL_WATER_QUALITIES } from '@/utils/mockData';

export default function RisksPage() {
  const { risks } = useReviewStore();
  const { samples } = useSampleStore();

  const highRisks = risks.filter((r) => r.level === 'high' && !r.isResolved);
  const mediumRisks = risks.filter((r) => r.level === 'medium' && !r.isResolved);
  const lowRisks = risks.filter((r) => r.level === 'low' && !r.isResolved);
  const resolved = risks.filter((r) => r.isResolved);

  const missingWater = INITIAL_WATER_QUALITIES.filter((w) => w.isMissing).length;
  const offlineBuoySamples = samples.filter((s) => s.buoyId === 'BOU-B01' && s.riskLevel === 'high').length;
  const anomalySamples = samples.filter((s) => s.notes?.includes('赤潮前兆')).length;

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 flex flex-col p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-crimson-risk/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-crimson-risk" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-ocean-50">风险通报中心</h2>
              <p className="text-xs text-ocean-400 mt-0.5">
                浮标离线、水质缺失、计数异常等边界情况处理
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-crimson-risk/20 flex items-center justify-center">
                <Radio size={14} className="text-crimson-risk" />
              </div>
              <div>
                <div className="text-[10px] text-ocean-400 uppercase tracking-wider">浮标离线</div>
                <div className="font-display font-bold text-xl text-crimson-risk">{highRisks.length}</div>
              </div>
            </div>
            <p className="text-[11px] text-ocean-400">影响样本 {offlineBuoySamples} 条，置信度降低 35%</p>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-risk/20 flex items-center justify-center">
                <Database size={14} className="text-amber-risk" />
              </div>
              <div>
                <div className="text-[10px] text-ocean-400 uppercase tracking-wider">水质缺失</div>
                <div className="font-display font-bold text-xl text-amber-risk">{mediumRisks.length}</div>
              </div>
            </div>
            <p className="text-[11px] text-ocean-400">共 {missingWater} 条样本参数缺失，已降级计算</p>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-glow/20 flex items-center justify-center">
                <AlertOctagon size={14} className="text-cyan-glow" />
              </div>
              <div>
                <div className="text-[10px] text-ocean-400 uppercase tracking-wider">计数异常</div>
                <div className="font-display font-bold text-xl text-cyan-glow">{lowRisks.length}</div>
              </div>
            </div>
            <p className="text-[11px] text-ocean-400">{anomalySamples} 条超出 3σ 阈值，需人工复核</p>
          </div>

          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-ocean-500/30 flex items-center justify-center">
                <TrendingUp size={14} className="text-ocean-200" />
              </div>
              <div>
                <div className="text-[10px] text-ocean-400 uppercase tracking-wider">已处理</div>
                <div className="font-display font-bold text-xl text-ocean-200">{resolved.length}</div>
              </div>
            </div>
            <p className="text-[11px] text-ocean-400">风险闭环率 {risks.length > 0 ? Math.round((resolved.length / risks.length) * 100) : 0}%</p>
          </div>
        </div>

        <div className="glass-panel p-5 mb-4">
          <h3 className="font-display font-semibold text-ocean-100 text-sm mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-risk" /> 真实边界样例说明
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-crimson-risk/5 border border-crimson-risk/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Radio size={12} className="text-crimson-risk" />
                <span className="font-semibold text-crimson-risk">浮标离线</span>
              </div>
              <p className="text-ocean-300 leading-relaxed">
                浮标 BOU-B01 通讯中断超过 6 小时，连续 4 个采样周期无数据回传。
                系统自动将该浮标关联样本标记为高风险，计数结果乘以 0.65 系数，
                并在地图上用红色虚线圈出影响区域。
              </p>
            </div>
            <div className="bg-amber-risk/5 border border-amber-risk/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Database size={12} className="text-amber-risk" />
                <span className="font-semibold text-amber-risk">水质缺失</span>
              </div>
              <p className="text-ocean-300 leading-relaxed">
                约 12% 的采样记录存在温度、盐度、pH、溶解氧等参数缺失。
                系统采用「不整批失败」策略：先完成可计算的计数，
                根据缺失字段数量给予 0.6~0.8 权重系数，并在明细面板列出缺口供补录。
              </p>
            </div>
            <div className="bg-cyan-glow/5 border border-cyan-glow/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertOctagon size={12} className="text-cyan-glow" />
                <span className="font-semibold text-cyan-glow">计数异常</span>
              </div>
              <p className="text-ocean-300 leading-relaxed">
                样本 sample-001（夜光藻 / 表层）计数 1850，超过同水层同期均值 3.1 倍标准差，
                疑似台风前赤潮前兆。系统自动标记低风险并推送至待复核清单，
                供潜水教练结合现场照片和邻近站点交叉验证。
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel-strong p-4 flex-1 overflow-hidden flex flex-col">
          <RiskList />
        </div>
      </div>
    </div>
  );
}
