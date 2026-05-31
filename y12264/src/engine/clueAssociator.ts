import type { Card } from '../types/card';
import type { CityStatus } from '../types/city';
import type { Clue, ClueSource, EventChain } from '../types/event';
import { generateId } from '../utils/common';

export function createClueFromCard(
  card: Card,
  round: number,
  cityStatus: CityStatus,
): Clue {
  const sourceMap: Record<string, ClueSource> = {
    rainfall: 'rainfall',
    pipeline: 'pipeline',
    disposal: 'report',
    garden: 'garden',
  };

  const contentMap: Record<string, (card: Card, status: CityStatus) => string> = {
    rainfall: (card) => `降雨量${card.value}mm/h，预计汇入${(card.value * 600).toFixed(0)}m³`,
    pipeline: (card, status) => `管网调度「${card.name}」，输送能力${card.value}m³/h，当前泵站负载${status.pumpLoad}%`,
    disposal: (card, status) => `处置措施「${card.name}」，处置能力${card.value}m³/h，低洼积水${status.lowWater}mm`,
    garden: (card, status) => `海绵设施「${card.name}」，吸纳能力${card.value}m³，绿地剩余容量${status.greenCapacity}%`,
  };

  return {
    id: generateId(),
    source: sourceMap[card.type] || 'report',
    content: contentMap[card.type](card, cityStatus),
    cardId: card.id,
    round,
  };
}

export function associateClues(
  chains: EventChain[],
  newClue: Clue,
  cityStatus: CityStatus,
): EventChain[] {
  const relatedChain = chains.find(chain => {
    const recentClue = chain.clues[chain.clues.length - 1];
    if (!recentClue) return false;

    const roundClose = Math.abs(newClue.round - recentClue.round) <= 1;

    const typeRelated =
      (newClue.source === 'rainfall' && recentClue.source === 'pipeline') ||
      (newClue.source === 'pipeline' && recentClue.source === 'rainfall') ||
      (newClue.source === 'pipeline' && recentClue.source === 'report') ||
      (newClue.source === 'report' && recentClue.source === 'pipeline') ||
      (newClue.source === 'garden' && recentClue.source === 'rainfall') ||
      (newClue.source === 'rainfall' && recentClue.source === 'garden') ||
      (newClue.source === 'report' && recentClue.source === 'garden') ||
      (newClue.source === 'garden' && recentClue.source === 'report');

    return roundClose && typeRelated;
  });

  if (relatedChain) {
    return chains.map(chain =>
      chain.id === relatedChain.id
        ? { ...chain, clues: [...chain.clues, newClue] }
        : chain,
    );
  } else {
    return [
      ...chains,
      {
        id: generateId(),
        name: generateEventName(newClue, cityStatus),
        triggerRound: newClue.round,
        clues: [newClue],
      },
    ];
  }
}

function generateEventName(clue: Clue, status: CityStatus): string {
  const hasRisk =
    status.pumpLoad > 85 || status.lowWater > 100 || status.greenCapacity < 15;

  if (hasRisk) {
    if (status.pumpLoad > 85) return `泵站过载事件-${clue.round}回合`;
    if (status.lowWater > 100) return `低洼积水事件-${clue.round}回合`;
    if (status.greenCapacity < 15) return `绿地饱和事件-${clue.round}回合`;
  }

  if (clue.source === 'rainfall') {
    return `降雨过程-${clue.round}回合`;
  }
  if (clue.source === 'pipeline') {
    return `管网调度-${clue.round}回合`;
  }
  if (clue.source === 'garden') {
    return `海绵设施启用-${clue.round}回合`;
  }
  return `处置行动-${clue.round}回合`;
}

export function linkRiskToEventChain(
  chains: EventChain[],
  riskId: string,
  round: number,
): EventChain[] {
  const targetChain = chains.find(chain => chain.triggerRound === round);
  if (targetChain) {
    return chains.map(chain =>
      chain.id === targetChain.id ? { ...chain, relatedRiskId: riskId } : chain,
    );
  }
  return chains;
}

export function getEventChainRiskStatus(
  chain: EventChain,
): 'normal' | 'warning' | 'danger' {
  if (chain.relatedRiskId) return 'danger';

  const hasRainfall = chain.clues.some(c => c.source === 'rainfall');
  const hasPipeline = chain.clues.some(c => c.source === 'pipeline');
  const hasDisposal = chain.clues.some(c => c.source === 'report');

  if (hasRainfall && !hasPipeline && !hasDisposal) return 'warning';

  return 'normal';
}
