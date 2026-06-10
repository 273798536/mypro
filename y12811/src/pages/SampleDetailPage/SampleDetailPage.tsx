import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Dna,
  Activity,
  AlertTriangle,
  TrendingUp,
  Shield,
  FileText,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSampleById, getQCBySample, getLineageBySample } from '@/data';
import { LineageFlow } from '@/components/Lineage';
import { StatusBadge } from '@/components/UI';
import type { LineageStep, StatusType, SampleStatusType, QCStatus, FieldConfig } from '@/types';

const statusMap: Record<SampleStatusType, StatusType> = {
  'normal': 'success',
  'low-quality': 'warning',
  'contaminated': 'error',
  'control-abnormal': 'error',
  'pending-review': 'info',
  'warning': 'warning',
  'error': 'error',
};

const statusTextMap: Record<SampleStatusType, string> = {
  'normal': '正常',
  'low-quality': '低质量',
  'contaminated': '污染',
  'control-abnormal': '对照异常',
  'pending-review': '待复核',
  'warning': '警告',
  'error': '错误',
};

const sampleTypeTextMap: Record<string, string> = {
  'clinical': '临床样本',
  'environmental': '环境样本',
  'negative-control': '阴性对照',
  'positive-control': '阳性对照',
};

const qcStatusTextMap: Record<QCStatus, string> = {
  'pass': '通过',
  'warning': '警告',
  'fail': '不合格',
};

const qcStatusTypeMap: Record<QCStatus, StatusType> = {
  'pass': 'success',
  'warning': 'warning',
  'fail': 'error',
};

const warningTextMap: Record<string, string> = {
  'sample_contamination': '样本污染',
  'skin_microbiome_signal': '皮肤菌群信号',
  'low_read_count': 'reads 数偏低',
  'high_duplication_rate': '重复率偏高',
  'very_low_read_count': 'reads 数极低',
  'very_low_q30': 'Q30 极低',
  'low_mapping_rate': '比对率偏低',
  'high_adapter_content': '接头含量偏高',
  'negative_control_abnormal': '阴性对照异常',
  'ecoli_signal_detected': '检测到大肠杆菌信号',
  'reagent_contamination_suspected': '疑为试剂污染',
  'staph_contamination_detected': '检测到葡萄球菌污染',
  'collection_device_contamination_suspected': '疑为采集装置污染',
  'abnormal_pathogen_signal': '异常病原菌信号',
  'pending_review': '待复核',
  'sample_degradation_suspected': '疑似样本降解',
  'duplication_rate_near_threshold': '重复率接近阈值',
  'low_total_reads_normal_for_control': '总 reads 数低（对照样本正常）',
  'positive_control_expected_composition': '阳性对照组成符合预期',
  'high_gc_content_environmental_sample': 'GC 含量偏高（环境样本正常）',
  'low_mapping_rate_due_to_contamination': '比对率低（污染导致）',
};

function lineageNodeToStep(nodes: Array<{
  id: string;
  name: string;
  timestamp: string;
  operator: string;
  status: 'completed' | 'failed' | 'in-progress';
  notes?: string;
  type: string;
}>): LineageStep[] {
  return nodes.map((node) => {
    let status: StatusType = 'pending';
    if (node.status === 'completed') status = 'success';
    else if (node.status === 'failed') status = 'error';
    else if (node.status === 'in-progress') status = 'info';

    const isKey = node.type === 'qc' || node.type === 'analysis';

    return {
      id: node.id,
      name: node.name,
      status,
      time: new Date(node.timestamp).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      operator: node.operator,
      description: node.notes,
      isKey,
    };
  });
}

interface QCComparisonData {
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  fields: FieldConfig[];
  changeReason: string;
}

