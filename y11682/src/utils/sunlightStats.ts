import { Building, Playground, SunlightStats, SunlightTimeSlot, ValidationError } from '../types';
import { generateDaySunlightStats } from './suncalc';
import { detectTimeGaps, checkDataContinuity } from './validation';

export function calculatePlaygroundSunlight(
  playground: Playground,
  buildings: Building[],
  date: Date
): { stats: SunlightStats; errors: ValidationError[] } {
  const allErrors: ValidationError[] = [];
  
  const dayResults = generateDaySunlightStats(
    playground.boundary,
    buildings,
    date
  );

  const timeSlots: SunlightTimeSlot[] = [];
  let totalSunlightMinutes = 0;
  let currentSlot: SunlightTimeSlot | null = null;

  for (const result of dayResults) {
    const minutesSinceMidnight = result.time.getHours() * 60 + result.time.getMinutes();
    
    if (!currentSlot) {
      currentSlot = {
        start: minutesSinceMidnight,
        end: minutesSinceMidnight + 5,
        sunlight: result.hasSunlight
      };
    } else if (currentSlot.sunlight === result.hasSunlight) {
      currentSlot.end = minutesSinceMidnight + 5;
    } else {
      if (currentSlot.sunlight) {
        totalSunlightMinutes += currentSlot.end - currentSlot.start;
      }
      timeSlots.push(currentSlot);
      currentSlot = {
        start: minutesSinceMidnight,
        end: minutesSinceMidnight + 5,
        sunlight: result.hasSunlight
      };
    }
  }

  if (currentSlot) {
    if (currentSlot.sunlight) {
      totalSunlightMinutes += currentSlot.end - currentSlot.start;
    }
    timeSlots.push(currentSlot);
  }

  const { gaps, errors: gapErrors } = detectTimeGaps(
    timeSlots,
    5,
    '日照统计生成器',
    1
  );

  allErrors.push(...gapErrors);

  const continuityError = checkDataContinuity(
    360,
    1080,
    144,
    dayResults.length,
    '日照统计生成器',
    1
  );

  if (continuityError) {
    allErrors.push(continuityError);
  }

  return {
    stats: {
      playgroundId: playground.id,
      date: date.toISOString().split('T')[0],
      totalMinutes: totalSunlightMinutes,
      timeSlots,
      gaps,
      is达标: totalSunlightMinutes >= playground.requiredSunlight
    },
    errors: allErrors
  };
}

export function calculateAllPlaygroundsSunlight(
  playgrounds: Playground[],
  buildings: Building[],
  date: Date
): { stats: SunlightStats[]; errors: ValidationError[] } {
  const allStats: SunlightStats[] = [];
  const allErrors: ValidationError[] = [];

  for (const playground of playgrounds) {
    const { stats, errors } = calculatePlaygroundSunlight(
      playground,
      buildings,
      date
    );
    allStats.push(stats);
    allErrors.push(...errors);
  }

  return { stats: allStats, errors: allErrors };
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}

export function getSunlightPercentage(
  totalMinutes: number,
  requiredMinutes: number
): number {
  return Math.min(100, Math.round((totalMinutes / requiredMinutes) * 100));
}
