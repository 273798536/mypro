import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, FileText, Clock, User, Tag, CheckCircle, XCircle, Edit3, Send, Save } from 'lucide-react';
import { Document, DOCUMENT_TYPE_LABELS, ReviewDecision } from '../../shared/types';

export default function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<ReviewDecision | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modifiedData, setModifiedData] = useState<string>('');
  const [dataJsonError, setDataJsonError] = useState('');

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  useEffect(() => {
    if (document && decision === 'MODIFY' && !modifiedData) {
      setModifiedData(JSON.stringify(document.data, null, 2));
    }
  }, [document, decision]);

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

  const validateModifiedData = (): Record<string, any> | null => {
    if (decision !== 'MODIFY') return null;
    try {
      const parsed = JSON.parse(modifiedData);
      setDataJsonError('');
      return parsed;
    } catch (e) {
      setDataJsonError('JSON格式错误，请检查');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!decision || !reason) {
      alert('请选择审核决策并填写原因');
      return;
    }

    if (decision === 'MODIFY') {
      const modified = validateModifiedData();
      if (!modified) {
        alert('请输入有效的修改数据');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload: any = {
        decision,
        reason,
        decidedBy: '审核员',
      };

      if (decision === 'MODIFY') {
        payload.modifiedData = JSON.parse(modifiedData);
      }

      await api.review.decide(id!, payload);
      alert('审核成功');
      navigate('/review');
    } catch (error: any) {
      console.error('Failed to submit decision:', error);
      alert(`审核失败: ${error.message || '请重试'}`);
    } finally {
      setSubmitting(false);
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
        <Link to="/review" className="flex items-center gap-1 text-slate-600 hover:text-slate-800">
          <ArrowLeft size={18} />
          返回列表
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
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

          <div className="border-t pt-4">
            <h3 className="font-semibold text-slate-800 mb-3">单据数据</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(document.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-slate-800 mb-4">审核决策</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                选择决策
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setDecision('APPROVE')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    decision === 'APPROVE'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle size={20} className={decision === 'APPROVE' ? 'text-green-600' : 'text-slate-400'} />
                  <div className="text-left">
                    <p className="font-medium">通过</p>
                    <p className="text-xs text-slate-500">单据审核通过，进入下一流程</p>
                  </div>
                </button>
                <button
                  onClick={() => setDecision('REJECT')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    decision === 'REJECT'
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <XCircle size={20} className={decision === 'REJECT' ? 'text-red-600' : 'text-slate-400'} />
                  <div className="text-left">
                    <p className="font-medium">驳回</p>
                    <p className="text-xs text-slate-500">单据被驳回，需重新提交</p>
                  </div>
                </button>
                <button
                  onClick={() => setDecision('MODIFY')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    decision === 'MODIFY'
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Edit3 size={20} className={decision === 'MODIFY' ? 'text-amber-600' : 'text-slate-400'} />
                  <div className="text-left">
                    <p className="font-medium">修改</p>
                    <p className="text-xs text-slate-500">需要修改部分内容后再审核</p>
                  </div>
                </button>
              </div>
            </div>

            {decision === 'MODIFY' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Edit3 size={16} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">修改单据数据</span>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-amber-700">
                    编辑单据数据 (JSON格式)
                  </label>
                  <textarea
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs resize-none ${
                      dataJsonError ? 'border-red-400' : 'border-amber-300'
                    }`}
                    rows={8}
                    placeholder="编辑单据数据..."
                    value={modifiedData}
                    onChange={(e) => {
                      setModifiedData(e.target.value);
                      validateModifiedData();
                    }}
                  />
                  {dataJsonError && (
                    <p className="text-xs text-red-600">{dataJsonError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Save size={14} className="text-amber-600" />
                    <span className="text-xs text-amber-600">
                      修改后的数据将保存为新版本 v{document ? document.version + 1 : 2}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                审核原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="请输入审核原因..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!decision || !reason || submitting || (decision === 'MODIFY' && !!dataJsonError)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
            >
              <Send size={18} />
              {submitting ? '提交中...' : '提交审核'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
