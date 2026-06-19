import {
  BatchRepo,
  BackupRepo,
  DirtyRowRepo,
  SlowQueryRepo,
  computeChecksum,
  generateBatchNo,
} from "@/lib/repo";
import { getDb } from "@/lib/db";
import { format } from "date-fns";
import type { DirtyRowCategory } from "@/lib/types";

const TABLES = ["iam_user_permissions", "ods_order_flow"];

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd HH:mm:ss");
}

function pickRows(table: string, sampleSet: string): Record<string, any>[] {
  if (table === "iam_user_permissions") {
    const base = [
      {
        id: "P-" + sampleSet + "-1001",
        user_id: "U10086",
        user_name: "张明",
        role: "市场部数据分析师",
        table_name: "ods_finance_revenue_detail",
        permission: "SELECT",
        grantor: "SYS_AUTO",
        granted_at: "2026-06-01 09:12:01",
        approver: sampleSet.startsWith("B") ? "U20003" : null,
      },
      {
        id: "P-" + sampleSet + "-1002",
        user_id: "U10099",
        user_name: "李娜",
        role: "人力资源实习生",
        table_name: "dim_employee_salary",
        permission: "SELECT,UPDATE",
        grantor: "U20001",
        granted_at: "2026-06-02 14:22:31",
        approver: null,
      },
      {
        id: "P-" + sampleSet + "-1003",
        user_id: "U30041",
        user_name: "王强",
        role: "运维工程师",
        table_name: "core_user_auth",
        permission: sampleSet.startsWith("B") ? "ALTER,INDEX" : "DROP",
        grantor: "U30001",
        granted_at: "2026-06-03 03:01:10",
        approver: "U30001",
      },
      {
        id: "P-" + sampleSet + "-1004",
        user_id: "U50003",
        user_name: "陈刚",
        role: "外部合作方",
        table_name: "dw_agg_user_profile",
        permission: "SELECT,EXPORT",
        grantor: "U40001",
        granted_at: "2026-06-05 16:40:00",
        approver: sampleSet.startsWith("B") ? "U40099" : null,
      },
    ];
    if (sampleSet.startsWith("B")) {
      base.push({
        id: "P-" + sampleSet + "-1005",
        user_id: "U60017",
        user_name: "周伟",
        role: "研发测试",
        table_name: "prod_payment_transaction",
        permission: "SELECT,DELETE",
        grantor: "U60001",
        granted_at: "2026-06-10 02:10:00",
        approver: null,
      });
    }
    return base;
  } else {
    const base = [
      { id: 1001, order_no: "SO2026060001", user_id: sampleSet.startsWith("B") ? "U9999" : null, amount: 299.0, status: "paid" },
      { id: 1002, order_no: "SO2026060002", user_id: "U8888", amount: 1280.0, status: "paid" },
      { id: 1003, order_no: "SO2026060003", user_id: "U10086", amount: sampleSet.startsWith("B") ? 50.0 : -50.0, status: sampleSet.startsWith("B") ? "paid" : "refund" },
      { id: 1004, order_no: "SO2026060001", user_id: "U10099", amount: 299.0, status: "paid" },
      { id: 1005, order_no: "SO2026060005", user_id: "U10022", amount: 4580.0, status: sampleSet.startsWith("B") ? "paid" : "pending" },
    ];
    if (sampleSet.startsWith("B")) {
      base.push({ id: 1006, order_no: "SO2026060006", user_id: null, amount: 0.0, status: "unknown" });
    }
    return base;
  }
}

function fetchSourceTables(sampleSet: string) {
  return TABLES.map((name) => ({
    name,
    rows: pickRows(name, sampleSet),
  }));
}

interface DirtyCandidate {
  table: string;
  pk: string;
  category: DirtyRowCategory;
  severity: "high" | "medium" | "low";
  row: Record<string, any>;
  biz: string;
  tech: string;
}

