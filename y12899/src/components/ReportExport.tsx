import { Printer, Download, FileText, AlertTriangle, MapPin, Ban, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  BatchInfo,
  BuoyData,
  ViolationRecord,
  WaterQualityRecord,
  FarmLog,
  Anomaly,
  ReviewRound,
  HarvestEstimate,
} from '../types';
import { calculateHarvestEstimate, formulaInfo } from '../utils/calculations';

interface ReportExportProps {
  batchInfo: BatchInfo;
  buoyDataList: BuoyData[];
  violations: ViolationRecord[];
  waterQuality: WaterQualityRecord[];
  farmLogs: FarmLog[];
  anomalies: Anomaly[];
  reviewRounds: ReviewRound[];
  className?: string;
}

export function ReportExport({
  batchInfo,
  buoyDataList,
  violations,
  waterQuality,
  farmLogs,
  anomalies,
  reviewRounds,
  className,
}: ReportExportProps) {
  const latestReview = reviewRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
  const tideRange = latestReview
    ? latestReview.tideData.highTideHeight - latestReview.tideData.lowTideHeight
    : 3.4;
  const windSpeed = latestReview ? latestReview.weatherData.windSpeed : 4.5;

  const estimate = calculateHarvestEstimate(
    batchInfo.area,
    buoyDataList,
    waterQuality,
    violations.length > 0,
    tideRange,
    windSpeed
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    const markdown = generateMarkdownReport();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `海藻养殖收成估算报告_${batchInfo.name}_${batchInfo.date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdownReport = (): string => {
    return `# 海藻养殖收成估算报告

## 基本信息

- **批次名称**：${batchInfo.name}
- **估算日期**：${batchInfo.date}
- **养殖面积**：${batchInfo.area} 亩
- **养殖地点**：${batchInfo.location}
- **报告生成时间**：${new Date().toLocaleString('zh-CN')}

---

## 一、收成估算结果

**估算产量：${estimate.estimatedYield.toLocaleString()} ${estimate.unit}（约 ${(estimate.estimatedYield / 1000).toFixed(2)} 吨）**

**置信度：${estimate.confidence}%**

### 计算公式

${formulaInfo.formula}

### 计算过程

| 参数 | 数值 | 单位 |
|------|------|------|
| 养殖面积 | ${estimate.breakdown.area} | 亩 |
| 单位面积生物量 | ${estimate.breakdown.biomassPerUnit} | kg/亩 |
| 成活率 | ${estimate.breakdown.survivalRate} | % |
| 校正系数 | ${(estimate.breakdown.correctionFactor / 100).toFixed(4)} | - |

### 适用范围

${formulaInfo.scope}

---

## 二、浮标监测数据

共 ${buoyDataList.length} 条有效监测记录

### 数据平均值

| 指标 | 数值 | 单位 |
|------|------|------|
| 水温 | ${(buoyDataList.reduce((a, b) => a + b.temperature, 0) / buoyDataList.length).toFixed(1)} | °C |
| 盐度 | ${(buoyDataList.reduce((a, b) => a + b.salinity, 0) / buoyDataList.length).toFixed(1)} | psu |
| 溶解氧 | ${(buoyDataList.reduce((a, b) => a + b.dissolvedOxygen, 0) / buoyDataList.length).toFixed(1)} | mg/L |
| pH值 | ${(buoyDataList.reduce((a, b) => a + b.pH, 0) / buoyDataList.length).toFixed(2)} | - |
| 叶绿素a | ${(buoyDataList.reduce((a, b) => a + b.chlorophyll, 0) / buoyDataList.length).toFixed(1)} | μg/L |
| 浊度 | ${(buoyDataList.reduce((a, b) => a + b.turbidity, 0) / buoyDataList.length).toFixed(1)} | NTU |

---

## 三、禁航区越界检测与轨迹拦截

**检测结果：${violations.length > 0 ? '发现越界记录' : '无越界'}**

${violations.length > 0 ? `
### 越界记录详情

共检测到 ${violations.length} 条越界记录，其中已拦截 ${violations.filter(v => v.intercepted).length} 条。

${violations.map(v => `
#### ${v.zoneName} 越界事件

- **发生时间**：${new Date(v.point.timestamp).toLocaleString('zh-CN')}
- **位置坐标**：${v.point.location.lat.toFixed(4)}, ${v.point.location.lng.toFixed(4)}
- **漂移原因**：${v.driftReason}
- **是否拦截**：${v.intercepted ? '是' : '否'}
- **拦截说明**：${v.interceptionNote}

> **重要说明**：该时段数据已从收成估算中排除，原因是浮标漂移进入禁航区，数据不具备代表性。如后续核实浮标状态正常，可考虑调整估算口径重新计算。
`).join('')}
` : '所有浮标数据点均在允许范围内，未检测到禁航区越界。'}

---

## 四、水质评估

${waterQuality.map(w => `
### ${w.index}

- **检测值**：${w.value} ${w.unit}
- **标准值**：${w.standard} ${w.unit}
- **状态**：${w.level === 'normal' ? '正常' : w.level === 'warning' ? '预警' : '异常'}

${w.reviewNotes.length > 0 ? `
#### 复核记录

${w.reviewNotes.map(n => `
- **${n.isSupplement ? '【补录】' : ''}${n.reviewer}** (${new Date(n.timestamp).toLocaleString('zh-CN')})
  ${n.content}
  *来源：${n.source}*
`).join('')}
` : ''}
`).join('')}

---

## 五、养殖日志

共 ${farmLogs.length} 条日志记录

${farmLogs.map(log => `
### ${new Date(log.date).toLocaleDateString('zh-CN')}

${log.isDelayed ? `⚠️ **日志延迟提交 ${log.delayedDays} 天**，影响以下结论：${log.affectedConclusions.join(', ')}\n\n` : ''}
${log.content}

${log.previousVersion ? `
> 历史版本：${log.previousVersion}
` : ''}
`).join('')}

---

## 六、异常处理情况

${anomalies.length > 0 ? `
### 需补充材料

${anomalies.filter(a => a.category === 'supplement_material').map(a => `
- **${a.title}**
  ${a.description}
  *下一步：${a.nextAction}*
`).join('')}

### 需调整口径

${anomalies.filter(a => a.category === 'adjust_caliber').map(a => `
- **${a.title}**
  ${a.description}
  *下一步：${a.nextAction}*
`).join('')}
` : '无异常记录'}

---

## 七、复核流程

共 ${reviewRounds.length} 轮复核

${reviewRounds.sort((a, b) => a.roundNumber - b.roundNumber).map(r => `
### 第 ${r.roundNumber} 轮复核（${r.status === 'completed' ? '已完成' : r.status === 'in_progress' ? '进行中' : '待复核'}）

**复核人**：${r.reviewer}
**时间**：${new Date(r.timestamp).toLocaleString('zh-CN')}
**备注**：${r.notes}

#### 潮汐数据
- 日期：${r.tideData.date}
- 高潮：${r.tideData.highTideTime} / ${r.tideData.highTideHeight}m
- 低潮：${r.tideData.lowTideTime} / ${r.tideData.lowTideHeight}m
- 来源：${r.tideData.source}

#### 气象数据
- 日期：${r.weatherData.date}
- 气温：${r.weatherData.temperature.min}-${r.weatherData.temperature.max}°C
- 风速：${r.weatherData.windSpeed} m/s
- 风向：${r.weatherData.windDirection}
- 降水：${r.weatherData.precipitation} mm
- 来源：${r.weatherData.source}

#### 禁航区检测
- 数据点总数：${r.noSailCheck.totalPoints}
- 越界数量：${r.noSailCheck.violationCount}
- 检测状态：${r.noSailCheck.status === 'pass' ? '通过' : r.noSailCheck.status === 'warning' ? '有警告' : '未通过'}

`).join('')}

---

*本报告由海藻养殖收成估算工具自动生成，所有计算过程可追溯。*
`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText size={24} className="text-sky-600" />
          报告导出
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 flex items-center gap-2"
          >
            <Printer size={16} />
            打印报告
          </button>
          <button
            onClick={handleExportMarkdown}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 flex items-center gap-2"
          >
            <Download size={16} />
            导出 Markdown
          </button>
        </div>
      </div>

      <div className="print:shadow-none shadow-lg rounded-xl bg-white border border-slate-200 p-8 print:p-0 print:border-none">
        <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
          <h1 className="text-3xl font-bold text-slate-800">海藻养殖收成估算报告</h1>
          <div className="mt-3 flex items-center justify-center gap-6 text-sm text-slate-500">
            <span>批次：{batchInfo.name}</span>
            <span>日期：{batchInfo.date}</span>
            <span>地点：{batchInfo.location}</span>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-500" />
            一、收成估算结果
          </h2>
          <div className="bg-gradient-to-r from-sky-50 to-cyan-50 rounded-lg p-6 border border-sky-200">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">估算产量</p>
              <p className="text-4xl font-bold text-slate-800">
                {estimate.estimatedYield.toLocaleString()}
                <span className="text-lg font-normal text-slate-500 ml-2">{estimate.unit}</span>
              </p>
              <p className="text-slate-400 mt-1">约 {(estimate.estimatedYield / 1000).toFixed(2)} 吨</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full">
                <span className="text-sm text-slate-500">置信度</span>
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full"
                    style={{ width: `${estimate.confidence}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700">{estimate.confidence}%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="font-mono text-center text-slate-700">{formulaInfo.formula}</p>
            <div className="mt-3 grid grid-cols-4 gap-4 text-center text-sm">
              <div className="p-2 bg-white rounded">
                <p className="text-slate-500">养殖面积</p>
                <p className="font-bold text-slate-800">{estimate.breakdown.area} 亩</p>
              </div>
              <div className="p-2 bg-white rounded">
                <p className="text-slate-500">单位面积生物量</p>
                <p className="font-bold text-slate-800">{estimate.breakdown.biomassPerUnit} kg/亩</p>
              </div>
              <div className="p-2 bg-white rounded">
                <p className="text-slate-500">成活率</p>
                <p className="font-bold text-slate-800">{estimate.breakdown.survivalRate}%</p>
              </div>
              <div className="p-2 bg-white rounded">
                <p className="text-slate-500">校正系数</p>
                <p className="font-bold text-slate-800">{(estimate.breakdown.correctionFactor / 100).toFixed(4)}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2">
            <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">适用范围</p>
              <p className="text-sm text-amber-700">{formulaInfo.scope}</p>
            </div>
          </div>
        </section>

        {violations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Ban size={20} className="text-rose-500" />
              三、轨迹漂移拦截说明
            </h2>
            <div className="bg-rose-50 rounded-lg border border-rose-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-rose-800">检测到 {violations.length} 条禁航区越界记录</h3>
                  <p className="text-sm text-rose-700 mt-1">
                    以下时段的数据已从收成估算中排除，原因是浮标漂移进入禁航区，数据不具备代表性。
                  </p>
                </div>
              </div>

              {violations.map((v, idx) => (
                <div key={v.id} className="mt-4 p-4 bg-white rounded-lg border border-rose-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-800 flex items-center gap-2">
                      <MapPin size={16} className="text-rose-500" />
                      越界事件 {idx + 1}：{v.zoneName}
                    </h4>
                    {v.intercepted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                        <Ban size={12} />
                        已拦截
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">发生时间：</span>
                      <span className="font-mono text-slate-700">
                        {new Date(v.point.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">位置坐标：</span>
                      <span className="font-mono text-slate-700">
                        {v.point.location.lat.toFixed(4)}, {v.point.location.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-1">漂移原因分析</p>
                    <p className="text-sm text-amber-700">{v.driftReason}</p>
                  </div>
                  <div className="mt-3 p-3 bg-rose-50 rounded border border-rose-200">
                    <p className="text-sm font-medium text-rose-800 mb-1">拦截说明</p>
                    <p className="text-sm text-rose-700">{v.interceptionNote}</p>
                  </div>
                </div>
              ))}

              <div className="mt-4 p-4 bg-slate-100 rounded-lg text-center">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">重要提示：</span>
                  如后续核实浮标状态正常，可考虑调整估算口径重新计算。
                  如需重新纳入这些数据，请在异常处理中选择"调整口径"操作。
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">七、统一复核记录</h2>
          {reviewRounds.sort((a, b) => a.roundNumber - b.roundNumber).map(r => (
            <div key={r.id} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-800">第 {r.roundNumber} 轮复核</h4>
                <span className="text-sm text-slate-500">
                  {r.reviewer} · {new Date(r.timestamp).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-cyan-50 rounded border border-cyan-200">
                  <p className="font-medium text-cyan-700 mb-1">潮汐数据</p>
                  <p className="text-cyan-600">潮差：{(r.tideData.highTideHeight - r.tideData.lowTideHeight).toFixed(1)}m</p>
                  <p className="text-xs text-cyan-500 mt-1">来源：{r.tideData.source}</p>
                </div>
                <div className="p-3 bg-sky-50 rounded border border-sky-200">
                  <p className="font-medium text-sky-700 mb-1">气象数据</p>
                  <p className="text-sky-600">
                    {r.weatherData.temperature.min}-{r.weatherData.temperature.max}°C · {r.weatherData.windSpeed}m/s
                  </p>
                  <p className="text-xs text-sky-500 mt-1">来源：{r.weatherData.source}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                  <p className="font-medium text-emerald-700 mb-1">禁航检测</p>
                  <p className="text-emerald-600">
                    {r.noSailCheck.totalPoints} 点 · 越界 {r.noSailCheck.violationCount} 次
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    状态：{r.noSailCheck.status === 'pass' ? '通过' : r.noSailCheck.status === 'warning' ? '警告' : '未通过'}
                  </p>
                </div>
              </div>
              {r.notes && (
                <p className="mt-3 text-sm text-slate-600 p-2 bg-white rounded">
                  <span className="font-medium">复核备注：</span>{r.notes}
                </p>
              )}
            </div>
          ))}
        </section>

        <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-400">
          <p>本报告由海藻养殖收成估算工具自动生成 · {new Date().toLocaleString('zh-CN')}</p>
          <p>所有计算过程可追溯，数据来源明确标注</p>
        </div>
      </div>
    </div>
  );
}
