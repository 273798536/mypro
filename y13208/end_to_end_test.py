"""
端到端测试：按社区公示前的真实节奏
  步骤1: 导入旧材料（曲目表 + 录音文件）
  步骤2: 自动匹配 + 检测异常
  步骤3: 演出统筹补一条后补备注
  步骤4: 加一条授权豁免备注（看文件/曲目表/清单是否重新对齐）
  步骤5: 生成 Markdown 报告
  步骤6: 模拟"重启/重跑"（重建 Storage/Engine，读回 DB），验证历史、状态、报告一致
  步骤7: 对报告做关键字断言（变化讲清楚了没有）
运行方式:
    python end_to_end_test.py
"""

import os
import sys
import shutil
from datetime import datetime

from models import AnomalyStatus, MatchStatus
from storage import Storage
from anomaly_engine import AnomalyEngine
from report import ReportGenerator
from sample_data import (
    TRACKLIST_OLD_MATERIAL,
    RECORDING_FILES_OLD_MATERIAL,
    SUPPLEMENTARY_REMARKS,
    LICENSE_REMARK_EXAMPLE
)

DB_PATH = "test_e2e_timecode.db"
REPORT_PATH_STEP1 = "reports/step5_before_restart.md"
REPORT_PATH_STEP2 = "reports/step7_after_restart.md"


def _green(msg: str) -> str:
    return f"\033[32m✔ {msg}\033[0m"


def _red(msg: str) -> str:
    return f"\033[31m✘ {msg}\033[0m"


def _yellow(msg: str) -> str:
    return f"\033[33m{msg}\033[0m"


def step(msg: str):
    print(_yellow(f"\n━━━ {msg} ━━━"))


class TestFailed(Exception):
    pass


def assert_eq(actual, expected, name: str):
    if actual != expected:
        raise TestFailed(f"{name}: 期望 {expected!r}，实际 {actual!r}")


def assert_contains(container: str, needle: str, name: str):
    if needle not in container:
        raise TestFailed(f"{name}: 未在结果中找到 {needle!r}")


def assert_true(cond: bool, name: str):
    if not cond:
        raise TestFailed(f"{name}: 条件不成立")


def prepare():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    if os.path.exists("reports"):
        shutil.rmtree("reports")
    os.makedirs("reports", exist_ok=True)


