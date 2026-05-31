import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Shield, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../store/useStore';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import RiskBadge from '../components/RiskBadge';
import { RISK_LEVEL_LABELS } from '../../shared/types';
import type { RiskLevel } from '../../shared/types';
import { downloadFile } from '../utils/api';
import { cn } from '../lib/utils';

export default function Export() {
  const { stats, loading, error, setError, fetchStats } = useStore();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showRiskGuide, setShowRiskGuide] = useState(false);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const result = await fetch('/api/export/excel');
      const filename = result.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || '版权过滤清单.xlsx';
      const blob = await result.blob();
      downloadFile(blob, filename);
      setToast({ message: 'Excel清单导出成功', type: 'success' });
      await fetchStats();
    } catch (e) {
      setToast({ message: '导出失败，请重试', type: 'error' });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const result = await fetch('/api/export/pdf');
      const filename = result.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || '版权过滤报告.pdf';
      const blob = await result.blob();
      downloadFile(blob, filename);
      setToast({ message: 'PDF报告导出成功', type: 'success' });
      await fetchStats();
    } catch (e) {
      setToast({ message: '导出失败，请重试', type: 'error' });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">导出下载</h1>
          <p className="text-slate-500 mt-1">导出版权过滤清单和报告，用于月底复盘</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">导出Excel清单</h3>
                  <p className="text-sm text-slate-500 mt-1">包含完整匹配结果的18个字段，用于数据复盘</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 mb-2">包含字段</h4>
              <div className="flex flex-wrap gap-2">
                {['歌曲名', '歌手', '时长', '匹配状态', '匹配度', '风险等级', '版权方', '授权类型', '授权地区', '有效期', '风险原因', '冲突类型', '处理状态', '审核状态', '人工调整', '审核意见', '创建时间', '更新时间'].map((field) => (
                  <span key={field} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                    {field}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Info className="w-4 h-4" />
              <span>当前共 <span className="font-semibold text-slate-700">{stats?.total || 0}</span> 条记录待导出</span>
            </div>

            <button
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
                exportingExcel
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20'
              )}
            >
              {exportingExcel ? (
                <>
                  <Loading size="sm" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  导出Excel清单
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">导出PDF报告</h3>
                  <p className="text-sm text-slate-500 mt-1">包含统计概览和风险分级口径，可直接转发同事</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-700 mb-3">报告内容</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>风险统计概览（各等级数量占比）</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>高风险曲目清单（需重点关注）</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>冲突处理进度统计</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>风险分级口径说明（完整判定规则）</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRiskGuide(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 mb-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Shield className="w-4 h-4" />
              预览风险分级口径
            </button>

            <button
              onClick={handleExportPDF}
              disabled={exportingPDF || loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
                exportingPDF
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
              )}
            >
              {exportingPDF ? (
                <>
                  <Loading size="sm" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  导出PDF报告
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">当前数据概览</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(['high', 'medium', 'low', 'none'] as RiskLevel[]).map((level) => (
            <div key={level} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RiskBadge level={level} />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.byRiskLevel?.[level] || 0}
              </p>
              <p className="text-xs text-slate-500">{RISK_LEVEL_LABELS[level]}曲目</p>
            </div>
          ))}
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">使用建议</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• 建议每周导出一次Excel清单进行数据备份</li>
                <li>• 月底复盘时导出PDF报告，包含完整口径说明可直接转发</li>
                <li>• 高风险曲目请及时处理，避免直播中出现版权问题</li>
                <li>• 所有导出操作都会记录在历史记录中，可追溯</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showRiskGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">风险分级口径说明</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">风险等级判定规则</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <RiskBadge level="high" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">高风险</p>
                      <p className="text-sm text-slate-600">
                        无版权匹配、授权已过期、授权地区完全不覆盖、存在明确冲突未处理
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RiskBadge level="medium" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">中风险</p>
                      <p className="text-sm text-slate-600">
                        部分匹配（歌名一致但歌手不同）、授权地区部分覆盖、翻唱版本识别
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RiskBadge level="low" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">低风险</p>
                      <p className="text-sm text-slate-600">
                        完全匹配但授权类型为非独家、匹配置信度在0.6-0.8之间
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <RiskBadge level="none" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">无风险</p>
                      <p className="text-sm text-slate-600">
                        完全匹配（置信度≥0.8）、独家授权、授权地区全覆盖
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2">使用说明</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 系统自动判定仅为参考，最终以人工复核为准</li>
                  <li>• 调整风险等级时请在审核意见中说明理由</li>
                  <li>• 高风险曲目建议从直播歌单中移除</li>
                  <li>• 本口径说明随PDF报告一同导出，方便转发</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowRiskGuide(false)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
