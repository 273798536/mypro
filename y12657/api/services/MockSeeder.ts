import { db, generateId } from '../db/database.js';
import { InspectionRepository } from '../db/repositories/InspectionRepository.js';
import { SectionParamsRepository } from '../db/repositories/SectionParamsRepository.js';
import { MeasurePointRepository } from '../db/repositories/MeasurePointRepository.js';
import { ClearanceCalculator } from './ClearanceCalculator.js';
import type { MeasurePointStatus } from '../../shared/types.js';

const MOCK_INSPECTIONS = [
  {
    projectName: '滨江文化广场地下车库B区',
    garageCode: 'BJ-WH-GC-B2',
    scope: 'B2层 1-8号轴线 东向车道',
    baseUnit: 'mm' as const,
    minClearanceRequired: 2200,
    lastEditor: '张工',
    params: {
      beamHeight: 600,
      pipeDiameter: 150,
      ceilingThickness: 50,
      slabThickness: 200,
      floorElevation: 0,
    },
  },
  {
    projectName: '中央商务中心停车楼3F',
    garageCode: 'ZY-SW-3F',
    scope: '3层 A-D区 环形车道',
    baseUnit: 'mm' as const,
    minClearanceRequired: 2200,
    lastEditor: '李工',
    params: {
      beamHeight: 550,
      pipeDiameter: 200,
      ceilingThickness: 60,
      slabThickness: 180,
      floorElevation: 10,
    },
  },
];

function generatePoints(
  inspectionId: string,
  batchId: string,
  params: { beamHeight: number; pipeDiameter: number; ceilingThickness: number; slabThickness: number; floorElevation: number },
  minRequired: number
) {
  const abnormalIndices = new Set([2, 5]);
  const points: Array<{
    inspectionId: string;
    batchId: string;
    sectionLineId: string;
    code: string;
    coordinate: { x: number; y: number; z: number };
    measuredValue: number;
    calculatedClearance: number;
    isAbnormal: boolean;
    screenshotUrl: string;
    status: MeasurePointStatus;
    remark: string;
    handlingOpinion: string;
  }> = [];

  for (let i = 0; i < 8; i++) {
    const isAbnormal = abnormalIndices.has(i);
    const baseMeasured = 3300;
    const measuredValue = isAbnormal ? 2900 + Math.random() * 80 : baseMeasured + Math.random() * 200 - 100;
    const { calculatedClearance, isAbnormal: calcAbnormal } = ClearanceCalculator.calculateClearance(
      measuredValue,
      params,
      minRequired
    );
    points.push({
      inspectionId,
      batchId,
      sectionLineId: `line_${String.fromCharCode(65 + (i % 4))}`,
      code: `MP-${String(i + 1).padStart(3, '0')}`,
      coordinate: {
        x: +(i * 5.5).toFixed(2),
        y: +((i % 2) * 3.0).toFixed(2),
        z: +(measuredValue / 1000).toFixed(3),
      },
      measuredValue: Math.round(measuredValue),
      calculatedClearance: Math.round(calculatedClearance),
      isAbnormal: calcAbnormal,
      screenshotUrl: calcAbnormal ? `/uploads/screenshot_${i + 1}.jpg` : '',
      status: calcAbnormal ? 'abnormal' : 'normal',
      remark: calcAbnormal ? '实测净空不足，存在管线侵占' : '',
      handlingOpinion: calcAbnormal ? '建议调整管线走向或更换细径管道' : '',
    });
  }
  return points;
}

export const MockSeeder = {
  seedMockData() {
    const count = (db.prepare('SELECT COUNT(*) as c FROM inspections').get() as { c: number }).c;
    if (count > 0) return;

    for (const mock of MOCK_INSPECTIONS) {
      const inspection = InspectionRepository.create({
        projectName: mock.projectName,
        garageCode: mock.garageCode,
        scope: mock.scope,
        baseUnit: mock.baseUnit,
        minClearanceRequired: mock.minClearanceRequired,
        lastEditor: mock.lastEditor,
      });

      SectionParamsRepository.create({
        inspectionId: inspection.id,
        batchId: inspection.currentBatchId,
        beamHeight: mock.params.beamHeight,
        pipeDiameter: mock.params.pipeDiameter,
        ceilingThickness: mock.params.ceilingThickness,
        slabThickness: mock.params.slabThickness,
        floorElevation: mock.params.floorElevation,
      });

      const points = generatePoints(
        inspection.id,
        inspection.currentBatchId,
        mock.params,
        mock.minClearanceRequired
      );
      MeasurePointRepository.createBatch(points);

      InspectionRepository.update(inspection.id, { status: 'checking' });
    }
  },
};
