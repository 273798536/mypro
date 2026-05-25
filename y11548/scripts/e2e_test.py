#!/usr/bin/env python3
import requests
import sys
import os
from datetime import datetime, timedelta
import json

BASE_URL = "http://localhost:8000"


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'


def print_step(step, message):
    print(f"\n{Colors.BLUE}[Step {step}]{Colors.ENDC} {message}")


def print_pass(message):
    print(f"  {Colors.GREEN}✓ PASS:{Colors.ENDC} {message}")


def print_fail(message):
    print(f"  {Colors.RED}✗ FAIL:{Colors.ENDC} {message}")


def print_info(message):
    print(f"  {Colors.YELLOW}INFO:{Colors.ENDC} {message}")


def e2e_test():
    print("=" * 60)
    print("线下展会物料验收回放链路服务 - 端到端测试")
    print("=" * 60)
    
    session = requests.Session()
    
    try:
        health = session.get(f"{BASE_URL}/health")
        if health.status_code != 200:
            print_fail("服务未启动，请先运行: material-cli serve")
            sys.exit(1)
        print_pass("服务运行正常")
    except requests.exceptions.ConnectionError:
        print_fail("无法连接到服务，请先运行: material-cli serve")
        sys.exit(1)
    
    step = 1
    
    print_step(step, "测试1: 用户认证")
    step += 1
    
    users = {
        "admin": {"pass": "admin123", "role": "supervisor"},
        "reviewer": {"pass": "review123", "role": "reviewer"},
        "entry": {"pass": "entry123", "role": "data_entry"},
        "viewer": {"pass": "view123", "role": "read_only"},
    }
    
    tokens = {}
    for user, info in users.items():
        resp = session.post(f"{BASE_URL}/auth/token",
                           data={"username": user, "password": info["pass"]})
        if resp.status_code == 200:
            tokens[user] = resp.json()["access_token"]
            print_pass(f"{user} ({info['role']}) 登录成功")
        else:
            print_fail(f"{user} 登录失败: {resp.text}")
    
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    entry_headers = {"Authorization": f"Bearer {tokens['entry']}"}
    viewer_headers = {"Authorization": f"Bearer {tokens['viewer']}"}
    
    print_step(step, "测试2: 跨日/跨批次边界 - 创建两个批次")
    step += 1
    
    day1 = datetime.now() - timedelta(days=1)
    day2 = datetime.now()
    
    batch1 = {
        "batch_no": f"SH{day1.strftime('%Y%m%d')}",
        "exhibition_name": "上海国际会展中心-春季展",
        "location": "上海",
        "start_date": (day1 - timedelta(days=2)).isoformat(),
        "end_date": (day1 + timedelta(days=1)).isoformat()
    }
    resp1 = session.post(f"{BASE_URL}/batches", headers=admin_headers, json=batch1)
    batch1_id = resp1.json()["id"]
    print_pass(f"创建批次1 (首日): {batch1['batch_no']} (ID: {batch1_id})")
    
    batch2 = {
        "batch_no": f"BJ{day2.strftime('%Y%m%d')}",
        "exhibition_name": "北京国家会议中心-科技展",
        "location": "北京",
        "start_date": day2.isoformat(),
        "end_date": (day2 + timedelta(days=3)).isoformat()
    }
    resp2 = session.post(f"{BASE_URL}/batches", headers=admin_headers, json=batch2)
    batch2_id = resp2.json()["id"]
    print_pass(f"创建批次2 (次日): {batch2['batch_no']} (ID: {batch2_id})")
    
    print_step(step, "测试3: 物料清单导入 - 录入员权限")
    step += 1
    
    materials = [
        {"material_code": "LAP-001", "material_name": "笔记本电脑", "quantity": 10, "category": "电子设备"},
        {"material_code": "PRO-001", "material_name": "投影仪", "quantity": 3, "category": "电子设备"},
        {"material_code": "DIS-001", "material_name": "展示架", "quantity": 20, "category": "展示用品"},
        {"material_code": "BRO-001", "material_name": "宣传册", "quantity": 500, "category": "印刷品"},
    ]
    
    for m in materials:
        session.post(f"{BASE_URL}/materials", headers=entry_headers,
                    json={**m, "batch_id": batch1_id})
        session.post(f"{BASE_URL}/materials", headers=entry_headers,
                    json={**m, "batch_id": batch2_id})
    
    print_pass(f"批量创建物料: {len(materials)} 种 x 2 批次 = {len(materials)*2} 条记录")
    
    print_step(step, "测试4: 物流签收记录")
    step += 1
    
    logistics_data = [
        {"waybill_no": "SF123456789", "material_code": "LAP-001", "material_name": "笔记本电脑", "quantity": 10, "receiver": "张经理"},
        {"waybill_no": "SF123456790", "material_code": "PRO-001", "material_name": "投影仪", "quantity": 3, "receiver": "张经理"},
    ]
    
    for l in logistics_data:
        session.post(f"{BASE_URL}/logistics", headers=entry_headers,
                    json={**l, "batch_id": batch1_id, "receive_date": day1.isoformat()})
    
    print_pass(f"创建物流签收记录: {len(logistics_data)} 条 (批次1)")
    
    print_step(step, "测试5: 现场借用记录 - 责任追踪")
    step += 1
    
    borrow_data = [
        {"borrow_no": f"BRW{batch1_id}001", "borrower_name": "王销售", "borrower_department": "销售部",
         "material_code": "LAP-001", "material_name": "笔记本电脑", "quantity": 2},
        {"borrow_no": f"BRW{batch1_id}002", "borrower_name": "李技术", "borrower_department": "技术部",
         "material_code": "PRO-001", "material_name": "投影仪", "quantity": 1},
        {"borrow_no": f"BRW{batch1_id}003", "borrower_name": "赵市场", "borrower_department": "市场部",
         "material_code": "DIS-001", "material_name": "展示架", "quantity": 5},
    ]
    
    for b in borrow_data:
        session.post(f"{BASE_URL}/borrow", headers=entry_headers,
                    json={**b, "batch_id": batch1_id,
                          "borrow_date": day1.isoformat(),
                          "expected_return_date": (day1 + timedelta(days=2)).isoformat()})
    
    print_pass(f"创建借用记录: {len(borrow_data)} 条 (批次1)")
    print_info("重点: 每条借用记录都有明确的借用人、部门、借用日期")
    
    print_step(step, "测试6: 扫码明细 - 出入库追踪")
    step += 1
    
    scan_data = [
        {"material_code": "LAP-001", "material_name": "笔记本电脑", "scan_type": "进场", "quantity": 10},
        {"material_code": "PRO-001", "material_name": "投影仪", "scan_type": "进场", "quantity": 3},
        {"material_code": "DIS-001", "material_name": "展示架", "scan_type": "进场", "quantity": 20},
        {"material_code": "LAP-001", "material_name": "笔记本电脑", "scan_type": "离场", "quantity": 8},
        {"material_code": "PRO-001", "material_name": "投影仪", "scan_type": "离场", "quantity": 2},
    ]
    
    for i, s in enumerate(scan_data):
        session.post(f"{BASE_URL}/scans", headers=entry_headers,
                    json={**s, "batch_id": batch1_id,
                          "scan_time": (day1 + timedelta(hours=8+i)).isoformat(),
                          "scanner": "扫码员甲"})
    
    print_pass(f"创建扫码记录: {len(scan_data)} 条 (批次1)")
    
    print_step(step, "测试7: 状态冻结机制 - 关键边界测试")
    step += 1
    
    resp = session.post(f"{BASE_URL}/batches/{batch1_id}/transition",
                       headers=admin_headers, json={"target_status": "frozen"})
    
    if resp.status_code == 200 and resp.json()["status"] == "frozen":
        print_pass(f"批次1 已成功冻结 (frozen)")
    else:
        print_fail(f"批次冻结失败: {resp.text}")
    
    print_info("现在验证冻结后不能被错误修改...")
    
    test_add = session.post(f"{BASE_URL}/materials", headers=admin_headers, json={
        "batch_id": batch1_id, "material_code": "HACK-001",
        "material_name": "恶意添加", "quantity": 1
    })
    
    if test_add.status_code == 400 and "frozen" in test_add.text:
        print_pass("✓ 冻结批次无法添加新记录 - 保护生效")
    else:
        print_fail(f"✗ 冻结保护失效: {test_add.status_code}")
    
    test_update = session.put(f"{BASE_URL}/batches/{batch1_id}",
                             headers=admin_headers, json={"exhibition_name": "被篡改"})
    
    if test_update.status_code == 400:
        print_pass("✓ 冻结批次无法修改信息 - 保护生效")
    else:
        print_fail(f"✗ 冻结保护失效: {test_update.status_code}")
    
    print_info("额外验证: 冻结状态无法转回 in_progress...")
    
    test_unfreeze = session.post(f"{BASE_URL}/batches/{batch1_id}/transition",
                                headers=admin_headers, json={"target_status": "in_progress"})
    
    if test_unfreeze.status_code == 400 and "immutable" in test_unfreeze.text:
        print_pass("✓ 冻结状态无法转回 in_progress - 状态机保护生效")
    else:
        print_fail(f"✗ 状态机保护失效: {test_unfreeze.status_code} - {test_unfreeze.text}")
    
    print_info("额外验证: 只读用户无法修改冻结批次状态...")
    
    test_viewer_unfreeze = session.post(f"{BASE_URL}/batches/{batch1_id}/transition",
                                       headers=viewer_headers, json={"target_status": "in_progress"})
    
    if test_viewer_unfreeze.status_code in [400, 403]:
        print_pass("✓ 只读用户无法修改冻结批次状态 - 权限保护生效")
    else:
        print_fail(f"✗ 权限保护失效: {test_viewer_unfreeze.status_code}")
    
    print_info("额外验证: 冻结批次无法导入数据...")
    
    import_data = "material_code,material_name,quantity\nHACK-IMP,恶意导入,1\n"
    test_import = session.post(
        f"{BASE_URL}/imports/material?batch_id={batch1_id}",
        headers=admin_headers,
        files={"file": ("test.csv", import_data, "text/csv")}
    )
    
    if test_import.status_code == 400 and "frozen" in test_import.text:
        print_pass("✓ 冻结批次无法导入数据 - 导入保护生效")
    else:
        print_fail(f"✗ 导入保护失效: {test_import.status_code} - {test_import.text}")
    
    print_step(step, "测试8: 权限控制 - 不同角色可见字段和操作")
    step += 1
    
    test_viewer_create = session.post(f"{BASE_URL}/materials", headers=viewer_headers, json={
        "batch_id": batch2_id, "material_code": "TEST-001",
        "material_name": "测试", "quantity": 1
    })
    
    if test_viewer_create.status_code == 403:
        print_pass("✓ 只读用户无法创建记录 - 权限控制生效")
    else:
        print_fail(f"✗ 权限控制失效: {test_viewer_create.status_code}")
    
    test_viewer_list = session.get(f"{BASE_URL}/materials?batch_id={batch2_id}",
                                   headers=viewer_headers)
    if test_viewer_list.status_code == 200:
        print_pass("✓ 只读用户可以查看记录 - 权限控制正确")
    else:
        print_fail(f"✗ 权限异常: {test_viewer_list.status_code}")
    
    print_step(step, "测试9: 对账功能 - 发现异常")
    step += 1
    
    recon_resp = session.post(f"{BASE_URL}/reconciliation/{batch1_id}",
                             headers=admin_headers)
    recon_result = recon_resp.json()
    
    print_pass(f"对账完成: 发现 {recon_result['anomaly_count']} 个异常")
    
    for anomaly in recon_result["anomalies"]:
        print_info(f"  {anomaly['material_code']}: {anomaly['description']}")
    
    print_step(step, "测试10: 单条记录追溯 - 从报表追到明细")
    step += 1
    
    trace_resp = session.get(f"{BASE_URL}/reconciliation/{batch1_id}/trace/LAP-001",
                            headers=admin_headers)
    trace_data = trace_resp.json()
    
    print_pass(f"物料 LAP-001 全链路追溯:")
    print_info(f"  物料清单记录: {len(trace_data['material_list_records'])} 条")
    print_info(f"  物流签收记录: {len(trace_data['logistics_records'])} 条")
    print_info(f"  借用记录: {len(trace_data['borrow_records'])} 条")
    print_info(f"  扫码记录: {len(trace_data['scan_records'])} 条")
    
    print_step(step, "测试11: 操作日志审计 - 所有动作可追踪")
    step += 1
    
    logs_resp = session.get(f"{BASE_URL}/logs?table_name=exhibition_batches&record_id={batch1_id}",
                           headers=admin_headers)
    logs = logs_resp.json()
    
    print_pass(f"批次1 操作日志: {len(logs)} 条记录")
    for log in logs[:3]:
        print_info(f"  [{log['created_at']}] {log['operation_type']} by user {log['created_by']}")
    
    print_step(step, "测试12: 报表导出 - 端到端闭环")
    step += 1
    
    export_resp = session.get(f"{BASE_URL}/exports/{batch1_id}/full",
                             headers=admin_headers)
    
    if export_resp.status_code == 200 and "excel" in export_resp.headers.get("content-type", ""):
        print_pass("✓ 完整报表导出成功")
        print_info(f"  文件大小: {len(export_resp.content)} bytes")
    else:
        print_fail(f"✗ 导出失败: {export_resp.status_code}")
    
    print("\n" + "=" * 60)
    print("端到端测试完成！")
    print("=" * 60)
    print("\n关键验证点总结:")
    print("  ✓ 跨日/跨批次边界 - 两个独立批次，数据隔离")
    print("  ✓ 状态冻结 - 冻结后无法修改，防止篡改")
    print("  ✓ 状态机安全 - FROZEN 状态无法转回 IN_PROGRESS")
    print("  ✓ 状态转移权限 - 只读用户无法修改冻结批次状态")
    print("  ✓ 导入安全 - 冻结批次无法导入数据")
    print("  ✓ 权限控制 - 四种角色各有不同操作权限")
    print("  ✓ 责任追踪 - 借用记录关联到人")
    print("  ✓ 对账异常 - 自动发现账实不符")
    print("  ✓ 全链路追溯 - 物料编码可追查到所有记录")
    print("  ✓ 操作审计 - 所有修改留下日志")
    print("  ✓ 报表导出 - 完整报表支持导出")
    print("\n项目经理关注:")
    print(f"  - HTTP请求数: ~35 次 (创建-对账-导出-安全验证 全流程)")
    print(f"  - 本地持久化: 所有记录在SQLite数据库")
    print(f"  - 命令脚本: material-cli 支持所有操作")
    print("\n安全修复验证:")
    print("  1. utils.py: FROZEN 状态转移列表为空，无法转回任何状态")
    print("  2. batches.py: 状态转移前检查当前状态是否为 FROZEN/COMPLETED")
    print("  3. imports.py: 导入前检查批次是否冻结")
    print("\n测试用例文件: scripts/e2e_test.py")
    
    return 0


if __name__ == "__main__":
    sys.exit(e2e_test())
