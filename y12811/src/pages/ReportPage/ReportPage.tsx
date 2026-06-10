import { useState, useMemo, useRef } from 'react'
import {
  FileBarChart,
  Download,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ZoomIn,
  AlertCircle,
  Lightbulb,
  ClipboardList,
  GitBranch,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  samples,
  microbes,
  abundanceData,
  qcDataList,
  cultureRecords,
  changeHistory,
  lineageList,
  getQCSummary,
  getAbnormalSamples,
  getControlSamples,
  getMicrobeById,
  getSampleById,
} from '@/data'
import { HeatmapChart } from '@/components/Heatmap'
import { StatusBadge } from '@/components/UI'
import type {
  Sample,
  SampleStatusType,
  StatusType,
  QCData,
  CultureRecord,
  ChangeHistory,
  Lineage,
  AbundanceData,
} from '@/types'

const sampleStatusToBadgeStatus = (status: SampleStatusType): StatusType => {
  switch (status) {
    case 'normal':
      return 'success'
    case 'low-quality':
      return 'warning'
    case 'contaminated':
      return 'error'
    case 'control-abnormal':
      return 'error'
    case 'pending-review':
      return 'pending'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'info'
  }
}

const getStatusLabel = (status: SampleStatusType): string => {
  switch (status) {
    case 'normal':
      return '正常'
    case 'low-quality':
      return '低质量'
    case 'contaminated':
      return '污染'
    case 'control-abnormal':
      return '对照异常'
    case 'pending-review':
      return '待复核'
    case 'warning':
      return '警告'
    case 'error':
      return '异常'
    default:
      return status
  }
}

const qcStatusToBadgeStatus = (status: QCData['overallStatus']): StatusType => {
  switch (status) {
    case 'pass':
      return 'success'
    case 'warning':
      return 'warning'
    case 'fail':
      return 'error'
    default:
      return 'info'
  }
}

const getQCStatusLabel = (status: QCData['overallStatus']): string => {
  switch (status) {
    case 'pass':
      return '通过'
    case 'warning':
      return '警告'
    case 'fail':
      return '失败'
    default:
      return status
  }
}

const cultureStatusToBadgeStatus = (
  status: CultureRecord['status']
): StatusType => {
  switch (status) {
    case 'growth':
      return 'warning'
    case 'no-growth':
      return 'success'
    case 'contaminated':
      return 'error'
    default:
      return 'info'
  }
}

const getCultureStatusLabel = (status: CultureRecord['status']): string => {
  switch (status) {
    case 'growth':
      return '有菌生长'
    case 'no-growth':
      return '无菌生长'
    case 'contaminated':
      return '污染'
    default:
      return status
  }
}

const sections = [
  { id: 'overview', title: '1. 概述', icon: FileText },
  { id: 'abundance', title: '2. 微生物丰度分析', icon: FileBarChart },
  { id: 'qc', title: '3. 样本质控结果', icon: ClipboardList },
  { id: 'negative-control', title: '4. 阴性对照异常分析', icon: AlertTriangle },
  { id: 'culture', title: '5. 培养记录汇总', icon: FileText },
  { id: 'lineage', title: '6. 谱系追踪与判断变更', icon: GitBranch },
]

