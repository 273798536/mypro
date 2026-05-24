import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, FileText, Plus } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '../../shared/types';

export default function DocumentList() {
  const { documents, fetchDocuments, loading } = useAppStore();
  const [filter, setFilter] = useState({ documentType: '', status: '' });

  useEffect(() => {
    fetchDocuments(filter as any);
  }, [fetchDocuments, filter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING_REVIEW: 'bg-amber-100 text-amber-700',
      UNDER_REVIEW: 'bg-blue-100 text-blue-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      MODIFIED: 'bg-orange-100 text-orange-700',
      FROZEN: 'bg-cyan-100 text-cyan-700',
      ARCHIVED: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: '草稿',
      PENDING_REVIEW: '待复核',
      UNDER_REVIEW: '复核中',
      APPROVED: '已通过',
      REJECTED: '已驳回',
      MODIFIED: '已修改',
      FROZEN: '已冻结',
      ARCHIVED: '已归档',
    };
    return labels[status] || status;
  };

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
          <h1 className="text-2xl font-bold text-slate-800">单据管理</h1>
          <p className="text-slate-500 mt-1">管理样衣流转单、尺码修改意见等所有单据</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-md">
          <Plus size={18} />
          上传单据
        </button>
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
          <select
            className="px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">全部状态</option>
            <option value="PENDING_REVIEW">待复核</option>
            <option value="APPROVED">已通过</option>
            <option value="REJECTED">已驳回</option>
            <option value="FROZEN">已冻结</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded hover:bg-slate-50">
            <Filter size={16} />
            更多筛选
          </button>
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
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建人</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建时间</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-500">加载中...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-500">暂无数据</td>
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
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{doc.createdBy}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(doc.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Eye size={14} />
                      详情
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
