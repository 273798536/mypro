import json
import csv
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from models import RepairShopData, WorkOrder, WorkOrderStatus
from checker import CheckReport


def save_to_json(shop_data: RepairShopData, file_path: str) -> None:
    data = {
        "work_orders": [],
        "instrument_types": [],
        "part_inventories": [],
        "technicians": [],
        "notifications": [],
    }

    for wo in shop_data.work_orders:
        wo_dict = {
            "id": wo.id,
            "customer_name": wo.customer_name,
            "instrument_type": wo.instrument_type,
            "instrument_model": wo.instrument_model,
            "issue_description": wo.issue_description,
            "status": wo.status.value,
            "assigned_technician": wo.assigned_technician,
            "scheduled_date": wo.scheduled_date.isoformat() if wo.scheduled_date else None,
            "parts_required": [
                {
                    "part_name": pr.part_name,
                    "quantity": pr.quantity,
                    "locked": pr.locked,
                    "locked_at": pr.locked_at.isoformat() if pr.locked_at else None,
                    "work_order_id": pr.work_order_id,
                }
                for pr in wo.parts_required
            ],
            "created_at": wo.created_at.isoformat(),
            "updated_at": wo.updated_at.isoformat(),
            "notes": wo.notes,
        }
        data["work_orders"].append(wo_dict)

    for it in shop_data.instrument_types:
        it_dict = {
            "id": it.id,
            "name": it.name,
            "category": it.category,
            "common_parts": it.common_parts,
            "difficulty_level": it.difficulty_level,
        }
        data["instrument_types"].append(it_dict)

    for pi in shop_data.part_inventories:
        pi_dict = {
            "id": pi.id,
            "name": pi.name,
            "stock_quantity": pi.stock_quantity,
            "min_stock": pi.min_stock,
            "unit": pi.unit,
            "supplier": pi.supplier,
        }
        data["part_inventories"].append(pi_dict)

    for t in shop_data.technicians:
        t_dict = {
            "id": t.id,
            "name": t.name,
            "skills": t.skills,
            "leave_dates": [d.isoformat() for d in t.leave_dates],
        }
        data["technicians"].append(t_dict)

    for n in shop_data.notifications:
        n_dict = {
            "id": n.id,
            "work_order_id": n.work_order_id,
            "message": n.message,
            "type": n.type,
            "created_at": n.created_at.isoformat(),
            "resolved": n.resolved,
            "resolved_at": n.resolved_at.isoformat() if n.resolved_at else None,
            "resolution_note": n.resolution_note,
        }
        data["notifications"].append(n_dict)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def export_work_orders_csv(shop_data: RepairShopData, file_path: str) -> int:
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "工单号", "客户姓名", "乐器类型", "乐器型号", "问题描述",
            "状态", "分配师傅", "排程日期", "所需配件", "创建时间", "更新时间", "备注"
        ])

        for wo in shop_data.work_orders:
            parts_str = "; ".join([
                f"{pr.part_name}:{pr.quantity}{'[已锁定]' if pr.locked else ''}"
                for pr in wo.parts_required
            ])
            writer.writerow([
                wo.id,
                wo.customer_name,
                wo.instrument_type,
                wo.instrument_model,
                wo.issue_description,
                wo.status.value,
                wo.assigned_technician or "",
                wo.scheduled_date.isoformat() if wo.scheduled_date else "",
                parts_str,
                wo.created_at.isoformat(),
                wo.updated_at.isoformat(),
                " | ".join(wo.notes),
            ])

    return len(shop_data.work_orders)


def export_inventory_csv(shop_data: RepairShopData, file_path: str) -> int:
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["配件名称", "库存数量", "安全库存", "单位", "供应商", "库存状态"])

        for pi in shop_data.part_inventories:
            status = "充足" if pi.stock_quantity > pi.min_stock else (
                "预警" if pi.stock_quantity == pi.min_stock else "不足"
            )
            writer.writerow([
                pi.name,
                pi.stock_quantity,
                pi.min_stock,
                pi.unit,
                pi.supplier,
                status,
            ])

    return len(shop_data.part_inventories)


def export_technicians_csv(shop_data: RepairShopData, file_path: str) -> int:
    with open(file_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["姓名", "技能", "请假日期"])

        for t in shop_data.technicians:
            writer.writerow([
                t.name,
                " | ".join(t.skills),
                ", ".join([d.isoformat() for d in t.leave_dates]),
            ])

    return len(shop_data.technicians)


