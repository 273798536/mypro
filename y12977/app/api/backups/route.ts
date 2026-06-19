import { NextResponse } from "next/server";
import { BackupRepo, BatchRepo } from "@/lib/repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");
  const backupA = searchParams.get("backup_a");
  const backupB = searchParams.get("backup_b");

  if (backupA && backupB) {
    const result = BackupRepo.compare(Number(backupA), Number(backupB));
    if (!result) {
      return NextResponse.json({ error: "备份记录不存在" }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  if (batchId) {
    const list = BackupRepo.listByBatch(Number(batchId));
    return NextResponse.json({ list });
  }

  return NextResponse.json({ error: "请提供 batch_id 或 backup_a + backup_b" }, { status: 400 });
}
