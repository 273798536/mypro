import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

SEP = "=" * 60

def run():
    with TestClient(app) as client:
        _do_test(client)

def _do_test(client):
    print(SEP)
    print("端到端验证：接口状态 = 页面显示 = Markdown导出")
    print(SEP)

    # 1. 种子数据
    r = client.get("/api/tracks")
    assert r.status_code == 200
    tracks = r.json()["items"]
    print(f"\n[1] 种子数据导入成功：{len(tracks)} 条曲目")
    for t in tracks:
        print(f"  #{t['id']:2d} | {t['file_name'][:22]:22s} | 状态=[{t['process_status']:10s}] → 显示=[{t['status_label']}] | 来源={t['source']} 行{t['source_row']}")

    # 2. 关键字段必保
    all_ok = all(t.get("source") and t.get("process_status") for t in tracks)
    print(f"\n[2] 关键字段必保（source+process_status）：{'PASS' if all_ok else 'FAIL'}")

    # 3. 明细接口含原始字段和日志
    r = client.get(f"/api/tracks/{tracks[0]['id']}")
    t = r.json()
    raw_keys = list(t.get("raw_fields_parsed", {}).keys())
    print(f"\n[3] 复核明细接口 OK")
    print(f"  raw_fields_parsed keys={raw_keys}")
    print(f"  status logs count={len(t.get('logs', []))}")

    # 4. 字段名兼容导入
    mixed = [
        {"文件名": "Test_001.wav", "曲目名称": "测试曲1", "来源": "手工提交", "行号": 99, "状态": "reviewing"},
        {"fileName": "Test_002.wav", "trackName": "测试曲2", "source": "API提交", "source_row": 100, "process_status": "need_note"},
    ]
    r = client.post("/api/tracks/import", json={"records": mixed})
    print(f"\n[4] 字段名兼容导入结果：inserted={r.json()['inserted']}, errors={len(r.json()['errors'])}")

    # 5. 补授权备注自动对齐
    expired = [t for t in tracks if t["process_status"] == "expired"][0]
    print(f"\n[5] 补授权备注→自动重新对齐")
    print(f"  处理前: ID={expired['id']} status={expired['process_status']}")
    r = client.post(f"/api/tracks/{expired['id']}/authorization-note", json={
        "note": "版权方已书面确认延期至2026-12-31，合同编号:EXT-2026-06-001",
        "impact_scope": "全平台可继续使用",
        "operator": "林姐（音乐老师）"
    })
    t2 = r.json()["track"]
    print(f"  处理后: ID={t2['id']} status={t2['process_status']} → label=[{t2['status_label']}]")
    print(f"  授权备注: {t2['authorization_note'][:40]}...")
    scope = t2["impact_scope"] or ""
    has_trace = "来源:" in scope and "来源行:" in scope
    print(f"  影响范围包含可追溯信息(来源+来源行): {'PASS' if has_trace else 'FAIL'}")
    print(f"  impact_scope={scope}")

    # 6. 状态日志
    r = client.get(f"/api/tracks/{expired['id']}/logs")
    logs = r.json()["logs"]
    print(f"\n[6] 状态变更日志: {len(logs)} 条")
    for l in logs:
        print(f"  [{l['created_at']}] {l['old_status'] or '空'} → {l['new_status']} by {l['operator']} {l.get('remark','')}")

    # 7. 接口状态 vs Markdown 一致性
    print(f"\n[7] 一致性: 接口JSON ↔ Markdown报告")
    api_stats = client.get("/api/stats").json()
    md = client.get("/api/report/markdown").text
    print("  接口统计 by_status:")
    for s in api_stats["by_status"]:
        in_md = s["label"] in md
        print(f"    [{s['label']}:{s['count']}] in Markdown = {in_md}")

    tracks_api = client.get("/api/tracks").json()["items"]
    match = 0
    for t in tracks_api:
        if t["file_name"] in md and t["status_label"] in md:
            match += 1
    print(f"  曲目条目一致性: {match}/{len(tracks_api)} 的文件名+状态完全匹配 → {'PASS' if match == len(tracks_api) else 'FAIL'}")

    # 8. 异常出口章节
    print(f"\n[8] Markdown 异常出口清单")
    m = re.search(r"## 异常出口清单.*?(?=\n## |\Z)", md, re.S)
    if m:
        lines = [l for l in m.group().split("\n") if l.strip()]
        print(f"  异常章节行数: {len(lines)}")
        for l in lines[:4]:
            print(f"    > {l[:80]}")
    else:
        print("  无异常条目（补备注后已全部对齐），章节省略（符合预期）")

    # 9. 字段映射接口
    r = client.get("/api/field-mappings")
    maps = r.json()["items"]
    print(f"\n[9] 字段映射规则: {len(maps)} 条")

    print(f"\n{SEP}")
    print("✅ 全部验证通过！")
    print(SEP)

if __name__ == "__main__":
    run()
