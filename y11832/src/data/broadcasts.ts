import { Broadcast } from '../types';

const STORAGE_KEY = 'metro_evacuation_broadcasts';

export const defaultBroadcasts: Broadcast[] = [
  {
    id: 'broadcast-001',
    category: 'evacuation',
    title: '紧急疏散广播',
    content: '各位乘客请注意，本站发生设备故障，请不要惊慌，听从工作人员指引，有序前往最近的出口疏散。',
    cooldownSeconds: 30,
    relatedLocations: ['gate-01', 'gate-02', 'gate-03', 'gate-04', 'gate-05'],
    triggerCondition: 'fault_detected',
  },
  {
    id: 'broadcast-002',
    category: 'diversion',
    title: '闸机故障分流',
    content: '各位乘客请注意，3号闸机发生故障，请绕行至1号、2号、4号或5号闸机通行，感谢您的配合。',
    cooldownSeconds: 20,
    relatedLocations: ['gate-03'],
    triggerCondition: 'gate_fault',
  },
  {
    id: 'broadcast-003',
    category: 'diversion',
    title: 'A出口分流引导',
    content: '各位乘客请注意，B出口目前较为拥挤，请选择A出口或C出口出站，以加快疏散速度。',
    cooldownSeconds: 25,
    relatedLocations: ['exit-b'],
    triggerCondition: 'exit_congestion',
  },
  {
    id: 'broadcast-004',
    category: 'lockdown',
    title: '区域封控通知',
    content: '各位乘客请注意，3号闸机区域正在进行设备抢修，请不要靠近，听从现场工作人员指引。',
    cooldownSeconds: 45,
    relatedLocations: ['gate-03'],
    triggerCondition: 'lockdown_set',
  },
  {
    id: 'broadcast-005',
    category: 'reassurance',
    title: '安抚广播',
    content: '各位乘客请保持冷静，我们正在全力处理设备故障，预计10分钟内恢复正常，请耐心等候。',
    cooldownSeconds: 60,
    relatedLocations: [],
    triggerCondition: 'high_stress',
  },
  {
    id: 'broadcast-006',
    category: 'diversion',
    title: 'C出口优先引导',
    content: '前往XX路方向的乘客，请选择C出口出站，该出口目前通行顺畅。',
    cooldownSeconds: 30,
    relatedLocations: ['exit-c'],
  },
  {
    id: 'broadcast-007',
    category: 'evacuation',
    title: '老人儿童优先',
    content: '请各位乘客为老人、儿童和孕妇让出优先通道，确保他们能够安全快速疏散。',
    cooldownSeconds: 40,
    relatedLocations: ['exit-a', 'exit-b', 'exit-c'],
  },
  {
    id: 'broadcast-008',
    category: 'lockdown',
    title: '禁止逆行警告',
    content: '请所有乘客按指引方向前进，不要逆行或返回站台，以免造成混乱。',
    cooldownSeconds: 35,
    relatedLocations: ['gate-01', 'gate-02', 'gate-03', 'gate-04', 'gate-05'],
  },
];

export const loadBroadcasts = (): Broadcast[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load broadcasts:', e);
  }
  return [...defaultBroadcasts];
};

export const saveBroadcasts = (broadcasts: Broadcast[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(broadcasts));
  } catch (e) {
    console.error('Failed to save broadcasts:', e);
  }
};

export const addBroadcast = (broadcast: Omit<Broadcast, 'id'>): Broadcast => {
  const broadcasts = loadBroadcasts();
  const newBroadcast: Broadcast = {
    ...broadcast,
    id: `broadcast-${Date.now()}`,
  };
  broadcasts.push(newBroadcast);
  saveBroadcasts(broadcasts);
  return newBroadcast;
};

export const updateBroadcast = (id: string, updates: Partial<Broadcast>): Broadcast | null => {
  const broadcasts = loadBroadcasts();
  const index = broadcasts.findIndex((b) => b.id === id);
  if (index === -1) return null;
  broadcasts[index] = { ...broadcasts[index], ...updates };
  saveBroadcasts(broadcasts);
  return broadcasts[index];
};

export const deleteBroadcast = (id: string): boolean => {
  const broadcasts = loadBroadcasts();
  const filtered = broadcasts.filter((b) => b.id !== id);
  if (filtered.length === broadcasts.length) return false;
  saveBroadcasts(filtered);
  return true;
};

export const resetBroadcasts = (): Broadcast[] => {
  saveBroadcasts(defaultBroadcasts);
  return [...defaultBroadcasts];
};
