export type OrderStatus = 'waiting' | 'processing' | 'completed' | 'timeout' | 'starved';
export type Priority = 'normal' | 'vip' | 'super_vip';
export type ChefStatus = 'idle' | 'busy' | 'resting';
export type GameStatus = 'idle' | 'running' | 'paused' | 'ended';
export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO';
export type QueueStrategy = 'FIFO' | 'SJF' | 'PRIORITY';
export type PathStrategy = 'DIJKSTRA' | 'A_STAR' | 'GREEDY';
export type ProblemType = 'cache_eviction_error' | 'path_detour' | 'starvation';
export type Severity = 'low' | 'medium' | 'high';
export type NodeType = 'kitchen' | 'table' | 'corridor' | 'entrance';
export type EventType = 'arrive' | 'queue' | 'assign' | 'start' | 'cache_hit' | 'cache_miss' | 'complete' | 'deliver';

export interface OrderItem {
  menuId: string;
  menuName: string;
  quantity: number;
  prepTime: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  priority: Priority;
  arriveTime: number;
  deadline: number;
  status: OrderStatus;
  assignedChefId?: string;
  startTime?: number;
  endTime?: number;
  totalPrice: number;
  tableNumber: number;
  waitTime?: number;
  pathDistance?: number;
  optimalDistance?: number;
}

export interface Chef {
  id: string;
  name: string;
  efficiency: number;
  status: ChefStatus;
  currentOrderId?: string;
  skillLevel: number;
  progress: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  prepTime: number;
  category: string;
  emoji: string;
}

export interface CachedItem {
  menuId: string;
  lastAccessed: number;
  accessCount: number;
  insertedAt: number;
}

export interface EvictionError {
  orderId: string;
  menuId: string;
  timestamp: number;
  description: string;
}

export interface CacheState {
  items: CachedItem[];
  capacity: number;
  strategy: CacheStrategy;
  hitCount: number;
  missCount: number;
  evictionErrors: EvictionError[];
}

export interface PathNode {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  label?: string;
}

export interface PathResult {
  path: PathNode[];
  distance: number;
  optimal: boolean;
  optimalDistance: number;
}

export interface TraceEvent {
  timestamp: number;
  type: EventType;
  description: string;
  relatedEntityId?: string;
}

export interface TraceLink {
  orderId: string;
  events: TraceEvent[];
}

export interface ProblemOrder {
  orderId: string;
  type: ProblemType;
  severity: Severity;
  description: string;
  responsible: string;
  fixSuggestion: string;
}

export interface GameAlgorithms {
  queue: QueueStrategy;
  cache: CacheStrategy;
  path: PathStrategy;
}

export interface GameStats {
  totalOrders: number;
  completedOrders: number;
  timeoutOrders: number;
  starvedOrders: number;
  averageWaitTime: number;
  cacheHitRate: number;
  totalScore: number;
  pathEfficiency: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  currentTime: number;
  speed: number;
  algorithms: GameAlgorithms;
  orders: Order[];
  chefs: Chef[];
  cache: CacheState;
  menu: MenuItem[];
  completedOrders: Order[];
  problemOrders: ProblemOrder[];
  traceLinks: TraceLink[];
  pathNodes: PathNode[];
  activeDeliveries: { orderId: string; path: PathNode[]; currentIndex: number }[];
}
