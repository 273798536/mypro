import { PrimerSample, SampleStatus, ReviewAction } from "@/types";
import { buildMetric, generateAutoReason, classifySample } from "@/utils/boundaryCheck";
import { injectSpecificPoints } from "@/utils/pcaSimulation";

const BASE_TS = new Date("2026-06-11T09:30:00").getTime();

function createSample1(): PrimerSample {
  const pcaPoints = injectSpecificPoints();
  const pca = pcaPoints[0];
  const metrics = [
    buildMetric("GC含量", "GC%", 52, 45, 60, "%", "鸟嘌呤+胞嘧啶占比，偏离区间会影响引物结合效率与特异性"),
    buildMetric("熔解温度", "Tm", 58.2, 55, 62, "℃", "引物与模板解链一半时的温度，需与PCR程序匹配"),
    buildMetric("二聚体评分", "Dimer", 92, 80, 100, "分", "引物自身互补或交叉互补风险，分数越高越安全"),
    buildMetric("特异性评分", "Spec", 88, 75, 100, "分", "全基因组非特异结合位点过滤，分数越高越专一"),
    buildMetric("产物长度", "Len", 204, 150, 300, "bp", "PCR扩增片段长度，定量反应的适宜区间"),
    buildMetric("跨内含子评分", "Splice", 95, 85, 100, "分", "引物是否跨越exon-exon连接，避免基因组DNA污染"),
  ];
  const autoStatus = classifySample(metrics);
  const reviews = [
    {
      id: "R-001",
      author: "李主管",
      role: "动物房管理员",
      timestamp: BASE_TS + 3600_000 * 2,
      content: "全部指标合格，采样地点A-3-02近期环境记录良好，无异常，直接放行通过。",
      action: ReviewAction.CONFIRM,
      updatesLineage: true,
    },
  ];
  const lineage = [
    {
      id: "L1-1",
      stage: "采样登记",
      operator: "王学生",
      timestamp: BASE_TS,
      statusBefore: null,
      statusAfter: SampleStatus.NORMAL,
      note: "A区-3号笼架-02，小鼠尾尖采血，操作规范",
    },
    {
      id: "L1-2",
      stage: "自动初检",
      operator: "系统引擎",
      timestamp: BASE_TS + 1800_000,
      statusBefore: SampleStatus.NORMAL,
      statusAfter: SampleStatus.NORMAL,
      note: generateAutoReason(metrics, pca.sigmaDistance),
    },
    {
      id: "L1-3",
      stage: "复核确认",
      operator: "李主管",
      timestamp: BASE_TS + 3600_000 * 2,
      statusBefore: SampleStatus.NORMAL,
      statusAfter: SampleStatus.NORMAL,
      note: "管理员确认自动判定结果，放行",
      relatedReviewId: "R-001",
    },
  ];
  return {
    id: "P-2026-0611-001",
    name: "Actb-F1",
    batch: "BAT-2026-W24",
    location: "A区-3号笼架-02",
    collectionDate: "2026-06-11 09:30",
    operator: "王学生",
    status: autoStatus,
    autoDetectReason: generateAutoReason(metrics, pca.sigmaDistance),
    blockReasonSummary: "无拦截：全维度指标均在阈值范围内，批次聚类正常。",
    suggestions: [
      "可直接用于后续qPCR实验",
      "建议与同批次其他引物一并保存于-20℃",
      "如需重复实验请使用相同PCR程序",
    ],
    metrics,
    reviews,
    lineage,
    batchEffect: pca,
  };
}

function createSample2(): PrimerSample {
  const pcaPoints = injectSpecificPoints();
  const pca = pcaPoints[1];
  const metrics = [
    buildMetric("GC含量", "GC%", 45.2, 45, 60, "%", "鸟嘌呤+胞嘧啶占比，仅高于下限0.2%，需关注批次整体是否偏低"),
    buildMetric("熔解温度", "Tm", 55.4, 55, 62, "℃", "引物与模板解链一半时的温度，仅高于下限0.4℃，PCR时建议确认实际退火效率"),
    buildMetric("二聚体评分", "Dimer", 81, 80, 100, "分", "引物自身互补风险，仅高于下限1分，建议运行熔解曲线验证"),
    buildMetric("特异性评分", "Spec", 76, 75, 100, "分", "仅高于下限1分，可能存在次要非特异条带"),
    buildMetric("产物长度", "Len", 153, 150, 300, "bp", "扩增长度仅高于下限3bp，接近定量反应的适宜下限"),
    buildMetric("跨内含子评分", "Splice", 86, 85, 100, "分", "略高于阈值，建议验证gDNA污染对照"),
  ];
  const autoStatus = classifySample(metrics);
  const reviews = [];
  const lineage = [
    {
      id: "L2-1",
      stage: "采样登记",
      operator: "赵学生",
      timestamp: BASE_TS + 300_000,
      statusBefore: null,
      statusAfter: SampleStatus.BORDERLINE,
      note: "B区-1号笼架-07，小鼠耳部组织取样",
    },
    {
      id: "L2-2",
      stage: "自动初检",
      operator: "系统引擎",
      timestamp: BASE_TS + 1800_000,
      statusBefore: SampleStatus.BORDERLINE,
      statusAfter: SampleStatus.BORDERLINE,
      note: generateAutoReason(metrics, pca.sigmaDistance),
    },
  ];
  return {
    id: "P-2026-0611-002",
    name: "Gapdh-R2",
    batch: "BAT-2026-W24",
    location: "B区-1号笼架-07",
    collectionDate: "2026-06-11 09:35",
    operator: "赵学生",
    status: autoStatus,
    autoDetectReason: generateAutoReason(metrics, pca.sigmaDistance),
    blockReasonSummary: "5项指标同时触达阈值边缘（偏差<5%），PCA位于2σ边界；建议管理员复核采样环境和实际电泳结果后再放行。",
    suggestions: [
      "请管理员复核：检查B-1-07笼架近期温湿度记录",
      "建议做一次梯度PCR（52-60℃）验证最佳退火温度",
      "并行跑熔解曲线确认是否存在引物二聚体",
      "若熔解曲线单峰且梯度验证通过，可调整为正常放行",
    ],
    metrics,
    reviews,
    lineage,
    batchEffect: pca,
  };
}

