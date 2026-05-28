import { PageContainer } from '@/components/layout/PageContainer';
import { ReservePoolCard } from '@/components/reserve/ReservePoolCard';
import { useAppStore } from '@/store/useAppStore';
import { generateOverdraftPrompt, generateCrossBatchPrompt } from '@/utils/anomalyDetection';
import { WarningPromptBox } from '@/components/reserve/WarningPromptBox';
import { AlertTriangle, Lock, Zap } from 'lucide-react';
import { useMemo } from 'react';

export default function ReservePool() {
  const reservePools = useAppStore(state => state.reservePools);
  const refundOrders = useAppStore(state => state.refundOrders);
  const batches = useAppStore(state => state.batches);

  const warnings = useMemo(() => {
    const result: Array<{
      type: 'warning' | 'danger';
      title: string;
      prompt: string;
      icon: React.ReactNode;
    }> = [];

    for (const pool of reservePools) {
      if (pool.availableBalance < 0) {
        const poolRefunds = refundOrders.filter(r => r.reservePoolId === pool.id && r.isOverdraft);
        if (poolRefunds.length > 0) {
          result.push({
            type: 'danger',
            title: `${pool.merchantName} 备付金已透支 ${poolRefunds.length} 笔`,
            prompt: generateOverdraftPrompt(poolRefunds[0], pool),
            icon: <Zap size={20} />,
          });
        }
      }
    }

    const crossBatchRefunds = refundOrders.filter(r => r.isCrossBatch);
    if (crossBatchRefunds.length > 0) {
      result.push({
        type: 'warning',
        title: `存在 ${crossBatchRefunds.length} 笔跨批次冻结退款单`,
        prompt: generateCrossBatchPrompt(crossBatchRefunds[0], batches),
        icon: <Lock size={20} />,
      });
    }

    const duplicateRefunds = refundOrders.filter(r => r.isDuplicate && !r.duplicateExplanation);
    if (duplicateRefunds.length > 0) {
      result.push({
        type: 'danger',
        title: `存在 ${duplicateRefunds.length} 笔未解释的重复退款`,
        prompt: `【重复退款待处理告警】
检测到 ${duplicateRefunds.length} 笔重复退款尚未填写解释
涉及退款单：${duplicateRefunds.map(r => r.id).join('、')}
处理建议：
1. 逐笔核实重复退款原因
2. 对于确实需要重复退款的情况，填写详细解释
3. 对于误操作的重复退款，及时驳回
建议话术："您好，我们检测到您的订单存在多笔退款申请，为保障您的资金安全，我们需要与您核实后再处理。"`,
        icon: <AlertTriangle size={20} />,
      });
    }

    return result;
  }, [reservePools, refundOrders, batches]);

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black font-mono text-slate-800">
          备付金池概览
        </h2>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-3 mb-6">
          {warnings.map((warning, index) => (
            <WarningPromptBox
              key={index}
              type={warning.type}
              title={warning.title}
              prompt={warning.prompt}
              icon={warning.icon}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reservePools.map(pool => (
          <ReservePoolCard key={pool.id} pool={pool} />
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-100 border-2 border-slate-200 rounded-lg">
        <h3 className="font-mono font-bold text-slate-700 mb-2">💡 动态锁定逻辑说明</h3>
        <ul className="text-sm text-slate-600 space-y-1 font-mono">
          <li>• 批次状态变化时，系统自动重新计算该批次所有退款单的冻结金额</li>
          <li>• 非终态（待审核、已通过、已冻结）的退款单金额全额冻结</li>
          <li>• 跨批次退款单额外冻结 50% 金额</li>
          <li>• 重复退款单全额重复冻结（即一笔重复退款占用双倍额度）</li>
          <li>• 冻结金额变化后，自动重新检查所有退款单的透支状态和重复退款状态</li>
          <li>• 可用余额 = 总余额 - 冻结金额，低于 0 时标记为透支</li>
        </ul>
      </div>
    </PageContainer>
  );
}
