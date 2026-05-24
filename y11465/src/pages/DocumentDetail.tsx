import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, FileText, GitCompare, Clock, User, Tag, AlertCircle, ChevronDown, ChevronUp, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Document, DocumentDiff, DOCUMENT_TYPE_LABELS } from '../../shared/types';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [diff, setDiff] = useState<DocumentDiff | null>(null);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showData, setShowData] = useState(true);

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const doc = await api.documents.get(id!);
      setDocument(doc as Document);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiff = async (fromVersion: number, toVersion: number) => {
    try {
      const diffData = await api.documents.getDiff(id!, fromVersion, toVersion);
      setDiff(diffData as DocumentDiff);
    } catch (error) {
      console.error('Failed to load diff:', error);
    }
  };

  const handleCompare = () => {
    if (compareVersion !== null && document) {
      loadDiff(compareVersion, document.version);
    }
  };

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

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'ADD':
        return <Plus size={14} className="text-green-600" />;
      case 'MODIFY':
        return <GitCompare size={14} className="text-amber-600" />;
      case 'DELETE':
        return <XCircle size={14} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'ADD':
        return '新增';
      case 'MODIFY':
        return '修改';
      case 'DELETE':
        return '删除';
      default:
        return changeType;
    }
  };

  const getChangeTypeBg = (changeType: string) => {
    switch (changeType) {
      case 'ADD':
        return 'bg-green-50 border-green-200';
      case 'MODIFY':
        return 'bg-amber-50 border-amber-200';
      case 'DELETE':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">加载中...</div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">单据不存在</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/documents" className="flex items-center gap-1 text-slate-600 hover:text-slate-800">
          <ArrowLeft size={18} />
          返回列表
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText size={24} className="text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-800">{document.documentNo}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                  {getStatusLabel(document.status)}
                </span>
              </div>
              <p className="text-slate-500">{DOCUMENT_TYPE_LABELS[document.documentType]}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                版本 v{document.version}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Tag size={16} className="text-slate-400" />
              <span className="text-slate-500">款式编码:</span>
              <span className="font-medium text-slate-700">{document.styleCode}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-slate-400" />
              <span className="text-slate-500">创建人:</span>
              <span className="font-medium text-slate-700">{document.createdBy}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-slate-400" />
              <span className="text-slate-500">创建时间:</span>
              <span className="font-medium text-slate-700">
                {new Date(document.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-slate-400" />
              <span className="text-slate-500">更新时间:</span>
              <span className="font-medium text-slate-700">
                {new Date(document.updatedAt).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>

          {document.reviewReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">复核意见</p>
                  <p className="text-sm text-amber-700 mt-1">{document.reviewReason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <button
              onClick={() => setShowData(!showData)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              {showData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              单据数据详情
            </button>
            {showData && (
              <div className="mt-4 bg-slate-50 rounded-lg p-4">
                <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(document.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-slate-800 mb-4">版本对比</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                对比版本
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={compareVersion || ''}
                onChange={(e) => setCompareVersion(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">选择版本</option>
                {Array.from({ length: document.version - 1 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>版本 v{v}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={!compareVersion}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <GitCompare size={16} />
              对比差异
            </button>
          </div>

          {diff && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium text-slate-600 mb-3">
                版本 v{compareVersion} → v{document.version} 差异
              </h4>
              <div className="text-xs text-slate-500 mb-3">
                修改人: {diff.modifiedBy} | {new Date(diff.modifiedAt).toLocaleString('zh-CN')}
              </div>
              {diff.reason && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs text-blue-700">
                  修改原因: {diff.reason}
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-auto">
                {diff.fields.map((field, idx) => (
                  <div key={idx} className={`p-2 rounded border ${getChangeTypeBg(field.changeType)}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {getChangeTypeIcon(field.changeType)}
                      <span className="text-xs font-medium text-slate-700">{field.field}</span>
                      <span className="text-xs text-slate-500">{getChangeTypeLabel(field.changeType)}</span>
                    </div>
                    {field.changeType === 'MODIFY' && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="text-xs">
                          <span className="text-slate-500">原值:</span>
                          <span className="ml-1 text-slate-700 line-through">{String(field.oldValue)}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">新值:</span>
                          <span className="ml-1 text-slate-700 font-medium">{String(field.newValue)}</span>
                        </div>
                      </div>
                    )}
                    {field.changeType === 'ADD' && (
                      <div className="text-xs">
                        <span className="text-slate-500">值:</span>
                        <span className="ml-1 text-slate-700">{String(field.newValue)}</span>
                      </div>
                    )}
                    {field.changeType === 'DELETE' && (
                      <div className="text-xs">
                        <span className="text-slate-500">原值:</span>
                        <span className="ml-1 text-slate-700 line-through">{String(field.oldValue)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
