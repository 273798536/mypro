import { LiabilityRecord, DirtyRecordType, DataSource } from '../types';

export interface DetectionResult {
  isDirty: boolean;
  dirtyTypes: DirtyRecordType[];
  details: Array<{
    type: DirtyRecordType;
    field?: string;
    expected?: string;
    actual?: string;
  }>;
}

const REQUIRED_FIELDS = [
  'ticketId',
  'compensationAmount',
  'occurrenceDate',
  'dataSources'
];

const CUSTOMER_IDENTIFYING_FIELDS = ['customerName', 'customerPhone'];
const AGENT_IDENTIFYING_FIELDS = ['agentName', 'agentId'];

export function detectDirtyRecords(
  record: Partial<LiabilityRecord>,
  existingRecords?: LiabilityRecord[]
): DetectionResult {
  const dirtyTypes: DirtyRecordType[] = [];
  const details: DetectionResult['details'] = [];

  const missingFields = REQUIRED_FIELDS.filter(field => {
    const value = (record as any)[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    dirtyTypes.push(DirtyRecordType.MISSING_FIELDS);
    details.push({
      type: DirtyRecordType.MISSING_FIELDS,
      field: missingFields.join(', ')
    });
  }

  if (existingRecords && existingRecords.length > 0) {
    const occurrenceDate = record.occurrenceDate;
    const hasCrossDate = existingRecords.some(
      r => r.occurrenceDate !== occurrenceDate && r.ticketId === record.ticketId
    );

    if (hasCrossDate) {
      dirtyTypes.push(DirtyRecordType.CROSS_DATE);
      details.push({
        type: DirtyRecordType.CROSS_DATE,
        field: 'occurrenceDate',
        expected: existingRecords[0].occurrenceDate,
        actual: occurrenceDate
      });
    }

    for (const field of CUSTOMER_IDENTIFYING_FIELDS) {
      const existingValues = new Set(
        existingRecords
          .map(r => (r as any)[field])
          .filter(v => v !== undefined && v !== null && v !== '')
      );
      const currentValue = (record as any)[field];

      if (existingValues.size > 0 && currentValue && !existingValues.has(currentValue)) {
        dirtyTypes.push(DirtyRecordType.NAME_CHANGE);
        details.push({
          type: DirtyRecordType.NAME_CHANGE,
          field,
          expected: Array.from(existingValues).join(' / '),
          actual: currentValue
        });
        break;
      }
    }

    if (record.compensationAmount !== undefined) {
      const existingAmounts = new Set(
        existingRecords.map(r => r.compensationAmount)
      );

      if (existingAmounts.size > 0 && !existingAmounts.has(record.compensationAmount)) {
        dirtyTypes.push(DirtyRecordType.AMOUNT_CONFLICT);
        details.push({
          type: DirtyRecordType.AMOUNT_CONFLICT,
          field: 'compensationAmount',
          expected: Array.from(existingAmounts).join(' / '),
          actual: String(record.compensationAmount)
        });
      }
    }

    if (record.transferCount !== undefined) {
      const existingCounts = new Set(
        existingRecords
          .map(r => r.transferCount)
          .filter(v => v !== undefined)
      );

      if (existingCounts.size > 0 && !existingCounts.has(record.transferCount)) {
        dirtyTypes.push(DirtyRecordType.QUANTITY_CONFLICT);
        details.push({
          type: DirtyRecordType.QUANTITY_CONFLICT,
          field: 'transferCount',
          expected: Array.from(existingCounts).map(String).join(' / '),
          actual: String(record.transferCount)
        });
      }
    }
  }

  return {
    isDirty: dirtyTypes.length > 0,
    dirtyTypes: [...new Set(dirtyTypes)],
    details
  };
}

export function hasAllDataSourcesPresent(
  dataSources: DataSource[]
): { complete: boolean; missing: DataSource[] } {
  const requiredSources = [
    DataSource.SESSION_SUMMARY,
    DataSource.SLA_RULE,
    DataSource.COMPENSATION_APPROVAL
  ];

  const missing = requiredSources.filter(s => !dataSources.includes(s));

  return {
    complete: missing.length === 0,
    missing
  };
}
