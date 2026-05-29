import type { MinecartConfig } from '../types/game';

export const DEFAULT_CART: MinecartConfig = {
  id: 'default-001',
  name: '标准矿车 MK-1',
  mass: 100,
  friction: 0.5,
  energyConsumption: 0.8,
  maxSpeed: 5,
  acceleration: 1.0,
};

export const HEAVY_CART: MinecartConfig = {
  id: 'heavy-001',
  name: '重型矿车 HK-1',
  mass: 150,
  friction: 0.7,
  energyConsumption: 1.2,
  maxSpeed: 3.5,
  acceleration: 0.7,
};

export const FAST_CART: MinecartConfig = {
  id: 'fast-001',
  name: '快速矿车 FK-1',
  mass: 70,
  friction: 0.3,
  energyConsumption: 1.5,
  maxSpeed: 7,
  acceleration: 1.5,
};

export const EFFICIENT_CART: MinecartConfig = {
  id: 'efficient-001',
  name: '节能矿车 EK-1',
  mass: 90,
  friction: 0.4,
  energyConsumption: 0.5,
  maxSpeed: 4,
  acceleration: 0.8,
};

export const MINECART_CONFIGS: MinecartConfig[] = [
  DEFAULT_CART,
  HEAVY_CART,
  FAST_CART,
  EFFICIENT_CART,
];

export function getMinecartConfigById(id: string): MinecartConfig | undefined {
  return MINECART_CONFIGS.find((c) => c.id === id);
}
