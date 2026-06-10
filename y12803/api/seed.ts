import type BetterSqlite3 from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'

type Database = BetterSqlite3.Database

export function checkSeedStatus(db: Database): boolean {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM experiment_groups').get() as { cnt: number }
  return row.cnt > 0
}

export function insertSeedData(db: Database): void {
  if (checkSeedStatus(db)) return

  const insertGroup = db.prepare(`
    INSERT INTO experiment_groups (id, name, description, conclusion_status, conclusion)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertPlant = db.prepare(`
    INSERT INTO plants (id, group_id, plant_code, species)
    VALUES (?, ?, ?, ?)
  `)
  const insertRecord = db.prepare(`
    INSERT INTO cultivation_records (id, group_id, plant_id, batch_no, recorded_at, measured_at, temperature, humidity, light_intensity, nutrient_solution, is_supplementary, supplementary_to, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertMeasurement = db.prepare(`
    INSERT INTO growth_measurements (id, plant_id, group_id, record_id, batch_no, day_index, height, leaf_area, stem_diameter, annotation, measured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const groupId1 = uuidv4()
    const groupId2 = uuidv4()
    const groupId3 = uuidv4()

    insertGroup.run(groupId1, '拟南芥干旱胁迫组', '研究拟南芥在干旱胁迫条件下的表型变化', 'abnormal', '干旱胁迫组在第8-10天出现明显生长抑制，部分植株叶片出现枯萎，生长曲线偏离正常范围，判定为异常。')
    insertGroup.run(groupId2, '水稻盐胁迫组', '研究水稻在不同盐浓度下的生长响应', 'pending', null)
    insertGroup.run(groupId3, '玉米低温处理组', '研究玉米在低温环境下的表型变化', 'normal', '玉米低温处理组整体生长趋势稳定，虽前期生长速率略缓，但后期恢复正常，判定为正常。')

    const groups = [
      { id: groupId1, species: '拟南芥', prefix: 'AT', count: 6, days: 18, batchNo: 'RGT-2025-001', temp: 25, humidity: 40, light: 300, nutrient: '1/2 MS' },
      { id: groupId2, species: '水稻', prefix: 'OS', count: 8, days: 21, batchNo: 'RGT-2025-002', temp: 28, humidity: 70, light: 500, nutrient: 'Yoshida' },
      { id: groupId3, species: '玉米', prefix: 'ZM', count: 5, days: 14, batchNo: 'RGT-2025-003', temp: 15, humidity: 60, light: 400, nutrient: 'Hoagland' },
    ]

    const allPlants: { id: string; groupId: string; dayCount: number; batchNo: string; temp: number; humidity: number; light: number; nutrient: string; groupIndex: number }[] = []

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      for (let pi = 0; pi < g.count; pi++) {
        const plantId = uuidv4()
        const plantCode = `${g.prefix}-${String(pi + 1).padStart(3, '0')}`
        insertPlant.run(plantId, g.id, plantCode, g.species)
        allPlants.push({ id: plantId, groupId: g.id, dayCount: g.days, batchNo: g.batchNo, temp: g.temp, humidity: g.humidity, light: g.light, nutrient: g.nutrient, groupIndex: gi })
      }
    }

    for (const plant of allPlants) {
      const baseDate = new Date('2025-03-01')

      for (let day = 1; day <= plant.dayCount; day++) {
        const measuredDate = new Date(baseDate)
        measuredDate.setDate(measuredDate.getDate() + day - 1)
        const measuredAt = measuredDate.toISOString().slice(0, 19).replace('T', ' ')
        const recordedAt = measuredAt

        let height: number
        let leafArea: number
        let stemDiameter: number
        let annotation: 'normal' | 'abnormal' | 'pending' = 'normal'

        const baseGrowth = day * 0.8 + Math.sin(day * 0.5) * 0.3
        const noise = (Math.random() - 0.5) * 0.2

        if (plant.groupIndex === 0) {
          height = baseGrowth * 1.2 + noise
          leafArea = day * 1.5 + Math.cos(day * 0.3) * 0.8 + noise * 2
          stemDiameter = day * 0.15 + Math.sin(day * 0.4) * 0.05 + noise * 0.1

          if (day >= 8 && day <= 10) {
            height *= 0.4
            leafArea *= 0.5
            stemDiameter *= 0.6
            if (plant.id === allPlants[0].id || plant.id === allPlants[1].id) {
              annotation = 'abnormal'
            }
          }
        } else if (plant.groupIndex === 1) {
          height = (baseGrowth * 1.5 + noise) * 0.9
          leafArea = (day * 2.0 + Math.cos(day * 0.3) * 1.0 + noise * 2) * 0.85
          stemDiameter = (day * 0.2 + Math.sin(day * 0.4) * 0.06 + noise * 0.1) * 0.9
        } else {
          height = baseGrowth * 1.0 + noise
          leafArea = day * 1.8 + Math.cos(day * 0.3) * 0.9 + noise * 2
          stemDiameter = day * 0.18 + Math.sin(day * 0.4) * 0.05 + noise * 0.1

          if (day <= 3) {
            height *= 0.7
            leafArea *= 0.75
          }
        }

        height = Math.max(0.1, Math.round(height * 100) / 100)
        leafArea = Math.max(0.1, Math.round(leafArea * 100) / 100)
        stemDiameter = Math.max(0.1, Math.round(stemDiameter * 100) / 100)

        const tempVariation = plant.temp + (Math.random() - 0.5) * 3
        const humidityVariation = plant.humidity + (Math.random() - 0.5) * 5
        const lightVariation = plant.light + (Math.random() - 0.5) * 30

        const recordId = uuidv4()
        insertRecord.run(
          recordId, plant.groupId, plant.id, plant.batchNo,
          recordedAt, measuredAt,
          Math.round(tempVariation * 10) / 10,
          Math.round(humidityVariation * 10) / 10,
          Math.round(lightVariation * 10) / 10,
          plant.nutrient,
          0, null, null,
        )

        insertMeasurement.run(
          uuidv4(), plant.id, plant.groupId, recordId, plant.batchNo,
          day, height, leafArea, stemDiameter, annotation, measuredAt,
        )
      }
    }

    const firstPlant = allPlants[0]
    const suppMeasuredAt = '2025-03-12 08:00:00'
    const suppRecordedAt = '2025-03-15 10:00:00'

    const existingRecord = db.prepare(
      'SELECT id FROM cultivation_records WHERE plant_id = ? AND measured_at = ? AND batch_no = ?'
    ).get(firstPlant.id, '2025-03-12 08:00:00', firstPlant.batchNo) as { id: string } | undefined

    const supplementaryToId = existingRecord?.id ?? null
    const suppRecordId = uuidv4()

    insertRecord.run(
      suppRecordId, firstPlant.groupId, firstPlant.id, firstPlant.batchNo,
      suppRecordedAt, suppMeasuredAt,
      26.5, 42.0, 310.0, '1/2 MS + ABA',
      1, supplementaryToId, '补录：调整营养液浓度后重新记录',
    )

    insertMeasurement.run(
      uuidv4(), firstPlant.id, firstPlant.groupId, suppRecordId, firstPlant.batchNo,
      12, 6.85, 18.2, 1.72, 'normal', suppMeasuredAt,
    )
  })

  transaction()
}
