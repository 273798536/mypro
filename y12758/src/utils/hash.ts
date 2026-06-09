export async function computeSourceHash(data: any): Promise<string> {
  const jsonStr = JSON.stringify(data);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return hashHex.slice(0, 16);
    } catch {
      return simpleStringHash(jsonStr);
    }
  }

  return simpleStringHash(jsonStr);
}

function simpleStringHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const unsigned = Math.abs(hash);
  return unsigned.toString(16).padStart(16, '0').slice(0, 16);
}
