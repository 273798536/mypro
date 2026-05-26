import type { Card, Difficulty } from '@/types';
import { CARD_TEMPLATES, generateRandomCard } from '@/data/cardTemplates';
import { DIFFICULTY_CONFIG } from '@/data/gameConfig';

export function generateCards(difficulty: Difficulty): Card[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const cards: Card[] = [];
  
  const typeCount = {
    contract: Math.ceil(config.cardCount / 3),
    invoice: Math.ceil(config.cardCount / 3),
    confidential: config.cardCount - 2 * Math.ceil(config.cardCount / 3),
  };
  
  const templatesByType = CARD_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.materialType]) {
      acc[template.materialType] = [];
    }
    acc[template.materialType].push(template);
    return acc;
  }, {} as Record<string, typeof CARD_TEMPLATES>);
  
  let idCounter = 0;
  
  (Object.keys(typeCount) as Array<keyof typeof typeCount>).forEach((type) => {
    const templates = templatesByType[type] || [];
    if (templates.length === 0) return;
    
    for (let i = 0; i < typeCount[type]; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const hasBorrowRequest = Math.random() < config.borrowProbability;
      const card = generateRandomCard(`card-${idCounter++}`, template, hasBorrowRequest);
      cards.push(card);
    }
  });
  
  return shuffleArray(cards);
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
