import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, History as HistoryIcon, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { VolcanoRecord, HistoryVersion } from '@shared/types';

export default function EditConclusionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<VolcanoRecord | null>(null);
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [modifiedBy, setModifiedBy] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getRecord(id);
      setRecord(res.data);
      setContent(res.data.currentConclusion.content);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadRecord();
  }, [id, loadRecord]);

  const canSubmit = content.trim() && reason.trim() && modifiedBy.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !id) return;
    setSubmitting(true);
    setError('');
    try {
      await api.updateConclusion(id, {
        content: content.trim(),
        reason: reason.trim(),
        modifiedBy: modifiedBy.trim(),
      });
      navigate(`/record/${id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-stone-500">加载中...</div>;
  }

  if (!record) {
    return (
      <div className="p-8 text-center text-stone-500">
        记录不存在
        <Link to="/" className="ml-3 text-orange-600 underline">返回列表</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={`/record/${record.id}`}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">修正结论</h1>
          <p className="text-sm text-stone-500 mt-0.5">{record.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">结论内容</h2>
            </div>
            <div className="p-5">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none leading-relaxed text-stone-700"
                placeholder="请输入修正后的结论..."
              />
              {!content.trim() && (
                <p className="mt-2 text-xs text-stone-400">结论内容不能为空</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-orange-500" />
                修正原因 <span className="text-red-500">*</span>
              </h2>
            </div>
            <div className="p-5">
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none leading-relaxed text-stone-700"
                placeholder="请详细说明本次修正的原因，方便后续复盘...（必填）"
              />
              {!reason.trim() && (
                <p className="mt-2 text-xs text-stone-400">修正原因为必填项，用于记录历史变更原因</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">操作信息</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  修改人 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modifiedBy}
                  onChange={e => setModifiedBy(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 text-sm"
                  placeholder="请输入您的姓名/调查组名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  当前版本
                </label>
                <div className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600 font-mono">
                  v{record.history.length}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  上次修改时间
                </label>
                <div className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600">
                  {formatDate(record.currentConclusion.timestamp)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                <HistoryIcon className="w-4.5 h-4.5 text-orange-500" />
                最近历史
              </h2>
              <Link
                to={`/record/${record.id}/history`}
                className="text-xs text-orange-600 hover:text-orange-700"
              >
                查看全部
              </Link>
            </div>
            <div className="divide-y divide-stone-100">
              {record.history.slice(-3).reverse().map((h: HistoryVersion) => (
                <div key={h.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">v{h.version}</span>
                    <span className="text-xs text-stone-400">{formatDate(h.modifiedAt)}</span>
                  </div>
                  <div className="mt-1 text-xs text-stone-500 line-clamp-2">
                    {h.reason}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-400">— {h.modifiedBy}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={!canSubmit || submitting}
            whileHover={canSubmit && !submitting ? { scale: 1.01 } : {}}
            whileTap={canSubmit && !submitting ? { scale: 0.99 } : {}}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              canSubmit && !submitting
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4.5 h-4.5" />
            {submitting ? '保存中...' : '保存修正并记录历史'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
