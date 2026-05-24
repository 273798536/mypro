import { MeetingLedger, ChangeRecord, AuditLog, AccessRecord } from '../types';

const SENSITIVE_FIELDS = ['participants', 'organizer', 'accessRecords', 'customerServiceNotes'];

export function maskString(value: string, showFirst: number = 1, showLast: number = 1): string {
  if (!value || value.length <= showFirst + showLast) {
    return '*'.repeat(Math.max(0, value.length));
  }
  return value.slice(0, showFirst) + '*'.repeat(value.length - showFirst - showLast) + value.slice(-showLast);
}

export function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return '';
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length <= 4) return '*'.repeat(clean.length);
  return '*'.repeat(clean.length - 4) + clean.slice(-4);
}

export function maskAccessRecord(record: AccessRecord): AccessRecord {
  return {
    ...record,
    cardNumber: maskCardNumber(record.cardNumber),
    personName: maskString(record.personName, 1, 1)
  };
}

export function maskLedger(ledger: MeetingLedger): MeetingLedger {
  return {
    ...ledger,
    organizer: maskString(ledger.organizer, 1, 1),
    participants: ledger.participants.map(p => maskString(p, 1, 1)),
    accessRecords: ledger.accessRecords.map(maskAccessRecord),
    customerServiceNotes: ledger.customerServiceNotes.map(note => 
      note.replace(/([\u4e00-\u9fa5a-zA-Z])/g, '*')
    )
  };
}

export function maskChangeRecord(record: ChangeRecord): ChangeRecord {
  const maskData = (data: any): any => {
    if (!data) return data;
    const result = { ...data };
    if (result.organizer) result.organizer = maskString(result.organizer, 1, 1);
    if (result.participants) result.participants = result.participants.map((p: string) => maskString(p, 1, 1));
    if (result.accessRecords) result.accessRecords = result.accessRecords.map(maskAccessRecord);
    if (result.customerServiceNotes) {
      result.customerServiceNotes = result.customerServiceNotes.map((note: string) => 
        note.replace(/([\u4e00-\u9fa5a-zA-Z])/g, '*')
      );
    }
    return result;
  };

  return {
    ...record,
    operatorName: maskString(record.operatorName, 1, 1),
    beforeData: maskData(record.beforeData),
    afterData: maskData(record.afterData)
  };
}

export function maskAuditLog(log: AuditLog): AuditLog {
  return {
    ...log,
    userName: maskString(log.userName, 1, 1)
  };
}

export function hasSensitiveFieldChanged(changedFields: string[]): boolean {
  return changedFields.some(field => 
    SENSITIVE_FIELDS.some(sensitive => 
      field === sensitive || field.startsWith(sensitive + '.')
    )
  );
}

export function getSensitiveFieldNames(): string[] {
  return SENSITIVE_FIELDS;
}
