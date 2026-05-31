import React, { useState } from 'react';
import { ArrowLeft, Download, FileText, Link, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStabilityStore } from '@/store/useStabilityStore';
import { useShipStore } from '@/store/useShipStore';
import { useCargoStore } from '@/store/useCargoStore';
import { useVersionStore } from '@/store/useVersionStore';
import { generatePDFReport, downloadPDF } from '@/utils/exportUtils';
import { formatConclusion } from '@/utils/stabilityCalculator';
import html2canvas from 'html2canvas';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const result = useStabilityStore((state) => state.result);
  const { createReport, reports } = useStabilityStore();
  const { currentShip } = useShipStore();
  const { grid } = useCargoStore();
  const { getCurrentBallast, weatherEvidence, manualChecks } = useVersionStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [includeScreenshot, setIncludeScreenshot] = useState(true);

  const currentBallast = getCurrentBallast();
  const relevantChecks = result
    ? manualChecks.filter((c) => c.stabilityResultId === result.id)
    : [];

  const handleCaptureScreenshot = async () => {
    try {
      const sceneEl = document.getElementById('scene3d-container');
      if (!sceneEl) {
        alert('请先在3D工作台页面准备好视图');
        return;
      }

      const canvas = await html2canvas(sceneEl, {
        backgroundColor: '#0A1628',
        scale: 2,
        useCORS: true,
      });

      setScreenshot(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('截图失败:', error);
      alert('截图失败，请确保在3D工作台页面');
    }
  };

  const handleGenerateReport = async () => {
    if (!result || !currentBallast) {
      alert('请先完成稳性计算');
      return;
    }

    setIsGenerating(true);
    try {
      let screenshotData = screenshot;
      if (includeScreenshot && !screenshotData) {
        const sceneEl = document.getElementById('scene3d-container');
        if (sceneEl) {
          const canvas = await html2canvas(sceneEl, {
            backgroundColor: '#0A1628',
            scale: 2,
            useCORS: true,
          });
          screenshotData = canvas.toDataURL('image/png');
        }
      }

      const doc = await generatePDFReport(
        result,
        currentShip,
        grid,
        currentBallast,
        weatherEvidence,
        relevantChecks,
        includeScreenshot ? screenshotData || undefined : undefined
      );

      const report = createReport(includeScreenshot ? screenshotData || undefined : undefined);

      const filename = `船舶稳性报告_${currentShip.name}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPDF(doc, filename);
    } catch (error) {
      console.error('生成报告失败:', error);
      alert('生成报告失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm"
          >
            <ArrowLeft size={16} />
            返回工作台
          </button>
          <h1 className="text-base font-bold text-slate-100">报告导出</h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {result ? (
              <>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-blue-400" />
                    报告预览
                  </h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <h3 className="text-sm font-medium text-slate-200 mb-3">版本对应关系</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-700">
                            <th className="text-left py-2">类型</th>
                            <th className="text-left py-2 font-mono">ID</th>
                            <th className="text-left py-2">说明</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 text-slate-400">船舶模型</td>
                            <td className="py-2 font-mono text-blue-400">{currentShip.id}</td>
                            <td className="py-2 text-slate-500">{currentShip.remark}</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 text-slate-400">货舱格</td>
                            <td className="py-2 font-mono text-blue-400">{grid.id}</td>
                            <td className="py-2 text-slate-500">{grid.rows}×{grid.cols}×{grid.layers} 舱格</td>
                          </tr>
                          <tr className="border-b border-slate-700/50">
                            <td className="py-2 text-slate-400">压载水版本</td>
                            <td className="py-2 font-mono text-blue-400">{currentBallast?.id}</td>
                            <td className="py-2 text-slate-500">{currentBallast?.version} - {currentBallast?.remark}</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-slate-400">计算结果</td>
                            <td className="py-2 font-mono text-blue-400">{result.id}</td>
                            <td className="py-2 text-slate-500">{new Date(result.createdAt).toLocaleString('zh-CN')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-lg border-2 ${
                        result.modelConclusion === 'safe' ? 'border-emerald-600 bg-emerald-950/20' :
                        result.modelConclusion === 'warning' ? 'border-amber-600 bg-amber-950/20' :
                        'border-red-600 bg-red-950/20'
                      }`}>
                        <div className="text-xs text-slate-400 mb-2">船舶模型结论</div>
                        <div className="flex items-center gap-2">
                          {result.modelConclusion === 'safe' && <CheckCircle size={24} className="text-emerald-400" />}
                          {result.modelConclusion === 'warning' && <AlertTriangle size={24} className="text-amber-400" />}
                          {result.modelConclusion === 'danger' && <AlertTriangle size={24} className="text-red-400" />}
                          <span className="text-2xl font-bold" style={{ color: formatConclusion(result.modelConclusion).color }}>
                            {formatConclusion(result.modelConclusion).text}
                          </span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg border-2 ${
                        result.gridConclusion === 'safe' ? 'border-emerald-600 bg-emerald-950/20' :
                        result.gridConclusion === 'warning' ? 'border-amber-600 bg-amber-950/20' :
                        'border-red-600 bg-red-950/20'
                      }`}>
                        <div className="text-xs text-slate-400 mb-2">货舱格结论</div>
                        <div className="flex items-center gap-2">
                          {result.gridConclusion === 'safe' && <CheckCircle size={24} className="text-emerald-400" />}
                          {result.gridConclusion === 'warning' && <AlertTriangle size={24} className="text-amber-400" />}
                          {result.gridConclusion === 'danger' && <AlertTriangle size={24} className="text-red-400" />}
                          <span className="text-2xl font-bold" style={{ color: formatConclusion(result.gridConclusion).color }}>
                            {formatConclusion(result.gridConclusion).text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <h3 className="text-sm font-medium text-slate-200 mb-3">稳性参数</h3>
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-slate-500 mb-1">GM值</div>
                          <div className={`font-mono text-lg font-bold ${result.GM < 0.5 ? 'text-red-400' : result.GM < 0.8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {result.GM}m
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">横倾角</div>
                          <div className={`font-mono text-lg font-bold ${Math.abs(result.heelAngle) > 5 ? 'text-red-400' : Math.abs(result.heelAngle) > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {result.heelAngle}°
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">纵倾角</div>
                          <div className={`font-mono text-lg font-bold ${Math.abs(result.trimAngle) > 3 ? 'text-red-400' : Math.abs(result.trimAngle) > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {result.trimAngle}°
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">排水量</div>
                          <div className="font-mono text-lg font-bold text-slate-200">
                            {result.displacement}t
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <h3 className="text-sm font-medium text-slate-200 mb-3">重心偏移</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400">偏移距离: </span>
                          <span className={`font-mono font-bold ${
                            result.gravityOffset.distance > result.gravityOffset.allowable * 0.7 ? 'text-red-400' :
                            result.gravityOffset.distance > result.gravityOffset.allowable * 0.4 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {result.gravityOffset.distance}m
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            (允许 {result.gravityOffset.allowable}m, 方向 {result.gravityOffset.direction})
                          </span>
                        </div>
                      </div>
                    </div>

                    {result.overloadCells.length > 0 && (
                      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                        <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} />
                          超载舱位
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {result.overloadCells.map((cellId) => (
                            <span key={cellId} className="px-2 py-1 bg-red-900/50 text-red-300 text-xs font-mono rounded">
                              {cellId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!result.isConsistent && (
                      <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                        <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} />
                          天气补充证据
                        </h3>
                        <div className="text-xs text-slate-300">
                          由于船舶模型与货舱格结论不一致，天气等级（{weatherEvidence.weatherLevel}级）已作为补充证据关联至本报告。
                        </div>
                      </div>
                    )}

                    {relevantChecks.length > 0 && (
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <h3 className="text-sm font-medium text-slate-200 mb-3">人工核对记录 ({relevantChecks.length}条)</h3>
                        <div className="space-y-2">
                          {relevantChecks.map((check) => (
                            <div key={check.id} className="p-3 bg-slate-900/50 rounded border-l-4 border-emerald-500">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-300 font-medium">{check.checker}</span>
                                <span className="text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                  {check.checkResult === 'confirmed' ? '已确认' : check.checkResult === 'adjusted' ? '已调整' : '已驳回'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400">
                                {check.checkItem === 'gravityOffset' ? '重心偏移' : check.checkItem === 'overload' ? '舱位超载' : '结论一致性'}
                                : {check.remark}
                              </div>
                              <div className="text-[10px] text-slate-600 mt-1 font-mono">
                                {check.signature}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                  <h2 className="text-lg font-bold text-slate-100 mb-4">导出选项</h2>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeScreenshot}
                        onChange={(e) => setIncludeScreenshot(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300">包含3D视图截图</span>
                    </label>

                    {includeScreenshot && (
                      <div className="space-y-2">
                        <button
                          onClick={handleCaptureScreenshot}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded hover:bg-slate-700 transition-colors"
                        >
                          <Camera size={16} />
                          截取当前3D视图
                        </button>
                        {screenshot && (
                          <div className="relative">
                            <img src={screenshot} alt="3D视图截图" className="w-full rounded-lg border border-slate-700" />
                            <button
                              onClick={() => setScreenshot(null)}
                              className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded"
                            >
                              重新截取
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download size={20} />
                      {isGenerating ? '正在生成报告...' : '生成并下载PDF报告'}
                    </button>
                  </div>
                </div>

                {reports.length > 0 && (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                      <Link size={20} className="text-blue-400" />
                      历史报告
                    </h2>
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <div key={report.id} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-mono text-xs text-blue-400">{report.id}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(report.exportedAt).toLocaleString('zh-CN')} · {report.exporter}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono space-y-0.5">
                            <div>船:{report.shipModelId}</div>
                            <div>舱:{report.cargoGridId}</div>
                            <div>压:{report.ballastVersionId}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <FileText size={64} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 mb-4">请先在3D工作台完成稳性计算</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-500 transition-colors"
                >
                  前往3D工作台
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
