import { useState, useRef } from 'react';
import { Camera, FileText, X, Download, Clock, MapPin, Calendar as CalendarIcon, Sun, Cloud, Layers } from 'lucide-react';
import { useSolarStore } from '../store/solarStore';
import { generateDailyData } from '../utils/solarCalculator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ExportTools() {
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { params, results } = useSolarStore();

  const dailyData = generateDailyData(params);

  const handleScreenshot = async () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `solar-panel-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleExportReport = () => {
    if (!reportRef.current) return;

    const reportContent = generateReportContent();
    const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar-report-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReportContent = () => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>太阳能板试算报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111827; color: #fff; padding: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; margin-bottom: 8px; color: #60a5fa; }
        .subtitle { color: #9ca3af; margin-bottom: 32px; }
        .section { background: #1f2937; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #d1d5db; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .item { display: flex; justify-content: space-between; }
        .label { color: #9ca3af; }
        .value { font-weight: 500; font-family: monospace; }
        .highlight { color: #34d399; font-size: 18px; }
        .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .data-card { background: #374151; border-radius: 8px; padding: 16px; text-align: center; }
        .data-label { font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
        .data-value { font-size: 24px; font-weight: 700; font-family: monospace; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #374151; color: #6b7280; font-size: 12px; }
        .source { margin-top: 8px; font-size: 11px; color: #4b5563; }
    </style>
</head>
<body>
    <div class="container">
        <h1>太阳能板角度试算报告</h1>
        <p class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

        <div class="section">
            <div class="data-grid">
                <div class="data-card">
                    <div class="data-label">太阳高度角</div>
                    <div class="data-value" style="color: #fbbf24;">${results.solarElevation.toFixed(1)}°</div>
                </div>
                <div class="data-card">
                    <div class="data-label">太阳方位角</div>
                    <div class="data-value" style="color: #60a5fa;">${results.solarAzimuth.toFixed(1)}°</div>
                </div>
                <div class="data-card">
                    <div class="data-label">辐照量</div>
                    <div class="data-value" style="color: #f97316;">${results.irradiation.toFixed(0)} W/㎡</div>
                </div>
                <div class="data-card">
                    <div class="data-label">估算功率</div>
                    <div class="data-value" style="color: #34d399;">${results.powerOutput.toFixed(2)} kW</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">输入参数</div>
            <div class="grid">
                <div class="item"><span class="label">地理位置</span><span class="value">${params.location.name} (${params.location.lat.toFixed(2)}°, ${params.location.lng.toFixed(2)}°)</span></div>
                <div class="item"><span class="label">时区</span><span class="value">${params.location.timezone}</span></div>
                <div class="item"><span class="label">日期</span><span class="value">${params.date}</span></div>
                <div class="item"><span class="label">面板倾角</span><span class="value highlight">${params.tiltAngle}°</span></div>
                <div class="item"><span class="label">天气系数</span><span class="value">${(params.weatherFactor * 100).toFixed(0)}%</span></div>
                <div class="item"><span class="label">面板面积</span><span class="value">${params.panelArea} ㎡</span></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">逐时发电功率 (kW)</div>
            <table style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid #374151;">
                        ${dailyData.map(d => `<th style="padding: 8px; text-align: center; color: #9ca3af; font-weight: normal;">${d.hour}时</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${dailyData.map(d => `<td style="padding: 8px; text-align: center; font-family: monospace; color: #34d399;">${d.power.toFixed(2)}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>太阳能板角度试算工具 · 校园节能小组</p>
            <p class="source">计算依据: 太阳位置算法 + 标准辐照模型 (1000 W/㎡) + 面板效率 18%</p>
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <>
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleScreenshot}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-200 backdrop-blur-sm border border-gray-600"
          title="导出截图"
        >
          <Camera className="w-5 h-5" />
          <span>截图</span>
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/90 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-all duration-200 backdrop-blur-sm border border-gray-600"
          title="生成报告"
        >
          <FileText className="w-5 h-5" />
          <span>报告</span>
        </button>
      </div>

      {showReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                试算报告预览
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出 HTML
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div ref={reportRef} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">太阳能板角度试算报告</h3>
                <p className="text-sm text-gray-500">生成时间: {new Date().toLocaleString('zh-CN')}</p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">太阳高度角</div>
                  <div className="text-2xl font-bold text-yellow-400 font-mono">{results.solarElevation.toFixed(1)}°</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">太阳方位角</div>
                  <div className="text-2xl font-bold text-blue-400 font-mono">{results.solarAzimuth.toFixed(1)}°</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">辐照量</div>
                  <div className="text-2xl font-bold text-orange-400 font-mono">{results.irradiation.toFixed(0)}</div>
                  <div className="text-xs text-gray-500">W/㎡</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">估算功率</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{results.powerOutput.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">kW</div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">输入参数</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">地点:</span>
                    <span className="text-white">{params.location.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">时区:</span>
                    <span className="text-white">{params.location.timezone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">日期:</span>
                    <span className="text-white">{params.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">倾角:</span>
                    <span className="text-emerald-400">{params.tiltAngle}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">天气:</span>
                    <span className="text-white">{(params.weatherFactor * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">面积:</span>
                    <span className="text-white">{params.panelArea} ㎡</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">日发电曲线</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData.map(d => ({ ...d, name: `${d.hour}时` }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="power" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="功率 (kW)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700 text-xs text-gray-500">
                <p>计算依据: 太阳位置算法 + 标准辐照模型 (1000 W/㎡) + 面板转换效率 18%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
