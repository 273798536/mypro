import { useEffect, useState } from 'react';
import { Upload, ChevronDown, ChevronUp, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Table, { TableColumn } from '@/components/ui/Table';
import Toggle from '@/components/ui/Toggle';
import Input from '@/components/ui/Input';
import Select, { SelectOption } from '@/components/ui/Select';
import { useBatchStore } from '@/store/useBatchStore';
import { useRuleStore } from '@/store/useRuleStore';
import { useRecordStore } from '@/store/useRecordStore';
import type { BatchFile, ReviewRule } from '@/types';

const extrapolationOptions: SelectOption[] = [
  { value: 'clip', label: '边界截断 (clip)' },
  { value: 'linear', label: '线性外推 (linear)' },
  { value: 'parabolic', label: '抛物线外推 (parabolic)' },
];

interface MockFile extends BatchFile {
  status: 'validated' | 'pending';
  hash: string;
}

const initialFiles: MockFile[] = [
  {
    id: 'file-1',
    name: '高等数学下册_第六章_例题数据.xlsx',
    size: 245760,
    uploadedAt: '2026-06-22T10:00:00+08:00',
    status: 'validated',
    hash: 'a7f3d9b2c4e8f1a0d5c3b7e9f2a4d6c8',
  },
  {
    id: 'file-2',
    name: '微分方程_第七章_作业数据.csv',
    size: 81920,
    uploadedAt: '2026-06-22T10:05:00+08:00',
    status: 'pending',
    hash: 'b8e4c0a3d5f9b2e1c6a4d8f0b3e5c7a9',
  },
];

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function BatchReviewPage() {
  const { initMock: initBatchMock, createBatch, runBatch } = useBatchStore();
  const { initMock: initRuleMock, rules, toggleRule, updateRule } = useRuleStore();
  const { initMock: initRecordMock } = useRecordStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState<MockFile[]>(initialFiles);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [counts, setCounts] = useState({ total: 0, new: 0, skipped: 0, anomaly: 0 });

  useEffect(() => {
    initBatchMock();
    initRuleMock();
    initRecordMock();
  }, [initBatchMock, initRuleMock, initRecordMock]);

  const toggleRuleExpanded = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleRunBatch = () => {
    if (files.length === 0) return;
    setIsRunning(true);
    const batch = createBatch(`新建批次-${new Date().toLocaleDateString()}`, files);

    const simulateRecordCount = 20;
    let skipped = 0;
    let anomaly = 0;
    let newCount = 0;

    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.1) {
        anomaly++;
      } else if (rand < 0.2) {
        skipped++;
      } else if (rand < 0.6) {
      } else {
        newCount++;
      }

      const currentTotal = newCount + skipped + anomaly + Math.floor((newCount + skipped + anomaly) * 0.5);
      setCounts({
        total: Math.min(currentTotal, simulateRecordCount),
        new: newCount,
        skipped,
        anomaly,
      });

      if (newCount + skipped + anomaly >= simulateRecordCount * 0.8) {
        clearInterval(interval);
        runBatch(batch.id, rules);
        const finalBatch = useBatchStore.getState().batches.find((b) => b.id === batch.id);
        setCounts({
          total: finalBatch?.totalRecords ?? simulateRecordCount,
          new: finalBatch?.newRecords ?? newCount,
          skipped: finalBatch?.skippedRecords ?? skipped,
          anomaly: finalBatch?.anomalyRecords ?? anomaly,
        });
        setIsRunning(false);
        setIsCompleted(true);
      }
    }, 150);
  };

  const fileColumns: TableColumn<MockFile>[] = [
    { key: 'name', header: '文件名' },
    { key: 'size', header: '大小', render: (row) => formatSize(row.size), align: 'right' },
    {
      key: 'status',
      header: '状态',
      render: (row) =>
        row.status === 'validated' ? (
          <Badge variant="normal">已校验</Badge>
        ) : (
          <Badge variant="skipped">待上传</Badge>
        ),
    },
    {
      key: 'hash',
      header: '哈希值',
      render: (row) => (
        <span className="font-mono text-xs text-charcoal-500">{row.hash}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={() => handleDeleteFile(row.id)}
        />
      ),
    },
  ];

  const steps = [
    { num: 1, title: '材料上传' },
    { num: 2, title: '规则配置' },
    { num: 3, title: '执行与进度' },
  ];

  return (
    <PageContainer
      title="新建复核批次"
      subtitle="上传材料 · 配置规则 · 执行跑批"
    >
      <div className="flex gap-8">
        <div className="w-48 flex-shrink-0">
          <div className="relative">
            {steps.map((step, index) => (
              <div key={step.num} className="relative">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold font-serif border-2 transition-all duration-200 ${
                      currentStep >= step.num
                        ? 'bg-ink-600 text-white border-ink-600'
                        : 'bg-white text-charcoal-400 border-parchment-300'
                    }`}
                  >
                    {step.num}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      currentStep >= step.num ? 'text-ink-700' : 'text-charcoal-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[17px] top-10 w-0.5 h-10 ${
                      currentStep > step.num ? 'bg-ink-400' : 'bg-parchment-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>步骤 1：材料上传</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="border-dashed border-2 border-parchment-300 rounded-lg p-12 text-center bg-parchment-50/50 cursor-pointer hover:border-ink-400 hover:bg-parchment-100/50 transition-colors"
                onClick={() => setCurrentStep(1)}
              >
                <Upload className="w-12 h-12 text-ink-400 mx-auto mb-4" />
                <p className="font-serif text-lg text-ink-700 font-medium mb-1">
                  拖拽材料文件到此处，或点击选择
                </p>
                <p className="text-sm text-charcoal-500 font-mono">
                  支持 .pdf / .csv / .xlsx，单文件最大 10MB
                </p>
              </div>

              <div>
                <Table
                  columns={fileColumns}
                  data={files}
                  rowKey="id"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep(2)}
                >
                  下一步：配置规则
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>步骤 2：规则配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.map((rule: ReviewRule) => (
                <div
                  key={rule.id}
                  className="border border-parchment-200 rounded-md overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-parchment-50 hover:bg-parchment-100 cursor-pointer transition-colors"
                    onClick={() => toggleRuleExpanded(rule.id)}
                  >
                    <div className="flex-1">
                      <Toggle
                        label={rule.name}
                        checked={rule.enabled}
                        onChange={(checked) => {
                          toggleRule(rule.id);
                          if (checked && !expandedRules.has(rule.id)) {
                            setExpandedRules((prev) => new Set(prev).add(rule.id));
                          }
                        }}
                        description={rule.description}
                      />
                    </div>
                    <button
                      type="button"
                      className="p-1 text-charcoal-400 hover:text-ink-600 transition-colors"
                    >
                      {expandedRules.has(rule.id) ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {expandedRules.has(rule.id) && (
                    <div className="px-4 py-4 border-t border-parchment-200 bg-white">
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          label="阈值下界"
                          type="number"
                          value={rule.threshold?.lower ?? 0}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              threshold: {
                                lower: Number(e.target.value),
                                upper: rule.threshold?.upper ?? 0,
                              },
                            })
                          }
                        />
                        <Input
                          label="阈值上界"
                          type="number"
                          value={rule.threshold?.upper ?? 0}
                          onChange={(e) =>
                            updateRule(rule.id, {
                              threshold: {
                                lower: rule.threshold?.lower ?? 0,
                                upper: Number(e.target.value),
                              },
                            })
                          }
                        />
                        <Select
                          label="外推方法"
                          options={extrapolationOptions}
                          value={rule.extrapolationMethod ?? 'clip'}
                          onChange={(val) =>
                            updateRule(rule.id, { extrapolationMethod: val })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  上一步
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(3)}>
                  下一步：执行跑批
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>步骤 3：执行与进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-charcoal-600 font-mono">
                    准备就绪，点击下方按钮开始批量复核
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRunBatch}
                  loading={isRunning}
                  disabled={isCompleted || files.length === 0}
                >
                  {isCompleted ? '批次已完成' : isRunning ? '处理中...' : '开始跑批'}
                </Button>
              </div>

              {(isRunning || isCompleted) && (
                <>
                  <ProgressBar
                    value={0}
                    segments={[
                      { value: counts.new, color: '#4a5568', label: '已处理' },
                      { value: counts.skipped, color: '#a8a29e', label: '跳过' },
                      { value: counts.anomaly, color: '#dc2626', label: '异常' },
                    ]}
                    showLabel
                  />

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-parchment-50 border border-parchment-200 rounded-md p-4 text-center">
                      <p className="text-xs text-charcoal-500 font-mono mb-1">总记录</p>
                      <p className="text-2xl font-bold font-serif text-ink-700">
                        {counts.total}
                      </p>
                    </div>
                    <div className="bg-parchment-50 border border-parchment-200 rounded-md p-4 text-center">
                      <p className="text-xs text-ink-600 font-mono mb-1">新增</p>
                      <p className="text-2xl font-bold font-serif text-ink-700">
                        {counts.new}
                      </p>
                    </div>
                    <div className="bg-parchment-50 border border-parchment-200 rounded-md p-4 text-center">
                      <p className="text-xs text-parchment-700 font-mono mb-1">跳过</p>
                      <p className="text-2xl font-bold font-serif text-parchment-700">
                        {counts.skipped}
                      </p>
                    </div>
                    <div className="bg-parchment-50 border border-parchment-200 rounded-md p-4 text-center">
                      <p className="text-xs text-vermilion-600 font-mono mb-1">异常</p>
                      <p className="text-2xl font-bold font-serif text-vermilion-600">
                        {counts.anomaly}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {isCompleted && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium font-serif">批次处理完成</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-ink-50 border border-ink-200 rounded-md p-5">
                      <p className="text-xs text-ink-600 font-mono mb-2">新增记录</p>
                      <p className="text-3xl font-bold font-serif text-ink-700">
                        {counts.new} 条
                      </p>
                    </div>
                    <div className="bg-parchment-50 border border-parchment-300 rounded-md p-5">
                      <p className="text-xs text-parchment-700 font-mono mb-2">跳过记录</p>
                      <p className="text-3xl font-bold font-serif text-parchment-800">
                        {counts.skipped} 条
                      </p>
                    </div>
                    <div className="bg-vermilion-50 border border-vermilion-200 rounded-md p-5">
                      <p className="text-xs text-vermilion-600 font-mono mb-2">异常记录</p>
                      <p className="text-3xl font-bold font-serif text-vermilion-700">
                        {counts.anomaly} 条
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Link to="/records">
                      <Button variant="secondary">查看详情</Button>
                    </Link>
                    <Link to="/export">
                      <Button variant="primary">导出报告</Button>
                    </Link>
                  </div>
                </div>
              )}

              {!isRunning && !isCompleted && (
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                    上一步
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
