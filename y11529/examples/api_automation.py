#!/usr/bin/env python3
"""
API 自动化脚本示例 - 从创建到导出的完整流程
"""

import sys
import os
import json
import requests

BASE_URL = "http://localhost:8000"


def api_call(method, path, **kwargs):
    url = f"{BASE_URL}{path}"
    response = getattr(requests, method.lower())(url, **kwargs)
    response.raise_for_status()
    return response.json()


def main():
    try:
        print("=" * 60)
        print("  API 自动化脚本 - 跨境小包清关台账")
        print("=" * 60)

        print("\n[1] 健康检查")
        health = api_call("GET", "/health")
        print(f"  ✓ API 状态: {health['status']}")

        print("\n[2] 创建申报表记录")
        create_data = {
            "record_type": "declaration",
            "tracking_no": "API-TEST-001",
            "package_no": "API-PKG-001",
            "created_by": "api_user",
            "created_by_role": "data_entry",
            "hs_code": "85171210",
            "goods_description": "智能手机",
            "quantity": 1,
            "declared_value": 3999,
            "tax_amount": 240,
        }
        record = api_call("POST", "/api/v1/records", json=create_data)
        print(f"  ✓ 创建成功: {record['record_no']}")
        print(f"    ID: {record['id']}")
        print(f"    状态: {record['status']}")

        record_id = record["id"]

        print("\n[3] 提交审核")
        submit_data = {
            "action_by": "api_user",
            "action_by_role": "data_entry",
            "note": "API 自动提交审核",
        }
        record = api_call("POST", f"/api/v1/records/{record_id}/submit", json=submit_data)
        print(f"  ✓ 已提交审核")
        print(f"    状态: {record['status']}")
        print(f"    版本: v{record['version']}")

        print("\n[4] 查看记录详情")
        record = api_call("GET", f"/api/v1/records/{record_id}")
        print(f"  ✓ 记录详情")
        print(f"    运单号: {record['tracking_no']}")
        print(f"    当前处理人: {record['current_handler']}")

        print("\n[5] 查看变更历史")
        history = api_call("GET", f"/api/v1/records/{record_id}/history")
        print(f"  ✓ 变更历史: {len(history)} 条")
        for h in history[:2]:
            print(f"    - {h['action_time']}: {h['action']} by {h['action_by']}")

        print("\n[6] 二次确认")
        confirm_data = {
            "action_by": "api_manager",
            "action_by_role": "manager",
            "note": "API 自动确认",
        }
        record = api_call("POST", f"/api/v1/records/{record_id}/confirm", json=confirm_data)
        print(f"  ✓ 已确认")
        print(f"    状态: {record['status']}")
        print(f"    最终处理人: {record['final_handler']}")

        print("\n[7] 查看审计日志")
        audit_logs = api_call("GET", "/api/v1/audit/logs", params={"limit": 5})
        print(f"  ✓ 最近操作: {len(audit_logs)} 条")
        for log in audit_logs[:3]:
            print(f"    - {log['action_time']}: {log['action']} by {log['action_by']}")

        print("\n[8] 获取异常报表")
        exceptions = api_call("GET", "/api/v1/reports/exceptions")
        print(f"  ✓ 异常总数: {exceptions['total_exceptions']}")

        print("\n[9] 获取经理仪表盘")
        dashboard = api_call("GET", "/api/v1/reports/dashboard")
        print(f"  ✓ 记录总数: {dashboard['total_records']}")
        print(f"    总申报价值: {dashboard['total_declared_value']:,}")
        print(f"    总税费: {dashboard['total_tax_amount']:,}")

        print("\n" + "=" * 60)
        print("  API 自动化流程完成!")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print("\n✗ 无法连接到 API 服务器")
        print("  请先启动服务器: python3 -m uvicorn ledger.api.main:app --reload")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"\n✗ API 错误: {e}")
        if hasattr(e, "response") and e.response:
            print(f"  状态码: {e.response.status_code}")
            try:
                detail = e.response.json()
                print(f"  详情: {detail}")
            except:
                print(f"  响应: {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
