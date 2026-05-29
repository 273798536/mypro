import type { WeatherCard } from '../types';
import { weatherCards } from '../data/weatherCards';

export function checkWeatherTrigger(
  arrangedCount: number,
  activatedWeatherIds: string[]
): WeatherCard | null {
  const activatedSet = new Set(activatedWeatherIds);
  for (const card of weatherCards) {
    if (activatedSet.has(card.id)) continue;
    if (arrangedCount >= card.triggerAfterCount) {
      return { ...card, activated: true };
    }
  }
  return null;
}

export function getActiveWeatherEffects(activatedWeather: WeatherCard[]) {
  const effects: {
    disabledStages: Map<string, number>;
    disabledEquipment: Set<string>;
    heatModifier: number;
    changeoverModifier: number;
    durationModifier: number;
  } = {
    disabledStages: new Map(),
    disabledEquipment: new Set(),
    heatModifier: 0,
    changeoverModifier: 0,
    durationModifier: 0,
  };

  for (const w of activatedWeather) {
    for (const e of w.effects) {
      switch (e.type) {
        case 'stage_disable':
          if (e.target) effects.disabledStages.set(e.target, e.value);
          break;
        case 'equipment_disable':
          if (e.target) effects.disabledEquipment.add(e.target);
          break;
        case 'heat_modifier':
          effects.heatModifier += e.value;
          break;
        case 'changeover_modifier':
          effects.changeoverModifier += e.value;
          break;
        case 'duration_modifier':
          effects.durationModifier += e.value;
          break;
      }
    }
  }

  return effects;
}
