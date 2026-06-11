import html2canvas from 'html2canvas';

export interface ExportData {
  imageDataUrl: string;
  statusText: string;
  generatedAt: string;
  transactionSerialNo?: string;
}

export async function captureElementAsImage(
  elementId: string
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`找不到元素: ${elementId}`);
  }
  const canvas = await html2canvas(element, {
    backgroundColor: '#FBFAF6',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

export function generateStatusText(params: {
  bankSerialNo: string;
  amount: string;
  counterparty: string;
  status: string;
  supplementRemark?: string;
  approverName?: string;
  approverNameChanged?: boolean;
  lastConclusion?: string;
}): string {
  const lines: string[] = [];
  lines.push('—— 供应链预付款口径对账 · 复核说明 ——');
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push(`银行流水号：${params.bankSerialNo}`);
  lines.push(`交易金额：${params.amount}`);
  lines.push(`对手方：${params.counterparty}`);
  lines.push(`当前对账状态：${params.status}`);
  lines.push('');
  if (params.supplementRemark) {
    lines.push(`【补充备注】${params.supplementRemark}`);
    lines.push('');
  }
  if (params.approverNameChanged && params.approverName) {
    lines.push(`【审批人改名提示】当前显示审批人：${params.approverName}，已触发改名校验，请按改名流程处理。`);
    lines.push('');
  }
  if (params.lastConclusion) {
    lines.push(`【最新复核结论】${params.lastConclusion}`);
  }
  lines.push('');
  lines.push('※ 本说明文字与页面截图状态一致，以导出时页面显示为准。');
  return lines.join('\n');
}

export function downloadTextFile(content: string, filename: string): void {
  try {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('[export] downloadTextFile failed:', e);
  }
}

export function downloadDataUrlAsFile(
  dataUrl: string,
  filename: string
): void {
  try {
    const safeName = filename.replace(/[\\/:*?"<>|]/g, '_');
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
    if (!match) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const [, mimeType, base64] = match;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error('[export] downloadDataUrlAsFile failed:', e);
  }
}
