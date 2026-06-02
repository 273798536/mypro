import { create } from 'zustand';
import {
  SimulationConfig,
  SimulationResult,
  SimulationEvent,
} from '../types';

interface SimulationStore {
  config: SimulationConfig;
  result: SimulationResult | null;
  isRunning: boolean;
  currentTime: number;
  events: SimulationEvent[];
  playbackSpeed: number;
  isPaused: boolean;

  setConfig: (config: Partial<SimulationConfig>) => void;
  resetConfig: () => void;
  setResult: (result: SimulationResult | null) => void;
  setIsRunning: (isRunning: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPaused: (isPaused: boolean) => void;
  resetSimulation: () => void;
}

const defaultConfig: SimulationConfig = {
  arrivalRate: 2.5,
  avgServiceTime: 12,
  serviceTimeStd: 6,
  windowCount: 4,
  simulationDuration: 480,
  noShowRate: 0.08,
};

export const useSimulationStore = create<SimulationStore>((set) => ({
  config: defaultConfig,
  result: null,
  isRunning: false,
  currentTime: 0,
  events: [],
  playbackSpeed: 1,
  isPaused: false,

  setConfig: (newConfig) => set((state) => ({
    config: { ...state.config, ...newConfig },
  })),

  resetConfig: () => set({ config: defaultConfig }),

  setResult: (result) => set({ result }),

  setIsRunning: (isRunning) => set({ isRunning }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  setIsPaused: (isPaused) => set({ isPaused }),

  resetSimulation: () => set({
    result: null,
    isRunning: false,
    currentTime: 0,
    events: [],
    isPaused: false,
  }),
}));

export class SimulationEngine {
  private randomNormal(mean: number, std: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std + mean;
  }

  private randomExponential(rate: number): number {
    return -Math.log(1 - Math.random()) / rate;
  }

  run(config: SimulationConfig): SimulationResult {
    const { arrivalRate, avgServiceTime, serviceTimeStd, windowCount, simulationDuration, noShowRate } = config;

    const events: SimulationEvent[] = [];
    const waitTimes: number[] = [];
    const queueLengths: number[] = [];

    let currentTime = 0;
    const queue: { arrivalTime: number; visitorId: string }[] = [];
    const windows: { endTime: number; visitorId: string | null }[] = Array(windowCount).fill(null).map(() => ({
      endTime: 0,
      visitorId: null,
    }));

    let visitorCounter = 0;
    let nextArrival = this.randomExponential(arrivalRate / 60);
    let maxQueueLength = 0;
    let maxWaitTime = 0;
    let totalServed = 0;
    let totalBusyTime = 0;

    while (currentTime < simulationDuration) {
      let nextEventTime = nextArrival;
      let nextEventType: 'arrival' | 'end_service' = 'arrival';
      let nextWindowIndex = -1;

      windows.forEach((window, index) => {
        if (window.visitorId !== null && window.endTime < nextEventTime) {
          nextEventTime = window.endTime;
          nextEventType = 'end_service';
          nextWindowIndex = index;
        }
      });

      currentTime = nextEventTime;
      const currentQueueLength = queue.length + windows.filter(w => w.visitorId !== null).length;
      queueLengths.push(currentQueueLength);
      maxQueueLength = Math.max(maxQueueLength, queue.length);

      if (nextEventType === 'arrival') {
        visitorCounter++;
        const visitorId = `sim-visitor-${visitorCounter}`;

        const isNoShow = Math.random() < noShowRate;

        if (isNoShow) {
          events.push({
            time: currentTime,
            type: 'no_show',
            visitorId,
            queueLength: queue.length,
          });
        } else {
          const availableWindow = windows.findIndex(w => w.visitorId === null);

          if (availableWindow !== -1) {
            const serviceTime = Math.max(1, this.randomNormal(avgServiceTime, serviceTimeStd));
            windows[availableWindow] = {
              endTime: currentTime + serviceTime,
              visitorId,
            };

            waitTimes.push(0);
            events.push({
              time: currentTime,
              type: 'start_service',
              visitorId,
              windowId: availableWindow,
              waitTime: 0,
              queueLength: queue.length,
            });
          } else {
            queue.push({ arrivalTime: currentTime, visitorId });
            events.push({
              time: currentTime,
              type: 'arrival',
              visitorId,
              queueLength: queue.length,
            });
          }
        }

        nextArrival = currentTime + this.randomExponential(arrivalRate / 60);
      } else if (nextEventType === 'end_service' && nextWindowIndex !== -1) {
        totalServed++;
        totalBusyTime += this.randomNormal(avgServiceTime, serviceTimeStd);

        if (queue.length > 0) {
          const nextVisitor = queue.shift()!;
          const waitTime = currentTime - nextVisitor.arrivalTime;
          const serviceTime = Math.max(1, this.randomNormal(avgServiceTime, serviceTimeStd));

          waitTimes.push(waitTime);
          maxWaitTime = Math.max(maxWaitTime, waitTime);

          windows[nextWindowIndex] = {
            endTime: currentTime + serviceTime,
            visitorId: nextVisitor.visitorId,
          };

          events.push({
            time: currentTime,
            type: 'start_service',
            visitorId: nextVisitor.visitorId,
            windowId: nextWindowIndex,
            waitTime,
            queueLength: queue.length,
          });
        } else {
          windows[nextWindowIndex] = {
            endTime: 0,
            visitorId: null,
          };
        }

        events.push({
          time: currentTime,
          type: 'end_service',
          windowId: nextWindowIndex,
          queueLength: queue.length,
        });
      }
    }

    const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
    const avgQueueLength = queueLengths.length > 0 ? queueLengths.reduce((a, b) => a + b, 0) / queueLengths.length : 0;
    const windowUtilization = totalServed > 0
      ? (totalBusyTime / (windowCount * simulationDuration)) * 100
      : 0;

    const timeoutThreshold = 30;
    const timeoutCount = waitTimes.filter(w => w > timeoutThreshold).length;
    const timeoutRate = waitTimes.length > 0 ? (timeoutCount / waitTimes.length) * 100 : 0;

    const histogramBins = this.createHistogram(waitTimes, 10);

    const result: SimulationResult = {
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      maxWaitTime: Math.round(maxWaitTime * 10) / 10,
      avgQueueLength: Math.round(avgQueueLength * 10) / 10,
      maxQueueLength,
      windowUtilization: Math.round(windowUtilization * 10) / 10,
      timeoutRate: Math.round(timeoutRate * 10) / 10,
      waitDistribution: histogramBins,
      timeline: events,
    };

    useSimulationStore.getState().setResult(result);
    useSimulationStore.getState().events = events;

    return result;
  }

  getTimeline(): SimulationEvent[] {
    return useSimulationStore.getState().events;
  }

  getEventsAtTime(time: number): SimulationEvent[] {
    const events = this.getTimeline();
    return events.filter(e => e.time <= time);
  }

  getQueueStateAtTime(time: number): {
    queueLength: number;
    servingCount: number;
    servedCount: number;
  } {
    const events = this.getEventsAtTime(time);
    const arrivals = events.filter(e => e.type === 'arrival').length;
    const starts = events.filter(e => e.type === 'start_service').length;
    const ends = events.filter(e => e.type === 'end_service').length;

    return {
      queueLength: arrivals - starts,
      servingCount: starts - ends,
      servedCount: ends,
    };
  }

  reset(): void {
    useSimulationStore.getState().resetSimulation();
  }

  private createHistogram(data: number[], bins: number): number[] {
    if (data.length === 0) return Array(bins).fill(0);

    const max = Math.max(...data);
    const binWidth = max / bins;
    const histogram = Array(bins).fill(0);

    data.forEach(value => {
      const binIndex = Math.min(Math.floor(value / binWidth), bins - 1);
      histogram[binIndex]++;
    });

    return histogram;
  }

  calculateStats(config: SimulationConfig, runs: number = 10): SimulationResult {
    const results: SimulationResult[] = [];

    for (let i = 0; i < runs; i++) {
      results.push(this.run(config));
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      avgWaitTime: Math.round(avg(results.map(r => r.avgWaitTime)) * 10) / 10,
      maxWaitTime: Math.round(avg(results.map(r => r.maxWaitTime)) * 10) / 10,
      avgQueueLength: Math.round(avg(results.map(r => r.avgQueueLength)) * 10) / 10,
      maxQueueLength: Math.round(avg(results.map(r => r.maxQueueLength))),
      windowUtilization: Math.round(avg(results.map(r => r.windowUtilization)) * 10) / 10,
      timeoutRate: Math.round(avg(results.map(r => r.timeoutRate)) * 10) / 10,
      waitDistribution: results[0].waitDistribution,
      timeline: [],
    };
  }
}

export const simulationEngine = new SimulationEngine();
