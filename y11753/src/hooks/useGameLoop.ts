import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { WeatherType } from '../types';

export const useGameLoop = () => {
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const weatherTimerRef = useRef<number>(0);
  const faultTimerRef = useRef<number>(0);

  const {
    status,
    speedMultiplier,
    level,
    updateTime,
    updateResourceCooldowns,
    checkFaultDeadlines,
    generateRandomFault,
    setWeather,
    setWeatherForecast
  } = useGameStore();

  const tick = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaMs = timestamp - lastTimeRef.current;
    const deltaSeconds = (deltaMs / 1000) * speedMultiplier;
    lastTimeRef.current = timestamp;

    if (status === 'playing') {
      updateTime(deltaSeconds);
      updateResourceCooldowns(deltaSeconds);
      checkFaultDeadlines();

      weatherTimerRef.current += deltaSeconds;
      if (level && weatherTimerRef.current >= 30 / speedMultiplier) {
        weatherTimerRef.current = 0;
        if (Math.random() < level.weatherChangeRate * 30) {
          const weathers: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'stormy'];
          const weights = [0.4, 0.35, 0.2, 0.05];
          let random = Math.random();
          let newWeather: WeatherType = 'sunny';
          for (let i = 0; i < weathers.length; i++) {
            random -= weights[i];
            if (random <= 0) {
              newWeather = weathers[i];
              break;
            }
          }
          setWeather(newWeather);
          
          const forecast: WeatherType[] = [];
          for (let i = 0; i < 3; i++) {
            let fr = Math.random();
            for (let j = 0; j < weathers.length; j++) {
              fr -= weights[j];
              if (fr <= 0) {
                forecast.push(weathers[j]);
                break;
              }
            }
          }
          setWeatherForecast(forecast);
        }
      }

      faultTimerRef.current += deltaSeconds;
      if (level && faultTimerRef.current >= 10 / speedMultiplier) {
        faultTimerRef.current = 0;
        if (Math.random() < level.faultFrequency * 10) {
          generateRandomFault();
        }
      }
    }

    animationRef.current = requestAnimationFrame(tick);
  }, [status, speedMultiplier, level, updateTime, updateResourceCooldowns, checkFaultDeadlines, generateRandomFault, setWeather, setWeatherForecast]);

  useEffect(() => {
    if (status === 'playing') {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, tick]);

  const start = useCallback(() => {
    lastTimeRef.current = 0;
    weatherTimerRef.current = 0;
    faultTimerRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  return { start, stop };
};
