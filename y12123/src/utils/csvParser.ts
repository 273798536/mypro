import Papa from 'papaparse';
import type { MemberBehavior, MemberState } from '../types';

const VALID_STATES: MemberState[] = ['active', 'inactive', 'dormant', 'churned', 'recalled'];

export function parseCSV(file: File): Promise<MemberBehavior[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const behaviors = results.data
            .map((row, idx) => mapRowToBehavior(row, idx))
            .filter((b): b is MemberBehavior => b !== null);
          resolve(behaviors);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function parseJSON(file: File): Promise<MemberBehavior[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const behaviors = Array.isArray(data)
          ? data.map((row, idx) => mapRowToBehavior(row, idx)).filter((b): b is MemberBehavior => b !== null)
          : [];
        resolve(behaviors);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function mapRowToBehavior(
  row: Record<string, unknown>,
  idx: number
): MemberBehavior | null {
  const memberId = String(row.memberId || row.member_id || row.id || '').trim();
  const timestamp = String(row.timestamp || row.time || row.date || '').trim();
  let state = String(row.state || row.status || '').trim().toLowerCase() as MemberState;

  if (!memberId && !timestamp && !state) {
    return null;
  }

  if (!VALID_STATES.includes(state)) {
    const stateMap: Record<string, MemberState> = {
      '活跃': 'active',
      '不活跃': 'inactive',
      '非活跃': 'inactive',
      '沉睡': 'dormant',
      '睡眠': 'dormant',
      '流失': 'churned',
      '已流失': 'churned',
      '召回': 'recalled',
      '已召回': 'recalled',
      'active': 'active',
      'inactive': 'inactive',
      'dormant': 'dormant',
      'churned': 'churned',
      'recalled': 'recalled',
    };
    state = stateMap[state] || state;
  }

  const isTouch = row.isTouch !== undefined 
    ? Boolean(row.isTouch)
    : row.touch !== undefined 
      ? Boolean(row.touch)
      : false;

  const value = row.value !== undefined ? Number(row.value) : undefined;
  const joinDate = row.joinDate || row.join_date || undefined;

  return {
    memberId: memberId || `record_${idx}`,
    memberName: row.memberName || row.member_name || row.name ? String(row.memberName || row.member_name || row.name) : undefined,
    timestamp: timestamp || new Date().toISOString(),
    state: VALID_STATES.includes(state) ? state : 'inactive',
    remark: row.remark || row.note || row.comment ? String(row.remark || row.note || row.comment) : undefined,
    source: row.source || row.channel ? String(row.source || row.channel) : undefined,
    isTouch,
    value: !isNaN(value as number) ? value : undefined,
    joinDate: joinDate ? String(joinDate) : undefined,
  };
}

export function generateTemplateCSV(): string {
  const headers = [
    'memberId',
    'memberName',
    'timestamp',
    'state',
    'remark',
    'source',
    'isTouch',
    'value',
    'joinDate',
  ];
  
  const sampleRows = [
    ['M001', '张三', '2024-01-15T10:30:00Z', 'active', '首次购买', 'app', 'false', '299', '2023-06-01'],
    ['M001', '张三', '2024-02-20T14:20:00Z', 'inactive', '超过30天未登录', 'system', 'false', '', ''],
    ['M002', '李四', '2024-01-10T09:00:00Z', 'active', '', 'app', 'false', '599', '2023-03-15'],
    ['M002', '李四', '2024-03-01T16:45:00Z', 'dormant', '超过60天未登录', 'system', 'false', '', ''],
    ['M003', '王五', '2024-02-01T11:00:00Z', 'churned', '超过90天未登录', 'system', 'false', '1299', '2022-12-01'],
  ];

  return [
    headers.join(','),
    ...sampleRows.map(row => row.join(',')),
  ].join('\n');
}
