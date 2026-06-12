import type {
  ChannelReport, Section, SurveyLine, MeasurePoint, ReportSummary,
  WaterQualityRecord, AquacultureLog, InspectionPhoto,
} from '@/types';
import { correctDepth, generateTideCorrection, DATUM_LOCAL_OFFSET } from '@/utils/datumCalculator';

const CHANNEL_LENGTH = 10000;
const CHANNEL_WIDTH = 200;
const SECTION_COUNT = 10;
const LINES_PER_SECTION = 5;
const POINTS_PER_LINE = 50;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function buildChannelReport(): ChannelReport {
  const rand = seededRandom(42);
  const sections: Section[] = [];
  const measurePoints: MeasurePoint[] = [];
  const waterRecords: WaterQualityRecord[] = [];
  const aquaLogs: AquacultureLog[] = [];
  const photos: InspectionPhoto[] = [];

  let negativeCount = 0;
  let totalMin = Infinity;
  let totalMax = -Infinity;
  let depthSum = 0;
  const anomalyCountMap: Record<string, number> = { red: 0, orange: 0, yellow: 0, blue: 0 };

  for (let s = 0; s < SECTION_COUNT; s++) {
    const mileage = (s + 1) * (CHANNEL_LENGTH / (SECTION_COUNT + 1));
    const sectionId = `SEC-${String(s + 1).padStart(3, '0')}`;
    const lines: SurveyLine[] = [];

    for (let l = 0; l < LINES_PER_SECTION; l++) {
      const direction = l === 2 ? 'transverse' : 'longitudinal';
      const lineId = `${sectionId}-LN${l + 1}`;
      const points: MeasurePoint[] = [];

      for (let p = 0; p < POINTS_PER_LINE; p++) {
        const pointId = `${lineId}-P${String(p + 1).padStart(3, '0')}`;
        const offset = ((p / (POINTS_PER_LINE - 1)) - 0.5) * CHANNEL_WIDTH * 0.95;
        const mileDelta = direction === 'longitudinal'
          ? (l - LINES_PER_SECTION / 2) * 25
          : (p / POINTS_PER_LINE) * 80 - 40;
        const curMileage = mileage + mileDelta;

        const midMileage = CHANNEL_WIDTH / 2;
        const distFromCenter = Math.abs(offset);
        const baseDepth =
          8 +
          6 * Math.sin((curMileage / CHANNEL_LENGTH) * Math.PI * 2.3) +
          4 * Math.cos((curMileage / CHANNEL_LENGTH) * Math.PI * 0.8) -
          Math.max(0, (distFromCenter / (CHANNEL_WIDTH / 2) - 0.6) * 12);

        const noise = (rand() - 0.5) * 1.2;
        const rawDepth = +(baseDepth + noise).toFixed(3);
        const hourIdx = Math.floor((curMileage / CHANNEL_LENGTH) * 24);
        const tideCorrection = generateTideCorrection(hourIdx);
        const correctedDepth = correctDepth(rawDepth, tideCorrection, DATUM_LOCAL_OFFSET);

        const isNeg = correctedDepth < -0.45;
        if (isNeg) negativeCount++;

        totalMin = Math.min(totalMin, correctedDepth);
        totalMax = Math.max(totalMax, correctedDepth);
        depthSum += correctedDepth;

        const mismatchSeed = rand();
        const isWaterMismatch = mismatchSeed > 0.9 && s >= 3 && s <= 7;
        const isTrajDrift = rand() > 0.95 && l === 0;
        const isLogGap = rand() > 0.97;

        let anomalyType: MeasurePoint['anomalyType'] = undefined;
        let isAnomaly = false;
        if (isNeg) { anomalyType = 'negative_depth'; isAnomaly = true; anomalyCountMap.red++; }
        else if (isWaterMismatch) { anomalyType = 'water_quality_mismatch'; isAnomaly = true; anomalyCountMap.orange++; }
        else if (isTrajDrift) { anomalyType = 'trajectory_drift'; isAnomaly = true; anomalyCountMap.yellow++; }
        else if (isLogGap) { anomalyType = 'log_gap'; isAnomaly = true; anomalyCountMap.blue++; }

        const flags: string[] = [];
        if (isAnomaly) flags.push(anomalyType as string);

        const waterQualityId = `WQ-${s}-${p}`;
        const aquacultureId = `AQUA-${s}-${p}`;
        const photoIds: string[] = [];
        if (isAnomaly && rand() > 0.5) photoIds.push(`PH-${pointId}-1`);

        const hour = 6 + Math.floor((curMileage / CHANNEL_LENGTH) * 12);
        const minute = Math.floor(rand() * 60);
        const measureTime = `2026-06-11 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

        const turbidityBase = 45 + Math.sin(curMileage / 500) * 15;
        const doBase = 7.2 + Math.cos(curMileage / 700) * 0.8;
        const feedingBase = 120 + Math.sin(curMileage / 300) * 40;

        waterRecords.push({
          waterQualityId,
          sampleTime: measureTime,
          stationId: `ST-${s}`,
          turbidity: +(turbidityBase + (rand() - 0.5) * 8 + (isWaterMismatch ? 28 : 0)).toFixed(2),
          salinity: +(28.5 + (rand() - 0.5) * 1.2).toFixed(2),
          ph: +(7.8 + (rand() - 0.5) * 0.3).toFixed(2),
          do: +(doBase + (rand() - 0.5) * 0.6).toFixed(2),
          source: rand() > 0.3 ? 'sensor' : 'manual',
        });

        aquaLogs.push({
          aquacultureId,
          cageId: `CAGE-${s}-${Math.floor(p / 10)}`,
          recordTime: measureTime,
          feedingAmount: +(feedingBase + (rand() - 0.5) * 15 + (isWaterMismatch ? -45 : 0)).toFixed(1),
          waterExchangeRate: +(0.5 + rand() * 0.4 + (isLogGap ? -0.4 : 0)).toFixed(2),
          oxygenLevel: +(6.5 + rand() * 1.5).toFixed(2),
          remarks: isLogGap ? '【日志缺失】本时段数据缺项' : (rand() > 0.85 ? '养殖作业正常' : ''),
        });

        const point: MeasurePoint = {
          pointId,
          mileage: curMileage,
          offset,
          rawDepth,
          correctedDepth,
          tideCorrection,
          datumCorrection: DATUM_LOCAL_OFFSET,
          gpsX: curMileage,
          gpsY: offset + CHANNEL_WIDTH / 2,
          measureTime,
          tideVersionId: 'TIDE-V20260611-03',
          waterQualityId,
          aquacultureId,
          photoIds,
          isAnomaly,
          anomalyType,
          flags,
        };
        points.push(point);
        measurePoints.push(point);
      }

      lines.push({
        lineId,
        lineName: direction === 'transverse' ? `横测线 #${l + 1}` : `纵测线 #${l + 1}`,
        direction,
        points,
      });
    }

    sections.push({
      sectionId,
      sectionName: `${sectionId} 断面（桩号 ${(mileage / 1000).toFixed(2)} km）`,
      mileage,
      width: CHANNEL_WIDTH,
      surveyLines: lines,
      siltationVolume: +(12000 * rand() + 3000).toFixed(0),
    });
  }

  if (anomalyCountMap.orange < 3) anomalyCountMap.orange += 3;
  if (anomalyCountMap.yellow < 2) anomalyCountMap.yellow += 2;
  if (anomalyCountMap.blue < 2) anomalyCountMap.blue += 2;

  const summary: ReportSummary = {
    totalSectionCount: sections.length,
    totalPointCount: measurePoints.length,
    anomalyCount: anomalyCountMap as ReportSummary['anomalyCount'],
    avgDepth: +(depthSum / measurePoints.length).toFixed(3),
    minDepth: +totalMin.toFixed(3),
    maxDepth: +totalMax.toFixed(3),
    negativeDepthCount: negativeCount,
    siltationTotal: +sections.reduce((s, sec) => s + sec.siltationVolume, 0).toFixed(0),
  };

  return {
    reportId: 'RPT-CH-2026-0611',
    reportName: '闽江下游港区航道淤积测量报告（2026年6月上旬）',
    reportDate: '2026-06-11',
    version: 'v1.0.3',
    channelName: '闽江下游通海航道（川石–壶江段）',
    startMileage: 0,
    endMileage: CHANNEL_LENGTH,
    datumPlane: '理论最低潮面（1985 国家高程基准换算）',
    sections,
    summary,
  };
}

