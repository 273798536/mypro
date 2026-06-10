const { getDb } = require('../db')
const dayjs = require('dayjs')

async function seed() {
  console.log('开始初始化测试数据...')
  const db = await getDb()

  const locations = [
    { code: 'LOC-A-01', name: 'A区1号屏障入口', area: 'A区', building: '1号楼', floor: '1F', description: 'SPF动物房屏障入口左侧' },
    { code: 'LOC-A-02', name: 'A区2号走廊尽头', area: 'A区', building: '1号楼', floor: '1F', description: 'SPF动物房走廊尽头' },
    { code: 'LOC-A-03', name: 'A区3号更衣室', area: 'A区', building: '1号楼', floor: '1F', description: '人员更衣室角落' },
    { code: 'LOC-B-01', name: 'B区1号饲料间', area: 'B区', building: '2号楼', floor: '2F', description: '饲料储存间门口' },
    { code: 'LOC-B-02', name: 'B区2号废物暂存', area: 'B区', building: '2号楼', floor: '2F', description: '动物废物暂存区' },
    { code: 'LOC-B-03', name: 'B区3号传递窗', area: 'B区', building: '2号楼', floor: '2F', description: '物品传递窗附近' },
    { code: 'LOC-C-01', name: 'C区1号实验区', area: 'C区', building: '3号楼', floor: '3F', description: '小鼠实验区' },
    { code: 'LOC-C-02', name: 'C区2号实验区', area: 'C区', building: '3号楼', floor: '3F', description: '大鼠实验区' },
    { code: 'LOC-D-01', name: 'D区地下室仓库', area: 'D区', building: 'B1', floor: 'B1', description: '地下储物间' },
    { code: 'LOC-D-02', name: 'D区卸货区', area: 'D区', building: 'B1', floor: '1F', description: '货物装卸区' },
  ]

  const insertLoc = db.prepare(`INSERT INTO sampling_locations (code, name, area, building, floor, description) VALUES (?, ?, ?, ?, ?, ?)`)
  const locIds = []
  for (const loc of locations) {
    const info = insertLoc.run(loc.code, loc.name, loc.area, loc.building, loc.floor, loc.description)
    locIds.push(info.lastInsertRowid)
    console.log(`  插入采样地点: ${loc.code} - ${loc.name}`)
  }

  const today = dayjs()
  const batches = [
    { no: 'BATCH' + today.subtract(5, 'day').format('YYYYMMDD') + '-01', date: today.subtract(5, 'day').format('YYYY-MM-DD'), op: '张工', type: '粘捕式', weather: '晴', temp: 22.5, humidity: 55, remark: '周常诱捕检查', hasEffect: 0, effectNote: '' },
    { no: 'BATCH' + today.subtract(3, 'day').format('YYYYMMDD') + '-01', date: today.subtract(3, 'day').format('YYYY-MM-DD'), op: '李工', type: '粘捕式', weather: '阴', temp: 20.0, humidity: 65, remark: '', hasEffect: 1, effectNote: '当日D区地下室潮湿，存在飞虫聚集迹象，可能影响整体判断' },
    { no: 'BATCH' + today.subtract(1, 'day').format('YYYYMMDD') + '-01', date: today.subtract(1, 'day').format('YYYY-MM-DD'), op: '王工', type: '粘捕式', weather: '多云', temp: 23.0, humidity: 50, remark: '今日例行巡检', hasEffect: 0, effectNote: '' },
  ]

  const insertBatch = db.prepare(`INSERT INTO trap_batches (batch_no, trap_date, operator, trap_type, weather, temperature, humidity, remark, has_batch_effect, batch_effect_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const batchIds = []
  for (const b of batches) {
    const info = insertBatch.run(b.no, b.date, b.op, b.type, b.weather, b.temp, b.humidity, b.remark, b.hasEffect, b.effectNote)
    batchIds.push(info.lastInsertRowid)
    console.log(`  插入批次: ${b.no} - ${b.date}`)
  }

  const recordsTemplate = [
    { batchIdx: 0, samples: [
        { locIdx: 0, count: 0, types: '', status: 'normal', score: 95, start: '08:00', end: '16:00', collected: '张工', reviewed: '主管', conclusion: '无虫，环境控制良好' },
        { locIdx: 1, count: 0, types: '', status: 'normal', score: 92, start: '08:00', end: '16:00', collected: '张工', reviewed: '主管', conclusion: '正常，无异常' },
        { locIdx: 2, count: 1, types: '蛾蠓', status: 'boundary', score: 75, start: '08:00', end: '16:00', collected: '张工', reviewed: '主管', conclusion: '发现1只蛾蠓，需加强通风' },
        { locIdx: 3, count: 0, types: '', status: 'normal', score: 96, start: '08:00', end: '16:00', collected: '张工', reviewed: null, conclusion: null },
        { locIdx: 4, count: 3, types: '果蝇、蚤蝇', status: 'bad', score: 40, start: '08:00', end: '16:00', collected: '张工', reviewed: '主管', conclusion: '废物暂存区果蝇较多，需加强清理频率' },
      ]
    },
    { batchIdx: 1, samples: [
        { locIdx: 0, count: 0, types: '', status: 'normal', score: 94, start: '08:30', end: '16:30', collected: '李工', reviewed: '主管', conclusion: '正常' },
        { locIdx: 7, count: 2, types: '书虱', status: 'boundary', score: 70, start: '08:30', end: '16:30', collected: '李工', reviewed: null, conclusion: null },
        { locIdx: 8, count: 8, types: '蛾蠓、摇蚊', status: 'bad', score: 30, start: '08:30', end: '16:30', collected: '李工', reviewed: '主管', conclusion: '地下室潮湿导致，需配合批次效应标记' },
        { locIdx: 9, count: 5, types: '果蝇', status: 'bad', score: 55, start: '08:30', end: '16:30', collected: '李工', reviewed: '主管', conclusion: '卸货区虫量偏高，注意货物包装检查' },
        { locIdx: 5, count: 1, types: '蚂蚁', status: 'boundary', score: 80, start: '08:30', end: '16:30', collected: '李工', reviewed: null, conclusion: null },
      ]
    },
    { batchIdx: 2, samples: [
        { locIdx: 0, count: 0, types: '', status: 'pending', score: 90, start: '09:00', end: '17:00', collected: '王工', reviewed: null, conclusion: null },
        { locIdx: 1, count: 0, types: '', status: 'pending', score: 90, start: '09:00', end: '17:00', collected: '王工', reviewed: null, conclusion: null },
        { locIdx: 3, count: 0, types: '', status: 'pending', score: 93, start: '09:00', end: '17:00', collected: '王工', reviewed: null, conclusion: null },
        { locIdx: 6, count: 1, types: '甲虫', status: 'boundary', score: 72, start: '09:00', end: '17:00', collected: '王工', reviewed: null, conclusion: null },
        { locIdx: 4, count: 2, types: '蚤蝇', status: 'boundary', score: 78, start: '09:00', end: '17:00', collected: '王工', reviewed: null, conclusion: null },
        { locIdx: 8, count: 0, types: '', status: 'pending', score: 88, start: '09:00', end: '17:00', collected: '王工', reviewed: null, conclusion: null },
      ]
    },
  ]

  const insertRecord = db.prepare(`INSERT INTO trap_records (record_no, batch_id, location_id, trap_start_time, trap_end_time, insect_count, insect_types, sample_status, quality_score, collected_by, reviewed_by, conclusion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertRecordDup = db.prepare(`INSERT INTO trap_records (record_no, batch_id, location_id, trap_start_time, trap_end_time, insect_count, insect_types, sample_status, quality_score, collected_by, reviewed_by, conclusion, source_import_id, is_duplicate, duplicate_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  let recordCounter = 1
  const insertedRecordIds = []
  for (const batchGroup of recordsTemplate) {
    for (const s of batchGroup.samples) {
      const recordNo = 'REC' + String(recordCounter++).padStart(5, '0')
      const info = insertRecord.run(
        recordNo,
        batchIds[batchGroup.batchIdx],
        locIds[s.locIdx],
        s.start, s.end, s.count, s.types, s.status, s.score,
        s.collected, s.reviewed, s.conclusion
      )
      insertedRecordIds.push({ id: info.lastInsertRowid, recordNo, status: s.status })
      console.log(`  插入记录: ${recordNo} - 状态:${s.status} 虫数:${s.count}`)
    }
  }

  const insertComment = db.prepare(`INSERT INTO review_comments (record_id, reviewer, comment, comment_type, previous_status, new_status) VALUES (?, ?, ?, ?, ?, ?)`)
  const commentsData = [
    { recordIdx: 2, reviewer: '主管', comment: '该位置靠近人员流动区，蛾蠓偶发属正常范围，建议观察下次结果', type: 'review', prev: 'pending', newSt: 'boundary' },
    { recordIdx: 4, reviewer: '主管', comment: '废物暂存区果蝇较多，已通知清洁组增加每日清运次数，并加强消毒', type: 'review', prev: 'pending', newSt: 'bad' },
    { recordIdx: 7, reviewer: '主管', comment: '地下室湿度超标导致，已同步在批次上标记批次效应，该记录作为参考数据', type: 'review', prev: 'pending', newSt: 'bad' },
    { recordIdx: 8, reviewer: '主管', comment: '卸货区果蝇数量偏高，建议对进货包装进行检查，防止携带入内', type: 'review', prev: 'pending', newSt: 'bad' },
  ]
  for (const c of commentsData) {
    const rec = insertedRecordIds[c.recordIdx]
    insertComment.run(rec.id, c.reviewer, c.comment, c.type, c.prev, c.newSt)
    console.log(`  插入复核意见: 记录 ${rec.recordNo}`)
  }

  const insertLog = db.prepare(`INSERT INTO import_logs (import_batch_no, file_name, total_count, success_count, duplicate_count, error_count, imported_by, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
  const logInfo = insertLog.run(
    'IMP' + today.subtract(3, 'day').format('YYYYMMDDHHmm'),
    'trap_data_batch_0907.xlsx',
    5, 3, 2, 0,
    '李工', '测试重复导入场景：第2、3条为之前已导入记录'
  )
  console.log(`  插入导入日志: ${logInfo.lastInsertRowid}`)

  const updateRecordForImport = db.prepare(`UPDATE trap_records SET source_import_id = ? WHERE id = ?`)
  const recordIdsFromBatch1 = insertedRecordIds.filter((_, i) => i >= 5 && i <= 9).map(r => r.id)
  for (const rid of recordIdsFromBatch1.slice(0, 3)) {
    updateRecordForImport.run(logInfo.lastInsertRowid, rid)
  }

  const dupRecordInfo = insertRecordDup.run(
    'REC' + String(recordCounter++).padStart(5, '0') + '_DUP',
    batchIds[1],
    locIds[7],
    '08:30', '16:30', 2, '书虱', 'boundary', 70,
    '李工', null, null,
    logInfo.lastInsertRowid, 1, recordIdsFromBatch1[1]
  )
  insertComment.run(dupRecordInfo.lastInsertRowid, 'system', '重复导入标记：与记录 ' + insertedRecordIds[6].recordNo + ' 重复', 'duplicate', null, null)
  console.log(`  插入重复记录示例: ID=${dupRecordInfo.lastInsertRowid}`)

  const dupRecordInfo2 = insertRecordDup.run(
    'REC' + String(recordCounter++).padStart(5, '0') + '_DUP',
    batchIds[1],
    locIds[8],
    '08:30', '16:30', 8, '蛾蠓、摇蚊', 'bad', 30,
    '李工', '主管', '地下室潮湿导致，需配合批次效应标记',
    logInfo.lastInsertRowid, 1, recordIdsFromBatch1[2]
  )
  insertComment.run(dupRecordInfo2.lastInsertRowid, 'system', '重复导入标记：与记录 ' + insertedRecordIds[7].recordNo + ' 重复', 'duplicate', null, null)
  console.log(`  插入第二条重复记录示例: ID=${dupRecordInfo2.lastInsertRowid}`)

  console.log('\n✅ 测试数据初始化完成!')
  console.log(`  采样地点: ${locIds.length} 个`)
  console.log(`  诱捕批次: ${batchIds.length} 个 (含1个批次效应标记)`)
  console.log(`  诱捕记录: ${insertedRecordIds.length + 2} 条 (含2条重复导入标记)`)
  console.log(`  正常样本: ${insertedRecordIds.filter(r => r.status === 'normal').length}`)
  console.log(`  边界样本: ${insertedRecordIds.filter(r => r.status === 'boundary').length}`)
  console.log(`  坏样本: ${insertedRecordIds.filter(r => r.status === 'bad').length}`)
  console.log(`  待复核样本: ${insertedRecordIds.filter(r => r.status === 'pending').length}`)
  console.log(`\n🚀 验收测试路径建议:`)
  console.log(`  1. 重复导入场景：查看导入日志 ID=${logInfo.lastInsertRowid}，包含 2 条被标记为重复的记录`)
  console.log(`  2. 批次效应倒查：查看批次 BATCH${today.subtract(3, 'day').format('YYYYMMDD')}-01，已标记为有批次效应`)
  console.log(`  3. 样本清单↔结论跳转：打开任意已复核记录，可见复核意见与结论相互关联`)
  console.log(`  4. 变更追溯：所有状态变更均记录在变更日志中`)

  setTimeout(() => process.exit(0), 500)
}

seed().catch(e => { console.error(e); process.exit(1) })
