import { AlertTriangle, CheckCircle, AlertCircle, Info, BarChart3, MapPin, History } from "lucide-react";
import { PrimerSample, SampleStatus, QualityMetric } from "@/types";

interface BlockReasonCardProps {
  sample: PrimerSample;
}

interface ReasonItem {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info" | "success";
}

function buildMetricReasons(metrics: QualityMetric[]): ReasonItem[] {
  const outOfRange = metrics.filter((m) => m.isOutOfRange);
  const boundary = metrics.filter((m) => m.isBoundary && !m.isOutOfRange);

  if (outOfRange.length >= 2) {
    const detailList = outOfRange
      .slice(0, 4)
      .map((m) => {
        const below = m.value < m.thresholdMin;
        const diff = below
          ? ((m.thresholdMin - m.value) / m.thresholdMin * 100).toFixed(1)
          : ((m.value - m.thresholdMax) / m.thresholdMax * 100).toFixed(1);
        const direction = below ? "低于下限" : "超过上限";
        return `${m.name}（${m.value}${m.unit}，${direction}${diff}%）`;
      })
      .join("、");
    const consequence = outOfRange.length >= 5
      ? "此情况下引物几乎无法正常工作，扩增出的产物大概率为非目标片段或引物二聚体，qPCR定量结果完全不可信。"
      : "这些问题会导致扩增效率下降、熔解曲线出现杂峰，最终影响定量数据的可靠性。";
    return [
      {
        icon: <AlertTriangle className="w-7 h-7 text-white" />,
        iconBg: "bg-red-500",
        title: `6项指标中${outOfRange.length}项严重越界`,
        detail: `问题指标：${detailList}。${consequence}`,
        severity: "critical" as const,
      },
    ];
  }

  if (boundary.length >= 2) {
    const detailList = boundary
      .slice(0, 4)
      .map((m) => `${m.name}（${m.value}${m.unit}，偏差${m.deviationPercent}%）`)
      .join("、");
    return [
      {
        icon: <AlertCircle className="w-7 h-7 text-white" />,
        iconBg: "bg-amber-500",
        title: `${boundary.length}项指标处于阈值边缘`,
        detail: `触边指标：${detailList}。这些指标虽然未越界，但已接近安全区间边界，在实际PCR反应中，轻微的温度波动或试剂差异就可能导致结果异常。建议通过梯度PCR或熔解曲线实验验证。`,
        severity: "warning" as const,
      },
    ];
  }

  return [
    {
      icon: <CheckCircle className="w-7 h-7 text-white" />,
      iconBg: "bg-teal-500",
      title: "全部6项指标均在安全范围内",
      detail: `GC含量、熔解温度、二聚体评分、特异性评分、产物长度、跨内含子评分均落在实验室验证的最佳区间内。这意味着引物在标准qPCR程序下应该能高效、特异地扩增目标片段。`,
      severity: "success" as const,
    },
  ];
}

function buildPcaReason(sample: PrimerSample): ReasonItem | null {
  const sigma = sample.batchEffect.sigmaDistance;
  if (sample.status === SampleStatus.NORMAL) {
    return {
      icon: <BarChart3 className="w-7 h-7 text-white" />,
      iconBg: "bg-teal-500",
      title: `PCA聚类分析正常（${sigma.toFixed(1)}σ）`,
      detail: `PCA（主成分分析）用于检查本批次所有样本的整体相似性。统计学中通常以3σ作为离群判定线：0-1.5σ说明与同批次其他样本高度一致，1.5-3σ需关注，超过3σ则视为明显离群。本样本距离批次中心仅${sigma.toFixed(1)}σ，说明本次采样操作规范，无批次效应。`,
      severity: "success" as const,
    };
  }
  if (sigma > 3) {
    return {
      icon: <BarChart3 className="w-7 h-7 text-white" />,
      iconBg: "bg-red-500",
      title: `PCA聚类明显离群（${sigma.toFixed(1)}σ）`,
      detail: `PCA（主成分分析）是一种降维算法，可直观展示样本间的整体相似程度。统计学上，±3σ区间涵盖了99.7%的正常数据。本样本偏离批次中心${sigma.toFixed(1)}σ，远超过3σ警戒线，说明这管样本与同批次其他样本存在系统性差异——可能是采样时引入的污染、操作失误、或样本本身异常。`,
      severity: "critical" as const,
    };
  }
  if (sigma > 1.5) {
    return {
      icon: <BarChart3 className="w-7 h-7 text-white" />,
      iconBg: "bg-amber-500",
      title: `PCA聚类接近边界（${sigma.toFixed(1)}σ）`,
      detail: `PCA聚类距离批次中心${sigma.toFixed(1)}σ，介于1.5-3σ的观察区间内。这不一定意味着样本有问题，但提示需要结合其他指标和实验验证综合判断，不可直接放行。`,
      severity: "warning" as const,
    };
  }
  return null;
}

