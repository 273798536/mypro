#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.parse

BASE_URL = os.environ.get("TRACKER_BASE_URL", "http://localhost:9527")


def _http_get(path):
    with urllib.request.urlopen(f"{BASE_URL}{path}") as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_post(path, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def cmd_list_runs():
    data = _http_get("/api/runs")["data"]
    print(f"{'Run ID':<24} {'版本':<14} {'自动结论':<14} {'最终结论':<18} {'改判':<6} {'AUC降幅':<10}")
    print("-" * 90)
    for r in data:
        adj = "是" if r["has_adjustment"] else "否"
        print(f"{r['run_id']:<24} {r['compressed_model_version']:<14} {r['auto_conclusion']:<14} {r['final_conclusion']:<18} {adj:<6} {r['metrics_summary']['auc_drop']:<10}")


def cmd_show_run(run_id):
    data = _http_get(f"/api/run/{urllib.parse.quote(run_id)}")["data"]
    run = data["run"]
    print(f"=== {run['run_id']} ===")
    print(f"  压缩版本:     {run['compressed_model_version']}")
    print(f"  数据集版本:   {run['dataset_version']}")
    print(f"  自动结论:     {run['auto_conclusion']} — {run['auto_conclusion_reason']}")
    print(f"  最终结论:     {run['final_conclusion']}")
    print(f"  结论来源:     {run.get('final_conclusion_source', 'auto')}")
    print(f"  总体AUC降幅:  {run['metrics_summary']['auc_drop']}")
    print()
    for adj in data["adjustments"]:
        print(f"  [改判 {adj['adjustment_id']}] @ {adj['created_at']} by {adj['created_by_name']}")
        print(f"    {adj['original_conclusion']} -> {adj['new_conclusion']}")
        print(f"    原因: {adj['new_reason']}")
        print(f"    当前状态: {adj['status']}")
        if adj.get("next_action"):
            print(f"    下一步: {adj['next_action']}")
        for ev in adj.get("evidence_refs", []):
            if ev["type"] == "sample_row":
                print(f"    证据: 特征快照 row_id = {ev['row_ids']} — {ev['description']}")
            elif ev["type"] == "small_bucket":
                print(f"    证据: 小样本分桶 {ev['bucket_key']} — {ev['description']}")
            elif ev["type"] == "cross_run_compare":
                print(f"    证据: 版本对比 {ev['base_run_id']} vs {ev['target_run_id']} — {ev['description']}")
        print()
    susp = _http_get(f"/api/run/{urllib.parse.quote(run_id)}/suspicious")["data"]
    if susp["suspicious_samples"]:
        print(f"  可疑样本 ({len(susp['suspicious_samples'])} 条):")
        for s in susp["suspicious_samples"]:
            print(f"    row_id={s['row_id']} user={s['user_id']} item={s['item_id']} diff={s['pred_diff']:+.4f} {s.get('note','')}")
    if susp["small_sample_buckets"]:
        print(f"  小样本分桶 ({len(susp['small_sample_buckets'])} 个):")
        for b in susp["small_sample_buckets"]:
            print(f"    {b['bucket_key']} 样本数={b['sample_count']} AUC降幅={b['auc_drop']:+.4f} — {b['note']}")


def cmd_adjust(run_id, new_conclusion, reason, next_action=""):
    payload = {
        "run_id": run_id,
        "new_conclusion": new_conclusion,
        "new_reason": reason,
        "next_action": next_action,
        "status": "PENDING_CONFIRMATION",
    }
    resp = _http_post("/api/adjustment", payload)
    if resp["code"] == 0:
        print(f"改判已提交，调整单ID: {resp['data']['adjustment_id']}")
    else:
        print(f"提交失败: {resp['msg']}")


def cmd_confirm(adj_id, status="CONFIRMED", comment="", confirmed_by="tech_lead"):
    payload = {"status": status, "confirmed_by": confirmed_by, "comment": comment}
    resp = _http_post(f"/api/adjustment/{urllib.parse.quote(adj_id)}/status", payload)
    if resp["code"] == 0:
        print(f"状态已更新为: {resp['data']['status']}")
    else:
        print(f"更新失败: {resp['msg']}")


def print_help():
    print("用法:")
    print("  python scripts/cli.py list                            列出所有运行")
    print("  python scripts/cli.py show <run_id>                   查看指定运行详情")
    print("  python scripts/cli.py adjust <run_id> <结论> <原因> [下一步]  提交人工改判")
    print("         结论可选: NEEDS_REVIEW / CONDITIONAL_PASS / FAIL / PASS")
    print("  python scripts/cli.py confirm <adj_id> [状态] [备注]  确认改判")
    print("  python scripts/cli.py compare <base_run> <target_run> 对比两个版本")
    print()
    print("示例:")
    print("  python scripts/cli.py show run_20260618_001")
    print('  python scripts/cli.py adjust run_20260618_001 NEEDS_REVIEW "小样本被均值掩盖" "补充数据"')


def cmd_compare(base, target):
    data = _http_get(f"/api/compare?base={urllib.parse.quote(base)}&target={urllib.parse.quote(target)}")["data"]
    b = data["base"]["metrics"]
    t = data["target"]["metrics"]
    print(f"对比: {base} -> {target}")
    print(f"  总体AUC降幅: {b.get('auc_drop', 'N/A')} -> {t.get('auc_drop', 'N/A')}")
    for cat in set(list(b.get("category_breakdown", {}).keys()) + list(t.get("category_breakdown", {}).keys())):
        bm = b.get("category_breakdown", {}).get(cat, {})
        tm = t.get("category_breakdown", {}).get(cat, {})
        print(f"  {cat}: AUC降幅 {bm.get('auc_drop')} -> {tm.get('auc_drop')}")
    for ut in ["new_user", "existing_user"]:
        bm = b.get("new_user_breakdown", {}).get(ut, {})
        tm = t.get("new_user_breakdown", {}).get(ut, {})
        print(f"  {ut}: AUC降幅 {bm.get('auc_drop')} -> {tm.get('auc_drop')}")


def main():
    if len(sys.argv) < 2:
        print_help()
        return
    cmd = sys.argv[1]
    try:
        if cmd == "list":
            cmd_list_runs()
        elif cmd == "show":
            cmd_show_run(sys.argv[2])
        elif cmd == "adjust":
            next_action = sys.argv[5] if len(sys.argv) > 5 else ""
            cmd_adjust(sys.argv[2], sys.argv[3], sys.argv[4], next_action)
        elif cmd == "confirm":
            status = sys.argv[3] if len(sys.argv) > 3 else "CONFIRMED"
            comment = sys.argv[4] if len(sys.argv) > 4 else ""
            cmd_confirm(sys.argv[2], status, comment)
        elif cmd == "compare":
            cmd_compare(sys.argv[2], sys.argv[3])
        else:
            print_help()
    except IndexError:
        print("参数不足")
        print_help()
    except Exception as e:
        print(f"错误: {e}")


if __name__ == "__main__":
    main()
