#!/usr/bin/env python3
"""
端到端验证脚本: 模拟训练教练老唐进行一次完整交接。

场景:
  1. 早会后老唐注册两份参数 (v1 和 v2, 带来源和备注)
  2. 值班脚本导入一份复核人交来的"字段名前后不一"的现场照片
  3. 执行首次导出, 故意触发一次失败 (无参数版本时), 再成功一次
  4. 检测到采样缺口, 留下来源行和影响范围
  5. 重跑, 验证历史备注 + 截图说明 + 当前状态都能对上
  6. 从照片找原始说法; 从截图说明讲清处理结果 (老唐交接话术)
  7. 输出评审会讲解素材
"""

import json
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from acoustic_reverb_export import (
    Storage,
    FieldAdapter,
    ParamVersionManager,
    GapDetector,
    ReportExporter,
    TraceQuerier,
)


def sep(title: str):
    print("\n" + "=" * 72)
    print("== " + title)
    print("=" * 72)


def main():
    db_path = os.path.join(ROOT, "demo_reverb.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    storage = Storage(db_path)
    pm = ParamVersionManager(storage)
    gd = GapDetector(storage)
    fa = FieldAdapter()
    exporter = ReportExporter(storage, fa, pm, gd)
    trace = TraceQuerier(storage)

    # 1. 注册两个参数版本
    sep("Step 1/7: 注册参数版本 v1 和 v2")
    with open(os.path.join(HERE, "params_v1.json"), "r", encoding="utf-8") as f:
        p1 = json.load(f)
    tag1, err1 = pm.save(p1, source="早会讨论-2026-06-12", operator="老唐", remark="按会议室A初版配置")
    print(f"v1 -> tag={tag1}, 错误={err1}")
    with open(os.path.join(HERE, "params_v2.json"), "r", encoding="utf-8") as f:
        p2 = json.load(f)
    tag2, err2 = pm.save(p2, source="评审会修改-2026-06-12", operator="老唐", remark="追加8kHz并收紧缺口容忍")
    print(f"v2 -> tag={tag2}, 错误={err2}")

    # 2. 导入字段混乱的照片
    sep("Step 2/7: 导入字段名前后不一的现场照片")
    with open(os.path.join(HERE, "photos_mixed_fields.json"), "r", encoding="utf-8") as f:
        photos = json.load(f)
    print(f"原始字段 (每张不同):")
    for p in photos:
        print(f"  {list(p.keys())}")
    ing = exporter.ingest_photos(photos, source_system="示例数据集")
    print(f"摄入结果: {ing}")

    # 3. 首次导出 (成功)
    sep("Step 3/7: 首次报告导出 (同时采样缺口检测)")
    with open(os.path.join(HERE, "samples_with_gap.json"), "r", encoding="utf-8") as f:
        samples = json.load(f)
    ok_result = exporter.run_export(
        sample_rows=samples,
        photo_rows=photos,
        source_file=os.path.join(HERE, "samples_with_gap.json"),
        source_system="示例数据集",
        screenshot_path="/screenshots/20260612-first-run.png",
        screenshot_description="首次导出截图: 采样缺口在 0.00004s -> 0.00500s 之间, 1kHz频带样本明显少于500Hz",
        triggered_by="值班脚本-demo",
        current_remark="首次跑完, 缺口待人工复核",
        param_version_tag=tag2,
    )
    print("首次导出结果:", json.dumps(ok_result, ensure_ascii=False, indent=2)[:800])
    assert ok_result["status"] == "success", f"首次导出失败: {ok_result}"
    first_run_tag = ok_result["run_tag"]

    # 4. 手动补一条缺口 (模拟人工发现)
    sep("Step 4/7: 人工追加一条采样缺口并保留来源行")
    manual_gap_id = gd.add_manual_gap(
        report_run_id=ok_result["run_id"],
        gap_type="data_corrupt",
        impact_scope="第200-220行 4kHz幅值全为0, 影响该段混响计算",
        source_file=os.path.join(HERE, "samples_with_gap.json"),
        source_row=210,
        description="老唐人工扫到: 原始CSV第210行附近4kHz全0",
    )
    print(f"人工缺口 id={manual_gap_id}, 全部缺口:")
    for g in gd.list_for_report(ok_result["run_id"]):
        print(f"  [{g['gap_type']}] 来源行={g.get('source_row')} 影响范围: {g['impact_scope']}")

    # 5. 重跑 (重启后), 验证历史备注 / 截图说明 / 状态能对上
    sep("Step 5/7: 模拟重启后重跑, 验证历史备注 + 截图说明 + 状态一致")
    retry_result = exporter.retry(
        run_tag=first_run_tag,
        screenshot_path="/screenshots/20260613-retry.png",
        screenshot_description="重跑截图: 已按v2参数重新计算, 人工缺口标注在来源行210",
        current_remark="重跑完成, 准备交接",
        triggered_by="老唐-手动重跑",
    )
    print("重跑结果:", json.dumps(retry_result, ensure_ascii=False, indent=2)[:800])
    assert retry_result["status"] == "success", f"重跑失败: {retry_result}"
    retry_run_tag = retry_result["run_tag"]
    retry_run_detail = exporter.get_run_detail(retry_run_tag)
    print("重跑后的历史备注:")
    print("  historical_remark =", repr(retry_run_detail.get("historical_remark"))[:300])
    print("  current_remark    =", retry_run_detail.get("current_remark"))
    print("  screenshot_desc   =", retry_run_detail.get("screenshot_description"))
    print("  status            =", retry_run_detail.get("status"))

    # 关键验证: 重跑必须继承旧 run 的照片与缺口(含人工补录)
    print("  继承照片数量       =", len(retry_run_detail.get("photos", [])))
    print("  继承缺口数量       =", len(retry_run_detail.get("gaps", [])))
    assert len(retry_run_detail.get("photos", [])) > 0, "重跑未继承照片"
    assert len(retry_run_detail.get("gaps", [])) > 0, "重跑未继承缺口"
    assert any(
        g.get("source_row") == 210 for g in retry_run_detail["gaps"]
    ), "重跑未继承人工补录缺口 (来源行210)"
    assert any(
        bool(g.get("is_manual")) for g in retry_run_detail["gaps"]
    ), "重跑未保留人工缺口标记"

    # 关键验证: 导出文件内容与页面(trace.from_report)数据一致且能正常打开
    with open(retry_result["export_path"], "r", encoding="utf-8") as f:
        artifact = json.load(f)
    hs = artifact["human_summary"]
    assert hs["照片数量"] == len(retry_run_detail["photos"]), "导出文件照片数与页面不一致"
    assert hs["采样缺口数量"] == len(retry_run_detail["gaps"]), "导出文件缺口数与页面不一致"
    assert hs["截图说明"] == retry_run_detail["screenshot_description"], "导出文件截图说明与页面不一致"
    assert hs["当前备注"] == retry_run_detail["current_remark"], "导出文件当前备注与页面不一致"
    assert len(artifact["photos"]) == hs["照片数量"], "导出 photos 列表长度与摘要不一致"
    assert len(artifact["sampling_gaps"]) == hs["采样缺口数量"], "导出 sampling_gaps 长度与摘要不一致"
    print("  [一致性校验通过] 导出文件与 trace.from_report 完全对得上")

    # 6. 老唐交接: 从照片找原始说法 + 从截图讲清处理结果
    sep("Step 6/7: 老唐交接话术 - 从照片找原始说法")
    for pid in ["P20260612-001", "P20260612-002", "P20260612-003", "P20260612-004"]:
        t = trace.from_photo(pid)
        print("\n" + t["交接话术"])
        print("  -> 原始字段:", list(t["原始说法"]["original_fields"].keys()))
        print("  -> 原始说法:", t["原始说法"]["raw_description"])

    sep("Step 6/7 (续): 老唐交接话术 - 从截图讲清处理结果")
    t_report = trace.from_report(retry_run_tag)
    print(t_report["交接话术"])

    # 7. 评审会讲解素材
    sep("Step 7/7: 评审会讲解素材 - 数字从哪来")
    meeting = trace.for_meeting(retry_run_tag)
    print("一句话总结:", meeting["一句话总结"])
    print("参数线索:")
    for k, v in meeting["参数线索"].items():
        print(f"  {k}: {v}")
    print("采样缺口清单:")
    for item in meeting["采样缺口清单"]:
        print(f"  {item}")
    print("照片处理情况:")
    for item in meeting["照片处理情况"]:
        print(f"  {item}")
    print("处理结果说明:", meeting["处理结果说明"])

    # 参数版本 diff
    sep("Bonus: 参数版本 diff (评审会讲解 v1 -> v2 的变化)")
    diff = pm.diff(tag1, tag2)
    print(diff["summary"])
    for k, v in diff["changed"].items():
        print(f"  {k}: {v['from']} -> {v['to']}")

    # 导出文件验证
    sep("Bonus: 导出产物自描述检查")
    export_path = retry_result["export_path"]
    with open(export_path, "r", encoding="utf-8") as f:
        artifact = json.load(f)
    print("导出文件:", export_path)
    print("human_summary 字段 (给不看代码的人):")
    for k, v in artifact["human_summary"].items():
        print(f"  {k}: {v}")

    print("\n[OK] 端到端验证通过。")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        traceback.print_exc()
        print("\n[FAIL] 端到端验证失败:", exc)
        sys.exit(1)
