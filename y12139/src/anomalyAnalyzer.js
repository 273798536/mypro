const moment = require('moment');

class AnomalyAnalyzer {
  constructor() {
    this.anomalies = [];
  }

  detectDefrostOverlap(defrostRecords) {
    const overlaps = [];
    const sorted = [...defrostRecords].sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];

        const aStart = moment(a.start_time);
        const aEnd = moment(a.end_time || a.start_time);
        const bStart = moment(b.start_time);
        const bEnd = moment(b.end_time || b.start_time);

        if (bStart.isBefore(aEnd)) {
          const overlapStart = moment.max(aStart, bStart);
          const overlapEnd = moment.min(aEnd, bEnd);
          const overlapSeconds = overlapEnd.diff(overlapStart, 'seconds');

          if (overlapSeconds > 60) {
            overlaps.push({
              anomaly_type: 'defrost_overlap',
              severity: overlapSeconds > 600 ? 'high' : 'medium',
              start_time: overlapStart.toISOString(),
              end_time: overlapEnd.toISOString(),
              description: `融霜重叠: ${a.record_id} 与 ${b.record_id} 重叠 ${overlapSeconds}秒`,
              attribution: JSON.stringify({
                cause: '多蒸发器同时融霜',
                affected_evaporators: 2,
                overlap_duration_seconds: overlapSeconds,
                energy_waste_estimation: (overlapSeconds / 3600) * 8
              }),
              correction_suggestions: JSON.stringify([
                {
                  priority: 1,
                  action: '调整融霜时间间隔',
                  description: `将 ${b.record_id} 的开始时间延后至少 ${Math.ceil(overlapSeconds / 60)} 分钟`,
                  expected_impact: `预计减少能耗浪费约 ${((overlapSeconds / 3600) * 8).toFixed(2)} kWh`
                },
                {
                  priority: 2,
                  action: '启用融霜联锁控制',
                  description: '配置PLC逻辑，确保同一时间只有一组蒸发器在融霜',
                  expected_impact: '彻底消除融霜重叠现象'
                },
                {
                  priority: 3,
                  action: '优化融霜时长',
                  description: '检查每台蒸发器的实际融霜需求，减少不必要的融霜时间',
                  expected_impact: '降低整体融霜能耗10-20%'
                }
              ]),
              related_records: JSON.stringify([a.record_id, b.record_id])
            });
          }
        }
      }
    }

    this.anomalies.push(...overlaps);
    return overlaps;
  }

  detectProbeOffline(temperatureReadings, thresholdMinutes = 15) {
    const offlineEvents = [];
    const groupedByProbe = {};

    temperatureReadings.forEach(r => {
      if (!groupedByProbe[r.probe_id]) groupedByProbe[r.probe_id] = [];
      groupedByProbe[r.probe_id].push(r);
    });

    Object.entries(groupedByProbe).forEach(([probeId, readings]) => {
      const sorted = readings.sort((a, b) => 
        new Date(a.reading_time) - new Date(b.reading_time)
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = moment(sorted[i - 1].reading_time);
        const curr = moment(sorted[i].reading_time);
        const gap = curr.diff(prev, 'minutes');

        if (gap > thresholdMinutes) {
          offlineEvents.push({
            anomaly_type: 'probe_offline',
            severity: gap > 120 ? 'high' : gap > 60 ? 'medium' : 'low',
            start_time: prev.toISOString(),
            end_time: curr.toISOString(),
            description: `探头 ${probeId} 离线 ${gap} 分钟`,
            attribution: JSON.stringify({
              cause: '数据中断',
              gap_minutes: gap,
              last_reading: sorted[i - 1].temperature,
              next_reading: sorted[i].temperature
            }),
            correction_suggestions: JSON.stringify([
              {
                priority: 1,
                action: '检查探头通讯连接',
                description: '检查RS485总线或网络连接是否松动',
                expected_impact: '恢复数据采集'
              },
              {
                priority: 2,
                action: '验证探头供电',
                description: '检查探头电源是否正常',
                expected_impact: '排除供电故障'
              },
              {
                priority: 3,
                action: '离线时段数据补全',
                description: `使用相邻探头数据插值补全 ${gap} 分钟的缺失数据`,
                expected_impact: '提高分析完整性'
              }
            ]),
            related_records: JSON.stringify([probeId])
          });
        }
      }

      const offlineReadings = readings.filter(r => r.is_offline);
      if (offlineReadings.length > 0) {
        offlineEvents.push({
          anomaly_type: 'probe_offline',
          severity: 'medium',
          start_time: offlineReadings[0].reading_time,
          end_time: offlineReadings[offlineReadings.length - 1].reading_time,
          description: `探头 ${probeId} 标记为离线，共 ${offlineReadings.length} 条记录`,
          attribution: JSON.stringify({
            cause: '探头故障或人为标记',
            offline_records_count: offlineReadings.length
          }),
          correction_suggestions: JSON.stringify([
            {
              priority: 1,
              action: '检查探头硬件状态',
              description: '现场确认探头是否正常工作',
              expected_impact: '确认探头状态'
            },
            {
              priority: 2,
              action: '更换备用探头',
              description: '如确认探头故障，立即更换',
              expected_impact: '恢复温度监测'
            }
          ]),
          related_records: JSON.stringify([probeId])
        });
      }
    });

    this.anomalies.push(...offlineEvents);
    return offlineEvents;
  }

  detectDoorOpenTooLong(doorRecords, thresholdSeconds = 300) {
    const doorAnomalies = [];

    doorRecords.forEach(record => {
      if (record.is_open && record.duration_seconds > thresholdSeconds) {
        const durationMinutes = Math.round(record.duration_seconds / 60);
        doorAnomalies.push({
          anomaly_type: 'door_open_too_long',
          severity: record.duration_seconds > 1800 ? 'high' : 
                    record.duration_seconds > 600 ? 'medium' : 'low',
          start_time: record.event_time,
          end_time: moment(record.event_time)
            .add(record.duration_seconds, 'seconds')
            .toISOString(),
          description: `库门 ${record.door_id} 开启时长 ${durationMinutes} 分钟`,
          attribution: JSON.stringify({
            door_id: record.door_id,
            open_duration_seconds: record.duration_seconds,
            threshold_exceeded_by: record.duration_seconds - thresholdSeconds,
            estimated_cold_loss_kw: this.estimateDoorColdLoss(record.duration_seconds)
          }),
          correction_suggestions: JSON.stringify([
            {
              priority: 1,
              action: '检查关门机制',
              description: '确认库门是否能够自动关闭',
              expected_impact: '确保库门正常关闭'
            },
            {
              priority: 2,
              action: '安装声光报警器',
              description: `在库门开启超过 ${Math.round(thresholdSeconds / 60)} 分钟时触发警报`,
              expected_impact: '及时提醒操作人员'
            },
            {
              priority: 3,
              action: '优化作业流程',
              description: '减少单次开门时间，合并出入库作业',
              expected_impact: '降低冷量损失约30%'
            }
          ]),
          related_records: JSON.stringify([record.door_id])
        });
      }
    });

    this.anomalies.push(...doorAnomalies);
    return doorAnomalies;
  }

  estimateDoorColdLoss(durationSeconds) {
    const coldLossRate = 2.5;
    return (durationSeconds / 3600) * coldLossRate;
  }

  detectAbnormalDefrostEnergy(defrostRecords, baselineKwh = 4) {
    const energyAnomalies = [];

    defrostRecords.forEach(record => {
      if (record.energy_consumption > baselineKwh * 1.5) {
        energyAnomalies.push({
          anomaly_type: 'abnormal_defrost_energy',
          severity: record.energy_consumption > baselineKwh * 2 ? 'high' : 'medium',
          start_time: record.start_time,
          end_time: record.end_time,
          description: `融霜 ${record.record_id} 能耗异常: ${record.energy_consumption.toFixed(2)} kWh`,
          attribution: JSON.stringify({
            record_id: record.record_id,
            actual_energy: record.energy_consumption,
            baseline_energy: baselineKwh,
            deviation_percent: ((record.energy_consumption - baselineKwh) / baselineKwh * 100).toFixed(1)
          }),
          correction_suggestions: JSON.stringify([
            {
              priority: 1,
              action: '检查蒸发器结霜情况',
              description: '确认是否结霜过厚导致融霜时间延长',
              expected_impact: '找出能耗高根本原因'
            },
            {
              priority: 2,
              action: '优化融霜终止温度',
              description: '适当提高融霜终止温度设定值',
              expected_impact: '减少过度融霜'
            },
            {
              priority: 3,
              action: '检查加热管状态',
              description: '确认电加热管是否全部正常工作',
              expected_impact: '排除设备故障'
            }
          ]),
          related_records: JSON.stringify([record.record_id])
        });
      }
    });

    this.anomalies.push(...energyAnomalies);
    return energyAnomalies;
  }

  detectFanDelay(fanRecords, defrostRecords) {
    const delayAnomalies = [];

    defrostRecords.forEach(defrost => {
      const defrostEnd = moment(defrost.end_time);
      const relatedFanRecords = fanRecords.filter(fan => {
        const fanTime = moment(fan.status_time);
        return fanTime.isAfter(defrostEnd) && 
               fanTime.isBefore(defrostEnd.clone().add(10, 'minutes'));
      });

      if (relatedFanRecords.length > 0) {
        const firstFanRecord = relatedFanRecords.sort((a, b) => 
          new Date(a.status_time) - new Date(b.status_time)
        )[0];
        
        const delay = moment(firstFanRecord.status_time).diff(defrostEnd, 'seconds');
        
        if (delay > 180) {
          delayAnomalies.push({
            anomaly_type: 'fan_start_delay',
            severity: delay > 300 ? 'medium' : 'low',
            start_time: defrost.end_time,
            end_time: firstFanRecord.status_time,
            description: `融霜后风机延迟启动 ${delay} 秒`,
            attribution: JSON.stringify({
              delay_seconds: delay,
              fan_id: firstFanRecord.fan_id
            }),
            correction_suggestions: JSON.stringify([
              {
                priority: 1,
                action: '调整风机启动延时参数',
                description: `将融霜后风机启动延时从 ${delay} 秒调整为 120 秒`,
                expected_impact: '加快库温恢复速度'
              }
            ]),
            related_records: JSON.stringify([defrost.record_id, firstFanRecord.fan_id])
          });
        }
      }
    });

    this.anomalies.push(...delayAnomalies);
    return delayAnomalies;
  }

  getAllAnomalies() {
    return this.anomalies;
  }

  clearAnomalies() {
    this.anomalies = [];
  }
}

module.exports = AnomalyAnalyzer;
