import React, { useState } from 'react';
import { Download, Copy, Check, FileJson, FileText, Share2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useReport } from '@/hooks/useReport';
import { useAppStore } from '@/store/useAppStore';
import { formatDate, formatTime } from '@/utils/time';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ANOMALY_EXPLANATIONS, ANOMALY_TYPE_LABELS } from '@/types';

export const ReportModal: React.FC = () => {
  const { report, showReportModal, setShowReportModal, exportAsJson, exportAsTxt, copySummary } = useReport();
  const { currentRound } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleCopy = async () => {
    const success = await copySummary();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowReportModal(false);
    setShowExportMenu(false);
  };

  if (!report) return null;

  return (
    <Modal
      isOpen={showReportModal}
      onClose={handleClose}
      title="审核报告"
      size="xl"
    >
      <div className="p-6" id="report-content">
        <div className="text-center mb-6 pb-4 border-b border-neutral-200">
          <div className="text-4xl mb-2">📋</div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-1">校园逃生路线审核报告</h2>
          <p className="text-sm text-neutral-500">
            第 {currentRound} 局 · {formatDate(report.startTime)}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-neutral-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-neutral-700">{report.totalMarks}</div>
            <div className="text-sm text-neutral-500">总标记数</div>
          </div>
          <div className="bg-success/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-success">{report.hitCount}</div>
            <div className="text-sm text-neutral-500">命中数</div>
          </div>
          <div className="bg-danger/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-danger">{report.anomalyCount}</div>
            <div className="text-sm text-neutral-500">异常数</div>
          </div>
          <div className="bg-accent/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-accent">
              {formatTime(report.endTime - report.startTime)}
            </div>
            <div className="text-sm text-neutral-500">审核时长</div>
          </div>
        </div>

        <div className="bg-primary/5 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <span className="text-lg">💬</span>
              普通话解释（可直接复制）
            </h3>
            <button
              onClick={handleCopy}
              className={`btn ${copied ? 'btn-success' : 'btn-outline'} !py-1.5 !px-3 text-sm`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制文字'}
            </button>
          </div>
          <p className="text-neutral-700 leading-relaxed text-sm">
            {report.plainTextSummary}
          </p>
        </div>

        {report.anomalies.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-neutral-700 mb-3 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              异常详情
            </h3>
            <div className="space-y-3">
              {report.anomalies.map((anomaly, index) => (
                <div 
                  key={anomaly.logId} 
                  className="border-2 border-danger/20 bg-danger/5 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-danger flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <StatusBadge status={anomaly.type} />
                      <span className="font-medium text-neutral-700">{anomaly.description}</span>
                    </div>
                  </div>
                  
                  <div className="ml-9 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-neutral-400 shrink-0">原因：</span>
                      <span className="text-neutral-600">
                        {ANOMALY_EXPLANATIONS[anomaly.type]}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-neutral-400 shrink-0">处理意见：</span>
                      <span className="text-accent font-medium">{anomaly.opinion || '待处理'}</span>
                    </div>
                    {anomaly.tracePoints.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-400 shrink-0">轨迹点：</span>
                        <div className="flex flex-wrap gap-1">
                          {anomaly.tracePoints.map((p, i) => (
                            <span key={i} className="text-xs bg-neutral-200/50 px-2 py-0.5 rounded">
                              ({p.x}, {p.y})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {anomaly.relatedLogs.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-400 shrink-0">关联操作：</span>
                        <span className="text-neutral-500">
                          前后各 {Math.ceil(anomaly.relatedLogs.length / 2)} 条记录
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold text-neutral-700 mb-3 flex items-center gap-2">
            <span className="text-lg">📝</span>
            操作记录明细
          </h3>
          <div className="bg-neutral-50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="px-4 py-2 text-left text-neutral-600 font-medium">序号</th>
                  <th className="px-4 py-2 text-left text-neutral-600 font-medium">类型</th>
                  <th className="px-4 py-2 text-left text-neutral-600 font-medium">描述</th>
                  <th className="px-4 py-2 text-left text-neutral-600 font-medium">坐标</th>
                  <th className="px-4 py-2 text-left text-neutral-600 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {report.actionLogs.map((log, index) => (
                  <tr key={log.id} className="border-t border-neutral-200 hover:bg-white">
                    <td className="px-4 py-2 text-neutral-500">{index + 1}</td>
                    <td className="px-4 py-2">
                      <StatusBadge 
                        status={log.anomalyType || log.type} 
                        size="sm" 
                      />
                    </td>
                    <td className="px-4 py-2 text-neutral-700">{log.description}</td>
                    <td className="px-4 py-2 text-neutral-500 font-mono text-xs">
                      {log.point ? `(${log.point.x}, ${log.point.y})` : '-'}
                    </td>
                    <td className="px-4 py-2 text-neutral-500 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {report.materials.length > 0 && (
          <div>
            <h3 className="font-semibold text-neutral-700 mb-3 flex items-center gap-2">
              <span className="text-lg">🖼️</span>
              审核素材清单
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {report.materials.map(material => (
                <div key={material.id} className="bg-neutral-50 rounded-lg p-2">
                  <img 
                    src={material.dataUrl} 
                    alt={material.name} 
                    className="w-full h-16 object-cover rounded mb-1"
                  />
                  <p className="text-[10px] text-neutral-500 truncate">{material.name}</p>
                  <StatusBadge status={material.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <div className="text-sm text-neutral-500">
          报告编号：{report.id.substring(0, 16)}...
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn btn-accent"
          >
            <Download size={18} />
            导出报告
            <Share2 size={14} />
          </button>
          
          {showExportMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-hard border border-neutral-200 py-1 min-w-[160px] animate-fade-in-up">
              <button
                onClick={() => {
                  exportAsJson();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-neutral-50 flex items-center gap-2 text-sm"
              >
                <FileJson size={16} className="text-primary" />
                导出 JSON 格式
              </button>
              <button
                onClick={() => {
                  exportAsTxt();
                  setShowExportMenu(false);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-neutral-50 flex items-center gap-2 text-sm border-t border-neutral-100"
              >
                <FileText size={16} className="text-success" />
                导出文本格式
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
