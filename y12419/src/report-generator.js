const { formatISO, format } = require('date-fns');
const { groupBy } = require('lodash');

class TaxReportGenerator {
  constructor() {
    this.generatedAt = new Date();
  }

  generateHTML(result, alignedData) {
    const summary = result.summary;
    const flags = summary.flags;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web3空投税务台账报告</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; line-height: 1.6; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .section h2 { font-size: 20px; margin-bottom: 20px; color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .section h3 { font-size: 16px; margin: 20px 0 12px; color: #4a5568; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .summary-card { background: #f7fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; }
    .summary-card .label { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card .value { font-size: 24px; font-weight: 700; color: #2d3748; margin-top: 4px; }
    .summary-card.positive { border-left-color: #48bb78; }
    .summary-card.warning { border-left-color: #ed8936; }
    .summary-card.danger { border-left-color: #f56565; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f7fafc; font-weight: 600; color: #4a5568; }
    tr:hover { background: #f7fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
    .badge-airdrop { background: #e6fffa; color: #234e52; }
    .badge-unlock { background: #fffaf0; color: #744210; }
    .badge-disposal { background: #fef5f5; color: #742a2a; }
    .badge-internal { background: #edf2f7; color: #4a5568; }
    .badge-price-gap { background: #feebc8; color: #7b341e; }
    .badge-duplicate { background: #fed7d7; color: #742a2a; }
    .badge-withdrawn { background: #fce7f3; color: #702459; }
    .alert { padding: 16px; border-radius: 8px; margin-bottom: 16px; }
    .alert-warning { background: #fffaf0; border-left: 4px solid #ed8936; }
    .alert-info { background: #ebf8ff; border-left: 4px solid #3182ce; }
    .alert-title { font-weight: 600; margin-bottom: 8px; }
    .alert-content { font-size: 14px; color: #4a5568; }
    .recommendation-list { list-style: none; }
    .recommendation-list li { padding: 8px 0; padding-left: 24px; position: relative; }
    .recommendation-list li:before { content: "💡"; position: absolute; left: 0; }
    .processing-notes { background: #f7fafc; padding: 16px; border-radius: 8px; font-size: 13px; color: #718096; }
    .processing-notes code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Web3空投税务台账报告</h1>
      <p>生成时间: ${format(this.generatedAt, 'yyyy-MM-dd HH:mm:ss')} | 数据来源: 钱包流水 + 空投公告 + 币价快照</p>
    </div>

    <div class="section">
      <h2>📈 执行摘要</h2>
      <div class="summary-grid">
        <div class="summary-card positive">
          <div class="label">空投总收入</div>
          <div class="value">$${summary.totalAirdropIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-card">
          <div class="label">资产处置总额</div>
          <div class="value">$${summary.totalDisposals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-card ${summary.totalCapitalGains >= 0 ? 'positive' : 'danger'}">
          <div class="label">资本利得/损失</div>
          <div class="value">$${summary.totalCapitalGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-card warning">
          <div class="label">提前解锁价值</div>
          <div class="value">$${summary.totalEarlyUnlockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🔒 锁仓追踪</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">已解锁代币</div>
          <div class="value">${summary.vestingSummary.totalUnlocked.toFixed(4)}</div>
        </div>
        <div class="summary-card warning">
          <div class="label">仍在锁仓</div>
          <div class="value">${summary.vestingSummary.totalLocked.toFixed(4)}</div>
        </div>
        <div class="summary-card danger">
          <div class="label">提前解锁</div>
          <div class="value">${summary.vestingSummary.totalEarlyUnlocked.toFixed(4)}</div>
        </div>
      </div>
      ${summary.vestingSummary.upcomingVestings.length > 0 ? `
      <h3>即将解锁</h3>
      <table>
        <thead>
          <tr>
            <th>代币</th>
            <th>数量</th>
            <th>计划解锁日期</th>
          </tr>
        </thead>
        <tbody>
          ${summary.vestingSummary.upcomingVestings.slice(0, 10).map(v => `
            <tr>
              <td>${v.tokenSymbol}</td>
              <td>${v.amount.toFixed(4)}</td>
              <td>${format(v.vestingDate, 'yyyy-MM-dd')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
    </div>

    ${this._generateFlagsSection(flags)}

    <div class="section">
      <h2>📋 税务明细记录</h2>
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th>代币</th>
            <th>数量</th>
            <th>单价(USD)</th>
            <th>价值(USD)</th>
            <th>损益(USD)</th>
            <th>持有期</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${result.taxRecords.map(r => `
            <tr>
              <td>${format(r.timestamp, 'yyyy-MM-dd')}</td>
              <td>${this._getEventTypeBadge(r.eventType)}</td>
              <td>${r.tokenSymbol}</td>
              <td>${r.amount.toFixed(4)}</td>
              <td>$${r.priceUSD.toFixed(2)}</td>
              <td>$${r.valueUSD.toFixed(2)}</td>
              <td style="color: ${r.gainLossUSD >= 0 ? '#38a169' : '#e53e3e'}">$${r.gainLossUSD.toFixed(2)}</td>
              <td>${r.holdingPeriod}</td>
              <td>${r.notes} ${r.flags.includes('price_gap') ? '<span class="badge badge-price-gap">币价缺口</span>' : ''} ${r.flags.includes('withdrawn_airdrop') ? '<span class="badge badge-withdrawn">公告撤回</span>' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>💡 处理建议与说明</h2>
      
      ${flags.priceGaps.length > 0 ? `
      <div class="alert alert-warning">
        <div class="alert-title">币价缺口处理说明 (${flags.priceGaps.length} 处)</div>
        <div class="alert-content">
          <p>以下代币在特定日期存在币价数据缺口:</p>
          <ul class="recommendation-list">
            ${[...new Set(flags.priceGaps.map(g => g.token))].map(token => `
              <li><strong>${token}</strong>: 建议补充 ${flags.priceGaps.filter(g => g.token === token).length} 处日期的币价数据以提高准确性</li>
            `).join('')}
          </ul>
          <p><strong>当前处理方式:</strong> 使用前后7天内的币价进行线性插值估算。如需更高准确性,请补充完整币价数据后重新运行。</p>
        </div>
      </div>
      ` : ''}

      ${flags.earlyUnlocks.length > 0 ? `
      <div class="alert alert-warning">
        <div class="alert-title">锁仓提前解锁处理 (${flags.earlyUnlocks.length} 笔)</div>
        <div class="alert-content">
          <p>检测到 ${flags.earlyUnlocks.length} 笔资产在原计划解锁日期前完成了解锁:</p>
          <ul class="recommendation-list">
            ${flags.earlyUnlocks.slice(0, 5).map(u => `
              <li>原计划 ${format(new Date(u.originalDate), 'yyyy-MM-dd')} 解锁,实际于 ${format(new Date(u.actualDate), 'yyyy-MM-dd')} 解锁</li>
            `).join('')}
          </ul>
          <p><strong>税务影响:</strong> 提前解锁可能导致短期资本利得税适用,请咨询专业税务顾问确认具体处理方式。</p>
        </div>
      </div>
      ` : ''}

      ${flags.duplicateTransfers.length > 0 ? `
      <div class="alert alert-info">
        <div class="alert-title">内部转账重复检测 (${flags.duplicateTransfers.length} 笔)</div>
        <div class="alert-content">
          <p>系统检测到疑似重复的内部转账记录:</p>
          <ul class="recommendation-list">
            ${flags.duplicateTransfers.slice(0, 5).map(d => `
              <li>${d.reason}</li>
            `).join('')}
          </ul>
          <p><strong>处理建议:</strong> 重复的内部转账不计入税务计算,但建议核对原始交易数据确保准确性。</p>
        </div>
      </div>
      ` : ''}

      ${flags.withdrawalImpacts.length > 0 ? `
      <div class="alert alert-warning">
        <div class="alert-title">公告撤回影响标记 (${flags.withdrawalImpacts.length} 条)</div>
        <div class="alert-content">
          <p>以下记录关联的空投公告已被项目方撤回:</p>
          <ul class="recommendation-list">
            <li>共有 ${flags.withdrawalImpacts.length} 条税务记录受影响,已在明细中标记</li>
            <li>请与项目方确认撤回原因及是否有补发计划</li>
            <li>建议咨询税务顾问确认已确认收入的调整方式</li>
          </ul>
        </div>
      </div>
      ` : ''}

      <div class="processing-notes">
        <strong>📝 数据处理说明:</strong>
        <ul>
          <li>成本计算方法: <code>FIFO (先进先出)</code></li>
          <li>长期持有判定: <code>365天</code></li>
          <li>币价插值最大缺口: <code>7天</code></li>
          <li>交易-公告匹配窗口: <code>1440分钟</code></li>
          <li>本报告仅供参考,不构成税务建议。请咨询专业税务顾问。</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>📊 按代币汇总</h2>
      <table>
        <thead>
          <tr>
            <th>代币</th>
            <th>记录数</th>
            <th>总价值(USD)</th>
            <th>总损益(USD)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(summary.byToken).map(([token, data]) => `
            <tr>
              <td><strong>${token}</strong></td>
              <td>${data.count}</td>
              <td>$${data.totalValue.toFixed(2)}</td>
              <td style="color: ${data.totalGainLoss >= 0 ? '#38a169' : '#e53e3e'}">$${data.totalGainLoss.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  }

  _generateFlagsSection(flags) {
    const hasFlags = flags.priceGaps.length > 0 || flags.earlyUnlocks.length > 0 ||
                     flags.duplicateTransfers.length > 0 || flags.withdrawalImpacts.length > 0 ||
                     flags.priceUpdates.length > 0;

    if (!hasFlags) return '';

    return `
    <div class="section">
      <h2>⚠️ 处理标志与异常检测</h2>
      <div class="summary-grid">
        <div class="summary-card ${flags.priceGaps.length > 0 ? 'warning' : ''}">
          <div class="label">币价缺口</div>
          <div class="value">${flags.priceGaps.length}</div>
        </div>
        <div class="summary-card ${flags.earlyUnlocks.length > 0 ? 'danger' : ''}">
          <div class="label">提前解锁</div>
          <div class="value">${flags.earlyUnlocks.length}</div>
        </div>
        <div class="summary-card ${flags.duplicateTransfers.length > 0 ? 'warning' : ''}">
          <div class="label">重复转账</div>
          <div class="value">${flags.duplicateTransfers.length}</div>
        </div>
        <div class="summary-card ${flags.withdrawalImpacts.length > 0 ? 'danger' : ''}">
          <div class="label">撤回影响</div>
          <div class="value">${flags.withdrawalImpacts.length}</div>
        </div>
      </div>
    </div>`;
  }

  _getEventTypeBadge(type) {
    const badges = {
      'airdrop_income': '<span class="badge badge-airdrop">空投收入</span>',
      'early_unlock': '<span class="badge badge-unlock">提前解锁</span>',
      'disposal': '<span class="badge badge-disposal">资产处置</span>',
      'internal_transfer': '<span class="badge badge-internal">内部转账</span>'
    };
    return badges[type] || type;
  }

  generateJSON(result, alignedData) {
    return {
      generatedAt: this.generatedAt.toISOString(),
      summary: result.summary,
      taxRecords: result.taxRecords.map(r => ({
        id: r.id,
        timestamp: r.timestamp.toISOString(),
        tokenSymbol: r.tokenSymbol,
        eventType: r.eventType,
        amount: r.amount,
        priceUSD: r.priceUSD,
        valueUSD: r.valueUSD,
        gainLossUSD: r.gainLossUSD,
        holdingPeriod: r.holdingPeriod,
        costBasis: r.costBasis,
        txHash: r.txHash,
        notes: r.notes,
        flags: r.flags
      })),
      vestingEvents: result.vestingEvents.map(v => ({
        id: v.id,
        tokenSymbol: v.tokenSymbol,
        amount: v.amount,
        vestingDate: v.vestingDate.toISOString(),
        isUnlocked: v.isUnlocked,
        unlockDate: v.unlockDate?.toISOString(),
        earlyUnlock: v.earlyUnlock,
        earlyUnlockReason: v.earlyUnlockReason
      })),
      alignment: {
        totalTransactions: alignedData.transactions.length,
        airdropTransactions: alignedData.airdropTransactions.length,
        matchedAirdrops: alignedData.airdropTransactions.filter(t => t.alignmentStatus === 'matched').length,
        internalTransfers: alignedData.internalTransfers.length,
        duplicateInternalTransfers: alignedData.internalTransfers.filter(t => t.isDuplicate).length
      },
      processingFlags: {
        priceGaps: result.summary.flags.priceGaps,
        earlyUnlocks: result.summary.flags.earlyUnlocks,
        duplicateTransfers: result.summary.flags.duplicateTransfers,
        withdrawalImpacts: result.summary.flags.withdrawalImpacts,
        priceUpdates: result.summary.flags.priceUpdates
      }
    };
  }
}

module.exports = TaxReportGenerator;
