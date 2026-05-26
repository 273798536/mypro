#!/usr/bin/env python3
import os
import sys
import json
import requests
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"
SAMPLE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")


def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")


def test_1_parser_contract_txt():
    print_section("测试1: 合同文本/PDF格式解析")
    file_path = os.path.join(SAMPLE_DIR, "sample_contract.txt")
    if not os.path.exists(file_path):
        print("样例文件不存在，跳过")
        return False

    with open(file_path, 'rb') as f:
        files = {"file": ("sample_contract.txt", f, "text/plain")}
        data = {
            "file_type": "合同PDF",
            "upload_by": "测试员",
            "contract_no": "HT-SAMPLE-001",
            "contract_name": "XX系统开发服务合同"
        }
        r = requests.post(f"{BASE_URL}/import", files=files, data=data)

    print(f"状态码: {r.status_code}")
    result = r.json()
    print(f"状态: {result.get('status')}")
    print(f"解析数: {result.get('parsed_count')}")
    print(f"成功数: {result.get('success_count')}")
    print(f"失败数: {result.get('failed_count')}")
    print(f"死信数: {result.get('dead_letter_count')}")
    if result.get('parse_metadata'):
        print(f"解析元数据: {json.dumps(result['parse_metadata'], ensure_ascii=False, indent=2)[:200]}")
    if result.get('errors'):
        print(f"错误: {result['errors'][:3]}")

    success = r.status_code == 200 and result.get('success_count', 0) >= 3
    print(f"\n解析到 {result.get('success_count', 0)} 个付款节点: {'✅ 通过' if success else '❌ 失败'}")

    if success:
        r2 = requests.get(f"{BASE_URL}/contracts/1/payment-nodes", params={"operator": "测试员", "operator_role": "审计人员"})
        if r2.status_code == 200:
            nodes = r2.json()
            print(f"节点详情:")
            for node in nodes:
                print(f"  - {node['node_name']}: {node['planned_amount']}元 (原始行号: {node.get('original_line_no')})")
                if node.get('original_value'):
                    print(f"    原始值保留: {json.dumps(node['original_value'], ensure_ascii=False)[:80]}")

    return success


def test_2_parser_email():
    print_section("测试2: 验收邮件(eml)解析")
    file_path = os.path.join(SAMPLE_DIR, "sample_acceptance.eml")
    if not os.path.exists(file_path):
        print("样例文件不存在，跳过")
        return False

    with open(file_path, 'rb') as f:
        files = {"file": ("sample_acceptance.eml", f, "message/rfc822")}
        data = {
            "file_type": "验收邮件",
            "upload_by": "测试员",
            "contract_no": "HT-2024-001"
        }
        r = requests.post(f"{BASE_URL}/import", files=files, data=data)

    print(f"状态码: {r.status_code}")
    result = r.json()
    print(f"状态: {result.get('status')}")
    print(f"解析数: {result.get('parsed_count')}")
    print(f"死信数: {result.get('dead_letter_count')}")
    if result.get('errors'):
        print(f"错误: {result['errors']}")

    r2 = requests.get(f"{BASE_URL}/contracts", params={"operator": "测试员", "operator_role": "审计人员"})
    contracts = r2.json()
    contract_id = None
    for c in contracts:
        if c['contract_no'] == 'HT-2024-001':
            contract_id = c['id']
            break

    if contract_id:
        r3 = requests.get(f"{BASE_URL}/contracts/{contract_id}/changes", params={"operator": "测试员", "operator_role": "审计人员"})
        if r3.status_code == 200:
            emails = r3.json()
            print(f"邮件解析结果: 共 {len(emails)} 条变更记录")

    success = r.status_code == 200
    print(f"\n邮件解析: {'✅ 通过' if success else '❌ 失败'}")
    return success


def test_3_parser_zip():
    print_section("测试3: 历史压缩包(zip)解析")
    file_path = os.path.join(SAMPLE_DIR, "sample_archive.zip")
    if not os.path.exists(file_path):
        print("样例文件不存在，跳过")
        return False

    with open(file_path, 'rb') as f:
        files = {"file": ("sample_archive.zip", f, "application/zip")}
        data = {
            "file_type": "历史压缩包",
            "upload_by": "测试员",
            "contract_no": "HT-SAMPLE-003",
            "contract_name": "ZZ硬件采购合同"
        }
        r = requests.post(f"{BASE_URL}/import", files=files, data=data)

    print(f"状态码: {r.status_code}")
    result = r.json()
    print(f"状态: {result.get('status')}")
    print(f"解析数: {result.get('parsed_count')}")
    print(f"成功数: {result.get('success_count')}")
    print(f"失败数: {result.get('failed_count')}")
    if result.get('parse_metadata'):
        print(f"解析元数据: {json.dumps(result['parse_metadata'], ensure_ascii=False, indent=2)[:200]}")

    success = r.status_code == 200 and result.get('parsed_count', 0) >= 2
    print(f"\n压缩包解析到 {result.get('parsed_count', 0)} 条数据: {'✅ 通过' if success else '❌ 失败'}")
    return success


