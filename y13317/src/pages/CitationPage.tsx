import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { Dialog, Switch } from '@headlessui/react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Image,
  BookOpen,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Clock,
  ChevronDown,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { fetchAllSamples, fetchCitationCheckResults } from '@/mock';
import { useOperatorStore, type CitationDecision, type DecisionType } from '@/store/operatorStore';
import type { QualitySample, CitationCheckResult as CitationCheckType } from '@/types';

type MissingType = 'standard_doc' | 'reference_image' | 'spec_sheet';
type RiskLevel = 'high' | 'medium' | 'low';
type CheckStatus = 'pending' | 'processing' | 'completed' | 'confirmed';

interface RowData extends CitationCheckType {
  thumbnail: string;
  defectType: string;
  status: CheckStatus;
  missingTypesLabel: string[];
  isSafety: boolean;
}

const SAFETY_DEFECT_TYPES = ['裂纹破损', '焊接缺陷', '气泡空洞'];

const MISSING_TYPE_MAP: Record<MissingType, { label: string; icon: React.ReactNode; color: string }> = {
  standard_doc: { label: '标准文档', icon: <FileText className="w-3 h-3" />, color: 'bg-industrial-100 text-industrial-700' },
  reference_image: { label: '参考图像', icon: <Image className="w-3 h-3" />, color: 'bg-purple-100 text-purple-700' },
  spec_sheet: { label: '规格书', icon: <BookOpen className="w-3 h-3" />, color: 'bg-teal-100 text-teal-700' },
};

const RISK_MAP: Record<RiskLevel, { label: string; dot: string; text: string }> = {
  high: { label: '高风险', dot: 'bg-danger', text: 'text-danger' },
  medium: { label: '中风险', dot: 'bg-warning', text: 'text-warning' },
  low: { label: '低风险', dot: 'bg-amber-400', text: 'text-amber-600' },
};

const STATUS_MAP: Record<CheckStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: '未处理', className: 'bg-gray-100 text-gray-700', icon: <Clock className="w-3 h-3" /> },
  processing: { label: '处理中', className: 'bg-warning-100 text-warning-700', icon: <Clock className="w-3 h-3 animate-pulse" /> },
  completed: { label: '已补全', className: 'bg-success-100 text-success-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  confirmed: { label: '已确认', className: 'bg-industrial-100 text-industrial-700', icon: <ShieldCheck className="w-3 h-3" /> },
};

const DECISION_REASONS = [
  { value: 'no_impact', label: '暂不影响结论', nextStep: '保持当前结论，持续监控引用完整性' },
  { value: 'material_ready', label: '材料已准备补录', nextStep: '3个工作日内完成引用材料系统补录' },
  { value: 'return_recollect', label: '需退回重新采集', nextStep: '退回责任方，7日内重新采集完整数据' },
  { value: 'other', label: '其他原因', nextStep: '' },
];