def export_check_report(report: CheckReport, file_path: str) -> None:
    stats = report.get_statistics()

    with open(file_path, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("📋 乐器维修工单检查报告\n")
        f.write(f"检查时间: {report.check_date.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 80 + "\n\n")

        f.write("📊 统计概览\n")
        f.write("-" * 40 + "\n")
        f.write(f"总工单数: {stats['total']}\n")
        f.write(f"已检查: {stats['checked']}\n")
        f.write(f"就绪: {stats['ready']}\n")
        f.write(f"受阻: {stats['blocked']}\n")
        f.write(f"配件缺货: {stats['part_shortages']} 项\n")
        f.write(f"人员冲突: {stats['technician_conflicts']} 项\n\n")

        blocked = [r for r in report.results if r.has_issues]
        ready = [r for r in report.results if not r.has_issues]

        if blocked:
            f.write("🔴 受阻工单详情\n")
            f.write("-" * 60 + "\n")
            for r in blocked:
                f.write(f"\n工单 {r.work_order_id} - {r.customer_name}\n")
                f.write(f"乐器类型: {r.instrument_type}\n")
                for reason in r.get_blocking_reasons():
                    f.write(f"  ❌ {reason}\n")
            f.write("\n")

        if ready:
            f.write("🟢 就绪工单\n")
            f.write("-" * 60 + "\n")
            for r in ready:
                f.write(f"✅ 工单 {r.work_order_id} - {r.customer_name} ({r.instrument_type})\n")
            f.write("\n")

        if report.all_part_shortages:
            f.write("📦 配件缺货汇总\n")
            f.write("-" * 60 + "\n")
            for ps in report.all_part_shortages:
                f.write(f"  {ps.part_name}: 需求 {ps.required}{ps.unit}, "
                        f"库存 {ps.available}{ps.unit}, 缺口 {ps.shortage}{ps.unit}\n")
                if ps.supplier:
                    f.write(f"    供应商: {ps.supplier}\n")
            f.write("\n")

        if report.all_technician_conflicts:
            f.write("👨‍🔧 人员冲突汇总\n")
            f.write("-" * 60 + "\n")
            for tc in report.all_technician_conflicts:
                f.write(f"  {tc.technician_name} 在 {tc.scheduled_date} {tc.reason}\n")

        f.write("\n" + "=" * 80 + "\n")
        f.write("报告生成完毕\n")
        f.write("=" * 80 + "\n")


def export_blocked_orders_purchase_list(report: CheckReport, file_path: str) -> int:
    shortages: Dict[str, Dict[str, Any]] = {}

    for r in report.results:
        if r.has_issues:
            for ps in r.part_shortages:
                if ps.part_name not in shortages:
                    shortages[ps.part_name] = {
                        "part_name": ps.part_name,
                        "total_shortage": 0,
                        "unit": ps.unit,
                        "supplier": ps.supplier,
                        "work_orders": [],
                    }
                shortages[ps.part_name]["total_shortage"] += ps.shortage
                shortages[ps.part_name]["work_orders"].append(
                    f"{r.work_order_id}({r.customer_name})需要{ps.required}，缺口{ps.shortage}"
                )

    if not shortages:
        return 0

    with open(file_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["配件名称", "总缺口数量", "单位", "供应商", "相关工单"])

        for data in shortages.values():
            writer.writerow([
                data["part_name"],
                data["total_shortage"],
                data["unit"],
                data["supplier"],
                "; ".join(data["work_orders"]),
            ])

    return len(shortages)


def export_all_csv(shop_data: RepairShopData, output_dir: str) -> Dict[str, int]:
    os.makedirs(output_dir, exist_ok=True)

    results = {}

    wo_path = os.path.join(output_dir, f"work_orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    results["work_orders"] = export_work_orders_csv(shop_data, wo_path)

    inv_path = os.path.join(output_dir, f"inventory_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    results["inventory"] = export_inventory_csv(shop_data, inv_path)

    tech_path = os.path.join(output_dir, f"technicians_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    results["technicians"] = export_technicians_csv(shop_data, tech_path)

    json_path = os.path.join(output_dir, f"alldata_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    save_to_json(shop_data, json_path)
    results["json_full"] = 1

    return results
