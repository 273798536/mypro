import { create } from "zustand";
import type {
  Customer,
  Counter,
  GameEvent,
  GameEventType,
  GameState,
  GamePhase,
  FeedbackMessage,
  QueueSnapshot,
  Score,
  CustomerArrivePayload,
  CounterBrokenPayload,
} from "@/types/game";
import { scenarios } from "@/utils/scenarios";

let eventCounter = 0;
let customerCounter = 0;
let feedbackCounter = 0;

function nextEventId() {
  return `evt-${++eventCounter}`;
}
function nextCustomerId() {
  return `cust-${++customerCounter}`;
}
function nextFeedbackId() {
  return `fb-${++feedbackCounter}`;
}

function createCounters(count: number): Counter[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `counter-${i}`,
    label: `柜台${i + 1}`,
    status: "idle" as const,
    currentCustomer: null,
    remainingTime: 0,
    cooldownRemaining: 0,
    brokenRemaining: 0,
    serviceHistory: [],
    totalCooldownTicks: 0,
    totalBrokenTicks: 0,
    pendingCustomer: null,
  }));
}

function createCustomer(
  payload: CustomerArrivePayload["customers"][0],
  currentTick: number,
  queueIndex: number
): Customer {
  return {
    id: nextCustomerId(),
    name: payload.name,
    vipLevel: payload.vipLevel,
    isAppointment: payload.isAppointment,
    appointmentDeadline: payload.appointmentWindow
      ? currentTick + payload.appointmentWindow
      : null,
    businessType: payload.businessType,
    serviceTime: payload.serviceTime,
    originalQueueIndex: queueIndex,
    arriveTick: currentTick,
    status: "waiting",
  };
}

function insertByPriority(queue: Customer[], customer: Customer): Customer[] {
  const newQueue = [...queue];
  let insertIdx = newQueue.length;
  for (let i = 0; i < newQueue.length; i++) {
    if (customer.vipLevel > newQueue[i].vipLevel) {
      insertIdx = i;
      break;
    }
  }
  newQueue.splice(insertIdx, 0, customer);
  return newQueue;
}

function pushEvent(
  events: GameEvent[],
  currentTick: number,
  type: GameEventType,
  details: string,
  extra: Partial<GameEvent["data"]> = {}
): GameEvent[] {
  return [
    ...events,
    {
      id: nextEventId(),
      tick: currentTick,
      type,
      data: { details, ...extra },
    },
  ];
}

function pushFeedback(
  feedbacks: FeedbackMessage[],
  currentTick: number,
  type: FeedbackMessage["type"],
  message: string,
  customerRef?: string,
  counterRef?: string
): FeedbackMessage[] {
  return [
    ...feedbacks,
    {
      id: nextFeedbackId(),
      tick: currentTick,
      type,
      message,
      customerRef,
      counterRef,
    },
  ];
}

function calcScore(
  events: GameEvent[],
  completedIds: string[],
  failedIds: string[]
): Score {
  const vipHandled = events.filter(
    (e) =>
      e.type === "service_complete" &&
      e.data.customerId &&
      e.data.details.includes("VIP")
  ).length;
  const interruptedCount = events.filter(
    (e) => e.type === "service_interrupted"
  ).length;
  const brokenCount = events.filter(
    (e) => e.type === "counter_broken"
  ).length;
  const appointmentExpired = events.filter(
    (e) => e.type === "appointment_expired"
  ).length;
  return {
    served: completedIds.length,
    vipHandled,
    appointmentExpired,
    interruptedCount,
    brokenCount,
  };
}

function getServiceElapsed(counter: Counter): number {
  if (!counter.currentCustomer) return 0;
  return counter.currentCustomer.serviceTime - counter.remainingTime;
}

interface GameActions {
  selectScenario: (id: string) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  advanceTick: () => void;
  assignCustomer: (customerId: string, counterId: string) => void;
  dismissFeedback: (id: string) => void;
}

type GameStore = GameState & GameActions;

