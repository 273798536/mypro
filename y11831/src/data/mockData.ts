import { MenuItem, Chef, Order, PathNode } from '../types/game';

export const mockMenu: MenuItem[] = [
  { id: 'm1', name: '宫保鸡丁', price: 38, prepTime: 15, category: '热菜', emoji: '🍗' },
  { id: 'm2', name: '红烧肉', price: 58, prepTime: 25, category: '热菜', emoji: '🥩' },
  { id: 'm3', name: '清炒时蔬', price: 22, prepTime: 8, category: '素菜', emoji: '🥬' },
  { id: 'm4', name: '蛋炒饭', price: 18, prepTime: 10, category: '主食', emoji: '🍚' },
  { id: 'm5', name: '番茄蛋汤', price: 16, prepTime: 8, category: '汤品', emoji: '🍲' },
  { id: 'm6', name: '麻婆豆腐', price: 28, prepTime: 12, category: '热菜', emoji: '🧈' },
  { id: 'm7', name: '糖醋里脊', price: 48, prepTime: 20, category: '热菜', emoji: '🍖' },
  { id: 'm8', name: '凉拌黄瓜', price: 12, prepTime: 5, category: '凉菜', emoji: '🥒' },
];

export const mockChefs: Chef[] = [
  { id: 'c1', name: '张师傅', efficiency: 1.2, status: 'idle', skillLevel: 5, progress: 0 },
  { id: 'c2', name: '李师傅', efficiency: 1.0, status: 'idle', skillLevel: 4, progress: 0 },
  { id: 'c3', name: '王师傅', efficiency: 0.9, status: 'idle', skillLevel: 3, progress: 0 },
];

const customerNames = ['小明', '小红', '小华', '小丽', '小强', '小芳', '小军', '小燕', '小龙', '小凤'];

export const generateMockOrders = (count: number = 10): Order[] => {
  const orders: Order[] = [];
  for (let i = 0; i < count; i++) {
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: Order['items'] = [];
    let totalPrice = 0;
    let totalPrepTime = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const menuItem = mockMenu[Math.floor(Math.random() * mockMenu.length)];
      const quantity = Math.floor(Math.random() * 2) + 1;
      items.push({
        menuId: menuItem.id,
        menuName: menuItem.name,
        quantity,
        prepTime: menuItem.prepTime,
      });
      totalPrice += menuItem.price * quantity;
      totalPrepTime += menuItem.prepTime * quantity;
    }

    const priorities: Order['priority'][] = ['normal', 'normal', 'normal', 'vip', 'super_vip'];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    
    orders.push({
      id: `o${i + 1}`,
      customerId: `cust${i + 1}`,
      customerName: customerNames[i % customerNames.length],
      items,
      priority,
      arriveTime: i * 8 + Math.floor(Math.random() * 5),
      deadline: i * 8 + totalPrepTime * 2 + 30,
      status: 'waiting',
      totalPrice,
      tableNumber: (i % 8) + 1,
    });
  }
  return orders.sort((a, b) => a.arriveTime - b.arriveTime);
};

export const mockOrders: Order[] = generateMockOrders(12);

export const mockPathNodes: PathNode[] = [
  { id: 'kitchen', x: 50, y: 50, type: 'kitchen', label: '厨房' },
  { id: 'hall', x: 50, y: 120, type: 'corridor', label: '大厅' },
  { id: 't1', x: 20, y: 180, type: 'table', label: '1号桌' },
  { id: 't2', x: 50, y: 180, type: 'table', label: '2号桌' },
  { id: 't3', x: 80, y: 180, type: 'table', label: '3号桌' },
  { id: 't4', x: 20, y: 250, type: 'table', label: '4号桌' },
  { id: 't5', x: 50, y: 250, type: 'table', label: '5号桌' },
  { id: 't6', x: 80, y: 250, type: 'table', label: '6号桌' },
  { id: 't7', x: 20, y: 320, type: 'table', label: '7号桌' },
  { id: 't8', x: 80, y: 320, type: 'table', label: '8号桌' },
  { id: 'entrance', x: 50, y: 380, type: 'entrance', label: '入口' },
];

export const pathConnections: Record<string, string[]> = {
  'kitchen': ['hall'],
  'hall': ['kitchen', 't1', 't2', 't3', 't4', 't5', 't6'],
  't1': ['hall', 't4'],
  't2': ['hall', 't5'],
  't3': ['hall', 't6'],
  't4': ['t1', 't7', 't5'],
  't5': ['t2', 't4', 't6', 'entrance'],
  't6': ['t3', 't5', 't8'],
  't7': ['t4'],
  't8': ['t6'],
  'entrance': ['t5'],
};

export const getDistance = (node1: PathNode, node2: PathNode): number => {
  return Math.sqrt(Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2));
};
