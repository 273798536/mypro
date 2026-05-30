import type { Level, Order, QuotaLimit, RiskJudgment } from "../types";

const level1Orders: Order[] = [
  {
    id: "ORD-101",
    clientName: "华通贸易",
    currencyPair: "EUR/USD",
    direction: "买入",
    amount: 500000,
    price: 1.0856,
    stopLoss: null,
    remark: "Q3套保",
    missingFields: [],
    duplicateOf: null,
    modifiedFrom: null,
  },
  {
    id: "ORD-102",
    clientName: "远东实业",
    currencyPair: "USD/JPY",
    direction: "卖出",
    amount: 300000,
    price: 149.25,
    stopLoss: null,
    remark: "",
    missingFields: ["stopLoss"],
    duplicateOf: null,
    modifiedFrom: null,
  },
  {
    id: "ORD-103",
    clientName: "星辰集团",
    currencyPair: "GBP/USD",
    direction: "买入",
    amount: null,
    price: 1.2634,
    stopLoss: 1.258,
    remark: "即期",
    missingFields: ["amount"],
    duplicateOf: null,
    modifiedFrom: null,
  },
];

const level1Quotas: QuotaLimit[] = [
  { currencyPair: "EUR/USD", totalLimit: 1000000, usedAmount: 200000, isLocked: false, lockedAt: null, lockReason: "" },
  { currencyPair: "USD/JPY", totalLimit: 800000, usedAmount: 100000, isLocked: false, lockedAt: null, lockReason: "" },
  { currencyPair: "GBP/USD", totalLimit: 600000, usedAmount: 100000, isLocked: false, lockedAt: null, lockReason: "" },
];

const level1ExpectedRisks: RiskJudgment[] = [
  { orderId: "ORD-102", riskType: "missing_stoploss", userMarked: false, isCorrect: false, correctionSuggestion: "建议设置止损位 150.50（基于USD/JPY近期波动率计算，约1个标准差）" },
  { orderId: "ORD-103", riskType: "missing_field", userMarked: false, isCorrect: false, correctionSuggestion: "建议补全字段：金额（amount）" },
];

const level2Orders: Order[] = [
  {
    id: "ORD-201",
    clientName: "华通贸易",
    currencyPair: "EUR/USD",
    direction: "买入",
    amount: 600000,
    price: 1.0856,
    stopLoss: null,
    remark: "紧急追加",
    missingFields: ["stopLoss"],
    duplicateOf: null,
    modifiedFrom: null,
  },
  {
    id: "ORD-202",
    clientName: "远东实业",
    currencyPair: "EUR/USD",
    direction: "买入",
    amount: 400000,
    price: 1.086,
    stopLoss: null,
    remark: "",
    missingFields: [],
    duplicateOf: null,
    modifiedFrom: null,
  },
  {
    id: "ORD-203",
    clientName: "星辰集团",
    currencyPair: "USD/JPY",
    direction: "卖出",
    amount: 500000,
    price: 149.25,
    stopLoss: null,
    remark: "季度对冲",
    missingFields: [],
    duplicateOf: null,
    modifiedFrom: null,
  },
  {
    id: "ORD-204",
    clientName: "明辉投资",
    currencyPair: "GBP/USD",
    direction: "买入",
    amount: 450000,
    price: 1.2634,
    stopLoss: null,
    remark: "",
    missingFields: ["stopLoss"],
    duplicateOf: null,
    modifiedFrom: null,
  },
  {
    id: "ORD-205",
    clientName: "星辰集团",
    currencyPair: "USD/JPY",
    direction: "卖出",
    amount: 500000,
    price: 149.25,
    stopLoss: null,
    remark: "重报",
    missingFields: [],
    duplicateOf: "ORD-203",
    modifiedFrom: null,
  },
];

const level2Quotas: QuotaLimit[] = [
  { currencyPair: "EUR/USD", totalLimit: 800000, usedAmount: 350000, isLocked: false, lockedAt: null, lockReason: "" },
  { currencyPair: "USD/JPY", totalLimit: 700000, usedAmount: 400000, isLocked: false, lockedAt: null, lockReason: "" },
  { currencyPair: "GBP/USD", totalLimit: 500000, usedAmount: 200000, isLocked: false, lockedAt: null, lockReason: "" },
];

const level2ExpectedRisks: RiskJudgment[] = [
  {
    orderId: "ORD-201",
    riskType: "quota_overrun",
    userMarked: false,
    isCorrect: false,
    correctionSuggestion: "EUR/USD已用 350000 + 新增 600000 = 950000，超限 150000。明确结论：额度超限。建议追加额度或拆单为两笔 300000",
  },
  {
    orderId: "ORD-201",
    riskType: "missing_stoploss",
    userMarked: false,
    isCorrect: false,
    correctionSuggestion: "建议设置止损位 1.0800（基于EUR/USD近期波动率计算，约1个标准差）",
  },
  {
    orderId: "ORD-202",
    riskType: "quota_overrun",
    userMarked: false,
    isCorrect: false,
    correctionSuggestion: "EUR/USD已用 350000 + ORD-201(600000) + ORD-202(400000) = 1350000，超限 550000。明确结论：额度超限。建议追加额度或撤销部分订单",
  },
  {
    orderId: "ORD-204",
    riskType: "missing_stoploss",
    userMarked: false,
    isCorrect: false,
    correctionSuggestion: "建议设置止损位 1.2580（基于GBP/USD近期波动率计算，约1个标准差）",
  },
  {
    orderId: "ORD-205",
    riskType: "duplicate_order",
    userMarked: false,
    isCorrect: false,
    correctionSuggestion: "ORD-205 与 ORD-203 为重复下单（客户、货币对、方向、金额、价格均相同）。建议撤销重复订单 ORD-205，保留原始订单 ORD-203",
  },
];

export const levels: Level[] = [
  {
    id: "1",
    name: "基础验核",
    description: "3笔订单，含1笔缺字段订单、1笔止损漏设。额度正常，训练审单和止损检查基本功。",
    orders: level1Orders,
    quotas: level1Quotas,
    quotaLoadDelay: 0,
    expectedRisks: level1ExpectedRisks,
  },
  {
    id: "2",
    name: "额度风暴",
    description: "5笔订单，含重复下单、2笔额度超限、1笔止损漏设。额度条延迟加载，重复下单与超限夹在一起。",
    orders: level2Orders,
    quotas: level2Quotas,
    quotaLoadDelay: 3000,
    expectedRisks: level2ExpectedRisks,
  },
];