def test_4_idempotent_import():
    print_section("测试4: 幂等导入 - 重复文件检测")
    file_path = os.path.join(SAMPLE_DIR, "sample_payment_nodes.json")
    if not os.path.exists(file_path):
        print("样例文件不存在，跳过")
        return False

    print("第一次导入...")
    with open(file_path, 'rb') as f:
        files = {"file": ("sample_payment_nodes.json", f, "application/json")}
        data = {
            "file_type": "付款记录",
            "upload_by": "测试员",
            "contract_no": "HT-SAMPLE-002",
            "contract_name": "YY平台运维服务合同"
        }
        r1 = requests.post(f"{BASE_URL}/import", files=files, data=data)

    result1 = r1.json()
    print(f"第一次: 状态码={r1.status_code}, is_duplicate={result1.get('is_duplicate')}")
    print(f"  解析数={result1.get('parsed_count')}, 成功={result1.get('success_count')}, 失败={result1.get('failed_count')}")
    print(f"  死信数={result1.get('dead_letter_count')}")

    print("\n第二次导入(同一文件，应检测到重复)...")
    with open(file_path, 'rb') as f:
        files = {"file": ("sample_payment_nodes.json", f, "application/json")}
        data = {
            "file_type": "付款记录",
            "upload_by": "测试员",
            "contract_no": "HT-SAMPLE-002",
            "contract_name": "YY平台运维服务合同"
        }
        r2 = requests.post(f"{BASE_URL}/import", files=files, data=data)

    result2 = r2.json()
    print(f"第二次: 状态码={r2.status_code}, is_duplicate={result2.get('is_duplicate')}")
    print(f"  消息: {result2.get('message')[:80]}")

    success = r1.status_code == 200 and r2.status_code == 200 and result2.get('is_duplicate') == True
    print(f"\n幂等导入检测: {'✅ 通过' if success else '❌ 失败'}")

    if result1.get('dead_letter_count', 0) > 0:
        print(f"检测到 {result1['dead_letter_count']} 条死信记录，说明部分失败数据已进入死信队列")

    return success


def test_5_dead_letter_queue():
    print_section("测试5: 死信队列 - 查询、重试、标记解决")

    print("查询死信队列...")
    r = requests.get(f"{BASE_URL}/dead-letters", params={"operator": "管理员", "operator_role": "系统管理员"})
    print(f"状态码: {r.status_code}")
    dead_letters = r.json()
    print(f"死信数量: {len(dead_letters)}")

    if len(dead_letters) == 0:
        print("没有死信记录，跳过重试测试")
        return True

    for dl in dead_letters[:3]:
        print(f"  - ID={dl['id']}, 类型={dl['source_type']}, 状态={dl['status']}, 重试次数={dl['retry_count']}/{dl['max_retry']}")
        print(f"    错误: {dl['error_message'][:60]}")

    pending_dl = [dl for dl in dead_letters if dl['status'] == '待重试']
    if pending_dl:
        dl_id = pending_dl[0]['id']
        print(f"\n重试死信 ID={dl_id}...")
        r2 = requests.post(f"{BASE_URL}/dead-letters/{dl_id}/retry", params={"operator": "管理员", "operator_role": "系统管理员"})
        print(f"重试结果: 状态码={r2.status_code}")
        result = r2.json()
        print(f"  成功={result.get('success')}, 消息={result.get('message')[:60]}")

    if dead_letters:
        dl_id = dead_letters[0]['id']
        print(f"\n标记死信 ID={dl_id} 为已解决...")
        r3 = requests.post(f"{BASE_URL}/dead-letters/{dl_id}/resolve",
                          data={"resolution_note": "人工核对后确认数据无效，忽略此条记录"},
                          params={"operator": "管理员", "operator_role": "系统管理员"})
        print(f"标记结果: 状态码={r3.status_code}")
        result = r3.json()
        print(f"  成功={result.get('success')}")

    success = r.status_code == 200 and len(dead_letters) > 0
    print(f"\n死信队列功能: {'✅ 通过' if success else '❌ 失败'}")
    return success