function bizPerm(row: any, risk: string, extra: string) {
  return (
    `用户【${row.user_name}】对表【${row.table_name}】的【${row.permission}】权限未通过审批。\n` +
    `风险等级：${risk}；岗位：${row.role}；授权人：${row.grantor}\n` +
    `问题说明：${extra}\n` +
    `处理建议：请业务方补充审批单或回收权限，3个工作日内反馈。`
  );
}
function techPerm(rule: string, baseline: string, actual: string, refs: string[]) {
  return (
    `[规则 ${rule}] 权限基线比对未通过\n` +
    `  基线 (RBAC): ${baseline}\n` +
    `  实际 (IAM):  ${actual}\n` +
    `  参考: ${refs.join("; ")}`
  );
}

function detect(tables: { name: string; rows: Record<string, any>[] }[]): DirtyCandidate[] {
  const out: DirtyCandidate[] = [];
  const iam = tables.find((t) => t.name === "iam_user_permissions");
  if (iam) {
    for (const row of iam.rows) {
      const perm = String(row.permission ?? "");
      const approver = row.approver;
      const role = String(row.role ?? "");
      if (perm.includes("DROP") || perm.includes("DELETE") || perm.includes("ALTER")) {
        out.push({
          table: iam.name,
          pk: String(row.id),
          category: "permission_override",
          severity: "high",
          row,
          biz: bizPerm(row, "高危：破坏性写权限", `该权限 ${perm} 超出岗位标准权限范围，缺少部门负责人书面审批。`),
          tech: techPerm("R-PERM-001", `role=${role} 允许 [SELECT,INSERT,UPDATE]`, `实际 [${perm}]`, ["权限规范 §3.2", "分级策略 §4.1"]),
        });
        continue;
      }
      if ((role.includes("实习生") || role.includes("外部") || role.includes("合作方")) && !approver) {
        out.push({
          table: iam.name,
          pk: String(row.id),
          category: "permission_override",
          severity: "medium",
          row,
          biz: bizPerm(row, "中危：敏感岗位缺审批", `${role} 访问敏感表需要二级审批，当前 approver 为空。`),
          tech: techPerm("R-PERM-002", `${role} 需 approver != NULL`, `approver=${approver ?? "null"}`, ["审批流程 §2"]),
        });
        continue;
      }
      if (perm.includes("EXPORT") && !approver) {
        out.push({
          table: iam.name,
          pk: String(row.id),
          category: "permission_override",
          severity: "high",
          row,
          biz: bizPerm(row, "高危：导出权限缺审批", "EXPORT 权限允许批量下载数据，需书面审批留存。"),
          tech: techPerm("R-PERM-003", "EXPORT 必须有 approver", `approver=${approver ?? "null"}`, ["数据出境 §5.3"]),
        });
      }
    }
  }
  const ord = tables.find((t) => t.name === "ods_order_flow");
  if (ord) {
    const counts = new Map<string, number>();
    ord.rows.forEach((r) => counts.set(r.order_no, (counts.get(r.order_no) ?? 0) + 1));
    for (const row of ord.rows) {
      if (!row.user_id) {
        out.push({
          table: ord.name,
          pk: String(row.id),
          category: "data_missing",
          severity: "medium",
          row,
          biz: `订单【${row.order_no}】缺少下单用户ID，财务对账无法追溯资金归属，请补录或标记异常。`,
          tech: `[R-ORD-001] 非空约束: user_id IS NULL\n  data=${JSON.stringify(row)}`,
        });
      }
      if (typeof row.amount === "number" && row.amount < 0 && row.status !== "refund") {
        out.push({
          table: ord.name,
          pk: String(row.id),
          category: "range_violation",
          severity: "high",
          row,
          biz: `订单【${row.order_no}】金额 ${row.amount} 为负但状态为【${row.status}】，存在资金错报风险。`,
          tech: `[R-ORD-002] 值域: amount>=0 当 status!='refund'  amount=${row.amount} status=${row.status}`,
        });
      }
      if ((counts.get(row.order_no) ?? 0) > 1) {
        out.push({
          table: ord.name,
          pk: String(row.id),
          category: "duplicate_key",
          severity: "low",
          row,
          biz: `订单号【${row.order_no}】出现重复，可能是业务重试，与业务确认是否需要去重。`,
          tech: `[R-ORD-003] 唯一性: order_no 出现 ${counts.get(row.order_no)} 次`,
        });
      }
    }
  }
  return out;
}

