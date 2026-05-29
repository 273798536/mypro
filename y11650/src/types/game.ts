export type Grade = '一年级' | '二年级' | '三年级' | '四年级' | '五年级' | '六年级'

export type Allergen = '花生' | '牛奶' | '鸡蛋' | '小麦' | '海鲜' | '大豆'

export interface Dish {
  id: string
  name: string
  emoji: string
  allergens: Allergen[]
  prepTime: number
}

export interface Order {
  id: string
  grade: Grade
  dishIds: string[]
  allergens: Allergen[]
  targetWindowId: string
  createdAt: number
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'failed'
  correctionCount: number
}

export interface PrepSlot {
  id: string
  orderId: string | null
  progress: number
}

export interface PickupWindow {
  id: string
  name: string
  grade: Grade
  queue: string[]
  maxQueue: number
}

export interface ActionLog {
  id: string
  timestamp: number
  type: 'correct' | 'error' | 'warning'
  category: 'allergy_mismatch' | 'window_congestion' | 'food_waste' | 'grade_mismatch' | 'correct_delivery' | 'combo' | 'correction'
  action: string
  details: Record<string, unknown>
  points: number
  orderId?: string
  source?: string
}

export interface ReplayFrame {
  timestamp: number
  score: number
  orders: Order[]
  prepSlots: PrepSlot[]
  windows: PickupWindow[]
  action?: ActionLog
}

export interface ServiceReport {
  sessionId: string
  levelId: string
  unhandled: Order[]
  corrected: ActionLog[]
  needReview: ActionLog[]
  statistics: {
    totalOrders: number
    delivered: number
    allergyMismatches: number
    windowCongestions: number
    foodWaste: number
    gradeMismatches: number
    accuracy: number
  }
}

export interface LevelConfig {
  id: string
  name: string
  description: string
  difficulty: number
  duration: number
  orderIntervalMin: number
  orderIntervalMax: number
  windowConfigs: { grade: Grade; maxQueue: number }[]
  prepSlotCount: number
  targetScore: number
}

export interface GameSession {
  id: string
  levelId: string
  startTime: number
  endTime: number
  score: number
  maxScore: number
  actions: ActionLog[]
  orders: Order[]
  replay: ReplayFrame[]
  finalReport: ServiceReport | null
}

export interface FloatingScore {
  id: string
  x: number
  y: number
  points: number
  type: 'correct' | 'error'
  createdAt: number
}

export const GRADE_COLORS: Record<Grade, string> = {
  '一年级': '#FF6B6B',
  '二年级': '#4ECDC4',
  '三年级': '#45B7D1',
  '四年级': '#96CEB4',
  '五年级': '#FFEAA7',
  '六年级': '#DDA0DD',
}

export const ALLERGEN_ICONS: Record<Allergen, string> = {
  '花生': '🥜',
  '牛奶': '🥛',
  '鸡蛋': '🥚',
  '小麦': '🌾',
  '海鲜': '🦐',
  '大豆': '🫘',
}
