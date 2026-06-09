import urllib.request
import json


def get(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


def post(url, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def main():
    print("=== 1. 批次列表 ===")
    batches = get("http://127.0.0.1:5000/api/batches")
    for b in batches:
        note = (b.get("note") or "")[:50]
        print(f"  {b['batch_id']} | 状态={b['status']} | 备注={note}")
    print(f"共 {len(batches)} 条")

    unit_missing = [b for b in batches if b["status"] == "单位缺失"][0]
    bid = unit_missing["batch_id"]
    rid = unit_missing["calculation"]["result_id"]
    print(f"\n选中单位缺失批次: {bid}")
    print(f"对应结果ID: {rid}")

    print("\n=== 2. 从批次ID正向追溯 ===")
    t = get(f"http://127.0.0.1:5000/api/trace/batch/{bid}")
    print(f"  追溯路径: {t['trace_path']}")
    srcs = [(s["name"], s["unit"]) for s in t["source_layer"]]
    print(f"  来源层(名称,单位): {srcs}")
    print(f"  处理层状态: {t['processing_layer']['status']}")
    print(f"  结果层错误: {t['result_layer']['error_message']}")

    print("\n=== 3. 从结果ID倒查（验收：单位缺失记录倒查）===")
    t2 = get(f"http://127.0.0.1:5000/api/trace/result/{rid}")
    print(f"  追溯路径: {t2['trace_path']}")
    print(f"  能回溯到批次: {t2['processing_layer']['batch_id'] == bid}")
    src_ids = [s["source_id"] for s in t2["source_layer"]]
    print(f"  能回溯到来源ID: {src_ids}")

    print("\n=== 4. 下载报告（文件名含批次ID+状态+时间戳）===")
    req = urllib.request.Request(f"http://127.0.0.1:5000/api/download/{bid}")
    with urllib.request.urlopen(req) as r:
        cd = r.headers.get("Content-Disposition", "")
        content = r.read().decode("utf-8")
    print(f"  Content-Disposition: {cd}")
    print(f"  文件大小: {len(content)} 字节")
    print("  文件前8行:")
    for line in content.splitlines()[:8]:
        print(f"    {line}")

    print("\n=== 5. 提交教师复核 ===")
    resp = post(
        "http://127.0.0.1:5000/api/review",
        {
            "batch_id": bid,
            "reviewer": "数学老师",
            "score": 60,
            "comment": "单位缺失是基本错误",
            "handling_opinion": "补充单位 g 和 cm³ 后重新提交",
        },
    )
    print(f"  复核提交: {resp}")

    print("\n=== 6. 复核后再追溯（检查评分记录和处理意见）===")
    t3 = get(f"http://127.0.0.1:5000/api/trace/batch/{bid}")
    rv = t3["review_layer"]
    print(f"  复核层存在: {rv is not None}")
    if rv:
        print(f"    复核ID: {rv['review_id']}")
        print(f"    复核人: {rv['reviewer']}")
        print(f"    评分: {rv['score']}")
        print(f"    评语: {rv['comment']}")
        print(f"    处理意见: {rv['handling_opinion']}")

    print("\n=== 7. 再下载一次，看文件名是否区分 ===")
    reviewed = [b for b in get("http://127.0.0.1:5000/api/batches") if b["batch_id"] == bid][0]
    print(f"  当前批次状态: {reviewed['status']}")
    req = urllib.request.Request(f"http://127.0.0.1:5000/api/download/{bid}")
    with urllib.request.urlopen(req) as r:
        cd2 = r.headers.get("Content-Disposition", "")
        content2 = r.read().decode("utf-8")
    print(f"  Content-Disposition: {cd2}")
    has_review = "教师复核" in content2 and "处理意见" in content2
    print(f"  文件包含复核信息: {has_review}")

    print("\n✅ 全部验收场景验证完成")


if __name__ == "__main__":
    main()
