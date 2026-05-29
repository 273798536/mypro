import { create } from 'zustand';
import {
  GameState,
  Order,
  Chef,
  MenuItem,
  CachedItem,
  ProblemOrder,
  TraceLink,
  TraceEvent,
  PathNode,
  QueueStrategy,
  CacheStrategy,
  PathStrategy,
} from '../types/game';
import { FIFOQueue } from '../algorithms/queue/fifo';
import { SJFQueue } from '../algorithms/queue/sjf';
import { PriorityQueue } from '../algorithms/queue/priority';
import { LRUCache } from '../algorithms/cache/lru';
import { LFUCache } from '../algorithms/cache/lfu';
import { FIFOCache } from '../algorithms/cache/fifoCache';
import { DijkstraPathfinder } from '../algorithms/path/dijkstra';
import { AStarPathfinder } from '../algorithms/path/aStar';
import { GreedyPathfinder } from '../algorithms/path/greedy';
import { mockChefs, mockMenu, mockOrders, mockPathNodes } from '../data/mockData';

interface GameStore extends GameState {
  queueInstance: FIFOQueue | SJFQueue | PriorityQueue | null;
  cacheInstance: LRUCache | LFUCache | FIFOCache | null;
  pathInstance: DijkstraPathfinder | AStarPathfinder | GreedyPathfinder | null;
  
  initGame: (orders?: Order[], chefs?: Chef[], menu?: MenuItem[]) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  
  setQueueStrategy: (strategy: QueueStrategy) => void;
  setCacheStrategy: (strategy: CacheStrategy) => void;
  setPathStrategy: (strategy: PathStrategy) => void;
  setSpeed: (speed: number) => void;
  
  tick: () => void;
  addTraceEvent: (orderId: string, event: TraceEvent) => void;
  addProblemOrder: (problem: ProblemOrder) => void;
  getOrderTrace: (orderId: string) => TraceLink | undefined;
  getStats: () => {
    totalOrders: number;
    completedOrders: number;
    timeoutOrders: number;
    starvedOrders: number;
    averageWaitTime: number;
    cacheHitRate: number;
    totalScore: number;
    pathEfficiency: number;
  };
}

