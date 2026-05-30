import type { LevelConfig } from "@/types";

export const level1Config: LevelConfig = {
  id: "level-1",
  name: "\u987A\u5229\u5957\u4FDD",
  difficulty: 1,
  description: "\u6B63\u5E38\u5929\u6C14\uFF0C\u4EF7\u683C\u5C0F\u5E45\u6CE2\u52A8\uFF0C\u671F\u8D27\u7A7A\u5934\u5BF9\u51B2\u73B0\u8D27\u591A\u5934\u3002\u57FA\u672C\u5957\u4FDD\u539F\u7406\u7684\u5165\u95E8\u5173\u5361\u3002",
  keyKnowledge: "\u5957\u4FDD\u57FA\u672C\u539F\u7406\u3001\u57FA\u5DEE\u6982\u5FF5",
  maxTurns: 4,
  initialCash: 500000,
  crops: [
    {
      id: "corn-1",
      name: "\u7389\u7C73",
      acreage: 100,
      expectedYield: 60,

      unitPrice: 2800,
    },
  ],
  warehouse: {
    currentStock: 0,
    maxCapacity: 100,
    unitStorageCost: 5,
  },
  initialFutures: [
    {
      id: "f-corn-1",
      commodity: "\u7389\u7C73",
      direction: "\u7A7A\u5934",
      lots: 3,
      contractMultiplier: 10,
      openPrice: 2820,
      expiryTurn: 5,
    },
  ],
  initialSpotOrders: [
    {
      id: "s-corn-1",
      buyer: "\u7389\u7C73\u52A0\u5DE5\u5382A",
      commodity: "\u7389\u7C73",
      quantity: 30,
      agreedPrice: 2800,
      deliveryTurn: 4,
      isDefaulted: false,
      isDelivered: false,
      defaultRatio: 0,
    },
  ],
  weatherSchedule: [
    { turn: 1, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38\uFF0C\u4F5C\u7269\u7A33\u5B9A\u751F\u957F" },
    { turn: 2, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38\uFF0C\u65E0\u5F02\u5E38" },
    { turn: 3, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38\uFF0C\u4F5C\u7269\u8FDB\u5165\u6210\u719F\u671F" },
    { turn: 4, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38\uFF0C\u9002\u5408\u6536\u5272" },
  ],
  priceSchedule: {
    "\u7389\u7C73": { "1": 2800, "2": 2780, "3": 2810, "4": 2790 },
  },
  events: [],
};

export const level2Config: LevelConfig = {
  id: "level-2",
  name: "\u5408\u7EA6\u5230\u671F",
  difficulty: 2,
  description: "\u671F\u8D27\u5408\u7EA6\u5230\u671F\u65F6\u73B0\u8D27\u4EF7\u683C\u5927\u5E45\u504F\u79BB\uFF0C\u9700\u51B3\u5B9A\u5E73\u4ED3\u8FD8\u662F\u5B9E\u7269\u4EA4\u5272\u3002\u57FA\u5DEE\u98CE\u9669\u7684\u7ECF\u5178\u573A\u666F\u3002",
  keyKnowledge: "\u5408\u7EA6\u5230\u671F\u5904\u7406\u3001\u4EA4\u5272vs\u5E73\u4ED3\u9009\u62E9\u3001\u57FA\u5DEE\u98CE\u9669",
  maxTurns: 5,
  initialCash: 500000,
  crops: [
    {
      id: "soy-1",
      name: "\u5927\u8C46",
      acreage: 80,
      expectedYield: 40,

      unitPrice: 5200,
    },
  ],
  warehouse: {
    currentStock: 0,
    maxCapacity: 80,
    unitStorageCost: 8,
  },
  initialFutures: [
    {
      id: "f-soy-1",
      commodity: "\u5927\u8C46",
      direction: "\u7A7A\u5934",
      lots: 2,
      contractMultiplier: 10,
      openPrice: 5250,
      expiryTurn: 4,
    },
  ],
  initialSpotOrders: [
    {
      id: "s-soy-1",
      buyer: "\u8C46\u5236\u54C1\u5382B",
      commodity: "\u5927\u8C46",
      quantity: 20,
      agreedPrice: 5200,
      deliveryTurn: 5,
      isDefaulted: false,
      isDelivered: false,
      defaultRatio: 0,
    },
  ],
  weatherSchedule: [
    { turn: 1, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
    { turn: 2, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
    { turn: 3, type: "\u66B4\u96E8", yieldModifier: 0.8, description: "\u66B4\u96E8\u88AD\u51FB\uFF0C\u4EA7\u91CF\u9884\u8BA1\u4E0B\u964D20%" },
    { turn: 4, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6062\u590D\u6B63\u5E38" },
    { turn: 5, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38\uFF0C\u8FDB\u5165\u4EA4\u5272\u671F" },
  ],
  priceSchedule: {
    "\u5927\u8C46": { "1": 5200, "2": 5100, "3": 4900, "4": 4600, "5": 4650 },
  },
  events: [
    { turn: 4, type: "CONTRACT_EXPIRY", payload: { positionId: "f-soy-1" } },
    { turn: 3, type: "YIELD_ADJUST", payload: { cropId: "soy-1", modifier: 0.8 } },
  ],
};

export const level3Config: LevelConfig = {
  id: "level-3",
  name: "\u4ED3\u50A8\u7206\u4ED3 + \u73B0\u8D27\u8FDD\u7EA6",
  difficulty: 3,
  description: "\u4E30\u6536\u5BFC\u81F4\u4ED3\u50A8\u63A5\u8FD1\u6781\u9650\uFF0C\u540C\u65F6\u73B0\u8D27\u4E70\u65B9\u8FDD\u7EA6\u3002\u591A\u91CD\u538B\u529B\u4E0B\u7684\u5957\u4FDD\u51B3\u7B56\u8003\u9A8C\u3002",
  keyKnowledge: "\u4ED3\u50A8\u6210\u672C\u3001\u8FDD\u7EA6\u98CE\u9669\u3001\u591A\u91CD\u538B\u529B\u4E0B\u7684\u51B3\u7B56",
  maxTurns: 6,
  initialCash: 500000,
  crops: [
    {
      id: "corn-2",
      name: "\u7389\u7C73",
      acreage: 60,
      expectedYield: 36,

      unitPrice: 2800,
    },
    {
      id: "soy-2",
      name: "\u5927\u8C46",
      acreage: 40,
      expectedYield: 20,

      unitPrice: 5200,
    },
  ],
  warehouse: {
    currentStock: 0,
    maxCapacity: 50,
    unitStorageCost: 6,
  },
  initialFutures: [
    {
      id: "f-corn-2",
      commodity: "\u7389\u7C73",
      direction: "\u7A7A\u5934",
      lots: 3,
      contractMultiplier: 10,
      openPrice: 2820,
      expiryTurn: 7,
    },
    {
      id: "f-soy-2",
      commodity: "\u5927\u8C46",
      direction: "\u7A7A\u5934",
      lots: 2,
      contractMultiplier: 10,
      openPrice: 5250,
      expiryTurn: 7,
    },
  ],
  initialSpotOrders: [
    {
      id: "s-corn-2",
      buyer: "\u7389\u7C73\u52A0\u5DE5\u5382C",
      commodity: "\u7389\u7C73",
      quantity: 25,
      agreedPrice: 2800,
      deliveryTurn: 5,
      isDefaulted: false,
      isDelivered: false,
      defaultRatio: 0,
    },
    {
      id: "s-soy-2",
      buyer: "\u8C46\u5236\u54C1\u5382D",
      commodity: "\u5927\u8C46",
      quantity: 15,
      agreedPrice: 5200,
      deliveryTurn: 6,
      isDefaulted: false,
      isDelivered: false,
      defaultRatio: 0,
    },
  ],
  weatherSchedule: [
    { turn: 1, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
    { turn: 2, type: "\u597D\u5929\u6C14", yieldModifier: 1.3, description: "\u98CE\u8C03\u96E8\u987A\uFF0C\u4EA7\u91CF\u9884\u8BA1\u589E\u52A030%" },
    { turn: 3, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
    { turn: 4, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
    { turn: 5, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
    { turn: 6, type: "\u6B63\u5E38", yieldModifier: 1.0, description: "\u5929\u6C14\u6B63\u5E38" },
  ],
  priceSchedule: {
    "\u7389\u7C73": { "1": 2800, "2": 2750, "3": 2700, "4": 2680, "5": 2720, "6": 2750 },
    "\u5927\u8C46": { "1": 5200, "2": 5100, "3": 5050, "4": 4980, "5": 5020, "6": 5080 },
  },
  events: [
    { turn: 2, type: "YIELD_ADJUST", payload: { cropId: "corn-2", modifier: 1.3 } },
    { turn: 2, type: "YIELD_ADJUST", payload: { cropId: "soy-2", modifier: 1.3 } },
    { turn: 3, type: "WAREHOUSE_WARNING", payload: {} },
    { turn: 4, type: "SPOT_DEFAULT", payload: { orderId: "s-corn-2", defaultRatio: 0.6 } },
    { turn: 5, type: "WAREHOUSE_OVERFLOW", payload: {} },
  ],
};

export const levelConfigs: LevelConfig[] = [level1Config, level2Config, level3Config];
