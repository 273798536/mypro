#!/usr/bin/env python3
import json
import sys
import time
from base_client import BaseClient
from config import TABLES, FIELD_NAMES, STATUS_OPTIONS


def make_select_options(options, colors=None):
    if colors is None:
        colors = ["Blue", "Green", "Orange", "Red", "Purple", "Cyan", "Yellow", "Lime", "Turquoise", "Wathet"]
    result = []
    for i, opt in enumerate(options):
        result.append({
            "name": opt,
            "hue": colors[i % len(colors)],
            "lightness": "Lighter"
        })
    return result


def setup_artist_contract_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 艺术家合同表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["name"], "type": "text"},
        {"name": fields["contract_no"], "type": "text"},
        {"name": fields["start_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd"}},
        {"name": fields["end_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd"}},
        {"name": fields["profit_ratio"], "type": "number", "style": {"type": "progress", "percentage": True, "precision": 2, "color": "Blue"}},
        {"name": fields["status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["contract"])},
        {"name": fields["notes"], "type": "text"},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def setup_exhibition_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 展会信息表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["name"], "type": "text"},
        {"name": fields["location"], "type": "text"},
        {"name": fields["start_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd"}},
        {"name": fields["end_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd"}},
        {"name": fields["status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["exhibition"])},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def setup_inventory_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 版画库存表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["print_no"], "type": "text"},
        {"name": fields["title"], "type": "text"},
        {"name": fields["artist"], "type": "link", "link_table": TABLES["artist_contract"], "bidirectional": True, "bidirectional_link_field_name": "关联版画"},
        {"name": fields["edition"], "type": "text"},
        {"name": fields["material"], "type": "text"},
        {"name": fields["size"], "type": "text"},
        {"name": fields["year"], "type": "number", "style": {"type": "plain", "precision": 0}},
        {"name": fields["inbound_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd"}},
        {"name": fields["status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["inventory"])},
        {"name": fields["locked_exhibition"], "type": "link", "link_table": TABLES["exhibition"], "bidirectional": True, "bidirectional_link_field_name": "锁定版画"},
        {"name": fields["locked_time"], "type": "datetime", "style": {"format": "yyyy-MM-dd HH:mm"}},
        {"name": fields["value"], "type": "number", "style": {"type": "currency", "precision": 2, "currency_code": "CNY"}},
        {"name": fields["source"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["data_source"])},
        {"name": fields["has_duplicate"], "type": "checkbox"},
        {"name": fields["notes"], "type": "text"},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def setup_sales_order_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 销售订单表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["order_no"], "type": "text"},
        {"name": fields["order_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd HH:mm"}},
        {"name": fields["exhibition"], "type": "link", "link_table": TABLES["exhibition"], "bidirectional": True, "bidirectional_link_field_name": "销售订单"},
        {"name": fields["customer"], "type": "text"},
        {"name": fields["contact"], "type": "text"},
        {"name": fields["inventory"], "type": "link", "link_table": TABLES["inventory"], "bidirectional": True, "bidirectional_link_field_name": "销售记录"},
        {"name": fields["print_no"], "type": "text"},
        {"name": fields["amount"], "type": "number", "style": {"type": "currency", "precision": 2, "currency_code": "CNY"}},
        {"name": fields["payment_status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["payment"])},
        {"name": fields["order_status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["order"])},
        {"name": fields["contract_ratio"], "type": "number", "style": {"type": "progress", "percentage": True, "precision": 2, "color": "Blue"}},
        {"name": fields["source"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["data_source"])},
        {"name": fields["notes"], "type": "text"},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def setup_return_record_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 退货记录表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["return_no"], "type": "text"},
        {"name": fields["return_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd HH:mm"}},
        {"name": fields["sales_order"], "type": "link", "link_table": TABLES["sales_order"], "bidirectional": True, "bidirectional_link_field_name": "退货记录"},
        {"name": fields["inventory"], "type": "link", "link_table": TABLES["inventory"], "bidirectional": True, "bidirectional_link_field_name": "退货记录"},
        {"name": fields["print_no"], "type": "text"},
        {"name": fields["original_exhibition"], "type": "link", "link_table": TABLES["exhibition"], "bidirectional": False},
        {"name": fields["return_exhibition"], "type": "link", "link_table": TABLES["exhibition"], "bidirectional": False},
        {"name": fields["is_cross_exhibition"], "type": "checkbox"},
        {"name": fields["reason"], "type": "text"},
        {"name": fields["return_amount"], "type": "number", "style": {"type": "currency", "precision": 2, "currency_code": "CNY"}},
        {"name": fields["refund_status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["refund"])},
        {"name": fields["return_status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["return"])},
        {"name": fields["notes"], "type": "text"},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def setup_profit_share_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 分润明细表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["calc_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd HH:mm"}},
        {"name": fields["artist"], "type": "link", "link_table": TABLES["artist_contract"], "bidirectional": True, "bidirectional_link_field_name": "分润记录"},
        {"name": fields["sales_order"], "type": "link", "link_table": TABLES["sales_order"], "bidirectional": True, "bidirectional_link_field_name": "分润记录"},
        {"name": fields["inventory"], "type": "link", "link_table": TABLES["inventory"], "bidirectional": True, "bidirectional_link_field_name": "分润记录"},
        {"name": fields["print_no"], "type": "text"},
        {"name": fields["sales_amount"], "type": "number", "style": {"type": "currency", "precision": 2, "currency_code": "CNY"}},
        {"name": fields["contract_ratio"], "type": "number", "style": {"type": "progress", "percentage": True, "precision": 2, "color": "Blue"}},
        {"name": fields["actual_ratio"], "type": "number", "style": {"type": "progress", "percentage": True, "precision": 2, "color": "Green"}},
        {"name": fields["ratio_abnormal"], "type": "checkbox"},
        {"name": fields["artist_share"], "type": "number", "style": {"type": "currency", "precision": 2, "currency_code": "CNY"}},
        {"name": fields["gallery_share"], "type": "number", "style": {"type": "currency", "precision": 2, "currency_code": "CNY"}},
        {"name": fields["status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["profit_share"])},
        {"name": fields["has_return"], "type": "checkbox"},
        {"name": fields["return_record"], "type": "link", "link_table": TABLES["return_record"], "bidirectional": True, "bidirectional_link_field_name": "分润记录"},
        {"name": fields["trace_id"], "type": "text"},
        {"name": fields["notes"], "type": "text"},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def setup_exception_fields(client: BaseClient, table_id: str, fields: dict):
    print("Setting up 异常预警表 fields...")
    existing_fields = client.list_fields(table_id)
    existing_names = {f["field_name"] for f in existing_fields.get("data", {}).get("items", [])}
    
    field_configs = [
        {"name": fields["exception_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd HH:mm"}},
        {"name": fields["exception_type"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["exception_type"], ["Red", "Orange", "Yellow", "Purple", "Blue"])},
        {"name": fields["exception_level"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["exception_level"], ["Red", "Orange", "Yellow"])},
        {"name": fields["print_no"], "type": "text"},
        {"name": fields["table_name"], "type": "text"},
        {"name": fields["record_id"], "type": "text"},
        {"name": fields["description"], "type": "text"},
        {"name": fields["process_status"], "type": "select", "multiple": False, "options": make_select_options(STATUS_OPTIONS["process"])},
        {"name": fields["process_result"], "type": "text"},
        {"name": fields["process_date"], "type": "datetime", "style": {"format": "yyyy-MM-dd HH:mm"}},
        {"name": fields["notes"], "type": "text"},
    ]
    
    for config in field_configs:
        if config["name"] not in existing_names:
            print(f"  Creating field: {config['name']}")
            client.create_field(table_id, config)
            time.sleep(0.3)
        else:
            print(f"  Field already exists: {config['name']}")


def main():
    client = BaseClient()
    
    setup_functions = [
        ("artist_contract", setup_artist_contract_fields),
        ("exhibition", setup_exhibition_fields),
        ("inventory", setup_inventory_fields),
        ("sales_order", setup_sales_order_fields),
        ("return_record", setup_return_record_fields),
        ("profit_share", setup_profit_share_fields),
        ("exception", setup_exception_fields),
    ]
    
    for table_key, setup_func in setup_functions:
        table_id = TABLES[table_key]
        fields = FIELD_NAMES[table_key]
        print(f"\n{'='*50}")
        try:
            setup_func(client, table_id, fields)
            print(f"✓ {table_key} fields setup completed")
        except Exception as e:
            print(f"✗ Error setting up {table_key}: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(1)
    
    print(f"\n{'='*50}")
    print("All fields setup completed!")


if __name__ == "__main__":
    main()