const CitationPage: React.FC = () => {
  const [samples, setSamples] = useState<QualitySample[]>([]);
  const [checkResults, setCheckResults] = useState<CitationCheckType[]>([]);
  const [loading, setLoading] = useState(true);

  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [missingTypeFilter, setMissingTypeFilter] = useState<MissingType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);

  const [decisionReason, setDecisionReason] = useState<string>('');
  const [nextStep, setNextStep] = useState<string>('');
  const [decisionType, setDecisionType] = useState<DecisionType>('pending');
  const [deadline, setDeadline] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; msg: string }>({ show: false, type: 'success', msg: '' });

  const makeCitationDecision = useOperatorStore((s) => s.makeCitationDecision);
  const citationDecisions = useOperatorStore((s) => s.citationDecisions);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [allSamples, results] = await Promise.all([fetchAllSamples(), fetchCitationCheckResults()]);
      setSamples(allSamples);
      setCheckResults(results);
      setLoading(false);
    };
    load();
  }, []);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ show: true, type, msg });
    setTimeout(() => setToast({ show: false, type, msg }), 3000);
  }, []);

  const rowData = useMemo<RowData[]>(() => {
    const sampleMap = new Map(samples.map((s) => [s.sampleId, s]));
    return checkResults.map((r) => {
      const sample = sampleMap.get(r.sampleId);
      const isSafety = !!sample && SAFETY_DEFECT_TYPES.includes(sample.defectType);
      const decision = citationDecisions.get(r.sampleId);
      let status: CheckStatus = 'pending';
      if (decision?.decisionType === 'approved') status = 'confirmed';
      else if (decision?.decisionType === 'rejected') status = 'processing';
      else if (r.missingTypes.length === 0) status = 'completed';
      return {
        ...r,
        thumbnail: sample?.imageUrl || '',
        defectType: sample?.defectType || '未知',
        status,
        missingTypesLabel: r.missingTypes.map((t) => MISSING_TYPE_MAP[t].label),
        isSafety,
      };
    });
  }, [checkResults, samples, citationDecisions]);

  const stats = useMemo(() => {
    const complete = samples.filter((s) => s.citationStatus === 'complete').length;
    const partial = samples.filter((s) => s.citationStatus === 'partial').length;
    const missing = samples.filter((s) => s.citationStatus === 'missing').length;
    const highRisk = rowData.filter((r) => r.riskLevel === 'high').length;
    return { complete, partial, missing, highRisk, total: samples.length };
  }, [samples, rowData]);

  const filteredData = useMemo(() => {
    return rowData.filter((r) => {
      if (riskFilter !== 'all' && r.riskLevel !== riskFilter) return false;
      if (missingTypeFilter !== 'all' && !r.missingTypes.includes(missingTypeFilter)) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchKeyword && !r.sampleId.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
      return true;
    });
  }, [rowData, riskFilter, missingTypeFilter, statusFilter, searchKeyword]);

  const openDialog = useCallback((row: RowData) => {
    setSelectedRow(row);
    setDecisionReason('');
    setNextStep('');
    setDecisionType('pending');
    setDeadline('');
    setRemark('');
    setDialogOpen(true);
  }, []);

  const handleReasonChange = useCallback((val: string) => {
    setDecisionReason(val);
    const reason = DECISION_REASONS.find((r) => r.value === val);
    if (reason) setNextStep(reason.nextStep);
    if (val === 'return_recollect') {
      setDecisionType('rejected');
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedRow) return;
    if (!decisionReason || !nextStep) {
      showToast('error', '请完整填写原因和下一步建议');
      return;
    }
    if (decisionType === 'pending') {
      showToast('error', '请选择决策：暂予通过 或 打回补材料');
      return;
    }
    const decision: CitationDecision = {
      decisionType,
      reason: DECISION_REASONS.find((r) => r.value === decisionReason)?.label || decisionReason,
      nextStep: decisionType === 'approved' && deadline ? `${nextStep}（截止日期：${deadline}）` : nextStep,
      remark,
      operatorName: '当前操作员',
      decidedAt: new Date().toISOString(),
    };
    makeCitationDecision(selectedRow.sampleId, decision);
    setDialogOpen(false);
    showToast('success', `样本 ${selectedRow.sampleId} 决策已提交`);
  }, [selectedRow, decisionReason, nextStep, decisionType, deadline, remark, makeCitationDecision, showToast]);

  const navigateToTrace = useCallback((sampleId: string) => {
    window.location.href = `/trace?id=${encodeURIComponent(sampleId)}`;
  }, []);

  const getRowClass = useCallback((params: { data: RowData }) => {
    if (params.data?.riskLevel === 'high') return 'high-risk-row';
    return '';
  }, []);

  const columnDefs = useMemo<ColDef<RowData>[]>(() => [
    {
      field: 'sampleId',
      headerName: '样本ID',
      width: 130,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const id = params.value;
        return (
          <button
            onClick={() => id && navigateToTrace(id)}
            className="text-industrial font-semibold hover:text-industrial-700 hover:underline transition-colors"
          >
            {id}
          </button>
        );
      },
    },
    {
      field: 'thumbnail',
      headerName: '缩略图',
      width: 110,
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const url = params.value;
        return (
          <div className="w-16 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50">
            {url ? (
              <img src={url} alt="缩略图" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">无图</div>
            )}
          </div>
        );
      },
    },
    {
      field: 'defectType',
      headerName: '缺陷类型',
      width: 140,
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const isSafety = params.data?.isSafety;
        return (
          <div className="flex items-center gap-2">
            {isSafety && (
              <span className="text-danger flex-shrink-0" title="安全类缺陷">
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
            <span className={isSafety ? 'text-danger font-semibold' : ''}>{params.value}</span>
          </div>
        );
      },
    },
    {
      field: 'missingTypesLabel',
      headerName: '缺失项',
      width: 220,
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const types = params.data?.missingTypes || [];
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((t, idx) => {
              const cfg = MISSING_TYPE_MAP[t as MissingType];
              return cfg ? (
                <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                  {cfg.icon}
                  {cfg.label}
                </span>
              ) : null;
            })}
          </div>
        );
      },
    },
    {
      field: 'riskLevel',
      headerName: '风险等级',
      width: 110,
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const lv = params.value as RiskLevel;
        const cfg = RISK_MAP[lv];
        return (
          <div className={`flex items-center gap-1.5 ${cfg.text} font-medium`}>
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}></span>
            {cfg.label}
          </div>
        );
      },
    },
    {
      field: 'status',
      headerName: '当前状态',
      width: 110,
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const st = params.value as CheckStatus;
        const cfg = STATUS_MAP[st];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${cfg.className}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        );
      },
    },
    {
      field: 'suggestedNextStep',
      headerName: '建议下一步',
      width: 220,
      flex: 1,
      cellClass: 'text-gray-600 text-sm',
    },
    {
      field: 'checkedAt',
      headerName: '校验时间',
      width: 170,
      valueFormatter: (params) => {
        if (!params.value) return '';
        const d = new Date(params.value);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      },
    },
    {
      headerName: '操作',
      width: 180,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<RowData>) => {
        const row = params.data;
        if (!row) return null;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => row.sampleId && navigateToTrace(row.sampleId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-industrial bg-industrial-50 hover:bg-industrial-100 transition-colors"
            >
              <Eye className="w-3 h-3" />
              查看
            </button>
            <button
              onClick={() => openDialog(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-industrial hover:bg-industrial-700 transition-colors"
            >
              <ShieldCheck className="w-3 h-3" />
              人工确认
            </button>
          </div>
        );
      },
    },
  ], [navigateToTrace, openDialog]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 animate-fade-in-down flex items-center gap-2 px-4 py-3 rounded-lg shadow-modal text-sm font-medium ${
          toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">引用完整性校验</h1>
          <p className="text-gray-500 mt-1">自动检测质检记录的引用链完整性，确保可追溯性</p>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-industrial" />
                校验规则说明
              </h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-900">标准文档 ≥ 1 份：</strong>每条记录必须引用至少一份国家标准或企业规范文档</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-900">参考图像 ≥ 2 张：</strong>必须包含合格/不合格对照图像用于复核对比</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong className="text-gray-900">规格书必填：</strong>产品BOM规格表、工艺参数或检验作业指导书至少一项</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                  <span><strong className="text-danger">安全类缺陷高风险：</strong>焊接、裂纹、气泡等安全相关缺陷将强制提升为高风险</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-industrial" />
                当前统计
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-success-50 rounded-lg p-3 border border-success-100">
                  <div className="text-2xl font-bold text-success">{stats.complete}</div>
                  <div className="text-xs text-success-700 mt-0.5">完整引用</div>
                </div>
                <div className="bg-warning-50 rounded-lg p-3 border border-warning-100">
                  <div className="text-2xl font-bold text-warning">{stats.partial}</div>
                  <div className="text-xs text-warning-700 mt-0.5">部分引用</div>
                </div>
                <div className="bg-danger-50 rounded-lg p-3 border border-danger-100">
                  <div className="text-2xl font-bold text-danger">{stats.missing}</div>
                  <div className="text-xs text-danger-700 mt-0.5">完全缺失</div>
                </div>
                <div className="bg-red-100 rounded-lg p-3 border border-red-200">
                  <div className="text-2xl font-bold text-danger">{stats.highRisk}</div>
                  <div className="text-xs text-danger-700 mt-0.5">高风险项</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                共 {stats.total} 条记录 · 发现 {rowData.length} 条需关注 · 过滤后 {filteredData.length} 条
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Filter className="w-4 h-4" />
              筛选
            </div>
            <div className="relative">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
              >
                <option value="all">全部风险等级</option>
                <option value="high">高风险</option>
                <option value="medium">中风险</option>
                <option value="low">低风险</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={missingTypeFilter}
                onChange={(e) => setMissingTypeFilter(e.target.value as MissingType | 'all')}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
              >
                <option value="all">全部缺失类型</option>
                <option value="standard_doc">标准文档缺失</option>
                <option value="reference_image">参考图像缺失</option>
                <option value="spec_sheet">规格书缺失</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CheckStatus | 'all')}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
              >
                <option value="all">全部校验状态</option>
                <option value="pending">未处理</option>
                <option value="processing">处理中</option>
                <option value="completed">已补全</option>
                <option value="confirmed">已确认</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索样本ID..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
          <div
            className="ag-theme-alpine"
            style={{ width: '100%', height: '560px' }}
          >
            <style>{`
              .ag-theme-alpine .high-risk-row {
                background-color: #FEF2F2 !important;
                border-left: 4px solid #DC2626 !important;
              }
              .ag-theme-alpine .ag-row {
                border-bottom: 1px solid #F3F4F6;
              }
              .ag-theme-alpine .ag-header {
                background-color: #F9FAFB;
                border-bottom: 1px solid #E5E7EB;
              }
              .ag-theme-alpine .ag-header-cell {
                font-weight: 600;
                color: #374151;
                font-size: 13px;
              }
              .ag-theme-alpine .ag-cell {
                display: flex;
                align-items: center;
                font-size: 13px;
              }
            `}</style>
            <AgGridReact<RowData>
              loading={loading}
              rowData={filteredData}
              columnDefs={columnDefs}
              getRowClass={getRowClass}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                suppressMovable: true,
              }}
              rowHeight={64}
              headerHeight={48}
              onGridReady={(e: GridReadyEvent) => e.api.sizeColumnsToFit()}
            />
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={setDialogOpen} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-2xl shadow-modal w-full max-w-5xl max-h-[90vh] overflow-hidden animate-scale-in">
            <Dialog.Title className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-industrial-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-industrial" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">人工确认决策</h3>
                  <p className="text-xs text-gray-500">对引用完整性异常样本进行人工复核</p>
                </div>
              </div>
              <button
                onClick={() => setDialogOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Title>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-6 border-r border-gray-100 bg-gray-50/50 overflow-y-auto max-h-[calc(90vh-200px)]">
                {selectedRow && (
                  <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
                          {selectedRow.thumbnail ? (
                            <img src={selectedRow.thumbnail} alt="样本图" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">无图</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-400">样本ID</span>
                            {selectedRow.riskLevel === 'high' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-100 text-danger">
                                <AlertTriangle className="w-3 h-3" />
                                高风险
                              </span>
                            )}
                          </div>
                          <div className="text-base font-bold text-gray-900 font-mono">{selectedRow.sampleId}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              selectedRow.isSafety ? 'bg-danger-100 text-danger' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {selectedRow.isSafety && <AlertTriangle className="w-3 h-3" />}
                              {selectedRow.defectType}
                            </span>
                            {selectedRow.isSafety && (
                              <span className="text-[11px] text-danger font-medium">安全类缺陷</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-danger" />
                        缺失项列表
                      </h4>
                      <div className="space-y-2">
                        {selectedRow.missingTypes.map((t, idx) => {
                          const cfg = MISSING_TYPE_MAP[t as MissingType];
                          return (
                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg border border-danger-100 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${cfg.color}`}>
                                  {cfg.icon}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{cfg.label}</div>
                                  <div className="text-[11px] text-gray-500">类型: {t}</div>
                                </div>
                              </div>
                              <span className="text-xs text-danger font-medium">缺失</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        风险说明
                      </h4>
                      <p className="text-sm text-amber-800 leading-relaxed">{selectedRow.reason}</p>
                    </div>

                    <div className="bg-industrial-50 border border-industrial-100 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-industrial-900 mb-2 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        系统建议下一步
                      </h4>
                      <p className="text-sm text-industrial-800 leading-relaxed">{selectedRow.suggestedNextStep}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <span className="text-danger">*</span> 确认原因
                    </label>
                    <div className="relative">
                      <select
                        value={decisionReason}
                        onChange={(e) => handleReasonChange(e.target.value)}
                        className="appearance-none w-full pl-3 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
                      >
                        <option value="">请选择原因...</option>
                        {DECISION_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <span className="text-danger">*</span> 下一步建议
                    </label>
                    <textarea
                      value={nextStep}
                      onChange={(e) => setNextStep(e.target.value)}
                      rows={3}
                      placeholder="根据选择的原因自动预填，可编辑..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white resize-none hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <span className="text-danger">*</span> 决策选择
                    </label>
                    <div className="space-y-2">
                      <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        decisionType === 'approved'
                          ? 'border-success bg-success-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          checked={decisionType === 'approved'}
                          onChange={() => setDecisionType('approved')}
                          className="mt-1 accent-success"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-success">暂予通过</span>
                            <span className="text-xs text-gray-500">，补材料截止日期</span>
                            <input
                              type="date"
                              value={deadline}
                              onChange={(e) => setDeadline(e.target.value)}
                              className={`px-2 py-1 text-xs border rounded-md w-auto ${
                                decisionType === 'approved'
                                  ? 'border-success-300 bg-white focus:border-success focus:ring-1 focus:ring-success/30'
                                  : 'border-gray-200 bg-gray-50'
                              } focus:outline-none transition-colors`}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">当前可放行，但需在截止日期前补全引用材料</p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        decisionType === 'rejected'
                          ? 'border-danger bg-danger-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          checked={decisionType === 'rejected'}
                          onChange={() => setDecisionType('rejected')}
                          className="mt-1 accent-danger"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-danger">打回补材料</span>
                          <p className="text-xs text-gray-500 mt-1">退回责任方重新补全缺失引用材料</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">备注</label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      rows={3}
                      placeholder="可补充其他说明信息..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white resize-none hover:border-industrial focus:outline-none focus:border-industrial focus:ring-1 focus:ring-industrial/30 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-industrial hover:bg-industrial-700 shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                提交确认
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

const BarChart3 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3v18h18" />
    <path d="M7 16V9" />
    <path d="M12 16V5" />
    <path d="M17 16v-6" />
  </svg>
);

export default CitationPage;
