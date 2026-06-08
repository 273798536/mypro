import { formatDateForFile } from "@/utils/format";

export interface ScreenshotOptions {
  canvas?: HTMLCanvasElement;
  buildingName?: string;
  planeIndex?: number;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
  const bytes = atob(base64);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i);
  return new Blob([out], { type: mime });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportViewportScreenshot({
  canvas,
  buildingName = "教学楼",
  planeIndex,
}: ScreenshotOptions): string {
  if (!canvas) return "";
  const dataUrl = canvas.toDataURL("image/png");
  const stamp = formatDateForFile(Date.now());
  const planePart = planeIndex != null ? `_剖面${planeIndex}` : "";
  const fileName = `${stamp}_${buildingName}${planePart}.png`;
  downloadBlob(dataUrlToBlob(dataUrl), fileName);
  return fileName;
}

export async function exportCombinedScreenshot(
  target: HTMLElement,
  { buildingName = "教学楼", planeIndex }: Omit<ScreenshotOptions, "canvas"> = {},
): Promise<string> {
  const mod = await import("html2canvas");
  const html2canvas = mod.default;
  const canvas = await html2canvas(target, {
    backgroundColor: "#0B1D3A",
    scale: 1.5,
    useCORS: true,
  });
  const stamp = formatDateForFile(Date.now());
  const planePart = planeIndex != null ? `_剖面${planeIndex}` : "";
  const fileName = `${stamp}_${buildingName}${planePart}_组合视图.png`;
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, fileName);
  }, "image/png");
  return fileName;
}
