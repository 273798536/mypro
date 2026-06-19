import { NextResponse } from "next/server";
import { DirtyRowRepo, ReviewLogRepo, BackupRepo, BatchRepo } from "@/lib/repo";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const row = DirtyRowRepo.get(id);

  if (!row) {
    return NextResponse.json({ error: "脏行不存在" }, { status: 404 });
  }

  const review = ReviewLogRepo.listByRow(id);
  const backup = BackupRepo.get(row.backup_id);
  const batch = BatchRepo.get(row.batch_id);

  return NextResponse.json({
    row,
    review,
    backup,
    batch,
  });
}
