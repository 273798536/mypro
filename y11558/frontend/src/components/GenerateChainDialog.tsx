import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Link2, Loader2 } from 'lucide-react';
import { materialApi, chainApi } from '../services/api';

interface GenerateChainDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (chainId: string) => void;
}

export const GenerateChainDialog: React.FC<GenerateChainDialogProps> = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState<'select' | 'config' | 'success'>('select');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [storeName, setStoreName] = useState('');
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [newChainId, setNewChainId] = useState('');

  const { data: materialsData } = useQuery({
    queryKey: ['materialsForChain'],
    queryFn: () => materialApi.getList({ pageSize: 50, type: undefined }),
    enabled: open,
  });

  const availableMaterials = materialsData?.items || [];

  const toggleMaterial = (id: string) => {
    setSelectedMaterials(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const chain = await chainApi.generate({
        storeName,
        businessDate,
        materialIds: selectedMaterials,
      });
      setNewChainId(chain.id);
      setStep('success');
    } catch (err: any) {
      alert('创建链路失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'select' && '选择材料'}
            {step === 'config' && '配置链路'}
            {step === 'success' && '链路创建成功'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <Link2 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">链路创建成功</h3>
            <p className="mt-2 text-sm text-gray-500">
              系统已自动关联材料、检测脏数据、启动对账流程
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                关闭
              </button>
              <button
                onClick={() => onSuccess(newChainId)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                查看链路详情
              </button>
            </div>
          </div>
        ) : step === 'select' ? (
          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                已选择 {selectedMaterials.length} 份材料
              </span>
              <button
                onClick={() => setSelectedMaterials(availableMaterials.map((m: any) => m.id))}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                全选
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {availableMaterials.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  暂无可选材料，请先导入材料
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-10">
                        <input
                          type="checkbox"
                          checked={selectedMaterials.length === availableMaterials.length && availableMaterials.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMaterials(availableMaterials.map((m: any) => m.id));
                            } else {
                              setSelectedMaterials([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">批次号</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">版本</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableMaterials.map((m: any) => (
                      <tr
                        key={m.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedMaterials.includes(m.id) ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => toggleMaterial(m.id)}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(m.id)}
                            onChange={() => toggleMaterial(m.id)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            m.type === 'ORDER' ? 'bg-blue-100 text-blue-700' :
                            m.type === 'TRACK' ? 'bg-green-100 text-green-700' :
                            m.type === 'IOU' ? 'bg-yellow-100 text-yellow-700' :
                            m.type === 'STATEMENT' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {m.type === 'ORDER' ? '订单' :
                             m.type === 'TRACK' ? '轨迹' :
                             m.type === 'IOU' ? '欠条' :
                             m.type === 'STATEMENT' ? '对账单' : '邮件'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {m.batchKey.slice(0, 40)}...
                        </td>
                        <td className="px-4 py-2 text-xs">
                          v{m.version}
                          {m.isLatest && <span className="ml-1 text-green-600">(最新)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => setStep('config')}
                disabled={selectedMaterials.length === 0}
                className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                下一步
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">门店名称</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="如：丰收农资店"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">业务日期</label>
              <input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                已选择 <strong>{selectedMaterials.length}</strong> 份材料，系统将自动：
              </p>
              <ul className="text-sm text-blue-600 mt-1 list-disc list-inside">
                <li>关联所有材料生成审计链路</li>
                <li>检测脏数据并记录异常</li>
                <li>启动自动对账流程</li>
              </ul>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                上一步
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !storeName}
                className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? '创建中...' : '创建链路'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
