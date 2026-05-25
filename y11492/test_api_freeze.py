#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y11492')
import requests
import json

base_url = "http://localhost:8002"

print("=" * 60)
print("API 冻结链路一致性测试")
print("=" * 60)

r = requests.post(f"{base_url}/api/v1/tasks", json={
    "tender_no": "API-FREEZE-005",
    "project_name": "API冻结测试项目",
    "qualification_file": {
        "file_name": "资质证书.pdf",
        "file_url": "/files/qual.pdf",
        "file_size": 1024000,
        "version": "v1.0"
    },
    "submitter": "API测试员",
    "conflict_strategy": "append"
})
task_id = r.json()["task_id"]
print(f"\n【1】创建任务ID: {task_id}")

r = requests.get(f"{base_url}/api/v1/tasks/{task_id}")
d = r.json()
print(f"【2】冻结前: status={d['status']}, is_frozen={d['is_frozen']}")

r = requests.get(f"{base_url}/api/v1/statistics")
s = r.json()
print(f"【3】冻结前统计: pending={s['pending_tasks']}, frozen={s['frozen_tasks']}, today_submit={s['today_submitted']}")

r = requests.post(f"{base_url}/api/v1/tasks/{task_id}/freeze", json={
    "operator": "审计员",
    "reason": "导出前冻结"
})
d = r.json()
print(f"【4】冻结后: status={d['status']}, is_frozen={d['is_frozen']}")
assert d["status"] == "frozen"
assert d["is_frozen"] == True

r = requests.get(f"{base_url}/api/v1/tasks/{task_id}")
d = r.json()
print(f"【5】详情查询: status={d['status']}, is_frozen={d['is_frozen']}, before_frozen={d['status_before_frozen']}")
assert d["status"] == "frozen"

r = requests.get(f"{base_url}/api/v1/statistics")
s = r.json()
print(f"【6】冻结后统计: pending={s['pending_tasks']}, frozen={s['frozen_tasks']}, today_submit={s['today_submitted']}")
assert s["frozen_tasks"] >= 1
assert s["today_submitted"] >= 1

r = requests.get(f"{base_url}/api/v1/tasks/{task_id}/histories")
hists = r.json()
fh = [h for h in hists if h["operation_type"] == "freeze"][0]
print(f"【7】历史记录: {fh['before_status']} → {fh['after_status']} by {fh['operator']}")
assert fh["after_status"] == "frozen"
assert fh["after_status"] == d["status"]

r = requests.get(f"{base_url}/api/v1/dead-letters/classification/stats")
print(f"【8】死信分类API: HTTP {r.status_code}, 返回={json.dumps(r.json())}")
assert r.status_code == 200

print("\n" + "=" * 60)
print("✓ 所有API测试通过！")
print("=" * 60)
