export interface ParsedDate {
  normalized: string | null;
  raw: string;
  formatUnclear: boolean;
  isPartial: boolean;
}

const PATTERNS: Array<{ regex: RegExp; handler: (m: RegExpMatchArray) => ParsedDate }> = [
  {
    regex: /(\d{4})[.\-\/年](\d{1,2})[.\-\/月](\d{1,2})日?/,
    handler: (m) => {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) {
        return { normalized: null, raw: m[0], formatUnclear: true, isPartial: false };
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        normalized: `${y}-${pad(mo)}-${pad(d)}`,
        raw: m[0],
        formatUnclear: false,
        isPartial: false,
      };
    },
  },
  {
    regex: /(\d{1,2})[月\-\/](\d{1,2})日?/,
    handler: (m) => {
      const mo = parseInt(m[1], 10);
      const d = parseInt(m[2], 10);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) {
        return { normalized: null, raw: m[0], formatUnclear: true, isPartial: true };
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      const currentYear = new Date().getFullYear();
      return {
        normalized: `${currentYear}-${pad(mo)}-${pad(d)}`,
        raw: m[0],
        formatUnclear: true,
        isPartial: true,
      };
    },
  },
  {
    regex: /(\d{4})(\d{2})(\d{2})/,
    handler: (m) => {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      if (y < 1970 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) {
        return { normalized: null, raw: m[0], formatUnclear: true, isPartial: false };
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        normalized: `${y}-${pad(mo)}-${pad(d)}`,
        raw: m[0],
        formatUnclear: false,
        isPartial: false,
      };
    },
  },
];

const DATE_HINT_CHARS = /[.\-\/年月日]/;
const DATE_HINT_WORDS = /(到期|截止|期限|有效期|前|之前|为止|结束)/;

export function looksLikeDateField(text: string): boolean {
  if (!text || !text.trim()) return false;
  const t = text.trim();
  if (t.length < 5) return false;
  if (/^\d+$/.test(t) && t.length >= 6 && t.length <= 8) return true;
  if (DATE_HINT_WORDS.test(t)) return true;
  const hasDigit = /\d/.test(t);
  const hasDateChar = DATE_HINT_CHARS.test(t);
  if (hasDigit && hasDateChar) return true;
  return false;
}

export function parseDate(text: string): ParsedDate | null {
  if (!text || !text.trim()) return null;
  for (const p of PATTERNS) {
    const m = text.match(p.regex);
    if (m) return p.handler(m);
  }
  return null;
}

export function parseDateOrInvalid(text: string): ParsedDate | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  const parsed = parseDate(t);
  if (parsed) return parsed;
  if (looksLikeDateField(t)) {
    return { normalized: null, raw: t, formatUnclear: true, isPartial: false };
  }
  return null;
}

export function extractDateFromText(text: string): ParsedDate | null {
  if (!text) return null;
  const authKeywords = /(授权|到期|截止|期限|有效期|auth|deadline|expire)/i;
  const sentences = text.split(/[。；;\n]/);
  for (const sen of sentences) {
    if (authKeywords.test(sen)) {
      const d = parseDate(sen);
      if (d) return d;
    }
  }
  for (const sen of sentences) {
    const d = parseDate(sen);
    if (d) return d;
  }
  return null;
}