const initialState: GameState = {
  phase: "idle",
  tick: 0,
  queue: [],
  counters: [],
  events: [],
  score: {
    served: 0,
    vipHandled: 0,
    appointmentExpired: 0,
    interruptedCount: 0,
    brokenCount: 0,
  },
  snapshots: [],
  scenarioId: "",
  feedbackMessages: [],
  allCustomers: [],
  completedCustomerIds: [],
  failedCustomerIds: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  selectScenario: (id: string) => {
    const scenario = scenarios.find((s) => s.id === id);
    if (!scenario) return;
    eventCounter = 0;
    customerCounter = 0;
    feedbackCounter = 0;
    set({
      ...initialState,
      scenarioId: id,
      counters: createCounters(scenario.counterCount),
    });
  },

  startGame: () => {
    const { scenarioId } = get();
    if (!scenarioId) return;
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    eventCounter = 0;
    customerCounter = 0;
    feedbackCounter = 0;
    set({
      ...initialState,
      phase: "playing",
      scenarioId,
      counters: createCounters(scenario.counterCount),
    });
  },

  pauseGame: () => {
    const { phase } = get();
    if (phase === "playing") set({ phase: "paused" });
  },

  resumeGame: () => {
    const { phase } = get();
    if (phase === "paused") set({ phase: "playing" });
  },

  resetGame: () => {
    const { scenarioId } = get();
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    eventCounter = 0;
    customerCounter = 0;
    feedbackCounter = 0;
    set({
      ...initialState,
      scenarioId,
      phase: "idle",
      counters: createCounters(scenario.counterCount),
    });
  },

  advanceTick: () => {
    const state = get();
    if (state.phase !== "playing") return;

    const scenario = scenarios.find((s) => s.id === state.scenarioId);
    if (!scenario) return;

    const newTick = state.tick + 1;
    let newQueue = [...state.queue];
    let newCounters = state.counters.map((c) => ({ ...c }));
    let newEvents = [...state.events];
    let newFeedbacks = [...state.feedbackMessages];
    let newSnapshots = [...state.snapshots];
    let newAllCustomers = [...state.allCustomers];
    let newCompleted = [...state.completedCustomerIds];
    let newFailed = [...state.failedCustomerIds];

    const scheduled = scenario.schedule.filter((e) => e.tick === newTick);
    for (const event of scheduled) {
      if (event.type === "customer_arrive") {
        const payload = event.payload as CustomerArrivePayload;
        const beforeIds = newQueue.map((c) => c.id);
        for (const cp of payload.customers) {
          const customer = createCustomer(cp, newTick, newAllCustomers.length);
          newAllCustomers.push(customer);
          const isVip = customer.vipLevel > 0;
          if (isVip) {
            newQueue = insertByPriority(newQueue, customer);
            newEvents = pushEvent(
              newEvents,
              newTick,
              "vip_preempt",
              `${customer.name}(VIP${customer.vipLevel})挤占队列，排至第${newQueue.indexOf(customer) + 1}位`,
              {
                customerId: customer.id,
                affectedCustomers: newQueue
                  .filter((c) => c.id !== customer.id)
                  .map((c) => c.id),
              }
            );
            newFeedbacks = pushFeedback(
              newFeedbacks,
              newTick,
              "warning",
              `${customer.name}(VIP${customer.vipLevel})挤占队列！`,
              customer.id
            );
            const afterIds = newQueue.map((c) => c.id);
            if (beforeIds.join(",") !== afterIds.join(",")) {
              newSnapshots.push({
                tick: newTick,
                beforeIds,
                afterIds,
                trigger: `VIP挤占: ${customer.name}`,
              });
              newEvents = pushEvent(
                newEvents,
                newTick,
                "queue_reorder",
                `队列重排: VIP ${customer.name} 插入`,
                { customerId: customer.id }
              );
            }
          } else {
            newQueue.push(customer);
            newEvents = pushEvent(
              newEvents,
              newTick,
              "customer_arrive",
              `${customer.name}到达，排至第${newQueue.length}位`,
              { customerId: customer.id }
            );
            newFeedbacks = pushFeedback(
              newFeedbacks,
              newTick,
              "info",
              `${customer.name}加入队列`,
              customer.id
            );
          }
        }
      } else if (event.type === "counter_broken") {
        const payload = event.payload as CounterBrokenPayload;
        const counter = newCounters[payload.counterIndex];
        if (!counter) continue;
        const beforeStatus = counter.status;
        const serviceElapsed = getServiceElapsed(counter);
        if (counter.currentCustomer) {
          const interruptedCustomer = {
            ...counter.currentCustomer,
            status: "interrupted" as const,
          };
          newQueue.push(interruptedCustomer);
          newAllCustomers = newAllCustomers.map((c) =>
            c.id === interruptedCustomer.id ? interruptedCustomer : c
          );
          newFeedbacks = pushFeedback(
            newFeedbacks,
            newTick,
            "error",
            `${counter.label}故障！${interruptedCustomer.name}被中断，回队列等待`,
            interruptedCustomer.id,
            counter.id
          );
          newEvents = pushEvent(
            newEvents,
            newTick,
            "service_interrupted",
            `${counter.label}故障，${interruptedCustomer.name}服务中断`,
            {
              customerId: interruptedCustomer.id,
              counterId: counter.id,
              affectedCustomers: [interruptedCustomer.id],
              affectedCounters: [counter.id],
            }
          );
        }
        newCounters[payload.counterIndex] = {
          ...counter,
          status: "broken",
          brokenRemaining: payload.brokenDuration,
          currentCustomer: null,
          remainingTime: 0,
          serviceHistory: [
            ...counter.serviceHistory,
            ...(beforeStatus === "serving" && counter.currentCustomer
              ? [
                  {
                    customer: counter.currentCustomer,
                    startTime: newTick - serviceElapsed,
                    endTime: newTick,
                    result: "broken" as const,
                  },
                ]
              : []),
          ],
        };
        newEvents = pushEvent(
          newEvents,
          newTick,
          "counter_broken",
          `${counter.label}发生故障，需冷却${payload.brokenDuration}秒`,
          { counterId: counter.id, affectedCounters: [counter.id] }
        );
        newFeedbacks = pushFeedback(
          newFeedbacks,
          newTick,
          "error",
          `${counter.label}故障！冷却${payload.brokenDuration}秒`,
          undefined,
          counter.id
        );
      }
    }

    for (let i = 0; i < newCounters.length; i++) {
      const counter = newCounters[i];
      if (counter.status === "serving" && counter.remainingTime > 0) {
        const newRemaining = counter.remainingTime - 1;
        if (newRemaining <= 0) {
          const completedCustomer = counter.currentCustomer;
          if (completedCustomer) {
            newCompleted.push(completedCustomer.id);
            newAllCustomers = newAllCustomers.map((c) =>
              c.id === completedCustomer.id
                ? { ...c, status: "completed" as const }
                : c
            );
            newEvents = pushEvent(
              newEvents,
              newTick,
              "service_complete",
              `${completedCustomer.name}在${counter.label}完成服务`,
              { customerId: completedCustomer.id, counterId: counter.id }
            );
            newFeedbacks = pushFeedback(
              newFeedbacks,
              newTick,
              "success",
              `${completedCustomer.name}服务完成`,
              completedCustomer.id,
              counter.id
            );
          }
          newCounters[i] = {
            ...counter,
            status: "idle",
            currentCustomer: null,
            remainingTime: 0,
            serviceHistory: [
              ...counter.serviceHistory,
              ...(completedCustomer
                ? [
                    {
                      customer: completedCustomer,
                      startTime: newTick - completedCustomer.serviceTime,
                      endTime: newTick,
                      result: "completed" as const,
                    },
                  ]
                : []),
            ],
          };
        } else {
          newCounters[i] = {
            ...counter,
            remainingTime: newRemaining,
          };
        }
      }
      if (counter.status === "broken" && counter.brokenRemaining > 0) {
        const newBroken = counter.brokenRemaining - 1;
        newCounters[i].totalBrokenTicks++;
        if (newBroken <= 0) {
          newCounters[i] = {
            ...newCounters[i],
            status: "cooldown",
            brokenRemaining: 0,
            cooldownRemaining: 2,
          };
          newCounters[i].totalCooldownTicks++;
          newEvents = pushEvent(
            newEvents,
            newTick,
            "counter_cooldown_start",
            `${counter.label}故障恢复，进入冷却2秒`,
            { counterId: counter.id }
          );
          newFeedbacks = pushFeedback(
            newFeedbacks,
            newTick,
            "info",
            `${counter.label}恢复中，冷却2秒`,
            undefined,
            counter.id
          );
        } else {
          newCounters[i] = {
            ...newCounters[i],
            brokenRemaining: newBroken,
          };
        }
      }
      if (counter.status === "cooldown" && counter.cooldownRemaining > 0) {
        const newCooldown = counter.cooldownRemaining - 1;
        newCounters[i].totalCooldownTicks++;
        if (newCooldown <= 0) {
          if (counter.pendingCustomer) {
            const pc = counter.pendingCustomer;
            newCounters[i] = {
              ...newCounters[i],
              status: "serving",
              cooldownRemaining: 0,
              currentCustomer: pc,
              remainingTime: pc.serviceTime,
              pendingCustomer: null,
            };
            newEvents = pushEvent(
              newEvents,
              newTick,
              "counter_recovered",
              `${counter.label}冷却结束，${pc.name}开始服务`,
              { counterId: counter.id, customerId: pc.id }
            );
            newFeedbacks = pushFeedback(
              newFeedbacks,
              newTick,
              "success",
              `${counter.label}冷却结束，${pc.name}开始服务`,
              pc.id,
              counter.id
            );
            newEvents = pushEvent(
              newEvents,
              newTick,
              "service_start",
              `${pc.name}在${counter.label}开始服务，预计${pc.serviceTime}秒`,
              { customerId: pc.id, counterId: counter.id }
            );
          } else {
            newCounters[i] = {
              ...newCounters[i],
              status: "idle",
              cooldownRemaining: 0,
              pendingCustomer: null,
            };
            newEvents = pushEvent(
              newEvents,
              newTick,
              "counter_recovered",
              `${counter.label}冷却结束，恢复空闲`,
              { counterId: counter.id }
            );
            newFeedbacks = pushFeedback(
              newFeedbacks,
              newTick,
              "success",
              `${counter.label}已恢复空闲`,
              undefined,
              counter.id
            );
          }
        } else {
          newCounters[i] = {
            ...newCounters[i],
            cooldownRemaining: newCooldown,
          };
        }
      }
    }

    const appointmentCustomers = newQueue.filter(
      (c) =>
        c.isAppointment &&
        c.appointmentDeadline !== null &&
        c.appointmentDeadline <= newTick &&
        c.status === "waiting"
    );
    for (const ac of appointmentCustomers) {
      newQueue = newQueue.filter((c) => c.id !== ac.id);
      newFailed.push(ac.id);
      newAllCustomers = newAllCustomers.map((c) =>
        c.id === ac.id ? { ...c, status: "expired" as const } : c
      );
      const busyCounters = newCounters
        .filter((ct) => ct.status !== "idle")
        .map((ct) => ct.label);
      const counterRef =
        busyCounters.length > 0 ? busyCounters.join("、") : "无柜台可用";
      newEvents = pushEvent(
        newEvents,
        newTick,
        "appointment_expired",
        `${ac.name}预约过号（窗口在${counterRef}占用/冷却期间耗尽）`,
        {
          customerId: ac.id,
          affectedCounters: newCounters
            .filter((ct) => ct.status !== "idle")
            .map((ct) => ct.id),
        }
      );
      newFeedbacks = pushFeedback(
        newFeedbacks,
        newTick,
        "error",
        `${ac.name}预约过号！归因: ${counterRef}占用/冷却`,
        ac.id
      );
    }

    newFeedbacks = newFeedbacks.filter(
      (f) => newTick - f.tick < 8
    );

    const allArrived = scenario.schedule
      .filter((e) => e.type === "customer_arrive")
      .every((e) => e.tick <= newTick);
    const queueEmpty = newQueue.length === 0;
    const noActiveService = newCounters.every(
      (c) => c.status !== "serving"
    );

    let newPhase: GamePhase = state.phase;
    if (allArrived && queueEmpty && noActiveService) {
      newPhase = "ended";
    }

    const newScore = calcScore(newEvents, newCompleted, newFailed);

    set({
      tick: newTick,
      queue: newQueue,
      counters: newCounters,
      events: newEvents,
      score: newScore,
      snapshots: newSnapshots,
      feedbackMessages: newFeedbacks,
      allCustomers: newAllCustomers,
      completedCustomerIds: newCompleted,
      failedCustomerIds: newFailed,
      phase: newPhase,
    });
  },

  assignCustomer: (customerId: string, counterId: string) => {
    const state = get();
    if (state.phase !== "playing") return;

    const customer = state.queue.find((c) => c.id === customerId);
    if (!customer) return;

    const counterIndex = state.counters.findIndex((c) => c.id === counterId);
    if (counterIndex === -1) return;

    const counter = state.counters[counterIndex];
    if (counter.status === "broken" || counter.status === "cooldown") {
      set({
        feedbackMessages: pushFeedback(
          [...state.feedbackMessages],
          state.tick,
          "error",
          `${counter.label}${counter.status === "broken" ? "故障中" : "冷却中"}，不可分配`,
          customer.id,
          counter.id
        ),
      });
      return;
    }

    let newQueue = state.queue.filter((c) => c.id !== customerId);
    let newCounters = state.counters.map((c) => ({ ...c }));
    let newEvents = [...state.events];
    let newFeedbacks = [...state.feedbackMessages];
    let newAllCustomers = [...state.allCustomers];
    let newCompleted = [...state.completedCustomerIds];
    let newFailed = [...state.failedCustomerIds];
    let newSnapshots = [...state.snapshots];

    if (counter.status === "serving" && counter.currentCustomer) {
      const interruptedCustomer = {
        ...counter.currentCustomer,
        status: "interrupted" as const,
      };
      const beforeIds = newQueue.map((c) => c.id);
      newQueue.unshift(interruptedCustomer);
      newAllCustomers = newAllCustomers.map((c) =>
        c.id === interruptedCustomer.id ? interruptedCustomer : c
      );
      const serviceElapsed = getServiceElapsed(counter);
      newFeedbacks = pushFeedback(
        newFeedbacks,
        state.tick,
        "warning",
        `${interruptedCustomer.name}被中断！${counter.label}进入冷却2秒`,
        interruptedCustomer.id,
        counter.id
      );
      newEvents = pushEvent(
        newEvents,
        state.tick,
        "service_interrupted",
        `${counter.label}服务中断: ${interruptedCustomer.name}回队列，VIP ${customer.name}接替`,
        {
          customerId: interruptedCustomer.id,
          counterId: counter.id,
          affectedCustomers: [interruptedCustomer.id, customer.id],
          affectedCounters: [counter.id],
        }
      );
      const afterIds = newQueue.map((c) => c.id);
      if (beforeIds.join(",") !== afterIds.join(",")) {
        newSnapshots.push({
          tick: state.tick,
          beforeIds,
          afterIds,
          trigger: `VIP挤占中断: ${customer.name}→${counter.label}`,
        });
        newEvents = pushEvent(
          newEvents,
          state.tick,
          "queue_reorder",
          `队列重排: ${interruptedCustomer.name}被中断回队列`,
          { customerId: interruptedCustomer.id, counterId: counter.id }
        );
      }
    }

    const updatedCustomer = { ...customer, status: "serving" as const };
    newAllCustomers = newAllCustomers.map((c) =>
      c.id === updatedCustomer.id ? updatedCustomer : c
    );

    if (counter.status === "serving") {
      const serviceElapsed = getServiceElapsed(counter);
      newCounters[counterIndex] = {
        ...newCounters[counterIndex],
        status: "cooldown",
        currentCustomer: null,
        remainingTime: 0,
        cooldownRemaining: 2,
        pendingCustomer: updatedCustomer,
        serviceHistory: [
          ...newCounters[counterIndex].serviceHistory,
          ...(counter.currentCustomer
            ? [
                {
                  customer: counter.currentCustomer,
                  startTime: state.tick - serviceElapsed,
                  endTime: state.tick,
                  result: "interrupted" as const,
                },
              ]
            : []),
        ],
      };
      newCounters[counterIndex].totalCooldownTicks++;
      newFeedbacks = pushFeedback(
        newFeedbacks,
        state.tick,
        "info",
        `${counter.label}冷却2秒后${customer.name}将开始服务`,
        customer.id,
        counter.id
      );

      set({
        queue: newQueue,
        counters: newCounters,
        events: newEvents,
        feedbackMessages: newFeedbacks,
        allCustomers: newAllCustomers,
        completedCustomerIds: newCompleted,
        failedCustomerIds: newFailed,
        snapshots: newSnapshots,
      });
      return;
    }

    newCounters[counterIndex] = {
      ...newCounters[counterIndex],
      status: "serving",
      currentCustomer: updatedCustomer,
      remainingTime: updatedCustomer.serviceTime,
      cooldownRemaining: 0,
      brokenRemaining: 0,
    };

    newEvents = pushEvent(
      newEvents,
      state.tick,
      "service_start",
      `${updatedCustomer.name}分配到${counter.label}，预计${updatedCustomer.serviceTime}秒`,
      { customerId: updatedCustomer.id, counterId: counter.id }
    );
    newFeedbacks = pushFeedback(
      newFeedbacks,
      state.tick,
      "success",
      `${updatedCustomer.name}→${counter.label}`,
      updatedCustomer.id,
      counter.id
    );

    const newScore = calcScore(newEvents, newCompleted, newFailed);

    set({
      queue: newQueue,
      counters: newCounters,
      events: newEvents,
      score: newScore,
      feedbackMessages: newFeedbacks,
      allCustomers: newAllCustomers,
      completedCustomerIds: newCompleted,
      failedCustomerIds: newFailed,
      snapshots: newSnapshots,
    });
  },

  dismissFeedback: (id: string) => {
    set({
      feedbackMessages: get().feedbackMessages.filter((f) => f.id !== id),
    });
  },
}));
