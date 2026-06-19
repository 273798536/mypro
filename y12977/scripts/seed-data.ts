import {
  BatchRepo,
  BackupRepo,
  DirtyRowRepo,
  ReviewLogRepo,
  SlowQueryRepo,
  computeChecksum,
} from "@/lib/repo";
import { getDb, PATHS } from "@/lib/db";
import fs from "fs";
import path from "path";
import { format, addMinutes, subDays } from "date-fns";

type DBRow = Record<string, any>;

interface SimulatedTable {
  name: string;
  rows: DBRow[];
}

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd HH:mm:ss");
}

function buildPermissionExplanation(
  row: DBRow,
  grantor: string,
  grantee: string,
  permission: string,
  risk: string
) {
  return (
    `用户【${grantee}】对表【${row.table_name ?? "unknown"}】的【${permission}】权限未通过审批。\n` +
    `授权人：${grantor}；风险等级：${risk}；\n` +
    `原因：该权限超出了用户岗位（${row.role ?? "未定义岗位"}）的标准权限范围，` +
    `且缺少部门负责人的书面审批记录。请业务方补充审批单或回收权限。`
  );
}

function buildTechDetail(
  row: DBRow,
  ruleId: string,
  baseline: string,
  actual: string,
  references: string[]
) {
  return (
    `[规则 ${ruleId}] 权限基线比对未通过\n` +
    `  基线值 (RBAC policy): ${baseline}\n` +
    `  实际值 (IAM snapshot): ${actual}\n` +
    `  关联字段变更: ${JSON.stringify(row)}\n` +
    `  参考依据: ${references.join("; ")}`
  );
}

function makeFirstBatchTables(): SimulatedTable[] {
  return [
    {
      name: "iam_user_permissions",
      rows: [
        {
          id: "P-2026061001",
          user_id: "U10086",
          user_name: "张明",
          role: "市场部数据分析师",
          table_name: "ods_finance_revenue_detail",
          permission: "SELECT",
          grantor: "SYS_AUTO",
          granted_at: "2026-06-01 09:12:01",
          approver: null,
        },
        {
          id: "P-2026061002",
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
          id: "P-2026061003",
          user_id: "U30041",
          user_name: "王强",
          role: "运维工程师",
          table_name: "core_user_auth",
          permission: "DROP",
          grantor: "U30001",
          granted_at: "2026-06-03 03:01:10",
          approver: "U30001",
        },
        {
          id: "P-2026061004",
          user_id: "U10022",
          user_name: "赵敏",
          role: "销售专员",
          table_name: "dwd_customer_contact",
          permission: "SELECT",
          grantor: "SYS_AUTO",
          granted_at: "2026-05-15 10:00:00",
          approver: "U10005",
        },
        {
          id: "P-2026061005",
          user_id: "U50003",
          user_name: "陈刚",
          role: "外部合作方",
          table_name: "dw_agg_user_profile",
          permission: "SELECT,EXPORT",
          grantor: "U40001",
          granted_at: "2026-06-05 16:40:00",
          approver: null,
        },
      ],
    },
    {
      name: "ods_order_flow",
      rows: [
        { id: 1001, order_no: "SO2026060001", user_id: null, amount: 299.0, status: "paid" },
        { id: 1002, order_no: "SO2026060002", user_id: "U8888", amount: 1280.0, status: "paid" },
        { id: 1003, order_no: "SO2026060003", user_id: "U10086", amount: -50.0, status: "refund" },
        { id: 1004, order_no: "SO2026060001", user_id: "U10099", amount: 299.0, status: "paid" },
        { id: 1005, order_no: "SO2026060005", user_id: "U10022", amount: 4580.0, status: "pending" },
      ],
    },
  ];
}

