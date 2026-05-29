import os
import sys
from datetime import datetime
from typing import Dict, Any, List, Tuple
from pathlib import Path

from .models import (
    Farmer, PurchaseOrder, PremiumRecord, VerificationRecord,
    PremiumSplit, ReviewItem, ProcessResult, OrderStatus,
    compute_data_hash
)
from .data_loader import (
    load_all_data, build_premiums_by_order
)
from .area_verification import (
    verify_all_orders, get_verified_area_map
)
from .premium_split import (
    process_all_premium_splits
)
from .review_list import (
    generate_review_list
)
from .idempotent import (
    compute_input_data_hash, check_duplicate_batch, register_batch,
    generate_batch_id, save_json_output, save_csv_output,
    list_processed_batches
)


def build_process_result(
    farmers: List[Farmer],
    orders: List[PurchaseOrder],
    premiums: List[PremiumRecord],
    verifications: List[VerificationRecord],
    splits: List[PremiumSplit],
    review_items: List[ReviewItem],
    data_hash: str,
    batch_id: str,
) -> ProcessResult:
    cancelled_count = sum(1 for o in orders if o.status == OrderStatus.CANCELLED)
    amended_count = sum(1 for o in orders if o.status == OrderStatus.AMENDED)

    total_farmer_payable = sum(s.farmer_payable for s in splits)
    total_subsidy = sum(s.subsidy_amount for s in splits)
    total_premium = sum(s.total_premium for s in splits)

    return ProcessResult(
        batch_id=batch_id,
        process_time=datetime.now(),
        farmer_count=len(farmers),
        order_count=len(orders),
        premium_count=len(premiums),
        verification_count=len(verifications),
        split_count=len(splits),
        review_count=len(review_items),
        cancelled_order_count=cancelled_count,
        amended_order_count=amended_count,
        total_farmer_payable=round(total_farmer_payable, 2),
        total_subsidy=round(total_subsidy, 2),
        total_premium=round(total_premium, 2),
        data_hash=data_hash,
    )


def convert_splits_to_csv(splits: List[PremiumSplit], farmer_index: Dict[str, Farmer]) -> List[Dict[str, Any]]:
    rows = []
    for s in splits:
        farmer = farmer_index.get(s.farmer_id)
        row = {
            "分摊ID": s.split_id,
            "订单ID": s.order_id,
            "农户ID": s.farmer_id,
            "农户姓名": farmer.name if farmer else "未知",
            "作物类型": s.crop_type,
            "核算面积(亩)": f"{s.area_mu:.2f}",
            "单位保费(元/亩)": f"{s.unit_premium:.2f}",
            "总保费(元)": f"{s.total_premium:.2f}",
            "补贴比例": f"{s.subsidy_rate*100:.0f}%",
            "补贴金额(元)": f"{s.subsidy_amount:.2f}",
            "农户自缴(元)": f"{s.farmer_payable:.2f}",
            "计算公式": s.calculation_details.get("total_premium_formula", ""),
            "来源文件": ", ".join(set(src.file_name for src in s.sources)) if s.sources else "",
        }
        rows.append(row)
    return rows


def convert_verifications_to_csv(
    verifications: List[VerificationRecord],
    farmer_index: Dict[str, Farmer],
    order_index: Dict[str, PurchaseOrder],
) -> List[Dict[str, Any]]:
    rows = []
    for v in verifications:
        farmer = farmer_index.get(v.farmer_id)
        order = order_index.get(v.order_id)
        row = {
            "核验ID": v.verify_id,
            "订单ID": v.order_id,
            "农户ID": v.farmer_id,
            "农户姓名": farmer.name if farmer else "未知",
            "作物类型": order.crop_type if order else "未知",
            "申报面积(亩)": f"{v.reported_area:.2f}",
            "核验面积(亩)": f"{v.verified_area:.2f}",
            "面积差异(亩)": f"{v.area_diff:+.2f}",
            "差异比例": f"{v.area_diff_pct:+.1f}%",
            "核验结果": v.result.value,
            "核验日期": str(v.verify_date) if v.verify_date else "",
            "备注": v.notes or "",
            "来源文件": ", ".join(set(src.file_name for src in v.sources)) if v.sources else "",
        }
        rows.append(row)
    return rows


