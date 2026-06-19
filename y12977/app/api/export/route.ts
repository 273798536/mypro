import { NextResponse } from "next/server";
import { BatchRepo, DirtyRowRepo, SlowQueryRepo, BackupRepo, ExportLogRepo } from "@/lib/repo";
import { buildExportFileName, CATEGORY_LABEL, SEVERITY_LABEL, STATUS_LABEL } from "@/lib/utils";
import { PATHS } from "@/lib/db";
import fs from "fs";
import path from "path";

function toCSV(headers: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batch_id");
  const type = searchParams.get("type") as "dirty_rows" | "slow_queries" | "batch_report" | "compare";
  const backupA = searchParams.get("backup_a");
  const backupB = searchParams.get("backup_b");
  const exportedBy = searchParams.get("operator") ?? "web_user";

  if (!batchId && type !== "compare") {
    return NextResponse.json({ error: "缺少 batch_id" }, { status: 400 });
  }

  const batch = batchId ? BatchRepo.get(Number(batchId)) : null;
  if (!batch && type !== "compare") {
    return NextResponse.json({ error: "批次不存在" }, { status: 404 });
  }

  let fileName = "";
  let content = "";
  let recordCount = 0;
  let actualBatchId = batchId ? Number(batchId) : 0;

  switch (type) {
    case "dirty_rows": {
      const rows = DirtyRowRepo.list({ batch_id: Number(batchId), limit: 1000 });
      recordCount = rows.length;
      const headers = [
        "ID",
        "类别",
        "严重程度",
        "状态",
        "源表",
        "主键",
        "业务说明",
        "技术细节",
        "检测时间",
        "复核人",
        "复核时间",
        "复核意见",
      ];
      const data = rows.map((r) => [
        r.id,
        CATEGORY_LABEL[r.category]?.label ?? r.category,
        SEVERITY_LABEL[r.severity]?.label ?? r.severity,
        STATUS_LABEL[r.status]?.label ?? r.status,
        r.source_table,
        r.source_pk,
        r.business_explanation,
        r.tech_detail,
        r.detected_at,
        r.reviewed_by ?? "",
        r.reviewed_at ?? "",
        r.review_note ?? "",
      ]);
      content = toCSV(headers, data);
      fileName = buildExportFileName({ type, batchNo: batch!.batch_no });
      break;
    }

    case "slow_queries": {
      const rows = SlowQueryRepo.listByBatch(Number(batchId));
      recordCount = rows.length;
      const headers = [
        "ID",
        "查询签名",
        "耗时(ms)",
        "归因",
        "涉及表",
        "示例SQL",
        "优化建议",
        "捕获时间",
      ];
      const data = rows.map((r) => [
        r.id,
        r.query_signature,
        r.duration_ms,
        r.attribution,
        r.table_involved,
        r.sample_sql,
        r.recommendation,
        r.captured_at,
      ]);
      content = toCSV(headers, data);
      fileName = buildExportFileName({ type, batchNo: batch!.batch_no });
      break;
    }

    case "batch_report": {
      const dirtyRows = DirtyRowRepo.list({ batch_id: Number(batchId), limit: 1000 });
      const slowQueries = SlowQueryRepo.listByBatch(Number(batchId));
      const backups = BackupRepo.listByBatch(Number(batchId));
      recordCount = dirtyRows.length + slowQueries.length + backups.length;

      const lines = [
        "=" .repeat(60),
        "数据质量扫描批次报告",
        "=" .repeat(60),
        "",
        `批次号: ${batch!.batch_no}`,
        `扫描模式: ${batch!.scan_mode === "full" ? "全量" : "增量"}`,
        `操作人: ${batch!.operator}`,
        `开始时间: ${batch!.started_at}`,
        `结束时间: ${batch!.finished_at}`,
        `扫描总行数: ${batch!.total_rows}`,
        `脏行数量: ${batch!.dirty_rows}`,
        `慢查询数量: ${batch!.slow_queries}`,
        batch!.comment ? `备注: ${batch!.comment}` : "",
        "",
        "-".repeat(60),
        "备份记录",
        "-".repeat(60),
        ...backups.map((b) => `  [${b.source_table}] ${b.row_count} 行  checksum: ${b.checksum}`),
        "",
        "-".repeat(60),
        `脏行明细 (${dirtyRows.length} 条)`,
        "-".repeat(60),
        ...dirtyRows.map((r, i) =>
          [
            `\n【${i + 1}】${CATEGORY_LABEL[r.category]?.label ?? r.category} / ${SEVERITY_LABEL[r.severity]?.label ?? r.severity} / ${STATUS_LABEL[r.status]?.label ?? r.status}`,
            `    表: ${r.source_table}  主键: ${r.source_pk}`,
            `    业务说明:`,
            ...r.business_explanation.split("\n").map((l) => `      ${l}`),
          ].join("\n")
        ),
        "",
        "-".repeat(60),
        `慢查询归因 (${slowQueries.length} 条)`,
        "-".repeat(60),
        ...slowQueries.map((s, i) =>
          [
            `\n【${i + 1}】${s.attribution}`,
            `    耗时: ${s.duration_ms}ms  表: ${s.table_involved}`,
            `    示例 SQL: ${s.sample_sql}`,
            `    优化建议: ${s.recommendation}`,
          ].join("\n")
        ),
        "",
        "=" .repeat(60),
        "报告生成时间: " + new Date().toLocaleString("zh-CN"),
        "=" .repeat(60),
      ].filter(Boolean);

      content = lines.join("\n");
      fileName = buildExportFileName({ type, batchNo: batch!.batch_no, ext: "txt" });
      break;
    }

    case "compare": {
      if (!backupA || !backupB) {
        return NextResponse.json({ error: "缺少 backup_a 或 backup_b" }, { status: 400 });
      }
      const result = BackupRepo.compare(Number(backupA), Number(backupB));
      if (!result) {
        return NextResponse.json({ error: "备份记录不存在" }, { status: 404 });
      }

      const bA = BackupRepo.get(Number(backupA));
      const bB = BackupRepo.get(Number(backupB));
      const batchA = bA ? BatchRepo.get(bA.batch_id) : null;
      const batchB = bB ? BatchRepo.get(bB.batch_id) : null;

      const lines = [
        "=" .repeat(60),
        "备份对比报告",
        "=" .repeat(60),
        "",
        `表名: ${result.table}`,
        `A 版本: ${result.checksumA} (${result.countA} 行) 批次: ${batchA?.batch_no ?? "-"}`,
        `B 版本: ${result.checksumB} (${result.countB} 行) 批次: ${batchB?.batch_no ?? "-"}`,
        "",
        `- 新增: ${result.added.length} 条`,
        `- 删除: ${result.removed.length} 条`,
        `- 修改: ${result.modified.length} 条`,
        "",
        "-".repeat(60),
        "新增记录",
        "-".repeat(60),
        ...result.added.map((r) => `  + ${JSON.stringify(r)}`),
        "",
        "-".repeat(60),
        "删除记录",
        "-".repeat(60),
        ...result.removed.map((r) => `  - ${JSON.stringify(r)}`),
        "",
        "-".repeat(60),
        "修改记录",
        "-".repeat(60),
        ...result.modified.map((m) =>
          [
            `  ~ key=${m.key}`,
            `    变更字段: ${m.diffs.join(", ")}`,
            `    旧值: ${JSON.stringify(m.old)}`,
            `    新值: ${JSON.stringify(m.new)}`,
          ].join("\n")
        ),
        "",
        "=" .repeat(60),
        "报告生成时间: " + new Date().toLocaleString("zh-CN"),
        "=" .repeat(60),
      ];

      content = lines.join("\n");
      fileName = buildExportFileName({
        type,
        batchNo: batchA?.batch_no ?? "BAK" + backupA,
        secondBatchNo: batchB?.batch_no ?? "BAK" + backupB,
        ext: "txt",
      });
      recordCount = result.added.length + result.removed.length + result.modified.length;
      actualBatchId = bA?.batch_id ?? 0;
      break;
    }

    default:
      return NextResponse.json({ error: "无效的导出类型" }, { status: 400 });
  }

  const filePath = path.join(PATHS.EXPORT_DIR, fileName);
  fs.writeFileSync(filePath, content, "utf-8");

  ExportLogRepo.create({
    batch_id: actualBatchId,
    export_type: type,
    file_name: fileName,
    file_path: filePath,
    exported_by: exportedBy,
    record_count: recordCount,
  });

  return NextResponse.json({
    file_name: fileName,
    record_count: recordCount,
    content,
  });
}
