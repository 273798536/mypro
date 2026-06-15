import { calculate, type CalcResult } from "./calcEngine.js";
import { scenarios, type GateStrategyPoint } from "../data/scenarios.js";

interface Segment {
  startTime: string;
  endTime: string;
  label: string;
  recommendation: string;
  energy: number;
  avgPower: number;
  events: Array<{ time: string; type: string; description: string }>;
}

interface Report {
  summary: {
    totalEnergy: number;
    peakPower: number;
    averageEfficiency: number;
    totalWaterDiscarded: number;
    alertCount: { info: number; warning: number; danger: number; shutdown: number };
  };
  segments: Segment[];
  teachingNotes: Array<{ title: string; content: string }>;
  strategyLabel: string;
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
}

export function generate(
  scenarioId: string,
  strategy: string,
  customGates?: GateStrategyPoint[],
  timezone?: string
): Report | null {
  const scenario = scenarios[scenarioId];
  if (!scenario) return null;

  const result: CalcResult | null = calculate(
    scenarioId,
    strategy as "correct" | "wrong" | "custom",
    customGates,
    timezone
  );
  if (!result) return null;

  const timeline = result.timeline;
  const segments: Segment[] = [];
  const alertCount = { info: 0, warning: 0, danger: 0, shutdown: 0 };

  for (const a of result.alerts) {
    if (a.level === "info") alertCount.info++;
    else if (a.level === "warning") alertCount.warning++;
    else if (a.level === "danger") alertCount.danger++;
    else if (a.level === "shutdown") alertCount.shutdown++;
  }

  let i = 0;
  while (i < timeline.length) {
    let j = i;
    const phase = timeline[i].phase;
    while (j < timeline.length && timeline[j].phase === phase) j++;

    const slice = timeline.slice(i, j);
    const energy = slice.length > 0 ? slice[slice.length - 1].energy - (i > 0 ? timeline[i - 1].energy : 0) : 0;
    const powers = slice.map((p) => p.power);
    const avgPower = powers.length > 0 ? powers.reduce((s, x) => s + x, 0) / powers.length : 0;

    const events: Segment["events"] = [];
    for (const p of slice) {
      for (const a of p.alerts) {
        events.push({ time: p.time, type: a.level, description: a.message });
      }
    }

    let label = "待机时段";
    let recommendation = "水头差不足或闸门开度偏低，建议等待潮汐转向。";

    if (phase === "generating") {
      label = "最佳发电时段";
      recommendation = "落潮期间水头差大、效率高，应保持闸门全开。此时段是潮汐电站的核心产能窗口，应尽量避免停机。";
    } else if (phase === "storing") {
      label = "蓄水时段";
      recommendation = "涨潮期间关闭闸门，让海水随潮汐进入水库蓄能。这是为下次落潮发电做准备，切勿开闸！";
    } else if (phase === "discarding") {
      label = "弃水时段（错误操作）";
      recommendation = "涨潮期打开闸门导致海水直接泄出，势能未被利用。应立即关闭闸门，恢复蓄水策略。";
    }

    segments.push({
      startTime: slice[0].time,
      endTime: slice[slice.length - 1].time,
      label,
      recommendation,
      energy: Math.round(energy * 100) / 100,
      avgPower: Math.round(avgPower * 100) / 100,
      events,
    });

    i = j;
  }

  let strategyLabel = "自定义策略";
  if (strategy === "correct") strategyLabel = "正确策略：落潮开闸发电";
  if (strategy === "wrong") strategyLabel = "错误策略：涨潮开闸（常见误解）";

  const teachingNotes = [
    {
      title: "核心原理：为什么落潮开闸才发电？",
      content: `潮汐发电的本质是利用"水头差"——水库水位和大海水位的高度差来推动水轮机。涨潮时，大海水位不断升高，我们关闸让海水随潮汐同步进入水库，这是"蓄水蓄能"。等到高潮后，大海水位开始下降（落潮），此时水库水位高于大海，打开闸门，水从水库流向大海就会推动水轮机发电。如果涨潮时开闸，水库水位和大海始终齐平，永远没有水头差，当然就发不了电！`,
    },
    {
      title: "一节课读懂潮汐周期",
      content: `半日潮约12.42小时一个周期——一节课45分钟刚好可以演示完一整个涨落潮过程。观察曲线：两个高潮、两个低潮，中间各有一次平潮（转流）。平潮期水头差很小，无论开关闸门意义都不大，是休息或讲解理论的好时机。`,
    },
    {
      title: "关于时区的坑",
      content: `潮汐表通常有两种时间标注：UTC（世界时）或当地时间。东八区（上海、北京）比UTC早8小时。如果潮汐表上写的是"UTC 00:00 高潮"，换算到上海是上午8点。直接按UTC时间使用，会把"半夜高潮"误认为"白天高潮"，闸门策略就全错了。本演示特意内置了时区切换功能，请同学们对比切换时区后的曲线位置差异！`,
    },
    {
      title: "机组保护不是故障，是守护",
      content: `发电演示中出现停机保护并不意味着"失败"——恰恰相反，它反映了真实电站的安全设计。过温保护提示我们：满负荷运行不能持续太久。振动警告提醒我们：水头过低时强开闸门会损伤水轮机。这些保护机制是潮汐电站能够数十年稳定运行的关键。`,
    },
    {
      title: "发电量对比实验",
      content: `对比"正确策略"和"错误策略"的发电量：错误策略通常只能获得正确策略10%-30%的发电量，还会产生大量弃水。这直观地说明：闸门策略的正确性决定了潮汐电站的经济效益——"涨潮开闸"看似直觉合理，实则违背物理规律！`,
    },
  ];

  const totalWaterDiscarded = result.waterDiscarded.reduce((s, w) => s + w.volume, 0);

  return {
    summary: {
      totalEnergy: result.totalEnergy,
      peakPower: result.peakPower,
      averageEfficiency: result.averageEfficiency,
      totalWaterDiscarded: Math.round(totalWaterDiscarded),
      alertCount,
    },
    segments,
    teachingNotes,
    strategyLabel,
  };
}