def convert_review_to_csv(items: List[ReviewItem]) -> List[Dict[str, Any]]:
    rows = []
    for item in items:
        row = {
            "复核项ID": item.item_id,
            "类别": item.category,
            "订单ID": item.order_id,
            "农户ID": item.farmer_id,
            "农户姓名": item.farmer_name,
            "问题描述": item.issue_description,
            "严重程度": item.severity,
            "处理建议": item.suggestion or "",
            "关联记录": ", ".join(item.related_records),
            "来源文件": ", ".join(set(src.file_name for src in item.sources)) if item.sources else "",
            "来源行号": ", ".join(str(src.row_number) for src in item.sources if src.row_number) if item.sources else "",
        }
        rows.append(row)
    return rows


def process_premium_data(
    input_dir: str,
    output_dir: str,
    force: bool = False,
) -> Tuple[bool, str, ProcessResult]:
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    if not input_path.exists():
        return False, f"输入目录不存在: {input_dir}", None

    output_path.mkdir(parents=True, exist_ok=True)

    farmers, orders, premiums = load_all_data(input_dir)

    if not farmers and not orders and not premiums:
        return False, "未找到任何数据文件，请检查输入目录", None

    data_hash = compute_input_data_hash(farmers, orders, premiums)

    is_duplicate, existing_batch = check_duplicate_batch(output_dir, data_hash)
    if is_duplicate and not force:
        return (
            False,
            f"相同数据已处理过，批次ID: {existing_batch['batch_id']} "
            f"(处理时间: {existing_batch['process_time']})。\n"
            f"使用 --force 参数可强制重新计算，但会生成新的输出文件。\n"
            f"已有输出文件: {list(existing_batch['output_files'].values())}",
            None
        )

    batch_id = generate_batch_id()

    premiums_by_order = build_premiums_by_order(premiums)
    farmer_index = {f.farmer_id: f for f in farmers}
    order_index = {o.order_id: o for o in orders}

    verifications = verify_all_orders(orders, premiums_by_order)
    verified_area_map = get_verified_area_map(verifications)
    splits = process_all_premium_splits(orders, verified_area_map, premiums_by_order)
    review_items = generate_review_list(farmers, orders, premiums, verifications, splits)

    result = build_process_result(
        farmers, orders, premiums, verifications, splits, review_items, data_hash, batch_id
    )

    splits_csv = convert_splits_to_csv(splits, farmer_index)
    verifications_csv = convert_verifications_to_csv(verifications, farmer_index, order_index)
    review_csv = convert_review_to_csv(review_items)

    output_files = {}
    output_files["verifications_json"] = save_json_output(
        output_dir, "area_verifications.json", verifications, batch_id
    )
    output_files["splits_json"] = save_json_output(
        output_dir, "premium_splits.json", splits, batch_id
    )
    output_files["review_json"] = save_json_output(
        output_dir, "review_list.json", review_items, batch_id
    )
    output_files["result_json"] = save_json_output(
        output_dir, "process_result.json", result, batch_id
    )

    output_files["splits_csv"] = save_csv_output(
        output_dir, "保费分摊明细表.csv", splits_csv, batch_id
    )
    output_files["verifications_csv"] = save_csv_output(
        output_dir, "面积核验记录表.csv", verifications_csv, batch_id
    )
    output_files["review_csv"] = save_csv_output(
        output_dir, "复核问题清单.csv", review_csv, batch_id
    )

    result.output_files = output_files

    registered, msg = register_batch(output_dir, result, force)
    if not registered:
        return False, msg, None

    return True, "处理完成", result


def show_batch_list(output_dir: str) -> None:
    batches = list_processed_batches(output_dir)
    if not batches:
        print("暂无处理记录")
        return

    print(f"\n=== 已处理批次列表 ({len(batches)} 批) ===")
    for i, batch in enumerate(batches, 1):
        s = batch["summary"]
        print(f"\n[{i}] 批次ID: {batch['batch_id']}")
        print(f"    处理时间: {batch['process_time']}")
        print(f"    数据摘要: {s['farmer_count']}农户 / {s['order_count']}订单 "
              f"({s['cancelled_order_count']}撤销 / {s['amended_order_count']}变更) / "
              f"{s['premium_count']}保费")
        print(f"    核算结果: 总保费{s['total_premium']:.2f}元 / "
              f"补贴{s['total_subsidy']:.2f}元 / 自缴{s['total_farmer_payable']:.2f}元")
        print(f"    复核问题: {s['review_count']}项")
        print(f"    数据哈希: {batch['data_hash']}")
        if batch.get("output_files"):
            print(f"    输出文件:")
            for name, path in batch["output_files"].items():
                print(f"      - {name}: {path}")
