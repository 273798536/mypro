#!/usr/bin/env python3
import sys
import os
import json
import sys
from datetime import datetime

import click

from app.database import SessionLocal, init_db
from app.models import WorkOrderStatus, Role, SourceType
from app.schemas import (
    WorkOrderCreate, WorkOrderUpdate, StatusChangeRequest,
    FreezeRequest, ExportRequest, JudgmentCreate,
    UserCreate
)
from app.services import (
    get_work_order, get_work_orders, create_work_order,
    update_work_order, change_work_order_status, freeze_work_order,
    add_judgment, export_work_orders, create_user,
    get_user_by_username, WorkOrderStateError, PermissionError,
    DuplicateSubmissionError, WorkOrderFrozenError
)
from app.importer import import_file, ImportError, PartialImportError

EXIT_SUCCESS = 0
EXIT_ERROR = 1
EXIT_PARTIAL = 2
EXIT_NOT_FOUND = 3
EXIT_PERMISSION = 4
EXIT_STATE_ERROR = 5


def get_db_session():
    return SessionLocal()


def print_json(data):
    click.echo(json.dumps(data, ensure_ascii=False, indent=2, default=str))


def handle_exception(e):
    if isinstance(e, ValueError):
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(EXIT_NOT_FOUND)
    elif isinstance(e, PermissionError):
        click.echo(f"权限错误: {str(e)}", err=True)
        sys.exit(EXIT_PERMISSION)
    elif isinstance(e, WorkOrderStateError):
        click.echo(f"状态错误: {str(e)}", err=True)
        sys.exit(EXIT_STATE_ERROR)
    elif isinstance(e, WorkOrderFrozenError):
        click.echo(f"冻结错误: {str(e)}", err=True)
        sys.exit(EXIT_STATE_ERROR)
    elif isinstance(e, DuplicateSubmissionError):
        click.echo(f"重复提交: {str(e)}", err=True)
        sys.exit(EXIT_ERROR)
    elif isinstance(e, PartialImportError):
        click.echo(f"部分导入成功: {e.success_count} 成功, {e.failed_count} 失败", err=True)
        print_json({"errors": e.errors})
        sys.exit(EXIT_PARTIAL)
    elif isinstance(e, ImportError):
        click.echo(f"导入错误: {str(e)}", err=True)
        sys.exit(EXIT_ERROR)
    else:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(EXIT_ERROR)


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """城市照明抢修权限追责台账 - 命令行工具"""
    init_db()


@cli.group()
def user():
    """用户管理"""
    pass


