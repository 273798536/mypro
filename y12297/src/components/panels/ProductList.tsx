import { useMemo } from 'react';
import {
  LayoutGrid,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { useAppStore } from '../../store';
import {
  PRODUCT_TYPE_LABELS,
  RISK_LEVEL_COLORS,
  type ProductArchive,
} from '../../../shared/types';

export function ProductList() {
  const {
    products,
    selectedProductId,
    setSelectedProductId,
    risks,
    filters,
  } = useAppStore();

  const productRiskCount = useMemo(() => {
    const map = new Map<string, { critical: number; warning: number }>();
    risks.forEach((r) => {
      const current = map.get(r.productId) || { critical: 0, warning: 0 };
      if (r.severity === 'critical') {
        current.critical++;
      } else {
        current.warning++;
      }
      map.set(r.productId, current);
    });
    return map;
  }, [risks]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.type !== 'all' && p.type !== filters.type) return false;
      if (filters.riskLevel !== 'all' && p.riskLevel !== filters.riskLevel) return false;
      if (filters.hasMaturity !== 'all') {
        const has = !!(p.maturityDate || p.term);
        if (filters.hasMaturity === 'yes' && !has) return false;
        if (filters.hasMaturity === 'no' && has) return false;
      }
      return true;
    });
  }, [products, filters]);

  const groupedByType = useMemo(() => {
    const groups: Record<string, ProductArchive[]> = {};
    filteredProducts.forEach((p) => {
      if (!groups[p.type]) groups[p.type] = [];
      groups[p.type].push(p);
    });
    return groups;
  }, [filteredProducts]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-space-600">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜索产品..."
            className="w-full bg-space-700 border border-space-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(groupedByType).map(([type, typeProducts]) => (
          <div key={type}>
            <div className="flex items-center gap-2 px-2 mb-2">
              <LayoutGrid className="w-4 h-4 text-cyber-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {PRODUCT_TYPE_LABELS[type as keyof typeof PRODUCT_TYPE_LABELS]}
              </span>
              <span className="text-xs text-gray-600">({typeProducts.length})</span>
            </div>
            <div className="space-y-1">
              {typeProducts.map((product) => {
                const riskInfo = productRiskCount.get(product.id);
                const isSelected = selectedProductId === product.id;
                const hasMaturity = !!(product.maturityDate || product.term);

                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(isSelected ? null : product.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-cyber-500/20 border border-cyber-500/50'
                        : 'bg-space-700/50 border border-transparent hover:bg-space-700 hover:border-space-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white truncate">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {product.code}
                        </div>
                      </div>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: RISK_LEVEL_COLORS[product.riskLevel] }}
                        title={`风险等级 R${product.riskLevel}`}
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {!hasMaturity && (
                        <span className="flex items-center gap-1 text-xs text-warning-400">
                          <AlertTriangle className="w-3 h-3" />
                          缺期限
                        </span>
                      )}

                      {riskInfo && (
                        <div className="flex items-center gap-2">
                          {riskInfo.critical > 0 && (
                            <span className="flex items-center gap-1 text-xs text-risk-400">
                              <ShieldAlert className="w-3 h-3" />
                              {riskInfo.critical}
                            </span>
                          )}
                          {riskInfo.warning > 0 && (
                            <span className="flex items-center gap-1 text-xs text-warning-400">
                              <AlertTriangle className="w-3 h-3" />
                              {riskInfo.warning}
                            </span>
                          )}
                        </div>
                      )}

                      {!riskInfo && hasMaturity && (
                        <span className="flex items-center gap-1 text-xs text-trust-400">
                          <CheckCircle2 className="w-3 h-3" />
                          正常
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            没有匹配的产品
          </div>
        )}
      </div>
    </div>
  );
}
