import { NextResponse } from "next/server";
import { DirtyRowRepo, ReviewLogRepo, BatchRepo, BackupRepo } from "@/lib/repo";
import type { DirtyRowStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");
  const status = searchParams.get("status") as DirtyRowStatus | undefined;
  const category = searchParams.get("category") as any;
  const severity = searchParams.get("severity");
  const limit = Number(searchParams.get("limit") ?? 500);

  const params: any = { limit };
  if (batchId) params.batch_id = Number(batchId);
  if (status) params.status = status;
  if (category) params.category = category;
  if (severity) params.severity = severity;

  const list = DirtyRowRepo.list(params);
  const total = list.length;

  return NextResponse.json({
    list,
    total,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { id, action, operator, reason } = body;

  if (!id || !action || !operator) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const row = DirtyRowRepo.get(id);
  if (!row) {
    return NextResponse.json({ error: "脏行不存在" }, { status: 404 });
  }

  const oldStatus = row.status;
  let newStatus: DirtyRowStatus;

  switch (action) {
    case "approve":
      newStatus = "approved";
      break;
    case "reject":
      newStatus = "rejected";
      break;
    case "escalate":
      newStatus = "escalated";
      break;
    case "reopen":
      newStatus = "pending";
      break;
    default:
      return NextResponse.json({ error: "无效操作" }, { status: 400 });
  }

  DirtyRowRepo.updateStatus({
    id,
    status: newStatus,
    reviewed_by: operator,
    review_note: reason,
  });

  ReviewLogRepo.create({
    dirty_row_id: id,
    batch_id: row.batch_id,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    operator,
    reason: reason ?? "",
  });

  const updated = DirtyRowRepo.get(id);
  const reviewLogs = ReviewLogRepo.listByRow(id);

  return NextResponse.json({
    row: updated,
    review_logs: reviewLogs,
  });
}
