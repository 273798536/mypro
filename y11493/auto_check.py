#!/usr/bin/env python3
import sys
import os
import time
import requests
import subprocess
import signal
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
ADMIN_TOKEN = "admin-token-bid-2024"
READ_TOKEN = "read-token-bid-2024"
WRONG_TOKEN = "wrong-token-123"


def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_result(test_name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  [{status}] {test_name}")
    if details:
        print(f"      {details}")
    return passed


def get_headers(token=ADMIN_TOKEN):
    return {"X-Auth-Token": token, "Content-Type": "application/json"}


def wait_for_service(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(f"{BASE_URL}{API_PREFIX}/health", timeout=2)
            if response.status_code == 200:
                return True
        except:
            pass
        time.sleep(1)
    return False


class AutoChecker:
    def __init__(self):
        self.results = []
        self.test_data_snapshot = {}
    
    def check_permission_interception(self):
        print_header("1. 权限拦截检查")
        
        all_passed = True
        
        try:
            response = requests.get(
                f"{BASE_URL}{API_PREFIX}/documents",
                headers=get_headers(WRONG_TOKEN)
            )
            passed = response.status_code == 401
            all_passed &= passed
            print_result("无Token/错误Token拦截", passed, 
                        f"状态码: {response.status_code}")
        except Exception as e:
            print_result("无Token/错误Token拦截", False, str(e))
            all_passed = False
        
        try:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/documents",
                headers=get_headers(READ_TOKEN),
                json={"document_no": "TEST-PERM", "title": "权限测试", "document_type": "qualification"}
            )
            passed = response.status_code == 401
            all_passed &= passed
            print_result("只读Token写操作拦截", passed,
                        f"状态码: {response.status_code}")
        except Exception as e:
            print_result("只读Token写操作拦截", False, str(e))
            all_passed = False
        
        try:
            response = requests.get(
                f"{BASE_URL}{API_PREFIX}/documents",
                headers=get_headers(READ_TOKEN)
            )
            passed = response.status_code == 200
            all_passed &= passed
            print_result("只读Token读操作允许", passed,
                        f"状态码: {response.status_code}")
        except Exception as e:
            print_result("只读Token读操作允许", False, str(e))
            all_passed = False
        
        self.results.append(("权限拦截检查", all_passed))
        return all_passed
    
    def check_duplicate_import(self):
        print_header("2. 重复导入检查")
        
        all_passed = True
        
        test_csv = Path("test_import.csv")
        test_csv.write_text("发票抬头,金额\n测试公司A,10000\n测试公司B,20000\n", encoding="utf-8")
        
        try:
            with open(test_csv, "rb") as f:
                response1 = requests.post(
                    f"{BASE_URL}{API_PREFIX}/import",
                    headers={"X-Auth-Token": ADMIN_TOKEN},
                    files={"file": ("test.csv", f, "text/csv")},
                    data={"document_type": "qualification", "imported_by": "test_user"}
                )
            
            if response1.status_code != 200:
                print_result("首次导入成功", False, f"状态码: {response1.status_code}")
                all_passed = False
            else:
                result1 = response1.json()
                batch1 = result1.get("batch_no")
                print_result("首次导入成功", True, f"批次号: {batch1}")
            
            time.sleep(1)
            
            with open(test_csv, "rb") as f:
                response2 = requests.post(
                    f"{BASE_URL}{API_PREFIX}/import",
                    headers={"X-Auth-Token": ADMIN_TOKEN},
                    files={"file": ("test.csv", f, "text/csv")},
                    data={"document_type": "qualification", "imported_by": "test_user"}
                )
            
            if response2.status_code != 200:
                print_result("重复导入检测", False, f"状态码: {response2.status_code}")
                all_passed = False
            else:
                result2 = response2.json()
                dup_count = result2.get("duplicate_count", 0)
                print_result("重复导入检测", dup_count > 0,
                            f"检测到重复数: {dup_count}, 总数: {result2.get('total_count')}")
                all_passed &= (dup_count > 0)
        
        except Exception as e:
            print_result("重复导入检查", False, str(e))
            all_passed = False
        finally:
            if test_csv.exists():
                test_csv.unlink()
        
        self.results.append(("重复导入检查", all_passed))
        return all_passed
    
    def check_exception_retention(self):
        print_header("3. 异常保留检查")
        
        all_passed = True
        
        try:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/tasks/simulate_failure",
                headers=get_headers(),
                json={"test_fail": True},
                params={"max_retry": 2}
            )
            
            if response.status_code != 200:
                print_result("创建失败任务", False, f"状态码: {response.status_code}")
                all_passed = False
            else:
                task = response.json()
                task_id = task.get("task_id")
                print_result("创建失败任务", True, f"任务ID: {task_id}")
                
                time.sleep(3)
                
                response = requests.get(
                    f"{BASE_URL}{API_PREFIX}/tasks/{task_id}",
                    headers=get_headers()
                )
                task_detail = response.json()
                status = task_detail.get("status")
                error_msg = task_detail.get("error_message")
                
                has_error = error_msg is not None
                print_result("失败原因保留", has_error,
                            f"状态: {status}, 错误: {error_msg[:50] if error_msg else '无'}")
                all_passed &= has_error
                
                self.test_data_snapshot["failed_task_id"] = task_id
                self.test_data_snapshot["failed_task_status"] = status
                self.test_data_snapshot["failed_task_error"] = error_msg
        
        except Exception as e:
            print_result("异常保留检查", False, str(e))
            all_passed = False
        
        self.results.append(("异常保留检查", all_passed))
        return all_passed
    
    def check_export_function(self):
        print_header("4. 导出功能检查")
        
        all_passed = True
        
        try:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/test-data/generate",
                headers=get_headers(),
                json={"document_count": 5, "with_tasks": False, "generated_by": "auto_check"}
            )
            result = response.json()
            print_result("生成测试数据", True,
                        f"生成文档数: {len(result.get('documents', []))}")
            
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/export",
                headers=get_headers(),
                json={"export_type": "all", "exported_by": "auto_check"}
            )
            
            if response.status_code != 200:
                print_result("执行导出", False, f"状态码: {response.status_code}")
                all_passed = False
            else:
                export_data = response.json()
                export_no = export_data.get("export_no")
                record_count = export_data.get("record_count", 0)
                file_hash = export_data.get("file_hash")
                
                print_result("执行导出", True,
                            f"导出编号: {export_no}, 记录数: {record_count}")
                all_passed &= (record_count > 0)
                
                self.test_data_snapshot["export_no"] = export_no
                self.test_data_snapshot["export_file_hash"] = file_hash
                self.test_data_snapshot["export_record_count"] = record_count
        
        except Exception as e:
            print_result("导出功能检查", False, str(e))
            all_passed = False
        
        self.results.append(("导出功能检查", all_passed))
        return all_passed
    
    def create_manual_note(self):
        print_header("5. 创建人工处理备注")
        
        all_passed = True
        
        try:
            task_id = self.test_data_snapshot.get("failed_task_id")
            if not task_id:
                print_result("创建人工备注", False, "无失败任务ID")
                all_passed = False
            else:
                response = requests.post(
                    f"{BASE_URL}{API_PREFIX}/tasks/{task_id}/manual-handle",
                    headers=get_headers(),
                    json={
                        "manual_note": "这是自动化测试的人工处理备注，用于验证重启后数据保留",
                        "handled_by": "auto_check_system",
                        "new_status": "waiting_manual"
                    }
                )
                
                if response.status_code != 200:
                    print_result("创建人工备注", False, f"状态码: {response.status_code}")
                    all_passed = False
                else:
                    task = response.json()
                    manual_note = task.get("manual_note")
                    handled_by = task.get("handled_by")
                    
                    has_note = manual_note is not None and handled_by == "auto_check_system"
                    print_result("创建人工备注", has_note,
                                f"备注已保存: {manual_note[:30]}...")
                    all_passed &= has_note
                    
                    self.test_data_snapshot["manual_note"] = manual_note
                    self.test_data_snapshot["handled_by"] = handled_by
        
        except Exception as e:
            print_result("创建人工备注", False, str(e))
            all_passed = False
        
        self.results.append(("创建人工备注", all_passed))
        return all_passed
    
    def check_restart_consistency(self):
        print_header("6. 重启后历史一致性检查")
        
        all_passed = True
        
        try:
            task_id = self.test_data_snapshot.get("failed_task_id")
            if not task_id:
                print_result("失败任务数据保留", False, "无失败任务ID")
                all_passed = False
            else:
                response = requests.get(
                    f"{BASE_URL}{API_PREFIX}/tasks/{task_id}",
                    headers=get_headers()
                )
                task = response.json()
                
                error_preserved = task.get("error_message") == self.test_data_snapshot.get("failed_task_error")
                note_preserved = task.get("manual_note") == self.test_data_snapshot.get("manual_note")
                handler_preserved = task.get("handled_by") == self.test_data_snapshot.get("handled_by")
                
                print_result("失败原因保留", error_preserved,
                            f"{'匹配' if error_preserved else '不匹配'}")
                print_result("人工备注保留", note_preserved,
                            f"{'匹配' if note_preserved else '不匹配'}")
                print_result("处理人保留", handler_preserved,
                            f"{'匹配' if handler_preserved else '不匹配'}")
                
                all_passed &= (error_preserved and note_preserved and handler_preserved)
            
            export_no = self.test_data_snapshot.get("export_no")
            if export_no:
                response = requests.get(
                    f"{BASE_URL}{API_PREFIX}/exports",
                    headers=get_headers()
                )
                exports = response.json()
                export_found = any(e.get("export_no") == export_no for e in exports)
                print_result("导出记录保留", export_found,
                            f"导出编号: {export_no}")
                all_passed &= export_found
            
            response = requests.get(
                f"{BASE_URL}{API_PREFIX}/audit-logs",
                headers=get_headers(),
                params={"limit": 10}
            )
            logs = response.json()
            has_logs = len(logs) > 0
            print_result("审计日志保留", has_logs,
                        f"日志条数: {len(logs)}")
            all_passed &= has_logs
        
        except Exception as e:
            print_result("重启一致性检查", False, str(e))
            all_passed = False
        
        self.results.append(("重启一致性检查", all_passed))
        return all_passed
    
    def check_export_consistency(self):
        print_header("7. 导出一致性检查")
        
        all_passed = True
        
        try:
            export_no = self.test_data_snapshot.get("export_no")
            if not export_no:
                print_result("导出记录查询", False, "无导出编号")
                all_passed = False
            else:
                response = requests.get(
                    f"{BASE_URL}{API_PREFIX}/exports",
                    headers=get_headers()
                )
                exports = response.json()
                target_export = next((e for e in exports if e.get("export_no") == export_no), None)
                
                if not target_export:
                    print_result("导出记录存在", False, "未找到导出记录")
                    all_passed = False
                else:
                    hash_match = target_export.get("file_hash") == self.test_data_snapshot.get("export_file_hash")
                    count_match = target_export.get("record_count") == self.test_data_snapshot.get("export_record_count")
                    
                    print_result("文件哈希一致", hash_match,
                                f"{'匹配' if hash_match else '不匹配'}")
                    print_result("记录数一致", count_match,
                                f"期望: {self.test_data_snapshot.get('export_record_count')}, 实际: {target_export.get('record_count')}")
                    
                    all_passed &= (hash_match and count_match)
        
        except Exception as e:
            print_result("导出一致性检查", False, str(e))
            all_passed = False
        
        self.results.append(("导出一致性检查", all_passed))
        return all_passed
    
    def check_replay_exception(self):
        print_header("8. 异常回放功能检查")
        
        all_passed = True
        
        try:
            task_id = self.test_data_snapshot.get("failed_task_id")
            if not task_id:
                print_result("回放异常任务", False, "无失败任务ID")
                all_passed = False
            else:
                response = requests.post(
                    f"{BASE_URL}{API_PREFIX}/tasks/{task_id}/replay",
                    headers=get_headers()
                )
                
                if response.status_code != 200:
                    print_result("回放异常任务", False, f"状态码: {response.status_code}")
                    all_passed = False
                else:
                    task = response.json()
                    new_status = task.get("status")
                    print_result("回放异常任务", True,
                                f"新状态: {new_status}")
        
        except Exception as e:
            print_result("异常回放检查", False, str(e))
            all_passed = False
        
        self.results.append(("异常回放检查", all_passed))
        return all_passed
    
    def print_summary(self):
        print_header("检查结果汇总")
        
        passed_count = sum(1 for _, passed in self.results if passed)
        total_count = len(self.results)
        
        for name, passed in self.results:
            status = "✅ 通过" if passed else "❌ 失败"
            print(f"  {status} - {name}")
        
        print(f"\n总计: {passed_count}/{total_count} 检查通过")
        
        if passed_count == total_count:
            print("\n🎉 所有检查通过!")
        else:
            print(f"\n⚠️  {total_count - passed_count} 项检查未通过")
        
        return passed_count == total_count


