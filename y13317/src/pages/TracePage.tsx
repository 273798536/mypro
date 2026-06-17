import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, RowSelectedEvent, CellClickedEvent } from 'ag-grid-community';
import {
  Search,
  RotateCcw,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Image,
  FileText,
  History,
  Link2,
  AlertTriangle,
  ChevronRight,
  FileWarning,
} from 'lucide-react';
import { Tab } from '@headlessui/react';
import dayjs from 'dayjs';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import { fetchAllSamples } from '@/mock';
import type { QualitySample, SourceType, CitationStatus, WorkflowStatus } from '@/types';
import { useOperatorStore } from '@/store/operatorStore';
import { exportToExcel } from '@/utils/exportUtils';

const BATCH_OPTIONS = [
  { value: 'BATCH-2026-0610', label: 'BATCH-2026-0610（6月上旬）' },
  { value: 'BATCH-2026-0615', label: 'BATCH-2026-0615（6月中旬）' },
];

const SOURCE_TYPE_MAP: Record<SourceType, { label: string; color: string }> = {
  old_correction: { label: '旧版人工修正', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  normal_record: { label: '正常记录', color: 'bg-green-100 text-green-700 border-green-200' },
  verbal_note: { label: '口头备注', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const CITATION_STATUS_MAP: Record<CitationStatus, { label: string; color: string }> = {
  complete: { label: '完整', color: 'text-emerald-600' },
  partial: { label: '部分缺失', color: 'text-amber-600' },
  missing: { label: '缺失', color: 'text-red-600' },
};

const WORKFLOW_STATUS_MAP: Record<WorkflowStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-slate-100 text-slate-700' },
  approved: { label: '已通过', color: 'bg-emerald-100 text-emerald-700' },
  need_material: { label: '打回补材料', color: 'bg-amber-100 text-amber-700' },
  recheck: { label: '待确认', color: 'bg-indigo-100 text-indigo-700' },
};

const DEFECT_TYPES = [
  '表面划痕', '边缘缺损', '颜色偏差', '尺寸超差', '气泡空洞',
  '异物污染', '裂纹破损', '镀层不均', '装配偏移', '焊接缺陷',
];

const TracePage: React.FC = () => {
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact>(null);
  const { filters, setFilters, resetFilters, selectedSampleIds, toggleSampleId, clearSelectedIds, bulkApprove, bulkReject } = useOperatorStore();

  const [allSamples, setAllSamples] = useState<QualitySample[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSample, setActiveSample] = useState<QualitySample | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await fetchAllSamples();
      setAllSamples(data);
      setLoading(false);
    };
    init();
  }, []);

  const filteredSamples = useMemo(() => {
    return allSamples.filter((s) => {
      if (filters.batchId) {
        const match =
          (filters.batchId === 'BATCH-2026-0610' && s.batchId === 'B001') ||
          (filters.batchId === 'BATCH-2026-0615' && s.batchId === 'B002');
        if (!match) return false;
      }
      if (filters.defectType && s.defectType !== filters.defectType) return false;
      if (filters.sourceType && s.sourceType !== filters.sourceType) return false;
      if (filters.citationStatus && s.citationStatus !== filters.citationStatus) return false;
      if (filters.workflowStatus && s.workflowStatus !== filters.workflowStatus) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const hay = `${s.sampleId} ${s.batchName} ${s.defectType} ${s.originalJudgment} ${s.revisedJudgment}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [allSamples, filters]);

  const columnDefs = useMemo<ColDef<QualitySample>[]>(
    () => [
      {
        headerName: '',
        field: 'sampleId',
        width: 50,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        pinned: 'left',
        suppressMenu: true,
        sortable: false,
        filter: false,
      },
      {
        headerName: '缩略图',
        field: 'imageUrl',
        width: 90,
        cellRenderer: (params: { value: string }) => (
          <div className="w-16 h-12 rounded overflow-hidden border border-slate-200 bg-slate-50">
            <img src={params.value} alt="" className="w-full h-full object-cover" />
          </div>
        ),
        suppressMenu: true,
        sortable: false,
        filter: false,
      },
      {
        headerName: '样本ID',
        field: 'sampleId',
        width: 110,
        sortable: true,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: '批次',
        field: 'batchName',
        width: 170,
        sortable: true,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: '缺陷类型',
        field: 'defectType',
        width: 110,
        sortable: true,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: '原始结论',
        field: 'originalJudgment',
        width: 100,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellClass: 'text-slate-500',
      },
      {
        headerName: '改判结论',
        field: 'revisedJudgment',
        width: 100,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellClass: (params) =>
          params.data && params.data.originalJudgment !== params.data.revisedJudgment
            ? 'text-indigo-600 font-semibold'
            : '',
      },
      {
        headerName: '来源',
        field: 'sourceType',
        width: 120,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: SourceType }) => {
          const cfg = SOURCE_TYPE_MAP[params.value];
          return (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${cfg.color}`}>
              {cfg.label}
            </span>
          );
        },
      },
      {
        headerName: '引用状态',
        field: 'citationStatus',
        width: 100,
        sortable: true,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: CitationStatus }) => {
          const cfg = CITATION_STATUS_MAP[params.value];
          return <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>;
        },
      },
      {
        headerName: '置信度(%)',
        field: 'confidence',
        width: 100,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: { value: number; data?: QualitySample }) => {
          const val = params.value;
          const color = val >= 85 ? 'text-emerald-600' : val >= 70 ? 'text-amber-600' : 'text-red-600';
          return (
            <div className="flex items-center gap-2">
              <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${val >= 85 ? 'bg-emerald-500' : val >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${val}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${color}`}>{val}</span>
            </div>
          );
        },
      },
      {
        headerName: '更新时间',
        field: 'updatedAt',
        width: 170,
        sortable: true,
        filter: 'agDateColumnFilter',
        cellRenderer: (params: { value: string }) => dayjs(params.value).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        headerName: '操作',
        field: 'sampleId',
        width: 110,
        pinned: 'right',
        suppressMenu: true,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data?: QualitySample; value: string }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (params.data) openDrawer(params.data);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            查看材料
          </button>
        ),
      },
    ],
    [],
  );

  const getRowStyle = (params: { data?: QualitySample }) => {
    if (params.data && params.data.citationStatus === 'missing') {
      return { backgroundColor: '#fef2f2' };
    }
    return undefined;
  };

  const openDrawer = (sample: QualitySample) => {
    setActiveSample(sample);
    setDrawerOpen(true);
  };

  const onGridReady = (params: GridReadyEvent<QualitySample>) => {
    params.api.sizeColumnsToFit();
  };

  const onRowSelected = (event: RowSelectedEvent<QualitySample>) => {
    if (event.data && event.node.isSelected() !== undefined) {
      if (event.node.isSelected()) {
        if (!selectedSampleIds.includes(event.data.sampleId)) {
          toggleSampleId(event.data.sampleId);
        }
      } else {
        if (selectedSampleIds.includes(event.data.sampleId)) {
          toggleSampleId(event.data.sampleId);
        }
      }
    }
  };

  const onCellClicked = (event: CellClickedEvent<QualitySample>) => {
    if (event.column.getColId() !== 'sampleId' && event.data) {
      openDrawer(event.data);
    }
  };

  const handleBulkExport = () => {
    const rows = filteredSamples.filter((s) => selectedSampleIds.includes(s.sampleId));
    const data = (rows.length > 0 ? rows : filteredSamples).map((s) => ({
      样本ID: s.sampleId,
      批次: s.batchName,
      缺陷类型: s.defectType,
      原始结论: s.originalJudgment,
      改判结论: s.revisedJudgment,
      来源: SOURCE_TYPE_MAP[s.sourceType].label,
      引用状态: CITATION_STATUS_MAP[s.citationStatus].label,
      置信度: s.confidence,
      更新时间: dayjs(s.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    exportToExcel(data, `trace-export-${dayjs().format('YYYYMMDD-HHmmss')}`);
  };

  const handleBulkApprove = () => {
    if (selectedSampleIds.length === 0) return;
    bulkApprove(selectedSampleIds);
    clearSelectedIds();
  };

  const handleBulkReject = () => {
    if (selectedSampleIds.length === 0) return;
    bulkReject(selectedSampleIds, '批量打回补材料');
    clearSelectedIds();
  };

  const missingCitationTypes = useMemo(() => {
    if (!activeSample) return [];
    const all: Array<'standard_doc' | 'reference_image' | 'spec_sheet'> = [
      'standard_doc',
      'reference_image',
      'spec_sheet',
    ];
    const present = activeSample.citations.map((c) => c.type);
    return all.filter((t) => !present.includes(t));
  }, [activeSample]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">异常追溯工作台</h1>
            <p className="text-sm text-slate-500 mt-1">
              检索、审核并追溯所有人工改判样本的完整材料链路
            </p>
          </div>
          <button
            onClick={() => navigate('/influence')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            查看影响分析 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">批次</label>
            <select
              value={filters.batchId}
              onChange={(e) => setFilters({ batchId: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value="">全部批次</option>
              {BATCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">缺陷类型</label>
            <select
              value={filters.defectType}
              onChange={(e) => setFilters({ defectType: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value="">全部类型</option>
              {DEFECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">来源类型</label>
            <select
              value={filters.sourceType}
              onChange={(e) => setFilters({ sourceType: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value="">全部来源</option>
              {Object.entries(SOURCE_TYPE_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">引用状态</label>
            <select
              value={filters.citationStatus}
              onChange={(e) => setFilters({ citationStatus: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value="">全部状态</option>
              {Object.entries(CITATION_STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">工作流状态</label>
            <select
              value={filters.workflowStatus}
              onChange={(e) => setFilters({ workflowStatus: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            >
              <option value="">全部状态</option>
              {Object.entries(WORKFLOW_STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">关键词搜索</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters({ keyword: e.target.value })}
                placeholder="样本ID/批次/缺陷..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm">
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="text-sm text-slate-600">
          共找到 <span className="font-semibold text-slate-800">{allSamples.length}</span> 条记录，筛选后{' '}
          <span className="font-semibold text-indigo-600">{filteredSamples.length}</span> 条
        </div>
        <div className="flex items-center gap-3">
          {selectedSampleIds.length > 0 && (
            <span className="text-sm text-slate-500">
              已选中 <span className="font-semibold text-indigo-600">{selectedSampleIds.length}</span> 条
            </span>
          )}
          <button
            onClick={handleBulkApprove}
            disabled={selectedSampleIds.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            批量放行
          </button>
          <button
            onClick={handleBulkReject}
            disabled={selectedSampleIds.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <XCircle className="w-4 h-4" />
            批量打回
          </button>
          <button
            onClick={handleBulkExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <Download className="w-4 h-4" />
            批量导出
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">加载中...</div>
          ) : (
            <div className="ag-theme-quartz w-full h-full">
              <AgGridReact<QualitySample>
                ref={gridRef}
                rowData={filteredSamples}
                columnDefs={columnDefs}
                rowSelection="multiple"
                suppressRowClickSelection
                getRowStyle={getRowStyle}
                onGridReady={onGridReady}
                onRowSelected={onRowSelected}
                onCellClicked={onCellClicked}
                pagination
                paginationPageSize={15}
                animateRows
              />
            </div>
          )}
        </div>
      </div>

      {drawerOpen && activeSample && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[480px] bg-white shadow-2xl flex flex-col animate-[slideIn_0.25s_ease-out]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">
                    材料详情 · {activeSample.sampleId}
                  </h2>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs border ${SOURCE_TYPE_MAP[activeSample.sourceType].color}`}
                  >
                    {SOURCE_TYPE_MAP[activeSample.sourceType].label}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {activeSample.batchName} · 更新于 {dayjs(activeSample.updatedAt).format('YYYY-MM-DD HH:mm')}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Tab.Group>
              <Tab.List className="flex border-b border-slate-200 px-2">
                {[
                  { icon: Image, label: '原始图像' },
                  { icon: FileText, label: '标注详情' },
                  { icon: History, label: '改判日志' },
                  { icon: Link2, label: '引用材料' },
                ].map((tab) => (
                  <Tab
                    key={tab.label}
                    className={({ selected }) =>
                      `flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 -mb-px transition ${
                        selected
                          ? 'border-indigo-600 text-indigo-600 font-medium'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`
                    }
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </Tab>
                ))}
              </Tab.List>

              <Tab.Panels className="flex-1 overflow-y-auto">
                <Tab.Panel className="p-5 space-y-5">
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={activeSample.imageUrl} alt="" className="w-full object-contain" />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <h4 className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> EXIF 信息
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">拍摄设备</span>
                        <span className="text-slate-700 font-medium">Basler acA2040</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">分辨率</span>
                        <span className="text-slate-700 font-medium">2048×1536</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">焦距</span>
                        <span className="text-slate-700 font-medium">25mm</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">光圈</span>
                        <span className="text-slate-700 font-medium">f/5.6</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">曝光时间</span>
                        <span className="text-slate-700 font-medium">1/250s</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">光源</span>
                        <span className="text-slate-700 font-medium">环形LED</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">拍摄时间</span>
                        <span className="text-slate-700 font-medium">
                          {dayjs(activeSample.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">工位号</span>
                        <span className="text-slate-700 font-medium">ST-{activeSample.sampleId.slice(-3)}</span>
                      </div>
                    </div>
                  </div>
                </Tab.Panel>

                <Tab.Panel className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="text-xs font-medium text-slate-500 mb-3">原始标注</div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">判定结论</div>
                          <div className="px-3 py-2 rounded bg-red-50 text-red-700 font-semibold">
                            {activeSample.originalJudgment}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">缺陷类型</div>
                          <div className="px-3 py-2 rounded bg-slate-100 text-slate-700">
                            {activeSample.defectType}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">置信度</div>
                          <div className="px-3 py-2 rounded bg-slate-100 text-slate-700">
                            {Math.max(40, activeSample.confidence - 20)}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border-2 border-indigo-200 p-4 bg-indigo-50/30">
                      <div className="text-xs font-medium text-indigo-600 mb-3 flex items-center gap-1">
                        ✦ 改判标注
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">判定结论</div>
                          <div className="px-3 py-2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            {activeSample.revisedJudgment}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">缺陷类型</div>
                          <div className="px-3 py-2 rounded bg-indigo-100/60 text-indigo-800 border border-indigo-200">
                            {activeSample.defectType}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-1">置信度</div>
                          <div className="px-3 py-2 rounded bg-indigo-100/60 text-indigo-800 border border-indigo-200">
                            {activeSample.confidence}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
                    <div className="font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> 差异项高亮
                    </div>
                    <ul className="space-y-1.5 text-amber-900">
                      <li>• 判定结论：{activeSample.originalJudgment} → <span className="font-semibold">{activeSample.revisedJudgment}</span></li>
                      <li>• 置信度提升：+{20}%</li>
                    </ul>
                  </div>
                </Tab.Panel>

                <Tab.Panel className="p-5">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                    <div className="space-y-6">
                      {activeSample.corrections.length > 0 ? (
                        activeSample.corrections.map((c, idx) => (
                          <div key={c.id} className="relative pl-11">
                            <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-500">
                                  第 {idx + 1} 次改判
                                </span>
                                <span className="text-xs text-slate-400">
                                  {dayjs(c.timestamp).format('YYYY-MM-DD HH:mm')}
                                </span>
                              </div>
                              <div className="text-sm text-slate-800 mb-2">
                                <span className="font-semibold">{c.operator}</span> 修改了{' '}
                                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                  {c.field}
                                </code>
                              </div>
                              <div className="flex items-center gap-2 text-xs mb-3">
                                <span className="px-2 py-1 rounded bg-red-50 text-red-700 line-through">
                                  {c.oldValue}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
                                  {c.newValue}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 bg-slate-50 rounded px-2.5 py-1.5">
                                💬 {c.remark}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="relative pl-11 text-sm text-slate-400">
                          <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                          </div>
                          暂无改判记录
                        </div>
                      )}
                      <div className="relative pl-11">
                        <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-emerald-700">样本创建</span>
                            <span className="text-xs text-slate-400">
                              {dayjs(activeSample.createdAt).format('YYYY-MM-DD HH:mm')}
                            </span>
                          </div>
                          <div className="text-sm text-emerald-800">初始录入系统</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab.Panel>

                <Tab.Panel className="p-5 space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      已引用材料 ({activeSample.citations.length})
                    </h4>
                    <div className="space-y-2">
                      {activeSample.citations.map((c) => (
                        <a
                          key={c.id}
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              c.type === 'standard_doc'
                                ? 'bg-blue-100 text-blue-600'
                                : c.type === 'reference_image'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            {c.type === 'standard_doc' ? (
                              <FileText className="w-5 h-5" />
                            ) : c.type === 'reference_image' ? (
                              <Image className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                            <div className="text-xs text-slate-400">
                              {c.type === 'standard_doc'
                                ? '标准文档'
                                : c.type === 'reference_image'
                                ? '参考图像'
                                : '规格表'}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </a>
                      ))}
                      {activeSample.citations.length === 0 && (
                        <div className="text-sm text-slate-400 p-4 text-center rounded-lg bg-slate-50">
                          暂无已引用材料
                        </div>
                      )}
                    </div>
                  </div>

                  {missingCitationTypes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                        <FileWarning className="w-4 h-4 text-red-500" />
                        缺失引用 ({missingCitationTypes.length})
                      </h4>
                      <div className="space-y-2">
                        {missingCitationTypes.map((t) => (
                          <div
                            key={t}
                            className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50"
                          >
                            <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                              <X className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-800">
                                {t === 'standard_doc'
                                  ? '标准文档'
                                  : t === 'reference_image'
                                  ? '参考图像'
                                  : '规格表'}
                              </div>
                              <div className="text-xs text-red-600">
                                {t === 'standard_doc'
                                  ? '缺少相关国家/企业标准文档引用'
                                  : t === 'reference_image'
                                  ? '缺少同批次合格样本参照图像'
                                  : '缺少产品技术规格表/BOM清单'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
              >
                通过
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition shadow-sm"
              >
                打回补材料
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
              >
                人工确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TracePage;
