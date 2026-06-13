import type { MotorTorqueRecord, FilterCriteria, PageSummary } from '../types';
import { diagnoseJumps } from './dataAnalysis';

export function filterRecords(
  records: MotorTorqueRecord[],
  criteria: FilterCriteria
): MotorTorqueRecord[] {
  return records.filter(record => {
    if (criteria.device_ids.length > 0 && !criteria.device_ids.includes(record.device_id)) {
      return false;
    }

    if (criteria.time_range) {
      const recordTime = new Date(record.timestamp).getTime();
      const [start, end] = criteria.time_range.map(t => new Date(t).getTime());
      if (recordTime < start || recordTime > end) {
        return false;
      }
    }

    if (criteria.torque_range) {
      const [min, max] = criteria.torque_range;
      if (record.torque_value < min || record.torque_value > max) {
        return false;
      }
    }

    if (criteria.units.length > 0 && !criteria.units.includes(record.torque_unit)) {
      return false;
    }

    if (criteria.show_outliers_only && !record.is_outlier) {
      return false;
    }

    if (criteria.show_duplicates_only && !record.is_device_duplicate) {
      return false;
    }

    if (criteria.show_dirty_data_only && !record.is_data_dirty) {
      return false;
    }

    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      const searchText = [
        record.device_id,
        record.device_name,
        record.maintenance_note_raw,
        ...(record.tags || [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchText.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

export function generatePageSummary(
  allRecords: MotorTorqueRecord[],
  filteredRecords: MotorTorqueRecord[],
  criteria: FilterCriteria
): PageSummary {
  const validValues = filteredRecords
    .map(r => r.torque_value)
    .filter(v => !isNaN(v));

  const timestamps = filteredRecords
    .map(r => new Date(r.timestamp).getTime())
    .filter(t => !isNaN(t));

  const uniqueDevices = new Set(filteredRecords.map(r => r.device_id));

  const jumpEvents = diagnoseJumps(filteredRecords);

  return {
    total_records: allRecords.length,
    filtered_records: filteredRecords.length,
    outlier_count: filteredRecords.filter(r => r.is_outlier).length,
    duplicate_count: filteredRecords.filter(r => r.is_device_duplicate).length,
    dirty_data_count: filteredRecords.filter(r => r.is_data_dirty).length,
    max_torque: validValues.length > 0 ? Math.max(...validValues) : 0,
    min_torque: validValues.length > 0 ? Math.min(...validValues) : 0,
    avg_torque: validValues.length > 0
      ? validValues.reduce((a, b) => a + b, 0) / validValues.length
      : 0,
    device_count: uniqueDevices.size,
    time_span: timestamps.length > 0
      ? [
          new Date(Math.min(...timestamps)).toISOString(),
          new Date(Math.max(...timestamps)).toISOString()
        ]
      : null,
    filter_criteria: criteria,
    jump_events: jumpEvents
  };
}

export function getDefaultFilterCriteria(): FilterCriteria {
  return {
    device_ids: [],
    time_range: null,
    torque_range: null,
    show_outliers_only: false,
    show_duplicates_only: false,
    show_dirty_data_only: false,
    units: [],
    keyword: ''
  };
}