const SLOW_TEMPLATES = [
  { sig: "SELECT * FROM ods_order_flow WHERE user_id=? AND status=?", table: "ods_order_flow", attr: "缺失联合索引 user_id+status", rec: "新增 INDEX idx_user_status(user_id, status); 分页 LIMIT 100。" },
  { sig: "SELECT COUNT(*) FROM iam_user_permissions GROUP BY table_name, permission", table: "iam_user_permissions", attr: "聚合未命中覆盖索引", rec: "建立覆盖索引 (table_name, permission)。" },
];

function run() {
  const args = new Set(process.argv.slice(2));
  const mode: "full" | "incremental" = args.has("--full") ? "full" : "incremental";
  const operatorArg = process.argv.find((a) => a.startsWith("--operator="));
  const operator = operatorArg ? operatorArg.split("=")[1] : "cli_operator";
  const sampleArg = process.argv.find((a) => a.startsWith("--sample="));
  const sample = sampleArg ? sampleArg.split("=")[1] : String(Date.now());

  const started = new Date();
  const tables = fetchSourceTables(sample);
  const dirty = detect(tables);

  const batchNo = generateBatchNo(mode);
  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);
  const finished = new Date();

  const db = getDb();
  const tx = db.transaction(() => {
    const batchId = BatchRepo.create({
      batch_no: batchNo,
      scan_mode: mode,
      started_at: fmt(started),
      finished_at: fmt(finished),
      total_rows: totalRows,
      dirty_rows: dirty.length,
      slow_queries: SLOW_TEMPLATES.length,
      operator,
      comment: `CLI 扫描，sample=${sample}`,
    });

    const backupIds: Record<string, number> = {};
    for (const t of tables) {
      const snap = JSON.stringify(t.rows);
      backupIds[t.name] = BackupRepo.create({
        batch_id: batchId,
        source_table: t.name,
        snapshot_json: snap,
        row_count: t.rows.length,
        checksum: computeChecksum(snap),
      });
    }

    for (const d of dirty) {
      DirtyRowRepo.create({
        batch_id: batchId,
        backup_id: backupIds[d.table],
        category: d.category,
        severity: d.severity,
        source_table: d.table,
        source_pk: d.pk,
        row_data_json: JSON.stringify(d.row),
        business_explanation: d.biz,
        tech_detail: d.tech,
      });
    }

    let dur = 1500;
    for (const s of SLOW_TEMPLATES) {
      dur += 420;
      SlowQueryRepo.create({
        batch_id: batchId,
        query_signature: s.sig,
        duration_ms: dur,
        attribution: s.attr,
        table_involved: s.table,
        sample_sql: s.sig.replace(/\?/g, `'${Math.floor(Math.random() * 999)}'`),
        recommendation: s.rec,
      });
    }
    return batchId;
  });

  const id = tx();
  console.log(`🚀 扫描完成  batch_id=${id}  batch_no=${batchNo}`);
  console.log(`   模式: ${mode}  操作人: ${operator}`);
  console.log(`   备份表: ${tables.map((t) => `${t.name}(${t.rows.length})`).join(" / ")}`);
  console.log(`   脏行: ${dirty.length}  慢查询: ${SLOW_TEMPLATES.length}`);
  const cat = dirty.reduce((m, d) => { m[d.category] = (m[d.category] ?? 0) + 1; return m; }, {} as Record<string, number>);
  console.log(`   脏行分类: ${JSON.stringify(cat)}`);
  console.log(`\n   👉 看板的 图表 / 明细 / 慢查询 / 导出 均从此批次(${id})读取，确保同源。`);
}

run();
