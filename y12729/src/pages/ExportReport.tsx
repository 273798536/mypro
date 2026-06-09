import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import type { SampleStatus } from '@/types';
import {
  PrimaryButton,
  SectionCard,
  PillButton,
  StatusBadge,
} from '@/components/Badges';
import FlowGraph from '@/components/FlowGraph';

type ExportScope = 'all' | 'normal' | 'pending';

interface ToggleOption {
  key: string;
  label: string;
  defaultChecked: boolean;
}

const TOGGLE_OPTIONS: ToggleOption[] = [
  { key: 'includeRawData', label: '包含原始数据', defaultChecked: true },
  { key: 'includeDuplicateReasons', label: '包含重复样本拦截理由', defaultChecked: true },
  { key: 'includeVisualization', label: '包含瓶颈可视化示意图', defaultChecked: false },
];

function ReportToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border ${
        checked
          ? 'bg-accent-cyan/15 border-accent-cyan/40 text-neutral-50'
          : 'bg-deep-700/40 border-deep-600/50 text-neutral-300 hover:border-accent-cyan/30'
      }`}
    >
      <span
        className={`relative w-9 h-5 rounded-full transition-all duration-200 ${
          checked ? 'bg-accent-cyan' : 'bg-deep-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
      <span className={checked ? 'text-neutral-50' : 'text-neutral-300'}>{label}</span>
      {checked && <span className="text-accent-cyan text-xs">✓</span>}
    </button>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function generateReportId() {
  const d = new Date();
  return `RPT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export default function ExportReport() {
  const { samples, getDuplicatePairs } = useStore();
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [options, setOptions] = useState<Record<string, boolean>>(
    TOGGLE_OPTIONS.reduce((acc, o) => ({ ...acc, [o.key]: o.defaultChecked }), {})
  );
  const [showPreview, setShowPreview] = useState(false);
  const [reportId] = useState(generateReportId());

  const duplicatePairs = useMemo(() => getDuplicatePairs(), [getDuplicatePairs]);

  const filteredSamples = useMemo(() => {
    if (exportScope === 'all') return samples;
    if (exportScope === 'normal') return samples.filter((s) => s.status === 'normal');
    return samples.filter((s) => s.status === 'pending');
  }, [samples, exportScope]);

  const summary = useMemo(() => {
    const total = filteredSamples.length;
    const normal = filteredSamples.filter((s) => s.status === 'normal').length;
    const pending = filteredSamples.filter((s) => s.status === 'pending').length;
    const badData = filteredSamples.filter((s) => s.status === 'bad_data').length;
    const duplicates = filteredSamples.filter((s) => s.isDuplicate).length;
    return { total, normal, pending, badData, duplicates };
  }, [filteredSamples]);

  const scopeCounts = useMemo(
    () => ({
      all: samples.length,
      normal: samples.filter((s) => s.status === 'normal').length,
      pending: samples.filter((s) => s.status === 'pending').length,
    }),
    [samples]
  );

  const typicalSamples = useMemo(
    () => filteredSamples.filter((s) => s.status !== 'bad_data').slice(0, 3),
    [filteredSamples]
  );

  const handleToggle = (key: string, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = () => {
    setShowPreview(true);
  };

  const handleExportPDF = () => {
    console.log('[ExportReport] 导出PDF报告', {
      reportId,
      scope: exportScope,
      options,
      sampleCount: filteredSamples.length,
      duplicateCount: duplicatePairs.length,
    });
    alert(`报告导出成功！\n报告编号：${reportId}\n样本数量：${filteredSamples.length}\n重复样本对：${duplicatePairs.length}`);
  };

  const maxBarValue = Math.max(summary.total, 1);

  return (
    <div className="min-h-screen p-6 md:p-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-50 mb-2 tracking-tight">
            报告导出
          </h1>
          <p className="text-neutral-400 text-sm md:text-base">
            面向投委会的专业评审报告
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <SectionCard title="导出配置" icon="📋">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-3 uppercase tracking-wider">
                  导出范围
                </label>
                <div className="flex flex-wrap gap-2">
                  <PillButton
                    active={exportScope === 'all'}
                    onClick={() => setExportScope('all')}
                    count={scopeCounts.all}
                  >
                    全部数据
                  </PillButton>
                  <PillButton
                    active={exportScope === 'normal'}
                    onClick={() => setExportScope('normal')}
                    count={scopeCounts.normal}
                  >
                    仅正常数据
                  </PillButton>
                  <PillButton
                    active={exportScope === 'pending'}
                    onClick={() => setExportScope('pending')}
                    count={scopeCounts.pending}
                  >
                    仅待复核数据
                  </PillButton>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-3 uppercase tracking-wider">
                  报告内容
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TOGGLE_OPTIONS.map((opt) => (
                    <ReportToggle
                      key={opt.key}
                      checked={options[opt.key]}
                      onChange={(v) => handleToggle(opt.key, v)}
                      label={opt.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <PrimaryButton onClick={handleGenerate} icon={<span>🔍</span>}>
                  生成报告预览
                </PrimaryButton>
              </div>
            </div>
          </SectionCard>
        </div>

        {showPreview && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <PrimaryButton onClick={handleExportPDF} icon={<span>📥</span>}>
                导出为PDF报告
              </PrimaryButton>
            </div>

            <div className="max-w-3xl mx-auto bg-white/95 text-gray-800 rounded shadow-2xl p-10 animate-fade-in">
              <div className="border-b-2 border-gray-200 pb-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  网络流瓶颈定位分析报告
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                  <span>生成时间：{formatTime(new Date().toISOString())}</span>
                  <span>报告编号：{reportId}</span>
                </div>
              </div>

              <section className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  一、概览
                </h3>

                <div className="mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-2 border border-gray-200 font-medium text-gray-700">
                          统计项
                        </th>
                        <th className="text-right px-4 py-2 border border-gray-200 font-medium text-gray-700">
                          数量
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 border border-gray-200 text-gray-700">样本总数</td>
                        <td className="text-right px-4 py-2 border border-gray-200 font-mono font-semibold text-gray-900">
                          {summary.total}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 border border-gray-200 text-gray-700">正常样本</td>
                        <td className="text-right px-4 py-2 border border-gray-200 font-mono font-semibold text-green-600">
                          {summary.normal}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border border-gray-200 text-gray-700">待确认样本</td>
                        <td className="text-right px-4 py-2 border border-gray-200 font-mono font-semibold text-amber-600">
                          {summary.pending}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 border border-gray-200 text-gray-700">坏数据</td>
                        <td className="text-right px-4 py-2 border border-gray-200 font-mono font-semibold text-red-600">
                          {summary.badData}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 border border-gray-200 text-gray-700">重复样本</td>
                        <td className="text-right px-4 py-2 border border-gray-200 font-mono font-semibold text-red-600">
                          {summary.duplicates}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">数据分布</h4>
                  <div className="space-y-3">
                    {[
                      { label: '正常', value: summary.normal, color: 'bg-green-500' },
                      { label: '待确认', value: summary.pending, color: 'bg-amber-500' },
                      { label: '坏数据', value: summary.badData, color: 'bg-red-500' },
                      { label: '重复样本', value: summary.duplicates, color: 'bg-rose-500' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-gray-600 shrink-0">{item.label}</span>
                        <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                          <div
                            className={`h-full ${item.color} rounded transition-all duration-500`}
                            style={{ width: `${(item.value / maxBarValue) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-sm font-mono font-medium text-gray-800 shrink-0">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {options.includeDuplicateReasons && duplicatePairs.length > 0 && (
                <section className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    二、重复样本拦截详情
                  </h3>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <strong className="text-gray-900">拦截说明：</strong>
                      本系统通过拓扑结构相似度、容量配置一致性、最大流结果吻合度三个维度综合评估样本间的重复概率。
                      相似度超过阈值（≥85%）的样本对将被自动标记为重复，以避免在投委会评审中重复占用资源、确保评审效率。
                      以下为本次数据中被拦截的重复样本明细：
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left px-3 py-2.5 border border-gray-200 font-medium text-gray-700">
                            重复对 1
                          </th>
                          <th className="text-left px-3 py-2.5 border border-gray-200 font-medium text-gray-700">
                            重复对 2
                          </th>
                          <th className="text-center px-3 py-2.5 border border-gray-200 font-medium text-gray-700">
                            相似度
                          </th>
                          <th className="text-left px-3 py-2.5 border border-gray-200 font-medium text-gray-700">
                            拦截理由
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicatePairs.map((pair, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2.5 border border-gray-200 text-gray-800 align-top">
                              <div className="font-medium">{pair.sample1.name}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{pair.sample1.id}</div>
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200 text-gray-800 align-top">
                              <div className="font-medium">{pair.sample2.name}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{pair.sample2.id}</div>
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200 align-top text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-mono font-semibold ${
                                pair.score >= 0.95
                                  ? 'bg-red-100 text-red-700'
                                  : pair.score >= 0.9
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {(pair.score * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-2.5 border border-gray-200 text-gray-700 text-sm align-top">
                              {pair.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  三、典型样例分析
                </h3>

                <div className="space-y-6">
                  {typicalSamples.map((sample, idx) => (
                    <div key={sample.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-500">样例 {idx + 1}</span>
                          <h4 className="font-medium text-gray-900">{sample.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={sample.status as SampleStatus} />
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {sample.explanation && (
                          <div>
                            <h5 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                              瓶颈结论
                            </h5>
                            <p className="text-sm text-gray-800 leading-relaxed">
                              {sample.explanation.summary}
                            </p>
                          </div>
                        )}

                        {sample.explanation && (
                          <div>
                            <h5 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                              解释说明
                            </h5>
                            <div className="text-sm text-gray-700 leading-relaxed space-y-1.5">
                              <p>
                                <span className="font-medium text-gray-800">最大流：</span>
                                <span className="font-mono">{sample.explanation.maxFlow}</span>
                              </p>
                              <p>
                                <span className="font-medium text-gray-800">瓶颈值：</span>
                                <span className="font-mono">{sample.explanation.bottleneckValue}</span>
                              </p>
                              {sample.explanation.affectedNodes.length > 0 && (
                                <p>
                                  <span className="font-medium text-gray-800">受影响节点：</span>
                                  <span className="font-mono">{sample.explanation.affectedNodes.join(', ')}</span>
                                </p>
                              )}
                              <p className="text-gray-600 italic mt-2">
                                {sample.explanation.teachingNote}
                              </p>
                            </div>
                          </div>
                        )}

                        {options.includeVisualization && sample.nodes.length > 0 && (
                          <div>
                            <h5 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                              可视化示意图
                            </h5>
                            <div className="bg-[#0A1628] rounded-lg p-3">
                              <FlowGraph nodes={sample.nodes} edges={sample.edges} width={640} height={320} />
                            </div>
                          </div>
                        )}

                        {options.includeRawData && (
                          <div>
                            <h5 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                              原始数据摘要
                            </h5>
                            <div className="bg-gray-50 rounded border border-gray-200 p-3 text-xs font-mono text-gray-600 space-y-1">
                              <p>节点数：{sample.nodes.length} | 边数：{sample.edges.length}</p>
                              <p>源点：{sample.source} | 汇点：{sample.sink}</p>
                              <p>创建时间：{formatTime(sample.createdAt)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="border-t-2 border-gray-200 pt-4 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                <span>系统版本：FlowBottleneck Analyzer v1.0.0</span>
                <span>生成时间戳：{new Date().toISOString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <PrimaryButton onClick={handleExportPDF} icon={<span>📥</span>}>
                导出为PDF报告
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
