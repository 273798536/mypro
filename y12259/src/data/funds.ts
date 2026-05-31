import type { FundCard } from "@/types";

export const INITIAL_FUNDS: FundCard[] = [
  {
    fundId: "F001",
    name: "华远科技成长",
    industry: "科技",
    fundType: "股票型",
    feeRate: 0.015,
    navHistory: [1.0, 1.05, 1.12, 1.08, 1.15, 1.22],
  },
  {
    fundId: "F002",
    name: "国泰医药健康",
    industry: "医药",
    fundType: "股票型",
    feeRate: 0.012,
    navHistory: [1.0, 1.03, 1.07, 1.04, 1.09, 1.11],
  },
  {
    fundId: "F003",
    name: "嘉实新能源",
    industry: "能源",
    fundType: "股票型",
    feeRate: 0.015,
    navHistory: [1.0, 0.98, 1.02, 0.95, 1.01, 1.06],
  },
  {
    fundId: "F004",
    name: "博时消费优选",
    industry: "消费",
    fundType: "混合型",
    feeRate: 0.01,
    navHistory: [1.0, 1.02, 1.05, 1.01, 1.06, 1.08],
  },
  {
    fundId: "F005",
    name: "南方稳健配置",
    industry: "金融",
    fundType: "混合型",
    feeRate: 0.008,
    navHistory: [1.0, 1.01, 1.03, 1.0, 1.04, 1.05],
  },
  {
    fundId: "F006",
    name: "易方达安心债",
    industry: "债券",
    fundType: "债券型",
    feeRate: 0.003,
    navHistory: [1.0, 1.005, 1.01, 1.008, 1.015, 1.02],
  },
  {
    fundId: "F007",
    name: "广发聚利债券",
    industry: "债券",
    fundType: "债券型",
    feeRate: 0.004,
    navHistory: [1.0, 1.003, 1.008, 1.005, 1.012, 1.016],
  },
  {
    fundId: "F008",
    name: "银华数字经济",
    industry: "科技",
    fundType: "股票型",
    feeRate: 0.015,
    navHistory: [1.0, 1.08, 1.15, 1.1, 1.18, 1.25],
  },
];

export const INITIAL_CASH = 100000;
