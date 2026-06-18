from typing import List
from .models import (
    Tenant,
    MigrationScript,
    PermissionRule,
    ProcessingRecord,
    AuditFinding,
    FINDING_TYPES,
    RISK_LEVELS,
)
from .database import Database


def _mk_tenants() -> List[Tenant]:
    return [
        Tenant(
            tenant_id="T001",
            tenant_name="华东区域电商租户",
            environment="生产",
            created_at="2025-11-15T10:30:00",
            description="包含订单、支付、用户三个子系统",
        ),
        Tenant(
            tenant_id="T002",
            tenant_name="华北金融租户",
            environment="生产",
            created_at="2025-10-08T09:00:00",
            description="核心交易系统，合规要求高",
        ),
        Tenant(
            tenant_id="T003",
            tenant_name="华南物流租户",
            environment="预生产",
            created_at="2025-12-01T14:20:00",
            description="正在进行数据迁移演练",
        ),
        Tenant(
            tenant_id="T004",
            tenant_name="西南文旅租户",
            environment="生产",
            created_at="2025-09-20T11:00:00",
            description="测试环境遗留，未清理",
        ),
    ]


def _mk_migration_scripts() -> List[MigrationScript]:
    return [
        MigrationScript(
            script_id="MIG001",
            version="V2025.12.001",
            name="用户表拆分迁移",
            filepath="migrations/V2025.12.001_user_split.sql",
            content="""
-- 将 user_master 按租户拆分
CREATE TABLE user_T001 AS SELECT * FROM user_master WHERE tenant_id='T001';
CREATE TABLE user_T002 AS SELECT * FROM user_master WHERE tenant_id='T002';
-- 注意：T003 和 T004 的数据需手工确认后迁移
""",
            applied_at="2025-12-01T20:00:00",
            status="SUCCESS",
            applied_by="zhang.wei",
        ),
        MigrationScript(
            script_id="MIG002",
            version="V2025.12.002",
            name="订单外键修复",
            filepath="migrations/V2025.12.002_order_fk.sql",
            content="""
-- 修复订单表对用户表的外键引用
ALTER TABLE order_header DROP CONSTRAINT fk_order_user;
ALTER TABLE order_header ADD CONSTRAINT fk_order_user
  FOREIGN KEY (user_id) REFERENCES user_{tenant_id}(id);
""",
            applied_at="2025-12-02T21:30:00",
            status="PARTIAL",
            error_message="T003 环境 user 表未建立，外键创建失败 142 条",
            applied_by="li.na",
        ),
        MigrationScript(
            script_id="MIG003",
            version="V2025.12.003",
            name="权限表初始数据",
            filepath="migrations/V2025.12.003_perm_init.sql",
            content="""
-- 初始化各租户 RBAC 权限
INSERT INTO permission_rules (...) VALUES (...);
""",
            applied_at=None,
            status="FAILED",
            error_message="唯一键冲突：角色 ADMIN 在租户 T002 已存在",
            applied_by="wang.hao",
        ),
        MigrationScript(
            script_id="MIG004",
            version="V2025.12.004",
            name="日志表归档清理",
            filepath="migrations/V2025.12.004_log_archive.sql",
            content="DELETE FROM access_log WHERE created_at < '2025-01-01';",
            applied_at="2025-12-05T02:00:00",
            status="SUCCESS",
            applied_by="zhang.wei",
        ),
    ]


