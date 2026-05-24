import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Snowflake, Play, Archive, FileText, Clock, Download, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';
import { BATCH_STATUS_LABELS, DOCUMENT_TYPE_LABELS, FABRIC_DISPOSITION_LABELS } from '../../shared/types';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [freezeReason, setFreezeReason] = useState('');
  const [showFreezeModal, setShowFreezeModal] = useState(false);

  useEffect(() => {
    if (id) {
      api.batches.get(id).then((data: any) => {
        setBatch(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleFreeze = async () => {
    if (!freezeReason) {
      alert('请输入冻结原因');
      return;
    }
    try {
      await api.batches.freeze(id!, { reason: freezeReason, operatedBy: '管理员' });
      const data = await api.batches.get(id!);
      setBatch(data);
      setShowFreezeModal(false);
      setFreezeReason('');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSettle = async () => {
    try {
      await api.batches.settle(id!, { operatedBy: '管理员' });
      const data = await api.batches.get(id!);
      setBatch(data);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const generateReport = async () => {
    try {
      const report: any = await api.reports.generate({
        batchId: id,
        type: 'SUMMARY',
        generatedBy: '管理员'
      });
      navigate(`/reports/${report.id}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  if (!batch) {
    return <div className="p-6">批次不存在</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING_REVIEW: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-green-100 text-green-700',
      FROZEN: 'bg-cyan-100 text-cyan-700',
      SETTLED: 'bg-emerald-100 text-emerald-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/batches')} className="p-2 hover:bg-slate-100 rounded">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{batch.batchNo}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
              {BATCH_STATUS_LABELS[batch.status as keyof typeof BATCH_STATUS_LABELS]}
            </span>
            {batch.frozen && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                <Snowflake size={12} className="inline mr-1" />
                已冻结
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">{batch.styleCode} · {batch.brand}</p>
        </div>
        <div className="flex gap-2">
          {!batch.frozen && batch.status !== 'SETTLED' && batch.status !== 'ARCHIVED' && (
            <button
              onClick={() => setShowFreezeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
            >
              <Snowflake size={16} />
              冻结
            </button>
          )}
          {batch.frozen && (
            <button
              onClick={handleSettle}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Play size={16} />
              结算
            </button>
          )}
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <FileSpreadsheet size={16} />
            生成报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4">批次信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">批次号</p>
                <p className="font-mono text-slate-800">{batch.batchNo}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">款式编码</p>
                <p className="text-slate-800">{batch.styleCode}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">品牌</p>
                <p className="text-slate-800">{batch.brand}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">重复策略</p>
                <p className="text-slate-800">{batch.duplicateStrategy}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">创建人</p>
                <p className="text-slate-800">{batch.createdBy}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">创建时间</p>
                <p className="text-slate-800">{new Date(batch.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            </div>
            {batch.frozenReason && (
              <div className="mt-4 p-3 bg-cyan-50 rounded">
                <p className="text-sm text-cyan-700">
                  <strong>冻结原因：</strong>{batch.frozenReason}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4">关联单据</h3>
            <div className="space-y-3">
              {batch.documents?.map((doc: any) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-800">{DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof DOCUMENT_TYPE_LABELS]}</p>
                      <p className="text-sm text-slate-500">{doc.documentNo} · 版本 {doc.version}</p>
                    </div>
                  </div>
                  <Clock size={14} className="text-slate-400" />
                </Link>
              ))}
              {!batch.documents?.length && (
                <p className="text-center text-slate-500 py-4">暂无关联单据</p>
              )}
            </div>
          </div>

          {batch.fabricTracks?.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="font-semibold text-slate-700 mb-4">面料去向追踪</h3>
              <div className="space-y-3">
                {batch.fabricTracks.map((track: any) => (
                  <div key={track.id} className="p-3 bg-slate-50 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{track.fabricCode}</p>
                        <p className="text-sm text-slate-500">
                          V{track.oldVersion} → V{track.newVersion}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        track.disposition === 'RETURN' ? 'bg-green-100 text-green-700' :
                        track.disposition === 'SCRAP' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {FABRIC_DISPOSITION_LABELS[track.disposition as keyof typeof FABRIC_DISPOSITION_LABELS]}
                      </span>
                    </div>
                    {track.remark && <p className="text-sm text-slate-500 mt-2">备注：{track.remark}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4">操作历史</h3>
            <div className="space-y-4">
              {batch.auditLogs?.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{log.action}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{log.operatedBy}</p>
                    {log.reason && <p className="text-xs text-slate-600 mt-1">{log.reason}</p>}
                  </div>
                </div>
              ))}
              {!batch.auditLogs?.length && (
                <p className="text-center text-slate-500 py-4">暂无操作记录</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFreezeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">冻结批次</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">冻结原因</label>
              <textarea
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入冻结原因..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFreezeModal(false)}
                className="px-4 py-2 border border-slate-200 rounded hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleFreeze}
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
              >
                确认冻结
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
