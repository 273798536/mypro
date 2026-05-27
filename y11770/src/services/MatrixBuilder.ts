import type { MigrationRecord, MatrixCubeData, RatingLevel } from '../types';
import { RATING_ORDER, getRatingIndex } from '../utils/ratingUtils';

export const buildMatrixData = (
  records: MigrationRecord[],
  months: string[],
  currentMonth: string
): MatrixCubeData[] => {
  const monthIndex = months.indexOf(currentMonth);
  const visibleMonths = months.slice(0, monthIndex + 1);

  const cubeMap = new Map<string, MatrixCubeData>();

  records.forEach((record) => {
    if (!visibleMonths.includes(record.month)) return;

    const x = getRatingIndex(record.fromRating);
    const y = getRatingIndex(record.toRating);
    const z = months.indexOf(record.month);

    const key = `${x}-${y}-${z}`;

    const existing = cubeMap.get(key);
    if (existing) {
      existing.count += record.migrationCount;
      existing.totalBalance += record.balance;
      existing.records.push(record);
      if (record.anomalies.length > 0) {
        existing.anomalies.push(...record.anomalies);
      }
    } else {
      cubeMap.set(key, {
        x,
        y,
        z,
        fromRating: record.fromRating,
        toRating: record.toRating,
        month: record.month,
        count: record.migrationCount,
        totalBalance: record.balance,
        avgBalance: record.balance,
        records: [record],
        anomalies: [...record.anomalies],
        isFiltered: false,
        isVisible: true,
      });
    }
  });

  const cubes = Array.from(cubeMap.values());
  cubes.forEach((cube) => {
    cube.avgBalance = cube.count > 0 ? cube.totalBalance / cube.count : 0;
  });

  return cubes;
};

export const getMatrixStats = (cubes: MatrixCubeData[]) => {
  let maxCount = 0;
  let maxBalance = 0;
  let totalMigrations = 0;
  let totalBalance = 0;

  cubes.forEach((cube) => {
    maxCount = Math.max(maxCount, cube.count);
    maxBalance = Math.max(maxBalance, cube.totalBalance);
    totalMigrations += cube.count;
    totalBalance += cube.totalBalance;
  });

  return { maxCount, maxBalance, totalMigrations, totalBalance, cubeCount: cubes.length };
};

export const getFastestDecliningRatings = (
  cubes: MatrixCubeData[]
): Array<{ rating: RatingLevel; declineCount: number; rate: number }> => {
  const ratingDecline = new Map<RatingLevel, { outCount: number; inCount: number; total: number }>();

  RATING_ORDER.forEach((rating) => {
    ratingDecline.set(rating, { outCount: 0, inCount: 0, total: 0 });
  });

  cubes.forEach((cube) => {
    const fromData = ratingDecline.get(cube.fromRating);
    const toData = ratingDecline.get(cube.toRating);

    if (fromData) {
      fromData.outCount += cube.count;
      fromData.total += cube.count;
    }
    if (toData) {
      toData.inCount += cube.count;
      toData.total += cube.count;
    }
  });

  const declineRates = RATING_ORDER.map((rating) => {
    const data = ratingDecline.get(rating)!;
    const netDecline = data.outCount - data.inCount;
    const rate = data.total > 0 ? netDecline / data.total : 0;
    return { rating, declineCount: netDecline, rate };
  });

  return declineRates.sort((a, b) => b.rate - a.rate);
};
