import { create } from "zustand";
import type { GameState, GameAction, LevelConfig, FuturesPosition, Crop } from "@/types";
import { checkRisks } from "@/engine/riskEngine";
import { calcSettlement } from "@/engine/calculator";
import { level1Config, level2Config, level3Config } from "@/engine/levelConfigs";

const CONFIGS: Record<string, LevelConfig> = {
  "level-1": level1Config,
  "level-2": level2Config,
  "level-3": level3Config,
};

const initialState: GameState = {
  levelId: "",
  turn: 0,
  maxTurns: 0,
  cash: 0,
  initialCash: 0,
  crops: [],
  warehouse: { currentStock: 0, maxCapacity: 0, unitStorageCost: 0 },
  futuresPositions: [],
  spotOrders: [],
  weatherHistory: [],
  riskAlerts: [],
  eventLog: [],
  isFinished: false,
  currentPrices: {},
  settlement: null,
};

function applyYieldModifier(crops: Crop[], cropId: string, modifier: number): Crop[] {
  return crops.map((c) =>
    c.id === cropId ? { ...c, actualYield: Math.round(c.expectedYield * modifier) } : c
  );
}

function advanceGrowthStage(crops: Crop[], turn: number, maxTurns: number): Crop[] {
  return crops.map((c) => {
    const ratio = turn / maxTurns;
    let growthStage = c.growthStage;
    if (ratio <= 0.25) growthStage = "\u79CD\u690D";
    else if (ratio <= 0.5) growthStage = "\u751F\u957F";
    else if (ratio <= 0.75) growthStage = "\u6210\u719F";
    else growthStage = "\u6536\u5272";
    return { ...c, growthStage };
  });
}

function processScheduledEvents(state: GameState, config: LevelConfig): GameState {
  let { crops, spotOrders, warehouse, cash, eventLog, riskAlerts, futuresPositions } = state;
  const currentTurn = state.turn;

  for (const event of config.events) {
    if (event.turn !== currentTurn) continue;

    if (event.type === "YIELD_ADJUST") {
      const cropId = event.payload.cropId as string;
      const modifier = event.payload.modifier as number;
      crops = applyYieldModifier(crops, cropId, modifier);
      const crop = crops.find((c) => c.id === cropId);
      eventLog = [
        ...eventLog,
        {
          turn: currentTurn,
          timestamp: Date.now(),
          message: `\u4EA7\u91CF\u8C03\u6574\uFF1A${crop?.name ?? cropId}\u4EA7\u91CF\u8C03\u6574\u4E3A${crop?.actualYield ?? 0}\u5428`,
          type: "warning",
        },
      ];
    }

    if (event.type === "CONTRACT_EXPIRY") {
      const positionId = event.payload.positionId as string;
      const pos = futuresPositions.find((p) => p.id === positionId);
      if (pos) {
        eventLog = [
          ...eventLog,
          {
            turn: currentTurn,
            timestamp: Date.now(),
            message: `\u5408\u7EA6\u5230\u671F\u63D0\u9192\uFF1A${pos.commodity}\u671F\u8D27\u5408\u7EA6\u5230\u671F\uFF0C\u8BF7\u5C3D\u5FEB\u5E73\u4ED3\u6216\u4EA4\u5272`,
            type: "danger",
          },
        ];
        futuresPositions = futuresPositions.map((p) =>
          p.id === positionId ? { ...p, isExpired: true } : p
        );
      }
    }

    if (event.type === "SPOT_DEFAULT") {
      const orderId = event.payload.orderId as string;
      const defaultRatio = event.payload.defaultRatio as number;
      spotOrders = spotOrders.map((o) =>
        o.id === orderId ? { ...o, isDefaulted: true, defaultRatio } : o
      );
      const order = spotOrders.find((o) => o.id === orderId);
      if (order) {
        eventLog = [
          ...eventLog,
          {
            turn: currentTurn,
            timestamp: Date.now(),
            message: `\u73B0\u8D27\u8FDD\u7EA6\uFF1A${order.buyer}\u8FDD\u7EA6\uFF0C\u8FDD\u7EA6\u6BD4\u4F8B${(defaultRatio * 100).toFixed(0)}%`,
            type: "danger",
          },
        ];
      }
    }

    if (event.type === "WAREHOUSE_WARNING") {
      eventLog = [
        ...eventLog,
        {
          turn: currentTurn,
          timestamp: Date.now(),
          message: "\u4ED3\u50A8\u9884\u8B66\uFF1A\u5E93\u5B58\u63A5\u8FD1\u4E0A\u9650\uFF0C\u8BF7\u5C3D\u5FEB\u5B89\u6392\u51FA\u8D27",
          type: "warning",
        },
      ];
    }

    if (event.type === "WAREHOUSE_OVERFLOW") {
      const overflow = warehouse.currentStock - warehouse.maxCapacity;
      if (overflow > 0) {
        const extraCost = overflow * warehouse.unitStorageCost * 2;
        cash -= extraCost;
        eventLog = [
          ...eventLog,
          {
            turn: currentTurn,
            timestamp: Date.now(),
            message: `\u4ED3\u50A8\u7206\u4ED3\uFF01\u8D85\u51FA${overflow}\u5428\uFF0C\u989D\u5916\u8D39\u7528${extraCost.toLocaleString()}\u5143`,
            type: "danger",
          },
        ];
      }
    }
  }

  const newAlerts = checkRisks({ ...state, crops, spotOrders, warehouse, cash, eventLog, riskAlerts, futuresPositions });
  riskAlerts = [...riskAlerts, ...newAlerts];

  return { ...state, crops, spotOrders, warehouse, cash, eventLog, riskAlerts, futuresPositions };
}

