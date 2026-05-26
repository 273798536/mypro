import { OrderBook, OrderBookLevel, GameEvent } from './types';
import { GAME_CONFIG } from './config';

export function generateInitialOrderBook(basePrice: number): OrderBook {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  
  for (let i = 0; i < GAME_CONFIG.ORDER_BOOK_DEPTH; i++) {
    const bidPrice = +(basePrice - (i + 1) * GAME_CONFIG.TICK_SIZE * 5).toFixed(2);
    const askPrice = +(basePrice + (i + 1) * GAME_CONFIG.TICK_SIZE * 5).toFixed(2);
    const bidQty = Math.floor(10 + Math.random() * 30);
    const askQty = Math.floor(10 + Math.random() * 30);
    
    bids.push({ price: bidPrice, quantity: bidQty });
    asks.push({ price: askPrice, quantity: askQty });
  }
  
  return {
    bids,
    asks,
    lastPrice: basePrice,
  };
}

export function generateNextPrice(
  currentPrice: number,
  volatility: number,
  trend: number,
  activeEvents: GameEvent[]
): number {
  let effectiveVolatility = volatility;
  let priceJump = 0;
  
  for (const event of activeEvents) {
    if (event.type === 'volatility_spike') {
      effectiveVolatility *= event.effect.volatilityMultiplier || 2;
    }
    if (event.type === 'price_jump') {
      priceJump = event.effect.priceChange || 0;
    }
  }
  
  const drift = trend * currentPrice * 0.0001;
  const shock = (Math.random() - 0.5) * 2 * effectiveVolatility * currentPrice;
  
  return +(currentPrice + drift + shock + priceJump).toFixed(2);
}

export function updateOrderBook(
  orderBook: OrderBook,
  newPrice: number,
  activeEvents: GameEvent[]
): OrderBook {
  let depthMultiplier = 1;
  for (const event of activeEvents) {
    if (event.type === 'liquidity_crisis') {
      depthMultiplier = event.effect.depthMultiplier || 0.5;
    }
  }
  
  const newBids: OrderBookLevel[] = [];
  const newAsks: OrderBookLevel[] = [];
  
  const spread = orderBook.asks[0]?.price - orderBook.bids[0]?.price || 0.1;
  const midPrice = newPrice;
  
  for (let i = 0; i < GAME_CONFIG.ORDER_BOOK_DEPTH; i++) {
    const bidPrice = +(midPrice - (i + 1) * spread / GAME_CONFIG.ORDER_BOOK_DEPTH).toFixed(2);
    const askPrice = +(midPrice + (i + 1) * spread / GAME_CONFIG.ORDER_BOOK_DEPTH).toFixed(2);
    const baseQty = Math.floor(10 + Math.random() * 30);
    
    newBids.push({
      price: bidPrice,
      quantity: Math.max(1, Math.floor(baseQty * depthMultiplier)),
    });
    newAsks.push({
      price: askPrice,
      quantity: Math.max(1, Math.floor(baseQty * depthMultiplier)),
    });
  }
  
  return {
    bids: newBids,
    asks: newAsks,
    lastPrice: newPrice,
  };
}

export function checkOrderExecution(
  order: { side: 'buy' | 'sell'; price: number },
  orderBook: OrderBook,
  currentPrice: number
): { executed: boolean; fillPrice: number } {
  if (order.side === 'buy') {
    if (order.price >= orderBook.asks[0]?.price) {
      return { executed: true, fillPrice: orderBook.asks[0].price };
    }
    const spread = orderBook.asks[0]?.price - order.price;
    const probability = Math.max(0, 1 - spread / (currentPrice * 0.01));
    if (Math.random() < probability * 0.15) {
      return { executed: true, fillPrice: order.price };
    }
  } else {
    if (order.price <= orderBook.bids[0]?.price) {
      return { executed: true, fillPrice: orderBook.bids[0].price };
    }
    const spread = order.price - orderBook.bids[0]?.price;
    const probability = Math.max(0, 1 - spread / (currentPrice * 0.01));
    if (Math.random() < probability * 0.15) {
      return { executed: true, fillPrice: order.price };
    }
  }
  
  return { executed: false, fillPrice: 0 };
}

export function calculateInventoryPenalty(
  inventory: number,
  currentPrice: number,
  penaltyCoeff: number
): number {
  const excess = Math.max(0, Math.abs(inventory) - GAME_CONFIG.INVENTORY_THRESHOLD);
  return +(excess * penaltyCoeff * currentPrice * 0.01).toFixed(2);
}

export function calculateUnrealizedPnL(
  inventory: number,
  avgCost: number,
  currentPrice: number
): number {
  if (inventory === 0) return 0;
  return +(inventory * (currentPrice - avgCost)).toFixed(2);
}

export function calculateTradePnL(
  side: 'buy' | 'sell',
  price: number,
  quantity: number,
  currentInventory: number,
  currentAvgCost: number
): { pnl: number; newAvgCost: number; newInventory: number } {
  let pnl = 0;
  let newAvgCost = currentAvgCost;
  let newInventory = currentInventory;
  
  if (side === 'buy') {
    const totalQty = Math.abs(currentInventory) + quantity;
    if (currentInventory >= 0) {
      newAvgCost = (currentInventory * currentAvgCost + quantity * price) / totalQty;
    } else {
      const closeQty = Math.min(quantity, Math.abs(currentInventory));
      pnl = closeQty * (currentAvgCost - price);
      const remainingQty = quantity - closeQty;
      if (remainingQty > 0) {
        newAvgCost = price;
      }
    }
    newInventory = currentInventory + quantity;
  } else {
    const totalQty = Math.abs(currentInventory) + quantity;
    if (currentInventory <= 0) {
      newAvgCost = (Math.abs(currentInventory) * currentAvgCost + quantity * price) / totalQty;
    } else {
      const closeQty = Math.min(quantity, currentInventory);
      pnl = closeQty * (price - currentAvgCost);
      const remainingQty = quantity - closeQty;
      if (remainingQty > 0) {
        newAvgCost = price;
      }
    }
    newInventory = currentInventory - quantity;
  }
  
  return {
    pnl: +pnl.toFixed(2),
    newAvgCost: +newAvgCost.toFixed(2),
    newInventory,
  };
}
