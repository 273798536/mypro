import { useState } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Zap,
  Lock,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Layers,
  DollarSign,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import type {
  MarginCalculationResult,
  Position,
  Trade,
  FundFlow,
  NightMarketData,
  MarginRateChange,
  EvidenceItem,
} from '../types';
import {
  formatCurrency,
  formatPercent,
  getVersionSourceLabel,
  getStatusLabel,
  getRiskLabel,
  getFundFlowTypeLabel,
  getDirectionLabel,
} from '../utils/marginCalculator';

interface DetailPageProps {
  result: MarginCalculationResult | null;
  positions: Position[];
  trades: Trade[];
  fundFlows: FundFlow[];
  nightMarketData: NightMarketData[];
  marginRateChanges: MarginRateChange[];
  onBack: () => void;
  allResults: MarginCalculationResult[];
  onSelectResult: (result: MarginCalculationResult) => void;
}

type SectionType = 'overview' | 'positions' | 'trades' | 'funds' | 'nightmarket' | 'evidence';

export function DetailPage({
  result,
  positions,
  trades,
  fundFlows,
  nightMarketData,
  marginRateChanges,
  onBack,
  allResults,
  onSelectResult,
}: DetailPageProps) {
  const [activeSection, setActiveSection] = useState<SectionType>('overview');
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  if (!result) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">请从概览页面选择一个客户查看明细</p>
        </div>
      </div>
    );
  }

  const customerPositions = positions.filter((p) => p.customerId === result.customerId);
  const customerTrades = trades.filter((t) => t.customerId === result.customerId);
  const customerFundFlows = fundFlows.filter((f) => f.customerId === result.customerId);
  const affectedContracts = new Set(customerPositions.map((p) => p.contractCode));
  const relevantNightMarket = nightMarketData.filter((nm) => affectedContracts.has(nm.contractCode));
  const relevantMarginRateChanges = marginRateChanges.filter((mrc) =>
    affectedContracts.has(mrc.contractCode)
  );

  const sections = [
    { id: 'overview' as const, label: '核对概览', icon: FileText },
    { id: 'positions' as const, label: '客户持仓', icon: Layers },
    { id: 'trades' as const, label: '成交流水', icon: ArrowUpDown },
    { id: 'funds' as const, label: '出入金记录', icon: DollarSign },
    { id: 'nightmarket' as const, label: '夜盘行情', icon: Zap },
    { id: 'evidence' as const, label: '证据链', icon: AlertCircle, badge: result.evidence.length },
  ];

  const togglePositionExpand = (posId: string) => {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(posId)) {
        next.delete(posId);
      } else {
        next.add(posId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            返回概览
          </button>
          
          <h3 className="font-semibold text-gray-900">{result.customerName}</h3>
          <p className="text-sm text-gray-500">交易日：{result.tradeDate}</p>
        </div>

        <div className="p-2 border-b border-gray-200">
          <p className="text-xs text-gray-500 mb-2 px-2">切换客户</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {allResults.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectResult(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  r.id === result.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{r.customerName}</span>
                  <span
                    className={`badge ${
                      r.status === 'matched'
                        ? 'badge-success'
                        : r.status === 'mismatch'
                        ? 'badge-danger'
                        : 'badge-warning'
                    }`}
                  >
                    {getStatusLabel(r.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
                {section.badge !== undefined && section.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {section.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">核对结果概览</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">状态</p>
                    <div className="mt-1">
                      <span
                        className={`badge ${
                          result.status === 'matched'
                            ? 'badge-success'
                            : result.status === 'mismatch'
                            ? 'badge-danger'
                            : result.status === 'manual'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {getStatusLabel(result.status)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">风险等级</p>
                    <div className="mt-1">
                      <span
                        className={`badge ${
                          result.riskLevel === 'critical'
                            ? 'badge-danger'
                            : result.riskLevel === 'high'
                            ? 'badge-warning'
                            : result.riskLevel === 'medium'
                            ? 'badge-info'
                            : 'badge-success'
                        }`}
                      >
                        {getRiskLabel(result.riskLevel)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">数据版本</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {getVersionSourceLabel(result.versionSource)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">计算时间</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {new Date(result.calculatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-gray-500">持仓保证金</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(result.positionMargin)}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpDown className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-500">成交保证金</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(result.tradeMargin)}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4 bg-primary-50">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-primary-600" />
                      <span className="text-sm text-primary-600">应缴保证金合计</span>
                    </div>
                    <p className="text-2xl font-bold text-primary-700">
                      {formatCurrency(result.totalRequiredMargin)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">资金明细</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">实缴保证金</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(result.actualMargin)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">可用资金</p>
                      <p className={`text-lg font-semibold ${result.availableFund >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(result.availableFund)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">冻结资金</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {formatCurrency(result.frozenFund)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">差异</p>
                      <p className={`text-lg font-bold ${result.marginDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {result.marginDifference >= 0 ? '+' : ''}
                        {formatCurrency(result.marginDifference)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">特殊标记</h4>
                  <div className="flex flex-wrap gap-3">
                    {result.hasNightJump && (
                      <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">存在夜盘跳价</span>
                      </div>
                    )}
                    {result.hasMarginRateChange && (
                      <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">保证金率调整</span>
                      </div>
                    )}
                    {result.hasOverriddenFundFlow && (
                      <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">出金被冻结覆盖</span>
                      </div>
                    )}
                    {!result.hasNightJump && !result.hasMarginRateChange && !result.hasOverriddenFundFlow && (
                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">无特殊情况</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'positions' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">客户持仓明细</h3>
                  <span className="text-sm text-gray-500">共 {customerPositions.length} 笔持仓</span>
                </div>

                <div className="space-y-4">
                  {customerPositions.map((pos) => (
                    <div
                      key={pos.id}
                      className={`border rounded-lg overflow-hidden ${
                        pos.hasNightJump ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => togglePositionExpand(pos.id)}
                      >
                        <div className="flex items-center gap-4">
                          {expandedPositions.has(pos.id) ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{pos.contractCode}</span>
                              <span
                                className={`badge ${
                                  pos.direction === 'long'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {getDirectionLabel(pos.direction)}
                              </span>
                              {pos.hasNightJump && (
                                <span className="badge bg-amber-100 text-amber-700">
                                  <Zap className="w-3 h-3 mr-1" />
                                  跳价
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              持仓量：{pos.quantity} 手 | 均价：{pos.avgPrice.toFixed(2)} | 最新价：{pos.currentPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">保证金</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(pos.marginAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            保证金率：{formatPercent(pos.marginRate)}
                          </p>
                        </div>
                      </div>

                      {expandedPositions.has(pos.id) && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                          <h5 className="font-medium text-gray-700 mb-3">版本历史</h5>
                          <div className="space-y-3">
                            {pos.versions.map((v, idx) => (
                              <div
                                key={v.version}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  idx === pos.versions.length - 1
                                    ? 'bg-green-100 border border-green-200'
                                    : 'bg-white border border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`badge ${
                                      idx === pos.versions.length - 1 ? 'badge-success' : 'badge-info'
                                    }`}
                                  >
                                    版本 {v.version}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {getVersionSourceLabel(v.source)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {v.timestamp}
                                  </span>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">保证金率</p>
                                    <p className={`text-sm font-medium ${
                                      idx > 0 && v.marginRate !== pos.versions[idx - 1].marginRate
                                        ? 'text-red-600'
                                        : 'text-gray-900'
                                    }`}>
                                      {formatPercent(v.marginRate)}
                                      {idx > 0 && v.marginRate !== pos.versions[idx - 1].marginRate && (
                                        <span className="text-xs ml-1">
                                          ({v.marginRate > pos.versions[idx - 1].marginRate ? '↑' : '↓'}
                                          {formatPercent(Math.abs(v.marginRate - pos.versions[idx - 1].marginRate))})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">保证金金额</p>
                                    <p className={`text-sm font-medium ${
                                      idx > 0 && v.marginAmount !== pos.versions[idx - 1].marginAmount
                                        ? 'text-red-600'
                                        : 'text-gray-900'
                                    }`}>
                                      {formatCurrency(v.marginAmount)}
                                      {idx > 0 && v.marginAmount !== pos.versions[idx - 1].marginAmount && (
                                        <span className="text-xs ml-1">
                                          ({v.marginAmount > pos.versions[idx - 1].marginAmount ? '+' : ''}
                                          {formatCurrency(v.marginAmount - pos.versions[idx - 1].marginAmount)})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {pos.remark && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">备注：</span>
                                {pos.remark}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'trades' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">成交流水明细</h3>
                  <span className="text-sm text-gray-500">共 {customerTrades.length} 笔成交</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">成交时间</th>
                        <th className="table-header">合约</th>
                        <th className="table-header">方向</th>
                        <th className="table-header">数量</th>
                        <th className="table-header">成交价</th>
                        <th className="table-header">保证金率</th>
                        <th className="table-header">保证金</th>
                        <th className="table-header">数据版本</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerTrades.map((trade) => (
                        <tr
                          key={trade.id}
                          className={`${
                            trade.versionSource !== 'day' ? 'bg-amber-50' : ''
                          }`}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {trade.tradeTime}
                            </div>
                          </td>
                          <td className="table-cell font-medium">{trade.contractCode}</td>
                          <td className="table-cell">
                            <span
                              className={`badge ${
                                trade.direction === 'long'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {getDirectionLabel(trade.direction)}
                            </span>
                          </td>
                          <td className="table-cell">{trade.quantity}</td>
                          <td className="table-cell">{trade.price.toFixed(2)}</td>
                          <td className="table-cell">{formatPercent(trade.marginRate)}</td>
                          <td className="table-cell font-mono">{formatCurrency(trade.marginAmount)}</td>
                          <td className="table-cell">
                            <span className={`badge ${
                              trade.versionSource === 'day'
                                ? 'badge-info'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {getVersionSourceLabel(trade.versionSource)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">成交保证金合计</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(customerTrades.reduce((sum, t) => sum + t.marginAmount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'funds' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">出入金记录</h3>
                  <span className="text-sm text-gray-500">共 {customerFundFlows.length} 条记录</span>
                </div>

                <div className="space-y-3">
                  {customerFundFlows.map((fund) => (
                    <div
                      key={fund.id}
                      className={`border rounded-lg p-4 ${
                        fund.overridden
                          ? 'border-red-300 bg-red-50'
                          : fund.type === 'freeze'
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              fund.type === 'deposit'
                                ? 'bg-green-100 text-green-600'
                                : fund.type === 'withdraw'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-orange-100 text-orange-600'
                            }`}
                          >
                            {fund.type === 'deposit' ? (
                              <TrendingDown className="w-5 h-5" />
                            ) : fund.type === 'withdraw' ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : (
                              <Lock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {getFundFlowTypeLabel(fund.type)}
                              </span>
                              <span
                                className={`badge ${
                                  fund.status === 'completed'
                                    ? 'badge-success'
                                    : fund.status === 'pending'
                                    ? 'badge-warning'
                                    : 'badge-danger'
                                }`}
                              >
                                {fund.status === 'completed'
                                  ? '已完成'
                                  : fund.status === 'pending'
                                  ? '处理中'
                                  : '失败'}
                              </span>
                              {fund.overridden && (
                                <span className="badge bg-red-100 text-red-700">已被覆盖</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {fund.timestamp}
                              <span className="mx-2">|</span>
                              版本：{getVersionSourceLabel(fund.versionSource)}
                            </p>
                            {fund.remark && (
                              <p className="text-sm text-gray-600 mt-2">{fund.remark}</p>
                            )}
                            {fund.relatedTradeId && (
                              <p className="text-xs text-gray-500 mt-1">
                                关联成交：{fund.relatedTradeId}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xl font-bold ${
                              fund.type === 'deposit'
                                ? 'text-green-600'
                                : fund.type === 'withdraw' || fund.type === 'freeze'
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}
                          >
                            {fund.type === 'deposit' || fund.type === 'unfreeze' ? '+' : '-'}
                            {formatCurrency(fund.amount)}
                          </p>
                          {fund.overridden && fund.originalAmount && (
                            <p className="text-xs text-gray-500 line-through mt-1">
                              原金额：{formatCurrency(fund.originalAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">入金合计</span>
                    <span className="font-medium text-green-600">
                      +{formatCurrency(
                        customerFundFlows
                          .filter((f) => f.type === 'deposit' && f.status === 'completed')
                          .reduce((sum, f) => sum + f.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">出金合计</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(
                        customerFundFlows
                          .filter((f) => f.type === 'withdraw' && f.status === 'completed')
                          .reduce((sum, f) => sum + f.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">冻结合计</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(
                        customerFundFlows
                          .filter((f) => f.type === 'freeze' && f.status === 'completed')
                          .reduce((sum, f) => sum + f.amount, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">实缴保证金净额</span>
                    <span className="font-bold text-gray-900">{formatCurrency(result.actualMargin)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'nightmarket' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">夜盘行情数据</h3>
                </div>

                {relevantNightMarket.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>该客户持仓无夜盘行情数据</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {relevantNightMarket.map((nm) => (
                      <div
                        key={nm.id}
                        className={`border rounded-lg p-4 ${
                          nm.hasJump ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{nm.contractCode}</h4>
                              {nm.hasJump && (
                                <span className="badge bg-amber-100 text-amber-700">
                                  <Zap className="w-3 h-3 mr-1" />
                                  跳价 {nm.jumpPercentage.toFixed(2)}%
                                </span>
                              )}
                              <span className="badge badge-info">版本 {nm.version}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              交易日：{nm.tradeDate} | 更新时间：{nm.timestamp} | 来源：{getVersionSourceLabel(nm.source)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-500">前结算价</p>
                            <p className="text-lg font-semibold text-gray-900">{nm.prevSettlementPrice.toFixed(2)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-500">今开盘</p>
                            <p className="text-lg font-semibold text-gray-900">{nm.openPrice.toFixed(2)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-500">最高</p>
                            <p className="text-lg font-semibold text-red-600">{nm.highPrice.toFixed(2)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-500">最低</p>
                            <p className="text-lg font-semibold text-green-600">{nm.lowPrice.toFixed(2)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-500">今收盘</p>
                            <p className="text-lg font-semibold text-gray-900">{nm.closePrice.toFixed(2)}</p>
                          </div>
                          <div className={`bg-white rounded-lg p-3 border-2 ${
                            nm.hasJump ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                          }`}>
                            <p className="text-xs text-gray-500">结算价</p>
                            <p className="text-lg font-bold text-gray-900">{nm.settlementPrice.toFixed(2)}</p>
                            <p className={`text-xs font-medium ${
                              nm.priceJump > 0 ? 'text-red-600' : nm.priceJump < 0 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {nm.priceJump > 0 ? '+' : ''}{nm.priceJump.toFixed(2)} ({nm.jumpPercentage.toFixed(2)}%)
                            </p>
                          </div>
                        </div>

                        {nm.hasJump && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                              <AlertCircle className="w-4 h-4 inline mr-2" />
                              <strong>风险提示：</strong>
                              该合约夜盘跳价幅度较大（{nm.jumpPercentage.toFixed(2)}%），
                              已自动触发保证金重新计算。请关注客户保证金充足率变化。
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {relevantMarginRateChanges.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="text-lg font-semibold text-gray-900">保证金率调整记录</h3>
                    </div>
                    <div className="space-y-3">
                      {relevantMarginRateChanges.map((mrc) => (
                        <div
                          key={mrc.id}
                          className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {mrc.contractCode} 保证金率调整
                                </h4>
                                <p className="text-sm text-gray-600">
                                  生效时间：{mrc.effectiveTime} | 版本：{getVersionSourceLabel(mrc.versionSource)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">调整幅度</p>
                              <p className="text-xl font-bold text-blue-600">
                                {formatPercent(mrc.oldRate)} → {formatPercent(mrc.newRate)}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                +{formatPercent(mrc.newRate - mrc.oldRate)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">调整原因：</span>
                              {mrc.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'evidence' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">证据链</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    系统自动收集的关键证据，用于核对过程追溯
                  </p>
                </div>

                {result.evidence.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>无异常证据，核对一致</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.evidence.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedEvidence?.id === item.id
                            ? 'ring-2 ring-primary-500 border-primary-500'
                            : 'hover:bg-gray-50'
                        } ${
                          item.isCritical
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedEvidence(selectedEvidence?.id === item.id ? null : item)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                item.isCritical
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.type === 'position' && <Layers className="w-4 h-4" />}
                              {item.type === 'trade' && <ArrowUpDown className="w-4 h-4" />}
                              {item.type === 'fund' && <DollarSign className="w-4 h-4" />}
                              {item.type === 'night_market' && <Zap className="w-4 h-4" />}
                              {item.type === 'margin_rate' && <TrendingUp className="w-4 h-4" />}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {item.description}
                              </span>
                              {item.isCritical && (
                                <span className="badge bg-red-100 text-red-700">关键证据</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>类型：{
                                item.type === 'position' ? '持仓' :
                                item.type === 'trade' ? '成交' :
                                item.type === 'fund' ? '资金' :
                                item.type === 'night_market' ? '夜盘行情' : '保证金率'
                              }</span>
                              <span>时间：{item.timestamp}</span>
                              <span>版本：{getVersionSourceLabel(item.versionSource)}</span>
                            </div>
                            {item.amount !== undefined && (
                              <p className={`text-sm font-mono mt-2 ${
                                item.amount > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                影响金额：{item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {selectedEvidence?.id === item.id ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {selectedEvidence?.id === item.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">证据详情</h5>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">证据ID</p>
                                  <p className="font-mono">{item.id}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">证据类型</p>
                                  <p>{
                                    item.type === 'position' ? '客户持仓' :
                                    item.type === 'trade' ? '成交流水' :
                                    item.type === 'fund' ? '出入金记录' :
                                    item.type === 'night_market' ? '夜盘行情数据' : '保证金率调整'
                                  }</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">发生时间</p>
                                  <p>{item.timestamp}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">数据版本</p>
                                  <p>{getVersionSourceLabel(item.versionSource)}</p>
                                </div>
                                {item.amount !== undefined && (
                                  <div>
                                    <p className="text-gray-500">影响金额</p>
                                    <p className={`font-bold ${
                                      item.amount > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-gray-500">重要程度</p>
                                  <p>
                                    <span
                                      className={`badge ${
                                        item.isCritical ? 'badge-danger' : 'badge-info'
                                      }`}
                                    >
                                      {item.isCritical ? '关键证据' : '一般证据'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="evidence-highlight">
                <h4 className="font-medium text-amber-800 mb-2">📋 核对说明</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• 当客户持仓保证金与成交流水计算结果不一致时，系统自动关联出入金记录作为补充证据</li>
                  <li>• 夜盘跳价、保证金率调整、出金冻结均会被标记为关键证据永久保留</li>
                  <li>• 所有版本的数据都会被记录，不会被新版本覆盖，便于追溯核对</li>
                  <li>• 人工核对时可参考证据链，避免凭印象判断导致的误差</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
