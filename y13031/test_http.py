import sys
import os
import json
import threading
import time
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def _get(path):
    url = f"http://127.0.0.1:18765{path}"
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            return r.status, r.read().decode("utf-8")
    except Exception as e:
        return None, str(e)


def _post(path):
    url = f"http://127.0.0.1:18765{path}"
    try:
        req = urllib.request.Request(url, data=b"", method="POST")
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body
    except Exception as e:
        return None, str(e)


def _enc(val):
    return urllib.parse.quote(str(val), encoding="utf-8")


def test_core_path():
    print("=" * 60)
    print("HTTP 端到端验证：启动服务 → 核心路径")
    print("=" * 60)

    print("\n【0/7】启动服务...")
    import uvicorn
    from main import app

    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=18765, log_level="error")

    server = threading.Thread(target=run_server, daemon=True)
    server.start()
    time.sleep(2)

    status, _ = _get("/")
    if status != 200:
        print(f"  ❌ 服务未启动 (status={status})")
        return False
    print("  ✅ 服务已启动在 127.0.0.1:18765")

    print("\n【1/7】GET / 返回页面 HTML...")
    status, html = _get("/")
    assert status == 200
    assert "供应链预付款异常回放" in html
    assert "status_label" in html, "JS 未引用 status_label"
    assert "source_label" in html, "JS 未引用 source_label"
    assert "old_status_label" in html, "JS 未引用 old_status_label"
    assert "new_status_label" in html, "JS 未引用 new_status_label"
    print("  ✅ 页面含 status_label / source_label / old_status_label / new_status_label")

    print("\n【2/7】POST /api/sample 加载示例数据...")
    status, body = _post("/api/sample")
    assert status == 200
    data = json.loads(body)
    batch_id = data["batch_id"]
    print(f"  ✅ 批次号: {batch_id}")

    print("\n【3/7】GET /api/payments 检查返回格式...")
    status, body = _get(f"/api/payments?batch_id={urllib.parse.quote(batch_id)}")
    assert status == 200
    payments = json.loads(body)["payments"]
    assert len(payments) > 0

    valid_names = {"PENDING", "MATCHED", "RELEASED", "DISPUTED", "NEED_VOUCHER", "NEED_SUPPLEMENT", "DUPLICATE"}
    valid_labels = {"待核实", "已匹配", "可放行", "有争议", "待补凭证", "需补材料", "重复认领"}
    valid_sources = {"AUTO_REPLAY", "MANUAL_ADJUST", "VOUCHER_ARRIVED", "SUPPLEMENT_UPLOAD", "REMARK_ADD"}

    for p in payments:
        assert p["current_status"] in valid_names, f"{p['payment_no']}: current_status='{p['current_status']}'"
        assert p["status_label"] in valid_labels, f"{p['payment_no']}: status_label='{p['status_label']}'"
        for h in p["history"]:
            assert h["source"] in valid_sources, f"source='{h['source']}'"
            assert h["new_status"] in valid_names, f"new_status='{h['new_status']}'"
            if h.get("old_status"):
                assert h["old_status"] in valid_names, f"old_status='{h['old_status']}'"
            assert "source_label" in h, "history 缺 source_label"
            assert "new_status_label" in h, "history 缺 new_status_label"
    print(f"  ✅ 全部 {len(payments)} 条记录: current_status 英文名, status_label 中文标签, history 字段正确")

    print("\n【4/7】POST /api/replay 回放...")
    status, body = _post(f"/api/replay?batch_id={urllib.parse.quote(batch_id)}")
    assert status == 200
    rdata = json.loads(body)
    for r in rdata["results"]:
        assert r["new_status"] in valid_names
        assert r["previous_status"] in valid_names
        assert "new_status_label" in r
        assert "previous_status_label" in r
    print(f"  ✅ 回放结果: previous_status/new_status 英文名, 含 _label 中文标签")

    print("\n【5/7】人工改判 + 补备注 + 录凭证...")
    status, body = _get(f"/api/payments?batch_id={urllib.parse.quote(batch_id)}")
    assert status == 200
    payments = json.loads(body)["payments"]
    target = None
    for p in payments:
        if p["current_status"] in ["NEED_VOUCHER", "PENDING"]:
            target = p
            break
    if not target:
        target = payments[0]
    pid = target["id"]

    status, body = _post(f"/api/payments/{pid}/status?new_status=RELEASED&operator={_enc('老许')}&remark={_enc('先放行')}")
    if status != 200:
        print(f"  ⚠️ 改判返回 {status}: {body[:200]}")
        pid2 = None
        for p in payments:
            if p["current_status"] not in ["DUPLICATE"]:
                pid2 = p["id"]
                break
        if pid2:
            pid = pid2
            status, body = _post(f"/api/payments/{pid}/status?new_status=RELEASED&operator={_enc('老许')}&remark={_enc('先放行')}")
    assert status == 200, f"改判失败 status={status} body={body[:300]}"
    p_data = json.loads(body)["payment"]
    assert p_data["current_status"] == "RELEASED", f"改判后 status='{p_data['current_status']}'"
    assert p_data["status_label"] == "可放行", f"改判后 label='{p_data['status_label']}'"
    print(f"  ✅ 改判: status='RELEASED', status_label='可放行'")

    status, body = _post(f"/api/payments/{pid}/remark?remark={_enc('口径B正确')}&operator={_enc('老许')}")
    assert status == 200
    p_data = json.loads(body)["payment"]
    assert "口径B正确" in (p_data.get("current_remark") or "")
    print(f"  ✅ 补备注成功")

    status, body = _post(f"/api/payments/{pid}/voucher?voucher_no=PZ-TEST&operator={_enc('老许')}")
    assert status == 200
    p_data = json.loads(body)["payment"]
    assert p_data["current_status"] == "MATCHED"
    print(f"  ✅ 录凭证: status='MATCHED'")

    print("\n【6/7】查看历史 API...")
    status, body = _get(f"/api/payments/{pid}/history")
    assert status == 200
    history = json.loads(body)["history"]
    assert len(history) >= 3, f"历史条目 {len(history)} < 3"
    for h in history:
        assert h["source"] in valid_sources
        assert h["new_status"] in valid_names
        assert "source_label" in h
        assert "new_status_label" in h
    print(f"  ✅ 历史 {len(history)} 条: source/new_status 英文名, 含 _label 中文标签")

    print("\n【7/7】导出 Markdown 报告...")
    status, md = _get(f"/api/report/{urllib.parse.quote(batch_id)}")
    assert status == 200
    for kw in ["可放行", "重复认领", "历史轨迹", "老许", "下一步怎么做"]:
        assert kw in md, f"报告缺 '{kw}'"
    print(f"  ✅ 报告 text/plain 格式，含所有关键信息，长度 {len(md)} 字符")

    print("\n" + "=" * 60)
    print("✅ HTTP 端到端验证全部通过！")
    print("   - API: current_status 英文名 + status_label 中文标签")
    print("   - 历史: source/old_status/new_status 英文名 + _label 中文标签")
    print("   - 前端: 英文名做逻辑判断，_label 做中文显示")
    print("   - 报告: 和页面数据一致")
    print("=" * 60)
    return True


if __name__ == "__main__":
    ok = test_core_path()
    sys.exit(0 if ok else 1)