def _mk_permission_rules() -> List[PermissionRule]:
    return [
        PermissionRule(
            rule_id="PR001",
            tenant_id="T001",
            role_name="订单审核员",
            resource="order",
            action="approve",
            granted_by="admin",
            granted_at="2025-11-20T10:00:00",
            is_active=True,
            comment="正常授权",
        ),
        PermissionRule(
            rule_id="PR002",
            tenant_id="T001",
            role_name="订单审核员",
            resource="finance_payout",
            action="execute",
            granted_by="admin",
            granted_at="2025-11-20T10:05:00",
            is_active=True,
            comment="异常：审核员不应有打款权限",
        ),
        PermissionRule(
            rule_id="PR003",
            tenant_id="T002",
            role_name="风控分析师",
            resource="*",
            action="*",
            granted_by="wang.hao",
            granted_at="2025-12-01T15:00:00",
            is_active=True,
            comment="超权：通配符资源与动作",
        ),
        PermissionRule(
            rule_id="PR004",
            tenant_id="T002",
            role_name="运维只读",
            resource="user",
            action="read",
            granted_by="li.na",
            granted_at="2025-12-03T09:00:00",
            is_active=True,
            comment="跨租户：该账号同时被授权 T001 同角色",
        ),
        PermissionRule(
            rule_id="PR005",
            tenant_id="T004",
            role_name="测试工程师",
            resource="*",
            action="*",
            granted_by="tester",
            granted_at="2025-10-01T00:00:00",
            is_active=True,
            comment="孤立租户仍有活跃权限",
        ),
    ]


BATCH_NO_MIG = "BATCH-MIG-20251205"
BATCH_NO_PERM = "BATCH-PERM-20251206"


def _mk_processing_records() -> List[ProcessingRecord]:
    recs = []
    # 迁移脚本 MIG001 产生的处理记录 - T001
    for i in range(1, 6):
        recs.append(ProcessingRecord(
            record_id=f"R{i:04d}",
            batch_no=BATCH_NO_MIG,
            record_type="MIGRATION",
            tenant_id="T001",
            migration_script_id="MIG001",
            source_table="user_master",
            source_pk=f"U{i:04d}",
            target_table="user_T001",
            target_pk=f"U{i:04d}",
            processed_at=f"2025-12-01T20:0{i:01d}:00",
            processed_by="zhang.wei",
            status="SUCCESS",
        ))
    # 迁移脚本 MIG001 产生的处理记录 - T002 正常
    for i in range(6, 11):
        recs.append(ProcessingRecord(
            record_id=f"R{i:04d}",
            batch_no=BATCH_NO_MIG,
            record_type="MIGRATION",
            tenant_id="T002",
            migration_script_id="MIG001",
            source_table="user_master",
            source_pk=f"U{i:04d}",
            target_table="user_T002",
            target_pk=f"U{i:04d}",
            processed_at=f"2025-12-01T20:0{i:01d}:30",
            processed_by="zhang.wei",
            status="SUCCESS",
        ))
    # 迁移脚本 MIG001 产生的处理记录 - T003 缺失（备份缺口）
    recs.append(ProcessingRecord(
        record_id="R0011",
        batch_no=BATCH_NO_MIG,
        record_type="MIGRATION",
        tenant_id="T003",
        migration_script_id="MIG001",
        source_table="user_master",
        source_pk="U0100",
        target_table=None,
        target_pk=None,
        processed_at="2025-12-01T20:09:00",
        processed_by="zhang.wei",
        status="SKIPPED",
        comment="T003 目标表未就绪，数据暂未迁移",
    ))
    # 迁移脚本 MIG002 - T003 外键断链
    recs.append(ProcessingRecord(
        record_id="R0012",
        batch_no=BATCH_NO_MIG,
        record_type="FK_CHECK",
        tenant_id="T003",
        migration_script_id="MIG002",
        source_table="order_header",
        source_pk="ORD-88231",
        target_table="user_T003",
        target_pk="U0100",
        processed_at="2025-12-02T21:31:00",
        processed_by="li.na",
        status="FK_MISSING",
        comment="订单 ORD-88231 的下单用户 U0100 在 user_T003 中不存在",
    ))
    recs.append(ProcessingRecord(
        record_id="R0013",
        batch_no=BATCH_NO_MIG,
        record_type="FK_CHECK",
        tenant_id="T003",
        migration_script_id="MIG002",
        source_table="order_header",
        source_pk="ORD-88232",
        target_table="user_T003",
        target_pk="U0101",
        processed_at="2025-12-02T21:31:05",
        processed_by="li.na",
        status="FK_MISSING",
        comment="订单 ORD-88232 的下单用户 U0101 在 user_T003 中不存在",
    ))
    # 迁移脚本 MIG003 失败
    recs.append(ProcessingRecord(
        record_id="R0014",
        batch_no=BATCH_NO_MIG,
        record_type="MIGRATION",
        tenant_id="T002",
        migration_script_id="MIG003",
        source_table="permission_rules",
        source_pk=None,
        target_table="permission_rules",
        target_pk=None,
        processed_at="2025-12-03T11:00:00",
        processed_by="wang.hao",
        status="FAILED",
        comment="唯一键冲突，脚本整体回滚",
    ))
    # 权限批处理记录
    recs.append(ProcessingRecord(
        record_id="R0100",
        batch_no=BATCH_NO_PERM,
        record_type="PERMISSION_AUDIT",
        tenant_id="T001",
        permission_rule_id="PR002",
        source_table="permission_rules",
        source_pk="PR002",
        processed_at="2025-12-06T10:00:00",
        processed_by="bi_analyzer",
        status="AUDIT_FLAG",
        comment="订单审核员持有 finance_payout.execute 超权",
    ))
    recs.append(ProcessingRecord(
        record_id="R0101",
        batch_no=BATCH_NO_PERM,
        record_type="PERMISSION_AUDIT",
        tenant_id="T002",
        permission_rule_id="PR003",
        source_table="permission_rules",
        source_pk="PR003",
        processed_at="2025-12-06T10:00:10",
        processed_by="bi_analyzer",
        status="AUDIT_FLAG",
        comment="风控分析师持有通配符权限",
    ))
    recs.append(ProcessingRecord(
        record_id="R0102",
        batch_no=BATCH_NO_PERM,
        record_type="PERMISSION_AUDIT",
        tenant_id="T002",
        permission_rule_id="PR004",
        source_table="permission_rules",
        source_pk="PR004",
        processed_at="2025-12-06T10:00:20",
        processed_by="bi_analyzer",
        status="AUDIT_FLAG",
        comment="跨租户同账号授权，存在越权风险",
    ))
    recs.append(ProcessingRecord(
        record_id="R0103",
        batch_no=BATCH_NO_PERM,
        record_type="PERMISSION_AUDIT",
        tenant_id="T004",
        permission_rule_id="PR005",
        source_table="permission_rules",
        source_pk="PR005",
        processed_at="2025-12-06T10:00:30",
        processed_by="bi_analyzer",
        status="AUDIT_FLAG",
        comment="租户 T004 状态存疑但权限仍活跃",
    ))
    return recs


