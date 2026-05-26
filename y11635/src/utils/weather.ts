import { WeatherCard, WeatherType } from '../types/game';
import { WEATHER_CARDS } from '../data/constants';

const WEATHER_PROBABILITIES: Record<WeatherType, number> = {
  sunny: 0.30,
  lightRain: 0.25,
  moderateRain: 0.20,
  heavyRain: 0.15,
  storm: 0.10,
};

export function drawWeatherCard(): WeatherCard {
  const random = Math.random();
  let cumulative = 0;
  
  for (const card of WEATHER_CARDS) {
    cumulative += WEATHER_PROBABILITIES[card.type];
    if (random <= cumulative) {
      return { ...card };
    }
  }
  
  return { ...WEATHER_CARDS[0] };
}

export function calculateInflow(weather: WeatherCard): number {
  const { inflowMin, inflowMax } = weather;
  return Math.round(inflowMin + Math.random() * (inflowMax - inflowMin));
}

export function getWeatherByType(type: WeatherType): WeatherCard {
  const card = WEATHER_CARDS.find(c => c.type === type);
  return card ? { ...card } : { ...WEATHER_CARDS[0] };
}
