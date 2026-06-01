import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Save } from 'lucide-react';
import { useAppStore } from '../../store';
import {
  PRODUCT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  type ProductArchive,
} from '../../../shared/types';

interface ProductFormProps {
  product: ProductArchive | null;
  hasConflict: boolean;
}

export function ProductForm({ product, hasConflict }: ProductFormProps) {
  const { updateProduct } = useAppStore();
  const [formData, setFormData] = useState<Partial<ProductArchive>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
      setIsEditing(false);
    }
  }, [product]);

  if (!product) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">选择左侧产品或点击3D节点查看产品档案</p>
      </div>
    );
  }

  const handleChange = (field: keyof ProductArchive, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProduct(product.id, formData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-cyber-400 text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          产品档案
        </h3>
        {hasConflict && (
          <span className="flex items-center gap-1 text-xs text-warning-400 bg-warning-500/10 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            材料冲突
          </span>
        )}
      </div>

      <div className={`space-y-4 ${hasConflict ? 'border-l-2 border-warning-500 pl-3' : ''}`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">产品代码</label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => handleChange('code', e.target.value)}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm font-mono focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">产品类型</label>
            <select
              value={formData.type || 'fund'}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            >
              {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">产品名称</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">发行机构</label>
            <input
              type="text"
              value={formData.issuer || ''}
              onChange={(e) => handleChange('issuer', e.target.value)}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">风险等级</label>
            <select
              value={formData.riskLevel || 1}
              onChange={(e) => handleChange('riskLevel', parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            >
              {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">到期日期</label>
            <input
              type="date"
              value={formData.maturityDate || ''}
              onChange={(e) => handleChange('maturityDate', e.target.value)}
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">存续期限</label>
            <input
              type="text"
              value={formData.term || ''}
              onChange={(e) => handleChange('term', e.target.value)}
              placeholder="如: 3年、终身"
              className="w-full bg-space-700 border border-space-600 rounded px-3 py-2 text-sm focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
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

        {isEditing && (
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-cyber-500 hover:bg-cyber-400 text-space-900 font-semibold py-2 px-4 rounded transition-colors"
          >
            <Save className="w-4 h-4" />
            保存修改
          </button>
        )}
      </div>
    </div>
  );
}