function getQCComparisonData(sampleId: string): QCComparisonData | null {
  const qcData = getQCBySample(sampleId);
  if (!qcData) return null;

  if (sampleId === 'sm-007') {
    return {
      oldData: {
        overallStatus: 'warning',
        contaminationLevel: 5.2,
        totalReads: 8900000,
        mappingRate: 87.64,
        q30: 88.5,
        gcContent: 46.8,
        duplicationRate: 14.3,
        adapterContent: 1.8,
        riskLevel: '中低',
        confidence: 72,
        conclusion: '质量警告，建议复核',
      },
      newData: {
        overallStatus: 'fail',
        contaminationLevel: 28.7,
        totalReads: 8900000,
        mappingRate: 87.64,
        q30: 88.5,
        gcContent: 46.8,
        duplicationRate: 14.3,
        adapterContent: 1.8,
        riskLevel: '高',
        confidence: 95,
        conclusion: '样本污染，结果不可靠',
      },
      fields: [
        { key: 'overallStatus', label: '整体质控状态', formatter: (v) => qcStatusTextMap[v as QCStatus] || String(v) },
        { key: 'riskLevel', label: '风险等级' },
        { key: 'contaminationLevel', label: '污染等级(%)', formatter: (v) => `${v}%` },
        { key: 'confidence', label: '判断置信度(%)', formatter: (v) => `${v}%` },
        { key: 'totalReads', label: '总 Reads 数', formatter: (v) => `${(v as number / 1000000).toFixed(1)}M` },
        { key: 'mappingRate', label: '比对率(%)', formatter: (v) => `${v}%` },
        { key: 'q30', label: 'Q30(%)', formatter: (v) => `${v}%` },
        { key: 'gcContent', label: 'GC 含量(%)', formatter: (v) => `${v}%` },
        { key: 'duplicationRate', label: '重复率(%)', formatter: (v) => `${v}%` },
        { key: 'adapterContent', label: '接头含量(%)', formatter: (v) => `${v}%` },
        { key: 'conclusion', label: '结论' },
      ],
      changeReason: '谱系追踪发现：该样本与阴性对照 sm-008 存在相同的皮肤菌群污染特征，且同批次处理的多个样本均检测到类似污染信号。结合样本采集记录（静脉采血）和采集部位（血液），正常血液样本应无菌或微生物含量极低，而当前样本检测到较高的皮肤菌群丰度，提示采集过程中皮肤表面菌群污染样本的可能性极高。综合谱系溯源分析，将判断从"质量警告"升级为"样本污染"。',
    };
  }

  if (sampleId === 'sm-006') {
    return {
      oldData: {
        overallStatus: 'warning',
        contaminationLevel: 2.1,
        totalReads: 1200000,
        mappingRate: 56.67,
        q30: 62.3,
        gcContent: 50.2,
        duplicationRate: 35.8,
        adapterContent: 8.5,
        riskLevel: '中',
        confidence: 65,
        conclusion: '质量警告，数据可用但需谨慎',
      },
      newData: {
        overallStatus: 'fail',
        contaminationLevel: 5.2,
        totalReads: 1200000,
        mappingRate: 56.67,
        q30: 62.3,
        gcContent: 50.2,
        duplicationRate: 35.8,
        adapterContent: 8.5,
        riskLevel: '高',
        confidence: 92,
        conclusion: '样本降解严重，建议重新采样',
      },
      fields: [
        { key: 'overallStatus', label: '整体质控状态', formatter: (v) => qcStatusTextMap[v as QCStatus] || String(v) },
        { key: 'riskLevel', label: '风险等级' },
        { key: 'contaminationLevel', label: '污染等级(%)', formatter: (v) => `${v}%` },
        { key: 'confidence', label: '判断置信度(%)', formatter: (v) => `${v}%` },
        { key: 'totalReads', label: '总 Reads 数', formatter: (v) => `${(v as number / 1000000).toFixed(1)}M` },
        { key: 'mappingRate', label: '比对率(%)', formatter: (v) => `${v}%` },
        { key: 'q30', label: 'Q30(%)', formatter: (v) => `${v}%` },
        { key: 'gcContent', label: 'GC 含量(%)', formatter: (v) => `${v}%` },
        { key: 'duplicationRate', label: '重复率(%)', formatter: (v) => `${v}%` },
        { key: 'adapterContent', label: '接头含量(%)', formatter: (v) => `${v}%` },
        { key: 'conclusion', label: '结论' },
      ],
      changeReason: '谱系追踪发现：样本采集后未及时冷藏（室温放置超过24小时），DNA提取阶段产量显著偏低（仅为正常样本的1/8），文库制备需要增加PCR循环数。结合各项指标的关联性分析，判断样本存在严重降解，而非单纯的测序问题。谱系分析将判断从"质量警告"升级为"不合格"，建议重新采样。',
    };
  }

  return null;
}

