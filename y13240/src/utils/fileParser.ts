import { ParsedAudioFile } from '@/types';

export function parseStallNumber(filename: string): string | null {
  const patterns = [
    /摊位[#号]?([A-Za-z]?\d+[A-Za-z0-9\-]*)/,
    /摊位[#号]?([A-Za-z]+\d+[A-Za-z0-9\-]*)/,
    /摊位[#号]?(\d+[A-Za-z0-9\-]*)/,
  ];
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function parseAuthorization(remark: string): string | null {
  const patterns = [
    /(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/,
    /授权至[：: ]*(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/,
    /有效期[至到][：: ]*(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/,
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
  ];

  for (const pattern of patterns) {
    const match = remark.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

export function parseAudioFile(file: File): Promise<ParsedAudioFile> {
  return new Promise((resolve) => {
    const fileName = file.name;
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    const stallNumber = parseStallNumber(nameWithoutExt);
    const authFromFileName = parseAuthorization(nameWithoutExt);

    const reader = new FileReader();
    reader.onload = () => {
      const remark = (reader.result as string) || '';
      const authFromRemark = parseAuthorization(remark);

      resolve({
        fileName,
        stallNumber,
        remark: remark || nameWithoutExt,
        authorizationDate: authFromRemark || authFromFileName,
      });
    };
    reader.onerror = () => {
      resolve({
        fileName,
        stallNumber,
        remark: nameWithoutExt,
        authorizationDate: authFromFileName,
      });
    };

    try {
      reader.readAsText(file.slice(0, 1024 * 100));
    } catch {
      resolve({
        fileName,
        stallNumber,
        remark: nameWithoutExt,
        authorizationDate: authFromFileName,
      });
    }
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isAuthorizationExpiring(dateStr: string, days: number = 7): boolean {
  const authDate = new Date(dateStr);
  const now = new Date();
  const diffTime = authDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
}

export function isAuthorizationExpired(dateStr: string): boolean {
  const authDate = new Date(dateStr);
  const now = new Date();
  return authDate < now;
}
