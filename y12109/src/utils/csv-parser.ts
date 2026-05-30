import type { PolicySample } from '@/types';

const HEADER_MAP: Record<string, string> = {
  id: 'id',
  保单号: 'id',
  premium: 'premium',
  保费: 'premium',
  suminsured: 'sumInsured',
  sum_insured: 'sumInsured',
  保额: 'sumInsured',
  claimcount: 'claimCount',
  claim_count: 'claimCount',
  赔付次数: 'claimCount',
  claimamounts: 'claimAmounts',
  claim_amounts: 'claimAmounts',
  赔付金额: 'claimAmounts',
  lineofbusiness: 'lineOfBusiness',
  line_of_business: 'lineOfBusiness',
  险种: 'lineOfBusiness',
};

function cleanNumber(raw: string): number {
  const cleaned = raw.replace(/[,，]/g, '').trim();
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function mapHeaders(rawHeaders: string[]): Map<number, string> {
  const mapping = new Map<number, string>();
  rawHeaders.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/\s+/g, '');
    const mapped = HEADER_MAP[key];
    if (mapped) {
      mapping.set(i, mapped);
    }
  });
  return mapping;
}

function parseClaimAmounts(raw: string): number[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(';')
    .map((s) => cleanNumber(s))
    .filter((n) => n > 0);
}

export function parseCSV(csvText: string): PolicySample[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];

  const headerParts = lines[0].split(',');
  const headerMapping = mapHeaders(headerParts);

  const requiredFields = ['id', 'premium', 'sumInsured', 'claimCount'];
  const mappedFields = new Set(headerMapping.values());
  for (const field of requiredFields) {
    if (!mappedFields.has(field)) return [];
  }

  const results: PolicySample[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length === 0 || !cols[0].trim()) continue;

    const row: Record<string, string> = {};
    headerMapping.forEach((field, idx) => {
      row[field] = cols[idx] ?? '';
    });

    const id = row.id?.trim();
    if (!id) continue;

    const premium = cleanNumber(row.premium);
    const sumInsured = cleanNumber(row.sumInsured);
    const claimCount = Math.round(cleanNumber(row.claimCount));

    let claimAmounts: number[];
    if (row.claimAmounts !== undefined && row.claimAmounts.trim() !== '') {
      claimAmounts = parseClaimAmounts(row.claimAmounts);
    } else {
      claimAmounts = [];
      for (let j = 0; j < claimCount; j++) {
        const ratio = Math.random() * 0.1;
        claimAmounts.push(Math.round(sumInsured * ratio * 100) / 100);
      }
    }

    const lineOfBusiness = row.lineOfBusiness?.trim() || '通用';

    results.push({
      id,
      premium,
      sumInsured,
      claimCount,
      claimAmounts,
      lineOfBusiness,
    });
  }

  return results;
}

export function generateSampleData(): PolicySample[] {
  const lines = [
    ...Array(6).fill('机动车'),
    ...Array(6).fill('财产'),
    ...Array(4).fill('责任'),
    ...Array(4).fill('工程'),
  ];

  const policies: PolicySample[] = [];

  for (let i = 0; i < 20; i++) {
    const id = `P${String(i + 1).padStart(3, '0')}`;
    const line = lines[i];
    const premium = Math.round(5000 + Math.random() * 45000);
    const sumInsured = Math.round(100000 + Math.random() * 1900000);

    let claimCount: number;
    if (i < 12) {
      claimCount = Math.random() < 0.6 ? Math.ceil(Math.random() * 3) : 0;
    } else {
      claimCount = Math.random() < 0.6 ? Math.ceil(Math.random() * 2) : 0;
    }

    const claimAmounts: number[] = [];
    for (let j = 0; j < claimCount; j++) {
      if (line === '机动车') {
        claimAmounts.push(
          Math.round(sumInsured * (0.02 + Math.random() * 0.15) * 100) / 100
        );
      } else if (line === '财产') {
        claimAmounts.push(
          Math.round(sumInsured * (0.05 + Math.random() * 0.35) * 100) / 100
        );
      } else if (line === '责任') {
        claimAmounts.push(
          Math.round(sumInsured * (0.03 + Math.random() * 0.25) * 100) / 100
        );
      } else {
        claimAmounts.push(
          Math.round(sumInsured * (0.04 + Math.random() * 0.3) * 100) / 100
        );
      }
    }

    policies.push({
      id,
      premium,
      sumInsured,
      claimCount,
      claimAmounts,
      lineOfBusiness: line,
    });
  }

  policies[3].claimCount = 2;
  policies[3].claimAmounts = [
    Math.round(policies[3].sumInsured * 0.85 * 100) / 100,
    Math.round(policies[3].sumInsured * 0.7 * 100) / 100,
  ];

  policies[9].claimCount = 1;
  policies[9].claimAmounts = [
    Math.round(policies[9].sumInsured * 0.95 * 100) / 100,
  ];

  policies[15].claimCount = 2;
  policies[15].claimAmounts = [
    Math.round(policies[15].sumInsured * 0.9 * 100) / 100,
    Math.round(policies[15].sumInsured * 0.6 * 100) / 100,
  ];

  return policies;
}