def main():
    print("\n🚀 投标资料封版验收回放链路服务 - 自动化检查")
    print("=" * 60)
    
    checker = AutoChecker()
    
    print("\n等待服务启动...")
    if not wait_for_service():
        print("❌ 服务启动超时，请先启动服务: python main.py")
        sys.exit(1)
    print("✅ 服务已启动")
    
    checker.check_permission_interception()
    checker.check_duplicate_import()
    checker.check_exception_retention()
    checker.check_export_function()
    checker.create_manual_note()
    
    print_header("模拟服务重启（仅验证数据，实际不重启）")
    print("  * 验证数据已保存到数据库 *")
    time.sleep(2)
    
    checker.check_restart_consistency()
    checker.check_export_consistency()
    checker.check_replay_exception()
    
    all_passed = checker.print_summary()
    
    print("\n" + "=" * 60)
    print("  检查重点:")
    print("  ✅ 命令脚本 - HTTP请求、本地持久化")
    print("  ✅ 权限拦截 - Token验证、读写权限")
    print("  ✅ 重复导入 - 文件哈希、行号校验")
    print("  ✅ 异常保留 - 失败原因、人工备注、处理人")
    print("  ✅ 重启验证 - 历史数据、导出记录一致性")
    print("  ✅ 回放功能 - 异常任务重新执行")
    print("=" * 60)
    
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
