import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:5199"


def req(method, path, data=None):
    url = BASE + path
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
    r = urllib.request.Request(url, data=body, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="ignore")
        return e.code, json.loads(raw) if raw else None
    except Exception as e:
        return 0, {"error": str(e)}


def check(step, expected, actual, detail=""):
    ok = expected == actual if isinstance(expected, int) else expected in actual
    mark = "✅" if ok else "❌"
    print(f"{mark} [{step}] status={actual}, expected={expected} {detail}")
    return ok


def main():
    all_ok = True

    code, d = req("GET", "/api/health")
    all_ok &= check("health", 200, code)

    sys.path.insert(0, ".")
    from demo_data import DEMO_PAYLOAD

    code, d = req("POST", "/api/import", DEMO_PAYLOAD)
    all_ok &= check("import", 201, code, f"batch_no={d.get('batch_no') if d else ''}")
    if not d or "batch_id" not in d:
        print("导入失败，终止")
        return 1
    bid = d["batch_id"]

    code, d = req("GET", "/api/batches")
    all_ok &= check("list batches", 200, code, f"count={len(d.get('batches', []))}")

    code, d = req("POST", f"/api/batches/{bid}/review")
    all_ok &= check("review batch", 200, code, f"overall={d.get('overall_status') if d else ''}")

    code, d = req("GET", f"/api/batches/{bid}/safety")
    all_ok &= check("safety alerts", 200, code, f"count={len(d.get('safety_alerts', [])) if d else 0}")

    if d and d.get("safety_alerts"):
        aid = d["safety_alerts"][0]["id"]
        code2, d2 = req("POST", f"/api/safety/{aid}/acknowledge", {"operator": "陈主管"})
        all_ok &= check("ack safety", 200, code2)

    code3, d3 = req("GET", f"/api/batches/{bid}")
    all_ok &= check("get batch detail", 200, code3)
    sids = [s["id"] for s in (d3.get("samples", []) if d3 else [])]
    if sids:
        code4, d4 = req("PUT", f"/api/samples/{sids[0]}/status", {
            "status": "复核中", "operator": "陈主管", "comment": "待人工核对谱图",
            "review_comment": "谱峰重叠需与QC确认后重测",
        })
        all_ok &= check("update sample status", 200, code4, f"{d4 if d4 else ''}")

    code5, d5 = req("GET", f"/api/batches/{bid}/report_preview")
    all_ok &= check("report preview", 200, code5, f"filename={d5.get('filename') if d5 else ''}")

    code6, d6 = req("GET", "/api/history/runs")
    all_ok &= check("history runs", 200, code6, f"count={len(d6.get('runs', [])) if d6 else 0}")

    code7, d7 = req("GET", f"/api/batches/{bid}")
    fid = None
    if d7:
        for s in d7.get("samples", []):
            if s.get("findings"):
                fid = s["findings"][0]["id"]
                break
    if fid:
        code8, d8 = req("GET", f"/api/history/trace/{fid}")
        all_ok &= check("trace finding", 200, code8, f"title={d8.get('finding', {}).get('title') if d8 else ''}")

    print()
    if all_ok:
        print("✅ 全部 HTTP API 测试通过")
        return 0
    else:
        print("❌ 部分测试失败")
        return 1


if __name__ == "__main__":
    sys.exit(main())
