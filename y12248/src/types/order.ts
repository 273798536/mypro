export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CacheResult = 'hit' | 'miss' | 'expired';

export interface PatienceHistory {
  time: number;
  value: number;
}

export interface CacheCheck {
  checkedAt: number;
  result: CacheResult;
  cacheVersion?: string;
}

export interface Order {
  id: string;
  dishId: string;
  dishName: string;
  createdAt: number;
  expectedAt: number;
  patience: number;
  maxPatience: number;
  priority: Priority;
  status: OrderStatus;
  cacheCheck?: CacheCheck;
  patienceHistory: PatienceHistory[];
  servedWithDirty?: boolean;
  dirtySpreadChain?: string[];
  expiredMisread?: boolean;
  sourceRequestId?: string;
  completedAt?: number;
}

export interface SourceRequest {
  id: string;
  dishId: string;
  dishName: string;
  orderIds: string[];
  createdAt: number;
  duration: number;
  progress: number;
  status: 'pending' | 'cooking' | 'completed';
}

export const DISHES = [
  { id: 'dish-001', name: '宫保鸡丁', cookTime: 3000, ttl: 8000 },
  { id: 'dish-002', name: '麻婆豆腐', cookTime: 2500, ttl: 10000 },
  { id: 'dish-003', name: '红烧肉', cookTime: 5000, ttl: 15000 },
  { id: 'dish-004', name: '清蒸鲈鱼', cookTime: 6000, ttl: 12000 },
  { id: 'dish-005', name: '蒜蓉西兰花', cookTime: 2000, ttl: 6000 },
  { id: 'dish-006', name: '糖醋里脊', cookTime: 4000, ttl: 9000 },
  { id: 'dish-007', name: '西红柿炒蛋', cookTime: 1500, ttl: 5000 },
  { id: 'dish-008', name: '酸辣土豆丝', cookTime: 2000, ttl: 7000 },
];

export const PRIORITY_CONFIG: Record<Priority, { patience: number; color: string; label: string }> = {
  low: { patience: 100, color: '#9E9E9E', label: '闲时' },
  normal: { patience: 80, color: '#4CAF50', label: '普通' },
  high: { patience: 60, color: '#FF9800', label: '加急' },
  urgent: { patience: 40, color: '#F44336', label: '特急' },
};
