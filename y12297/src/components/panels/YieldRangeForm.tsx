import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Save } from 'lucide-react';
import { useAppStore } from '../../store';
import type { YieldRange } from '../../../shared/types';

interface YieldRangeFormProps {
  productId: string | null;
  yieldRange: YieldRange | null;
  hasConflict: boolean;
}

export function YieldRangeForm({ productId, yieldRange, hasConflict }: YieldRangeFormProps) {
  const { updateYield } = useAppStore();
  const [formData, setFormData] = useState<Partial<YieldRange>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (yieldRange) {
      setFormData(yieldRange);
      setIsEditing(false);
    } else if (productId) {
      setFormData({
        productId,
        expectedMin: 0,
        expectedMax: 0,
        historicalMin: 0,
        historicalMax: 0,
        benchmark: 0,
        sourceMaterial: '',
      });
      setIsEditing(true);
    }
  }, [yieldRange, productId]);

  if (!productId) {
    return null;
  }

  const handleChange = (field: keyof YieldRange, value: any) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    setFormData((prev) => ({ ...prev, [field]: isNaN(numValue) ? value : numValue }));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (formData.productId) {
      updateYield(formData.productId, formData);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-space-600">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-cyber-400 text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          收益区间
        </h3>
        {hasConflict && (
          <span className="flex items-center gap-1 text-xs text-warning-400 bg-warning-500/10 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            数据冲突
          </span>
        )}
      </div>

      <div className={`space-y-4 ${hasConflict ? 'border-l-2 border-warning-500 pl-3' : ''}`}>
        <div>
          <label className="block text-xs text-gray-400 mb-1">预期收益区间 (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={formData.expectedMin ?? ''}
              onChange={(e) => handleChange('expectedMin', e.target.value)}
              placeholder="下限"
              className="flex-1 bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
            />
            <span className="text-gray-500">~</span>
            <input
              type="number"
              step="0.01"
              value={formData.expectedMax ?? ''}
              onChange={(e) => handleChange('expectedMax', e.target.value)}
              placeholder="上限"
              className="flex-1 bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">历史收益区间 (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={formData.historicalMin ?? ''}
              onChange={(e) => handleChange('historicalMin', e.target.value)}
              placeholder="下限"
              className="flex-1 bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
            />
            <span className="text-gray-500">~</span>
            <input
              type="number"
              step="0.01"
              value={formData.historicalMax ?? ''}
              onChange={(e) => handleChange('historicalMax', e.target.value)}
              placeholder="上限"
              className="flex-1 bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">业绩比较基准 (%)</label>
          <input
            type="number"
            step="0.01"
            value={formData.benchmark ?? ''}
            onChange={(e) => handleChange('benchmark', e.target.value)}
            className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">材料来源</label>
          <input
            type="text"
            value={formData.sourceMaterial || ''}
            onChange={(e) => handleChange('sourceMaterial', e.target.value)}
            className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
          />
        </div>

        {formData.expectedMax !== undefined && formData.benchmark !== undefined && (
          <div className="bg-space-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">收益对比可视化</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-500">预期区间</span>
                <div className="flex-1 h-6 bg-space-700 rounded-full relative overflow-hidden">
                  <div
                    className="absolute h-full bg-cyber-500/30 rounded-full"
                    style={{
                      left: `${Math.max(0, (formData.expectedMin || 0) / 30 * 100)}%`,
                      right: `${Math.max(0, 100 - (formData.expectedMax || 0) / 30 * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-500">历史区间</span>
                <div className="flex-1 h-6 bg-space-700 rounded-full relative overflow-hidden">
                  <div
                    className="absolute h-full bg-trust-500/30 rounded-full"
                    style={{
                      left: `${Math.max(0, (formData.historicalMin || 0) / 30 * 100)}%`,
                      right: `${Math.max(0, 100 - (formData.historicalMax || 0) / 30 * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-xs text-gray-500">基准</span>
                <div className="flex-1 h-6 bg-space-700 rounded-full relative">
                  <div
                    className="absolute h-full w-1 bg-warning-500 rounded-full"
                    style={{ left: `${(formData.benchmark || 0) / 30 * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-cyber-500 hover:bg-cyber-400 text-space-900 font-semibold py-2 px-4 rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            保存收益区间
          </button>
        )}
      </div>
    </div>
  );
}
