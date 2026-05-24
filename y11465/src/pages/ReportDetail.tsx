import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Snowflake, FileText, CheckCircle } from 'lucide-react';
import api from '../services/api';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.reports.get(id).then((data: any) => {
        setReport(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleExport = async () => {
    try {
      const blob = await api.reports.export(id!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return <div className="p-6">加载中...</div>;
  }

  if (!report) {
    return <div className="p-6">报告不存在</div>;
  }

  const { batch, documents, freezeSnapshot, manualReasons, statistics } = report.data;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/reports')} className="p-2 hover:bg-slate-100 rounded">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">报告详情</h1>
          <p className="text-slate-500 mt-1">批次 {batch.batchNo} 的汇总报告</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <Download size={16} />
          导出 Excel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              批次信息
            </h3>
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
                <p className="text-sm text-slate-500">状态</p>
                <p className="text-slate-800">{batch.statusLabel}</p>
              </div>
            </div>
          </div>

          {freezeSnapshot && (
            <div className="bg-white rounded-lg shadow-md p-5">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Snowflake size={18} className="text-cyan-500" />
                冻结前后状态对比
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded">
                  <p className="text-sm font-medium text-slate-600 mb-2">冻结前</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">状态</span>
                      <span className="text-sm font-medium">{freezeSnapshot.before.statusLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">是否冻结</span>
                      <span className="text-sm font-medium">{freezeSnapshot.before.frozen ? '是' : '否'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-cyan-50 p-4 rounded">
                  <p className="text-sm font-medium text-cyan-700 mb-2">冻结后</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">状态</span>
                      <span className="text-sm font-medium">{freezeSnapshot.after.statusLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">是否冻结</span>
                      <span className="text-sm font-medium">{freezeSnapshot.after.frozen ? '是' : '否'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">冻结原因</span>
                      <span className="text-sm font-medium">{freezeSnapshot.after.frozenReason}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded">
                <p className="text-sm">
                  <span className="font-medium text-amber-700">操作人：</span>
                  <span className="text-amber-800">{freezeSnapshot.operatedBy}</span>
                  <span className="mx-2">|</span>
                  <span className="font-medium text-amber-700">时间：</span>
                  <span className="text-amber-800">{new Date(freezeSnapshot.operatedAt).toLocaleString('zh-CN')}</span>
                </p>
                <p className="text-sm mt-1">
                  <span className="font-medium text-amber-700">理由：</span>
                  <span className="text-amber-800">{freezeSnapshot.reason}</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-amber-500" />
              人工操作记录
            </h3>
            {manualReasons.length === 0 ? (
              <p className="text-slate-500 text-center py-4">暂无人工操作记录</p>
            ) : (
              <div className="space-y-3">
                {manualReasons.map((reason: any, index: number) => (
                  <div key={index} className="p-3 bg-slate-50 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-800">{reason.action}</p>
                        <p className="text-sm text-slate-600 mt-1">{reason.reason}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{reason.operatedBy}</p>
                        <p>{new Date(reason.createdAt).toLocaleString('zh-CN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4">统计概览</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">单据总数</span>
                <span className="text-2xl font-bold text-slate-800">{statistics.totalDocuments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">面料追踪记录</span>
                <span className="text-2xl font-bold text-slate-800">{statistics.fabricTracksCount}</span>
              </div>
              <hr className="my-2" />
              <div className="text-sm text-slate-500">
                <p className="font-medium text-slate-700 mb-2">单据类型分布</p>
                {Object.entries(statistics.documentsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between py-1">
                    <span>{type}</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-slate-700 mb-4">单据明细</h3>
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.documentNo} className="p-3 bg-slate-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-700">{doc.typeLabel}</span>
                    <span className="text-xs text-slate-500">v{doc.version}</span>
                  </div>
                  <p className="text-xs text-slate-500">{doc.documentNo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
