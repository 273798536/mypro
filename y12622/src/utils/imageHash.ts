export async function computeImageHash(file: File | string): Promise<string> {
  let imageData: string;
  
  if (typeof file === 'string') {
    imageData = file;
  } else {
    imageData = await file.text();
  }
  
  let hash = 0;
  for (let i = 0; i < imageData.length; i++) {
    const char = imageData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hashStr = Math.abs(hash).toString(16).padStart(16, '0');
  
  if (typeof file === 'string') {
    const previewHash = file.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '');
    return `${hashStr}_${previewHash}`;
  }
  
  return `${hashStr}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function generateSimpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
