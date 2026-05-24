#!/usr/bin/env python3
"""完整演示流程：初始化 -> 导入样例 -> 冻结 -> 触发问题 -> 人工修正 -> 生成报告"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import (
    Batch, MaterialItem, MaterialStatus, BatchStatus,
    TaskStatus, DeviceTracking
)
from app.services.batch_service import BatchService
from app.services.state_machine import MaterialStateMachine, DeviceTrackingService
from app.services.report_service import ReportService
from app.services.task_service import TaskService


def demo_complete_flow():
    print("=" * 60)
    print("线下展会物料异常回执状态机 - 完整演示流程")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        print("\n【步骤1】冻结批次 - 开始撤展结算")
        print("-" * 50)
        batch = db.query(Batch).first()
        if not batch:
            print("未找到批次，请先运行 sample_data.py")
            return
        
        batch = BatchService.freeze_batch(
            db, batch,
            reason="撤展开始，冻结物料状态准备结算",
            operated_by="项目经理"
        )
        print(f"批次已冻结: {batch.batch_no}")
        print(f"冻结时间: {batch.frozen_at}")
        print(f"冻结人: {batch.frozen_by}")
        print(f"冻结原因: {batch.frozen_reason}")
        
        print("\n【步骤2】模拟撤展时发现的问题 - 借出设备找不到责任人")
        print("-" * 50)
        
        lost_material = db.query(MaterialItem).filter(
            MaterialItem.batch_id == batch.id,
            MaterialItem.material_code == "PROJ-002"
        ).first()
        
        if lost_material:
            print(f"物料: {lost_material.material_name} ({lost_material.material_code})")
            print(f"当前状态: {lost_material.status}")
            print(f"当前持有人: {lost_material.current_holder}")
            print("问题: 撤展时该投影仪找不到，借用人王市场说已经还了但没签收记录")
            
            success, msg = MaterialStateMachine.transition(
                db=db,
                material=lost_material,
                to_status=MaterialStatus.LOST,
                changed_by="撤展组",
                reason="撤展盘点丢失，借用人声称已归还但无记录 - 需要人工介入核实",
                change_source="manual_check",
                is_overrule=True
            )
            print(f"状态更新: {msg}")
            
            tracking = db.query(DeviceTracking).filter(
                DeviceTracking.device_code == "PROJ-002"
            ).first()
            if tracking:
                DeviceTrackingService.update_tracking(
                    db=db,
                    tracking=tracking,
                    current_status="missing",
                    last_known_location="会展中心B区3号门附近",
                    last_seen_by="保安老李",
                    remark="最后被看到在B区3号门，后续去向不明"
                )
                print(f"设备追踪已更新: 最后位置 = {tracking.last_known_location}")
        
        print("\n【步骤3】创建异步任务 - 标记需要人工处理")
        print("-" * 50)
        
        task = TaskService.create_task(
            db=db,
            task_name="核实丢失设备去向",
            input_data={
                "material_code": "PROJ-002",
                "material_name": "投影仪B",
                "last_known_location": "会展中心B区3号门"
            },
            batch_id=batch.id,
            created_by="系统自动"
        )
        
        TaskService.mark_for_manual(
            db=db,
            task=task,
            error_message="设备丢失原因不明，需要人工联系借用人调取监控确认去向"
        )
        
        print(f"创建人工任务: {task.task_name}")
        print(f"任务ID: {task.task_id}")
        print(f"任务状态: {task.status}")
        print(f"需要人工处理原因: {task.error_message}")
        
        print("\n【步骤4】人工修正 - 找到设备去向")
        print("-" * 50)
        
        print("经过调取监控发现: 投影仪被王市场借给了隔壁展位的刘经理，忘记登记了")
        
        if tracking:
            DeviceTrackingService.update_tracking(
                db=db,
                tracking=tracking,
                current_status="located",
                last_known_location="隔壁友商展位C-12",
                last_seen_by="监控室",
                responsible_person="刘经理",
                final_disposition="已从隔壁展位追回，设备完好",
                disposition_by="张主管",
                remark="王市场私自外借未登记，已批评教育"
            )
            print(f"责任人更新: {tracking.responsible_person}")
            print(f"最终去向: {tracking.final_disposition}")
        
        success, msg = MaterialStateMachine.transition(
            db=db,
            material=lost_material,
            to_status=MaterialStatus.RETURNED,
            changed_by="张主管",
            reason="复核改判: 设备已从隔壁展位追回，状态更新为已归还",
            change_source="review",
            is_overrule=True
        )
        print(f"状态修正: {msg}")
        
        TaskService.retry_manual_task(
            db=db,
            task=task,
            operated_by="张主管",
            override_data={"resolved": True, "disposition": "已追回"}
        )
        
        print(f"任务已处理并重新标记完成")
        
        print("\n【步骤5】解冻批次 - 继续结算流程")
        print("-" * 50)
        
        batch = BatchService.unfreeze_batch(
            db, batch,
            reason="丢失设备已追回，继续结算",
            operated_by="项目经理"
        )
        print(f"批次已解冻")
        print(f"解冻原因: {batch.unfrozen_reason}")
        
        print("\n【步骤6】生成项目经理报告")
        print("-" * 50)
        
        report = ReportService.get_batch_report(db, batch)
        
        print(f"批次号: {report.batch_no}")
        print(f"展会名称: {report.exhibition_name}")
        print(f"是否冻结: {'是' if report.is_frozen else '否'}")
        
        print("\n📊 汇总统计:")
        print(f"  物料总数: {report.summary['total_items']}")
        print(f"  丢失数量: {report.summary['lost_count']}")
        print(f"  借出未还: {report.summary['borrowed_count']}")
        print(f"  需人工关注: {report.summary['need_manual_attention']}")
        print(f"  已落实责任人: {report.summary['with_responsible_person']}")
        print(f"  已有最终去向: {report.summary['with_final_disposition']}")
        
        print("\n📋 明细列表:")
        for item in report.items:
            if item.borrower or item.manual_reason or item.final_disposition:
                status_icon = "✅" if item.current_status == MaterialStatus.RETURNED else \
                              "❓" if item.current_status == MaterialStatus.BORROWED else \
                              "❌" if item.current_status == MaterialStatus.LOST else "📦"
                print(f"  {status_icon} {item.material_code} - {item.material_name}")
                print(f"      当前状态: {item.current_status}")
                if item.borrower:
                    print(f"      借用人: {item.borrower}")
                if item.last_location:
                    print(f"      最后位置: {item.last_location}")
                if item.responsible_person:
                    print(f"      责任人: {item.responsible_person}")
                if item.manual_reason:
                    print(f"      人工处理理由: {item.manual_reason}")
                if item.final_disposition:
                    print(f"      最终去向: {item.final_disposition}")
        
        print("\n【步骤7】归档批次 - 完成撤展")
        print("-" * 50)
        
        batch = BatchService.archive_batch(db, batch, operated_by="项目经理")
        print(f"批次已归档，最终状态: {batch.status}")
        
        print("\n" + "=" * 60)
        print("✅ 演示流程完成!")
        print("=" * 60)
        print("\n💡 项目经理可以通过API导出Excel报告获得完整数据:")
        print("   - GET /api/v1/batches/{id}/export-report  -> 物料汇总报告")
        print("   - GET /api/v1/batches/{id}/export-audit   -> 完整审计日志")
        
    except Exception as e:
        print(f"\n❌ 演示过程中出错: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    demo_complete_flow()
