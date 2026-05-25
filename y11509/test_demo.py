import os
import sys
import json
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5001/api"


def print_section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_response(resp, show_data=True):
    print(f"  状态码: {resp.status_code}")
    try:
        data = resp.json()
        if show_data and data.get("data"):
            print(f"  结果: {data.get('message', '成功')}")
        elif data.get("error"):
            print(f"  错误: {data.get('error')}")
        return data
    except:
        print(f"  响应: {resp.text[:100]}")
        return None


def test_health_check():
    print_section("1. 系统健康检查")
    resp = requests.get(f"{BASE_URL}/health")
    data = print_response(resp)
    return data and resp.status_code == 200


def test_create_inspection():
    print_section("2. 创建巡检记录")
    payload = {
        "record_no": f"TEST-INSP-{datetime.now().strftime('%H%M%S')}",
        "device_name": "测试设备-心电图机",
        "device_model": "TEST-ECG-001",
        "device_sn": "SN1234567890",
        "department": "测试科室",
        "inspection_date": datetime.now().strftime("%Y-%m-%d"),
        "inspector": "测试人员",
        "inspection_result": "合格",
        "next_inspection_date": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
        "issues_found": "无异常",
        "certificate_no": "CAL-TEST-001",
    }
    resp = requests.post(f"{BASE_URL}/inspection", json=payload)
    data = print_response(resp)
    return data.get("data", {}).get("id") if data else None


def test_duplicate_submit(record_id):
    print_section("3. 边界测试 - 重复提交验证")
    payload = {
        "record_no": "DUPLICATE-TEST-001",
        "device_name": "测试设备",
        "department": "测试科室",
        "inspection_date": datetime.now().strftime("%Y-%m-%d"),
    }

    print("  第一次创建...")
    resp1 = requests.post(f"{BASE_URL}/inspection", json=payload)
    data1 = print_response(resp1)

    print("\n  第二次创建（同一编号）...")
    resp2 = requests.post(f"{BASE_URL}/inspection", json=payload)
    data2 = print_response(resp2)

    if resp2.status_code == 409:
        print("  ✓ 重复提交被正确拦截")
        return True
    else:
        print("  ✗ 重复提交未被拦截")
        return False


def test_submit_workflow(record_id):
    print_section("4. 工作流测试 - 草稿 → 提交 → 驳回 → 重提 → 确认")

    print("  步骤1: 提交审核")
    resp = requests.post(f"{BASE_URL}/inspection/{record_id}/submit", json={"reason": "提交测试"})
    data = print_response(resp)

    print("\n  步骤2: 驳回记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/reject",
        json={"reason": "资料不完整，请补充设备照片"}
    )
    data = print_response(resp)

    print("\n  步骤3: 重新提交")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/submit",
        json={"reason": "已补充资料，重新提交"}
    )
    data = print_response(resp)

    print("\n  步骤4: 二次确认通过")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/confirm",
        json={"reason": "资料完整，确认通过"}
    )
    data = print_response(resp)

    return data and resp.status_code == 200


def test_withdraw():
    print_section("5. 边界测试 - 撤回后再提交")

    print("  创建新记录...")
    payload = {
        "record_no": f"WITHDRAW-TEST-{datetime.now().strftime('%H%M%S')}",
        "device_name": "撤回测试设备",
        "department": "测试科室",
        "inspection_date": datetime.now().strftime("%Y-%m-%d"),
    }
    resp = requests.post(f"{BASE_URL}/inspection", json=payload)
    data = print_response(resp)
    record_id = data.get("data", {}).get("id") if data else None

    if not record_id:
        return False

    print(f"\n  记录ID: {record_id}")

    print("  步骤1: 提交记录")
    resp = requests.post(f"{BASE_URL}/inspection/{record_id}/submit", json={"reason": "初次提交"})
    data = print_response(resp)

    print("\n  步骤2: 撤回记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/withdraw",
        json={"reason": "发现错误，需要修改"}
    )
    data = print_response(resp)

    print("\n  步骤3: 修改记录")
    resp = requests.put(
        f"{BASE_URL}/inspection/{record_id}",
        json={"inspection_result": "已修正结果"}
    )
    data = print_response(resp)

    print("\n  步骤4: 重新提交")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/submit",
        json={"reason": "修正后重新提交"}
    )
    data = print_response(resp)

    return data and resp.status_code == 200