function makeSecondBatchTables(): SimulatedTable[] {
  return [
    {
      name: "iam_user_permissions",
      rows: [
        {
          id: "P-2026061001",
          user_id: "U10086",
          user_name: "张明",
          role: "市场部数据分析师",
          table_name: "ods_finance_revenue_detail",
          permission: "SELECT",
          grantor: "SYS_AUTO",
          granted_at: "2026-06-01 09:12:01",
          approver: "U20003",
        },
        {
          id: "P-2026061002",
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
          id: "P-2026061003",
          user_id: "U30041",
          user_name: "王强",
          role: "运维工程师",
          table_name: "core_user_auth",
          permission: "ALTER,INDEX",
          grantor: "U30001",
          granted_at: "2026-06-03 03:01:10",
          approver: "U30001",
        },
        {
          id: "P-2026061004",
          user_id: "U10022",
          user_name: "赵敏",
          role: "销售专员",
          table_name: "dwd_customer_contact",
          permission: "SELECT",
          grantor: "SYS_AUTO",
          granted_at: "2026-05-15 10:00:00",
          approver: "U10005",
        },
        {
          id: "P-2026061005",
          user_id: "U50003",
          user_name: "陈刚",
          role: "外部合作方",
          table_name: "dw_agg_user_profile",
          permission: "SELECT,EXPORT",
          grantor: "U40001",
          granted_at: "2026-06-05 16:40:00",
          approver: "U40099",
        },
        {
          id: "P-2026061006",
          user_id: "U60017",
          user_name: "周伟",
          role: "研发测试",
          table_name: "prod_payment_transaction",
          permission: "SELECT,DELETE",
          grantor: "U60001",
          granted_at: "2026-06-10 02:10:00",
          approver: null,
        },
      ],
    },
    {
      name: "ods_order_flow",
      rows: [
        { id: 1001, order_no: "SO2026060001", user_id: "U9999", amount: 299.0, status: "paid" },
        { id: 1002, order_no: "SO2026060002", user_id: "U8888", amount: 1280.0, status: "paid" },
        { id: 1003, order_no: "SO2026060003", user_id: "U10086", amount: 50.0, status: "paid" },
        { id: 1004, order_no: "SO2026060001", user_id: "U10099", amount: 299.0, status: "paid" },
        { id: 1005, order_no: "SO2026060005", user_id: "U10022", amount: 4580.0, status: "paid" },
        { id: 1006, order_no: "SO2026060006", user_id: null, amount: 0.0, status: "unknown" },
      ],
    },
  ];
}

interface DirtyItem {
  table: string;
  pk: string;
  category: "permission_override" | "data_missing" | "format_error" | "duplicate_key" | "range_violation";
  severity: "high" | "medium" | "low";
  row: DBRow;
  biz: string;
  tech: string;
}

function detectDirty(tables: SimulatedTable[]): DirtyItem[] {
  const result: DirtyItem[] = [];
  const iamTable = tables.find((t) => t.name === "iam_user_permissions");
  if (iamTable) {
    for (const row of iamTable.rows) {
      const perm = String(row.permission ?? "");
      const approver = row.approver;
      const role = String(row.role ?? "");

      if (perm.includes("DROP") || perm.includes("DELETE") || perm.includes("ALTER")) {
        result.push({
          table: iamTable.name,
          pk: String(row.id),
          category: "permission_override",
          severity: "high",
          row,
          biz: buildPermissionExplanation(
            row,
            row.grantor,
            row.user_name,
            perm,
            "高危：破坏性写权限"
          ),
          tech: buildTechDetail(
            row,
            "R-PERM-001",
            `role=${role} 允许权限: [SELECT,INSERT,UPDATE]`,
            `实际权限: [${perm}]`,
            ["企业权限规范 §3.2", "数据分级策略 §4.1"]
          ),
        });
        continue;
      }
      if (
        (role.includes("实习生") || role.includes("外部") || role.includes("合作方")) &&
        !approver
      ) {
        result.push({
          table: iamTable.name,
          pk: String(row.id),
          category: "permission_override",
          severity: "medium",
          row,
          biz: buildPermissionExplanation(
            row,
            row.grantor,
            row.user_name,
            perm,
            "中危：敏感岗位缺审批"
          ),
          tech: buildTechDetail(
            row,
            "R-PERM-002",
            `岗位【${role}】需二级审批 approver != NULL`,
            `approver=${approver ?? "null"}`,
            ["人员权限审批流程 §2"]
          ),
        });
        continue;
      }
      if (perm.includes("EXPORT") && !approver) {
        result.push({
          table: iamTable.name,
          pk: String(row.id),
          category: "permission_override",
          severity: "high",
          row,
          biz: buildPermissionExplanation(
            row,
            row.grantor,
            row.user_name,
            perm,
            "高危：导出权限缺审批"
          ),
          tech: buildTechDetail(
            row,
            "R-PERM-003",
            "EXPORT 权限必须存在 approver 审批",
            `approver=${approver ?? "null"}, permission=${perm}`,
            ["数据出境审批 §5.3"]
          ),
        });
      }
    }
  }

  const orderTable = tables.find((t) => t.name === "ods_order_flow");
  if (orderTable) {
    const seenOrderNo = new Map<string, number>();
    for (const row of orderTable.rows) {
      seenOrderNo.set(row.order_no, (seenOrderNo.get(row.order_no) ?? 0) + 1);
    }
    for (const row of orderTable.rows) {
      if (row.user_id == null || row.user_id === "") {
        result.push({
          table: orderTable.name,
          pk: String(row.id),
          category: "data_missing",
          severity: "medium",
          row,
          biz: `订单【${row.order_no}】缺少下单用户ID，无法追溯用户维度的资金归属，财务对账时会出现差额。请补录用户信息或标记为异常单。`,
          tech: `[R-ORD-001] 非空约束违反: user_id IS NULL\n  row=${JSON.stringify(row)}`,
        });
      }
      if (typeof row.amount === "number" && row.amount < 0 && row.status !== "refund") {
        result.push({
          table: orderTable.name,
          pk: String(row.id),
          category: "range_violation",
          severity: "high",
          row,
          biz: `订单【${row.order_no}】金额为负数（${row.amount}元），但状态是【${row.status}】非退款，存在资金错报风险，请业务核实交易性质。`,
          tech: `[R-ORD-002] 值域校验: amount>=0 当 status!='refund'\n  amount=${row.amount}, status=${row.status}`,
        });
      }
      if ((seenOrderNo.get(row.order_no) ?? 0) > 1) {
        result.push({
          table: orderTable.name,
          pk: String(row.id),
          category: "duplicate_key",
          severity: "low",
          row,
          biz: `订单号【${row.order_no}】在流水表中出现多次，可能是业务重试或重复入库。建议与业务确认是否需要去重，避免统计口径错误。`,
          tech: `[R-ORD-003] 唯一性校验: order_no 出现 ${seenOrderNo.get(row.order_no)} 次\n  pk=${row.id}`,
        });
      }
    }
  }

  return result;
}

