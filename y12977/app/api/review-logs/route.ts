import { NextResponse } from "next/server";
import { ReviewLogRepo } from "@/lib/repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dirtyRowId = searchParams.get("dirty_row_id");
  const batchId = searchParams.get("batch_id");
  const limit = Number(searchParams.get("limit") ?? 200);

  let list;
  if (dirtyRowId) {
    list = ReviewLogRepo.listByRow(Number(dirtyRowId));
  } else if (batchId) {
    list = ReviewLogRepo.listByBatch(Number(batchId));
  } else {
    list = ReviewLogRepo.listAll(limit);
  }

  return NextResponse.json({
    list,
    total: list.length,
  });
}