export default function SampleDetailPage() {
  const navigate = useNavigate();
  const { id = 'sm-007' } = useParams();

  const sample = getSampleById(id);
  const qcData = getQCBySample(id);
  const lineage = getLineageBySample(id);
  const qcComparison = getQCComparisonData(id);

  const lineageSteps = lineage ? lineageNodeToStep(lineage.nodes) : [];

  if (!sample) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">样本未找到</h2>
          <p className="text-lab-400 mb-6">样本 ID: {id} 不存在</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        </div>
      </div>
    );
  }

  const statusType = statusMap[sample.status];
  const statusLabel = statusTextMap[sample.status];
  const sampleTypeLabel = sampleTypeTextMap[sample.type] || sample.type;

  const getContaminationLevelColor = (level: number) => {
    if (level < 5) return 'text-emerald-400';
    if (level < 15) return 'text-amber-400';
    if (level < 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getContaminationLevelBg = (level: number) => {
    if (level < 5) return 'from-emerald-500/20 to-emerald-500/5';
    if (level < 15) return 'from-amber-500/20 to-amber-500/5';
    if (level < 30) return 'from-orange-500/20 to-orange-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  const handleStepClick = (step: LineageStep) => {
    console.log('Step clicked:', step);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-lab-200" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{sample.name}</h1>
            <StatusBadge status={statusType} text={statusLabel} size="md" />
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-lab-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {sample.collectionDate}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {sample.collectionSite}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {sampleTypeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-4 min-h-0">
        <div className="grid grid-cols-2 gap-4" style={{ minHeight: '40%' }}>
          <div className="glass-card p-5 overflow-auto scrollbar-thin">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-400/15 flex items-center justify-center">
                <FileText className="w-4 h-4 text-teal-400" />
              </div>
              <h2 className="text-base font-semibold text-white">样本基本信息</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">基础信息</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-lab-400 mb-1">样本 ID</div>
                    <div className="text-sm font-mono text-white">{sample.id}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-lab-400 mb-1">样本名称</div>
                    <div className="text-sm text-white">{sample.name}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-lab-400 mb-1">样本类型</div>
                    <div className="text-sm text-white">{sampleTypeLabel}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-lab-400 mb-1">状态</div>
                    <StatusBadge status={statusType} text={statusLabel} size="sm" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">采集信息</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-lab-400 mb-1">采集日期</div>
                    <div className="text-sm text-white">{sample.collectionDate}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="text-xs text-lab-400 mb-1">采集部位</div>
                    <div className="text-sm text-white">{sample.collectionSite}</div>
                  </div>
                  {sample.collector && (
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="text-xs text-lab-400 mb-1">采集人</div>
                      <div className="text-sm text-white">{sample.collector}</div>
                    </div>
                  )}
                  {sample.patientId && (
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="text-xs text-lab-400 mb-1">患者 ID</div>
                      <div className="text-sm font-mono text-white">{sample.patientId}</div>
                    </div>
                  )}
                </div>
              </div>

              {sample.sequencer && (
                <div>
                  <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">测序信息</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="text-xs text-lab-400 mb-1">测序仪</div>
                      <div className="text-sm text-white">{sample.sequencer}</div>
                    </div>
                    {sample.sequencingDate && (
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <div className="text-xs text-lab-400 mb-1">测序日期</div>
                        <div className="text-sm text-white">{sample.sequencingDate}</div>
                      </div>
                    )}
                    {sample.readCount !== undefined && (
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <div className="text-xs text-lab-400 mb-1">Reads 数</div>
                        <div className="text-sm font-mono text-white">
                          {(sample.readCount / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    )}
                    {sample.q30 !== undefined && (
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <div className="text-xs text-lab-400 mb-1">Q30</div>
                        <div className="text-sm font-mono text-white">{sample.q30}%</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sample.description && (
                <div>
                  <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">备注</h3>
                  <p className="text-sm text-lab-300 bg-white/[0.03] rounded-lg p-3">
                    {sample.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5 overflow-auto scrollbar-thin">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white">质控概览</h2>
            </div>

            {qcData ? (
              <div className="space-y-4">
                <div className={cn(
                  'rounded-xl p-4 bg-gradient-to-br',
                  qcData.overallStatus === 'pass' && 'from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20',
                  qcData.overallStatus === 'warning' && 'from-amber-500/15 to-amber-500/5 border border-amber-500/20',
                  qcData.overallStatus === 'fail' && 'from-red-500/15 to-red-500/5 border border-red-500/20',
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-lab-300 mb-1">整体质控状态</div>
                      <div className="text-2xl font-bold text-white">
                        {qcStatusTextMap[qcData.overallStatus]}
                      </div>
                    </div>
                    <StatusBadge status={qcStatusTypeMap[qcData.overallStatus]} size="lg" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">质控指标</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold font-mono text-white">
                        {(qcData.totalReads / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-lab-400 mt-1">总 Reads</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className={cn(
                        'text-lg font-bold font-mono',
                        qcData.mappingRate >= 80 ? 'text-emerald-400' : qcData.mappingRate >= 60 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {qcData.mappingRate}%
                      </div>
                      <div className="text-xs text-lab-400 mt-1">比对率</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className={cn(
                        'text-lg font-bold font-mono',
                        qcData.q30 >= 90 ? 'text-emerald-400' : qcData.q30 >= 70 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {qcData.q30}%
                      </div>
                      <div className="text-xs text-lab-400 mt-1">Q30</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold font-mono text-white">
                        {qcData.gcContent}%
                      </div>
                      <div className="text-xs text-lab-400 mt-1">GC 含量</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className={cn(
                        'text-lg font-bold font-mono',
                        qcData.duplicationRate <= 15 ? 'text-emerald-400' : qcData.duplicationRate <= 25 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {qcData.duplicationRate}%
                      </div>
                      <div className="text-xs text-lab-400 mt-1">重复率</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                      <div className={cn(
                        'text-lg font-bold font-mono',
                        qcData.adapterContent <= 2 ? 'text-emerald-400' : qcData.adapterContent <= 5 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {qcData.adapterContent}%
                      </div>
                      <div className="text-xs text-lab-400 mt-1">接头含量</div>
                    </div>
                  </div>
                </div>

                {qcData.contaminationLevel !== undefined && (
                  <div>
                    <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">污染等级</h3>
                    <div className={cn(
                      'rounded-lg p-3 bg-gradient-to-r',
                      getContaminationLevelBg(qcData.contaminationLevel)
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn('w-4 h-4', getContaminationLevelColor(qcData.contaminationLevel))} />
                          <span className="text-sm text-white">污染水平</span>
                        </div>
                        <span className={cn('text-lg font-bold font-mono', getContaminationLevelColor(qcData.contaminationLevel))}>
                          {qcData.contaminationLevel}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700',
                            qcData.contaminationLevel < 5 && 'bg-emerald-400',
                            qcData.contaminationLevel >= 5 && qcData.contaminationLevel < 15 && 'bg-amber-400',
                            qcData.contaminationLevel >= 15 && qcData.contaminationLevel < 30 && 'bg-orange-400',
                            qcData.contaminationLevel >= 30 && 'bg-red-400'
                          )}
                          style={{ width: `${Math.min(qcData.contaminationLevel * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {qcData.warnings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-lab-400 uppercase tracking-wider mb-2">
                      质控警告 ({qcData.warnings.length})
                    </h3>
                    <div className="space-y-2">
                      {qcData.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-sm text-amber-200">
                            {warningTextMap[warning] || warning}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-lab-400">
                暂无质控数据
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="glass-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-400/15 flex items-center justify-center">
                  <Dna className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">谱系追踪流程</h2>
                  <p className="text-xs text-lab-400">样本处理全流程溯源</p>
                </div>
                {qcComparison && (
                  <span className="ml-auto text-xs bg-amber-400/15 text-amber-400 px-2 py-1 rounded-full border border-amber-400/20">
                    检测到判断变更
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin p-4">
              {lineageSteps.length > 0 ? (
                <LineageFlow
                  steps={lineageSteps}
                  onStepClick={handleStepClick}
                  className="!bg-transparent !border-0 !p-0"
                  title=""
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-lab-400">
                  暂无谱系追踪数据
                </div>
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">谱系追踪判断变更前后质控对比</h2>
                  <p className="text-xs text-lab-400">对比谱系分析前后的质控判断</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin p-4">
              {qcComparison ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 bg-gradient-to-br from-slate-500/15 to-slate-500/5 rounded-lg p-3 border border-slate-500/20">
                      <div className="text-xs text-lab-400 mb-1">变更前</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="warning" size="sm" text={qcStatusTextMap[qcComparison.oldData.overallStatus as QCStatus]} />
                        <span className="text-xs text-slate-400">初始判断</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-lab-500" />
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-red-500/15 to-red-500/5 rounded-lg p-3 border border-red-500/20">
                      <div className="text-xs text-lab-400 mb-1">变更后</div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="error" size="sm" text={qcStatusTextMap[qcComparison.newData.overallStatus as QCStatus]} />
                        <span className="text-xs text-red-400">谱系追踪后</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/5">
                          <th className="text-left font-medium text-lab-300 px-3 py-2 text-xs">指标</th>
                          <th className="text-center font-medium text-lab-300 px-3 py-2 text-xs w-24">变更前</th>
                          <th className="text-center font-medium text-lab-300 px-3 py-2 text-xs w-24">变更后</th>
                          <th className="text-center font-medium text-lab-300 px-3 py-2 text-xs w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {qcComparison.fields.map((field) => {
                          const oldVal = qcComparison.oldData[field.key];
                          const newVal = qcComparison.newData[field.key];
                          const oldStr = field.formatter ? field.formatter(oldVal) : String(oldVal ?? '');
                          const newStr = field.formatter ? field.formatter(newVal) : String(newVal ?? '');
                          const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                          return (
                            <tr
                              key={field.key}
                              className={cn(
                                'border-b border-white/5 transition-colors',
                                isChanged ? 'bg-amber-500/5' : 'bg-white/[0.02]'
                              )}
                            >
                              <td className="px-3 py-2.5 text-lab-200 font-medium">
                                {field.label}
                              </td>
                              <td className={cn(
                                'px-3 py-2.5 text-center font-mono',
                                isChanged ? 'text-amber-300 line-through' : 'text-lab-300'
                              )}>
                                {oldStr || '-'}
                              </td>
                              <td className={cn(
                                'px-3 py-2.5 text-center font-mono font-medium',
                                isChanged ? 'text-emerald-400' : 'text-lab-300'
                              )}>
                                {newStr || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {isChanged && (
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gradient-to-br from-teal-500/10 to-teal-500/5 rounded-lg p-4 border border-teal-500/20">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-teal-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="w-4 h-4 text-teal-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white mb-1">为什么判断改变了？</h4>
                        <p className="text-sm text-lab-300 leading-relaxed">
                          {qcComparison.changeReason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-lab-400">
                  <Activity className="w-12 h-12 opacity-30 mb-3" />
                  <p>该样本无谱系追踪判断变更</p>
                  <p className="text-xs text-lab-500 mt-1">质控判断保持一致</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