const slowQueryTemplates = [
  {
    signature: "SELECT * FROM ods_order_flow WHERE user_id=? AND status=?",
    table: "ods_order_flow",
    attribution: "用户维度查询缺失 user_id+status 联合索引",
    rec: "新增 INDEX idx_user_status(user_id, status)，避免全表扫描；建议分页 LIMIT 100。",
  },
  {
    signature: "SELECT COUNT(*) FROM iam_user_permissions GROUP BY table_name, permission",
    table: "iam_user_permissions",
    attribution: "高频聚合扫描，未命中覆盖索引",
    rec: "建立覆盖索引 (table_name, permission)，或维护物化汇总表。",
  },
  {
    signature: "SELECT * FROM dim_employee_salary WHERE department LIKE ?",
    table: "dim_employee_salary",
    attribution: "敏感表全字段返回 + 前缀模糊匹配",
    rec: "仅 SELECT 必要字段；将 LIKE '%xx%' 改为前缀匹配或走 ES 检索。",
  },
];

function createBatch(params: {
  index: number;
  batchDate: Date;
  tables: SimulatedTable[];
  batchNo: string;
  mode: "full" | "incremental";
  operator: string;
  comment: string;
}) {
  const startedAt = params.batchDate;
  const finishedAt = addMinutes(startedAt, 4 + params.index);
  const totalRows = params.tables.reduce((s, t) => s + t.rows.length, 0);
  const dirty = detectDirty(params.tables);

  const batchId = BatchRepo.create({
    batch_no: params.batchNo,
    scan_mode: params.mode,
    started_at: fmt(startedAt),
    finished_at: fmt(finishedAt),
    total_rows: totalRows,
    dirty_rows: dirty.length,
    slow_queries: slowQueryTemplates.length,
    operator: params.operator,
    comment: params.comment,
  });

  const backupIds: Record<string, number> = {};
  for (const t of params.tables) {
    const snap = JSON.stringify(t.rows);
    const bid = BackupRepo.create({
      batch_id: batchId,
      source_table: t.name,
      snapshot_json: snap,
      row_count: t.rows.length,
      checksum: computeChecksum(snap),
    });
    backupIds[t.name] = bid;
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

  let baseDur = 1800 + params.index * 300;
  for (const s of slowQueryTemplates) {
    baseDur += 420;
    SlowQueryRepo.create({
      batch_id: batchId,
      query_signature: s.signature,
      duration_ms: baseDur + Math.floor(Math.random() * 500),
      attribution: s.attribution,
      table_involved: s.table,
      sample_sql: s.signature.replace(/\?/g, () => `'demo${Math.floor(Math.random() * 999)}'`),
      recommendation: s.rec,
    });
  }

  console.log(`\n✅ 批次 ${params.batchNo} (id=${batchId})`);
  console.log(`   - 备份表: ${params.tables.map((t) => t.name).join(", ")}`);
  console.log(`   - 总行数: ${totalRows}  脏行: ${dirty.length}  慢查询: ${slowQueryTemplates.length}`);
  const catCount = dirty.reduce((m, d) => {
    m[d.category] = (m[d.category] ?? 0) + 1;
    return m;
  }, {} as Record<string, number>);
  console.log(`   - 脏行分布: ${JSON.stringify(catCount)}`);
  return { batchId, dirtyCount: dirty.length };
}

function addReviewHistory(firstBatchId: number, secondBatchId: number, dirtyRowsFirst: any[]) {
  const permRows = dirtyRowsFirst.filter((d) => d.category === "permission_override");

  if (permRows[0]) {
    DirtyRowRepo.updateStatus({
      id: permRows[0].id,
      status: "approved",
      reviewed_by: "审计员-孙磊",
      review_note: "已补充审批单 APP-2026-0612-003，市场部数据分析师查看营收明细为季度报表所需，确认通过。",
    });
    ReviewLogRepo.create({
      dirty_row_id: permRows[0].id,
      batch_id: firstBatchId,
      action: "approve",
      old_status: "pending",
      new_status: "approved",
      operator: "审计员-孙磊",
      reason: "业务补充审批单后复核通过，授权范围符合岗位实际需要。",
    });
  }
  if (permRows[1]) {
    DirtyRowRepo.updateStatus({
      id: permRows[1].id,
      status: "rejected",
      reviewed_by: "审计员-孙磊",
      review_note: "人力资源实习生不应持有薪资表修改权限，已通知管理员回收 UPDATE 权限。",
    });
    ReviewLogRepo.create({
      dirty_row_id: permRows[1].id,
      batch_id: firstBatchId,
      action: "reject",
      old_status: "pending",
      new_status: "rejected",
      operator: "审计员-孙磊",
      reason: "权限越权：实习生 UPDATE 薪资属高危操作，予以驳回并通知权限管理员回收。",
    });
  }
  if (permRows[2]) {
    DirtyRowRepo.updateStatus({
      id: permRows[2].id,
      status: "escalated",
      reviewed_by: "审计员-孙磊",
      review_note: "运维持有 DROP 权限且操作时间在凌晨，无法联系当事人，已升级安全主管。",
    });
    ReviewLogRepo.create({
      dirty_row_id: permRows[2].id,
      batch_id: firstBatchId,
      action: "escalate",
      old_status: "pending",
      new_status: "escalated",
      operator: "审计员-孙磊",
      reason: "高危破坏性权限，操作时间异常，升级至安全主管作进一步调查。",
    });
    ReviewLogRepo.create({
      dirty_row_id: permRows[2].id,
      batch_id: secondBatchId,
      action: "comment",
      old_status: "escalated",
      new_status: "escalated",
      operator: "安全主管-周涛",
      reason: "已与运维经理确认，DROP 权限已于 06-13 回收并调整为 ALTER+INDEX，第二批次对比已体现变更。",
    });
  }

  console.log(`   - 已写入复核留痕记录 ${3 + 1} 条`);
}

function run() {
  if (!fs.existsSync(PATHS.DB_PATH)) {
    console.log("数据库不存在，请先运行 npm run db:init");
    process.exit(1);
  }
  const db = getDb();
  const hasData = (
    db.prepare(`SELECT COUNT(*) AS c FROM scan_batches`).get() as { c: number }
  ).c;
  if (hasData > 0) {
    console.log("⚠️  已有检测批次数据，跳过种子写入（如需重新生成请先删除 data/audit.db）。");
    return;
  }

  const firstDate = subDays(new Date(), 3);
  const secondDate = new Date();

  const prefix = (d: Date, mode: string) =>
    `${mode}-${format(d, "yyyyMMddHHmm")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const firstTables = makeFirstBatchTables();
  const secondTables = makeSecondBatchTables();

  const r1 = createBatch({
    index: 0,
    batchDate: firstDate,
    tables: firstTables,
    batchNo: prefix(firstDate, "FULL"),
    mode: "full",
    operator: "sys_scheduler",
    comment: "每日全量权限+订单例行扫描",
  });
  const r2 = createBatch({
    index: 1,
    batchDate: secondDate,
    tables: secondTables,
    batchNo: prefix(secondDate, "INC"),
    mode: "incremental",
    operator: "sys_scheduler",
    comment: "增量扫描：运维权限回收、外部合作方审批补录、新增研发测试越权",
  });

  const firstDirtyList = DirtyRowRepo.list({ batch_id: r1.batchId, limit: 200 });
  addReviewHistory(r1.batchId, r2.batchId, firstDirtyList);

  console.log(`\n🎉 种子数据生成完毕，可开始追溯验证：`);
  console.log(`   · 从 脏行明细 → 找到 category=permission_override 高严重级记录`);
  console.log(`   · 查看 业务说明 / 技术细节 / 复核历史`);
  console.log(`   · 进入 备份对比 → 选前后两个批次的 iam_user_permissions 表，并排看变更`);
  console.log(`   · 进入 慢查询归因 → 与批次同源，点击 导出报告 生成带批次号的文件`);
  console.log(`   · 审计日志 → 看到所有状态变更，含操作人/时间/原因`);
}

run();
