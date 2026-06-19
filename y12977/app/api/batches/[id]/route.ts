import { NextResponse } from "next/server";
import { BatchRepo, BackupRepo, DirtyRowRepo, SlowQueryRepo } from "@/lib/repo";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const batch = BatchRepo.get(id);

  if (!batch) {
    return NextResponse.json({ error: "批次不存在" }, { status: 404 });
  }

  const backups = BackupRepo.listByBatch(id);
  const dirtyRows = DirtyRowRepo.list({ batch_id: id, limit: 500 });
  const slowQueries = SlowQueryRepo.listByBatch(id);
  const categoryStats = BatchRepo.categoryStats(id);
  const severityStats = BatchRepo.severityStats(id);
  const statusStats = DirtyRowRepo.countByStatus(id);

  return NextResponse.json({
    batch,
    backups,
    dirty_rows: dirtyRows,
    slow_queries: slowQueries,
    category_stats: categoryStats,
    severity_stats: severityStats,
    status_stats: statusStats,
  });
}
