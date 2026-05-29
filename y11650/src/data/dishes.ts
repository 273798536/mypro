import type { Dish, Allergen } from '../types/game'

export const DISHES: Dish[] = [
  { id: 'd1', name: '红烧鸡块', emoji: '🍗', allergens: [], prepTime: 3000 },
  { id: 'd2', name: '番茄炒蛋', emoji: '🍳', allergens: ['鸡蛋'], prepTime: 2500 },
  { id: 'd3', name: '花生酱拌面', emoji: '🍜', allergens: ['花生', '小麦'], prepTime: 2000 },
  { id: 'd4', name: '牛奶布丁', emoji: '🍮', allergens: ['牛奶', '鸡蛋'], prepTime: 1500 },
  { id: 'd5', name: '海鲜炒饭', emoji: '🍤', allergens: ['海鲜', '鸡蛋'], prepTime: 3500 },
  { id: 'd6', name: '蔬菜沙拉', emoji: '🥗', allergens: [], prepTime: 1500 },
  { id: 'd7', name: '豆浆油条', emoji: '🥛', allergens: ['大豆', '小麦'], prepTime: 2000 },
  { id: 'd8', name: '红烧鱼', emoji: '🐟', allergens: ['海鲜'], prepTime: 3500 },
  { id: 'd9', name: '鸡蛋面', emoji: '🍝', allergens: ['鸡蛋', '小麦'], prepTime: 2500 },
  { id: 'd10', name: '花生糖', emoji: '🍬', allergens: ['花生'], prepTime: 1000 },
  { id: 'd11', name: '白米饭', emoji: '🍚', allergens: [], prepTime: 1000 },
  { id: 'd12', name: '牛肉面', emoji: '🍖', allergens: ['小麦'], prepTime: 3000 },
]

export function getDishById(id: string): Dish | undefined {
  return DISHES.find(d => d.id === id)
}

export function getDishesByIds(ids: string[]): Dish[] {
  return ids.map(id => DISHES.find(d => d.id === id)).filter(Boolean) as Dish[]
}

export function hasAllergenConflict(dishIds: string[], studentAllergens: Allergen[]): Allergen[] {
  const dishAllergens = dishIds.flatMap(id => {
    const dish = DISHES.find(d => d.id === id)
    return dish ? dish.allergens : []
  })
  return studentAllergens.filter(a => dishAllergens.includes(a))
}
