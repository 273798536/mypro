import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../services/api';

export default function CreateBatch() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    batchNo: '',
    styleCode: '',
    brand: '',
    duplicateStrategy: 'IGNORE' as 'IGNORE' | 'OVERWRITE' | 'APPEND',
    createdBy: '管理员',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.batches.create(formData);
      navigate('/batches');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/batches')}
          className="p-2 hover:bg-slate-100 rounded"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">创建批次</h1>
          <p className="text-slate-500 mt-1">新建打版批次并设置重复处理策略</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md max-w-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              批次号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.batchNo}
              onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
              placeholder="例如：BATCH-2024-001"
              className="w-full px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              款式编码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.styleCode}
              onChange={(e) => setFormData({ ...formData, styleCode: e.target.value })}
              placeholder="例如：STYLE-A001"
              className="w-full px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              品牌 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择品牌</option>
              <option value="品牌A">品牌A</option>
              <option value="品牌B">品牌B</option>
              <option value="品牌C">品牌C</option>
              <option value="品牌D">品牌D</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              重复数据处理策略 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="duplicateStrategy"
                  value="IGNORE"
                  checked={formData.duplicateStrategy === 'IGNORE'}
                  onChange={(e) => setFormData({ ...formData, duplicateStrategy: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-slate-800">忽略（保留原有）</p>
                  <p className="text-sm text-slate-500 mt-1">如果批次已存在，保留原有数据，忽略新数据</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="duplicateStrategy"
                  value="OVERWRITE"
                  checked={formData.duplicateStrategy === 'OVERWRITE'}
                  onChange={(e) => setFormData({ ...formData, duplicateStrategy: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-slate-800">覆盖（替换原有）</p>
                  <p className="text-sm text-slate-500 mt-1">如果批次已存在，用新数据完全替换原有数据</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="duplicateStrategy"
                  value="APPEND"
                  checked={formData.duplicateStrategy === 'APPEND'}
                  onChange={(e) => setFormData({ ...formData, duplicateStrategy: e.target.value as any })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-slate-800">追加（合并新增）</p>
                  <p className="text-sm text-slate-500 mt-1">如果批次已存在，合并新数据到原有数据中</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/batches')}
              className="px-5 py-2 border border-slate-200 rounded hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? '保存中...' : '创建批次'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
