import html2canvas from 'html2canvas';

export const exportAsImage = async (
  elementId: string,
  filename: string = 'cash-burn-surface'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for export');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0A1628',
      scale: 2,
      useCORS: true,
      logging: false
    });

    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};

export const exportDataAsJSON = (data: any, filename: string = 'project-data'): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportDataAsCSV = (
  headers: string[],
  rows: any[][],
  filename: string = 'export-data'
): void => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};