@user.command("create")
@click.option("--username", required=True, help="用户名")
@click.option("--real-name", required=True, help="真实姓名")
@click.option("--role", type=click.Choice([r.value for r in Role]), required=True, help="角色")
@click.option("--password", required=True, help="密码")
def create_user_cmd(username, real_name, role, password):
    """创建用户"""
    db = get_db_session()
    try:
        existing = get_user_by_username(db, username)
        if existing:
            click.echo(f"错误: 用户名 '{username}' 已存在", err=True)
            sys.exit(EXIT_ERROR)
        
        user = create_user(db, username, real_name, Role(role), password)
        print_json({
            "id": user.id,
            "username": user.username,
            "real_name": user.real_name,
            "role": user.role.value,
            "created_at": user.created_at.isoformat(),
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def workorder():
    """工单管理"""
    pass


@workorder.command("create")
@click.option("--title", required=True, help="工单标题")
@click.option("--description", help="工单描述")
@click.option("--location", help="地点")
@click.option("--creator-id", type=int, required=True, help="创建者用户ID")
@click.option("--wo-no", help="工单号（自动生成）")
@click.option("--spare-part", help="备件批次")
@click.option("--hotline", help="热线电话")
@click.option("--photo-ref", help="巡检照片引用")
def create_wo(title, description, location, creator_id, wo_no, spare_part, hotline, photo_ref):
    """创建工单"""
    db = get_db_session()
    try:
        from app.services import generate_work_order_no
        if not wo_no:
            wo_no = generate_work_order_no(db)
        
        wo_data = WorkOrderCreate(
            work_order_no=wo_no,
            title=title,
            description=description,
            location=location,
            creator_id=creator_id,
            spare_part_batch=spare_part,
            hotline_number=hotline,
            inspection_photo_ref=photo_ref,
        )
        wo = create_work_order(db, wo_data)
        print_json({
            "id": wo.id,
            "work_order_no": wo.work_order_no,
            "title": wo.title,
            "status": wo.status.value,
            "created_at": wo.created_at.isoformat(),
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@workorder.command("list")
@click.option("--status", type=click.Choice([s.value for s in WorkOrderStatus]), help="按状态筛选")
@click.option("--creator-id", type=int, help="按创建者筛选")
@click.option("--limit", type=int, default=50, help="返回数量")
@click.option("--skip", type=int, default=0, help="跳过数量")
def list_wo(status, creator_id, limit, skip):
    """列出工单"""
    db = get_db_session()
    try:
        status_enum = WorkOrderStatus(status) if status else None
        work_orders = get_work_orders(db, skip=skip, limit=limit, status=status_enum, creator_id=creator_id)
        
        result = []
        for wo in work_orders:
            result.append({
                "id": wo.id,
                "work_order_no": wo.work_order_no,
                "title": wo.title,
                "location": wo.location,
                "status": wo.status.value,
                "created_at": wo.created_at.isoformat(),
            })
        print_json({"count": len(result), "items": result})
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@workorder.command("show")
@click.argument("wo_id", type=int)
def show_wo(wo_id):
    """查看工单详情"""
    db = get_db_session()
    try:
        wo = get_work_order(db, wo_id)
        if not wo:
            click.echo(f"错误: 工单 {wo_id} 不存在", err=True)
            sys.exit(EXIT_NOT_FOUND)
        
        transitions = []
        for t in wo.status_transitions:
            transitions.append({
                "from": t.from_status.value if t.from_status else None,
                "to": t.to_status.value,
                "operator": t.operator.real_name if t.operator else None,
                "time": t.occurred_at.isoformat(),
                "reason": t.reason,
            })
        
        result = {
            "id": wo.id,
            "work_order_no": wo.work_order_no,
            "title": wo.title,
            "description": wo.description,
            "location": wo.location,
            "status": wo.status.value,
            "is_frozen": wo.is_frozen,
            "spare_part_batch": wo.spare_part_batch,
            "hotline_number": wo.hotline_number,
            "inspection_photo_ref": wo.inspection_photo_ref,
            "creator": wo.creator.real_name if wo.creator else None,
            "created_at": wo.created_at.isoformat(),
            "updated_at": wo.updated_at.isoformat(),
            "transitions": transitions,
            "evidence_count": len(wo.evidences),
            "judgment_count": len(wo.judgments),
        }
        print_json(result)
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@workorder.command("update")
@click.argument("wo_id", type=int)
@click.option("--title", help="工单标题")
@click.option("--description", help="工单描述")
@click.option("--location", help="地点")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def update_wo(wo_id, title, description, location, operator_id):
    """更新工单（仅草稿状态）"""
    db = get_db_session()
    try:
        update_data = WorkOrderUpdate(
            title=title,
            description=description,
            location=location,
        )
        wo = update_work_order(db, wo_id, update_data, operator_id)
        print_json({
            "id": wo.id,
            "work_order_no": wo.work_order_no,
            "title": wo.title,
            "status": wo.status.value,
            "updated_at": wo.updated_at.isoformat(),
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def status():
    """状态流转"""
    pass


@status.command("change")
@click.argument("wo_id", type=int)
@click.option("--to", "to_status", type=click.Choice([s.value for s in WorkOrderStatus]), required=True, help="目标状态")
@click.option("--reason", required=True, help="变更原因")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def change_status_cmd(wo_id, to_status, reason, operator_id):
    """变更工单状态"""
    db = get_db_session()
    try:
        request = StatusChangeRequest(
            new_status=WorkOrderStatus(to_status),
            reason=reason,
            operator_id=operator_id,
        )
        wo, transition = change_work_order_status(db, wo_id, request)
        print_json({
            "id": wo.id,
            "work_order_no": wo.work_order_no,
            "status": wo.status.value,
            "transition": {
                "from": transition.from_status.value if transition.from_status else None,
                "to": transition.to_status.value,
                "operator": transition.operator.real_name if transition.operator else None,
                "time": transition.occurred_at.isoformat(),
                "reason": transition.reason,
            },
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@status.command("submit")
@click.argument("wo_id", type=int)
@click.option("--reason", default="提交审核", help="提交原因")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def submit_wo(wo_id, reason, operator_id):
    """提交工单"""
    db = get_db_session()
    try:
        request = StatusChangeRequest(
            new_status=WorkOrderStatus.SUBMITTED,
            reason=reason,
            operator_id=operator_id,
        )
        wo, _ = change_work_order_status(db, wo_id, request)
        click.echo(f"工单 {wo.work_order_no} 已提交")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@status.command("reject")
@click.argument("wo_id", type=int)
@click.option("--reason", required=True, help="驳回原因")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def reject_wo(wo_id, reason, operator_id):
    """驳回工单"""
    db = get_db_session()
    try:
        request = StatusChangeRequest(
            new_status=WorkOrderStatus.REJECTED,
            reason=reason,
            operator_id=operator_id,
        )
        wo, _ = change_work_order_status(db, wo_id, request)
        click.echo(f"工单 {wo.work_order_no} 已驳回")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@status.command("reconfirm")
@click.argument("wo_id", type=int)
@click.option("--reason", required=True, help="二次确认原因")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def reconfirm_wo(wo_id, reason, operator_id):
    """二次确认工单"""
    db = get_db_session()
    try:
        request = StatusChangeRequest(
            new_status=WorkOrderStatus.RECONFIRMED,
            reason=reason,
            operator_id=operator_id,
        )
        wo, _ = change_work_order_status(db, wo_id, request)
        click.echo(f"工单 {wo.work_order_no} 已二次确认")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@status.command("freeze")
@click.argument("wo_id", type=int)
@click.option("--reason", required=True, help="冻结原因")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def freeze_wo(wo_id, reason, operator_id):
    """冻结工单"""
    db = get_db_session()
    try:
        request = FreezeRequest(reason=reason, operator_id=operator_id)
        wo = freeze_work_order(db, wo_id, request)
        click.echo(f"工单 {wo.work_order_no} 已冻结")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@status.command("withdraw")
@click.argument("wo_id", type=int)
@click.option("--reason", required=True, help="撤回原因")
@click.option("--operator-id", type=int, required=True, help="操作者用户ID")
def withdraw_wo(wo_id, reason, operator_id):
    """撤回工单"""
    db = get_db_session()
    try:
        request = StatusChangeRequest(
            new_status=WorkOrderStatus.WITHDRAWN,
            reason=reason,
            operator_id=operator_id,
        )
        wo, _ = change_work_order_status(db, wo_id, request)
        click.echo(f"工单 {wo.work_order_no} 已撤回")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def judgment():
    """人工改判"""
    pass


@judgment.command("add")
@click.argument("wo_id", type=int)
@click.option("--type", "judgment_type", required=True, help="改判类型")
@click.option("--reason", required=True, help="改判原因")
@click.option("--judge-id", type=int, required=True, help="改判人用户ID")
@click.option("--set", "new_data", multiple=True, help="设置字段值，格式key=value")
def add_judgment_cmd(wo_id, judgment_type, reason, judge_id, new_data):
    """添加人工改判"""
    db = get_db_session()
    try:
        data_dict = {}
        for item in new_data:
            key, value = item.split("=", 1)
            data_dict[key] = value
        
        judgment_data = JudgmentCreate(
            work_order_id=wo_id,
            judgment_type=judgment_type,
            reason=reason,
            judge_id=judge_id,
            new_data=data_dict or None,
        )
        j = add_judgment(db, judgment_data)
        print_json({
            "id": j.id,
            "work_order_id": j.work_order_id,
            "type": j.judgment_type,
            "reason": j.reason,
            "previous_data": j.previous_data,
            "new_data": j.new_data,
            "made_at": j.made_at.isoformat(),
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def importer():
    """数据导入"""
    pass


@importer.command("file")
@click.argument("filepath", type=click.Path(exists=True))
@click.option("--uploaded-by", type=int, required=True, help="上传者用户ID")
@click.option("--source-type", type=click.Choice([s.value for s in SourceType]), help="数据源类型")
@click.option("--auto-create", is_flag=True, help="自动创建工单")
def import_file_cmd(filepath, uploaded_by, source_type, auto_create):
    """导入文件（支持CSV、Excel、JSON、图片、压缩包"""
    db = get_db_session()
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        
        filename = os.path.basename(filepath)
        st = SourceType(source_type) if source_type else None
        
        result = import_file(
            db,
            filename=filename,
            content=content,
            uploaded_by=uploaded_by,
            source_type=st,
            auto_create_work_orders=auto_create,
        )
        print_json(result)
        sys.exit(EXIT_SUCCESS)
    except PartialImportError as e:
        click.echo(f"部分导入: {e.success_count} 成功, {e.failed_count} 失败", err=True)
        print_json({"errors": e.errors})
        sys.exit(EXIT_PARTIAL)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def exporter():
    """数据导出"""
    pass


@exporter.command("json")
@click.option("--wo-ids", help="工单ID列表，逗号分隔")
@click.option("--exported-by", type=int, required=True, help="导出者用户ID")
@click.option("--no-mask", is_flag=True, help="不脱敏敏感字段")
@click.option("--output", "-o", type=click.Path(), help="输出文件路径")
def export_json(wo_ids, exported_by, no_mask, output):
    """导出为JSON"""
    db = get_db_session()
    try:
        wo_id_list = [int(x) for x in wo_ids.split(",")] if wo_ids else None
        
        request = ExportRequest(
            work_order_ids=wo_id_list,
            export_type="json",
            mask_sensitive=not no_mask,
            exported_by=exported_by,
        )
        export_data, export_log = export_work_orders(db, request)
        
        result = {
            "export_log_id": export_log.id,
            "exported_at": export_log.exported_at.isoformat(),
            "count": len(export_data),
            "mask_sensitive": not no_mask,
            "data": export_data,
        }
        
        if output:
            with open(output, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2, default=str)
            click.echo(f"已导出到 {output}")
        else:
            print_json(result)
        
        click.echo(f"成功导出 {len(export_data)} 条记录")
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def queue():
    """重试队列管理"""
    pass


@queue.command("list")
@click.option("--type", "task_type", type=click.Choice([t.value for t in SourceType.__members__.values()] if 'SourceType' in globals() else ['import', 'export', 'status_change']), help="按任务类型筛选")
@click.option("--limit", type=int, default=50, help="返回数量")
def list_queue(task_type, limit):
    """列出待处理任务"""
    db = get_db_session()
    try:
        from app.queue_service import get_pending_tasks
        from app.models import TaskType
        tt = TaskType(task_type) if task_type else None
        tasks = get_pending_tasks(db, task_type=tt, limit=limit)
        
        result = []
        for t in tasks:
            result.append({
                "id": t.id,
                "task_type": t.task_type.value,
                "status": t.status.value,
                "retry_count": t.retry_count,
                "max_retries": t.max_retries,
                "next_retry_at": t.next_retry_at.isoformat(),
                "work_order_id": t.work_order_id,
                "priority": t.priority,
            })
        print_json({"count": len(result), "items": result})
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@queue.command("stats")
def queue_stats():
    """查看队列统计"""
    db = get_db_session()
    try:
        from app.queue_service import get_retry_queue_stats
        stats = get_retry_queue_stats(db)
        print_json(stats)
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def deadletter():
    """死信队列管理"""
    pass


@deadletter.command("list")
@click.option("--type", "task_type", type=click.Choice(['import', 'export', 'status_change', 'notification', 'data_sync', 'evidence_process']), help="按任务类型筛选")
@click.option("--include-resolved", is_flag=True, help="包含已解决的任务")
@click.option("--limit", type=int, default=100, help="返回数量")
def list_deadletter(task_type, include_resolved, limit):
    """列出死信任务"""
    db = get_db_session()
    try:
        from app.queue_service import get_dead_letter_tasks
        from app.models import TaskType
        tt = TaskType(task_type) if task_type else None
        tasks = get_dead_letter_tasks(db, task_type=tt, only_unresolved=not include_resolved, limit=limit)
        
        result = []
        for t in tasks:
            result.append({
                "id": t.id,
                "original_task_id": t.original_task_id,
                "task_type": t.task_type.value,
                "error_message": t.error_message,
                "retry_count": t.retry_count,
                "moved_at": t.moved_at.isoformat(),
                "work_order_id": t.work_order_id,
                "is_resolved": t.is_resolved,
            })
        print_json({"count": len(result), "items": result})
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@deadletter.command("resolve")
@click.argument("dlq_id", type=int)
@click.option("--resolved-by", type=int, required=True, help="处理人用户ID")
@click.option("--note", required=True, help="处理说明")
@click.option("--requeue", is_flag=True, help="重新入队")
def resolve_deadletter(dlq_id, resolved_by, note, requeue):
    """解决死信任务"""
    db = get_db_session()
    try:
        from app.queue_service import resolve_dead_letter
        result = resolve_dead_letter(
            db,
            dlq_id=dlq_id,
            resolved_by=resolved_by,
            resolution_note=note,
            requeue=requeue,
        )
        print_json({
            "status": "resolved",
            "dlq_id": dlq_id,
            "requeued": result is not None,
            "new_task_id": result.id if result else None,
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.group()
def replay():
    """历史回放管理"""
    pass


@replay.command("create")
@click.argument("wo_id", type=int)
@click.option("--created-by", type=int, required=True, help="创建人用户ID")
@click.option("--name", help="回放会话名称")
@click.option("--description", help="回放会话描述")
def create_replay(wo_id, created_by, name, description):
    """创建历史回放会话"""
    db = get_db_session()
    try:
        from app.queue_service import replay_work_order_history
        session = replay_work_order_history(
            db,
            work_order_id=wo_id,
            created_by=created_by,
            name=name,
            description=description,
        )
        print_json({
            "id": session.id,
            "name": session.name,
            "work_order_id": session.work_order_id,
            "event_count": len(session.replay_events),
            "start_time": session.start_time.isoformat(),
            "end_time": session.end_time.isoformat(),
        })
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@replay.command("to-time")
@click.argument("session_id", type=int)
@click.option("--timestamp", required=True, help="目标时间点，格式: 2024-05-20T14:30:00")
def replay_to_time(session_id, timestamp):
    """回放至指定时间点"""
    db = get_db_session()
    try:
        from app.queue_service import replay_to_timestamp
        target_time = datetime.fromisoformat(timestamp)
        result = replay_to_timestamp(db, session_id, target_time)
        print_json(result)
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@replay.command("list")
@click.option("--wo-id", type=int, help="按工单筛选")
@click.option("--limit", type=int, default=50, help="返回数量")
def list_replay(wo_id, limit):
    """列出回放会话"""
    db = get_db_session()
    try:
        from app.queue_service import list_replay_sessions
        sessions = list_replay_sessions(db, work_order_id=wo_id, limit=limit)
        
        result = []
        for s in sessions:
            result.append({
                "id": s.id,
                "name": s.name,
                "work_order_id": s.work_order_id,
                "event_count": len(s.replay_events) if s.replay_events else 0,
                "created_at": s.created_at.isoformat(),
                "status": s.status,
            })
        print_json({"count": len(result), "items": result})
        sys.exit(EXIT_SUCCESS)
    except Exception as e:
        handle_exception(e)
    finally:
        db.close()


@cli.command()
def status_flow():
    """显示状态流转图"""
    from app.services import STATE_TRANSITION_MAP
    flow = {
        status.value: [s.value for s in states]
        for status, states in STATE_TRANSITION_MAP.items()
    }
    print_json(flow)
    sys.exit(EXIT_SUCCESS)


@cli.command()
def init():
    """初始化数据库"""
    init_db()
    click.echo("数据库初始化完成")
    sys.exit(EXIT_SUCCESS)


if __name__ == "__main__":
    cli()
