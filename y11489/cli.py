#!/usr/bin/env python3
import sys
import os
import json
import click
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models import *
from app.schemas.user import UserCreate
from app.services.auth import AuthService
from app.services.status import StatusService
from app.services.import_service import ImportService
from app.models.user import UserRole
from app.models.states import RecordStatus


@click.group()
def cli():
    """小厂质检返工权限追责台账 CLI"""
    Base.metadata.create_all(bind=engine)


@cli.group()
def user():
    """用户管理"""
    pass


@user.command("create")
@click.option("--username", required=True, help="用户名")
@click.option("--password", required=True, help="密码")
@click.option("--name", required=True, help="姓名")
@click.option("--role", type=click.Choice([r.value for r in UserRole]), default="operator", help="角色")
def create_user(username, password, name, role):
    """创建用户"""
    db = SessionLocal()
    try:
        from app.schemas.user import UserCreate
        user_data = UserCreate(
            username=username,
            password=password,
            full_name=name,
            role=UserRole(role),
        )
        user = AuthService.create_user(db, user_data)
        click.echo(f"用户创建成功: {user.id} - {user.username} ({user.role.value})")
        sys.exit(0)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@user.command("list")
def list_users():
    """列出所有用户"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            click.echo(f"{u.id}\t{u.username}\t{u.full_name}\t{u.role.value}\t{'活跃' if u.is_active else '禁用'}")
        sys.exit(0)
    finally:
        db.close()


@cli.group()
def inspection():
    """抽检记录管理"""
    pass


@inspection.command("list")
@click.option("--status", help="状态过滤")
@click.option("--batch", help="批次号")
def list_inspections(status, batch):
    """列出抽检记录"""
    db = SessionLocal()
    try:
        query = db.query(InspectionRecord)
        if status:
            query = query.filter(InspectionRecord.status == status)
        if batch:
            query = query.filter(InspectionRecord.batch_no.contains(batch))
        
        records = query.all()
        for r in records:
            click.echo(f"{r.id}\t{r.batch_no}\t{r.product_code}\t{r.status.value}\t良率:{r.yield_rate}%")
        sys.exit(0)
    finally:
        db.close()


@inspection.command("status")
@click.argument("record_id", type=int)
@click.argument("new_status")
@click.option("--user-id", type=int, required=True, help="操作人ID")
@click.option("--reason", help="变更原因")
def update_inspection_status(record_id, new_status, user_id, reason):
    """更新抽检记录状态"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            click.echo(f"错误: 用户不存在", err=True)
            sys.exit(1)
        
        entity = StatusService.transition_status(
            db=db,
            entity_type="inspection",
            entity_id=record_id,
            new_status=new_status,
            user=user,
            reason=reason,
        )
        click.echo(f"状态更新成功: {entity.status.value} (版本: {entity.version})")
        sys.exit(0)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


@cli.group()
def rework():
    """返工单管理"""
    pass


@rework.command("list")
@click.option("--status", help="状态过滤")
def list_reworks(status):
    """列出返工单"""
    db = SessionLocal()
    try:
        query = db.query(ReworkOrder)
        if status:
            query = query.filter(ReworkOrder.status == status)
        
        records = query.all()
        for r in records:
            click.echo(f"{r.id}\t{r.rework_no}\t{r.batch_no}\t{r.status.value}\t返工次数:{r.rework_times}")
        sys.exit(0)
    finally:
        db.close()


@cli.group()
def export():
    """导出管理"""
    pass


@export.command("list")
def list_exports():
    """列出导出记录"""
    db = SessionLocal()
    try:
        exports = db.query(ExportRecord).order_by(ExportRecord.exported_at.desc()).all()
        for e in exports:
            click.echo(f"{e.id}\t{e.export_no}\t{e.export_type}\t记录数:{e.record_count}\t{e.exported_at}")
        sys.exit(0)
    finally:
        db.close()


@cli.group()
def audit():
    """审计日志"""
    pass


