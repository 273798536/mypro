import { Search, FileText, Download, Plus } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { useState } from 'react';

export default function Dealers() {
  const { dealers } = useRebateStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDealers = dealers.filter((dealer) =>
    dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">经销商档案</h1>
          <p className="text-gray-500 mt-1">管理经销商基础信息和备注</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={16} className="mr-2" />
            导出
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} className="mr-2" />
            导入
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索经销商名称、编码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">经销商编码</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">经销商名称</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">类别</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">区域</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDealers.map((dealer) => (
                <tr key={dealer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600">{dealer.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium">{dealer.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info">{dealer.category}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{dealer.region}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm text-gray-500 truncate" title={dealer.remarks}>
                      {dealer.remarks || '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{dealer.updateTime}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <span className="text-sm text-gray-500">共 {filteredDealers.length} 家经销商</span>
        </div>
      </div>
    </div>
  );
}
