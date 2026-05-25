import api from '../services/api';

export async function downloadFile(url: string, filename?: string): Promise<void> {
  try {
    const response = await api.get(url, {
      responseType: 'blob'
    });

    const disposition = response.headers['content-disposition'];
    let downloadFilename = filename;
    
    if (!downloadFilename && disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) {
        downloadFilename = match[1];
      }
    }

    const rawContentType = response.headers['content-type'];
    const contentType: string = typeof rawContentType === 'string' ? rawContentType : 'application/octet-stream';
    const blob = new Blob([response.data], {
      type: contentType
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = downloadFilename || `download-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
  } catch (error: any) {
    console.error('下载文件失败:', error);
    
    const token = localStorage.getItem('token');
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      window.open(`${url}${separator}token=${encodeURIComponent(token)}`, '_blank');
    } else {
      throw error;
    }
  }
}

export function buildExportUrl(baseUrl: string, params: Record<string, any> = {}): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (value && value.format && typeof value.format === 'function') {
        searchParams.append(key, value.format('YYYY-MM-DD'));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