def run_scenario():
    prepare()

    # ================ Step 1 ================
    step("Step 1 / 导入旧材料：曲目表 + 录音文件")
    storage = Storage(DB_PATH)
    engine = AnomalyEngine(storage)
    reporter = ReportGenerator(storage, engine)

    batch_trk = engine.import_tracklist(
        TRACKLIST_OLD_MATERIAL,
        source_ref="曲目表_v1_20260601.xlsx 第A2-A6行",
        operator="导入脚本",
        note="社区公示前旧材料"
    )
    batch_wav = engine.import_recording_files(
        RECORDING_FILES_OLD_MATERIAL,
        source_ref="录音棚/stems/ 目录扫描 2026-06-08",
        operator="导入脚本",
        note="社区公示前旧材料"
    )
    assert_eq(len(storage.list_tracks()), 5, "曲目表条数")
    assert_eq(len(storage.list_files()), 5, "录音文件条数")
    print(_green("导入成功：5条曲目表 + 5条录音文件"))

    # ================ Step 2 ================
    step("Step 2 / 自动匹配 + 检测时码异常")
    result = engine.run_matching_and_detection(
        track_batch_id=batch_trk.batch_id,
        file_batch_id=batch_wav.batch_id,
        operator="system"
    )
    print(f"  导入批次: tracks={result.tracks_imported}, files={result.files_imported}")
    print(f"  异常创建数: {result.anomalies_created}")
    print(f"  未匹配文件: {result.unmatched_files}")
    print(f"  未匹配曲目: {result.unmatched_tracks}")
    for w in result.warning_messages:
        print(f"  警告: {w}")

    anomalies = storage.list_anomalies()
    assert_eq(len(anomalies), 3, "检测到的异常总数应为3条（半拍1条+文件名不匹配2条）")

    types_found = sorted(a.anomaly_type.value for a in anomalies)
    assert_true("时码偏半拍" in types_found, "应检测到时码偏半拍")
    assert_true("文件名不匹配" in types_found, "应检测到文件名不匹配")
    print(_green("异常检测通过：3条异常（1条半拍、2条文件名对不上）"))

    offbeat = next(a for a in anomalies
                   if a.anomaly_type.value == "时码偏半拍")
    assert_true(offbeat.remarks, "时码偏半拍应已存入自动检测备注")
    has_tracklist_note = any("曲目表" in r.remark_type
                             for r in offbeat.remarks)
    assert_true(has_tracklist_note,
                "半拍异常应保留曲目表旧备注（历史不丢）")
    assert_true(offbeat.current_snapshot,
                "半拍异常应保存当前对齐快照")
    print(_green("历史留存检查通过：曲目表备注、来源行、影响范围都有"))

    # ================ Step 3 ================
    step("Step 3 / 演出统筹补一条后补备注")
    # 找到第3条异常（半拍那条）
    offbeat = next(a for a in storage.list_anomalies()
                   if a.anomaly_type.value == "时码偏半拍")
    supl = SUPPLEMENTARY_REMARKS[0]
    engine.append_supplementary_remark(
        anomaly_id=offbeat.id,
        content=supl["content"],
        source=supl["source"],
        operator="演出统筹阿蓝",
        attachment_path=supl["attachment_path"]
    )
    offbeat = storage.get_anomaly(offbeat.id)
    assert_eq(len(offbeat.remarks), 3,
              "半拍异常应累计3条备注（自动检测/曲目表旧备注/后补备注）")
    last_remark = offbeat.remarks[-1]
    assert_eq(last_remark.remark_type, "后补备注", "后补备注类型标记正确")
    assert_eq(last_remark.operator, "演出统筹阿蓝", "操作人正确")
    print(_green(f"后补备注成功追加：共{len(offbeat.remarks)}条备注历史"))

    # ================ Step 4 ================
    step("Step 4 / 加入授权豁免备注（用户补的那条），看对齐是否完成")
    engine.waive_anomaly_by_license(
        anomaly_id=offbeat.id,
        operator="演出统筹阿蓝",
        license_remark=LICENSE_REMARK_EXAMPLE,
        source_ref="社区公示前最终授权"
    )

    # 再确认 #2（文件名「重逄」vs「重逢」）：解决，异体字人工对齐
    typo = next(a for a in storage.list_anomalies()
                if "重逄" in a.title or "重逢" in a.title
                or "02_第一幕_重逄" in (a.matched_filename or ""))
    engine.resolve_anomaly(
        anomaly_id=typo.id,
        operator="演出统筹阿蓝",
        judgment_text="确认是同一文件，文件名繁体异体字「逄/逢」不影响曲目对应",
        source_ref="录音棚导出命名规范（允许异体字）",
        impact_scope="仅影响文件命名，清单按曲目#2对齐"
    )

    # 再处理 rev2 / _final 那条（文件名多后缀）：解决，人工对齐
    suffix = next(a for a in storage.list_anomalies()
                  if a.id not in (offbeat.id, typo.id))
    engine.resolve_anomaly(
        anomaly_id=suffix.id,
        operator="演出统筹阿蓝",
        judgment_text=("录音棚rev2版本即为最终使用版本，"
                       "曲目#3映射到此文件"),
        source_ref="录音棚版本记录 v1->v2 差异说明",
        impact_scope="仅影响曲目#3的文件映射，清单按此对齐"
    )

    align = engine.get_alignment_status()
    assert_eq(align["unmatched_file_count"], 0,
              "授权+改判后，所有文件应完成对齐")
    assert_true(align["consistency_check"]["consistent"],
                "状态一致性检查通过")
    print(_green("对齐完成：未匹配文件=0，一致性校验通过"))

    # ================ Step 5 ================
    step("Step 5 / 生成 Markdown 报告（重启前）")
    out1 = reporter.save_report(
        REPORT_PATH_STEP1,
        report_title="录音棚时码异常提醒报告（社区公示前）",
        operator_context="社区公示前最终校验 · 阿蓝已补授权备注"
    )
    assert_true(os.path.exists(out1), f"报告应生成到 {out1}")
    with open(out1, "r", encoding="utf-8") as f:
        md1 = f.read()
    assert_contains(md1, "录音棚时码异常提醒报告", "报告标题正确")
    assert_contains(md1, "时码偏半拍", "报告提到时码偏半拍")
    assert_contains(md1, "文件名不匹配", "报告提到文件名不匹配")
    assert_contains(md1, "授权备注", "报告提到授权备注")
    assert_contains(md1, "后补备注", "报告提到后补备注")
    assert_contains(md1, "文件 × 曲目表 × 最终清单 对齐",
                    "报告包含三维对齐结论")
    assert_contains(md1, "演出统筹阿蓝", "报告体现操作人")
    assert_contains(md1, "一致性校验", "报告包含一致性校验")
    assert_contains(md1, "变化摘要", "报告有变化摘要（给阿蓝看的）")
    print(_green(f"报告生成成功：{out1}（{len(md1)}字）"))

    # ================ Step 6 ================
    step("Step 6 / 模拟重启：重建Storage/Engine，只靠DB恢复，生成第二份报告")
    del engine, reporter, storage

    storage2 = Storage(DB_PATH)
    engine2 = AnomalyEngine(storage2)
    reporter2 = ReportGenerator(storage2, engine2)

    align2 = engine2.get_alignment_status()
    assert_eq(align2["unmatched_file_count"], 0,
              "重启后未匹配文件数仍为0")
    assert_true(align2["consistency_check"]["consistent"],
                "重启后一致性仍成立")

    anomalies2 = storage2.list_anomalies()
    assert_eq(len(anomalies2), 3, "重启后异常数仍是3")
    offbeat2 = next(a for a in anomalies2
                    if a.anomaly_type.value == "时码偏半拍")
    assert_eq(offbeat2.status, AnomalyStatus.WAIVED,
              "重启后半拍异常状态仍是已授权豁免")
    assert_eq(len(offbeat2.remarks), 4,
              "重启后半拍异常仍有4条备注（自动/曲目表/后补/授权）")
    assert_eq(len(offbeat2.status_history), 2,
              "重启后仍保留2次状态流转记录")
    assert_eq(len(offbeat2.judgments), 1,
              "重启后仍保留1次正式改判判定")
    print(_green("重启验证通过：状态、备注、改判、流转都在"))

    out2 = reporter2.save_report(
        REPORT_PATH_STEP2,
        report_title="录音棚时码异常提醒报告（模拟重启后）",
        operator_context="社区公示前最终校验 · 模拟重启复算"
    )
    with open(out2, "r", encoding="utf-8") as f:
        md2 = f.read()

    # ================ Step 7 ================
    step("Step 7 / 两份报告关键字断言（变化讲清楚了没有）")
    for name, md in [("重启前", md1), ("重启后", md2)]:
        for k in [
            "03_间奏_夜雨",
            "半拍偏差",
            "节拍器切换延迟",
            "授权豁免",
            "最终清单",
            "状态流转记录",
            "正式改判判定",
            "备注历史",
            "曲目表行",
            "历史留存完整性验证",
            "演出统筹阿蓝授权"
        ]:
            assert_contains(md, k, f"[{name}报告] 关键字 {k!r} 必须出现")
        print(_green(f"[{name}报告] 全部关键字检查通过"))

    # 变化摘要必须体现"从待处理到已授权豁免"
    assert_contains(md1, "待处理",
                    "报告变化摘要中能看到初始待处理状态")
    assert_contains(md1, "已授权豁免",
                    "报告变化摘要中能看到最终豁免状态")

    print(_green("两份报告对得上：关键字一致、状态与历史都能追溯"))


def main():
    try:
        run_scenario()
        print("\n" + _green("===== 端到端测试全部通过 ====="))
        print("  DB     :", os.path.abspath(DB_PATH))
        print("  报告-1 :", os.path.abspath(REPORT_PATH_STEP1))
        print("  报告-2 :", os.path.abspath(REPORT_PATH_STEP2))
        return 0
    except TestFailed as e:
        print("\n" + _red(f"测试失败：{e}"))
        return 1
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("\n" + _red(f"未预期异常：{e}"))
        return 2


if __name__ == "__main__":
    sys.exit(main())
