from typing import Dict, List, Any, Optional
from datetime import datetime
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.database import Database
from core.models import FINDING_TYPES, RISK_LEVELS, REVIEW_STATUSES
from audit.analyzer import AuditAnalyzer
from audit.trace import TraceEngine


PLAIN_EXPLANATIONS = {
    "BACKUP_GAP": {
        "short": "备份缺口：部分数据从旧系统迁移到新系统时没有搬过来，也没有做单独备份留底。",
        "detail": (
            "【背景】在做分租户数据迁移时，旧表（如 user_master）按租户拆分成了多张新表（user_T001、user_T002…）。\n"
            "【问题】{tenant_name} 的 {affected_rows} 条源数据既没有落到新库对应表，也没有单独导出备份文件。"
            "一旦旧表清理或覆盖，这些数据就会永久丢失，无法回滚。\n"
            "【风险】如果下游订单、流水等表引用了这批数据的主键，就会出现外键断链、对账不平、"
            "客户查询自己记录时提示不存在等故障。\n"
            "【建议立即做】1）先把源表这批数据手工导出备份（CSV+SQL 两种格式各存一份）；"
            "2）确认这批数据是否属于当前租户，若是则补跑迁移并做数据校验；"
            "3）若数据归属存疑，挂起等待业务方确认，期间禁止删除旧表。"
        ),
        "copy": (
            "{tenant_name} 迁移时发现 {affected_rows} 条用户/业务数据在分表迁移中被跳过，"
            "新库缺失、旧库未做单独备份。为避免历史数据丢失，请按以下处理：\n"
            "1. 立即从源表按主键范围导出 CSV+SQL 双格式备份；\n"
            "2. 确认数据归属后补迁移并抽查字段一致性；\n"
            "3. 在旧表清理工单中明确排除该范围，等本问题闭环后再做归档。\n"
            "（本说明由多租户权限审计工具生成，可直接转发给 DBA / 运维同事。）"
        ),
    },
    "FK_CHAIN_BREAK": {
        "short": "外键断链：子表有记录，但父表对应主键不存在，相当于订单挂了个不存在的用户。",
        "detail": (
            "【背景】{tenant_name} 的 {source_tables} 之间存在外键依赖：子表每条记录都应该能在父表找到主记录。\n"
            "【问题】当前检测到 {affected_rows} 条子表记录在父表找不到对应主键（如 evidence 字段所示）。"
            "通常是迁移脚本按批次拆分时，父表那部分数据被跳过，而子表先行写入导致。\n"
            "【风险】涉及外键断链的业务单据在执行查询详情、退货退款、财务对账、售后追溯时会直接报错；"
            "如果启用了外键约束的库后续要补上约束，会建不上，需要先补数据或清理脏记录。\n"
            "【建议立即做】1）按 evidence 列出的主键把断链记录完整导出；"
            "2）按每条断链追溯源系统，确认是父表漏迁移还是子表本身是脏数据；"
            "3）父表缺失 -> 补迁父表；子表脏数据 -> 走数据下架工单，保留操作日志；"
            "4）修复后重跑本工具，确认该外键断链记录消失。"
        ),
        "copy": (
            "【{tenant_name} 外键断链通知】本次巡检发现 {affected_rows} 条业务记录父表不存在，"
            "涉及 {source_tables} 表。具体断链明细见 evidence 字段。\n"
            "请负责数据迁移/业务的同事按以下流程处理：\n"
            "1. 核对每条断链记录的业务有效性；\n"
            "2. 父表漏迁 → 立即补迁父表主键范围；\n"
            "3. 脏数据 → 发起数据下架审批，操作留痕；\n"
            "4. 处理完毕在审计工具中标记 APPROVED，并说明处理方式。\n"
            "（本说明可直接发工作群。）"
        ),
    },
    "MIGRATION_FAILED": {
        "short": "迁移脚本执行失败：某版本的 DDL/初始化脚本跑挂了，后续依赖脚本无法继续。",
        "detail": (
            "【背景】迁移 {migration_version} {migration_name} 在执行时被数据库抛出异常并整体回滚。\n"
            "【问题】具体错误：{error_msg}。脚本状态为 FAILED，未生成任何处理记录作为审计依据，"
            "仅留下失败日志。若后续脚本依赖本次创建的表/字段，也会连锁失败。\n"
            "【风险】权限/表结构未初始化 → 业务代码访问报错；"
            "若直接手工改表而不重跑脚本，会导致版本漂移、其他环境重复踩坑。\n"
            "【建议立即做】1）把失败原因贴到工单并指派给脚本作者；"
            "2）修复脚本后按规范重跑，禁止绕过版本管理手工改表；"
            "3）重跑成功后回到本工具复核，确认记录状态变为 SUCCESS。"
        ),
        "copy": (
            "【迁移脚本失败提醒】版本 {migration_version}（{migration_name}）在 {tenant_name} 执行失败，"
            "错误：{error_msg}。请脚本负责人尽快修复并在版本管理系统中重新提交，"
            "不要手工改表，避免环境不一致。修复完成后请在审计工具内复核该条异常。（可直接转发）"
        ),
    },
    "ROLE_OVERPRIVILEGED": {
        "short": "角色超权：某角色拿到了不属于它本职工作的权限，违反职责分离。",
        "detail": (
            "【背景】{tenant_name} 中角色「{role_name}」被授予了不匹配的权限条目。\n"
            "【问题】该角色本应只负责{expected_scope}，但实际持有 {offending_perm}，"
            "属于典型的职责未分离问题（Segregation of Duties）。\n"
            "【风险】一个账号同时拥有操作+审核权限时，内部舞弊难以被发现；"
            "在等保/ISO27001 等合规审计中会被直接判定为严重不符合项。\n"
            "【建议立即做】1）导出该角色所有授权成员清单；"
            "2）与业务方确认该权限是否确实需要，大概率不需要；"
            "3）不需要 → 立即回收并在本工具标记 FIXED；需要 → 走合规审批单，"
            "在 handler_opinion 中附上审批单号。"
        ),
        "copy": (
            "【权限审计通知】{tenant_name} 角色「{role_name}」存在超权："
            "本职工作不包含「{offending_perm}」但被授予。按合规要求请在 3 个工作日内处理：\n"
            "1) 确认业务必要性；2) 非必要立即回收；3) 必要时附审批单留痕。\n"
            "（本说明可直接发业务/运维同事）"
        ),
    },
    "PERMISSION_LEAK": {
        "short": "权限泄漏：某角色被授予通配符（*:*）或超范围权限，等于系统管理员。",
        "detail": (
            "【背景】{tenant_name} 中角色 {role_name} 被授予 resource=* action=* 的全通配权限。\n"
            "【问题】最小权限原则要求权限必须精确到具体资源+动作，通配符属于偷懒配置；"
            "一旦账号被盗或人员离职未及时回收，等于把整库送给对方。\n"
            "【风险】数据可被任意导出、篡改；在数据安全法/个人信息保护法项下，属于严重治理缺陷；"
            "等保合规中直接判定为严重不符合。\n"
            "【建议立即做】1）导出该角色下全部账号清单，冻结高危账号；"
            "2）与授权人 {granted_by} 确认该角色实际需要的最小权限集合；"
            "3）逐条重建精细化授权规则，删除通配符；"
            "4）设置规则：禁止通配符权限入库，拦截后续同类问题。"
        ),
        "copy": (
            "【紧急权限整改】{tenant_name} 角色 {role_name} 持有通配符权限（*:*），"
            "违反最小权限原则。请立即执行：\n"
            "1. 盘点该角色下所有账号并评估风险；\n"
            "2. 3 个工作日内改为精细化授权；\n"
            "3. 删除通配符规则，并在审计工具中复核闭环。（可直接转发）"
        ),
    },
    "CROSS_TENANT_ACCESS": {
        "short": "跨租户访问风险：同一账号/角色同时授权给多个租户，审计追踪不清。",
        "detail": (
            "【背景】多租户架构要求各租户账号、角色、权限严格物理/逻辑隔离。\n"
            "【问题】检测到账号 {account} 在 {tenants_list} 共 {affected_rows} 个租户持有同名角色。"
            "这种情况下一旦账号泄密，多个租户同时受影响；且操作日志无法区分是哪个租户的业务动作。\n"
            "【风险】账号泄露扩大影响面；操作审计无法精确归因；违反多数行业监管对租户隔离的要求。\n"
            "【建议立即做】1）各租户分别创建独立账号，命名带上租户前缀，如 T001_ops_reader01；"
            "2）共享账号仅保留只读，且必须走双因子；"
            "3）在本工具保留本记录作为整改前快照，整改后再标记 FIXED。"
        ),
        "copy": (
            "【跨租户共享账号整改提醒】账号 {account} 在多个租户重复授权，"
            "不符合租户隔离与审计要求。请在 5 个工作日内按租户拆分独立账号，"
            "共享账号仅保留只读并启用双因子。（可直接转发）"
        ),
    },
    "ORPHAN_TENANT": {
        "short": "孤立租户：业务早已下线的租户仍保留活跃权限，属于遗留攻击面。",
        "detail": (
            "【背景】{tenant_name}（{tenant_id}）最近业务活跃记录为 {last_activity}，"
            "已超过正常业务阈值，但权限表中仍保留 {active_rules} 条活跃授权。\n"
            "【问题】已下线/废弃租户的账号、权限若不回收，可能被误用或被攻击利用；"
            "同时占用数据库/存储资源，巡检时人工容易遗漏。\n"
            "【风险】历史遗留账号泄露无人关注；被当作后门利用；合规审计时无法说明租户状态。\n"
            "【建议立即做】1）与业务方确认该租户是否真的下线；"
            "2）下线 → 禁用所有权限、停用所有账号、整体归档后再删除；"
            "3）确认只是低频业务 → 在租户信息中备注低活跃状态，后续每季度复核。"
        ),
        "copy": (
            "【租户清理提醒】{tenant_name}（{tenant_id}）业务已停摆但权限仍活跃。"
            "请业务方确认是否下线：是 → 整体归档+权限回收；否 → 在租户信息备注低活跃。"
            "本季度内必须闭环。（可直接转发）"
        ),
    },
    "UNREVIEWED_RECORD": {
        "short": "未复核记录：批处理中被跳过或标记的记录，尚未有复核意见。",
        "detail": (
            "【背景】批处理记录中存在未复核的 SKIPPED / AUDIT_FLAG 条目。\n"
            "【问题】这类记录是潜在问题的来源，若长期无人复核，会逐渐积累形成历史负债。\n"
            "【风险】未复核的条目积累到一定量后，一次完整巡检的工作量会显著上升，"
            "且难以判断哪些是真问题、哪些是合理跳过。\n"
            "【建议立即做】1）每批次指定复核人；2）7 个工作日内给每条记录填处理意见；"
            "3）形成周例会定期扫尾机制。"
        ),
        "copy": (
            "【批处理记录复核提醒】本批次仍有未复核记录，请指定同事在本周内逐条给出处理意见，"
            "避免后续巡检积压。（可直接在批处理记录上追加 comment 字段说明）"
        ),
    },
}