@audit.command("logs")
@click.option("--limit", type=int, default=50, help="显示数量")
def audit_logs(limit):
    """查看审计日志"""
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
        for log in logs:
            click.echo(f"{log.created_at}\t{log.user_name}\t{log.action}\t{log.entity_type}:{log.entity_id}")
        sys.exit(0)
    finally:
        db.close()


@audit.command("changes")
@click.option("--entity-type", help="实体类型")
@click.option("--entity-id", type=int, help="实体ID")
def change_history(entity_type, entity_id):
    """查看变更历史"""
    db = SessionLocal()
    try:
        query = db.query(ChangeHistory).order_by(ChangeHistory.changed_at.desc())
        if entity_type:
            query = query.filter(ChangeHistory.entity_type == entity_type)
        if entity_id:
            query = query.filter(ChangeHistory.entity_id == entity_id)
        
        changes = query.all()
        for c in changes:
            manual = " [人工]" if c.is_manual_change else ""
            sensitive = " [敏感]" if c.is_sensitive_field else ""
            field_name = "***" if c.is_sensitive_field else c.field_name
            old_val = "***" if c.is_sensitive_field else c.old_value
            new_val = "***" if c.is_sensitive_field else c.new_value
            click.echo(f"{c.changed_at}\t{c.entity_type}:{c.entity_id}\t{field_name}\t{old_val} -> {new_val}{manual}{sensitive}")
        sys.exit(0)
    finally:
        db.close()


@cli.command("init-demo")
def init_demo_data():
    """初始化演示数据"""
    db = SessionLocal()
    try:
        admin = AuthService.create_user(db, UserCreate(
            username="admin",
            password="admin123",
            full_name="系统管理员",
            role=UserRole.ADMIN,
        ))
        click.echo(f"创建管理员: admin / admin123")

        pm = AuthService.create_user(db, UserCreate(
            username="manager",
            password="managerpass",
            full_name="生产经理",
            role=UserRole.PRODUCTION_MANAGER,
        ))
        click.echo(f"创建生产经理: manager / managerpass")

        qc = AuthService.create_user(db, UserCreate(
            username="qcuser",
            password="qcpass123",
            full_name="质检员小王",
            role=UserRole.QC_INSPECTOR,
        ))
        click.echo(f"创建质检员: qcuser / qcpass123")

        op = AuthService.create_user(db, UserCreate(
            username="operator",
            password="oppass123",
            full_name="操作员小李",
            role=UserRole.OPERATOR,
        ))
        click.echo(f"创建操作员: operator / oppass123")

        shift = MachineShift(
            machine_id="M001",
            shift_name="早班",
            shift_date=datetime.now().date(),
            created_by=op.id,
        )
        db.add(shift)
        db.commit()
        click.echo(f"创建机台班次: M001 早班")

        inspection = InspectionRecord(
            batch_no="B202401001",
            product_code="P001",
            product_name="测试产品A",
            machine_id="M001",
            shift_id=shift.id,
            sample_size=100,
            defect_count=5,
            pass_count=95,
            yield_rate=95.0,
            defect_type="外观不良",
            judge_result="合格",
            status=RecordStatus.DRAFT,
            original_yield_rate=95.0,
            original_defect_count=5,
            created_by=op.id,
        )
        db.add(inspection)
        db.commit()
        click.echo(f"创建抽检记录: B202401001 (良率: 95%)")

        rework = ReworkOrder(
            rework_no="RW202401001",
            batch_no="B202401001",
            product_code="P001",
            product_name="测试产品A",
            rework_reason="外观不良返工",
            defect_type="外观不良",
            rework_count=5,
            rework_pass_count=4,
            rework_fail_count=1,
            rework_times=1,
            status=RecordStatus.DRAFT,
            created_by=op.id,
        )
        db.add(rework)
        db.commit()
        click.echo(f"创建返工单: RW202401001")

        click.echo("\n演示数据初始化完成！")
        sys.exit(0)
    except Exception as e:
        db.rollback()
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    cli()
