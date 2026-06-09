import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkbench } from '../store/workbench';
import { api } from '../api/client';
import { formatDateTime, statusLabel, statusClass, riskLabel, riskClass } from '../utils';
import { FileDown, Copy, Check, FileText, AlertTriangle, Volume2 } from 'lucide-react';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { report, loadReport, currentSnapshot } = useWorkbench();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) loadReport(id);
  }, [id]);

  const handleCopy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.plainExplanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!id) return;
    api.downloadReport(id);
  };

  if (!report) {
    return (
      <div className="h-[calc(100vh-3.5rem-2rem)] flex items-center justify-center text-charcoal-500">
        正在生成报告...
      </div>
    );
  }

  const { snapshot, latestRecord, plainExplanation, historySummary } = report;

  return (
    <div className="h-[calc(100vh-3.5rem-2rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-sm bg-industrial-800 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-white">施工交底说明</h1>
            <div className="text-xs text-charcoal-500 font-mono mt-0.5">
              {snapshot.code} · 生成于 {formatDateTime(new Date().toISOString())}
            </div>
          </div>
          <button onClick={handleCopy} className="btn-primary">
            {copied ? <Check className="w-4 h-4 text-alert-green" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制' : '复制解释'}
          </button>
          <button onClick={handleDownload} className="btn-warning">
            <FileDown className="w-4 h-4" />
            下载 Markdown
          </button>
        </div>

        <div className="card-panel p-8 bg-charcoal-900/70">
          <div className="border-b border-charcoal-800 pb-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-sm text-alert-orange">{snapshot.code}</span>
              <span className={`badge ${statusClass(snapshot.status)}`}>{statusLabel(snapshot.status)}</span>
              <span className={`badge border ${riskClass(snapshot.riskLevel)}`}>
                {snapshot.riskLevel === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                风险 {riskLabel(snapshot.riskLevel)}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-white">{snapshot.deviceName}</h2>
            <div className="mt-2 text-xs text-charcoal-500">
              复核人：{snapshot.lastOperator} · 复核时间：{formatDateTime(snapshot.updatedAt)}
            </div>
          </div>

          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-alert-orange" />
              <Volume2 className="w-4 h-4 text-alert-orange" />
              <h3 className="text-base font-medium text-white">普通话解释（可直接复制转发）</h3>
            </div>
            <div className="bg-industrial-900/40 border border-industrial-700/50 rounded-sm p-5 text-sm text-charcoal-100 leading-relaxed whitespace-pre-line">
              {plainExplanation}
            </div>
            <button
              onClick={handleCopy}
              className="mt-2 text-xs text-alert-orange hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? '已复制到剪贴板' : '点击复制整段文字'}
            </button>
          </section>

          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-industrial-500" />
              <h3 className="text-base font-medium text-white">技术参数</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {latestRecord.coordinates && (
                <div className="card-panel p-4">
                  <div className="text-[11px] text-charcoal-500 uppercase tracking-wider mb-2">设备坐标</div>
                  <div className="font-mono text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">X</span>
                      <span className="text-white">
                        {latestRecord.coordinates.x} {latestRecord.coordinates.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Y</span>
                      <span className="text-white">
                        {latestRecord.coordinates.y} {latestRecord.coordinates.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">Z</span>
                      <span className="text-white">
                        {latestRecord.coordinates.z} {latestRecord.coordinates.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {latestRecord.dimensions && (
                <div className="card-panel p-4">
                  <div className="text-[11px] text-charcoal-500 uppercase tracking-wider mb-2">尺寸参数</div>
                  <div className="font-mono text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">宽</span>
                      <span className="text-white">
                        {latestRecord.dimensions.width} {latestRecord.dimensions.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">高</span>
                      <span className="text-white">
                        {latestRecord.dimensions.height} {latestRecord.dimensions.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal-400">深</span>
                      <span className="text-white">
                        {latestRecord.dimensions.depth} {latestRecord.dimensions.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {latestRecord.conversions && latestRecord.conversions.length > 0 && (
              <div className="card-panel p-4 mt-4">
                <div className="text-[11px] text-charcoal-500 uppercase tracking-wider mb-3">单位换算（复核通过）</div>
                <div className="grid grid-cols-2 gap-2">
                  {latestRecord.conversions.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-charcoal-800/60 border border-charcoal-700 rounded-sm px-3 py-2 font-mono text-xs"
                    >
                      <span className="text-charcoal-400">
                        {c.value} {c.fromUnit}
                      </span>
                      <span className="text-alert-orange">→</span>
                      <span className="text-alert-green">
                        {c.converted} {c.toUnit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {latestRecord.riskNotes && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-alert-orange" />
                <h3 className="text-base font-medium text-white">风险备注</h3>
              </div>
              <div className="card-panel p-4 text-sm text-charcoal-100 leading-relaxed">
                {latestRecord.riskNotes}
              </div>
            </section>
          )}

          {latestRecord.conclusion && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-alert-green" />
                <h3 className="text-base font-medium text-white">复核结论</h3>
              </div>
              <div className="card-panel p-4 text-sm text-charcoal-100 leading-relaxed border-l-4 border-alert-green">
                {latestRecord.conclusion}
              </div>
            </section>
          )}

          {historySummary.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-charcoal-600" />
                <h3 className="text-base font-medium text-white">修订历史</h3>
              </div>
              <div className="card-panel divide-y divide-charcoal-800">
                {historySummary.map((h) => (
                  <div key={h.version} className="px-4 py-3 flex items-center gap-4 text-sm">
                    <span className="w-10 font-mono text-alert-orange text-xs">v{h.version}</span>
                    <span className="text-white">{h.operator}</span>
                    <span className="text-charcoal-400 flex-1">{h.reason}</span>
                    <span className="text-[11px] text-charcoal-500 font-mono">
                      {formatDateTime(h.date)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
