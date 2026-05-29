import { Order, Chef, MenuItem } from '../types/game';

export interface ValidationError {
  field: string;
  recordId?: string;
  message: string;
  fixHint: string;
}

export interface ValidationWarning {
  field: string;
  recordId?: string;
  message: string;
  suggestion: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export function validateOrders(orders: Partial<Order>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  orders.forEach((order, index) => {
    const orderId = order.id || `order_${index}`;
    
    if (!order.id) {
      errors.push({
        field: 'id',
        recordId: orderId,
        message: '订单缺少唯一标识ID',
        fixHint: `建议添加 id: "o${index + 1}"`,
      });
    }

    if (!order.customerName) {
      errors.push({
        field: 'customerName',
        recordId: orderId,
        message: '订单缺少顾客姓名',
        fixHint: '建议添加 customerName: "顾客姓名"',
      });
    }

    if (!order.items || order.items.length === 0) {
      errors.push({
        field: 'items',
        recordId: orderId,
        message: '订单缺少菜品项目',
        fixHint: '建议添加 items: [{ menuId: "m1", menuName: "菜名", quantity: 1, prepTime: 10 }]',
      });
    }

    if (order.arriveTime === undefined || order.arriveTime === null) {
      errors.push({
        field: 'arriveTime',
        recordId: orderId,
        message: '订单缺少到达时间',
        fixHint: `建议添加 arriveTime: ${index * 10}`,
      });
    }

    if (order.totalPrice === undefined || order.totalPrice === null) {
      warnings.push({
        field: 'totalPrice',
        recordId: orderId,
        message: '订单缺少总价，将自动计算',
        suggestion: '建议提前计算好总价以提高数据准确性',
      });
    }

    if (!order.priority) {
      warnings.push({
        field: 'priority',
        recordId: orderId,
        message: '订单未设置优先级，默认为 normal',
        suggestion: '可设置为 normal / vip / super_vip',
      });
    }
  });

  if (orders.length < 5) {
    suggestions.push('建议订单数量不少于5个，以获得更好的算法对比效果');
  }

  const hasVIP = orders.some(o => o.priority === 'vip' || o.priority === 'super_vip');
  if (!hasVIP) {
    suggestions.push('建议添加一些VIP订单，以测试优先级队列策略的效果');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

export function validateChefs(chefs: Partial<Chef>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  chefs.forEach((chef, index) => {
    const chefId = chef.id || `chef_${index}`;

    if (!chef.id) {
      errors.push({
        field: 'id',
        recordId: chefId,
        message: '厨师缺少唯一标识ID',
        fixHint: `建议添加 id: "c${index + 1}"`,
      });
    }

    if (!chef.name) {
      errors.push({
        field: 'name',
        recordId: chefId,
        message: '厨师缺少姓名',
        fixHint: '建议添加 name: "厨师姓名"',
      });
    }

    if (chef.efficiency === undefined || chef.efficiency === null) {
      warnings.push({
        field: 'efficiency',
        recordId: chefId,
        message: '厨师缺少效率值，默认为 1.0',
        suggestion: '效率值影响做菜速度，建议设置在 0.8-1.2 之间',
      });
    }

    if (!chef.skillLevel) {
      warnings.push({
        field: 'skillLevel',
        recordId: chefId,
        message: '厨师缺少技能等级，默认为 3',
        suggestion: '技能等级建议设置为 1-5',
      });
    }
  });

  if (chefs.length < 2) {
    suggestions.push('建议厨师数量不少于2个，以观察并行处理效果');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

export function validateMenu(menu: Partial<MenuItem>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  menu.forEach((item, index) => {
    const itemId = item.id || `menu_${index}`;

    if (!item.id) {
      errors.push({
        field: 'id',
        recordId: itemId,
        message: '菜品缺少唯一标识ID',
        fixHint: `建议添加 id: "m${index + 1}"`,
      });
    }

    if (!item.name) {
      errors.push({
        field: 'name',
        recordId: itemId,
        message: '菜品缺少名称',
        fixHint: '建议添加 name: "菜品名称"',
      });
    }

    if (item.price === undefined || item.price === null) {
      errors.push({
        field: 'price',
        recordId: itemId,
        message: '菜品缺少价格',
        fixHint: '建议添加 price: 价格数字',
      });
    }

    if (item.prepTime === undefined || item.prepTime === null) {
      errors.push({
        field: 'prepTime',
        recordId: itemId,
        message: '菜品缺少准备时间',
        fixHint: '建议添加 prepTime: 准备时间(单位: 游戏时间单位)',
      });
    }

    if (!item.category) {
      warnings.push({
        field: 'category',
        recordId: itemId,
        message: '菜品缺少分类，默认为 "热菜"',
        suggestion: '可分类为：热菜、素菜、主食、汤品、凉菜',
      });
    }
  });

  if (menu.length < 5) {
    suggestions.push('建议菜单菜品不少于5个，以更好地测试缓存策略');
  }

  const categories = [...new Set(menu.map(m => m.category))];
  if (categories.length < 3) {
    suggestions.push('建议菜品种类更丰富一些，涵盖至少3个分类');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

export function autoFixOrders(orders: Partial<Order>[]): Order[] {
  return orders.map((order, index) => ({
    id: order.id || `o${index + 1}`,
    customerId: order.customerId || `cust${index + 1}`,
    customerName: order.customerName || `顾客${index + 1}`,
    items: order.items || [],
    priority: order.priority || 'normal',
    arriveTime: order.arriveTime ?? index * 10,
    deadline: order.deadline ?? (index * 10 + 60),
    status: 'waiting',
    totalPrice: order.totalPrice ?? order.items?.reduce((sum, item) => sum + (item.prepTime || 10) * 3, 0) ?? 50,
    tableNumber: order.tableNumber ?? ((index % 8) + 1),
  })) as Order[];
}

export function autoFixChefs(chefs: Partial<Chef>[]): Chef[] {
  return chefs.map((chef, index) => ({
    id: chef.id || `c${index + 1}`,
    name: chef.name || `厨师${index + 1}`,
    efficiency: chef.efficiency ?? 1.0,
    status: 'idle',
    skillLevel: chef.skillLevel ?? 3,
    progress: 0,
  })) as Chef[];
}

export function autoFixMenu(menu: Partial<MenuItem>[]): MenuItem[] {
  return menu.map((item, index) => ({
    id: item.id || `m${index + 1}`,
    name: item.name || `菜品${index + 1}`,
    price: item.price ?? 30,
    prepTime: item.prepTime ?? 15,
    category: item.category || '热菜',
    emoji: item.emoji || '🍽️',
  })) as MenuItem[];
}
