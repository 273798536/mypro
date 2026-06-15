import type { BaseDataRecord } from '@/types';

export async function generateRecordHash(record: BaseDataRecord): Promise<string> {
  const coreFields = {
    type: record.type,
    timestamp: Math.floor(record.timestamp / 60000) * 60000,
    location: {
      lat: record.location.lat.toFixed(6),
      lng: record.location.lng.toFixed(6)
    },
    source: record.source
  };

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(coreFields));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