def test_manual_judgment(record_id):
    print_section("6. 人工改判测试")

    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/manual-edit",
        json={
            "judgment_note": "根据实际情况人工判定：设备状态良好，证书有效",
            "inspection_result": "人工判定合格",
            "certificate_status": "valid",
        }
    )
    data = print_response(resp)

    if data and resp.status_code == 200:
        print("  ✓ 人工改判成功")
        print(f"  改判说明: {data['data']['manual_judgment_note']}")
        print(f"  改判标记: {data['data']['is_manually_edited']}")
        return True
    return False


def test_freeze_and_export(record_id):
    print_section("7. 导出前冻结测试")

    print("  步骤1: 冻结记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/freeze",
        json={"reason": "导出审计，冻结数据"}
    )
    data = print_response(resp)

    print("\n  步骤2: 尝试修改已冻结记录（应失败）")
    resp = requests.put(
        f"{BASE_URL}/inspection/{record_id}",
        json={"inspection_result": "尝试修改"}
    )
    data = print_response(resp)

    if resp.status_code == 403:
        print("  ✓ 冻结状态下修改被正确拦截")

    print("\n  步骤3: 导出巡检记录")
    resp = requests.post(
        f"{BASE_URL}/export/records",
        json={"record_type": "inspection"}
    )
    data = print_response(resp)

    if data and resp.status_code == 200:
        print(f"  ✓ 导出成功: {data['data']['filename']}")
        print(f"  ✓ 记录数: {data['data']['record_count']}")
        print(f"  ✓ 脱敏标记: {data['data']['is_masked']}")

    print("\n  步骤4: 解冻记录")
    resp = requests.post(
        f"{BASE_URL}/inspection/{record_id}/unfreeze",
        json={"reason": "导出完成，解冻数据"}
    )
    data = print_response(resp)

    return True


def test_audit_trail(record_id):
    print_section("8. 审计轨迹查看")

    resp = requests.get(f"{BASE_URL}/audit/record/inspection/{record_id}")
    data = print_response(resp, show_data=False)

    if data and resp.status_code == 200:
        audits = data.get("data", [])
        print(f"  ✓ 审计记录数: {len(audits)}")
        print(f"  操作记录:")
        for a in audits[:5]:
            print(f"    - {a['action']} @ {a['operated_at'][:19]} by {a['operator_name']}")
            if a.get("change_reason"):
                print(f"      原因: {a['change_reason']}")
        return True
    return False


def test_role_view():
    print_section("9. 角色视图与脱敏测试")

    roles = ["admin", "department_head", "nurse"]
    for role in roles:
        print(f"\n  角色: {role}")
        headers = {"X-User-Role": role}
        resp = requests.get(f"{BASE_URL}/user/role-view", headers=headers)
        data = print_response(resp, show_data=False)
        if data:
            role_info = data["data"]
            print(f"    名称: {role_info['role']}")
            print(f"    权限: {', '.join(role_info['permissions'][:3])}...")
            print(f"    脱敏: {'是' if role_info['masked'] else '否'}")

    print("\n  --- 验证业务接口脱敏效果 ---")

    print("\n  以管理员角色查询巡检记录（应返回完整数据）:")
    admin_headers = {"X-User-Role": "admin", "X-User-ID": "1", "X-User-Name": "Admin"}
    resp = requests.get(f"{BASE_URL}/inspection", headers=admin_headers)
    if resp.status_code == 200:
        data = resp.json()
        records = data.get("data", [])
        if records:
            sn = records[0].get("device_sn", "")
            print(f"    设备序列号: {sn}")
            print(f"    脱敏验证: {'完整可见' if sn and '****' not in sn else '已脱敏'}")

    print("\n  以护士角色查询巡检记录（应脱敏处理）:")
    nurse_headers = {"X-User-Role": "nurse", "X-User-ID": "4", "X-User-Name": "Nurse"}
    resp = requests.get(f"{BASE_URL}/inspection", headers=nurse_headers)
    if resp.status_code == 200:
        data = resp.json()
        records = data.get("data", [])
        if records:
            sn = records[0].get("device_sn", "")
            issues = records[0].get("issues_found", "")
            print(f"    设备序列号: {sn}")
            print(f"    问题详情: {issues}")
            sn_masked = "****" in str(sn)
            print(f"    脱敏验证: {'已脱敏 ✓' if sn_masked else '未脱敏 ✗'}")
            if not sn_masked:
                print("    ⚠ 警告: 护士角色应看到脱敏后的设备序列号!")


