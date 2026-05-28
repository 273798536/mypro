#!/usr/bin/env python3
"""跨境结算到账裂缝 API 完整流程测试脚本"""
import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse

BASE_URL = "http://127.0.0.1:8000"


def api_call(path, method="GET", data=None):
    url = BASE_URL + path
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    body = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=body, timeout=30) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.getcode(), json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return e.code, json.loads(err_body) if err_body else {"error": "HTTP Error"}
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}


def wait_for_server(timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            code, resp = api_call("/")
            if code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def run_test():
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 60)
    print("跨境结算到账裂缝 API - 完整流程测试")
    print("=" * 60)

    print("\n[0/8] 清理旧数据库...")
    if os.path.exists("settlement.db"):
        os.remove("settlement.db")
        print("✓ 旧数据库已清理")

    print("\n[0.5/8] 启动服务...")
    server_proc = subprocess.Popen(
        ["/Users/mac/Library/Python/3.9/bin/uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(3)

    try:
        print("\n[1/8] 等待服务启动...")
        if not wait_for_server():
            print("✗ 服务启动超时")
            return False
        print("✓ 服务已启动")

        print("\n[2/8] 导入样例数据...")
        code, resp = api_call("/api/import/sample", method="POST")
        if code != 200:
            print(f"✗ 导入失败: {resp}")
            return False
        print(f"✓ 订单: {resp['orders']['imported']} 条, 水单: {resp['bank_slips']['imported']} 条, 账单: {resp['platform_bills']['imported']} 条")
        if resp["orders"]["skipped_duplicates"]:
            print(f"  订单重复跳过: {resp['orders']['skipped_duplicates']}")
        if resp["bank_slips"]["skipped_duplicates"]:
            print(f"  水单重复跳过: {resp['bank_slips']['skipped_duplicates']}")
        if resp["bank_slips"]["corrections"]:
            print("\n  ⚠ 水单缺字段修正提示:")
            for c in resp["bank_slips"]["corrections"]:
                print(f"    - {c}")
        if resp["platform_bills"]["corrections"]:
            print("\n  ⚠ 平台账单缺字段修正提示:")
            for c in resp["platform_bills"]["corrections"]:
                print(f"    - {c}")
        if resp["bank_slips"]["warnings"]:
            print("\n  ⚠ 水单警告:")
            for w in resp["bank_slips"]["warnings"]:
                print(f"    - {w}")

        print("\n[3/8] 跑到账匹配...")
        code, resp = api_call("/api/matching/run", method="POST")
        if code != 200:
            print(f"✗ 匹配失败: {resp}")
            return False
        print(f"✓ 匹配完成，共 {resp['matched_count']} 条记录")
        for r in resp["results"]:
            status = r.get("match_status", "?")
            color = "✓" if status == "matched" else "⚠" if status == "pending_confirm" else "!"
            print(f"  {color} 订单 {r['order_no']}: 状态={status}, 水单={r.get('slip_count',0)}张, 账单={r.get('bill_count',0)}张")
            if r.get("fee_deduction"):
                fd = r["fee_deduction"]
                print(f"    → 手续费检测: {fd.get('type')}, {fd.get('message')}")
                print(f"    → 后续动作: {fd.get('action')}")
            if r.get("rate_date_mismatch"):
                rm = r["rate_date_mismatch"]
                print(f"    → 汇率日期错用: {rm.get('message')}")
                print(f"    → 后续动作: {rm.get('action')}")

        print("\n[4/8] 查询结算列表...")
        code, resp = api_call("/api/settlements/")
        if code != 200:
            print(f"✗ 查询失败: {resp}")
            return False
        print(f"✓ 共 {len(resp)} 条结算记录")
        for s in resp:
            print(f"  - ID={s['id']}, 订单={s['order_id']}, 状态={s['match_status']}, 金额={s['original_amount']} {s['currency']}")

        print("\n[5/8] 查看手续费内扣详情（第一条手续费记录）...")
        fee_settlement_id = None
        code, settlements = api_call("/api/settlements/")
        for s in settlements:
            if s.get("fee_handling"):
                fee_settlement_id = s["id"]
                break
        if not fee_settlement_id:
            pending_resp = api_call("/api/settlements/pending-confirm/list")[1]
            for s in pending_resp:
                for slip in s.get("slips", []):
                    if slip.get("fee_deducted"):
                        fee_settlement_id = s["settlement_id"]
                        break
                if fee_settlement_id:
                    break

        if fee_settlement_id:
            code, resp = api_call(f"/api/settlements/{fee_settlement_id}/fee-deduction")
            if code == 200:
                print(f"✓ 结算ID {fee_settlement_id} 手续费详情:")
                print(f"  订单: {resp['order_no']}, 金额: {resp['order_amount']} {resp['order_currency']}")
                for slip in resp["slip_details"]:
                    print(f"  水单 {slip['slip_no']}: {slip['currency']} {slip['amount']}, 内扣={slip['fee_deducted']}, 手续费={slip['fee_amount']}")
                if resp.get("follow_up"):
                    print(f"  → 后续动作: {resp['follow_up']}")
        else:
            print("  未找到手续费记录，跳过")

        print("\n[6/8] 推进状态（手续费内扣确认）...")
        if fee_settlement_id:
            code, resp = api_call(
                f"/api/settlements/{fee_settlement_id}/advance",
                method="POST",
                data={
                    "to_status": "matched",
                    "fee_handling": "deducted",
                    "fee_amount": 200.00,
                    "operator": "test",
                    "notes": "确认手续费 200 EUR 内扣",
                },
            )
            if code == 200:
                print(f"✓ 状态从 {resp['from_status']} 推进到 {resp['to_status']}")
                for a in resp.get("actions", []):
                    print(f"  - {a}")
            else:
                print(f"  推进失败: {resp}")

        print("\n[7/8] 币种换算（matched → converted）...")
        if fee_settlement_id:
            code, resp = api_call(
                f"/api/settlements/{fee_settlement_id}/advance",
                method="POST",
                data={
                    "to_status": "converted",
                    "exchange_rate": 7.85,
                    "rate_date": "2026-05-24",
                    "operator": "test",
                },
            )
            if code == 200:
                print(f"✓ 换算完成: {resp['original_amount']} {resp['original_currency']} × {resp['exchange_rate']} = {resp['converted_amount']} {resp['target_currency']}")
                if resp.get("rate_date_mismatch"):
                    print(f"  ⚠ 汇率日期错用: {resp.get('rate_date_mismatch_action')}")
            else:
                print(f"  换算失败: {resp}")

        print("\n[8/8] 导出结果...")
        code, json_data = api_call("/api/export/json")
        if code == 200:
            with open("test_output.json", "w", encoding="utf-8") as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            print(f"✓ JSON 导出成功，共 {len(json_data)} 条记录 → test_output.json")
        else:
            print(f"✗ JSON 导出失败: {json_data}")

        code, csv_data = api_call("/api/export/csv")
        if code == 200:
            with open("test_output.csv", "w", encoding="utf-8") as f:
                f.write(csv_data)
            lines = csv_data.strip().split("\n")
            print(f"✓ CSV 导出成功，共 {len(lines) - 1} 条记录 → test_output.csv")
        else:
            print(f"✗ CSV 导出失败: {csv_data}")

        print("\n" + "=" * 60)
        print("✓ 全部测试通过！")
        print("=" * 60)
        return True
    finally:
        server_proc.terminate()
        server_proc.wait()


if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)
