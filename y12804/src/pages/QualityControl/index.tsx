import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import LineChart from '@/components/Chart/LineChart';
import DataTable from '@/components/common/DataTable';
import Collapsible from '@/components/common/Collapsible';
import {
  FlaskConical,
  RefreshCw,
  Plus,
  Edit,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Activity,
  FileText,
} from 'lucide-react';
import type { QcResult, ReagentBatch } from '@/types';
import { formatDateTime } from '@/utils/common';

export default function QualityControlPage() {
  const {
    qcResults,
    samples,
    reagentBatches,
    runBatches,
    updateReagentAndRecalculate,
    addReagentBatch,
    runQcAnalysis,
    createRunBatch,
  } = useAppStore();

  const [selectedTestItem, setSelectedTestItem] = useState<string>('体重指数');
  const [selectedQc, setSelectedQc] = useState<QcResult | null>(null);
  const [showReagentModal, setShowReagentModal] = useState(false);

  const testItems = useMemo(() => {
    const items = new Set(qcResults.map((q) => q.testItem));
    return Array.from(items);
  }, [qcResults]);

  const chartData = useMemo(() => {
    const filtered = qcResults.filter((q) => q.testItem === selectedTestItem);
    return filtered.map((qc) => {
      const sample = samples.find((s) => s.id === qc.sampleId);
      return {
        label: sample ? sample.barcode.slice(-6) : '未知',
        value: qc.resultValue ?? 0,
        status: (qc.resultStatus === 'normal' ? 'normal' : qc.resultStatus === 'warning' ? 'warning' : 'abnormal') as 'normal' | 'warning' | 'abnormal',
        id: qc.id,
      };
    });
  }, [qcResults, selectedTestItem, samples]);

  const referenceRange = useMemo(() => {
    const filtered = qcResults.filter((q) => q.testItem === selectedTestItem);
    if (filtered.length > 0 && filtered[0].referenceRange) {
      return filtered[0].referenceRange;
    }
    return undefined;
  }, [qcResults, selectedTestItem]);

  const getStatusBadge = (status: QcResult['resultStatus']) => {
    const map: Record<QcResult['resultStatus'], { variant: string; label: string }> = {
      normal: { variant: 'success', label: '正常' },
      warning: { variant: 'warning', label: '警告' },
      abnormal: { variant: 'danger', label: '异常' },
      pending: { variant: 'default', label: '待检测' },
      failed: { variant: 'danger', label: '失败' },
    };
    const cfg = map[status];
    return <Badge variant={cfg.variant as 'success'}>{cfg.label}</Badge>;
  };

  const qcColumns = [
    {
      key: 'sampleBarcode',
      title: '样本条码',
      width: '140px',
      render: (row: QcResult) => {
        const sample = samples.find((s) => s.id === row.sampleId);
        return (
          <span className="font-mono text-sm text-primary-800">
            {sample?.barcode || '未知'}
          </span>
        );
      },
    },
    {
      key: 'testItem',
      title: '检测项目',
      width: '120px',
    },
    {
      key: 'resultValue',
      title: '结果值',
      width: '100px',
      render: (row: QcResult) => (
        <span className="font-mono text-sm font-medium text-primary-800">
          {row.resultValue !== null ? row.resultValue.toFixed(2) : '未测定'}
        </span>
      ),
    },
    {
      key: 'unit',
      title: '单位',
      width: '80px',
    },
    {
      key: 'resultStatus',
      title: '状态',
      width: '80px',
      render: (row: QcResult) => getStatusBadge(row.resultStatus),
    },
    {
      key: 'reagentBatch',
      title: '试剂批号',
      width: '140px',
      render: (row: QcResult) => {
        const reagent = reagentBatches.find((r) => r.id === row.reagentBatchId);
        return reagent ? (
          <span className="font-mono text-xs text-primary-600">
            {reagent.batchNumber}
          </span>
        ) : (
          <Badge variant="supplement">未指定</Badge>
        );
      },
    },
    {
      key: 'testedAt',
      title: '检测时间',
      width: '150px',
      render: (row: QcResult) => formatDateTime(row.testedAt),
    },
    {
      key: 'actions',
      title: '操作',
      width: '100px',
      align: 'right' as const,
      render: (row: QcResult) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedQc(row)}
        >
          详情
        </Button>
      ),
    },
  ];

  const handleAssignReagent = (qcId: string, reagentId: string) => {
    updateReagentAndRecalculate(qcId, reagentId);
    setSelectedQc(null);
  };

  const handleRunNewBatch = () => {
    const batch = createRunBatch('新质控批次', '张检验师');
    const sampleIds = samples.slice(0, 5).map((s) => s.id);
    runQcAnalysis(batch.id, sampleIds);
  };

  const detailsPanel = selectedQc ? (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-primary-700">质控详情</h4>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">检测项目</span>
          <span className="font-medium text-primary-800">{selectedQc.testItem}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">结果值</span>
          <span className="font-mono font-bold text-primary-800">
            {selectedQc.resultValue !== null
              ? `${selectedQc.resultValue.toFixed(2)} ${selectedQc.unit}`
              : '未测定'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">状态</span>
          {getStatusBadge(selectedQc.resultStatus)}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">检测时间</span>
          <span className="text-primary-700">{formatDateTime(selectedQc.testedAt)}</span>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <h5 className="text-xs font-medium text-primary-700 mb-2">计算公式</h5>
        <code className="text-xs bg-neutral-100 p-2 rounded block text-primary-700">
          {selectedQc.formula}
        </code>
      </div>

      {selectedQc.referenceRange && (
        <div className="border-t border-neutral-200 pt-4">
          <h5 className="text-xs font-medium text-primary-700 mb-2">参考范围</h5>
          <p className="text-sm text-success-700">
            {selectedQc.referenceRange.min} - {selectedQc.referenceRange.max} {selectedQc.unit}
          </p>
        </div>
      )}

      {selectedQc.failureReason && (
        <div className="p-3 bg-supplement-50 rounded-md border border-supplement-200">
          <h5 className="text-xs font-medium text-supplement-800 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            失败/异常原因
          </h5>
          <p className="text-xs text-supplement-700">{selectedQc.failureReason}</p>
        </div>
      )}

      <div className="border-t border-neutral-200 pt-4">
        <h5 className="text-xs font-medium text-primary-700 mb-2">关联试剂批号</h5>
        <div className="space-y-2">
          {reagentBatches.map((reagent) => (
            <button
              key={reagent.id}
              onClick={() => handleAssignReagent(selectedQc.id, reagent.id)}
              className={`w-full text-left p-2 rounded text-xs transition-colors ${
                selectedQc.reagentBatchId === reagent.id
                  ? 'bg-medical-50 border border-medical-300'
                  : 'bg-neutral-50 hover:bg-neutral-100 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-medium text-primary-800">
                  {reagent.batchNumber}
                </span>
                {selectedQc.reagentBatchId === reagent.id && (
                  <CheckCircle className="w-3.5 h-3.5 text-medical-600" />
                )}
              </div>
              <p className="text-neutral-500 mt-0.5">{reagent.reagentName}</p>
            </button>
          ))}
        </div>
        <p className="text-xxs text-neutral-400 mt-2">
          点击试剂批号可重新关联，系统将自动重算质控结果
        </p>
      </div>
    </div>
  ) : (
    <div className="text-center py-8 text-neutral-400 text-sm">
      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
      选择一条质控记录查看详情
    </div>
  );

  return (
    <div className="space-y-6">
      <Card
        title="质控趋势分析"
        subtitle={`${selectedTestItem} - 各样本质控结果趋势`}
        headerAction={
          <div className="flex items-center gap-2">
            <select
              value={selectedTestItem}
              onChange={(e) => setSelectedTestItem(e.target.value)}
              className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
            >
              {testItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleRunNewBatch}
            >
              运行新批次
            </Button>
          </div>
        }
      >
        <LineChart
          data={chartData}
          yAxisLabel={qcResults.find((q) => q.testItem === selectedTestItem)?.unit || ''}
          referenceRange={referenceRange}
          height={260}
          onPointClick={(point) => {
            const qc = qcResults.find(
              (q) =>
                q.id === point.id ||
                (q.testItem === selectedTestItem &&
                  q.resultValue === point.value)
            );
            if (qc) {
              setSelectedQc(qc);
            }
          }}
          detailsComponent={detailsPanel}
        />

        <div className="mt-4 p-3 bg-neutral-50 rounded-md border border-neutral-200">
          <h5 className="text-sm font-medium text-primary-700 flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-medical-600" />
            图表说明
          </h5>
          <ul className="text-xs text-neutral-600 space-y-1">
            <li>• 绿色区域为参考范围，落在区域内的结果为正常</li>
            <li>• <span className="text-medical-600 font-medium">蓝色点</span>表示正常质控结果</li>
            <li>• <span className="text-red-600 font-medium">红色点</span>表示超出参考范围的异常结果</li>
            <li>• 点击数据点可在右侧查看该样本的详细质控信息</li>
            <li>• 补录或更换试剂批号后，质控结果会自动重新计算</li>
          </ul>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card
            title="质控结果列表"
            subtitle={`共 ${qcResults.length} 条质控记录`}
          >
            <DataTable
              columns={qcColumns}
              data={qcResults}
              rowKey="id"
              highlightRow={(row) =>
                row.resultStatus === 'abnormal' || row.resultStatus === 'failed'
              }
              highlightClass="bg-supplement-50"
              emptyText="暂无质控结果"
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="试剂批号管理"
            headerAction={
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setShowReagentModal(true)}
              >
                新增
              </Button>
            }
          >
            <div className="space-y-3">
              {reagentBatches.map((reagent) => (
                <Collapsible
                  key={reagent.id}
                  title={reagent.batchNumber}
                  subtitle={reagent.reagentName}
                  icon={<FlaskConical className="w-4 h-4 text-medical-600" />}
                  badge={
                    reagent.isActive ? (
                      <Badge variant="success">在用</Badge>
                    ) : (
                      <Badge variant="default">停用</Badge>
                    )
                  }
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">供应商</span>
                      <span className="text-primary-700">{reagent.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">生产日期</span>
                      <span className="text-primary-700">{reagent.manufactureDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">有效期至</span>
                      <span className="text-primary-700">{reagent.expiryDate}</span>
                    </div>
                  </div>
                </Collapsible>
              ))}
            </div>

            <div className="mt-4 p-3 bg-medical-50 rounded-md border border-medical-200">
              <p className="text-xs text-medical-700">
                <strong>提示：</strong>补录或修改试剂批号后，
                关联的质控结果会自动重新计算，
                确保差异分析的准确性。
              </p>
            </div>
          </Card>

          <Card title="运行批次历史">
            <div className="space-y-2">
              {runBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="p-3 bg-neutral-50 rounded-md hover:bg-primary-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-medium text-primary-800">
                      {batch.batchNumber}
                    </span>
                    <Badge variant={batch.status === 'completed' ? 'success' : 'warning'}>
                      {batch.status === 'completed' ? '已完成' : '运行中'}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500">{batch.name}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {batch.sampleCount} 样本
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {batch.anomalyCount} 异常
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {showReagentModal && (
        <AddReagentModal
          onClose={() => setShowReagentModal(false)}
          onAdd={(data) => {
            addReagentBatch(data);
            setShowReagentModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddReagentModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Omit<ReagentBatch, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    batchNumber: '',
    reagentName: '',
    manufactureDate: '',
    expiryDate: '',
    supplier: '',
    isActive: true,
  });

  const handleSubmit = () => {
    if (!formData.batchNumber || !formData.reagentName) {
      alert('请填写必填项');
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-xl w-[480px]">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary-800 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-medical-600" />
            新增试剂批号
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              批号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.batchNumber}
              onChange={(e) =>
                setFormData({ ...formData, batchNumber: e.target.value })
              }
              placeholder="如：REAG-2024-003"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              试剂名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.reagentName}
              onChange={(e) =>
                setFormData({ ...formData, reagentName: e.target.value })
              }
              placeholder="如：血糖检测试剂盒"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1.5">
                生产日期
              </label>
              <input
                type="date"
                value={formData.manufactureDate}
                onChange={(e) =>
                  setFormData({ ...formData, manufactureDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1.5">
                有效期至
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">
              供应商
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) =>
                setFormData({ ...formData, supplier: e.target.value })
              }
              placeholder="如：生化科技有限公司"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-neutral-300 text-medical-600 focus:ring-medical-500"
            />
            <label htmlFor="isActive" className="text-sm text-primary-700">
              设为在用试剂
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>确认添加</Button>
        </div>
      </div>
    </div>
  );
}