export const useGameStore = create<GameStore>()((set, get) => ({
  status: 'idle',
  score: 0,
  currentTime: 0,
  speed: 1,
  algorithms: {
    queue: 'FIFO',
    cache: 'LRU',
    path: 'DIJKSTRA',
  },
  orders: [],
  chefs: [],
  cache: {
    items: [],
    capacity: 5,
    strategy: 'LRU',
    hitCount: 0,
    missCount: 0,
    evictionErrors: [],
  },
  menu: [],
  completedOrders: [],
  problemOrders: [],
  traceLinks: [],
  pathNodes: mockPathNodes,
  activeDeliveries: [],
  
  queueInstance: null,
  cacheInstance: null,
  pathInstance: null,

  initGame: (orders = mockOrders, chefs = mockChefs, menu = mockMenu) => {
    const state = get();
    
    let queueInstance: FIFOQueue | SJFQueue | PriorityQueue;
    switch (state.algorithms.queue) {
      case 'SJF':
        queueInstance = new SJFQueue();
        break;
      case 'PRIORITY':
        queueInstance = new PriorityQueue();
        break;
      default:
        queueInstance = new FIFOQueue();
    }
    
    let cacheInstance: LRUCache | LFUCache | FIFOCache;
    switch (state.algorithms.cache) {
      case 'LFU':
        cacheInstance = new LFUCache(5);
        break;
      case 'FIFO':
        cacheInstance = new FIFOCache(5);
        break;
      default:
        cacheInstance = new LRUCache(5);
    }
    
    let pathInstance: DijkstraPathfinder | AStarPathfinder | GreedyPathfinder;
    switch (state.algorithms.path) {
      case 'A_STAR':
        pathInstance = new AStarPathfinder();
        break;
      case 'GREEDY':
        pathInstance = new GreedyPathfinder();
        break;
      default:
        pathInstance = new DijkstraPathfinder();
    }
    
    const traceLinks: TraceLink[] = orders.map(o => ({
      orderId: o.id,
      events: [],
    }));
    
    set({
      status: 'idle',
      score: 0,
      currentTime: 0,
      orders: [...orders],
      chefs: chefs.map(c => ({ ...c, status: 'idle', progress: 0 })),
      menu,
      cache: {
        items: [],
        capacity: 5,
        strategy: state.algorithms.cache,
        hitCount: 0,
        missCount: 0,
        evictionErrors: [],
      },
      completedOrders: [],
      problemOrders: [],
      traceLinks,
      activeDeliveries: [],
      queueInstance,
      cacheInstance,
      pathInstance,
    });
  },

  startGame: () => {
    const state = get();
    if (state.orders.length === 0) {
      state.initGame();
    }
    set({ status: 'running' });
  },

  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'running' }),
  
  restartGame: () => {
    const state = get();
    state.initGame();
  },
  
  endGame: () => set({ status: 'ended' }),

  setQueueStrategy: (strategy: QueueStrategy) => {
    let queueInstance: FIFOQueue | SJFQueue | PriorityQueue;
    switch (strategy) {
      case 'SJF':
        queueInstance = new SJFQueue();
        break;
      case 'PRIORITY':
        queueInstance = new PriorityQueue();
        break;
      default:
        queueInstance = new FIFOQueue();
    }
    
    set(state => ({
      algorithms: { ...state.algorithms, queue: strategy },
      queueInstance,
    }));
  },

  setCacheStrategy: (strategy: CacheStrategy) => {
    let cacheInstance: LRUCache | LFUCache | FIFOCache;
    switch (strategy) {
      case 'LFU':
        cacheInstance = new LFUCache(5);
        break;
      case 'FIFO':
        cacheInstance = new FIFOCache(5);
        break;
      default:
        cacheInstance = new LRUCache(5);
    }
    
    set(state => ({
      algorithms: { ...state.algorithms, cache: strategy },
      cache: { ...state.cache, strategy },
      cacheInstance,
    }));
  },

  setPathStrategy: (strategy: PathStrategy) => {
    let pathInstance: DijkstraPathfinder | AStarPathfinder | GreedyPathfinder;
    switch (strategy) {
      case 'A_STAR':
        pathInstance = new AStarPathfinder();
        break;
      case 'GREEDY':
        pathInstance = new GreedyPathfinder();
        break;
      default:
        pathInstance = new DijkstraPathfinder();
    }
    
    set(state => ({
      algorithms: { ...state.algorithms, path: strategy },
      pathInstance,
    }));
  },

  setSpeed: (speed: number) => set({ speed }),

  tick: () => {
    const state = get();
    if (state.status !== 'running') return;

    const newTime = state.currentTime + 1;
    let newScore = state.score;
    let newOrders = [...state.orders];
    let newChefs = [...state.chefs];
    let newCompletedOrders = [...state.completedOrders];
    let newProblemOrders = [...state.problemOrders];
    let newActiveDeliveries = [...state.activeDeliveries];
    
    if (state.cacheInstance) {
      state.cacheInstance.setCurrentTime(newTime);
    }

    const arrivedOrders = newOrders.filter(
      o => o.arriveTime <= newTime && o.status === 'waiting' && !state.queueInstance?.getAll().find(q => q.id === o.id)
    );
    
    arrivedOrders.forEach(order => {
      state.queueInstance?.enqueue(order);
      state.addTraceEvent(order.id, {
        timestamp: newTime,
        type: 'queue',
        description: `${order.customerName}的订单加入队列`,
      });
    });

    newChefs = newChefs.map(chef => {
      if (chef.status === 'idle') {
        const nextOrder = state.queueInstance?.dequeue();
        if (nextOrder) {
          const orderIndex = newOrders.findIndex(o => o.id === nextOrder.id);
          if (orderIndex !== -1) {
            newOrders[orderIndex] = {
              ...newOrders[orderIndex],
              status: 'processing',
              assignedChefId: chef.id,
              startTime: newTime,
            };
            state.addTraceEvent(nextOrder.id, {
              timestamp: newTime,
              type: 'assign',
              description: `订单分配给${chef.name}`,
              relatedEntityId: chef.id,
            });
            state.addTraceEvent(nextOrder.id, {
              timestamp: newTime,
              type: 'start',
              description: `开始制作`,
            });

            if (state.cacheInstance) {
              nextOrder.items.forEach(item => {
                const cached = state.cacheInstance?.get(item.menuId);
                if (cached) {
                  state.addTraceEvent(nextOrder.id, {
                    timestamp: newTime,
                    type: 'cache_hit',
                    description: `${item.menuName}缓存命中`,
                    relatedEntityId: item.menuId,
                  });
                  newScore += 20;
                } else {
                  state.cacheInstance?.put(item.menuId);
                  state.addTraceEvent(nextOrder.id, {
                    timestamp: newTime,
                    type: 'cache_miss',
                    description: `${item.menuName}缓存未命中，已加入缓存`,
                    relatedEntityId: item.menuId,
                  });
                }
              });
            }
          }
          
          const totalPrepTime = nextOrder.items.reduce(
            (sum, item) => sum + item.prepTime * item.quantity,
            0
          );
          
          return {
            ...chef,
            status: 'busy',
            currentOrderId: nextOrder.id,
            progress: (1 / (totalPrepTime / chef.efficiency)) * 100,
          };
        }
      } else if (chef.status === 'busy' && chef.currentOrderId) {
        const order = newOrders.find(o => o.id === chef.currentOrderId);
        if (order && order.startTime !== undefined) {
          const totalPrepTime = order.items.reduce(
            (sum, item) => sum + item.prepTime * item.quantity,
            0
          );
          const elapsed = newTime - order.startTime;
          const adjustedPrepTime = totalPrepTime / chef.efficiency;
          
          if (elapsed >= adjustedPrepTime) {
            const orderIndex = newOrders.findIndex(o => o.id === chef.currentOrderId);
            if (orderIndex !== -1) {
              const waitTime = newTime - order.arriveTime;
              newOrders[orderIndex] = {
                ...newOrders[orderIndex],
                status: 'completed',
                endTime: newTime,
                waitTime,
              };
              
              newCompletedOrders.push(newOrders[orderIndex]);
              newScore += Math.round(100 * (order.totalPrice / 50));
              
              if (newTime > order.deadline) {
                newScore -= 50;
              }
              
              const kitchen = state.pathNodes.find(n => n.type === 'kitchen');
              const table = state.pathNodes.find(n => n.id === `t${order.tableNumber}`);
              if (kitchen && table && state.pathInstance) {
                const pathResult = state.pathInstance.findPath(kitchen, table, state.pathNodes);
                newOrders[orderIndex].pathDistance = pathResult.distance;
                newOrders[orderIndex].optimalDistance = pathResult.optimalDistance;
                
                if (!pathResult.optimal && pathResult.distance > pathResult.optimalDistance * 1.1) {
                  newScore -= 20;
                  state.addProblemOrder({
                    orderId: order.id,
                    type: 'path_detour',
                    severity: 'medium',
                    description: `送餐路径绕远，实际距离${pathResult.distance.toFixed(1)}，最优距离${pathResult.optimalDistance.toFixed(1)}`,
                    responsible: '路径算法选择',
                    fixSuggestion: `建议换用DIJKSTRA算法，当前使用${state.algorithms.path}`,
                  });
                } else {
                  newScore += 10;
                }
                
                state.addTraceEvent(order.id, {
                  timestamp: newTime,
                  type: 'complete',
                  description: `订单制作完成`,
                });
                state.addTraceEvent(order.id, {
                  timestamp: newTime,
                  type: 'deliver',
                  description: `开始送餐到${order.tableNumber}号桌`,
                });
                
                newActiveDeliveries.push({
                  orderId: order.id,
                  path: pathResult.path,
                  currentIndex: 0,
                });
              }
            }
            
            return {
              ...chef,
              status: 'idle',
              currentOrderId: undefined,
              progress: 0,
            };
          } else {
            return {
              ...chef,
              progress: (elapsed / adjustedPrepTime) * 100,
            };
          }
        }
      }
      return chef;
    });

    newOrders.forEach(order => {
      if (order.status === 'waiting' && newTime > order.deadline + 30) {
        const orderIndex = newOrders.findIndex(o => o.id === order.id);
        if (orderIndex !== -1 && order.status === 'waiting') {
          newOrders[orderIndex] = { ...order, status: 'starved' };
          newScore -= 40;
          state.addProblemOrder({
            orderId: order.id,
            type: 'starvation',
            severity: 'high',
            description: `订单饥饿，等待时间超过${newTime - order.arriveTime}单位时间`,
            responsible: '队列策略选择',
            fixSuggestion: `建议检查队列策略，当前使用${state.algorithms.queue}，长订单可能被短订单阻塞`,
          });
        }
      }
    });

    newActiveDeliveries = newActiveDeliveries.map(delivery => ({
      ...delivery,
      currentIndex: Math.min(delivery.currentIndex + 1, delivery.path.length - 1),
    })).filter(d => d.currentIndex < d.path.length - 1);

    const allOrdersProcessed = newOrders.every(
      o => o.status === 'completed' || o.status === 'timeout' || o.status === 'starved'
    );
    const allChefsIdle = newChefs.every(c => c.status === 'idle');
    const allDeliveriesComplete = newActiveDeliveries.length === 0;

    if (allOrdersProcessed && allChefsIdle && allDeliveriesComplete && newTime > 10) {
      set({
        status: 'ended',
        currentTime: newTime,
        score: newScore,
        orders: newOrders,
        chefs: newChefs,
        completedOrders: newCompletedOrders,
        problemOrders: newProblemOrders,
        cache: {
          ...state.cache,
          items: state.cacheInstance?.getAll() || [],
          hitCount: state.cacheInstance?.getStats().hits || 0,
          missCount: state.cacheInstance?.getStats().misses || 0,
        },
        activeDeliveries: newActiveDeliveries,
      });
      return;
    }

    set({
      currentTime: newTime,
      score: newScore,
      orders: newOrders,
      chefs: newChefs,
      completedOrders: newCompletedOrders,
      problemOrders: newProblemOrders,
      cache: {
        ...state.cache,
        items: state.cacheInstance?.getAll() || [],
        hitCount: state.cacheInstance?.getStats().hits || 0,
        missCount: state.cacheInstance?.getStats().misses || 0,
      },
      activeDeliveries: newActiveDeliveries,
    });
  },

  addTraceEvent: (orderId: string, event: TraceEvent) => {
    set(state => ({
      traceLinks: state.traceLinks.map(link =>
        link.orderId === orderId
          ? { ...link, events: [...link.events, event] }
          : link
      ),
    }));
  },

  addProblemOrder: (problem: ProblemOrder) => {
    set(state => ({
      problemOrders: [...state.problemOrders, problem],
    }));
  },

  getOrderTrace: (orderId: string) => {
    return get().traceLinks.find(link => link.orderId === orderId);
  },

  getStats: () => {
    const state = get();
    const total = state.orders.length;
    const completed = state.completedOrders.length;
    const timeout = state.orders.filter(o => o.status === 'timeout').length;
    const starved = state.orders.filter(o => o.status === 'starved').length;
    
    const waitTimes = state.completedOrders
      .filter(o => o.waitTime !== undefined)
      .map(o => o.waitTime!);
    const avgWait = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    const cacheStats = state.cacheInstance?.getStats() || { hits: 0, misses: 0, hitRate: 0 };
    
    const pathDistances = state.completedOrders
      .filter(o => o.pathDistance !== undefined && o.optimalDistance !== undefined);
    const pathEfficiency = pathDistances.length > 0
      ? pathDistances.reduce((sum, o) => sum + (o.optimalDistance! / o.pathDistance!), 0) / pathDistances.length
      : 1;

    return {
      totalOrders: total,
      completedOrders: completed,
      timeoutOrders: timeout,
      starvedOrders: starved,
      averageWaitTime: avgWait,
      cacheHitRate: cacheStats.hitRate,
      totalScore: state.score,
      pathEfficiency,
    };
  },
}));
