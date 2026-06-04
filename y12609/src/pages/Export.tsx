import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { generateExportReport, downloadJSON, downloadMarkdown, exportStats } from '@/utils/export';
import { Download, FileJson, FileText, CheckCircle, XCircle, AlertTriangle, FileCheck, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Export() {
  const {
    annotations,
    colorRules,
    getCurrentSample,
    samples,
    currentSampleId,
    loadSample
  } = useStore();

  const [showPreview, setShowPreview] = useState(false);

  const sample = getCurrentSample();
  const report = useMemo(() => {
    if (!sample) return null;
    return generateExportReport(sample, annotations, colorRules);
  }, [sample, annotations, colorRules]);

  const stats = useMemo(() => {
    return exportStats(annotations, colorRules);
  }, [annotations, colorRules]);

  const pieData = useMemo(() => [
    { name: '有效', value: stats.summary.valid, color: '#10B981' },
    { name: '无效', value: stats.summary.invalid, color: '#DC2626' },
    { name: '重复', value: stats.summary.duplicate, color: '#F59E0B' }
  ], [stats]);

  const handleDownloadJSON = () => {
    if (!report) return;
    downloadJSON(report, sample?.name || 'hotzone-report');
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    downloadMarkdown(report, sample?.name || 'hotzone-report');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="font-mono text-2xl font-bold text-slate-800 mb-2">报告导出</h1>
          <p className="text-sm text-slate-500 font-mono">
            导出的报告包含完整的标注数据、校验结果和拦截原因，确保图、表、文字三者一致。人工备注原样保留。
          </p>
        </div>

        <div className="mb-6">
          <label className="text-xs text-slate-500 mb-2 block font-mono">选择要导出的样例</label>
          <div className="flex gap-2">
            <select
              value={currentSampleId || ''}
              onChange={(e) => loadSample(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {samples.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 font-mono text-sm"
            >
              <Eye size={16} />
              {showPreview ? '隐藏预览' : '预览报告'}
            </button>
          </div>
        </div>

        {sample && (
          <>
            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="p-4 bg-white rounded-lg border border-slate-200 text-center">
                <div className="text-2xl font-bold font-mono text-slate-800">{stats.summary.total}</div>
                <div className="text-[11px] text-slate-500 font-mono">标注总数</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                <CheckCircle size={20} className="mx-auto text-green-600 mb-1" />
                <div className="text-2xl font-bold font-mono text-green-700">{stats.summary.valid}</div>
                <div className="text-[11px] text-green-600 font-mono">有效</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
                <XCircle size={20} className="mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold font-mono text-red-700">{stats.summary.invalid}</div>
                <div className="text-[11px] text-red-600 font-mono">无效</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <AlertTriangle size={20} className="mx-auto text-amber-600 mb-1" />
                <div className="text-2xl font-bold font-mono text-amber-700">{stats.summary.duplicate}</div>
                <div className="text-[11px] text-amber-600 font-mono">重复</div>
              </div>
              <div className={`p-4 rounded-lg border text-center ${
                report?.consistencyCheck
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <FileCheck size={20} className={`mx-auto mb-1 ${
                  report?.consistencyCheck ? 'text-blue-600' : 'text-red-600'
                }`} />
                <div className={`text-2xl font-bold font-mono ${
                  report?.consistencyCheck ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {report?.consistencyCheck ? '✓' : '✗'}
                </div>
                <div className={`text-[11px] font-mono ${
                  report?.consistencyCheck ? 'text-blue-600' : 'text-red-600'
                }`}>
                  一致性
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h3 className="text-sm font-mono font-bold text-slate-700 mb-4">各等级标注分布</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byLevel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Tooltip
                      contentStyle={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.byLevel.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h3 className="text-sm font-mono font-bold text-slate-700 mb-4">标注状态分布</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {showPreview && report && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200">
                <h3 className="text-sm font-mono font-bold text-slate-700 mb-4">报告预览 - 不可用记录清单</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="px-3 py-2 text-left border-b border-red-200 text-red-800">标注ID</th>
                        <th className="px-3 py-2 text-left border-b border-red-200 text-red-800">等级</th>
                        <th className="px-3 py-2 text-left border-b border-red-200 text-red-800">颜色</th>
                        <th className="px-3 py-2 text-left border-b border-red-200 text-red-800">拦截原因</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.invalidAnnotations.map(ann => (
                        <tr key={ann.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 text-red-700 line-through">{ann.id}</td>
                          <td className="px-3 py-2">{ann.level}</td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-block w-3 h-3 rounded mr-1 align-middle"
                              style={{ backgroundColor: ann.color }}
                            />
                            {ann.color}
                          </td>
                          <td className="px-3 py-2 text-red-700">
                            {report.blockReasons[ann.id]?.join('；') || ann.blockReason || '未知原因'}
                          </td>
                        </tr>
                      ))}
                      {report.invalidAnnotations.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                            暂无不可用记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {sample.manualNotes.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-sm font-mono font-bold text-amber-800 mb-3">人工备注（将原样包含在报告中）</h3>
                <div className="space-y-2">
                  {sample.manualNotes.map((note, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white rounded border border-amber-200 text-[11px] text-amber-900 font-mono whitespace-pre-wrap"
                    >
                      <span className="text-amber-600 font-bold mr-2">{i + 1}.</span>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleDownloadJSON}
                className="flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileJson size={24} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-mono font-bold text-slate-800">下载 JSON</div>
                  <div className="text-[11px] text-slate-500 font-mono">包含完整数据结构，可用于程序处理</div>
                </div>
                <Download size={20} className="text-slate-400 ml-auto" />
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <FileText size={24} className="text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-mono font-bold text-slate-800">下载 Markdown</div>
                  <div className="text-[11px] text-slate-500 font-mono">格式化报告，学生可直接阅读理解</div>
                </div>
                <Download size={20} className="text-slate-400 ml-auto" />
              </button>
            </div>

            <div className="mt-6 p-4 bg-slate-800 text-white rounded-lg">
              <h3 className="text-sm font-mono font-bold mb-2">给学生的说明</h3>
              <p className="text-[11px] text-slate-300 font-mono mb-2">
                导出报告中的「不可用记录」部分是你需要重点关注的内容。每条被拦截的标注都附有详细的拦截原因说明：
              </p>
              <ul className="text-[11px] text-slate-300 font-mono space-y-1">
                <li>• 重复标注：系统使用多边形重叠检测算法，重叠率≥30%即判定为重复</li>
                <li>• 无效颜色/等级：请确认当前颜色规则中定义了对应等级</li>
                <li>• 所有拦截都可以通过撤销操作回退，或修改标注后重新提交</li>
                <li>• 人工备注保留了运营人员的原始说明，请注意阅读参考</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
