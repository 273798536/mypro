import type { DuplicateCheckResult, SunlightDataset } from "@/types";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeFileHash(file: File): Promise<string> {
  const text = await file.text();
  return sha256(text);
}

export async function computeJsonHash(obj: unknown): Promise<string> {
  return sha256(JSON.stringify(obj));
}

export function checkDuplicate(
  datasets: SunlightDataset[],
  fileName: string,
  contentHash: string,
): DuplicateCheckResult {
  const existing = datasets.find(
    (d) => d.contentHash === contentHash || d.fileName === fileName,
  );
  if (!existing) {
    return { isDuplicate: false, contentHash };
  }
  const diffSummary: string[] = [];
  if (existing.contentHash !== contentHash) {
    diffSummary.push("内容哈希不同，文件内容已发生变化");
  } else {
    diffSummary.push("内容哈希完全一致，为同一份数据");
  }
  if (existing.fileName === fileName) {
    diffSummary.push("文件名相同");
  } else {
    diffSummary.push(`文件名不同：已有「${existing.fileName}」，导入「${fileName}」`);
  }
  return {
    isDuplicate: true,
    existingDataset: existing,
    diffSummary,
    contentHash,
  };
}
