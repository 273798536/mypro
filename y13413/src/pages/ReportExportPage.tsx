import { useEffect, useState } from 'react';
import {
  Download,
  Copy,
  FileText,
  Eye,
  CheckSquare,
  Square,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import EmptyState from '@/components/ui/EmptyState';
import { useBatchStore } from '@/store/useBatchStore';
import { useRecordStore } from '@/store/useRecordStore';
import { useExportStore } from '@/store/useExportStore';
import type { Batch, ReviewRecord, Anomaly } from '@/types';
import { cn } from '@/lib/utils';

type ReportFormat = 'PDF' | 'CSV';

interface ReportContent {
  versionHistory: boolean;
  computationTrace: boolean;
  anomalyDetails: boolean;
  handoverNotes: boolean;
}

interface HandoverTodo {
  id: string;
  text: string;
  checked: boolean;
}

export default function ReportExportPage() {
  const { batches, initMock: initBatchMock } = useBatchStore();
  const { records, anomalies, initMock: initRecordMock } = useRecordStore();
  const { generateCSV, getReportData } = useExportStore();

  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [reportFormat, setReportFormat] = useState<ReportFormat>('PDF');
  const [reportContent, setReportContent] = useState<ReportContent>({
    versionHistory: true,
    computationTrace: true,
    anomalyDetails: false,
    handoverNotes: false,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [handoverTodos, setHandoverTodos] = useState<HandoverTodo[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (batches.length === 0) {
      initBatchMock();
    }
    if (records.length === 0) {
      initRecordMock();
    }
  }, [batches.length, records.length, initBatchMock, initRecordMock]);

  useEffect(() => {
    if (batches.length > 0 && selectedBatchIds.length === 0) {
      setSelectedBatchIds([batches[0].id]);
    }
  }, [batches, selectedBatchIds.length]);

  const batchOptions = [
    { value: 'all', label: '全部批次' },
    ...batches.map((b) => ({ value: b.id, label: b.name })),
  ];

  const handleBatchSelect = (value: string) => {
    if (value === 'all') {
      setSelectedBatchIds(batches.map((b) => b.id));
    } else {
      setSelectedBatchIds([value]);
    }
  };

  const handleContentToggle = (key: keyof ReportContent, checked: boolean) => {
    setReportContent((prev) => ({ ...prev, [key]: checked }));
  };

  const handleGeneratePreview = () => {
    const todos: HandoverTodo[] = [
      { id: '1', text: '复核所有异常记录并确认处理方案', checked: false },
      { id: '2', text: '与教研室确认边界条件外推规则', checked: false },
      { id: '3', text: '更新教学文档中的数值参考表', checked: false },
      { id: '4', text: '归档本次复核报告至教学档案系统', checked: false },
      { id: '5', text: '准备下一批次数据导入模板', checked: false },
    ];
    setHandoverTodos(todos);
    setShowPreview(true);
  };

  const toggleTodo = (todoId: string) => {
    setHandoverTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, checked: !t.checked } : t))
    );
  };

  const handleDownload = () => {
    if (selectedBatchIds.length === 0) return;
    if (reportFormat === 'CSV') {
      const csvContent = selectedBatchIds
        .map((bid) => generateCSV(bid))
        .join('\n\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `复核报告_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } else {
      alert('PDF 导出功能模拟：已触发 PDF 报告生成');
    }
  };

  const handleCopyHandover = async () => {
    const text = handoverTodos
      .map((t) => `${t.checked ? '[x]' : '[ ]'} ${t.text}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const currentBatchId =
    selectedBatchIds.length === 1 ? selectedBatchIds[0] : selectedBatchIds[0] || 'all';
  const reportData = getReportData(selectedBatchIds);

  const newRecordsForDisplay: ReviewRecord[] = reportData.newRecords.slice(0, 10);
  const skippedRecordsForDisplay: ReviewRecord[] = reportData.skippedRecords.slice(0, 10);
  const anomalyRecordsForDisplay: ReviewRecord[] = reportData.anomalyRecords.slice(0, 10);
  const relatedAnomalies: Anomaly[] = anomalies.filter((a) =>
    selectedBatchIds.includes(a.batchId)
  );

  const drivingFactorCount = records
    .filter((r) => selectedBatchIds.includes(r.batchId))
    .reduce((count, record) => {
      const currentVersion = record.versions.find((v) => v.id === record.currentVersionId);
      if (currentVersion?.computationTrace) {
        return (
          count +
          currentVersion.computationTrace.filter((s) => s.isDrivingFactor).length
        );
      }
      return count;
    }, 0);

  if (batches.length === 0) {
    return (
      <PageContainer title="报告导出" subtitle="按批次生成复核报告 · 支持 PDF/CSV">
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="暂无数据"
          description="请先导入批次数据后再生成报告。"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="报告导出"
      subtitle="按批次生成复核报告 · 支持 PDF/CSV"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>导出配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Select
                label="批次选择"
                value={currentBatchId === 'all' ? 'all' : currentBatchId}
                onChange={handleBatchSelect}
                options={batchOptions}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2 font-serif">
                报告格式
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReportFormat('PDF')}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-md border font-medium text-sm transition-all',
                    reportFormat === 'PDF'
                      ? 'bg-ink-600 text-white border-ink-700'
                      : 'bg-parchment-50 text-ink-700 border-parchment-300 hover:bg-parchment-100'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setReportFormat('CSV')}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-md border font-medium text-sm transition-all',
                    reportFormat === 'CSV'
                      ? 'bg-ink-600 text-white border-ink-700'
                      : 'bg-parchment-50 text-ink-700 border-parchment-300 hover:bg-parchment-100'
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink-700 mb-2 font-serif">
                包含内容
              </label>
              <Toggle
                label="版本历史"
                checked={reportContent.versionHistory}
                onChange={(c) => handleContentToggle('versionHistory', c)}
                description="包含每条记录的版本变更记录与操作人"
              />
              <Toggle
                label="计算追踪"
                checked={reportContent.computationTrace}
                onChange={(c) => handleContentToggle('computationTrace', c)}
                description="包含计算过程步骤与拉动因素标注"
              />
              <Toggle
                label="异常详情"
                checked={reportContent.anomalyDetails}
                onChange={(c) => handleContentToggle('anomalyDetails', c)}
                description="包含异常类型、严重度与处理建议"
              />
              <Toggle
                label="交接说明"
                checked={reportContent.handoverNotes}
                onChange={(c) => handleContentToggle('handoverNotes', c)}
                description="包含待办事项清单与后续工作建议"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                icon={<Eye className="w-4 h-4" />}
                onClick={handleGeneratePreview}
              >
                生成预览
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPreview && (
          <div className="bg-ink-50 rounded-lg p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white shadow-parchment-lg rounded-md border border-parchment-200 p-12 min-h-[800px]">
                <div className="border-b border-parchment-200 pb-6 mb-8">
                  <h1 className="font-serif text-2xl font-bold text-ink-700 mb-2">
                    教学数据复核报告
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm font-mono text-charcoal-500">
                    <span>
                      生成时间：{new Date().toLocaleString('zh-CN')}
                    </span>
                    <span>
                      批次范围：
                      {selectedBatchIds.length === batches.length
                        ? '全部批次'
                        : selectedBatchIds
                            .map((id) => batches.find((b) => b.id === id)?.name || id)
                            .join('、')}
                    </span>
                  </div>
                </div>

                <section className="mb-8">
                  <h2 className="font-serif text-lg font-bold text-ink-700 mb-4 border-b border-parchment-100 pb-2">
                    一、复核概览
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-parchment-50 rounded-sm">
                      <p className="text-3xl font-mono font-bold text-ink-700">
                        {reportData.summary.total}
                      </p>
                      <p className="text-xs text-charcoal-500 mt-1 font-serif">总记录数</p>
                    </div>
                    <div className="text-center p-4 bg-ink-50 rounded-sm">
                      <p className="text-3xl font-mono font-bold text-ink-600">
                        {reportData.summary.new}
                      </p>
                      <p className="text-xs text-charcoal-500 mt-1 font-serif">新增待审</p>
                    </div>
                    <div className="text-center p-4 bg-parchment-100 rounded-sm">
                      <p className="text-3xl font-mono font-bold text-parchment-700">
                        {reportData.summary.skipped}
                      </p>
                      <p className="text-xs text-charcoal-500 mt-1 font-serif">跳过记录</p>
                    </div>
                    <div className="text-center p-4 bg-vermilion-50 rounded-sm">
                      <p className="text-3xl font-mono font-bold text-vermilion-600">
                        {reportData.summary.anomaly}
                      </p>
                      <p className="text-xs text-charcoal-500 mt-1 font-serif">异常记录</p>
                    </div>
                  </div>
                </section>

                {reportContent.computationTrace && (
                  <section className="mb-8">
                    <h2 className="font-serif text-lg font-bold text-ink-700 mb-4 border-b border-parchment-100 pb-2">
                      五、计算说明
                    </h2>
                    <div className="space-y-2 text-sm font-serif text-charcoal-700">
                      <p>
                        本次复核共检测到 <span className="font-mono font-bold text-vermilion-600">{drivingFactorCount}</span> 个显著拉动因素，主要类型包括：
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>边界条件超限外推</li>
                        <li>区间端点取值偏差</li>
                        <li>数值方法收敛性不足</li>
                      </ul>
                    </div>
                  </section>
                )}

                <section className="mb-8">
                  <h2 className="font-serif text-lg font-bold text-ink-700 mb-4 border-b border-parchment-100 pb-2">
                    二、新增记录清单
                  </h2>
                  {newRecordsForDisplay.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-parchment-200">
                          <th className="text-left py-2 px-3 font-serif font-medium text-charcoal-500">
                            记录编号
                          </th>
                          <th className="text-left py-2 px-3 font-serif font-medium text-charcoal-500">
                            来源
                          </th>
                          <th className="text-left py-2 px-3 font-serif font-medium text-charcoal-500">
                            版本
                          </th>
                          <th className="text-left py-2 px-3 font-serif font-medium text-charcoal-500">
                            边界状态
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {newRecordsForDisplay.map((r) => {
                          const v = r.versions.find((vv) => vv.id === r.currentVersionId);
                          return (
                            <tr key={r.id} className="border-b border-parchment-100">
                              <td className="py-2 px-3 font-mono text-ink-700">
                                {r.recordNo || r.recordKey}
                              </td>
                              <td className="py-2 px-3 font-mono text-charcoal-600 text-xs">
                                {r.sourceFile}
                              </td>
                              <td className="py-2 px-3 font-mono text-charcoal-600">
                                v{v?.version || v?.versionNumber}
                              </td>
                              <td className="py-2 px-3">
                                <Badge
                                  variant={r.isOutOfBounds ? 'anomaly' : 'normal'}
                                >
                                  {r.isOutOfBounds ? '越界' : '正常'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-charcoal-500 font-serif">暂无新增记录</p>
                  )}
                </section>

                <section className="mb-8">
                  <h2 className="font-serif text-lg font-bold text-ink-700 mb-4 border-b border-parchment-100 pb-2">
                    三、跳过记录清单
                  </h2>
                  {skippedRecordsForDisplay.length > 0 ? (
                    <div className="space-y-2">
                      {skippedRecordsForDisplay.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between py-2 px-3 bg-parchment-50 rounded-sm"
                        >
                          <span className="font-mono text-ink-700">
                            {r.recordNo || r.recordKey}
                          </span>
                          <Badge variant="skipped">幂等保留，版本未覆盖</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-charcoal-500 font-serif">暂无跳过记录</p>
                  )}
                </section>

                <section className="mb-8">
                  <h2 className="font-serif text-lg font-bold text-ink-700 mb-4 border-b border-parchment-100 pb-2">
                    四、异常记录清单
                  </h2>
                  {reportContent.anomalyDetails && relatedAnomalies.length > 0 ? (
                    <div className="space-y-3">
                      {relatedAnomalies.slice(0, 8).map((a) => (
                        <div
                          key={a.id}
                          className="p-4 border border-vermilion-200 bg-vermilion-50/50 rounded-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="anomaly">{a.type}</Badge>
                            <Badge
                              variant={
                                a.severity === 'high'
                                  ? 'anomaly'
                                  : a.severity === 'medium'
                                  ? 'info'
                                  : 'skipped'
                              }
                            >
                              {a.severity === 'high'
                                ? '严重'
                                : a.severity === 'medium'
                                ? '中等'
                                : '轻微'}
                            </Badge>
                            <span className="font-mono text-xs text-charcoal-500">
                              记录: {a.recordId}
                            </span>
                          </div>
                          <p className="text-sm text-charcoal-700 font-serif mb-1">
                            {a.description}
                          </p>
                          {a.suggestion && (
                            <p className="text-xs text-charcoal-500 font-serif">
                              建议：{a.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : anomalyRecordsForDisplay.length > 0 ? (
                    <div className="space-y-2">
                      {anomalyRecordsForDisplay.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between py-2 px-3 bg-vermilion-50 rounded-sm"
                        >
                          <span className="font-mono text-ink-700">
                            {r.recordNo || r.recordKey}
                          </span>
                          <Badge variant="anomaly">异常待处理</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-charcoal-500 font-serif">暂无异常记录</p>
                  )}
                </section>

                {reportContent.handoverNotes && (
                  <section className="mb-8">
                    <h2 className="font-serif text-lg font-bold text-ink-700 mb-4 border-b border-parchment-100 pb-2">
                      六、交接清单
                    </h2>
                    <div className="space-y-2">
                      {handoverTodos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center gap-3 py-2"
                        >
                          {todo.checked ? (
                            <CheckSquare className="w-5 h-5 text-ink-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-charcoal-300 flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-sm font-serif',
                              todo.checked
                                ? 'text-charcoal-400 line-through'
                                : 'text-charcoal-700'
                            )}
                          >
                            {todo.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 justify-end">
          <Button
            variant="secondary"
            icon={copied ? <CheckSquare className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={handleCopyHandover}
            disabled={!showPreview || !reportContent.handoverNotes}
          >
            {copied ? '已复制' : '复制交接清单'}
          </Button>
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
            disabled={!showPreview || selectedBatchIds.length === 0}
          >
            下载报告
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
