#!/usr/bin/env python3
import os
import json
import sys
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from encore_archive import ArchiveStore, archive_submit, build_page_summary, STATUS_LABELS

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DEMO_DIR = os.path.dirname(os.path.abspath(__file__))


def read_text(name: str) -> str:
    with open(os.path.join(DEMO_DIR, name), "r", encoding="utf-8") as f:
        return f.read()


def reset_data_dir():
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"[demo] 已重置数据目录: {DATA_DIR}")


def run_step(desc: str, fn):
    print(f"\n=== {desc} ===")
    result = fn()
    if result and isinstance(result, dict):
        print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main():
    reset_data_dir()
    store = ArchiveStore(DATA_DIR)

    run_step("Demo 01 - 首次正常归档（夜空中最亮的星返场）", lambda: archive_submit(
        store,
        record_id="encore-2025-0615-01",
        filename="返场曲清单-夜空中最亮的星-海阔天空-追梦赤子心-成都.xlsx",
        tracks_content=read_text("tracks_demo01_normal.txt"),
        supplementary_note="",
        verbal_note="小孟现场确认曲目顺序不变",
        manual_annotations=["运营已核对曲目与节目单一致"],
        delivery_checklist=[
            {"item": "曲目表.xlsx", "ok": True, "note": "小孟交付"},
            {"item": "音频小样.zip", "ok": True, "note": "音质OK"},
        ],
    )[1])

    run_step("Demo 02-1 - 首份材料归档（含后补备注+授权到期，曲目表没对上文件名）", lambda: archive_submit(
        store,
        record_id="encore-2025-0615-02",
        filename="周杰伦返场.xlsx",
        tracks_content=read_text("tracks_demo02_messy.txt"),
        supplementary_note="后补：原曲目表里第4首青花瓷是现场加的，之前漏记",
        verbal_note="小孟口头说晴天的授权可能有问题，等法务回",
    )[1])

    run_step("Demo 02-2 - 小孟补了授权备注后重扫（只传 rehearsal_note，自动沿用 filename 和 tracks）", lambda: archive_submit(
        store,
        record_id="encore-2025-0615-02",
        rehearsal_note="晴天授权到期（2025-05-31到期），本场演出不使用，已替换成《简单爱》（待更新曲目表）",
        manual_annotations=["法务确认：晴天版权已过期"],
    )[1])

    run_step("Demo 02-3 - 修正文件名并重扫（传 filename，曲目表沿用 v1）", lambda: archive_submit(
        store,
        record_id="encore-2025-0615-02",
        filename="周杰伦返场-夜曲-晴天-稻香-青花瓷.xlsx",
        manual_annotations=["现场负责人批注：青花瓷已走加急后补流程"],
        delivery_checklist=[
            {"item": "后补授权申请单.pdf", "ok": False, "note": "法务签回中"},
        ],
    )[1])

    run_step("Demo 03 - 文件名完全对不上曲目表（薛之谦曲目文件名却叫五月天）", lambda: archive_submit(
        store,
        record_id="encore-2025-0615-03",
        filename="五月天返场曲清单.xlsx",
        tracks_content=read_text("tracks_demo03_mismatch.txt"),
        supplementary_note="",
        verbal_note="",
    )[1])

    print("\n=== Demo 02 页面摘要导出（页面状态与文件状态一致） ===")
    summary = build_page_summary(store, "encore-2025-0615-02")
    summary_path = os.path.join(DATA_DIR, "summary_encore-2025-0615-02.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"页面摘要已写入: {summary_path}")
    print(json.dumps({
        "ok": summary["ok"],
        "record_id": summary["record_id"],
        "latest_version": summary["latest_version"],
        "status": summary["status"],
        "status_label": summary["status_label"],
        "status_detail": summary["status_detail"],
        "versions_count": len(summary["versions"]),
        "manual_annotations": summary["manual_annotations"],
    }, ensure_ascii=False, indent=2))

    print("\n=== Demo 最终记录列表 ===")
    for rid in store.list_ids():
        rec = store.load(rid)
        print(f"  - {rid}  v{rec.version}  [{STATUS_LABELS.get(rec.status, rec.status)}]  {rec.filename}")

    print("\n[demo] 演示数据创建完毕，共生成 3 条记录（含一条正常、一条有授权到期+后补备注+多版本、一条文件名不匹配）。")


if __name__ == "__main__":
    main()