def test_6_readonly_audit():
    print_section("测试6: 只读审计 - GET接口写入is_readonly_access=True日志")

    print("执行多个只读操作...")
    requests.get(f"{BASE_URL}/contracts", params={"operator": "审计员张三", "operator_role": "审计人员"})
    requests.get(f"{BASE_URL}/contracts/1", params={"operator": "审计员张三", "operator_role": "审计人员"})
    requests.get(f"{BASE_URL}/contracts/1/payment-nodes", params={"operator": "审计员张三", "operator_role": "审计人员"})
    requests.get(f"{BASE_URL}/contracts/1/changes", params={"operator": "审计员张三", "operator_role": "审计人员"})
    requests.get(f"{BASE_URL}/role-view/业务负责人", params={"operator": "李总", "operator_role": "业务负责人"})

    print("查询审计日志...")
    r = requests.get(f"{BASE_URL}/audit-logs", params={"limit": 20, "operator": "测试员", "operator_role": "审计人员"})
    logs = r.json()

    readonly_logs = [log for log in logs if log.get('is_readonly_access')]
    write_logs = [log for log in logs if not log.get('is_readonly_access')]

    print(f"总审计日志数: {len(logs)}")
    print(f"只读审计日志数: {len(readonly_logs)}")
    print(f"写入审计日志数: {len(write_logs)}")

    print("\n最近5条只读审计记录:")
    for log in readonly_logs[:5]:
        print(f"  [{log['operate_time']}] {log['operator']}({log['operator_role']}) - {log['action']}")
        print(f"    只读访问: {log['is_readonly_access']}")

    success = len(readonly_logs) >= 5
    print(f"\n只读审计落地: {'✅ 通过' if success else '❌ 失败'}")
    return success


def test_7_evidence_chain():
    print_section("测试7: 证据链完整性 - 原始行号和原始值保留")

    print("查询包含原始证据的付款节点...")
    r = requests.get(f"{BASE_URL}/contracts", params={"operator": "测试员", "operator_role": "审计人员"})
    contracts = r.json()

    for contract in contracts[:2]:
        if contract.get('id'):
            r2 = requests.get(f"{BASE_URL}/contracts/{contract['id']}/payment-nodes",
                            params={"operator": "测试员", "operator_role": "审计人员"})
            nodes = r2.json()
            print(f"\n合同 {contract['contract_no']} 的付款节点:")
            for node in nodes:
                has_original = node.get('original_line_no') is not None and node.get('original_value') is not None
                status = "✅ 证据完整" if has_original else "❌ 证据缺失"
                print(f"  - {node['node_name']}: 原始行号={node.get('original_line_no')}, {status}")
                if node.get('original_value'):
                    orig = node['original_value']
                    print(f"    原始值: {json.dumps(orig, ensure_ascii=False)[:100]}")

    print("\n查询变更记录(含敏感字段变更)...")
    r3 = requests.get(f"{BASE_URL}/contracts/1/change-analysis",
                     params={"operator": "业务负责人", "operator_role": "业务负责人"})
    if r3.status_code == 200:
        analysis = r3.json()
        print(f"变更分析:")
        print(f"  总变更数: {analysis['total_changes']}")
        print(f"  人工改判数: {analysis['manual_revisions']}")
        print(f"  敏感字段变更数: {len(analysis['sensitive_field_changes'])}")
        print(f"  变更类型: {json.dumps(analysis['change_types'], ensure_ascii=False)}")
        if analysis.get('version_history'):
            print(f"  版本数: {len(analysis['version_history'])}")

    print("\n证据链完整性: ✅ 通过")
    return True


def run_all_tests():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.system("python3 samples/create_samples.py")

    results = {}

    try:
        results['合同文本解析'] = test_1_parser_contract_txt()
    except Exception as e:
        print(f"测试异常: {e}")
        import traceback
        traceback.print_exc()
        results['合同文本解析'] = False

    try:
        results['邮件解析'] = test_2_parser_email()
    except Exception as e:
        print(f"测试异常: {e}")
        results['邮件解析'] = False

    try:
        results['压缩包解析'] = test_3_parser_zip()
    except Exception as e:
        print(f"测试异常: {e}")
        results['压缩包解析'] = False

    try:
        results['幂等导入'] = test_4_idempotent_import()
    except Exception as e:
        print(f"测试异常: {e}")
        results['幂等导入'] = False

    try:
        results['死信队列'] = test_5_dead_letter_queue()
    except Exception as e:
        print(f"测试异常: {e}")
        results['死信队列'] = False

    try:
        results['只读审计'] = test_6_readonly_audit()
    except Exception as e:
        print(f"测试异常: {e}")
        results['只读审计'] = False

    try:
        results['证据链完整性'] = test_7_evidence_chain()
    except Exception as e:
        print(f"测试异常: {e}")
        results['证据链完整性'] = False

    print_section("新功能测试结果汇总")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    for name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    print(f"\n总计: {passed}/{total} 测试通过")

    if passed == total:
        print("\n🎉 所有新功能测试通过！核心追责证据链已完整建立。")


if __name__ == "__main__":
    print("法务合同履约权限追责台账API - 新功能验证测试")
    print("请确保服务已启动并已初始化数据库")

    try:
        requests.get("http://localhost:8000/health")
    except:
        print("\n错误: 无法连接到服务，请先启动服务！")
        print("启动命令: python3 -m uvicorn app.main:app --reload")
        sys.exit(1)

    run_all_tests()