export const MOCK_WATER_RECORDS = (() => {
  const report = buildChannelReport();
  const map = new Map<string, WaterQualityRecord>();
  const rand = seededRandom(99);
  report.sections.forEach((sec, s) => {
    sec.surveyLines.forEach(line => {
      line.points.forEach((p, pIdx) => {
        if (!p.waterQualityId) return;
        const isWaterMismatch = p.anomalyType === 'water_quality_mismatch';
        const turbidityBase = 45 + Math.sin((s + 1) / SECTION_COUNT * Math.PI * 2) * 15;
        const doBase = 7.2 + Math.cos((s + 1) / SECTION_COUNT * Math.PI) * 0.8;
        map.set(p.waterQualityId, {
          waterQualityId: p.waterQualityId,
          sampleTime: p.measureTime,
          stationId: `ST-${s + 1}`,
          turbidity: +(turbidityBase + (rand() - 0.5) * 8 + (isWaterMismatch ? 28 : 0)).toFixed(2),
          salinity: +(28.5 + (rand() - 0.5) * 1.2).toFixed(2),
          ph: +(7.8 + (rand() - 0.5) * 0.3).toFixed(2),
          do: +(doBase + (rand() - 0.5) * 0.6).toFixed(2),
          source: rand() > 0.3 ? 'sensor' : 'manual',
        });
      });
    });
  });
  return map;
})();

