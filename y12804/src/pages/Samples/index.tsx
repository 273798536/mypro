import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import DataTable from '@/components/common/DataTable';
import LineChart from '@/components/Chart/LineChart';
import Collapsible from '@/components/common/Collapsible';
import {
  Plus,
  Search,
  AlertTriangle,
  Filter,
  X,
  Info,
  MousePointer,
  FileText,
  Copy,
  Clock,
  AlertOctagon,
} from 'lucide-react';
import type { Sample, DuplicateBarcodeInfo } from '@/types';
import { formatDateTime } from '@/utils/common';

export default function SamplesPage() {
  const { samples, cages, getDuplicateBarcodes, addSample, qcResults } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCage, setSelectedCage] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateBarcodeInfo | null>(null);

  const duplicateBarcodes = getDuplicateBarcodes();

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchesSearch =
        sample.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.sampleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.collector.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCage = !selectedCage || sample.cageId === selectedCage;

      return matchesSearch && matchesCage;
    });
  }, [samples, searchTerm, selectedCage]);

  const duplicateBarcodeSet = useMemo(() => {
    const set = new Set<string>();
    for (const dup of duplicateBarcodes) {
      set.add(dup.barcode);
    }
    return set;
  }, [duplicateBarcodes]);

  const getStatusBadge = (status: Sample['status']) => {
    const map: Record<Sample['status'], { variant: string; label: string }> = {
      pending: { variant: 'default', label: '待检测' },
      testing: { variant: 'warning', label: '检测中' },
      completed: { variant: 'success', label: '已完成' },
      failed: { variant: 'danger', label: '失败' },
    };
    const cfg = map[status];
    return <Badge variant={cfg.variant as 'default'}>{cfg.label}</Badge>;
  };

  const getCageNumber = (cageId: string) => {
    const cage = cages.find((c) => c.id === cageId);
    return cage?.cageNumber || '未知';
  };

  const sampleQcData = (sampleId: string) => {
    const sampleQc = qcResults.filter((q) => q.sampleId === sampleId);
    if (sampleQc.length === 0) return null;

    const data = sampleQc.map((qc) => ({
      label: qc.testItem,
      value: qc.resultValue ?? 0,
      status: qc.resultStatus === 'normal' ? 'normal' : qc.resultStatus === 'warning' ? 'warning' : 'abnormal',
      id: qc.id,
    }));

    return data;
  };

  const duplicateChartData = useMemo(() => {
    return duplicateBarcodes.map((d) => ({
      label: d.barcode.slice(-6),
      value: d.count,
      status: 'abnormal' as const,
      id: d.barcode,
    }));
  }, [duplicateBarcodes]);

  const columns = [
    {
      key: 'barcode',
      title: '样本条码',
      width: '160px',
      render: (row: Sample) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-primary-800">
            {row.barcode}
          </span>
          {duplicateBarcodeSet.has(row.barcode) && (
            <Badge variant="danger">
              <AlertTriangle className="w-3 h-3 mr-1" />
              重复
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'cageId',
      title: '笼位号',
      width: '100px',
      render: (row: Sample) => (
        <span className="text-sm text-primary-700">{getCageNumber(row.cageId)}</span>
      ),
    },
    {
      key: 'sampleType',
      title: '样本类型',
      width: '100px',
    },
    {
      key: 'collectionDate',
      title: '采集日期',
      width: '120px',
    },
    {
      key: 'collector',
      title: '采集人',
      width: '100px',
    },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (row: Sample) => getStatusBadge(row.status),
    },
    {
      key: 'remark',
      title: '备注',
      render: (row: Sample) => (
        <span className="text-sm text-neutral-500">{row.remark || '-'}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      align: 'right' as const,
      render: (row: Sample) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1.5 text-neutral-500 hover:text-medical-600 hover:bg-medical-50 rounded transition-colors"
            title="查看详情"
            onClick={() => {
              const dup = duplicateBarcodes.find((d) => d.barcode === row.barcode);
              if (dup) {
                setSelectedDuplicate(dup);
              }
            }}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {duplicateBarcodes.length > 0 && (
        <Card
          title="条码重复检测提醒"
          subtitle="以下条码存在重复录入，请注意核实"
          className="border-supplement-300 bg-supplement-50/30"
          headerAction={
            <Badge variant="supplement">
              {duplicateBarcodes.length} 组重复
            </Badge>
          }
        >
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium text-primary-700 mb-3">
                重复条码分布
              </h5>
              <div className="h-48">
                {duplicateChartData.length > 0 && (
                  <LineChart
                    data={duplicateChartData}
                    height={180}
                    yAxisLabel="次数"
                    onPointClick={(point) => {
                      const dup = duplicateBarcodes.find((d) => d.barcode === point.id);
                      if (dup) {
                        setSelectedDuplicate(dup);
                      }
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                点击数据点可查看详细明细
              </p>
            </div>

            <div>
              <h5 className="text-sm font-medium text-primary-700 mb-3">
                明细解释
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {duplicateBarcodes.map((dup) => (
                  <button
                    key={dup.barcode}
                    onClick={() => setSelectedDuplicate(dup)}
                    className="w-full text-left p-3 bg-white rounded-md border border-supplement-200 hover:border-supplement-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-medium text-supplement-800">
                        {dup.barcode}
                      </span>
                      <Badge variant="supplement">
                        重复 {dup.count} 次
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      首次录入: {formatDateTime(dup.firstCreatedAt)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      最近录入: {formatDateTime(dup.lastCreatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-supplement-100/50 rounded-md border border-supplement-200">
            <h5 className="text-sm font-medium text-supplement-800 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              为什么条码重复会被拦截？
            </h5>
            <p className="text-sm text-supplement-700 mt-2">
              样本条码是样本的唯一标识。条码重复可能导致以下问题：
            </p>
            <ul className="text-sm text-supplement-700 mt-2 space-y-1 list-disc list-inside">
              <li>检测结果归属错误，无法追溯到正确的样本来源</li>
              <li>质控数据混淆，影响质控判断的准确性</li>
              <li>报告导出时数据重复，误导质控组判断</li>
              <li>无法确定哪条记录是正确的，需要人工核实</li>
            </ul>
            <p className="text-sm text-supplement-700 mt-2">
              <strong>处理建议：</strong>请核实重复条码的样本，修正其中一条的条码，
              或在备注中注明为重测样本并关联原始样本。
            </p>
          </div>
        </Card>
      )}

      <Card
        title="样本台账"
        subtitle={`共 ${filteredSamples.length} 条样本记录`}
        headerAction={
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            新增样本
          </Button>
        }
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="搜索条码、类型、采集人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select
              value={selectedCage}
              onChange={(e) => setSelectedCage(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-medical-500"
            >
              <option value="">全部笼位</option>
              {cages.map((cage) => (
                <option key={cage.id} value={cage.id}>
                  {cage.cageNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredSamples}
          rowKey="id"
          highlightRow={(row) => duplicateBarcodeSet.has(row.barcode)}
          highlightClass="bg-supplement-50 hover:bg-supplement-100!"
          emptyText="暂无样本数据"
        />
      </Card>

      {selectedDuplicate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary-800 flex items-center gap-2">
                  <Copy className="w-5 h-5 text-supplement-600" />
                  条码重复明细
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5 font-mono">
                  {selectedDuplicate.barcode}
                </p>
              </div>
              <button
                onClick={() => setSelectedDuplicate(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 p-4 bg-supplement-50 rounded-md border border-supplement-200">
                <h4 className="text-sm font-medium text-supplement-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  拦截原因说明
                </h4>
                <p className="text-sm text-supplement-700">
                  该条码共出现 <strong>{selectedDuplicate.count} 次</strong> 重复录入。
                  条码作为样本的唯一标识，重复会导致检测结果无法准确追溯到对应样本，
                  影响质控判断的准确性。
                </p>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-primary-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  录入时间线
                </h4>
                <div className="space-y-3">
                  {selectedDuplicate.samples.map((sample, index) => (
                    <div
                      key={sample.id}
                      className="flex items-start gap-3 p-3 bg-neutral-50 rounded-md"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0
                            ? 'bg-success-100 text-success-700'
                            : 'bg-supplement-100 text-supplement-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-primary-800">
                            {getCageNumber(sample.cageId)} - {sample.sampleType}
                          </span>
                          {index === 0 ? (
                            <Badge variant="success">首次录入</Badge>
                          ) : (
                            <Badge variant="supplement">第 {index + 1} 次重复</Badge>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          采集人: {sample.collector} | 采集日期: {sample.collectionDate}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          录入时间: {formatDateTime(sample.createdAt)}
                        </p>
                        {sample.remark && (
                          <p className="text-xs text-neutral-600 mt-2 p-2 bg-white rounded border border-neutral-200">
                            备注: {sample.remark}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-medical-50 rounded-md border border-medical-200">
                <h4 className="text-sm font-medium text-medical-800 mb-2">
                  💡 处理建议
                </h4>
                <ul className="text-sm text-medical-700 space-y-1 list-disc list-inside">
                  <li>核实两条记录是否为同一物理样本的重复录入</li>
                  <li>如为不同样本，请修正其中一条的条码编号</li>
                  <li>如为复测样本，请在备注中注明"复测"并关联原样本</li>
                  <li>修正后系统将自动移除该异常提醒</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedDuplicate(null)}
              >
                关闭
              </Button>
              <Button onClick={() => setSelectedDuplicate(null)}>
                我已知晓
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