function buildLocationReason(sample: PrimerSample): ReasonItem | null {
  if (sample.status === SampleStatus.ABNORMAL && sample.location.includes("C-2")) {
    return {
      icon: <History className="w-7 h-7 text-white" />,
      iconBg: "bg-red-500",
      title: `${sample.location}存在历史环境污染记录`,
      detail: `系统回溯发现，采样位置${sample.location}在过去30天内已出现3次类似异常（GC含量偏低、产物长度异常）。经动物房管理员核实，该笼架6月8日更换垫料后曾出现同窝小鼠皮毛不洁记录，高度怀疑存在环境微生物污染。这意味着你采集到的"组织样本"中很可能混有环境中的细菌或真菌核酸，导致引物检测到的并非目标基因。`,
      severity: "critical" as const,
    };
  }
  if (sample.status === SampleStatus.BORDERLINE && sample.location.includes("B-1")) {
    return {
      icon: <MapPin className="w-7 h-7 text-white" />,
      iconBg: "bg-amber-500",
      title: `${sample.location}需关注近期环境记录`,
      detail: `采样位置${sample.location}近期温湿度记录仪显示有1次温度波动超过2℃（6月10日凌晨），虽然不能直接认定为异常原因，但建议在复核时一并考虑该因素。`,
      severity: "warning" as const,
    };
  }
  return {
    icon: <MapPin className="w-7 h-7 text-white" />,
    iconBg: "bg-primary-500",
    title: `${sample.location}采样地环境记录正常`,
    detail: `系统回溯了采样位置${sample.location}的温湿度记录、垫料更换记录和历史异常情况，均未发现异常。采样环境不是导致本次结果的可疑因素。`,
    severity: "info" as const,
  };
}

export default function BlockReasonCard({ sample }: BlockReasonCardProps) {
  const reasons: ReasonItem[] = [];

  buildMetricReasons(sample.metrics).forEach((r) => reasons.push(r));
  const pcaReason = buildPcaReason(sample);
  if (pcaReason) reasons.push(pcaReason);
  const locationReason = buildLocationReason(sample);
  if (locationReason) reasons.push(locationReason);

  const isBlocked = sample.status !== SampleStatus.NORMAL;
  const headerBg = isBlocked
    ? sample.status === SampleStatus.ABNORMAL
      ? "bg-gradient-to-r from-red-600 to-red-700"
      : "bg-gradient-to-r from-amber-500 to-amber-600"
    : "bg-gradient-to-r from-teal-600 to-teal-700";

  return (
    <div className="bg-white rounded-xl border border-primary-200 shadow-card overflow-hidden print:shadow-none print:border-2 print:rounded-lg">
      <div className={`${headerBg} px-6 py-4 print:px-5 print:py-3`}>
        <div className="flex items-center gap-3">
          {isBlocked ? (
            <AlertTriangle className="w-6 h-6 text-white print:w-5 print:h-5" />
          ) : (
            <CheckCircle className="w-6 h-6 text-white print:w-5 print:h-5" />
          )}
          <h2 className="text-xl font-bold text-white tracking-wide print:text-lg">
            {isBlocked ? "为什么本批次被系统拦下" : "为什么本批次被系统放行"}
          </h2>
        </div>
        <p className="mt-1.5 text-sm text-white/90 print:text-xs">
          {isBlocked
            ? "以下系统判定依据，请逐条阅读，明白问题所在再联系管理员"
            : "所有检查项均通过，可放心进入后续实验环节"}
        </p>
      </div>

      <div className="p-6 space-y-5 print:p-5 print:space-y-4">
        {reasons.map((reason, idx) => {
          const borderClass = {
            critical: "border-red-200 bg-red-50/50",
            warning: "border-amber-200 bg-amber-50/50",
            info: "border-primary-200 bg-primary-50/50",
            success: "border-teal-200 bg-teal-50/50",
          }[reason.severity];

          const numBg = {
            critical: "bg-red-600",
            warning: "bg-amber-600",
            info: "bg-primary-600",
            success: "bg-teal-600",
          }[reason.severity];

          return (
            <div
              key={idx}
              className={`flex gap-4 p-4 rounded-lg border-2 ${borderClass} print:gap-3 print:p-3`}
            >
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full ${numBg} flex items-center justify-center text-white font-bold text-base shadow-md print:w-8 print:h-8 print:text-sm`}
                >
                  {idx + 1}
                </div>
                <div
                  className={`w-12 h-12 rounded-xl ${reason.iconBg} flex items-center justify-center shadow-sm print:w-10 print:h-10`}
                >
                  {reason.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-lg font-bold text-primary-900 leading-snug mb-2 print:text-base">
                  {reason.title}
                </h3>
                <p className="text-sm text-primary-700 leading-relaxed whitespace-pre-line print:text-xs">
                  {reason.detail}
                </p>
              </div>
            </div>
          );
        })}

        <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-primary-50 border border-primary-200 print:p-2.5">
          <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5 print:w-4 print:h-4" />
          <p className="text-xs text-primary-700 leading-relaxed print:text-[10px]">
            <span className="font-semibold">学生须知：</span>
            系统判定基于实验室累计上万条样本数据训练的阈值模型。如对判定有疑问，
            <strong>请不要自行修改或废弃报告</strong>，携带本报告与管理员沟通复核。
            所有判定历史均已自动记入样本履历，用于持续优化阈值。
          </p>
        </div>
      </div>
    </div>
  );
}
