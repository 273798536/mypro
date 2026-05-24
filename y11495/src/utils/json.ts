export function toJsonString(obj: any): string {
  if (obj === null || obj === undefined) {
    return '';
  }
  if (typeof obj === 'string') {
    return obj;
  }
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return String(obj);
  }
}

export function fromJsonString<T = any>(str: string | null | undefined): T | null {
  if (!str) {
    return null;
  }
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    return str as any;
  }
}

export const parseJson = fromJsonString;
