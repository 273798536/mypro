#!/usr/bin/env python3
"""使用 FastAPI TestClient 验证所有基础 API 接口"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app


def test_all_endpoints():
    print("\n" + "=" * 70)
    print("  🧪 FastAPI TestClient - API 接口测试")
    print("=" * 70)
    
    client = TestClient(app)
    
    test_cases = [
        ("根路径", "GET", "/"),
        ("健康检查", "GET", "/health"),
        ("批次列表", "GET", "/api/v1/batches/"),
        ("批次详情", "GET", "/api/v1/batches/1"),
        ("批次报告", "GET", "/api/v1/batches/1/report"),
        ("审计日志", "GET", "/api/v1/batches/1/audit-logs"),
        ("附件列表", "GET", "/api/v1/batches/1/attachments"),
        ("状态历史", "GET", "/api/v1/batches/1/state-history"),
        ("任务统计", "GET", "/api/v1/tasks/stats"),
        ("人工任务列表", "GET", "/api/v1/batches/tasks/manual"),
    ]
    
    results = []
    for name, method, url in test_cases:
        try:
            if method == "GET":
                response = client.get(url)
            elif method == "POST":
                response = client.post(url)
            
            status = "✅" if response.status_code == 200 else "❌"
            results.append((name, method, url, response.status_code))
            
            print(f"\n{status} {name}")
            print(f"   {method} {url} -> {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if name == "批次报告":
                    manual_reason_count = sum(
                        1 for item in data.get("items", []) 
                        if item.get("manual_reason")
                    )
                    print(f"   ✅ 报告中含人工理由的物料: {manual_reason_count} 个")
                    if manual_reason_count > 0:
                        for item in data["items"]:
                            if item.get("manual_reason"):
                                print(f"     • {item['material_code']}: {item['manual_reason'][:50]}...")
                elif name == "审计日志":
                    review_count = sum(
                        1 for log in data 
                        if log.get("operation_type") in ["review", "overrule"]
                    )
                    print(f"   ✅ 含 REVIEW/OVERRULE 类型的审计记录: {review_count} 条")
                elif name == "任务统计":
                    print(f"   ✅ 调度器运行状态: {data.get('scheduler_running')}")
                    
        except Exception as e:
            results.append((name, method, url, f"ERROR: {e}"))
            print(f"\n❌ {name} - {method} {url}")
            print(f"   错误: {e}")
    
    print("\n" + "=" * 70)
    print("  📋 测试结果汇总")
    print("=" * 70)
    
    passed = 0
    for name, method, url, status in results:
        if status == 200:
            passed += 1
            print(f"  ✅ {name}: {status}")
        else:
            print(f"  ❌ {name}: {status}")
    
    print(f"\n总计: {passed}/{len(results)} 个接口返回 200")
    
    if passed == len(results):
        print("\n🎉 所有 API 接口测试通过！")
        return True
    else:
        print(f"\n⚠️  {len(results) - passed} 个接口未通过")
        return False


if __name__ == "__main__":
    success = test_all_endpoints()
    sys.exit(0 if success else 1)