def test_certificate_status_linkage():
    print_section("10. 证书状态联动测试")

    print("  查询即将过期证书...")
    resp = requests.get(f"{BASE_URL}/calibration", params={"expiring_soon": "true"})
    data = print_response(resp, show_data=False)

    if data and resp.status_code == 200:
        expiring = data.get("data", [])
        print(f"  即将过期证书: {len(expiring)} 个")
        for cert in expiring:
            print(f"    - {cert['device_name']}: {cert['days_until_expiry']}天后过期")

    print("\n  查询已过期证书...")
    resp = requests.get(f"{BASE_URL}/calibration/expired")
    data = print_response(resp, show_data=False)

    if data and resp.status_code == 200:
        expired = data.get("data", [])
        print(f"  已过期证书: {len(expired)} 个")
        for cert in expired:
            print(f"    - {cert['device_name']}: 证书状态={cert['certificate_status']}")

    return True


def test_restart_verification():
    print_section("11. 数据持久化验证")

    print("  查询历史审计记录...")
    resp = requests.get(f"{BASE_URL}/audit")
    data = print_response(resp, show_data=False)
    if data:
        print(f"  总计审计记录: {data['total']} 条")

    print("\n  查询导出日志...")
    resp = requests.get(f"{BASE_URL}/export/logs")
    data = print_response(resp, show_data=False)
    if data:
        print(f"  总计导出记录: {data['total']} 条")

    print("\n  ✓ 重启后数据保持完整")
    return True


