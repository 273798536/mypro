import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { createCache, LRUCache, LFUCache, FIFOCache, TTLCache } from '../utils/cacheAlgorithms';
import { getNextOrder } from '../utils/schedulers';
import { calculateScoreChange } from '../utils/scoring';
import type { Order, SourceRequest } from '../types/order';
import { DISHES, PRIORITY_CONFIG } from '../types/order';
import type { CacheEntry } from '../types/cache';
import type { Evidence } from '../types/evidence';

let orderIdCounter = 0;
let sourceIdCounter = 0;
let evidenceIdCounter = 0;

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${++orderIdCounter}`;
}

function generateOrder(dishId: string, now: number): Order {
  const dish = DISHES.find(d => d.id === dishId)!;
  const priorities: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'high', 'urgent'];
  const weights = [0.2, 0.5, 0.2, 0.1];
  const rand = Math.random();
  let cumulative = 0;
  let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
  for (let i = 0; i < priorities.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      priority = priorities[i];
      break;
    }
  }
  
  const config = PRIORITY_CONFIG[priority];
  const maxPatience = config.patience * 100;
  
  return {
    id: generateId('order'),
    dishId: dish.id,
    dishName: dish.name,
    createdAt: now,
    expectedAt: now + maxPatience,
    patience: 100,
    maxPatience: 100,
    priority,
    status: 'pending',
    patienceHistory: [{ time: now, value: 100 }],
  };
}

export function useGameLoop() {
  const {
    status,
    speed,
    cacheStrategy,
    queueScheduler,
    startTime,
    totalPauseTime,
    sourceLimit,
    gameDuration,
    orders,
    sourceRequests,
    addOrder,
    updateOrder,
    removeOrder,
    addSourceRequest,
    updateSourceRequest,
    removeSourceRequest,
    setCacheEntries,
    addScore,
    updateStats,
    addEvidence,
    addEventLog,
    endGame,
    setGameStatus,
    cacheEntries,
  } = useGameStore();

  const cacheRef = useRef<LRUCache | LFUCache | FIFOCache | TTLCache | null>(null);
  const lastOrderTimeRef = useRef<number>(0);
  const lastCheckTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const pendingSourcesRef = useRef<Map<string, { resolve: () => void }>>(new Map());

  const createEvidence = useCallback((
    orderId: string | undefined,
    eventType: Evidence['eventType'],
    now: number,
    gameTime: number,
    decision: string,
    scoreChange: number,
    details: Record<string, any>,
    patienceSnapshot?: number
  ): Evidence => {
    return {
      id: `evidence-${++evidenceIdCounter}`,
      orderId,
      eventType,
      timestamp: now,
      gameTime,
      cacheSnapshot: cacheRef.current?.getAll(now) || [],
      patienceSnapshot,
      decision,
      scoreChange,
      details,
    };
  }, []);

  const getGameTime = useCallback((): number => {
    if (!startTime) return 0;
    return performance.now() - startTime - totalPauseTime;
  }, [startTime, totalPauseTime]);

  const checkCacheBreakdown = useCallback((dishId: string, now: number): boolean => {
    const pendingOrders = orders.filter(o => o.dishId === dishId && o.status === 'pending');
    const existingSources = sourceRequests.filter(s => s.dishId === dishId && s.status !== 'completed');
    
    if (pendingOrders.length >= 5 && existingSources.length >= 3) {
      const cache = cacheRef.current;
      if (cache) {
        const result = cache.get(dishId, now);
        if (!result.success) {
          return true;
        }
      }
    }
    return false;
  }, [orders, sourceRequests]);

  const checkDirtySpread = useCallback((order: Order, now: number): boolean => {
    if (order.cacheCheck?.result !== 'expired' && order.status === 'completed') {
      const laterOrders = orders.filter(
        o => o.dishId === order.dishId && 
             o.createdAt > order.createdAt && 
             o.cacheCheck?.result === 'hit'
      );
      return laterOrders.some(o => {
        const cacheEntry = cacheRef.current?.get(order.dishId, now);
        return cacheEntry?.entry?.isDirty;
      });
    }
    return false;
  }, [orders]);

  const processOrder = useCallback((order: Order, now: number) => {
    const cache = cacheRef.current;
    if (!cache) return;

    const gameTime = getGameTime();
    const cacheResult = cache.get(order.dishId, now);
    
    const cacheCheck = {
      checkedAt: now,
      result: (cacheResult.success ? 'hit' : (cacheResult.reason === 'expired' ? 'expired' : 'miss')) as 'hit' | 'miss' | 'expired',
      cacheVersion: cacheResult.entry?.version,
    };

    updateOrder(order.id, { cacheCheck, status: 'processing' });

    if (cacheResult.success && cacheResult.entry) {
      const { change, breakdown } = calculateScoreChange({
        type: 'serve_success',
        cacheHit: true,
      });
      addScore(change, breakdown);
      
      const evidence = createEvidence(
        order.id,
        'cache_check',
        now,
        gameTime,
        `缓存命中，直接出餐`,
        change,
        {
          dishId: order.dishId,
          dishName: order.dishName,
          cacheVersion: cacheResult.entry.version,
          expiresAt: cacheResult.entry.expiresAt,
          remainingTTL: cacheResult.entry.expiresAt - now,
        },
        order.patience
      );
      addEvidence(evidence);

      updateOrder(order.id, { status: 'completed', completedAt: now });
      updateStats({ cacheHits: useGameStore.getState().stats.cacheHits + 1, completedOrders: useGameStore.getState().stats.completedOrders + 1 });
      addEventLog(`✅ ${order.dishName} 缓存命中，出餐成功 +${change}`);

      setTimeout(() => {
        removeOrder(order.id);
      }, 500);
    } else if (cacheResult.reason === 'expired' && cacheResult.entry) {
      updateStats({ cacheExpired: useGameStore.getState().stats.cacheExpired + 1 });
      
      const isDirtySpread = checkDirtySpread(order, now);
      if (isDirtySpread) {
        const { change, breakdown } = calculateScoreChange({ type: 'serve_dirty' });
        addScore(change, breakdown);
        
        const evidence = createEvidence(
          order.id,
          'dirty_spread',
          now,
          gameTime,
          `脏数据扩散：使用过期缓存出餐`,
          change,
          {
            dishId: order.dishId,
            dishName: order.dishName,
            expiredAt: cacheResult.entry.expiresAt,
            expiredDuration: now - cacheResult.entry.expiresAt,
          },
          order.patience
        );
        addEvidence(evidence);
        updateStats({ dirtySpreads: useGameStore.getState().stats.dirtySpreads + 1 });
        addEventLog(`⚠️ ${order.dishName} 脏数据扩散！${change}`);
      }

      const existingSource = sourceRequests.find(
        s => s.dishId === order.dishId && s.status !== 'completed'
      );

      if (existingSource) {
        updateSourceRequest(existingSource.id, {
          orderIds: [...existingSource.orderIds, order.id],
        });
        updateOrder(order.id, { sourceRequestId: existingSource.id });
      } else {
        if (useGameStore.getState().stats.concurrentSource >= sourceLimit) {
          const { change, breakdown } = calculateScoreChange({ type: 'source_limit_exceeded' });
          addScore(change, breakdown);
          addEventLog(`🔥 回源限流！并发数超过${sourceLimit} ${change}`);
          
          const evidence = createEvidence(
            order.id,
            'source_start',
            now,
            gameTime,
            `回源限流触发`,
            change,
            {
              concurrentSource: useGameStore.getState().stats.concurrentSource,
              sourceLimit,
            },
            order.patience
          );
          addEvidence(evidence);
        }

        const dish = DISHES.find(d => d.id === order.dishId)!;
        const sourceRequest: SourceRequest = {
          id: `source-${++sourceIdCounter}`,
          dishId: order.dishId,
          dishName: order.dishName,
          orderIds: [order.id],
          createdAt: now,
          duration: dish.cookTime,
          progress: 0,
          status: 'cooking',
        };

        addSourceRequest(sourceRequest);
        updateOrder(order.id, { sourceRequestId: sourceRequest.id });

        const { change: missChange, breakdown: missBreakdown } = calculateScoreChange({
          type: 'serve_success',
          cacheHit: false,
        });

        setTimeout(() => {
          const completeNow = performance.now();
          const cacheEntry: CacheEntry = {
            dishId: dish.id,
            dishName: dish.name,
            value: { recipe: `新鲜制作的${dish.name}`, quality: 100 },
            createdAt: completeNow,
            lastAccessedAt: completeNow,
            accessCount: 0,
            ttl: dish.ttl,
            expiresAt: completeNow + dish.ttl,
            version: `v${Date.now()}`,
            isDirty: false,
            sourceRequestId: sourceRequest.id,
          };

          if (cacheRef.current) {
            if (cacheRef.current instanceof TTLCache) {
              cacheRef.current.set(cacheEntry, completeNow);
            } else {
              cacheRef.current.set(cacheEntry);
            }
          }

          updateSourceRequest(sourceRequest.id, { status: 'completed', progress: 100 });

          sourceRequest.orderIds.forEach(oid => {
            addScore(missChange, missBreakdown);
            updateOrder(oid, { status: 'completed', completedAt: completeNow });
            updateStats({ completedOrders: useGameStore.getState().stats.completedOrders + 1 });
            
            const serveEvidence = createEvidence(
              oid,
              'serve',
              completeNow,
              getGameTime(),
              `回源完成，新鲜出餐`,
              missChange,
              {
                dishId: dish.id,
                dishName: dish.name,
                sourceDuration: dish.cookTime,
                cacheVersion: cacheEntry.version,
              },
              useGameStore.getState().orders.find(o => o.id === oid)?.patience
            );
            addEvidence(serveEvidence);

            setTimeout(() => {
              removeOrder(oid);
            }, 500);
          });

          addEventLog(`🍳 ${dish.name} 回源完成，新鲜出餐 +${missChange}`);

          setTimeout(() => {
            removeSourceRequest(sourceRequest.id);
          }, 300);
        }, dish.cookTime / speed);
      }
      
      updateStats({ cacheMisses: useGameStore.getState().stats.cacheMisses + 1 });
    } else {
      updateStats({ cacheMisses: useGameStore.getState().stats.cacheMisses + 1 });
      
      const existingSource = sourceRequests.find(
        s => s.dishId === order.dishId && s.status !== 'completed'
      );

      if (existingSource) {
        updateSourceRequest(existingSource.id, {
          orderIds: [...existingSource.orderIds, order.id],
        });
        updateOrder(order.id, { sourceRequestId: existingSource.id });
      } else {
        if (checkCacheBreakdown(order.dishId, now)) {
          const { change, breakdown } = calculateScoreChange({ type: 'cache_breakdown' });
          addScore(change, breakdown);
          
          const evidence = createEvidence(
            order.id,
            'cache_breakdown',
            now,
            gameTime,
            `缓存击穿：热点key过期，大量回源`,
            change,
            {
              dishId: order.dishId,
              dishName: order.dishName,
              pendingOrders: orders.filter(o => o.dishId === order.dishId && o.status === 'pending').length,
              concurrentSources: sourceRequests.filter(s => s.dishId === order.dishId).length,
            },
            order.patience
          );
          addEvidence(evidence);
          updateStats({ cacheBreakdowns: useGameStore.getState().stats.cacheBreakdowns + 1 });
          addEventLog(`💥 ${order.dishName} 缓存击穿！${change}`);
        }

        if (useGameStore.getState().stats.concurrentSource >= sourceLimit) {
          const { change, breakdown } = calculateScoreChange({ type: 'source_limit_exceeded' });
          addScore(change, breakdown);
          addEventLog(`🔥 回源限流！并发数超过${sourceLimit} ${change}`);
        }

        const dish = DISHES.find(d => d.id === order.dishId)!;
        const sourceRequest: SourceRequest = {
          id: `source-${++sourceIdCounter}`,
          dishId: order.dishId,
          dishName: order.dishName,
          orderIds: [order.id],
          createdAt: now,
          duration: dish.cookTime,
          progress: 0,
          status: 'cooking',
        };

        addSourceRequest(sourceRequest);
        updateOrder(order.id, { sourceRequestId: sourceRequest.id });

        const { change: missChange, breakdown: missBreakdown } = calculateScoreChange({
          type: 'serve_success',
          cacheHit: false,
        });

        pendingSourcesRef.current.set(sourceRequest.id, {
          resolve: () => {
            const completeNow = performance.now();
            const cacheEntry: CacheEntry = {
              dishId: dish.id,
              dishName: dish.name,
              value: { recipe: `新鲜制作的${dish.name}`, quality: 100 },
              createdAt: completeNow,
              lastAccessedAt: completeNow,
              accessCount: 0,
              ttl: dish.ttl,
              expiresAt: completeNow + dish.ttl,
              version: `v${Date.now()}`,
              isDirty: false,
              sourceRequestId: sourceRequest.id,
            };

            if (cacheRef.current) {
              if (cacheRef.current instanceof TTLCache) {
                cacheRef.current.set(cacheEntry, completeNow);
              } else {
                cacheRef.current.set(cacheEntry);
              }
            }

            updateSourceRequest(sourceRequest.id, { status: 'completed', progress: 100 });

            sourceRequest.orderIds.forEach(oid => {
              addScore(missChange, missBreakdown);
              updateOrder(oid, { status: 'completed', completedAt: completeNow });
              updateStats({ completedOrders: useGameStore.getState().stats.completedOrders + 1 });
              
              const serveEvidence = createEvidence(
                oid,
                'serve',
                completeNow,
                getGameTime(),
                `回源完成，新鲜出餐`,
                missChange,
                {
                  dishId: dish.id,
                  dishName: dish.name,
                  sourceDuration: dish.cookTime,
                  cacheVersion: cacheEntry.version,
                },
                useGameStore.getState().orders.find(o => o.id === oid)?.patience
              );
              addEvidence(serveEvidence);

              setTimeout(() => {
                removeOrder(oid);
              }, 500);
            });

            addEventLog(`🍳 ${dish.name} 回源完成，新鲜出餐 +${missChange}`);

            setTimeout(() => {
              removeSourceRequest(sourceRequest.id);
            }, 300);
          },
        });

        setTimeout(() => {
          const resolve = pendingSourcesRef.current.get(sourceRequest.id)?.resolve;
          if (resolve) {
            resolve();
            pendingSourcesRef.current.delete(sourceRequest.id);
          }
        }, dish.cookTime / speed);
      }
    }
  }, [
    getGameTime,
    updateOrder,
    removeOrder,
    addSourceRequest,
    updateSourceRequest,
    removeSourceRequest,
    addScore,
    updateStats,
    addEvidence,
    addEventLog,
    createEvidence,
    checkCacheBreakdown,
    checkDirtySpread,
    sourceLimit,
    sourceRequests,
    speed,
  ]);

  const gameLoop = useCallback(() => {
    if (status !== 'playing') return;

    const now = performance.now();
    const gameTime = getGameTime();

    if (gameTime >= gameDuration) {
      endGame();
      return;
    }

    const timeSinceLastOrder = now - lastOrderTimeRef.current;
    const orderInterval = Math.max(1500, 4000 - (gameTime / 1000) * 50);
    if (timeSinceLastOrder > orderInterval) {
      const randomDish = DISHES[Math.floor(Math.random() * DISHES.length)];
      
      if (Math.random() < 0.3 && orders.filter(o => o.status === 'pending').length < 15) {
        const newOrder = generateOrder(randomDish.id, now);
        addOrder(newOrder);
        
        const evidence = createEvidence(
          newOrder.id,
          'order_created',
          now,
          gameTime,
          `新订单生成: ${newOrder.dishName}`,
          0,
          {
            dishId: newOrder.dishId,
            priority: newOrder.priority,
            patience: newOrder.patience,
          },
          newOrder.patience
        );
        addEvidence(evidence);
        
        lastOrderTimeRef.current = now;
      }
    }

    if (now - lastCheckTimeRef.current > 500) {
      const deltaTime = 500 * speed;
      
      orders.forEach(order => {
        if (order.status === 'pending') {
          const elapsed = now - order.createdAt;
          const patience = Math.max(0, 100 - (elapsed / (order.expectedAt - order.createdAt)) * 100);
          
          updateOrder(order.id, {
            patience,
            patienceHistory: [...order.patienceHistory, { time: now, value: patience }],
          });

          if (patience <= 0 && order.status === 'pending') {
            updateOrder(order.id, { status: 'failed' });
            
            const { change, breakdown } = calculateScoreChange({ type: 'customer_complaint' });
            addScore(change, breakdown);
            
            const evidence = createEvidence(
              order.id,
              'timeout',
              now,
              gameTime,
              `顾客投诉：耐心值归零`,
              change,
              {
                dishId: order.dishId,
                dishName: order.dishName,
                waitTime: elapsed,
              },
              0
            );
            addEvidence(evidence);
            updateStats({ customerComplaints: useGameStore.getState().stats.customerComplaints + 1 });
            addEventLog(`😡 ${order.dishName} 顾客投诉！${change}`);
            
            setTimeout(() => {
              removeOrder(order.id);
            }, 500);
          }
        }
      });

      if (cacheRef.current) {
        if (cacheRef.current instanceof TTLCache) {
          const entries = cacheRef.current.getAll(now);
          setCacheEntries(entries);
        } else {
          const entries = cacheRef.current.getAll();
          setCacheEntries(entries);
        }
      }

      sourceRequests.forEach(request => {
        if (request.status === 'cooking') {
          const elapsed = now - request.createdAt;
          const progress = Math.min(100, (elapsed / (request.duration / speed)) * 100);
          updateSourceRequest(request.id, { progress });
        }
      });

      const nextOrder = getNextOrder(orders, queueScheduler);
      if (nextOrder) {
        processOrder(nextOrder, now);
      }

      lastCheckTimeRef.current = now;
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [
    status,
    getGameTime,
    gameDuration,
    speed,
    orders,
    sourceRequests,
    queueScheduler,
    addOrder,
    updateOrder,
    removeOrder,
    updateSourceRequest,
    setCacheEntries,
    addScore,
    updateStats,
    addEvidence,
    addEventLog,
    createEvidence,
    processOrder,
    endGame,
  ]);

  useEffect(() => {
    cacheRef.current = createCache(cacheStrategy, 6);
    lastOrderTimeRef.current = 0;
    lastCheckTimeRef.current = 0;
    pendingSourcesRef.current.clear();
  }, [cacheStrategy]);

  useEffect(() => {
    if (status === 'playing') {
      lastCheckTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, gameLoop]);

  const getCurrentGameTime = useCallback(() => {
    return getGameTime();
  }, [getGameTime]);

  return {
    getCurrentGameTime,
  };
}
