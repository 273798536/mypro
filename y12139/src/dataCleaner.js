const moment = require('moment');
const crypto = require('crypto');

class DataCleaner {
  constructor() {
    this.warnings = [];
  }

  hashRecord(record) {
    return crypto.createHash('md5')
      .update(JSON.stringify(record))
      .digest('hex');
  }

  cleanDefrostRecords(records) {
    this.warnings = [];
    const cleaned = [];

    records.forEach((record, index) => {
      const cleanedRecord = {
        record_id: record.record_id || `defrost_${Date.now()}_${index}`,
        start_time: this.normalizeDateTime(record.start_time),
        end_time: this.normalizeDateTime(record.end_time),
        duration_seconds: record.duration_seconds,
        energy_consumption: this.parseNumber(record.energy_consumption),
        evaporator_temp_before: this.parseNumber(record.evaporator_temp_before),
        evaporator_temp_after: this.parseNumber(record.evaporator_temp_after),
        status: record.status || 'unknown',
        fan_status: record.fan_status,
        remarks: record.remarks || '',
        is_manual: record.is_manual || false,
        data_quality: 'good'
      };

      const issues = [];

      if (!cleanedRecord.start_time) {
        issues.push('缺少开始时间');
        cleanedRecord.data_quality = 'poor';
      }

      if (!cleanedRecord.end_time && cleanedRecord.start_time) {
        if (cleanedRecord.duration_seconds) {
          cleanedRecord.end_time = moment(cleanedRecord.start_time)
            .add(cleanedRecord.duration_seconds, 'seconds')
            .toISOString();
          issues.push('根据时长推算结束时间');
        } else {
          cleanedRecord.end_time = moment(cleanedRecord.start_time)
            .add(30, 'minutes')
            .toISOString();
          issues.push('假设默认30分钟融霜时长');
          cleanedRecord.duration_seconds = 1800;
        }
      }

      if (cleanedRecord.start_time && cleanedRecord.end_time && !cleanedRecord.duration_seconds) {
        cleanedRecord.duration_seconds = moment(cleanedRecord.end_time)
          .diff(moment(cleanedRecord.start_time), 'seconds');
        issues.push('根据起止时间计算时长');
      }

      if (!cleanedRecord.energy_consumption) {
        const durationHours = cleanedRecord.duration_seconds / 3600;
        cleanedRecord.energy_consumption = durationHours * 8;
        issues.push('使用默认功率(8kW)估算能耗');
      }

      if (cleanedRecord.remarks && cleanedRecord.remarks.includes('手动')) {
        cleanedRecord.is_manual = true;
      }

      if (issues.length > 0) {
        cleanedRecord.data_quality = issues.length > 2 ? 'poor' : 'fair';
        this.warnings.push({
          record_id: cleanedRecord.record_id,
          type: 'defrost',
          issues
        });
      }

      cleanedRecord.record_hash = this.hashRecord(cleanedRecord);
      cleaned.push(cleanedRecord);
    });

    return cleaned;
  }

  cleanTemperatureReadings(readings) {
    this.warnings = [];
    const cleaned = [];

    readings.forEach((reading, index) => {
      const cleanedReading = {
        probe_id: reading.probe_id || `probe_${index}`,
        reading_time: this.normalizeDateTime(reading.reading_time || reading.time),
        temperature: this.parseNumber(reading.temperature || reading.value),
        remarks: reading.remarks || reading.note || '',
        is_offline: false,
        data_quality: 'good'
      };

      const issues = [];

      if (!cleanedReading.reading_time) {
        issues.push('缺少读数时间');
        cleanedReading.data_quality = 'poor';
      }

      if (cleanedReading.temperature === null) {
        cleanedReading.is_offline = true;
        cleanedReading.data_quality = 'poor';
        issues.push('温度读数缺失，标记为离线');
      }

      if (cleanedReading.temperature > 50 || cleanedReading.temperature < -50) {
        issues.push(`温度值异常: ${cleanedReading.temperature}℃`);
        cleanedReading.data_quality = 'fair';
      }

      if (cleanedReading.remarks) {
        if (cleanedReading.remarks.includes('离线') || 
            cleanedReading.remarks.includes('断连') ||
            cleanedReading.remarks.includes('offline')) {
          cleanedReading.is_offline = true;
          issues.push('根据备注标记为离线');
        }
      }

      if (issues.length > 0) {
        this.warnings.push({
          probe_id: cleanedReading.probe_id,
          type: 'temperature',
          issues
        });
      }

      cleanedReading.record_hash = this.hashRecord(cleanedReading);
      cleaned.push(cleanedReading);
    });

    return cleaned;
  }

  cleanFanStatusRecords(records, referenceTime) {
    this.warnings = [];
    const cleaned = [];

    records.forEach((record, index) => {
      const cleanedRecord = {
        fan_id: record.fan_id || `fan_${index}`,
        status_time: this.normalizeDateTime(record.status_time || record.time),
        status: record.status || 'unknown',
        speed_percent: this.parseNumber(record.speed_percent) || 0,
        delay_seconds: 0
      };

      const issues = [];

      if (!cleanedRecord.status_time) {
        issues.push('缺少状态时间');
      }

      if (referenceTime && cleanedRecord.status_time) {
        const delay = moment(cleanedRecord.status_time).diff(moment(referenceTime), 'seconds');
        if (delay > 300) {
          cleanedRecord.delay_seconds = delay;
          issues.push(`数据延迟到达: ${delay}秒`);
        }
      }

      if (issues.length > 0) {
        this.warnings.push({
          fan_id: cleanedRecord.fan_id,
          type: 'fan',
          issues
        });
      }

      cleaned.push(cleanedRecord);
    });

    return cleaned;
  }

  cleanDoorStatusRecords(records) {
    this.warnings = [];
    const cleaned = [];

    records.forEach((record, index) => {
      const cleanedRecord = {
        door_id: record.door_id || `door_${index}`,
        event_time: this.normalizeDateTime(record.event_time || record.time),
        is_open: record.is_open !== undefined ? record.is_open : 
                 (record.status === 'open' || record.status === 1),
        duration_seconds: this.parseNumber(record.duration_seconds)
      };

      const issues = [];

      if (!cleanedRecord.event_time) {
        issues.push('缺少事件时间');
      }

      if (cleanedRecord.is_open && !cleanedRecord.duration_seconds) {
        issues.push('开门记录缺少时长');
      }

      if (issues.length > 0) {
        this.warnings.push({
          door_id: cleanedRecord.door_id,
          type: 'door',
          issues
        });
      }

      cleaned.push(cleanedRecord);
    });

    return cleaned;
  }

  normalizeDateTime(value) {
    if (!value) return null;
    const m = moment(value);
    return m.isValid() ? m.toISOString() : null;
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  getWarnings() {
    return this.warnings;
  }

  alignRecordsByTime(defrostRecords, temperatureReadings, fanRecords, doorRecords) {
    const allTimes = new Set();
    
    defrostRecords.forEach(r => {
      if (r.start_time) allTimes.add(r.start_time);
      if (r.end_time) allTimes.add(r.end_time);
    });
    
    temperatureReadings.forEach(r => {
      if (r.reading_time) allTimes.add(r.reading_time);
    });

    const sortedTimes = Array.from(allTimes).sort();

    return {
      timeline: sortedTimes,
      defrostRecords,
      temperatureReadings,
      fanRecords,
      doorRecords
    };
  }
}

module.exports = DataCleaner;
