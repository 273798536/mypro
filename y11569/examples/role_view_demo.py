#!/usr/bin/env python3
"""
角色视图和敏感字段处理演示
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import Role, WorkOrderStatus
from app.schemas import WorkOrderCreate, ExportRequest, StatusChangeRequest
from app.services import (
    create_user, get_user_by_username, create_work_order,
    change_work_order_status, export_work_orders,
    get_role_view_config, apply_role_view, mask_sensitive_data
)


def main():
    init_db()
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("角色视图和敏感字段处理演示")
        print("=" * 60)
        
        if not get_user_by_username(db, "admin_demo"):
            admin = create_user(db, "admin_demo", "系统管理员", Role.ADMIN, "pass123")
        else:
            admin = get_user_by_username(db, "admin_demo")
        
        if not get_user_by_username(db, "op_demo"):
            op = create_user(db, "op_demo", "普通操作员", Role.OPERATOR, "pass123")
        else:
            op = get_user_by_username(db, "op_demo")
        
        if not get_user_by_username(db, "sp_demo"):
            sp = create_user(db, "sp_demo", "部门主管", Role.SUPERVISOR, "pass123")
        else:
            sp = get_user_by_username(db, "sp_demo")
        
        if not get_user_by_username(db, "ad_demo"):
            ad = create_user(db, "ad_demo", "审计人员", Role.AUDITOR, "pass123")
        else:
            ad = get_user_by_username(db, "ad_demo")
        
        wo_data = WorkOrderCreate(
            work_order_no="WO-ROLE-DEMO-001",
            title="市政府广场路灯抢修",
            description="广场南侧路灯因线路故障熄灭",
            location="市政府广场南侧",
            creator_id=op.id,
            spare_part_batch="SP202405008",
            hotline_number="13912345678",
            inspection_photo_ref="PIC_20240520_001.jpg",
        )
        wo = create_work_order(db, wo_data)
        
        print("\n1. 各角色可见字段配置:")
        print("-" * 60)
        for role in [Role.OPERATOR, Role.SUPERVISOR, Role.AUDITOR, Role.ADMIN]:
            config = get_role_view_config(role)
            visible = config["visible_fields"]
            masked = config["masked_fields"]
            print(f"\n  【{role.value}】")
            print(f"    可见字段: {len(visible)} 个")
            if masked:
                print(f"    脱敏字段: {', '.join(masked)}")
            else:
                print(f"    脱敏字段: 无")
        
        print("\n2. 同一工单在不同角色视图下的呈现:")
        print("-" * 60)
        
        wo_dict = {
            "work_order_no": wo.work_order_no,
            "title": wo.title,
            "location": wo.location,
            "hotline_number": wo.hotline_number,
            "spare_part_batch": wo.spare_part_batch,
            "status": wo.status.value,
        }
        
        print(f"\n  原始数据:")
        for k, v in wo_dict.items():
            print(f"    {k}: {v}")
        
        for role in [Role.OPERATOR, Role.AUDITOR, Role.ADMIN]:
            print(f"\n  【{role.value} 视图】:")
            viewed = apply_role_view(wo_dict.copy(), role)
            for k, v in viewed.items():
                print(f"    {k}: {v}")
        
        print("\n3. 敏感字段脱敏演示:")
        print("-" * 60)
        
        test_cases = [
            {"hotline_number": "13912345678"},
            {"hotline_number": "110"},
            {"hotline_number": "010-12345678"},
            {"creator_real_name": "张小明"},
        ]
        
        for case in test_cases:
            masked = mask_sensitive_data(case, ["hotline_number", "creator_real_name"])
            original = list(case.values())[0]
            result = list(masked.values())[0]
            print(f"    {original} → {result}")
        
        print("\n4. 导出时的敏感字段处理:")
        print("-" * 60)
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.SUBMITTED,
            reason='提交',
            operator_id=op.id
        ))
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.RECONFIRMED,
            reason='二次确认',
            operator_id=op.id
        ))
        
        wo, _ = change_work_order_status(db, wo.id, StatusChangeRequest(
            new_status=WorkOrderStatus.AUDIT_ONLY,
            reason='进入审计',
            operator_id=ad.id
        ))
        
        print("\n  【脱敏导出】:")
        export_data_masked, _ = export_work_orders(db, ExportRequest(
            work_order_ids=[wo.id],
            export_type="json",
            mask_sensitive=True,
            exported_by=ad.id,
        ))
        print(f"    hotline_number: {export_data_masked[0]['hotline_number']}")
        
        print("\n  【明文导出】(仅管理员可操作):")
        from app.services import get_user_by_id
        admin_user = get_user_by_id(db, admin.id)
        print(f"    管理员权限检查: 导出权限 = {'是' if admin_user.role == Role.ADMIN else '否'}")
        
        print("\n" + "=" * 60)
        print("角色视图和敏感字段处理演示完成！")
        print("=" * 60)
        
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
