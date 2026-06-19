import { NextResponse } from "next/server";
import { SlowQueryRepo } from "@/lib/repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");

  const list = batchId
    ? SlowQueryRepo.listByBatch(Number(batchId))
    : SlowQueryRepo.listByBatch();

  return NextResponse.json({
    list,
    total: list.length,
  });
}
