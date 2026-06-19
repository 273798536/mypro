import { NextResponse } from "next/server";
import { BatchRepo } from "@/lib/repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);

  const list = BatchRepo.list(limit);
  const summary = BatchRepo.summary();
  const trend = BatchRepo.trend();

  return NextResponse.json({
    list,
    summary,
    trend,
  });
}
