import { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Save } from 'lucide-react';
import { useAppStore } from '../../store';
import { ProductList } from './ProductList';
import { ProductForm } from './ProductForm';
import { YieldRangeForm } from './YieldRangeForm';
import { ReportForm } from './ReportForm';

export function LeftPanel() {
  const {
    selectedProductId,
    products,
    yields,
    reports,
    conflicts,
    saveToHistory,
  } = useAppStore();

  const [showList, setShowList] = useState(true);

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

  const hasConflict = useMemo(
    () => conflicts.some((c) => c.productId === selectedProductId),
    [conflicts, selectedProductId]
  );

  const handleSaveHistory = async () => {
    await saveToHistory(`手动保存 - ${new Date().toLocaleString('zh-CN')}`);
  };

  return (
    <div className="h-full flex bg-space-800/95 backdrop-blur-xl border-r border-space-600">
      {showList && (
        <div className="w-72 border-r border-space-600 flex flex-col">
          <div className="p-4 border-b border-space-600 flex items-center justify-between">
            <h2 className="font-display font-bold text-cyber-400 text-lg">产品列表</h2>
            <button
              onClick={() => setShowList(false)}
              className="p-1.5 rounded hover:bg-space-700 transition-colors text-gray-400 hover:text-white"
              title="收起产品列表"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <ProductList />
        </div>
      )}

      {!showList && (
        <button
          onClick={() => setShowList(true)}
          className="absolute -right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-space-800 border border-l-0 border-space-600 rounded-r-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-white"
          title="展开产品列表"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-space-600 flex items-center justify-between">
          <h2 className="font-display font-bold text-cyber-400 text-lg">数据输入</h2>
          <button
            onClick={handleSaveHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-trust-500/20 hover:bg-trust-500/30 text-trust-400 rounded-lg text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            保存快照
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {conflicts.length > 0 && (
            <div className="mb-4 p-3 bg-warning-500/10 border border-warning-500/30 rounded-lg">
              <div className="text-xs text-warning-400 font-semibold mb-2">
                ⚠ 检测到 {conflicts.length} 处材料冲突
              </div>
              <div className="space-y-1">
                {conflicts.slice(0, 3).map((c, i) => (
                  <div key={i} className="text-xs text-warning-300/80">
                    • 产品{c.productId} 的 {c.field} 字段存在多个版本：
                    {c.values.join(' vs ')}
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <div className="text-xs text-warning-400/60">
                    还有 {conflicts.length - 3} 处冲突...
                  </div>
                )}
              </div>
              <div className="text-xs text-warning-400/60 mt-2 italic">
                系统保留原始口径，不会自动修改冲突数据
              </div>
            </div>
          )}

          <ProductForm product={selectedProduct} hasConflict={hasConflict} />
          <YieldRangeForm
            productId={selectedProductId}
            yieldRange={selectedYield}
            hasConflict={hasConflict}
          />
          <ReportForm
            productId={selectedProductId}
            report={selectedReport}
            hasConflict={hasConflict}
          />
        </div>
      </div>
    </div>
  );
}
