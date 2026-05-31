#!/usr/bin/env python3
import json
import subprocess
import time
from typing import Dict, List, Any
from base_client import BaseClient
from config import BASE_TOKEN, TABLES, FIELD_NAMES


def run_cli(cmd_parts: List[str]) -> Dict[str, Any]:
    cmd = ["lark-cli", "base"] + cmd_parts
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {' '.join(cmd)}")
        print(f"stderr: {result.stderr}")
        raise Exception(f"CLI command failed: {result.stderr}")
    try:
        import re
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[.*?[a-zA-Z]|\].*?\x07)')
        cleaned = ansi_escape.sub('', result.stdout)
        lines = cleaned.strip().split('\n')
        json_lines = []
        for l in lines:
            l = l.strip()
            if (l.startswith('{') and l.endswith('}')) or (l.startswith('[') and l.endswith(']')):
                json_lines.append(l)
        if json_lines:
            return json.loads(json_lines[-1])
        return {}
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON. Raw output: {result.stdout}")
        raise e


def create_view(base_token: str, table_id: str, view_config: Dict) -> str:
    json_str = json.dumps(view_config, ensure_ascii=False)
    cmd = [
        "+view-create",
        "--base-token", base_token,
        "--table-id", table_id,
        "--json", json_str
    ]
    result = run_cli(cmd)
    views = result.get("data", {}).get("views", [])
    if views:
        return views[0].get("view_id", "")
    return ""


def set_view_filter(base_token: str, table_id: str, view_id: str, filter_config: Dict):
    json_str = json.dumps(filter_config, ensure_ascii=False)
    cmd = [
        "+view-set-filter",
        "--base-token", base_token,
        "--table-id", table_id,
        "--view-id", view_id,
        "--json", json_str
    ]
    run_cli(cmd)


def set_view_group(base_token: str, table_id: str, view_id: str, group_config: List[Dict]):
    json_str = json.dumps(group_config, ensure_ascii=False)
    cmd = [
        "+view-set-group",
        "--base-token", base_token,
        "--table-id", table_id,
        "--view-id", view_id,
        "--json", json_str
    ]
    run_cli(cmd)


def setup_profit_share_views(base_token: str, table_id: str, fields: Dict):
    print("\n" + "="*60)
    print("📊 配置分润明细表视图")
    print("="*60)

    views = [
        {"name": "📋 全部分润明细", "type": "grid"},
        {"name": "⏳ 待审核分润", "type": "grid"},
        {"name": "👨‍🎨 按艺术家分组", "type": "grid"},
        {"name": "📈 分润状态看板", "type": "kanban"},
    ]

    view_ids = {}
    for view_config in views:
        view_id = create_view(base_token, table_id, view_config)
        view_ids[view_config["name"]] = view_id
        print(f"  ✓ 创建视图: {view_config['name']} -> {view_id}")
        time.sleep(0.3)

    if view_ids["⏳ 待审核分润"]:
        set_view_filter(base_token, table_id, view_ids["⏳ 待审核分润"], {
            "logic": "or",
            "conditions": [
                [fields["ratio_abnormal"], "==", True],
                [fields["status"], "intersects", ["待审核"]],
                [fields["has_return"], "==", True],
            ]
        })
        print("  ✓ 配置筛选: 待审核分润（比例异常/状态待审核/有退货关联）")
        time.sleep(0.3)

    if view_ids["👨‍🎨 按艺术家分组"]:
        set_view_group(base_token, table_id, view_ids["👨‍🎨 按艺术家分组"], [
            {"field": fields["artist"], "desc": False}
        ])
        print("  ✓ 配置分组: 按艺术家分组")
        time.sleep(0.3)

    return view_ids


def setup_exception_views(base_token: str, table_id: str, fields: Dict):
    print("\n" + "="*60)
    print("🚨 配置异常预警表视图")
    print("="*60)

    views = [
        {"name": "📋 全部异常记录", "type": "grid"},
        {"name": "⏳ 待处理异常", "type": "grid"},
        {"name": "🔴 高优先级异常", "type": "grid"},
        {"name": "📊 异常处理看板", "type": "kanban"},
        {"name": "🏷️  按异常类型分组", "type": "grid"},
    ]

    view_ids = {}
    for view_config in views:
        view_id = create_view(base_token, table_id, view_config)
        view_ids[view_config["name"]] = view_id
        print(f"  ✓ 创建视图: {view_config['name']} -> {view_id}")
        time.sleep(0.3)

    if view_ids["⏳ 待处理异常"]:
        set_view_filter(base_token, table_id, view_ids["⏳ 待处理异常"], {
            "logic": "and",
            "conditions": [
                [fields["process_status"], "intersects", ["待处理"]],
            ]
        })
        print("  ✓ 配置筛选: 待处理异常")
        time.sleep(0.3)

    if view_ids["🔴 高优先级异常"]:
        set_view_filter(base_token, table_id, view_ids["🔴 高优先级异常"], {
            "logic": "and",
            "conditions": [
                [fields["exception_level"], "intersects", ["高"]],
            ]
        })
        print("  ✓ 配置筛选: 高优先级异常")
        time.sleep(0.3)

    if view_ids["🏷️  按异常类型分组"]:
        set_view_group(base_token, table_id, view_ids["🏷️  按异常类型分组"], [
            {"field": fields["exception_type"], "desc": False}
        ])
        print("  ✓ 配置分组: 按异常类型分组")
        time.sleep(0.3)

    return view_ids