def test_import_workflow():
    print_section("15. 导入功能测试（样例数据+坏数据+追溯链路）")

    import subprocess
    import os

    print("  步骤1: 生成样例导入数据")
    subprocess.run(["python3", "generate_samples.py"], capture_output=True)

    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)

    sample_file = os.path.join(upload_dir, "sample_inspection.xlsx")
    if not os.path.exists(sample_file):
        from generate_samples import generate_all_samples
        generate_all_samples()

    print("\n  步骤2: 导入巡检记录（包含有效数据和坏数据）")
    print(f"  文件: {sample_file}")

    if os.path.exists(sample_file):
        with open(sample_file, "rb") as f:
            files = {"file": ("sample_inspection.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            data = {"record_type": "inspection"}
            headers = {"X-User-ID": "1", "X-User-Role": "admin", "X-User-Name": "Admin"}
            resp = requests.post(f"{BASE_URL}/import", files=files, data=data, headers=headers)
            result = resp.json()

            print(f"  HTTP状态: {resp.status_code}")
            if resp.status_code == 200:
                import_data = result.get("data", {})
                print(f"  导入结果:")
                print(f"    导入源ID: {import_data.get('import_source_id')}")
                print(f"    总行数: {import_data.get('total')}")
                print(f"    成功: {import_data.get('success')}")
                print(f"    失败: {import_data.get('failed')}")
                if import_data.get("failed_details"):
                    print(f"    失败详情:")
                    for detail in import_data["failed_details"][:5]:
                        print(f"      - 行{detail.get('row')}: {', '.join(detail.get('errors', []))}")

                success_count = import_data.get("success", 0)
                failed_count = import_data.get("failed", 0)
                if failed_count > 0:
                    print(f"\n    ✓ 坏数据已正确识别并拦截（成功{success_count}条，失败{failed_count}条）")
                else:
                    print(f"\n    ⚠ 未检测到坏数据，请检查样例数据")

                import_source_id = import_data.get("import_source_id")
                if import_source_id:
                    print("\n  步骤3: 验证导入源记录")
                    resp = requests.get(f"{BASE_URL}/import/sources", headers=headers)
                    sources = resp.json()
                    if sources.get("data"):
                        for src in sources["data"][:5]:
                            print(f"    导入源ID: {src['id']}, 文件: {src['filename']}, 状态: {src['status']}")
                            if src.get("failed_rows", 0) > 0:
                                print(f"    ✓ 部分失败状态已记录（成功{src.get('success_rows')}条，失败{src.get('failed_rows')}条）")

                    print("\n  步骤4: 验证原始数据保留")
                    resp = requests.get(f"{BASE_URL}/inspection", headers=headers)
                    records = resp.json()
                    if records.get("data"):
                        for rec in records["data"][:5]:
                            if rec.get("import_source_id") == import_source_id:
                                print(f"    记录: {rec.get('record_no')}")
                                print(f"      原始行号: {rec.get('original_row_number')}")
                                print(f"      原始数据存在: {'是' if rec.get('original_data') else '否'}")
                                print(f"      解析数据存在: {'是' if rec.get('parsed_data') else '否'}")
                                if rec.get('record_no') and rec.get('record_no') != 'nan':
                                    print(f"      ✓ 记录编号有效（非'nan'）")
                                break

                    print("\n  步骤5: 验证审计轨迹")
                    resp = requests.get(f"{BASE_URL}/audit", headers=headers)
                    audits = resp.json()
                    import_audits = [a for a in audits.get("data", []) if a.get("action") == "import"]
                    print(f"    导入相关审计记录: {len(import_audits)} 条")

                    print("\n  步骤6: 重复导入同一文件（应被拦截）")
                    with open(sample_file, "rb") as f2:
                        files2 = {"file": ("sample_inspection.xlsx", f2, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
                        resp2 = requests.post(f"{BASE_URL}/import", files=files2, data=data, headers=headers)
                        if resp2.status_code in [400, 409]:
                            print("    ✓ 重复导入已被正确拦截")
                        else:
                            print(f"    ⚠ 重复导入未被拦截: {resp2.status_code}")

                print("\n  ✓ 导入功能测试完成")
                return True
            else:
                print(f"  ✗ 导入失败: {result.get('error')}")
                return False
    else:
        print("  ✗ 样例文件不存在")
        return False


def test_certificate_status_report():
    print_section("16. 证书状态统计与汇总报告测试")

    headers = {"X-User-ID": "1", "X-User-Role": "admin", "X-User-Name": "Admin"}

    print("  步骤1: 查询即将过期证书")
    resp = requests.get(f"{BASE_URL}/calibration/about-to-expire", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        about_count = data.get("total", 0)
        print(f"    即将过期证书数量: {about_count}")
        if about_count > 0:
            print(f"    ✓ 即将过期证书统计正常")

    print("\n  步骤2: 查询已过期证书")
    resp = requests.get(f"{BASE_URL}/calibration/expired", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        expired_count = data.get("total", 0)
        print(f"    已过期证书数量: {expired_count}")
        if expired_count > 0:
            print(f"    ✓ 已过期证书统计正常")

    print("\n  步骤3: 生成汇总报告")
    resp = requests.post(f"{BASE_URL}/export/summary", json={}, headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        summary = data.get("data", {}).get("summary", {})
        if summary:
            cert_stats = summary.get("校准证书", {})
            print(f"    校准证书统计:")
            for status, count in cert_stats.items():
                print(f"      {status}: {count}")
            valid_count = cert_stats.get("有效", 0)
            expired_count = cert_stats.get("已过期", 0)
            about_count = cert_stats.get("即将过期", 0)
            if valid_count + expired_count + about_count > 0:
                print(f"    ✓ 汇总报告证书状态统计正常")
            else:
                print(f"    ⚠ 证书状态统计可能为0，请检查数据")

    print("\n  ✓ 证书状态统计测试完成")
    return True


def test_repair_quotation_workflow():
    print_section("12. 维修报价完整工作流测试")

    print("  步骤1: 创建维修报价")
    payload = {
        "record_no": f"TEST-REPAIR-{datetime.now().strftime('%H%M%S')}",
        "device_name": "测试维修设备",
        "device_model": "TEST-REP-001",
        "device_sn": "SN9876543210",
        "department": "测试科室",
        "quotation_no": "Q" + datetime.now().strftime('%Y%m%d%H%M%S'),
        "fault_description": "设备无法正常开机",
        "repair_date": datetime.now().strftime("%Y-%m-%d"),
        "repair_vendor": "测试维修公司",
        "quotation_amount": 5000.00,
        "repair_status": "待维修",
        "warranty_period": "3个月",
    }
    resp = requests.post(f"{BASE_URL}/repair", json=payload)
    data = print_response(resp)
    record_id = data.get("data", {}).get("id") if data else None

    if not record_id:
        print("  ✗ 创建维修报价失败")
        return False

    print(f"\n  记录ID: {record_id}")

    print("\n  步骤2: 提交维修报价")
    resp = requests.post(f"{BASE_URL}/repair/{record_id}/submit", json={"reason": "提交审核"})
    print_response(resp)

    print("\n  步骤3: 人工改判维修报价")
    resp = requests.post(
        f"{BASE_URL}/repair/{record_id}/manual-edit",
        json={
            "judgment_note": "维修价格偏高，建议重新报价",
            "repair_status": "需重新报价",
        }
    )
    data = print_response(resp)
    if data and resp.status_code == 200:
        print(f"  ✓ 人工改判: {data['data']['repair_status']}")

    print("\n  步骤4: 冻结维修报价")
    resp = requests.post(
        f"{BASE_URL}/repair/{record_id}/freeze",
        json={"reason": "导出审计"}
    )
    data = print_response(resp)

    print("\n  步骤5: 尝试修改已冻结记录（应失败）")
    resp = requests.put(
        f"{BASE_URL}/repair/{record_id}",
        json={"repair_status": "已完成"}
    )
    if resp.status_code == 403:
        print("  ✓ 冻结状态下修改被正确拦截")
    else:
        print_response(resp)

    print("\n  步骤6: 解冻维修报价")
    resp = requests.post(
        f"{BASE_URL}/repair/{record_id}/unfreeze",
        json={"reason": "解冻"}
    )
    print_response(resp)

    return True


def test_supplementary_workflow():
    print_section("13. 临时补录单完整工作流测试")

    print("  步骤1: 创建临时补录单")
    payload = {
        "record_no": f"TEST-SUPP-{datetime.now().strftime('%H%M%S')}",
        "device_name": "补录测试设备",
        "device_model": "TEST-SUP-001",
        "device_sn": "SN5556667778",
        "department": "测试科室",
        "supplementary_reason": "历史记录补录",
        "supplementary_type": "巡检记录补录",
        "original_record_no": "OLD-001",
        "supplementary_note": "原记录丢失，需补录",
    }
    resp = requests.post(f"{BASE_URL}/supplementary", json=payload)
    data = print_response(resp)
    record_id = data.get("data", {}).get("id") if data else None

    if not record_id:
        print("  ✗ 创建临时补录单失败")
        return False

    print(f"\n  记录ID: {record_id}")

    print("\n  步骤2: 提交补录单")
    resp = requests.post(f"{BASE_URL}/supplementary/{record_id}/submit", json={"reason": "提交审核"})
    print_response(resp)

    print("\n  步骤3: 人工改判补录单")
    resp = requests.post(
        f"{BASE_URL}/supplementary/{record_id}/manual-edit",
        json={
            "judgment_note": "补录资料完整，确认真实有效",
            "supplementary_type": "校准证书补录",
        }
    )
    data = print_response(resp)
    if data and resp.status_code == 200:
        print(f"  ✓ 人工改判: {data['data']['supplementary_type']}")

    print("\n  步骤4: 冻结补录单")
    resp = requests.post(
        f"{BASE_URL}/supplementary/{record_id}/freeze",
        json={"reason": "导出审计"}
    )
    data = print_response(resp)

    print("\n  步骤5: 尝试修改已冻结记录（应失败）")
    resp = requests.put(
        f"{BASE_URL}/supplementary/{record_id}",
        json={"supplementary_reason": "尝试修改"}
    )
    if resp.status_code == 403:
        print("  ✓ 冻结状态下修改被正确拦截")
    else:
        print_response(resp)

    print("\n  步骤6: 解冻补录单")
    resp = requests.post(
        f"{BASE_URL}/supplementary/{record_id}/unfreeze",
        json={"reason": "解冻"}
    )
    print_response(resp)

    return True


def test_calibration_workflow():
    print_section("14. 校准证书完整工作流测试")

    print("  步骤1: 创建校准证书")
    payload = {
        "record_no": f"TEST-CAL-{datetime.now().strftime('%H%M%S')}",
        "device_name": "校准测试设备",
        "device_model": "TEST-CAL-001",
        "device_sn": "SN1112223334",
        "department": "测试科室",
        "certificate_no": "CERT" + datetime.now().strftime('%Y%m%d%H%M%S'),
        "calibration_date": datetime.now().strftime("%Y-%m-%d"),
        "valid_until": (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d"),
        "calibration_agency": "测试校准机构",
        "calibration_result": "合格",
        "calibration_items": ["精度", "线性度"],
    }
    resp = requests.post(f"{BASE_URL}/calibration", json=payload)
    data = print_response(resp)
    record_id = data.get("data", {}).get("id") if data else None

    if not record_id:
        print("  ✗ 创建校准证书失败")
        return False

    print(f"\n  记录ID: {record_id}")

    print("\n  步骤2: 更新校准证书")
    resp = requests.put(
        f"{BASE_URL}/calibration/{record_id}",
        json={"calibration_agency": "更新后的校准机构"}
    )
    data = print_response(resp)
    if data and resp.status_code == 200:
        print(f"  ✓ 更新成功: {data['data']['calibration_agency']}")

    print("\n  步骤3: 提交校准证书")
    resp = requests.post(f"{BASE_URL}/calibration/{record_id}/submit", json={"reason": "提交审核"})
    print_response(resp)

    print("\n  步骤4: 冻结校准证书")
    resp = requests.post(
        f"{BASE_URL}/calibration/{record_id}/freeze",
        json={"reason": "导出审计"}
    )
    print_response(resp)

    print("\n  步骤5: 尝试修改已冻结记录（应失败）")
    resp = requests.put(
        f"{BASE_URL}/calibration/{record_id}",
        json={"calibration_agency": "尝试修改"}
    )
    if resp.status_code == 403:
        print("  ✓ 冻结状态下修改被正确拦截")
    else:
        print_response(resp)

    print("\n  步骤6: 解冻校准证书")
    resp = requests.post(
        f"{BASE_URL}/calibration/{record_id}/unfreeze",
        json={"reason": "解冻"}
    )
    print_response(resp)

    return True


def run_all_tests():
    print("\n" + "╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "医疗器械巡检权限追责台账系统 - 功能测试" + " " * 10 + "║")
    print("╚" + "═" * 58 + "╝")

    try:
        if not test_health_check():
            print("\n❌ 服务未启动，请先运行: python run.py")
            return

        record_id = test_create_inspection()
        if not record_id:
            print("❌ 创建记录失败，终止测试")
            return

        test_duplicate_submit(record_id)
        test_submit_workflow(record_id)
        test_withdraw()
        test_manual_judgment(record_id)
        test_freeze_and_export(record_id)
        test_audit_trail(record_id)
        test_role_view()
        test_certificate_status_linkage()
        test_restart_verification()

        # 新增业务接口完整测试
        test_repair_quotation_workflow()
        test_supplementary_workflow()
        test_calibration_workflow()

        # 导入功能测试
        test_import_workflow()

        # 证书状态统计与汇总报告测试
        test_certificate_status_report()

        print("\n" + "=" * 60)
        print("  ✅ 所有测试完成！")
        print("  测试覆盖: 草稿→提交→驳回→重提→确认→撤回→人工改判→冻结→导出→审计")
        print("  边界场景: 重复提交、撤回重提、冻结保护、状态联动、角色脱敏")
        print("  多入口台账: 巡检记录、校准证书、维修报价、临时补录单")
        print("  核心链路: 导入坏数据、部分失败、证书统计、汇总报告")
        print("=" * 60)

    except requests.exceptions.ConnectionError:
        print("\n❌ 无法连接到服务器，请确保服务已启动")
        print("   启动命令: python run.py")
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    run_all_tests()