export const MOCK_AQUA_LOGS = (() => {
  const report = buildChannelReport();
  const map = new Map<string, AquacultureLog>();
  const rand = seededRandom(77);
  report.sections.forEach((sec, s) => {
    sec.surveyLines.forEach(line => {
      line.points.forEach((p, pIdx) => {
        if (!p.aquacultureId) return;
        const isWaterMismatch = p.anomalyType === 'water_quality_mismatch';
        const isLogGap = p.anomalyType === 'log_gap';
        const feedingBase = 120 + Math.sin(p.mileage / 300) * 40;
        map.set(p.aquacultureId, {
          aquacultureId: p.aquacultureId,
          cageId: `CAGE-${s + 1}-${Math.floor(pIdx / 10) + 1}`,
          recordTime: p.measureTime,
          feedingAmount: +(feedingBase + (rand() - 0.5) * 15 + (isWaterMismatch ? -45 : 0)).toFixed(1),
          waterExchangeRate: +Math.max(0, 0.5 + rand() * 0.4 + (isLogGap ? -0.4 : 0)).toFixed(2),
          oxygenLevel: +(6.5 + rand() * 1.5).toFixed(2),
          remarks: isLogGap ? '【日志缺失】本时段数据缺项，请尽快补录' : (rand() > 0.85 ? '养殖作业正常' : ''),
        });
      });
    });
  });
  return map;
})();

export const MOCK_PHOTOS: InspectionPhoto[] = (() => {
  const report = buildChannelReport();
  const list: InspectionPhoto[] = [];
  report.sections.forEach(sec => {
    sec.surveyLines.forEach(line => {
      line.points.forEach(p => {
        if (p.photoIds.length > 0) {
          p.photoIds.forEach(pid => {
            list.push({
              photoId: pid,
              uploadedAt: '2026-06-11 14:22:05',
              gpsX: p.gpsX,
              gpsY: p.gpsY,
              photoTime: p.measureTime,
              relatedPointId: p.pointId,
              caption: `现场巡检照片 – ${p.pointId}`,
              dataUrl: '',
            });
          });
        }
      });
    });
  });
  return list;
})();

export function getMeasurePointsFlat(): MeasurePoint[] {
  const report = buildChannelReport();
  const pts: MeasurePoint[] = [];
  report.sections.forEach(s => s.surveyLines.forEach(l => pts.push(...l.points)));
  return pts;
}
