import { GameEvent, EventType, EventSeverity } from './types';
import { EVENT_TEMPLATES, DIFFICULTY_CONFIGS } from './config';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function generateRandomEvent(
  difficulty: string,
  currentTime: number
): GameEvent | null {
  const config = DIFFICULTY_CONFIGS[difficulty as keyof typeof DIFFICULTY_CONFIGS];
  if (!config) return null;
  
  if (Math.random() > config.eventFrequency) {
    return null;
  }
  
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  const message = template.messages[Math.floor(Math.random() * template.messages.length)];
  
  const event: GameEvent = {
    id: generateId(),
    type: template.type,
    severity: template.severity,
    message,
    effect: template.effectBuilder(),
    timestamp: currentTime,
    duration: template.duration,
  };
  
  return event;
}

export function isEventActive(event: GameEvent, currentTime: number): boolean {
  if (event.applied && event.duration === 0) return false;
  if (event.duration === 0) return true;
  return currentTime < event.timestamp + event.duration;
}

export function getActiveEvents(events: GameEvent[], currentTime: number): GameEvent[] {
  return events.filter(event => isEventActive(event, currentTime));
}

export function consumeUnappliedPriceJumps(events: GameEvent[]): { priceJump: number; updatedEvents: GameEvent[] } {
  let priceJump = 0;
  const updatedEvents = events.map(event => {
    if (event.type === 'price_jump' && !event.applied) {
      priceJump += event.effect.priceChange || 0;
      return { ...event, applied: true as const };
    }
    return event;
  });
  return { priceJump, updatedEvents };
}

export function getEventColor(severity: EventSeverity): string {
  switch (severity) {
    case 'critical': return 'text-trade-down';
    case 'warning': return 'text-trade-warn';
    case 'info': return 'text-trade-info';
    default: return 'text-white';
  }
}

export function getEventBgColor(severity: EventSeverity): string {
  switch (severity) {
    case 'critical': return 'bg-red-900/30 border-red-500/50';
    case 'warning': return 'bg-amber-900/30 border-amber-500/50';
    case 'info': return 'bg-blue-900/30 border-blue-500/50';
    default: return 'bg-gray-800 border-gray-600';
  }
}

export function getEventTypeLabel(type: EventType): string {
  switch (type) {
    case 'price_jump': return '价格跳空';
    case 'liquidity_crisis': return '流动性枯竭';
    case 'fee_change': return '手续费调整';
    case 'volatility_spike': return '波动率上升';
    default: return '未知事件';
  }
}