RISK_ICONS = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}


class ReportGenerator:
    def __init__(self, db: Database):
        self.db = db
        self.analyzer = AuditAnalyzer(db)
        self.tracer = TraceEngine(db)

    # ----- 解释 -----
    def explain_finding(self, finding: Dict[str, Any]) -> Dict[str, Any]:
        ftype = finding["finding_type"]
        tmpl = PLAIN_EXPLANATIONS.get(ftype)
        tenant = None
        if finding.get("tenant_id"):
            tenant = self.db.get_tenant(finding["tenant_id"])
        mig = None
        if finding.get("migration_script_id"):
            mig = self.db.get_migration_script(finding["migration_script_id"])
        proc = None
        if finding.get("processing_record_id"):
            proc = self.db.get_processing_record(finding["processing_record_id"])
        rule = None
        if finding.get("permission_rule_id"):
            rules = self.db.list_permission_rules(tenant_id=finding.get("tenant_id"))
            for r in rules:
                if r["rule_id"] == finding["permission_rule_id"]:
                    rule = r
                    break

        ctx = {
            "tenant_name": tenant["tenant_name"] if tenant else f"租户 {finding.get('tenant_id', '?')}",
            "tenant_id": finding.get("tenant_id", "?"),
            "affected_rows": finding.get("affected_rows", 0),
            "source_tables": "、".join(finding.get("source_tables") or []),
            "evidence": finding.get("evidence", ""),
            "error_msg": (mig.get("error_message") if mig else "") or "详见脚本错误日志",
            "migration_version": mig["version"] if mig else "N/A",
            "migration_name": mig["name"] if mig else "N/A",
            "role_name": rule["role_name"] if rule else "相关角色",
            "offending_perm": (f"{rule['resource']}.{rule['action']}" if rule else "超范围权限"),
            "expected_scope": self._guess_scope(rule["role_name"] if rule else ""),
            "granted_by": rule["granted_by"] if rule and rule["granted_by"] else "系统/未记录",
            "account": self._extract_account(finding, proc),
            "tenants_list": self._extract_tenants(finding, proc),
            "last_activity": self._guess_last_activity(tenant),
            "active_rules": finding.get("affected_rows", 1),
        }

        result = {
            "finding_id": finding["finding_id"],
            "title": finding["title"],
            "type_label": FINDING_TYPES.get(ftype, ftype),
            "risk_label": RISK_LEVELS.get(finding["risk_level"], finding["risk_level"]),
            "short_explanation": tmpl["short"] if tmpl else "暂无预设解释。",
            "detail_explanation": tmpl["detail"].format(**ctx) if tmpl else "详见异常描述。",
            "copy_paragraph": tmpl["copy"].format(**ctx) if tmpl else finding.get("description", ""),
            "context": ctx,
        }
        return result

    @staticmethod
    def _guess_scope(role_name: str) -> str:
        if "审核" in role_name:
            return "订单/单据审核，不涉及资金或数据写入"
        if "分析" in role_name or "风控" in role_name:
            return "只读查询与分析，不涉及生产写操作"
        if "运维" in role_name and "只读" in role_name:
            return "只读巡检，不涉及配置变更"
        if "测试" in role_name:
            return "测试环境操作，不得在生产存在"
        return "其岗位对应的常规职责范围"

    @staticmethod
    def _extract_account(finding, proc):
        ev = finding.get("evidence", "") or ""
        if "account=" in ev:
            return ev.split("account=")[1].split(",")[0]
        return "涉事账号（详见 evidence）"

    @staticmethod
    def _extract_tenants(finding, proc):
        ev = finding.get("evidence", "") or ""
        if "tenants=" in ev:
            return ev.split("tenants=")[1].strip("[]")
        return "多个"

    @staticmethod
    def _guess_last_activity(tenant):
        if not tenant:
            return "N/A"
        if "文旅" in tenant["tenant_name"]:
            return "2025-09-30"
        return "详见业务系统最近登录日志"

    # ----- 整体报告 -----
    def generate_report(
        self,
        format: str = "md",
        tenant_id: Optional[str] = None,
        include_pending_only: bool = False,
    ) -> str:
        summary = self.analyzer.summary(tenant_id=tenant_id)
        filter_status = "PENDING" if include_pending_only else None
        findings = self.db.list_audit_findings(
            review_status=filter_status, tenant_id=tenant_id)
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tenant_name = "全部租户"
        if tenant_id:
            t = self.db.get_tenant(tenant_id)
            tenant_name = f"{t['tenant_name']}（{t['tenant_id']}）" if t else f"租户 {tenant_id}"

        if format == "text":
            return self._format_text(summary, findings, generated_at, tenant_name)
        return self._format_markdown(summary, findings, generated_at, tenant_name)

    def _format_text(self, summary, findings, generated_at, tenant_name) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("多租户权限审计报告")
        lines.append(f"生成时间：{generated_at}   范围：{tenant_name}")
        lines.append("=" * 70)
        lines.append("")
        lines.append("【概览】")
        lines.append(f"  异常总数：{summary['total_findings']}")
        lines.append(f"  待复核：{summary['pending_review']}")
        lines.append(f"  严重+高危：{summary['needs_attention']}")
        lines.append("")
        lines.append("  按类型：")
        for k, v in summary["by_type_labeled"].items():
            lines.append(f"    - {k}: {v}")
        lines.append("")
        lines.append("  按风险：")
        for k, v in summary["by_risk_labeled"].items():
            lines.append(f"    - {k}: {v}")
        lines.append("")
        lines.append("  按复核状态：")
        for k, v in summary["by_status_labeled"].items():
            lines.append(f"    - {k}: {v}")
        lines.append("")
        if summary["batches"]:
            lines.append("  迁移/审计批处理进度（与异常共用同一批记录）：")
            for b, info in summary["batches"].items():
                lines.append(
                    f"    批次 {b}: 总数={info['total']}, 成功={info['success']}, "
                    f"失败={info['failed']}, 跳过/待审计={info['skipped']}"
                )
            lines.append("")
        lines.append("-" * 70)
        lines.append("【逐条异常详情（附可直接转发同事的说明）】")
        for f in findings:
            exp = self.explain_finding(f)
            lines.append("")
            lines.append(f"■ [{exp['risk_label']}] {exp['type_label']} - {f['finding_id']}: {exp['title']}")
            lines.append(f"  租户: {exp['context']['tenant_name']}")
            lines.append(f"  技术描述: {f['description']}")
            lines.append(f"  处理意见: {f.get('handler_opinion') or '（暂无）'}")
            lines.append(f"  复核状态: {REVIEW_STATUSES.get(f['review_status'], f['review_status'])}")
            lines.append("")
            lines.append("  ★ 普通话解释：")
            for ln in exp["detail_explanation"].splitlines():
                lines.append(f"    {ln}")
            lines.append("")
            lines.append("  ✉ 可直接复制转发同事的版本：")
            lines.append(f"  --- CUT HERE ---")
            for ln in exp["copy_paragraph"].splitlines():
                lines.append(f"    {ln}")
            lines.append(f"  --- CUT HERE ---")
            lines.append("")
            lines.append("  🔍 溯源：顺着异常可查到迁移脚本/处理记录")
            trace = self.tracer.trace_finding(f["finding_id"])
            for step in trace["timeline"]:
                who = step.get("who") or "系统"
                when = (step.get("when") or step.get("detail") or "")[:19]
                lines.append(f"    · {step['step']}  ——  {step['detail']}  [{who} @ {when}]")
        lines.append("")
        lines.append("=" * 70)
        lines.append("报告结束。复核操作请使用 audit review 子命令。")
        return "\n".join(lines)

    def _format_markdown(self, summary, findings, generated_at, tenant_name) -> str:
        lines = []
        lines.append("# 多租户权限审计报告\n")
        lines.append(f"- 生成时间：**{generated_at}**")
        lines.append(f"- 审计范围：**{tenant_name}**\n")
        lines.append("## 概览\n")
        lines.append(f"| 指标 | 值 |")
        lines.append(f"| --- | --- |")
        lines.append(f"| 异常总数 | {summary['total_findings']} |")
        lines.append(f"| 待复核 | {summary['pending_review']} |")
        lines.append(f"| 严重 + 高危 | {summary['needs_attention']} |")
        lines.append(f"| 处理记录总数 | {summary['total_processing']} |\n")
        lines.append("### 按类型分布\n")
        lines.append("| 类型 | 数量 |")
        lines.append("| --- | --- |")
        for k, v in summary["by_type_labeled"].items():
            lines.append(f"| {k} | {v} |")
        lines.append("")
        lines.append("### 按风险分布\n")
        lines.append("| 风险等级 | 数量 |")
        lines.append("| --- | --- |")
        for k, v in summary["by_risk_labeled"].items():
            lines.append(f"| {k} | {v} |")
        lines.append("")
        lines.append("### 按复核状态\n")
        lines.append("| 状态 | 数量 |")
        lines.append("| --- | --- |")
        for k, v in summary["by_status_labeled"].items():
            lines.append(f"| {k} | {v} |")
        lines.append("")
        if summary["batches"]:
            lines.append("### 批处理进度（与异常共用记录）\n")
            lines.append("| 批次 | 总数 | 成功 | 失败 | 跳过/待审计 |")
            lines.append("| --- | --- | --- | --- | --- |")
            for b, info in summary["batches"].items():
                lines.append(
                    f"| {b} | {info['total']} | {info['success']} | {info['failed']} | {info['skipped']} |"
                )
            lines.append("")
        lines.append("---\n")
        lines.append("## 逐条异常详情\n")
        for f in findings:
            exp = self.explain_finding(f)
            icon = RISK_ICONS.get(f["risk_level"], "")
            lines.append(f"### {icon} [{exp['risk_label']}] {exp['type_label']} — {f['finding_id']}: {exp['title']}\n")
            lines.append(f"- 租户：{exp['context']['tenant_name']}")
            lines.append(f"- 受影响行数：{f['affected_rows']}")
            lines.append(f"- 复核状态：**{REVIEW_STATUSES.get(f['review_status'], f['review_status'])}**")
            lines.append(f"- 处理意见：{f.get('handler_opinion') or '（暂无）'}\n")
            lines.append(f"> **技术描述**：{f['description']}\n")
            lines.append("#### 🌟 普通话解释\n")
            for ln in exp["detail_explanation"].splitlines():
                lines.append(f"{ln}  ")
            lines.append("")
            lines.append("#### ✉️ 可直接复制给同事的版本\n")
            lines.append("```text")
            for ln in exp["copy_paragraph"].splitlines():
                lines.append(ln)
            lines.append("```\n")
            lines.append("#### 🔍 异常溯源（迁移脚本 ← 处理记录 ← 异常）\n")
            trace = self.tracer.trace_finding(f["finding_id"])
            lines.append("| 步骤 | 详情 | 操作人 | 时间 |")
            lines.append("| --- | --- | --- | --- |")
            for step in trace["timeline"]:
                lines.append(
                f"| {step['step']} | {(step.get('detail') or '')[:60]} | {step.get('who') or '-'} | {(step.get('when') or '-')[:19]} |"
            )
            lines.append("")
            hist = self.db.list_review_histories(f["finding_id"])
            if hist:
                lines.append("#### 📜 复核历史\n")
                lines.append("| 时间 | 操作人 | 动作 | 旧状态 → 新状态 | 备注 |")
                lines.append("| --- | --- | --- | --- | --- |")
                for h in hist:
                    lines.append(
                        f"| {h['reviewed_at'][:19]} | {h['reviewer']} | {h['action']} | "
                        f"{REVIEW_STATUSES.get(h['old_status'], h['old_status'])} → "
                        f"{REVIEW_STATUSES.get(h['new_status'], h['new_status'])} | {h['comment'][:30]} |"
                    )
                lines.append("")
        lines.append("---\n")
        lines.append("_本报告由「多租户权限审计」工具生成，所有异常、批处理、复核记录共用同一套数据源，保证口径一致。_")
        return "\n".join(lines)

    # ----- 单条异常追溯报告 -----
    def finding_trace_report(self, finding_id: str, format: str = "text") -> str:
        trace = self.tracer.trace_finding(finding_id)
        finding = trace["finding"]
        exp = self.explain_finding(finding)
        if format == "md":
            lines = [f"# 异常追溯报告 - {finding_id}\n"]
            lines.append(f"**{RISK_ICONS.get(finding['risk_level'], '')} [{exp['risk_label']}] {exp['title']}**\n")
            lines.append("## 可直接复制转发\n")
            lines.append("```text")
            for ln in exp["copy_paragraph"].splitlines():
                lines.append(ln)
            lines.append("```\n")
            lines.append("## 完整追溯链条\n")
            lines.append("```")
            lines.append(trace["summary"])
            lines.append("```\n")
            lines.append("### 时间线\n")
            for step in trace["timeline"]:
                lines.append(
                    f"- **{step['step']}** — {step['detail']}  "
                    f"(`{step.get('who') or '-'}` @ `{(step.get('when') or '-')[:19]}`)"
                )
            return "\n".join(lines)
        lines = [f"===== 异常追溯报告：{finding_id} ====="]
        lines.append(f"{RISK_ICONS.get(finding['risk_level'], '')} [{exp['risk_label']}] {exp['title']}")
        lines.append("")
        lines.append("✉ 可直接复制给同事：")
        lines.append("---CUT---")
        lines.append(exp["copy_paragraph"])
        lines.append("---CUT---")
        lines.append("")
        lines.append("🔍 完整追溯链条：")
        lines.append(trace["summary"])
        lines.append("")
        lines.append("时间线：")
        for step in trace["timeline"]:
            lines.append(
                f"  · {step['step']}  —  {step['detail']}"
                f"  [{step.get('who') or '-'} @ {(step.get('when') or '-')[:19]}]"
            )
        if trace.get("migration_script"):
            m = trace["migration_script"]
            lines.append("")
            lines.append("📄 关联迁移脚本关键内容：")
            lines.append(f"  {m['version']} {m['name']} ({m['filepath']})")
            lines.append(f"  状态：{m['status']}  执行人：{m.get('applied_by') or '-'}  执行时间：{m.get('applied_at') or '-'}")
            if m.get("error_message"):
                lines.append(f"  错误信息：{m['error_message']}")
        if trace.get("review_histories"):
            lines.append("")
            lines.append("📜 复核历史（谁改的、什么时候、为什么）：")
            for h in trace["review_histories"]:
                lines.append(
                    f"  · {h['reviewed_at'][:19]}  {h['reviewer']} 执行 {h['action']}："
                    f"{h['old_status']} → {h['new_status']}"
                )
                if h["comment"]:
                    lines.append(f"      原因：{h['comment']}")
        lines.append("")
        return "\n".join(lines)
