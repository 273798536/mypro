import click
import sys
import json
from datetime import datetime
from typing import Optional

from .database import SessionLocal, init_db
from .services import BatchService, SourceDataService, AsyncTaskService, ExportService
from .models import BatchStatus, TaskStatus, DuplicateStrategy
from .schemas import (
    QualityBatchCreate,
    ReviewRequest,
    FreezeRequest,
    UnfreezeRequest,
    ArchiveRequest,
)


class ExitCode:
    SUCCESS = 0
    ERROR = 1
    NOT_FOUND = 2
    INVALID_STATE = 3


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """小厂质检返工异常回执状态机 CLI"""
    init_db()


@cli.group()
def batch():
    """批次管理命令"""
    pass


@batch.command("create")
@click.option("--batch-no", required=True, help="批次号")
@click.option("--product-code", help="产品编码")
@click.option("--product-name", help="产品名称")
@click.option("--remark", help="备注")
@click.option("--created-by", help="创建人")
@click.option(
    "--duplicate-strategy",
    type=click.Choice(["ignore", "overwrite", "append"]),
    default="ignore",
    help="重复批次处理策略",
)
@click.option("--inspection-ids", help="抽检表ID列表，逗号分隔")
@click.option("--rework-ids", help="返工单ID列表，逗号分隔")
@click.option("--shift-ids", help="机台班次ID列表，逗号分隔")
@click.option("--price-ids", help="手工改价表ID列表，逗号分隔")
def batch_create(
    batch_no,
    product_code,
    product_name,
    remark,
    created_by,
    duplicate_strategy,
    inspection_ids,
    rework_ids,
    shift_ids,
    price_ids,
):
    """创建质检批次"""
    db = SessionLocal()
    try:
        service = BatchService(db)

        def parse_ids(ids_str):
            if not ids_str:
                return None
            return [int(x.strip()) for x in ids_str.split(",") if x.strip()]

        batch_data = QualityBatchCreate(
            batch_no=batch_no,
            product_code=product_code,
            product_name=product_name,
            remark=remark,
            created_by=created_by,
            duplicate_strategy=DuplicateStrategy(duplicate_strategy),
            inspection_ids=parse_ids(inspection_ids),
            rework_ids=parse_ids(rework_ids),
            machine_shift_ids=parse_ids(shift_ids),
            price_adjustment_ids=parse_ids(price_ids),
        )

        batch = service.create_batch(batch_data)
        click.echo(
            json.dumps(
                {
                    "batch_id": batch.batch_id,
                    "batch_no": batch.batch_no,
                    "status": batch.status.value,
                    "created_at": batch.created_at.isoformat(),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("list")
@click.option("--status", type=click.Choice([s.value for s in BatchStatus]), help="状态筛选")
@click.option("--batch-no", help="批次号模糊搜索")
@click.option("--skip", default=0, help="跳过数量")
@click.option("--limit", default=50, help="返回数量")
def batch_list(status, batch_no, skip, limit):
    """列出批次列表"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        status_enum = BatchStatus(status) if status else None
        total, batches = service.list_batches(
            skip=skip, limit=limit, status=status_enum, batch_no=batch_no
        )

        result = {
            "total": total,
            "items": [
                {
                    "batch_id": b.batch_id,
                    "batch_no": b.batch_no,
                    "status": b.status.value,
                    "current_stage": b.current_stage,
                    "rework_count": b.rework_count,
                    "final_pass_rate": b.final_pass_rate,
                    "created_at": b.created_at.isoformat(),
                }
                for b in batches
            ],
        }
        click.echo(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("show")
@click.argument("batch_id")
def batch_show(batch_id):
    """显示批次详情"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        batch = service.get_batch(batch_id)
        if not batch:
            click.echo(f"批次 {batch_id} 不存在", err=True)
            sys.exit(ExitCode.NOT_FOUND)

        result = {
            "batch_id": batch.batch_id,
            "batch_no": batch.batch_no,
            "product_code": batch.product_code,
            "product_name": batch.product_name,
            "status": batch.status.value,
            "current_stage": batch.current_stage,
            "rework_count": batch.rework_count,
            "total_defect_count": batch.total_defect_count,
            "initial_pass_rate": batch.initial_pass_rate,
            "final_pass_rate": batch.final_pass_rate,
            "best_pass_rate": batch.best_pass_rate,
            "worst_pass_rate": batch.worst_pass_rate,
            "responsible_shift": batch.responsible_shift,
            "responsible_machine": batch.responsible_machine,
            "review_opinion": batch.review_opinion,
            "reviewer": batch.reviewer,
            "freeze_reason": batch.freeze_reason,
            "frozen_by": batch.frozen_by,
            "status_before_freeze": batch.status_before_freeze,
            "archive_reason": batch.archive_reason,
            "sources_count": len(batch.sources),
            "attachments_count": len(batch.attachments),
            "created_at": batch.created_at.isoformat(),
        }
        click.echo(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("submit-review")
@click.argument("batch_id")
@click.option("--operator", help="操作人")
def batch_submit_review(batch_id, operator):
    """提交复核"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        batch = service.submit_for_review(batch_id, operator)
        if not batch:
            click.echo("提交失败，批次状态不正确", err=True)
            sys.exit(ExitCode.INVALID_STATE)

        click.echo(f"批次 {batch_id} 已提交复核，当前状态: {batch.status.value}")
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("review")
@click.argument("batch_id")
@click.option("--opinion", required=True, help="复核意见")
@click.option("--reviewer", required=True, help="复核人")
@click.option("--approve/--reject", default=True, help="是否通过")
@click.option("--remark", help="备注")
def batch_review(batch_id, opinion, reviewer, approve, remark):
    """复核改判"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        review_data = ReviewRequest(
            review_opinion=opinion, reviewer=reviewer, is_approved=approve, remark=remark
        )
        batch = service.review_batch(batch_id, review_data)
        if not batch:
            click.echo("复核失败，批次状态不正确", err=True)
            sys.exit(ExitCode.INVALID_STATE)

        result = "通过" if approve else "驳回"
        click.echo(f"批次 {batch_id} 复核{result}，当前状态: {batch.status.value}")
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("freeze")
@click.argument("batch_id")
@click.option("--reason", required=True, help="冻结原因")
@click.option("--operator", required=True, help="操作人")
def batch_freeze(batch_id, reason, operator):
    """冻结结算"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        freeze_data = FreezeRequest(freeze_reason=reason, frozen_by=operator)
        batch = service.freeze_batch(batch_id, freeze_data)
        if not batch:
            click.echo("冻结失败，批次状态不正确", err=True)
            sys.exit(ExitCode.INVALID_STATE)

        click.echo(f"批次 {batch_id} 已冻结，冻结前状态: {batch.status_before_freeze}")
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("unfreeze")
@click.argument("batch_id")
@click.option("--reason", required=True, help="解冻原因")
@click.option("--operator", required=True, help="操作人")
def batch_unfreeze(batch_id, reason, operator):
    """解除冻结"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        unfreeze_data = UnfreezeRequest(unfreeze_reason=reason, operator=operator)
        batch = service.unfreeze_batch(batch_id, unfreeze_data)
        if not batch:
            click.echo("解冻失败，批次状态不正确", err=True)
            sys.exit(ExitCode.INVALID_STATE)

        click.echo(f"批次 {batch_id} 已解冻，当前状态: {batch.status.value}")
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("archive")
@click.argument("batch_id")
@click.option("--reason", required=True, help="归档原因")
@click.option("--operator", required=True, help="操作人")
def batch_archive(batch_id, reason, operator):
    """撤回归档"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        archive_data = ArchiveRequest(archive_reason=reason, archived_by=operator)
        batch = service.archive_batch(batch_id, archive_data)
        if not batch:
            click.echo("归档失败，批次状态不正确（需已复核或已驳回）", err=True)
            sys.exit(ExitCode.INVALID_STATE)

        click.echo(f"批次 {batch_id} 已归档")
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@batch.command("history")
@click.argument("batch_id")
@click.option("--limit", default=20, help="返回数量")
def batch_history(batch_id, limit):
    """查看操作历史"""
    db = SessionLocal()
    try:
        service = BatchService(db)
        histories = service.get_history_with_diff(batch_id, limit=limit)

        result = [
            {
                "history_id": h.history_id,
                "action": h.action,
                "operator": h.operator,
                "created_at": h.created_at.isoformat(),
                "changes": [
                    {
                        "field": d.field,
                        "old_value": d.old_value,
                        "new_value": d.new_value,
                        "change_type": d.change_type,
                    }
                    for d in h.differences
                ],
            }
            for h in histories
        ]
        click.echo(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@cli.group()
def source():
    """源数据管理命令"""
    pass


@source.command("add-inspection")
@click.option("--batch-no", required=True, help="批次号")
@click.option("--product-code", help="产品编码")
@click.option("--total-qty", type=int, default=0, help="总数量")
@click.option("--defective-qty", type=int, default=0, help="缺陷数量")
@click.option("--pass-rate", type=float, default=0.0, help="良率")
@click.option("--defect-type", help="缺陷类型")
@click.option("--machine-id", help="机台号")
@click.option("--shift-id", help="班次")
@click.option("--inspector", help="检验员")
@click.option("--created-by", help="创建人")
def add_inspection(
    batch_no,
    product_code,
    total_qty,
    defective_qty,
    pass_rate,
    defect_type,
    machine_id,
    shift_id,
    inspector,
    created_by,
):
    """添加抽检表"""
    db = SessionLocal()
    try:
        service = SourceDataService(db)
        data = {
            "batch_no": batch_no,
            "product_code": product_code,
            "total_quantity": total_qty,
            "defective_quantity": defective_qty,
            "pass_rate": pass_rate,
            "defect_type": defect_type,
            "machine_id": machine_id,
            "shift_id": shift_id,
            "inspector": inspector,
            "created_by": created_by,
            "inspection_date": datetime.now(),
        }
        insp = service.create_inspection(data)
        click.echo(
            json.dumps(
                {"id": insp.id, "batch_no": insp.batch_no, "pass_rate": insp.pass_rate},
                ensure_ascii=False,
            )
        )
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@source.command("add-rework")
@click.option("--rework-no", required=True, help="返工单号")
@click.option("--batch-no", help="批次号")
@click.option("--rework-qty", type=int, default=0, help="返工数量")
@click.option("--passed-qty", type=int, default=0, help="返工通过数量")
@click.option("--pass-rate", type=float, default=0.0, help="返工良率")
@click.option("--machine-id", help="机台号")
@click.option("--shift-id", help="班次")
@click.option("--is-secondary", is_flag=True, help="是否二次返工")
@click.option("--created-by", help="创建人")
def add_rework(
    rework_no,
    batch_no,
    rework_qty,
    passed_qty,
    pass_rate,
    machine_id,
    shift_id,
    is_secondary,
    created_by,
):
    """添加返工单"""
    db = SessionLocal()
    try:
        service = SourceDataService(db)
        data = {
            "rework_no": rework_no,
            "batch_no": batch_no,
            "rework_quantity": rework_qty,
            "passed_quantity": passed_qty,
            "rework_pass_rate": pass_rate,
            "machine_id": machine_id,
            "shift_id": shift_id,
            "is_secondary_rework": is_secondary,
            "created_by": created_by,
            "rework_date": datetime.now(),
        }
        rw = service.create_rework(data)
        click.echo(
            json.dumps(
                {"id": rw.id, "rework_no": rw.rework_no, "pass_rate": rw.rework_pass_rate},
                ensure_ascii=False,
            )
        )
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@source.command("add-shift")
@click.option("--shift-code", required=True, help="班次代码")
@click.option("--machine-id", required=True, help="机台号")
@click.option("--production-qty", type=int, default=0, help="生产数量")
@click.option("--defective-qty", type=int, default=0, help="缺陷数量")
@click.option("--pass-rate", type=float, default=0.0, help="良率")
@click.option("--shift-leader", help="班组长")
@click.option("--created-by", help="创建人")
def add_shift(
    shift_code,
    machine_id,
    production_qty,
    defective_qty,
    pass_rate,
    shift_leader,
    created_by,
):
    """添加机台班次记录"""
    db = SessionLocal()
    try:
        service = SourceDataService(db)
        data = {
            "shift_code": shift_code,
            "machine_id": machine_id,
            "production_quantity": production_qty,
            "defective_quantity": defective_qty,
            "shift_pass_rate": pass_rate,
            "shift_leader": shift_leader,
            "created_by": created_by,
            "shift_date": datetime.now(),
        }
        shift = service.create_machine_shift(data)
        click.echo(
            json.dumps(
                {"id": shift.id, "shift_code": shift.shift_code, "pass_rate": shift.shift_pass_rate},
                ensure_ascii=False,
            )
        )
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@cli.command("export")
@click.option("--batch-ids", help="批次ID列表，逗号分隔")
@click.option("--status", multiple=True, type=click.Choice([s.value for s in BatchStatus]), help="状态筛选")
@click.option("--output", help="输出目录")
def cmd_export(batch_ids, status, output):
    """导出汇总数据"""
    db = SessionLocal()
    try:
        service = ExportService(db)

        def parse_batch_ids(ids_str):
            if not ids_str:
                return None
            return [x.strip() for x in ids_str.split(",") if x.strip()]

        batch_id_list = parse_batch_ids(batch_ids)
        status_list = [BatchStatus(s) for s in status] if status else None

        result = service.export_batches(
            batch_ids=batch_id_list,
            status=status_list,
        )

        click.echo(
            json.dumps(
                {
                    "file_path": result["file_path"],
                    "file_name": result["file_name"],
                    "file_size": result["file_size"],
                    "record_count": result["record_count"],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@cli.group()
def task():
    """异步任务管理命令"""
    pass


@task.command("list")
@click.option("--status", type=click.Choice([s.value for s in TaskStatus]), help="状态筛选")
@click.option("--batch-id", help="批次ID筛选")
@click.option("--limit", default=50, help="返回数量")
def task_list(status, batch_id, limit):
    """列出任务列表"""
    db = SessionLocal()
    try:
        service = AsyncTaskService(db)
        status_enum = TaskStatus(status) if status else None
        tasks = service.list_tasks(status=status_enum, batch_id=batch_id, limit=limit)

        result = [
            {
                "task_id": t.task_id,
                "task_type": t.task_type,
                "status": t.status.value,
                "batch_id": t.batch_id,
                "retry_count": t.retry_count,
                "error_message": t.error_message,
                "created_at": t.created_at.isoformat(),
            }
            for t in tasks
        ]
        click.echo(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@task.command("show")
@click.argument("task_id")
def task_show(task_id):
    """显示任务详情"""
    db = SessionLocal()
    try:
        service = AsyncTaskService(db)
        task = service.get_task(task_id)
        if not task:
            click.echo(f"任务 {task_id} 不存在", err=True)
            sys.exit(ExitCode.NOT_FOUND)

        result = {
            "task_id": task.task_id,
            "task_type": task.task_type,
            "status": task.status.value,
            "batch_id": task.batch_id,
            "parameters": task.parameters,
            "result": task.result,
            "error_message": task.error_message,
            "retry_count": task.retry_count,
            "max_retries": task.max_retries,
            "next_retry_at": task.next_retry_at.isoformat() if task.next_retry_at else None,
            "created_at": task.created_at.isoformat(),
        }
        click.echo(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(ExitCode.SUCCESS)
    except Exception as e:
        click.echo(f"错误: {str(e)}", err=True)
        sys.exit(ExitCode.ERROR)
    finally:
        db.close()


@cli.command("api")
@click.option("--host", default="0.0.0.0", help="监听地址")
@click.option("--port", default=8000, type=int, help="监听端口")
@click.option("--reload", is_flag=True, help="自动重载")
def run_api(host, port, reload):
    """启动 API 服务"""
    import uvicorn

    uvicorn.run("qfsm.api:app", host=host, port=port, reload=reload)
    sys.exit(ExitCode.SUCCESS)


if __name__ == "__main__":
    cli()