function createSample3(): PrimerSample {
  const pcaPoints = injectSpecificPoints();
  const pca = pcaPoints[2];
  const metrics = [
    buildMetric("GC含量", "GC%", 32, 45, 60, "%", "鸟嘌呤+胞嘧啶占比，低13%严重越界，非典型哺乳动物基因特征，高度怀疑污染"),
    buildMetric("熔解温度", "Tm", 48.5, 55, 62, "℃", "低于下限6.5℃，常规qPCR程序中结合效率会显著下降"),
    buildMetric("二聚体评分", "Dimer", 52, 80, 100, "分", "低于下限28分，引物自身或与其他批次引物严重互补"),
    buildMetric("特异性评分", "Spec", 41, 75, 100, "分", "低于下限34分，预示大量非特异扩增位点，无法准确定量"),
    buildMetric("产物长度", "Len", 86, 150, 300, "bp", "短64bp，疑似引物二聚体或引物与污染菌基因组结合"),
    buildMetric("跨内含子评分", "Splice", 62, 85, 100, "分", "低于下限23分，极可能结合到gDNA而非目标mRNA"),
  ];
  const autoStatus = classifySample(metrics);
  const reviews = [
    {
      id: "R-003-A",
      author: "李主管",
      role: "动物房管理员",
      timestamp: BASE_TS + 3600_000 * 3,
      content: "采样地点C-2-11为本月第3次出现异常。查阅笼卡记录，该位置6月8日更换垫料后曾出现同窝小鼠皮毛不洁记录，高度怀疑环境污染。",
      action: ReviewAction.CONFIRM,
      updatesLineage: true,
    },
    {
      id: "R-003-B",
      author: "张质量",
      role: "质量负责人",
      timestamp: BASE_TS + 3600_000 * 4,
      content: "同意环境污染判断。已安排C-2-11位置彻底消杀并更换笼架位置。此份样本废弃，请学生重新采样。其他使用同批试剂的样本需留意。",
      action: ReviewAction.REQUEST_RECHECK,
      updatesLineage: true,
    },
  ];
  const lineage = [
    {
      id: "L3-1",
      stage: "采样登记",
      operator: "陈学生",
      timestamp: BASE_TS + 600_000,
      statusBefore: null,
      statusAfter: SampleStatus.ABNORMAL,
      note: "C区-2号笼架-11，肝组织取样",
    },
    {
      id: "L3-2",
      stage: "自动初检",
      operator: "系统引擎",
      timestamp: BASE_TS + 1800_000,
      statusBefore: SampleStatus.ABNORMAL,
      statusAfter: SampleStatus.ABNORMAL,
      note: generateAutoReason(metrics, pca.sigmaDistance),
    },
    {
      id: "L3-3",
      stage: "复核1·环境污染标记",
      operator: "李主管",
      timestamp: BASE_TS + 3600_000 * 3,
      statusBefore: SampleStatus.ABNORMAL,
      statusAfter: SampleStatus.ABNORMAL,
      note: "C-2-11本月第3次异常，结合垫料更换记录标记环境污染",
      relatedReviewId: "R-003-A",
    },
    {
      id: "L3-4",
      stage: "复核2·建议重测",
      operator: "张质量",
      timestamp: BASE_TS + 3600_000 * 4,
      statusBefore: SampleStatus.ABNORMAL,
      statusAfter: SampleStatus.ABNORMAL,
      note: "质量负责人确认废弃，通知学生重采样",
      relatedReviewId: "R-003-B",
    },
  ];
  return {
    id: "P-2026-0611-003",
    name: "Il6-Fwd",
    batch: "BAT-2026-W24",
    location: "C区-2号笼架-11",
    collectionDate: "2026-06-11 09:40",
    operator: "陈学生",
    status: autoStatus,
    autoDetectReason: generateAutoReason(metrics, pca.sigmaDistance) +
      "；采样地点C-2-11历史上已出现3次类似异常，怀疑环境污染",
    blockReasonSummary: "6项指标全部严重越界（偏差>10%）+ PCA距离4.3σ明显离群 + C-2-11采样地历史异常3次，综合判定为环境污染导致，直接拦截。",
    suggestions: [
      "此样本请直接废弃，请勿进入后续qPCR实验",
      "请学生到已消杀完成的笼架重新采样",
      "如必须使用原组织，请做1:10稀释后重新提取RNA再送样",
      "C-2-11笼架已安排消杀，新样本请在其他位置采集",
      "同批试剂的其他样本请关注Tm值与产物长度是否同步异常",
    ],
    metrics,
    reviews,
    lineage,
    batchEffect: pca,
  };
}

export const mockSamples: PrimerSample[] = [
  createSample1(),
  createSample2(),
  createSample3(),
];