export default function ReportPage() {
  const [showHeatmapModal, setShowHeatmapModal] = useState(false)
  const overviewRef = useRef<HTMLDivElement>(null)
  const abundanceRef = useRef<HTMLDivElement>(null)
  const qcRef = useRef<HTMLDivElement>(null)
  const negativeControlRef = useRef<HTMLDivElement>(null)
  const cultureRef = useRef<HTMLDivElement>(null)
  const lineageRef = useRef<HTMLDivElement>(null)

  const sectionRefs: Record<string, React.RefObject<HTMLDivElement>> = {
    overview: overviewRef,
    abundance: abundanceRef,
    qc: qcRef,
    'negative-control': negativeControlRef,
    culture: cultureRef,
    lineage: lineageRef,
  }

  const qcSummary = useMemo(() => getQCSummary(), [])
  const abnormalSamples = useMemo(() => getAbnormalSamples(), [])
  const controlSamples = useMemo(() => getControlSamples(), [])
  const negativeControlAbnormalSamples = useMemo(
    () => controlSamples.filter((s) => s.status === 'control-abnormal'),
    [controlSamples]
  )

  const heatmapData = useMemo((): AbundanceData[] => {
    return abundanceData
      .filter((item) => item.abundance !== null)
      .map((item, index) => ({
        id: item.id || `ab-${index}`,
        sampleId: item.sampleId,
        microbeId: item.microbeId,
        abundance: item.abundance as number,
        relativeAbundance: item.relativeAbundance || 0,
      }))
  }, [])

  const top10Microbes = useMemo(() => {
    const microbeTotalAbundance = new Map<string, number>()
    abundanceData.forEach((item) => {
      if (item.abundance !== null) {
        const current = microbeTotalAbundance.get(item.microbeId) || 0
        microbeTotalAbundance.set(item.microbeId, current + item.abundance)
      }
    })
    return Array.from(microbeTotalAbundance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([microbeId, totalAbundance]) => {
        const microbe = getMicrobeById(microbeId)
        const avgAbundance = totalAbundance / samples.length
        return {
          rank: 0,
          microbeId,
          name: microbe?.name || microbeId,
          scientificName: microbe?.scientificName || '',
          category: microbe?.category || 'bacteria',
          avgAbundance: Math.round(avgAbundance * 100) / 100,
          totalAbundance: Math.round(totalAbundance * 100) / 100,
          pathogenicity: microbe?.pathogenicity || 'non-pathogenic',
        }
      })
      .map((item, index) => ({ ...item, rank: index + 1 }))
  }, [])

  const cultureRecordsWithChanges = useMemo(() => {
    return cultureRecords.map((record) => {
      const changes = changeHistory.filter(
        (h) => h.recordId === record.id && h.recordType === 'culture-record'
      )
      const sample = getSampleById(record.sampleId)
      const microbe = getMicrobeById(record.microbeId)
      return {
        ...record,
        sampleName: sample?.name || record.sampleId,
        microbeName: microbe?.name || record.microbeId,
        changeCount: changes.length,
        latestChange: changes[changes.length - 1],
      }
    })
  }, [])

  const sampleJudgmentChanges = useMemo(() => {
    const sampleChanges = changeHistory.filter((h) => h.recordType === 'sample')
    const judgmentChanges = sampleChanges.filter(
      (h) => h.changes.status && h.changes.status.oldValue !== h.changes.status.newValue
    )
    return judgmentChanges.map((change) => {
      const sample = getSampleById(change.recordId)
      return {
        changeId: change.id,
        sampleId: change.recordId,
        sampleName: sample?.name || change.recordId,
        oldStatus: change.changes.status.oldValue as SampleStatusType | null,
        newStatus: change.changes.status.newValue as SampleStatusType,
        changeReason: change.changeReason,
        changedBy: change.changedBy,
        changeTime: change.changeTime,
        version: change.version,
      }
    })
  }, [])

  const scrollToSection = (sectionId: string) => {
    const ref = sectionRefs[sectionId]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleExport = () => {
    alert('导出报告功能开发中...')
  }

  const reportDate = '2024-04-05'
  const reportNumber = 'RPT-2024-0405-001'
  const testProject = '微生物宏基因组测序分析'
  const inspector = '李主任'

  return (
    <div className="min-h-screen bg-lab-950 bg-grid-pattern bg-grid-20 text-white">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="glass-card p-6 mb-6 sticky top-0 z-30 backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-teal-400/20 flex items-center justify-center">
                  <FileBarChart className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">微生物检测综合报告</h1>
                  <p className="text-sm text-lab-400">
                    {testProject}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-lab-300 mt-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-lab-400" />
                  <span>报告编号: </span>
                  <span className="font-mono text-white">{reportNumber}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-lab-400" />
                  <span>报告日期: </span>
                  <span className="text-white">{reportDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-lab-400" />
                  <span>检测人员: </span>
                  <span className="text-white">{inspector}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
          </div>

          <div className="h-px bg-white/10 my-4" />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-lab-400 mr-1">目录:</span>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="px-2.5 py-1 text-xs rounded-md bg-white/5 text-lab-300 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-1"
              >
                <section.icon className="w-3.5 h-3.5" />
                {section.title}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section ref={overviewRef} id="overview" className="scroll-mt-28">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-400">1</span>
                </div>
                <h2 className="text-lg font-semibold text-white">概述</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">批次信息</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-lab-400">报告编号</div>
                      <div className="mt-1 font-mono text-white text-sm">{reportNumber}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-lab-400">检测项目</div>
                      <div className="mt-1 text-white text-sm">{testProject}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-lab-400">检测日期</div>
                      <div className="mt-1 text-white text-sm">2024-03-15 至 2024-04-04</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xs text-lab-400">检测人员</div>
                      <div className="mt-1 text-white text-sm">{inspector}</div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">样本概览</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="text-2xl font-bold text-white">{samples.length}</div>
                      <div className="text-xs text-lab-400 mt-1">样本总数</div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <div className="text-2xl font-bold text-emerald-400">
                        {samples.filter((s) => s.status === 'normal').length}
                      </div>
                      <div className="text-xs text-emerald-300/70 mt-1">正常样本</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                      <div className="text-2xl font-bold text-red-400">
                        {abnormalSamples.length}
                      </div>
                      <div className="text-xs text-red-300/70 mt-1">异常样本</div>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                      <div className="text-2xl font-bold text-amber-400">
                        {((qcSummary.passed / qcSummary.total) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-amber-300/70 mt-1">质控通过率</div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">总结论</h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-lab-200 leading-relaxed">
                      本批次共检测 <span className="font-semibold text-white">{samples.length}</span> 份样本，
                      其中正常样本 <span className="font-semibold text-emerald-400">{samples.filter((s) => s.status === 'normal').length}</span> 份，
                      异常样本 <span className="font-semibold text-red-400">{abnormalSamples.length}</span> 份。
                      质控通过率为 <span className="font-semibold text-amber-400">{((qcSummary.passed / qcSummary.total) * 100).toFixed(1)}%</span>。
                      <span className="text-red-400 font-semibold">
                        特别注意：检测到 {negativeControlAbnormalSamples.length} 份阴性对照样本存在异常，
                        提示可能存在试剂或耗材污染，详见第4章"阴性对照异常分析"。
                      </span>
                      建议对异常样本进行复核，并对污染来源进行调查。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section ref={abundanceRef} id="abundance" className="scroll-mt-28">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-400">2</span>
                </div>
                <h2 className="text-lg font-semibold text-white">微生物丰度分析</h2>
                <span className="text-xs text-lab-400 bg-white/10 px-2 py-0.5 rounded-full">
                  图1
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-lab-300">
                      图1 微生物丰度热图
                    </h3>
                    <button
                      onClick={() => setShowHeatmapModal(true)}
                      className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      点击放大查看
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 overflow-hidden">
                    <div className="h-64">
                      <HeatmapChart
                        data={heatmapData}
                        microbes={microbes}
                        samples={samples}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-lab-400 mt-2 text-center">
                    图1注：各样本中微生物丰度分布热图，颜色越深表示丰度越高
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">文字说明</h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-lab-200 leading-relaxed">
                      如图1所示，本批次样本的微生物群落结构呈现出明显的多样性特征。
                      整体来看，临床样本（粪便、口腔、皮肤等）的微生物组成与各采集部位的正常菌群特征相符。
                      丰度最高的微生物主要包括大肠杆菌（<em>Escherichia coli</em>）、
                      金黄色葡萄球菌（<em>Staphylococcus aureus</em>）、
                      乳酸杆菌（<em>Lactobacillus spp.</em>）等。
                      环境样本（土壤、污水）中则以铜绿假单胞菌（<em>Pseudomonas aeruginosa</em>）、
                      古菌（<em>Archaea</em>）等环境微生物为主。
                      值得注意的是，部分阴性对照样本中检测到了微生物信号，提示可能存在污染风险，
                      具体分析详见第4章。
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-lab-300">
                      表1 丰度最高的10种微生物
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="w-12">排名</th>
                          <th>微生物名称</th>
                          <th>学名</th>
                          <th>类别</th>
                          <th>平均丰度(%)</th>
                          <th>致病性</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top10Microbes.map((item) => (
                          <tr key={item.microbeId}>
                            <td className="font-mono text-lab-400">{item.rank}</td>
                            <td className="font-medium text-white">{item.name}</td>
                            <td className="text-lab-400 italic text-sm">
                              {item.scientificName}
                            </td>
                            <td>
                              <span className="text-xs text-lab-300">
                                {item.category === 'bacteria'
                                  ? '细菌'
                                  : item.category === 'fungi'
                                  ? '真菌'
                                  : item.category === 'archaea'
                                  ? '古菌'
                                  : '病毒'}
                              </span>
                            </td>
                            <td className="font-mono text-teal-400">
                              {item.avgAbundance.toFixed(2)}
                            </td>
                            <td>
                              <span
                                className={cn(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  item.pathogenicity === 'pathogenic' &&
                                    'bg-red-500/20 text-red-400',
                                  item.pathogenicity === 'opportunistic' &&
                                    'bg-amber-500/20 text-amber-400',
                                  item.pathogenicity === 'non-pathogenic' &&
                                    'bg-emerald-500/20 text-emerald-400'
                                )}
                              >
                                {item.pathogenicity === 'pathogenic'
                                  ? '致病'
                                  : item.pathogenicity === 'opportunistic'
                                  ? '条件致病'
                                  : '非致病'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-lab-400 mt-2 text-center">
                    表1注：按所有样本平均丰度降序排列的前10种微生物
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section ref={qcRef} id="qc" className="scroll-mt-28">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-400">3</span>
                </div>
                <h2 className="text-lg font-semibold text-white">样本质控结果</h2>
                <span className="text-xs text-lab-400 bg-white/10 px-2 py-0.5 rounded-full">
                  表2
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">质控总体情况</h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-lab-200 leading-relaxed">
                      本批次共 {qcSummary.total} 份样本质控结果如下：
                      通过 <span className="font-semibold text-emerald-400">{qcSummary.passed}</span> 份，
                      警告 <span className="font-semibold text-amber-400">{qcSummary.warning}</span> 份，
                      失败 <span className="font-semibold text-red-400">{qcSummary.failed}</span> 份。
                      整体质控通过率为 <span className="font-semibold text-white">{((qcSummary.passed / qcSummary.total) * 100).toFixed(1)}%</span>。
                      主要问题包括：低质量样本（S006、S011）Q30偏低、测序深度不足；
                      污染样本（S007）检测到皮肤菌群信号；
                      阴性对照异常（S008、S015）检测到微生物信号，提示可能存在试剂或耗材污染。
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-lab-300">
                      表2 所有样本质控结果
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>样本编号</th>
                          <th>样本名称</th>
                          <th>类型</th>
                          <th>总reads数</th>
                          <th>Q30(%)</th>
                          <th>比对率(%)</th>
                          <th>GC含量(%)</th>
                          <th>质控状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qcDataList.map((qc) => {
                          const sample = getSampleById(qc.sampleId)
                          return (
                            <tr
                              key={qc.sampleId}
                              className={cn(
                                qc.overallStatus === 'fail' &&
                                  sample?.type === 'negative-control' &&
                                  'bg-red-500/10'
                              )}
                            >
                              <td className="font-mono text-lab-400 text-xs">
                                {qc.sampleId}
                              </td>
                              <td className="font-medium text-white">
                                {sample?.name || qc.sampleId}
                                {sample?.type === 'negative-control' &&
                                  qc.overallStatus === 'fail' && (
                                    <span className="ml-1 text-red-400 text-xs">
                                      ⚠
                                    </span>
                                  )}
                              </td>
                              <td>
                                <span className="text-xs text-lab-300">
                                  {sample?.type === 'clinical'
                                    ? '临床'
                                    : sample?.type === 'environmental'
                                    ? '环境'
                                    : sample?.type === 'negative-control'
                                    ? '阴性对照'
                                    : '阳性对照'}
                                </span>
                              </td>
                              <td className="font-mono text-sm">
                                {(qc.totalReads / 1000000).toFixed(2)}M
                              </td>
                              <td className="font-mono text-sm">
                                {qc.q30.toFixed(1)}
                              </td>
                              <td className="font-mono text-sm">
                                {qc.mappingRate.toFixed(2)}
                              </td>
                              <td className="font-mono text-sm">
                                {qc.gcContent.toFixed(1)}
                              </td>
                              <td>
                                <StatusBadge
                                  status={qcStatusToBadgeStatus(qc.overallStatus)}
                                  text={getQCStatusLabel(qc.overallStatus)}
                                  size="sm"
                                  showIcon={false}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-lab-400 mt-2 text-center">
                    表2注：标红底色行为阴性对照异常样本，详见第4章分析
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            ref={negativeControlRef}
            id="negative-control"
            className="scroll-mt-28"
          >
            <div className="glass-card p-6 border-2 border-red-500/40 bg-red-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">阴性对照异常分析</h2>
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                  重点关注
                </span>
              </div>

              <div className="space-y-6">
                <div className="border-2 border-red-500/50 rounded-lg p-4 bg-red-500/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-semibold text-red-300 mb-2">
                        异常结论
                      </h3>
                      <p className="text-sm text-red-200 leading-relaxed">
                        本批次共检测到 <span className="font-bold text-white">2 份</span> 阴性对照样本存在异常，
                        分别为：
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="text-sm text-red-200">
                            <span className="font-semibold text-white">S008-阴性对照-试剂</span>
                            ：检测到大肠杆菌信号，疑为
                            <span className="font-semibold text-yellow-300"> DNA提取试剂污染</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="text-sm text-red-200">
                            <span className="font-semibold text-white">S015-阴性对照-采集管</span>
                            ：检测到葡萄球菌信号，疑为
                            <span className="font-semibold text-yellow-300"> 样本采集装置污染</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-red-500/20" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">异常详情</h3>
                  <div className="space-y-4">
                    {negativeControlAbnormalSamples.map((sample) => {
                      const qc = qcDataList.find((q) => q.sampleId === sample.id)
                      const culture = cultureRecords.find(
                        (c) => c.sampleId === sample.id
                      )
                      const lineage = lineageList.find((l) => l.sampleId === sample.id)
                      return (
                        <div
                          key={sample.id}
                          className="border border-red-500/40 rounded-lg p-4 bg-red-500/5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-white">{sample.name}</h4>
                                <p className="text-xs text-lab-400 font-mono">
                                  {sample.id}
                                </p>
                              </div>
                            </div>
                            <StatusBadge
                              status={sampleStatusToBadgeStatus(sample.status)}
                              text={getStatusLabel(sample.status)}
                              size="sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs text-lab-400">异常类型</div>
                              <div className="text-sm text-red-400 font-medium mt-0.5">
                                {sample.id === 'sm-008'
                                  ? '试剂污染'
                                  : '采集装置污染'}
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs text-lab-400">异常程度</div>
                              <div className="text-sm text-amber-400 font-medium mt-0.5">
                                中度
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs text-lab-400">污染水平</div>
                              <div className="text-sm font-mono text-white mt-0.5">
                                {qc?.contaminationLevel?.toFixed(1) || 'N/A'}%
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2.5">
                              <div className="text-xs text-lab-400">检出微生物</div>
                              <div className="text-sm text-white font-medium mt-0.5">
                                {sample.id === 'sm-008'
                                  ? '大肠杆菌'
                                  : '葡萄球菌'}
                              </div>
                            </div>
                          </div>

                          {qc?.warnings && qc.warnings.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs text-lab-400 mb-1.5">告警信息</div>
                              <div className="flex flex-wrap gap-1">
                                {qc.warnings.map((warning, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-red-500/15 text-red-300 px-2 py-0.5 rounded"
                                  >
                                    {warning}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-lab-400">
                            <span className="text-lab-300">材料来源：</span>
                            {sample.id === 'sm-008'
                              ? 'DNA提取试剂盒（批次：RGT-202403）'
                              : '无菌采样管（批次：TUBE-202402）'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="h-px bg-red-500/20" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">
                    <Lightbulb className="w-4 h-4 inline mr-1.5 text-amber-400" />
                    可能原因分析
                  </h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <ul className="space-y-2 text-sm text-lab-200">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          <strong className="text-white">试剂污染：</strong>
                          S008（试剂对照）检测到大肠杆菌，怀疑为DNA提取试剂盒本身受到污染。
                          该批次试剂（RGT-202403）可能在生产或储存过程中引入了微生物污染。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          <strong className="text-white">耗材污染：</strong>
                          S015（采集管对照）检测到葡萄球菌，怀疑为采样管或其保存液受到皮肤菌群污染。
                          可能与耗材生产环节或实验室操作环境有关。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          <strong className="text-white">操作污染：</strong>
                          不排除实验操作过程中引入的污染，如操作人员手部污染、
                          操作台清洁不彻底、气溶胶污染等。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          4
                        </span>
                        <span>
                          <strong className="text-white">交叉污染：</strong>
                          考虑到S007（临床样本）也存在皮肤菌群污染，
                          可能存在样本间交叉污染，建议排查测序前处理流程。
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="h-px bg-red-500/20" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-emerald-400" />
                    处理建议
                  </h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <ul className="space-y-2 text-sm text-lab-200">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          <strong className="text-white">立即停用可疑耗材：</strong>
                          暂停使用批次为 RGT-202403 的DNA提取试剂盒，
                          以及批次为 TUBE-202402 的无菌采样管，更换新批次耗材后再进行实验。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          <strong className="text-white">开展污染源调查：</strong>
                          对实验室环境、试剂、耗材进行全面的污染排查，
                          确定污染来源，制定针对性的防控措施。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          <strong className="text-white">结果谨慎解读：</strong>
                          受污染影响的样本（特别是低生物量样本）结果需谨慎解读，
                          建议在报告中注明污染风险，必要时重新采样检测。
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                          4
                        </span>
                        <span>
                          <strong className="text-white">加强质控措施：</strong>
                          增加阴性对照的数量和类型，
                          建立更严格的污染监控体系，确保后续实验结果的可靠性。
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section ref={cultureRef} id="culture" className="scroll-mt-28">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-400">5</span>
                </div>
                <h2 className="text-lg font-semibold text-white">培养记录汇总</h2>
                <span className="text-xs text-lab-400 bg-white/10 px-2 py-0.5 rounded-full">
                  表3
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">培养记录统计</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-xl font-bold text-white">
                        {cultureRecords.length}
                      </div>
                      <div className="text-xs text-lab-400 mt-1">培养记录总数</div>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                      <div className="text-xl font-bold text-amber-400">
                        {cultureRecords.filter((r) => r.status === 'growth').length}
                      </div>
                      <div className="text-xs text-amber-300/70 mt-1">有菌生长</div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                      <div className="text-xl font-bold text-emerald-400">
                        {cultureRecords.filter((r) => r.status === 'no-growth').length}
                      </div>
                      <div className="text-xs text-emerald-300/70 mt-1">无菌生长</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <div className="text-xl font-bold text-red-400">
                        {cultureRecords.filter((r) => r.status === 'contaminated').length}
                      </div>
                      <div className="text-xs text-red-300/70 mt-1">污染</div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-lab-300">
                      表3 培养记录明细
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>记录编号</th>
                          <th>样本名称</th>
                          <th>微生物</th>
                          <th>培养基</th>
                          <th>菌落数</th>
                          <th>状态</th>
                          <th>版本</th>
                          <th>变更</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cultureRecordsWithChanges.map((record) => (
                          <tr key={record.id}>
                            <td className="font-mono text-lab-400 text-xs">
                              {record.id}
                            </td>
                            <td className="font-medium text-white text-sm">
                              {record.sampleName}
                            </td>
                            <td className="text-sm">{record.microbeName}</td>
                            <td className="text-sm text-lab-300">
                              {record.medium}
                            </td>
                            <td className="font-mono text-sm">
                              {record.colonyCount} CFU
                            </td>
                            <td>
                              <StatusBadge
                                status={cultureStatusToBadgeStatus(record.status)}
                                text={getCultureStatusLabel(record.status)}
                                size="sm"
                                showIcon={false}
                              />
                            </td>
                            <td className="font-mono text-xs text-lab-400">
                              v{record.version}
                            </td>
                            <td>
                              {record.changeCount > 1 ? (
                                <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                                  有变更 ({record.changeCount}次)
                                </span>
                              ) : (
                                <span className="text-xs text-lab-500">无</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-lab-400 mt-2 text-center">
                    表3注："有变更"标记表示该培养记录经过多次修改，详细变更记录可查看各记录详情
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">复核记录</h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-lab-200 leading-relaxed">
                      本批次培养记录中，共有{' '}
                      <span className="font-semibold text-amber-400">
                        {cultureRecordsWithChanges.filter((r) => r.changeCount > 1).length}
                      </span>{' '}
                      条记录存在版本变更，主要涉及菌落计数修正、状态判定变更、补充形态学描述等。
                      所有变更均有完整的变更记录和原因说明，变更历史可追溯。
                      其中，
                      <span className="text-red-400 font-semibold">
                        S007样本（血液样本）被判定为污染样本
                      </span>
                      ，
                      <span className="text-red-400 font-semibold">
                        S008和S015阴性对照样本的培养结果由"无菌生长"修正为"有菌生长"
                      </span>
                      ，
                      提示存在污染，与测序分析结果一致。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section ref={lineageRef} id="lineage" className="scroll-mt-28">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-400">6</span>
                </div>
                <h2 className="text-lg font-semibold text-white">谱系追踪与判断变更</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">判断变更汇总</h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-lab-200 leading-relaxed">
                      本批次样本中，共有{' '}
                      <span className="font-semibold text-amber-400">
                        {sampleJudgmentChanges.length}
                      </span>{' '}
                      份样本的判定结果发生过变更。
                      变更原因包括：质控结果更新、污染判定、状态修正等。
                      所有变更均有完整的变更历史记录，可追溯变更时间、操作人员和变更原因。
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">变更明细</h3>
                  <div className="space-y-4">
                    {sampleJudgmentChanges.map((change) => (
                      <div
                        key={change.changeId}
                        className="border border-white/10 rounded-lg p-4 bg-white/5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                              <GitBranch className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white">
                                {change.sampleName}
                              </h4>
                              <p className="text-xs text-lab-400 font-mono">
                                {change.sampleId}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-lab-400">
                            v{change.version}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-lab-400">变更前：</span>
                            <StatusBadge
                              status={
                                change.oldStatus
                                  ? sampleStatusToBadgeStatus(change.oldStatus)
                                  : 'info'
                              }
                              text={
                                change.oldStatus
                                  ? getStatusLabel(change.oldStatus)
                                  : '初始状态'
                              }
                              size="sm"
                              showIcon={false}
                            />
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-lab-500" />
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-xs text-lab-400">变更后：</span>
                            <StatusBadge
                              status={sampleStatusToBadgeStatus(change.newStatus)}
                              text={getStatusLabel(change.newStatus)}
                              size="sm"
                              showIcon={false}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-lab-400 text-xs">变更原因：</span>
                            <span className="text-lab-200">{change.changeReason}</span>
                          </div>
                          <div>
                            <span className="text-lab-400 text-xs">操作人员：</span>
                            <span className="text-white">{change.changedBy}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-lab-400 text-xs">变更时间：</span>
                            <span className="text-lab-200 font-mono text-xs">
                              {new Date(change.changeTime).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <h3 className="text-sm font-medium text-lab-300 mb-3">谱系追踪说明</h3>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-sm text-lab-200 leading-relaxed">
                      系统对每个样本都建立了完整的谱系追踪记录，涵盖样本采集、DNA提取、
                      文库制备、测序、数据分析、质控检查等全流程环节。
                      每个环节均记录了操作人员、操作时间、关键参数和状态信息。
                      当样本判定发生变更时，系统自动记录变更历史，
                      包括变更前后的状态对比、变更原因、变更人员和变更时间，
                      确保所有变更可追溯、可审计。
                    </p>
                    <p className="text-sm text-lab-200 leading-relaxed mt-3">
                      特别地，
                      <span className="text-red-400 font-semibold">
                        阴性对照样本（S008、S015）的谱系追踪显示其与对应批次的临床样本
                        存在共同的处理环节
                      </span>
                      ，这为污染来源的追溯提供了重要线索。
                      建议结合谱系信息进一步排查污染发生的具体环节。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="text-center py-8 text-lab-500 text-sm">
            <p>— 报告结束 —</p>
            <p className="mt-2 text-xs">
              本报告由微生物分析系统自动生成，如有疑问请联系实验室管理员
            </p>
          </div>
        </div>
      </div>

      {showHeatmapModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-8"
          onClick={() => setShowHeatmapModal(false)}
        >
          <div
            className="w-full max-w-6xl h-full max-h-[80vh] glass-card p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                图1 微生物丰度热图（放大）
              </h3>
              <button
                onClick={() => setShowHeatmapModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-lab-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              <HeatmapChart
                data={heatmapData}
                microbes={microbes}
                samples={samples}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
