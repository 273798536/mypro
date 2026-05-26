import { Baggage, LevelConfig } from '../types';
import { DESTINATIONS } from '../data/levels';
import { generateFlightNo, getGateForFlight } from '../data/flights';

let baggageIdCounter = 0;

export function resetBaggageCounter(): void {
  baggageIdCounter = 0;
}

export function generateBaggage(levelConfig: LevelConfig): Baggage {
  const { config } = levelConfig;
  const flightNo = generateFlightNo();
  const destination = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
  const gate = getGateForFlight(flightNo);
  
  const isOversized = Math.random() < config.oversizedRate;
  const isTransfer = Math.random() < config.transferRate;
  const isDelayed = Math.random() < config.delayedRate;
  
  const weight = isOversized 
    ? Math.floor(Math.random() * 20 + 30) 
    : Math.floor(Math.random() * 20 + 10);
  
  const transferTime = isTransfer 
    ? (Math.random() < config.urgentTransferRate 
        ? Math.floor(Math.random() * 20 + 10) 
        : Math.floor(Math.random() * 60 + 30))
    : undefined;
  
  const priority = (isTransfer && transferTime && transferTime < 30) ? 'urgent' : 'normal';
  
  baggageIdCounter++;
  
  return {
    id: `bag_${Date.now()}_${baggageIdCounter}`,
    flightNo,
    destination: `${destination.city}(${destination.code})`,
    weight,
    isOversized,
    isTransfer,
    transferTime,
    isDelayed,
    gate,
    priority,
    generatedAt: Date.now(),
    status: 'waiting',
    position: 0,
    selectedBelt: null,
  };
}

export function determineCorrectExit(baggage: Baggage): 
  'gate_A' | 'gate_B' | 'gate_C' | 'gate_D' | 'oversized' | 'transfer_urgent' | 'transfer_normal' | 'delayed' {
  if (baggage.isOversized) return 'oversized';
  if (baggage.isDelayed) return 'delayed';
  if (baggage.isTransfer) {
    return baggage.transferTime && baggage.transferTime < 30 ? 'transfer_urgent' : 'transfer_normal';
  }
  return `gate_${baggage.gate}` as const;
}
