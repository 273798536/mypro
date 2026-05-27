import { GameState, RoundRecord, CashFlowItem } from '@/types/game';

export function exportGameToCSV(game: GameState): string {
  const rows: string[] = [];

  rows.push('汇率避险经营赛 - 经营报告');
  rows.push(`游戏ID: ${game.id}`);
  rows.push(`开始时间: ${new Date(game.createdAt).toLocaleString('zh-CN')}`);
  rows.push(`结束时间: ${new Date(game.updatedAt).toLocaleString('zh-CN')}`);
  rows.push(`游戏状态: ${game.status === 'bankrupt' ? '破产' : '完成'}`);
  rows.push(`最终现金: ¥${game.cash.toFixed(2)}`);
  rows.push(`最终库存: ${game.inventory}件`);
  rows.push(`总回合数: ${game.round}`);
  if (game.endReason) {
    rows.push(`结束原因: ${game.endReason}`);
  }
  rows.push('');

  rows.push('回合汇总表');
  rows.push('回合,汇率,远期汇率,净利润,期末现金,期末库存,主要事件');
  for (const record of game.history) {
    const eventSummary = record.events
      .map(e => e.message)
      .join('; ');
    rows.push(
      `${record.round},${record.exchangeRate},${record.forwardRate},` +
      `${record.netProfit.toFixed(2)},${record.endingCash.toFixed(2)},` +
      `${record.endingInventory},"${eventSummary}"`
    );
  }
  rows.push('');

  rows.push('现金流明细表');
  rows.push('回合,类别,描述,金额');
  for (const record of game.history) {
    for (const cf of record.cashFlow) {
      rows.push(
        `${record.round},${getCategoryName(cf.category)},"${cf.description}",${cf.amount.toFixed(2)}`
      );
    }
  }
  rows.push('');

  rows.push('订单记录表');
  rows.push('回合,订单ID,数量,货币,单价,交货回合,状态,取消概率');
  for (const record of game.history) {
    for (const order of record.orders) {
      rows.push(
        `${record.round},${order.id},${order.amount},${order.currency},` +
        `${order.unitPrice},${order.deliveryRound},${getOrderStatusName(order.status)},` +
        `${(order.cancelProbability * 100).toFixed(0)}%`
      );
    }
  }
  rows.push('');

  rows.push('远期合约记录表');
  rows.push('回合,合约ID,订单ID,锁定汇率,锁汇金额,到期回合,状态');
  for (const record of game.history) {
    for (const contract of record.contracts) {
      rows.push(
        `${record.round},${contract.id},${contract.orderId},${contract.lockedRate},` +
        `${contract.amount},${contract.maturityRound},${getContractStatusName(contract.status)}`
      );
    }
  }

  return rows.join('\n');
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    revenue: '收入',
    cost: '成本',
    fee: '费用',
    penalty: '罚款',
  };
  return names[category] || category;
}

function getOrderStatusName(status: string): string {
  const names: Record<string, string> = {
    pending: '待处理',
    accepted: '已接受',
    cancelled: '已取消',
    delivered: '已交货',
  };
  return names[status] || status;
}

function getContractStatusName(status: string): string {
  const names: Record<string, string> = {
    active: '有效',
    exercised: '已行权',
    expired: '已过期',
  };
  return names[status] || status;
}

export function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateFilename(game: GameState): string {
  const dateStr = new Date(game.updatedAt).toISOString().slice(0, 10);
  const status = game.status === 'bankrupt' ? '破产' : '完成';
  return `汇率避险经营赛_${dateStr}_${status}_¥${Math.round(game.cash)}.csv`;
}
