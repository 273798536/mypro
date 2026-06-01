import { useMemo, useState } from 'react';
import { PanelRightClose, PanelRightOpen, Info, Calendar, Building2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { RiskIssueCard } from './RiskIssueCard';
import { YieldChart } from './YieldChart';
import {
  PRODUCT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from '../../../shared/types';

export function RightPanel() {
  const {
    selectedProductId,
    products,
    yields,
    reports,
    risks,
  } = useAppStore();

  const [showPanel, setShowPanel] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const selectedYield = useMemo(
    () => yields.find((y) => y.productId === selectedProductId) || null,
    [yields, selectedProductId]
  );

  const selectedReport = useMemo(
    () => reports.find((r) => r.productId === selectedProductId) || null,
    [reports, selectedProductId]
  );

  const productRisks = useMemo(
    () => risks.filter((r) => r.productId === selectedProductId),
    [risks, selectedProductId]
  );

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-space-800 border border-r-0 border-space-600 rounded-l-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-white"
        title="展开讲解卡片"
      >
        <PanelRightOpen className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="h-full w-96 bg-space-800/95 backdrop-blur-xl border-l border-space-600 flex flex-col">
      <div className="p-4 border-b border-space-600 flex items-center justify-between">
        <h2 className="font-display font-bold text-cyber-400 text-lg">讲解卡片</h2>
        <button
          onClick={() => setShowPanel(false)}
          className="p-1.5 rounded hover:bg-space-700 transition-colors text-gray-400 hover:text-white"
          title="收起讲解卡片"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {!selectedProduct ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">选择产品查看详细讲解</p>
            <p className="text-xs text-gray-600 mt-2">
              点击左侧产品列表或3D场景中的节点
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="glass rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-white text-lg">
                    {selectedProduct.name}
                  </h3>
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    {selectedProduct.code}
                  </div>
                </div>
                <div
                  className="px-3 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: `${RISK_LEVEL_COLORS[selectedProduct.riskLevel]}20`,
                    color: RISK_LEVEL_COLORS[selectedProduct.riskLevel],
                  }}
                >
                  {RISK_LEVEL_LABELS[selectedProduct.riskLevel]}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">产品类型</div>
                  <div className="text-cyber-400">
                    {PRODUCT_TYPE_LABELS[selectedProduct.type]}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    发行机构
                  </div>
                  <div className="text-white truncate" title={selectedProduct.issuer}>
                    {selectedProduct.issuer}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    到期日期
                  </div>
                  <div className={selectedProduct.maturityDate ? 'text-white' : 'text-warning-400'}>
                    {selectedProduct.maturityDate || '未填写'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">存续期限</div>
                  <div className={selectedProduct.term ? 'text-white' : 'text-warning-400'}>
                    {selectedProduct.term || '未填写'}
                  </div>
                </div>
              </div>
            </div>

            {selectedYield && (
              <YieldChart yieldRange={selectedYield} report={selectedReport} />
            )}

            {selectedReport && (
              <div className="glass rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">讲解内容摘要</h4>
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                  {selectedReport.content}
                </p>
                <div className="mt-3 pt-3 border-t border-space-600 flex items-center justify-between text-xs text-gray-500">
                  <span>讲解人：{selectedReport.reporter}</span>
                  <span>
                    {new Date(selectedReport.reportTime).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {selectedReport.claimedYield !== undefined && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">声称收益率：</span>
                    <span
                      className={`font-mono font-semibold ${
                        selectedYield && selectedReport.claimedYield > selectedYield.expectedMax * 1.1
                          ? 'text-risk-400'
                          : 'text-trust-400'
                      }`}
                    >
                      {selectedReport.claimedYield}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {productRisks.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-300">
                    检测到的风险点
                  </h4>
                  <span className="text-xs bg-risk-500/20 text-risk-400 px-2 py-0.5 rounded">
                    {productRisks.length} 项
                  </span>
                </div>
                {productRisks.map((issue) => (
                  <RiskIssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            ) : (
              <div className="glass rounded-lg p-4 text-center">
                <div className="text-trust-400 text-sm">✓ 未检测到风险问题</div>
                <div className="text-xs text-gray-500 mt-1">
                  产品数据符合当前风险规则
                </div>
              </div>
            )}

            <div className="text-xs text-gray-600 space-y-1 pt-2">
              <div>
                <span className="text-gray-500">产品档案来源：</span>
                <span className="font-mono">{selectedProduct.sourceMaterial}</span>
              </div>
              {selectedYield && (
                <div>
                  <span className="text-gray-500">收益区间来源：</span>
                  <span className="font-mono">{selectedYield.sourceMaterial}</span>
                </div>
              )}
              {selectedReport && (
                <div>
                  <span className="text-gray-500">讲解报告来源：</span>
                  <span className="font-mono">{selectedReport.sourceMaterial}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
