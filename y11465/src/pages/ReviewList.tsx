import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Link } from 'react-router-dom';
import { Search, Eye, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '../../shared/types';

export default function ReviewList() {
  const { documents, fetchPendingReview, loading } = useAppStore();
  const [filter, setFilter] = useState({ documentType: '' });

  useEffect(() => {
    fetchPendingReview();
  }, [fetchPendingReview]);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      SAMPLE_FLOW: 'bg-blue-50 text-blue-700 border-blue-200',
      SIZE_MODIFY: 'bg-purple-50 text-purple-700 border-purple-200',
      FABRIC_STOCK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      SUPPLEMENT: 'bg-orange-50 text-orange-700 border-orange-200',
      SHIFT_RECORD: 'bg-pink-50 text-pink-700 border-pink-200',
    };
    return colors[type] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">复核改判</h1>
          <p className="text-slate-500 mt-1">审核待复核的单据，做出通过、驳回或修改决策</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{documents.length}</p>
              <p className="text-sm text-slate-500">待复核</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {documents.filter(d => d.documentType === 'SAMPLE_FLOW').length}
              </p>
              <p className="text-sm text-slate-500">样衣流转单</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {documents.filter(d => d.documentType === 'SIZE_MODIFY').length}
              </p>
              <p className="text-sm text-slate-500">尺码修改意见</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileText size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {documents.filter(d => d.documentType === 'FABRIC_STOCK').length}
              </p>
              <p className="text-sm text-slate-500">面料出入库</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索单据号、款式编码..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            className="px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter.documentType}
            onChange={(e) => setFilter({ ...filter, documentType: e.target.value })}
          >
            <option value="">全部类型</option>
            <option value="SAMPLE_FLOW">样衣流转单</option>
            <option value="SIZE_MODIFY">尺码修改意见</option>
            <option value="FABRIC_STOCK">面料出入库</option>
            <option value="SUPPLEMENT">临时补录单</option>
            <option value="SHIFT_RECORD">班次记录</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">单据号</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">类型</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">款式编码</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">版本</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建人</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">提交时间</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">加载中...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
                  <p>暂无待复核单据</p>
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      <span className="font-mono text-sm font-medium text-slate-800">{doc.documentNo}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${getTypeColor(doc.documentType)}`}>
                      {DOCUMENT_TYPE_LABELS[doc.documentType]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{doc.styleCode}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      v{doc.version}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{doc.createdBy}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(doc.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/review/${doc.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Eye size={14} />
                      审核
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