export const useGameStore = create<GameState & { dispatch: (action: GameAction) => void }>()(
  (set, get) => ({
    ...initialState,
    dispatch: (action: GameAction) => {
      switch (action.type) {
        case "START_LEVEL": {
          const config = action.config;
          const initialPrices: Record<string, number> = {};
          for (const crop of config.crops) {
            initialPrices[crop.name] = config.priceSchedule[crop.name]?.["1"] ?? crop.unitPrice;
          }
          const initialFutures: FuturesPosition[] = config.initialFutures.map((f) => ({
            ...f,
            currentPrice: config.priceSchedule[f.commodity]?.["1"] ?? f.openPrice,
            isExpired: false,
            isSettled: false,
          }));
          const initialCrops: Crop[] = config.crops.map((c) => ({
            ...c,
            actualYield: c.expectedYield,
            growthStage: "\u79CD\u690D" as const,
          }));
          set({
            levelId: config.id,
            turn: 1,
            maxTurns: config.maxTurns,
            cash: config.initialCash,
            initialCash: config.initialCash,
            crops: initialCrops,
            warehouse: { ...config.warehouse },
            futuresPositions: initialFutures,
            spotOrders: [...config.initialSpotOrders],
            weatherHistory: config.weatherSchedule.slice(0, 1),
            riskAlerts: [],
            eventLog: [
              {
                turn: 1,
                timestamp: Date.now(),
                message: `\u5173\u5361\u300C${config.name}\u300D\u5F00\u59CB\uFF0C\u5171${config.maxTurns}\u56DE\u5408`,
                type: "info",
              },
            ],
            isFinished: false,
            currentPrices: initialPrices,
            settlement: null,
          });
          break;
        }

        case "OPEN_FUTURES": {
          const state = get();
          const newPosition: FuturesPosition = {
            id: `f-${Date.now()}`,
            commodity: action.commodity,
            direction: action.direction,
            lots: action.lots,
            contractMultiplier: 10,
            openPrice: action.openPrice,
            currentPrice: action.openPrice,
            expiryTurn: action.expiryTurn,
            isExpired: false,
            isSettled: false,
          };
          const margin = action.openPrice * action.lots * 10 * 0.1;
          if (state.cash < margin) {
            set({
              eventLog: [
                ...state.eventLog,
                {
                  turn: state.turn,
                  timestamp: Date.now(),
                  message: `\u4FDD\u8BC1\u91D1\u4E0D\u8DB3\uFF0C\u9700\u8981${margin.toLocaleString()}\u5143\uFF0C\u5F53\u524D\u8D44\u91D1${state.cash.toLocaleString()}\u5143`,
                  type: "danger",
                },
              ],
            });
            return;
          }
          set({
            cash: state.cash - margin,
            futuresPositions: [...state.futuresPositions, newPosition],
            eventLog: [
              ...state.eventLog,
              {
                turn: state.turn,
                timestamp: Date.now(),
                message: `\u5F00\u4ED3\uFF1A${action.commodity}\u671F\u8D27${action.direction}${action.lots}\u624B\uFF0C\u5F00\u4ED3\u4EF7${action.openPrice}\u5143/\u5428`,
                type: "success",
              },
            ],
          });
          break;
        }

        case "CLOSE_FUTURES": {
          const state = get();
          const pos = state.futuresPositions.find((p) => p.id === action.positionId);
          if (!pos || pos.isSettled) return;

          const pnl =
            pos.direction === "\u7A7A\u5934"
              ? (pos.openPrice - pos.currentPrice) * pos.lots * pos.contractMultiplier
              : (pos.currentPrice - pos.openPrice) * pos.lots * pos.contractMultiplier;

          const margin = pos.openPrice * pos.lots * pos.contractMultiplier * 0.1;
          const directionWord = pos.direction === "\u7A7A\u5934" ? "\u5356\u51FA" : "\u4E70\u5165";

          set({
            cash: state.cash + margin + pnl,
            futuresPositions: state.futuresPositions.map((p) =>
              p.id === action.positionId ? { ...p, isSettled: true } : p
            ),
            eventLog: [
              ...state.eventLog,
              {
                turn: state.turn,
                timestamp: Date.now(),
                message: `\u5E73\u4ED3\uFF1A${pos.commodity}\u671F\u8D27${directionWord}${pos.lots}\u624B\uFF0C\u76C8\u4E8F${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}\u5143`,
                type: pnl >= 0 ? "success" : "danger",
              },
            ],
          });
          break;
        }

        case "ADD_SPOT_ORDER": {
          const state = get();
          set({
            spotOrders: [...state.spotOrders, action.order],
            eventLog: [
              ...state.eventLog,
              {
                turn: state.turn,
                timestamp: Date.now(),
                message: `\u7B7E\u8BA2\u73B0\u8D27\u8BA2\u5355\uFF1A${action.order.commodity}${action.order.quantity}\u5428\u7ED9${action.order.buyer}\uFF0C\u534F\u8BAE\u4EF7${action.order.agreedPrice}\u5143/\u5428`,
                type: "success",
              },
            ],
          });
          break;
        }

        case "DELIVER_SPOT": {
          const state = get();
          const order = state.spotOrders.find((o) => o.id === action.orderId);
          if (!order || order.isDelivered) return;

          const revenue = order.agreedPrice * order.quantity;
          const newStock = Math.max(0, state.warehouse.currentStock - order.quantity);

          set({
            cash: state.cash + revenue,
            warehouse: { ...state.warehouse, currentStock: newStock },
            spotOrders: state.spotOrders.map((o) =>
              o.id === action.orderId ? { ...o, isDelivered: true } : o
            ),
            eventLog: [
              ...state.eventLog,
              {
                turn: state.turn,
                timestamp: Date.now(),
                message: `\u4EA4\u5272\uFF1A${order.commodity}${order.quantity}\u5428\u4EA4\u4ED8${order.buyer}\uFF0C\u6536\u5165${revenue.toLocaleString()}\u5143`,
                type: "success",
              },
            ],
          });
          break;
        }

        case "NEXT_TURN": {
          const state = get();
          if (state.isFinished) return;

          const config = CONFIGS[state.levelId];
          if (!config) return;

          const nextTurn = state.turn + 1;

          const newPrices: Record<string, number> = {};
          for (const crop of state.crops) {
            newPrices[crop.name] =
              config.priceSchedule[crop.name]?.[String(nextTurn)] ??
              state.currentPrices[crop.name];
          }

          const updatedPositions = state.futuresPositions.map((p) => ({
            ...p,
            currentPrice: newPrices[p.commodity] ?? p.currentPrice,
          }));

          const weather = config.weatherSchedule[nextTurn - 1];
          const updatedWeather = weather
            ? [...state.weatherHistory, weather]
            : state.weatherHistory;

          let updatedCrops = advanceGrowthStage(state.crops, nextTurn, state.maxTurns);

          const isFinalTurn = nextTurn >= state.maxTurns;

          if (isFinalTurn) {
            updatedCrops = updatedCrops.map((c) => ({ ...c, growthStage: "\u6536\u5272" as const }));
            const totalYield = updatedCrops.reduce((s, c) => s + c.actualYield, 0);
            const newStock = Math.min(
              state.warehouse.maxCapacity,
              state.warehouse.currentStock + totalYield
            );
            const storageCost = state.warehouse.currentStock * state.warehouse.unitStorageCost;

            let newState: GameState = {
              ...state,
              turn: nextTurn,
              currentPrices: newPrices,
              futuresPositions: updatedPositions,
              weatherHistory: updatedWeather,
              crops: updatedCrops,
              warehouse: { ...state.warehouse, currentStock: newStock },
              cash: state.cash - storageCost,
              isFinished: true,
              eventLog: [
                ...state.eventLog,
                {
                  turn: nextTurn,
                  timestamp: Date.now(),
                  message: `\u6536\u5272\u5B8C\u6210\uFF0C\u603B\u4EA7\u91CF${totalYield}\u5428\u5165\u5E93\uFF0C\u4ED3\u50A8\u6210\u672C${storageCost.toLocaleString()}\u5143`,
                  type: "info",
                },
              ],
            };

            newState = processScheduledEvents(newState, config);

            const settlement = calcSettlement(newState);
            newState = {
              ...newState,
              settlement,
              eventLog: [
                ...newState.eventLog,
                {
                  turn: nextTurn,
                  timestamp: Date.now(),
                  message: `\u6A21\u62DF\u7ED3\u675F\uFF01\u671F\u672B\u8D44\u91D1${settlement.finalCash.toLocaleString()}\u5143\uFF0C\u51C0\u5957\u4FDD\u6548\u679C${settlement.netHedgingEffect >= 0 ? "+" : ""}${settlement.netHedgingEffect.toLocaleString()}\u5143`,
                  type: settlement.netHedgingEffect >= 0 ? "success" : "danger",
                },
              ],
            };

            set(newState);
            return;
          }

          let newState: GameState = {
            ...state,
            turn: nextTurn,
            currentPrices: newPrices,
            futuresPositions: updatedPositions,
            weatherHistory: updatedWeather,
            crops: updatedCrops,
            warehouse: { ...state.warehouse },
            isFinished: false,
            eventLog: [
              ...state.eventLog,
              {
                turn: nextTurn,
                timestamp: Date.now(),
                message: `\u7B2C${nextTurn}\u56DE\u5408\u5F00\u59CB${weather ? ` \u2014 ${weather.description}` : ""}`,
                type: "info",
              },
            ],
          };

          newState = processScheduledEvents(newState, config);
          set(newState);
          break;
        }

        case "RESET": {
          set(initialState);
          break;
        }
      }
    },
  })
);

export function getLevelConfig(levelId: string): LevelConfig | undefined {
  return CONFIGS[levelId];
}
