import type { NewsEvent } from "@/types";

export const NEWS_EVENTS: Omit<NewsEvent, "roundId">[] = [
  {
    eventId: "E01",
    title: "科技板块估值回调",
    description:
      "监管层收紧互联网平台反垄断执法，科技龙头估值承压，整个科技板块面临5%以上回调压力。数字经济的短期不确定性显著上升。",
    affectedIndustries: ["科技"],
    impactRate: 0.05,
  },
  {
    eventId: "E02",
    title: "新能源补贴政策退坡",
    description:
      "财政部宣布新能源汽车购置补贴将于年底终止，新能源产业链企业盈利预期下调，能源板块短期承压，影响波及混合型基金中能源敞口。",
    affectedIndustries: ["能源"],
    impactRate: 0.07,
  },
  {
    eventId: "E03",
    title: "医药集采扩围",
    description:
      "第七批国家集采落地，覆盖品种从化药扩展到生物类似药，医药板块创新药企利润率压缩，市场对医药行业短期前景转悲观。",
    affectedIndustries: ["医药"],
    impactRate: 0.06,
  },
  {
    eventId: "E04",
    title: "消费复苏不及预期",
    description:
      "社零数据连续两月低于预期，居民消费信心指数回落，消费板块龙头财报不及预期，消费类基金面临赎回压力。",
    affectedIndustries: ["消费"],
    impactRate: 0.04,
  },
  {
    eventId: "E05",
    title: "全球风险资产抛售",
    description:
      "美联储超预期加息75个基点，全球风险资产遭遇抛售潮，A股受外资流出影响，科技和消费板块跌幅居前，债券型基金成为避风港。",
    affectedIndustries: ["科技", "消费"],
    impactRate: 0.08,
  },
  {
    eventId: "E06",
    title: "金融监管风暴",
    description:
      "银保监会发布新规收紧银行理财资金入市通道，金融板块短期承压，银行和保险股回调明显，金融类混合型基金净值波动加大。",
    affectedIndustries: ["金融"],
    impactRate: 0.05,
  },
  {
    eventId: "E07",
    title: "芯片供应链危机",
    description:
      "地缘冲突升级导致关键芯片供应中断，科技板块深度回调，数字经济主题基金损失惨重，市场恐慌情绪蔓延至消费和能源板块。",
    affectedIndustries: ["科技", "消费", "能源"],
    impactRate: 0.1,
  },
  {
    eventId: "E08",
    title: "债市信用事件",
    description:
      "大型房企违约事件引发债市信用利差走阔，债券基金净值短期回撤，部分低评级债券型基金面临赎回压力，避险资金涌入利率债。",
    affectedIndustries: ["债券"],
    impactRate: 0.03,
  },
];

export const TOTAL_ROUNDS = 6;
