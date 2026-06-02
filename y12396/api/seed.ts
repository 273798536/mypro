import crypto from 'crypto'
import db from './db.js'

export function seedDatabase(): void {
  const clearTables = db.transaction(() => {
    db.exec('DELETE FROM practice_reports')
    db.exec('DELETE FROM evidence_mappings')
    db.exec('DELETE FROM corrections')
    db.exec('DELETE FROM conflicts')
    db.exec('DELETE FROM beat_markers')
    db.exec('DELETE FROM speed_tiers')
    db.exec('DELETE FROM rhythm_detections')
    db.exec('DELETE FROM practice_records')
  })

  clearTables()

  const insertPractice = db.prepare(`
    INSERT INTO practice_records (id, student_name, practice_date, audio_file_name, audio_file_path, status, conflict_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertRhythm = db.prepare(`
    INSERT INTO rhythm_detections (id, practice_id, detected_bpm, confidence_score, detection_method, raw_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertTier = db.prepare(`
    INSERT INTO speed_tiers (id, practice_id, tiers, methodology)
    VALUES (?, ?, ?, ?)
  `)

  const insertBeat = db.prepare(`
    INSERT INTO beat_markers (id, practice_id, markers)
    VALUES (?, ?, ?)
  `)

  const insertConflict = db.prepare(`
    INSERT INTO conflicts (id, practice_id, conflict_type, severity, description, involved_evidence, event_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertCorrection = db.prepare(`
    INSERT INTO corrections (id, practice_id, field, old_value, new_value, reason, operator, linked_conflict_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertEvidence = db.prepare(`
    INSERT INTO evidence_mappings (id, practice_id, audio_start_time, audio_end_time, audio_label, bpm_tier_index, bpm_min, bpm_max, report_section, report_content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertReport = db.prepare(`
    INSERT INTO practice_reports (id, practice_id, methodology_note, evidence_correspondence, format)
    VALUES (?, ?, ?, ?, ?)
  `)

  const p1 = crypto.randomUUID()
  const p2 = crypto.randomUUID()
  const p3 = crypto.randomUUID()
  const p4 = crypto.randomUUID()
  const p5 = crypto.randomUUID()

  const seedData = db.transaction(() => {
    insertPractice.run(p1, '张小明', '2026-05-28', 'zhangxiaoming_20260528.wav', '/uploads/zhangxiaoming_20260528.wav', 'conflict', 2)
    insertPractice.run(p2, '李雨桐', '2026-05-29', 'liyutong_20260529.wav', '/uploads/liyutong_20260529.wav', 'normal', 0)
    insertPractice.run(p3, '王浩然', '2026-05-30', 'wanghaoran_20260530.wav', '/uploads/wanghaoran_20260530.wav', 'conflict', 1)
    insertPractice.run(p4, '赵思琪', '2026-05-31', 'zhaosiqi_20260531.wav', '/uploads/zhaosiqi_20260531.wav', 'corrected', 0)
    insertPractice.run(p5, '陈子轩', '2026-06-01', 'chenzixuan_20260601.wav', '/uploads/chenzixuan_20260601.wav', 'normal', 0)

    insertRhythm.run(crypto.randomUUID(), p1, 120.5, 0.92, 'onset_detection', JSON.stringify({ onsetTimes: [0, 0.5, 1.0, 1.5, 2.0], interOnsetIntervals: [0.5, 0.5, 0.5, 0.5] }))
    insertRhythm.run(crypto.randomUUID(), p2, 98.3, 0.88, 'autocorrelation', JSON.stringify({ onsetTimes: [0, 0.61, 1.22, 1.83], interOnsetIntervals: [0.61, 0.61, 0.61] }))
    insertRhythm.run(crypto.randomUUID(), p3, 132.0, 0.95, 'onset_detection', JSON.stringify({ onsetTimes: [0, 0.45, 0.91, 1.36], interOnsetIntervals: [0.45, 0.46, 0.45] }))
    insertRhythm.run(crypto.randomUUID(), p4, 110.0, 0.90, 'tempo_tracker', JSON.stringify({ onsetTimes: [0, 0.55, 1.09, 1.64], interOnsetIntervals: [0.55, 0.54, 0.55] }))
    insertRhythm.run(crypto.randomUUID(), p5, 88.7, 0.85, 'autocorrelation', JSON.stringify({ onsetTimes: [0, 0.68, 1.35, 2.03], interOnsetIntervals: [0.68, 0.67, 0.68] }))

    insertTier.run(crypto.randomUUID(), p1, JSON.stringify([
      { tierIndex: 1, bpmRange: [80, 100], startTime: 0, endTime: 5, label: '热身阶段' },
      { tierIndex: 2, bpmRange: [100, 120], startTime: 5, endTime: 12.3, label: '基础巩固' },
      { tierIndex: 3, bpmRange: [120, 140], startTime: 12.3, endTime: 13, label: '速度提升' },
      { tierIndex: 4, bpmRange: [140, 160], startTime: 13, endTime: 25, label: '极限挑战' }
    ]), 'progressive_metronome')

    insertTier.run(crypto.randomUUID(), p2, JSON.stringify([
      { tierIndex: 1, bpmRange: [70, 90], startTime: 0, endTime: 8, label: '慢速入门' },
      { tierIndex: 2, bpmRange: [90, 110], startTime: 8, endTime: 15, label: '中速练习' },
      { tierIndex: 3, bpmRange: [110, 130], startTime: 15, endTime: 20, label: '快速进阶' }
    ]), 'progressive_metronome')

    insertTier.run(crypto.randomUUID(), p3, JSON.stringify([
      { tierIndex: 1, bpmRange: [90, 110], startTime: 0, endTime: 5, label: '基础节奏' },
      { tierIndex: 2, bpmRange: [110, 130], startTime: 5, endTime: 10, label: '加速过渡' },
      { tierIndex: 3, bpmRange: [130, 150], startTime: 10, endTime: 20, label: '高速稳定' },
      { tierIndex: 4, bpmRange: [150, 170], startTime: 20, endTime: 30, label: '极限突破' }
    ]), 'progressive_metronome')

    insertTier.run(crypto.randomUUID(), p4, JSON.stringify([
      { tierIndex: 1, bpmRange: [80, 100], startTime: 0, endTime: 8, label: '恢复练习' },
      { tierIndex: 2, bpmRange: [100, 120], startTime: 8, endTime: 16, label: '标准速度' },
      { tierIndex: 3, bpmRange: [120, 140], startTime: 16, endTime: 22, label: '挑战提速' }
    ]), 'progressive_metronome')

    insertTier.run(crypto.randomUUID(), p5, JSON.stringify([
      { tierIndex: 1, bpmRange: [60, 80], startTime: 0, endTime: 7, label: '慢速热身' },
      { tierIndex: 2, bpmRange: [80, 100], startTime: 7, endTime: 13, label: '中速巩固' },
      { tierIndex: 3, bpmRange: [100, 120], startTime: 13, endTime: 18, label: '提速训练' }
    ]), 'progressive_metronome')

    const normalBeats = (interval: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        timeOffset: +(i * interval).toFixed(2),
        type: 'normal',
        expectedTime: +(i * interval).toFixed(2),
        actualTime: +(i * interval).toFixed(2),
        deviation: 0
      }))

    const p1Beats = [
      ...normalBeats(0.5, 24),
      { timeOffset: 12.3, type: 'rush' as const, expectedTime: 12.5, actualTime: 12.3, deviation: -0.2 },
      { timeOffset: 12.3, type: 'miss' as const, expectedTime: 12.5, actualTime: 12.7, deviation: 0.2 },
      ...normalBeats(0.5, 24).map(b => ({ ...b, timeOffset: +(b.timeOffset + 13).toFixed(2), expectedTime: +(b.expectedTime + 13).toFixed(2), actualTime: +(b.actualTime + 13).toFixed(2) })),
    ]

    const p2Beats = normalBeats(0.61, 33)

    const p3Beats = [
      ...normalBeats(0.45, 19),
      { timeOffset: 8.5, type: 'rush' as const, expectedTime: 8.55, actualTime: 8.5, deviation: -0.05 },
      ...normalBeats(0.45, 30).map(b => ({ ...b, timeOffset: +(b.timeOffset + 9).toFixed(2), expectedTime: +(b.expectedTime + 9).toFixed(2), actualTime: +(b.actualTime + 9).toFixed(2) })),
    ]

    const p4Beats = normalBeats(0.55, 40)
    const p5Beats = normalBeats(0.68, 27)

    insertBeat.run(crypto.randomUUID(), p1, JSON.stringify(p1Beats))
    insertBeat.run(crypto.randomUUID(), p2, JSON.stringify(p2Beats))
    insertBeat.run(crypto.randomUUID(), p3, JSON.stringify(p3Beats))
    insertBeat.run(crypto.randomUUID(), p4, JSON.stringify(p4Beats))
    insertBeat.run(crypto.randomUUID(), p5, JSON.stringify(p5Beats))

    const c1 = crypto.randomUUID()
    const c2 = crypto.randomUUID()
    const c3 = crypto.randomUUID()

    insertConflict.run(
      c1, p1, 'rush_miss_simultaneous', 'high',
      '在t=12.3s处同时检测到抢拍和漏拍事件，BPM在t=12.5s发生跳跃，跳跃时间点比抢拍/漏拍晚0.2秒',
      JSON.stringify([
        { source: 'audio', detail: '12.0-13.0s音频段异常' },
        { source: 'bpm', detail: '速度阶梯第3级(120-140 BPM)' },
        { source: 'beat_marker', detail: '抢拍@12.3s + 漏拍@12.3s' }
      ]),
      JSON.stringify([
        { event: 'rush', timestamp: 12.3, label: '抢拍 (t=12.3s)' },
        { event: 'miss', timestamp: 12.3, label: '漏拍 (t=12.3s)' },
        { event: 'bpm_jump', timestamp: 12.5, label: 'BPM跳级 (t=12.5s, 晚到0.2s)' }
      ]),
      'flagged'
    )

    insertConflict.run(
      c2, p1, 'audio_bpm_mismatch', 'medium',
      '音频检测结果BPM为120.5，与当前速度阶梯第3级(120-140)的起始值存在偏差，实际节奏更接近第2级(100-120)',
      JSON.stringify([
        { source: 'audio', detail: '检测BPM=120.5' },
        { source: 'bpm', detail: '速度阶梯第2级(100-120 BPM)' }
      ]),
      null,
      'pending'
    )

    insertConflict.run(
      c3, p3, 'bpm_jump_late', 'medium',
      '在t=8.5s处检测到抢拍，但BPM跳跃在t=8.7s才发生，延迟0.2秒',
      JSON.stringify([
        { source: 'audio', detail: '8.3-9.0s音频段' },
        { source: 'bpm', detail: '速度阶梯第2级(110-130 BPM)' },
        { source: 'beat_marker', detail: '抢拍@8.5s' }
      ]),
      JSON.stringify([
        { event: 'rush', timestamp: 8.5, label: '抢拍 (t=8.5s)' },
        { event: 'bpm_jump', timestamp: 8.7, label: 'BPM跳跃延迟0.2s' }
      ]),
      'pending'
    )

    const corr1 = crypto.randomUUID()
    insertCorrection.run(
      corr1, p1, 'detected_bpm', '120.5', '118.0',
      '根据音频BPM与速度阶梯偏差冲突，修正检测BPM值', '系统管理员', c2
    )

    insertCorrection.run(
      crypto.randomUUID(), p4, 'status', 'conflict', 'corrected',
      '所有冲突已解决，状态修正为已纠正', '王老师', null
    )

    insertEvidence.run(
      crypto.randomUUID(), p1, 0.0, 5.0, '热身慢击', 1, 80, 100,
      '速度阶梯分析', '音频0-5秒区间对应热身阶段，BPM范围80-100，节拍稳定'
    )
    insertEvidence.run(
      crypto.randomUUID(), p1, 5.0, 12.3, '基础巩固段', 2, 100, 120,
      '速度阶梯分析', '音频5-12.3秒区间对应基础巩固阶段，BPM范围100-120'
    )
    insertEvidence.run(
      crypto.randomUUID(), p1, 12.3, 13.0, '冲突区间', 3, 120, 140,
      '冲突检测报告', '音频12.3-13秒区间发生抢拍/漏拍同时事件，BPM跳跃至140附近'
    )
    insertEvidence.run(
      crypto.randomUUID(), p1, 13.0, 25.0, '极限挑战段', 4, 140, 160,
      '速度阶梯分析', '音频13-25秒区间对应极限挑战阶段，BPM范围140-160'
    )
    insertEvidence.run(
      crypto.randomUUID(), p3, 0.0, 8.5, '基础节奏段', 1, 90, 110,
      '速度阶梯分析', '音频0-8.5秒区间对应基础节奏阶段，节拍稳定'
    )
    insertEvidence.run(
      crypto.randomUUID(), p3, 8.5, 9.0, '冲突区间', 2, 110, 130,
      '冲突检测报告', '音频8.5-9秒区间检测到抢拍，BPM跳跃延迟'
    )

    insertReport.run(
      crypto.randomUUID(), p1,
      '采用渐进式节拍器法（Progressive Metronome），将练习速度划分为4个阶梯，从热身到极限逐步提升。BPM检测使用onset_detection算法，置信度0.92。',
      JSON.stringify([
        { audioSegment: '0-5s', tierLevel: 1, reportSection: '速度阶梯分析' },
        { audioSegment: '5-12.3s', tierLevel: 2, reportSection: '速度阶梯分析' },
        { audioSegment: '12.3-13s', tierLevel: 3, reportSection: '冲突检测报告' },
        { audioSegment: '13-25s', tierLevel: 4, reportSection: '速度阶梯分析' }
      ]),
      'pdf'
    )
  })

  seedData()
  console.log('Database seeded with demo data')
}
