import { useEffect, useState } from 'react';
import { useStore } from '../store/index';
import { api } from '../utils/api';
import { RefreshCw, Download, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle, Info, FileText, ExternalLink } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';

export default function ExportPage() {
  const { exportPreview, loading, fetchExportPreview, records, fetchRecords } = useStore();
  const [exported, setExported] = useState(false);

  useEffect(() => {
    fetchExportPreview();
    fetchRecords();
  }, []);

  const handleExportJSON = () => {
    api.export.downloadJSON();
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleExportCSV = () => {
    api.export.downloadCSV();
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleRefresh = () => {
    fetchExportPreview();
    fetchRecords();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">报告导出</h1>
          <p className="text-slate-600">
            生成可交付海事处的报告，每条结论标注数据来源和风险依据
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 font-medium bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            刷新预览
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 text-emerald-700 font-medium bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出 CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-5 py-2.5 text-white font-medium bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors shadow-lg shadow-cyan-900/20"
          >
            <FileJson className="w-4 h-4" />
            导出 JSON
          </button>
        </div>
      </div>

      {exported && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          报告已导出，请检查下载文件
        </div>
      )}

      <div className="mb-8 p-5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-cyan-600" />
          给海事处的报告说明
        </h3>
        <div className="text-sm text-slate-700 space-y-2">
          <p>
            本报告由「滩涂贝类采样日程管理系统」自动生成，每条结论均标注了数据来源和风险依据。
          </p>
          <p>
            <strong>风浪预报晚到处理规则：</strong>如风浪数据缺失，系统会在结论中明确标注
            「暂按无风浪条件评估」，并保留原始风险说明。待数据补录后重新导出即可更新结论。
          </p>
          <p>
            <strong>异常拦截说明：</strong>标记为「异常」的记录（如禁航区越界、风浪超标），
            报告会明确说明被拦截原因，便于海事处复核审批。
          </p>
        </div>
      </div>

      {loading && !exportPreview ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          生成预览中...
        </div>
      ) : exportPreview ? (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">报告生成时间</div>
              <div className="text-xl font-semibold text-slate-800">
                {exportPreview.generated_at}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">总记录数</div>
              <div className="text-xl font-semibold text-slate-800">
                {exportPreview.records.length} 条
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500 mb-1">风险概览</div>
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className="text-emerald-600">
                  顺利 {exportPreview.risk_summary.normal_count}
                </span>
                <span className="text-amber-600">
                  待确认 {exportPreview.risk_summary.pending_count}
                </span>
                <span className="text-rose-600">
                  异常 {exportPreview.risk_summary.anomaly_count}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600" />
                报告预览 - 结论溯源
              </h3>
              <span className="text-sm text-slate-500">
                共 {exportPreview.conclusions_with_sources.length} 条结论
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {exportPreview.conclusions_with_sources.map((item, idx) => {
                const record = exportPreview.records.find(r => r.id === item.record_id);
                return (
                  <div key={idx} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                          #{item.record_id}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {record?.date} {record?.area} {record?.species}
                            </span>
                            {record && <RiskBadge level={record.risk_level} size="sm" />}
                          </div>
                        </div>
                      </div>
                      {item.data_sources.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">数据来源：</span>
                          <div className="flex gap-1">
                            {item.data_sources.map((src, sidx) => (
                              <span
                                key={sidx}
                                className="px-2 py-0.5 bg-cyan-50 text-cyan-700 text-xs rounded-full font-medium"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-11 space-y-2">
                      <p className="text-slate-800 font-medium">{item.conclusion}</p>

                      {(record?.risk_level === 'pending' || record?.risk_level === 'anomaly') && (
                        <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${
                          record?.risk_level === 'anomaly'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium mb-1">
                              {record?.risk_level === 'anomaly' ? '异常说明（海事处审阅重点）' : '风险说明'}
                            </p>
                            <p className="text-sm opacity-90">{item.risk_note}</p>
                          </div>
                        </div>
                      )}

                      {record?.risk_level === 'normal' && (
                        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p>{item.risk_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              操作说明
            </h4>
            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
              <li>点击「刷新预览」可确保查看最新数据（含刚补录的潮汐表、风浪预报）</li>
              <li>导出前请确认所有「待确认」记录已补录完毕，或在导出后向海事处说明</li>
              <li>导出的 CSV 文件可用 Excel 打开，JSON 文件可用于程序对接</li>
              <li>数据补录后重新导出，报告中的结论会自动更新</li>
            </ol>
          </div>
        </>
      ) : null}
    </div>
  );
}