def _mk_audit_findings() -> List[AuditFinding]:
    return [
        AuditFinding(
            finding_id="F001",
            finding_type="BACKUP_GAP",
            risk_level="HIGH",
            title="T003 用户迁移存在备份缺口",
            description=(
                "2025-12-01 批量迁移 BATCH-MIG-20251205 中，"
                "T003 租户 user_master 源表共 142 条记录未迁移到 user_T003。"
                "当前目标表无对应主键，而下游订单表已引用其中 2 条作为外键。"
            ),
            processing_record_id="R0011",
            tenant_id="T003",
            migration_script_id="MIG001",
            source_tables=["user_master", "user_T003"],
            affected_rows=142,
            evidence="source_count=142, target_count=0, fk_dangling=2",
            detected_at="2025-12-06T10:05:00",
            review_status="PENDING",
        ),
        AuditFinding(
            finding_id="F002",
            finding_type="FK_CHAIN_BREAK",
            risk_level="CRITICAL",
            title="T003 订单表外键断链",
            description=(
                "order_header 表中 2 条订单（ORD-88231、ORD-88232）指向 user_T003 中不存在的用户。"
                "外键约束创建失败，可能导致对账、售后流程异常。"
            ),
            processing_record_id="R0012",
            tenant_id="T003",
            migration_script_id="MIG002",
            source_tables=["order_header", "user_T003"],
            affected_rows=2,
            evidence="orders: ORD-88231->U0100, ORD-88232->U0101",
            detected_at="2025-12-06T10:06:00",
            review_status="PENDING",
        ),
        AuditFinding(
            finding_id="F003",
            finding_type="MIGRATION_FAILED",
            risk_level="HIGH",
            title="V2025.12.003 权限初始化脚本执行失败",
            description=(
                "迁移脚本 MIG003 在 T002 租户因唯一键冲突整体回滚。"
                "角色 ADMIN 已存在导致 INSERT 失败，需确认是否影响后续权限下发。"
            ),
            processing_record_id="R0014",
            tenant_id="T002",
            migration_script_id="MIG003",
            source_tables=["permission_rules"],
            affected_rows=0,
            evidence="UNIQUE constraint failed: permission_rules(tenant_id, role_name)",
            detected_at="2025-12-06T10:07:00",
            review_status="NEEDS_FIX",
            handler_opinion="2025-12-04 由运维组标注待修复，预计本周内重跑",
        ),
        AuditFinding(
            finding_id="F004",
            finding_type="ROLE_OVERPRIVILEGED",
            risk_level="HIGH",
            title="T001 订单审核员超权持有打款权限",
            description=(
                "角色 '订单审核员' 在 T001 被授予 finance_payout.execute 动作。"
                "根据职责分离原则，审核与打款应分属不同角色，存在资金风险。"
            ),
            processing_record_id="R0100",
            tenant_id="T001",
            permission_rule_id="PR002",
            source_tables=["permission_rules"],
            affected_rows=1,
            evidence="rule_id=PR002, role=订单审核员, resource=finance_payout, action=execute",
            detected_at="2025-12-06T10:08:00",
            review_status="PENDING",
        ),
        AuditFinding(
            finding_id="F005",
            finding_type="PERMISSION_LEAK",
            risk_level="CRITICAL",
            title="T002 风控分析师持有通配符权限",
            description=(
                "角色 '风控分析师' 被授予 resource=* action=* 的全权限。"
                "该角色 7 人拥有，等同于系统管理员，严重违反最小权限原则。"
            ),
            processing_record_id="R0101",
            tenant_id="T002",
            permission_rule_id="PR003",
            source_tables=["permission_rules"],
            affected_rows=7,
            evidence="rule_id=PR003, granted_by=wang.hao, grant_time=2025-12-01",
            detected_at="2025-12-06T10:09:00",
            review_status="PENDING",
        ),
        AuditFinding(
            finding_id="F006",
            finding_type="CROSS_TENANT_ACCESS",
            risk_level="MEDIUM",
            title="同一账号跨 T001/T002 同角色授权",
            description=(
                "账号 ops_reader01 同时在 T001、T002 持有 '运维只读' 角色。"
                "多租户环境下跨租户共享账号存在审计追踪不清、越权访问风险。"
            ),
            processing_record_id="R0102",
            tenant_id="T002",
            permission_rule_id="PR004",
            source_tables=["permission_rules"],
            affected_rows=2,
            evidence="account=ops_reader01, tenants=[T001,T002]",
            detected_at="2025-12-06T10:10:00",
            review_status="PENDING",
        ),
        AuditFinding(
            finding_id="F007",
            finding_type="ORPHAN_TENANT",
            risk_level="MEDIUM",
            title="T004 文旅租户疑似孤立但仍有活跃权限",
            description=(
                "T004 最近业务活跃时间为 2025-09-30，但权限表中仍保留 1 条通配符规则活跃。"
                "若已下线需回收权限并归档，避免遗留攻击面。"
            ),
            processing_record_id="R0103",
            tenant_id="T004",
            permission_rule_id="PR005",
            source_tables=["permission_rules", "tenants"],
            affected_rows=1,
            evidence="last_business_activity=2025-09-30, active_rules=1",
            detected_at="2025-12-06T10:11:00",
            review_status="PENDING",
        ),
    ]


def load_sample_data(db: Database, force: bool = False):
    if not force and not db.is_empty():
        return False
    if force:
        db.reset_all()
    for t in _mk_tenants():
        db.insert_tenant(t)
    for m in _mk_migration_scripts():
        db.insert_migration_script(m)
    for p in _mk_permission_rules():
        db.insert_permission_rule(p)
    for r in _mk_processing_records():
        db.insert_processing_record(r)
    for f in _mk_audit_findings():
        db.insert_audit_finding(f)
    return True