def setup_inventory_views(base_token: str, table_id: str, fields: Dict):
    print("\n" + "="*60)
    print("📦 配置版画库存表视图")
    print("="*60)

    views = [
        {"name": "📋 全部库存", "type": "grid"},
        {"name": "⚠️  编号重复库存", "type": "grid"},
        {"name": "📊 库存状态看板", "type": "kanban"},
        {"name": "🏷️  按艺术家分组", "type": "grid"},
    ]

    view_ids = {}
    for view_config in views:
        view_id = create_view(base_token, table_id, view_config)
        view_ids[view_config["name"]] = view_id
        print(f"  ✓ 创建视图: {view_config['name']} -> {view_id}")
        time.sleep(0.3)

    if view_ids["⚠️  编号重复库存"]:
        set_view_filter(base_token, table_id, view_ids["⚠️  编号重复库存"], {
            "logic": "and",
            "conditions": [
                [fields["has_duplicate"], "==", True],
            ]
        })
        print("  ✓ 配置筛选: 编号重复库存（不进入正常分润）")
        time.sleep(0.3)

    if view_ids["🏷️  按艺术家分组"]:
        set_view_group(base_token, table_id, view_ids["🏷️  按艺术家分组"], [
            {"field": fields["artist"], "desc": False}
        ])
        print("  ✓ 配置分组: 按艺术家分组")
        time.sleep(0.3)

    return view_ids


def setup_return_views(base_token: str, table_id: str, fields: Dict):
    print("\n" + "="*60)
    print("🔄 配置退货记录表视图")
    print("="*60)

    views = [
        {"name": "📋 全部退货记录", "type": "grid"},
        {"name": "⚠️  跨展退货", "type": "grid"},
        {"name": "📊 退货状态看板", "type": "kanban"},
    ]

    view_ids = {}
    for view_config in views:
        view_id = create_view(base_token, table_id, view_config)
        view_ids[view_config["name"]] = view_id
        print(f"  ✓ 创建视图: {view_config['name']} -> {view_id}")
        time.sleep(0.3)

    if view_ids["⚠️  跨展退货"]:
        set_view_filter(base_token, table_id, view_ids["⚠️  跨展退货"], {
            "logic": "and",
            "conditions": [
                [fields["is_cross_exhibition"], "==", True],
            ]
        })
        print("  ✓ 配置筛选: 跨展退货（需财务复核）")
        time.sleep(0.3)

    return view_ids


def setup_sales_order_views(base_token: str, table_id: str, fields: Dict):
    print("\n" + "="*60)
    print("📝 配置销售订单表视图")
    print("="*60)

    views = [
        {"name": "📋 全部销售订单", "type": "grid"},
        {"name": "⚠️  合同比例异常", "type": "grid"},
        {"name": "📊 订单状态看板", "type": "kanban"},
    ]

    view_ids = {}
    for view_config in views:
        view_id = create_view(base_token, table_id, view_config)
        view_ids[view_config["name"]] = view_id
        print(f"  ✓ 创建视图: {view_config['name']} -> {view_id}")
        time.sleep(0.3)

    return view_ids


def main():
    base_token = BASE_TOKEN

    print("\n" + "="*60)
    print("🎨 艺术家版画库存分润系统 - 视图配置")
    print("="*60)

    all_view_ids = {}

    try:
        all_view_ids["profit_share"] = setup_profit_share_views(
            base_token, TABLES["profit_share"], FIELD_NAMES["profit_share"]
        )
    except Exception as e:
        print(f"  ✗ 分润明细表视图配置失败: {e}")

    try:
        all_view_ids["exception"] = setup_exception_views(
            base_token, TABLES["exception"], FIELD_NAMES["exception"]
        )
    except Exception as e:
        print(f"  ✗ 异常预警表视图配置失败: {e}")

    try:
        all_view_ids["inventory"] = setup_inventory_views(
            base_token, TABLES["inventory"], FIELD_NAMES["inventory"]
        )
    except Exception as e:
        print(f"  ✗ 版画库存表视图配置失败: {e}")

    try:
        all_view_ids["return_record"] = setup_return_views(
            base_token, TABLES["return_record"], FIELD_NAMES["return_record"]
        )
    except Exception as e:
        print(f"  ✗ 退货记录表视图配置失败: {e}")

    try:
        all_view_ids["sales_order"] = setup_sales_order_views(
            base_token, TABLES["sales_order"], FIELD_NAMES["sales_order"]
        )
    except Exception as e:
        print(f"  ✗ 销售订单表视图配置失败: {e}")

    print("\n" + "="*60)
    print("✅ 视图配置完成！")
    print("="*60)
    print("\n📌 已创建的视图:")
    for table, views in all_view_ids.items():
        print(f"\n  📄 {table}:")
        for name, vid in views.items():
            print(f"     - {name}")

    print("\n" + "="*60)
    print("📊 看板视图说明:")
    print("="*60)
    print("\n  📈 分润状态看板: 按「分润状态」分组，跟踪待审核→待确认→已发放流程")
    print("  📊 异常处理看板: 按「处理状态」分组，跟踪待处理→处理中→已处理流程")
    print("  📊 库存状态看板: 按「库存状态」分组，跟踪在库→已锁定→已售出→已退货流程")
    print("  📊 退货状态看板: 按「退货状态」分组，跟踪待审核→已审核→已入库流程")
    print("  📊 订单状态看板: 按「订单状态」分组，跟踪待确认→已确认→已发货→已完成流程")
    print("\n" + "="*60 + "\n")

    return all_view_ids


if __name__ == "__main__":
    main()
