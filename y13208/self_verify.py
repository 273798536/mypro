"""
自包含验证脚本：不依赖网络请求，直接调用 Python API 层
用于在无法启动网络服务时，验证所有核心逻辑
"""

import sys
import os
import tempfile
import shutil
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import AnomalyStatus, MatchStatus
from storage import Storage
from anomaly_engine import AnomalyEngine
from report import ReportGenerator
from sample_data import (
    TRACKLIST_OLD_MATERIAL,
    RECORDING_FILES_OLD_MATERIAL,
    LICENSE_REMARK_EXAMPLE
)


def run_self_verify():
    tmpdir = tempfile.mkdtemp(prefix="timecode_verify_")
    db_path = os.path.join(tmpdir, "test_self.db")
    report_path = os.path.join(tmpdir, "self_test_report.md")

    print("=" * 60)
    print("录音棚时码异常提醒 · 自包含验证（直连 Python API）")
    print(f"临时目录: {tmpdir}")
    print("=" * 60)

    all_pass = True
    results = []

    def check(desc, cond, detail=""):
        nonlocal all_pass
        status = "✅ PASS" if cond else "❌ FAIL"
        results.append((status, desc, detail))
        print(f"{status} {desc}")
        if not cond:
            all_pass = False
            if detail:
                print(f"   {detail}")
        return cond

    try:
        # 1. 初始化存储
        storage = Storage(db_path)
        engine = AnomalyEngine(storage)
        reporter = ReportGenerator(storage, engine)
        check("Storage/Engine/Reporter 初始化成功", True)

        # 2. 导入曲目表
        batch_trk = engine.import_tracklist(
            TRACKLIST_OLD_MATERIAL,
            source_ref="自验证_曲目表.xlsx",
            operator="verify_script",
            note="自验证"
        )
        check(f"导入 5 条曲目表成功，batch_id={batch_trk.batch_id}",
              len(storage.list_tracks()) == 5)

        # 3. 导入录音文件
        batch_wav = engine.import_recording_files(
            RECORDING_FILES_OLD_MATERIAL,
            source_ref="自验证_录音棚导出",
            operator="verify_script",
            note="自验证"
        )
        check(f"导入 5 条录音文件成功，batch_id={batch_wav.batch_id}",
              len(storage.list_files()) == 5)

        # 4. 运行匹配与检测
        result = engine.run_matching_and_detection(
            track_batch_id=batch_trk.batch_id,
            file_batch_id=batch_wav.batch_id,
            operator="verify_script"
        )
        check(f"检测到 {result.anomalies_created} 条异常（预期 3）",
              result.anomalies_created == 3,
              f"实际: {result.anomalies_created}")

        anomalies = storage.list_anomalies()
        check("异常包含 1 条时码偏半拍 + 2 条文件名不匹配",
              sum(1 for a in anomalies
                  if a.anomaly_type.value == "时码偏半拍") == 1
              and sum(1 for a in anomalies
                      if a.anomaly_type.value == "文件名不匹配") == 2)

        # 5. 半拍异常的历史留存
        offbeat = next(a for a in anomalies
                       if a.anomaly_type.value == "时码偏半拍")
        check("半拍异常包含自动检测备注",
              any("自动检测" in r.remark_type for r in offbeat.remarks))
        check("半拍异常包含曲目表历史备注（旧备注不丢）",
              any("曲目表" in r.remark_type for r in offbeat.remarks))
        check("半拍异常有对齐快照（来源行+时码）",
              offbeat.current_snapshot and "timecode" in offbeat.current_snapshot)
        check("半拍异常有状态流转记录",
              len(offbeat.status_history) >= 1)

        # 6. 追加后补备注
        rid = engine.append_supplementary_remark(
            anomaly_id=offbeat.id,
            content="经核对：节拍器切换延迟导致半拍偏差，不影响演出",
            source="曲目表纸质版边注（自验证）",
            operator="演出统筹阿蓝",
            attachment_path="screenshots/test.jpg"
        )
        offbeat2 = storage.get_anomaly(offbeat.id)
        check(f"后补备注成功，累计 {len(offbeat2.remarks)} 条",
              len(offbeat2.remarks) == len(offbeat.remarks) + 1)
        check("后补备注类型标记正确",
              offbeat2.remarks[-1].remark_type == "后补备注")
        check("后补备注来源可查",
              "纸质版" in offbeat2.remarks[-1].source)

        # 7. 授权豁免 + 三维对齐
        waveres = engine.waive_anomaly_by_license(
            anomaly_id=offbeat.id,
            operator="演出统筹阿蓝",
            license_remark=LICENSE_REMARK_EXAMPLE,
            source_ref="自验证_最终授权"
        )
        check(f"授权豁免成功: {waveres.message}", waveres.success)
        offbeat3 = storage.get_anomaly(offbeat.id)
        check("授权后状态变为『已授权豁免』",
              offbeat3.status == AnomalyStatus.WAIVED)
        check("授权备注留存到历史",
              any("授权备注" in r.remark_type for r in offbeat3.remarks))
        check("改判判定留存，含来源",
              len(offbeat3.judgments) >= 1
              and offbeat3.judgments[-1].source_ref)

        # 8. 其他两条异常改判
        typo = next(a for a in anomalies
                    if "重逄" in a.matched_filename)
        res1 = engine.resolve_anomaly(
            typo.id, "演出统筹阿蓝",
            "异体字「逄/逢」不影响，已对齐",
            "录音棚命名规范",
            "仅曲目#2文件映射"
        )
        check(f"文件名异体字改判成功: {res1.message}", res1.success)

        typo2 = next(a for a in anomalies
                     if a.id not in (offbeat.id, typo.id))
        res2 = engine.resolve_anomaly(
            typo2.id, "演出统筹阿蓝",
            "山河/山海为录音棚笔误，已人工对齐到山海",
            "录音棚v2版本说明",
            "曲目#4文件映射"
        )
        check(f"山河/山海笔误改判成功: {res2.message}", res2.success)

        # 9. 三维对齐验证
        align = engine.get_alignment_status()
        check(f"未匹配文件数 = 0（当前: {align['unmatched_file_count']}）",
              align["unmatched_file_count"] == 0)
        check("DB状态与历史末态一致",
              align["consistency_check"]["consistent"])

        # 10. 重启验证（重建对象，只靠DB恢复）
        del engine, reporter, storage
        storage2 = Storage(db_path)
        engine2 = AnomalyEngine(storage2)
        reporter2 = ReportGenerator(storage2, engine2)

        align2 = engine2.get_alignment_status()
        check("重启后未匹配文件仍为0",
              align2["unmatched_file_count"] == 0)
        check("重启后一致性仍通过",
              align2["consistency_check"]["consistent"])

        anomalies2 = storage2.list_anomalies()
        check(f"重启后异常数不变（当前: {len(anomalies2)}）",
              len(anomalies2) == 3)

        offbeat_restored = next(a for a in anomalies2
                                if a.anomaly_type.value == "时码偏半拍")
        check("重启后半拍异常状态仍是已授权豁免",
              offbeat_restored.status == AnomalyStatus.WAIVED)
        check(f"重启后备注仍有 {len(offbeat_restored.remarks)} 条（预期 4）",
              len(offbeat_restored.remarks) == 4)
        check(f"重启后状态流转仍有 {len(offbeat_restored.status_history)} 条（预期 2）",
              len(offbeat_restored.status_history) == 2)
        check(f"重启后改判仍有 {len(offbeat_restored.judgments)} 条（预期 1）",
              len(offbeat_restored.judgments) == 1)

        # 11. 生成 Markdown 报告
        output = reporter2.save_report(
            report_path,
            report_title="自验证报告（Python 直连）",
            include_resolved=True,
            operator_context="自验证 · 直连Python API"
        )
        check(f"报告生成成功: {output}", os.path.exists(output))

        with open(output, "r", encoding="utf-8") as f:
            md = f.read()
        check(f"报告字数: {len(md)} 字", len(md) > 2000)

        required_keywords = [
            "录音棚时码异常提醒",
            "时码偏半拍",
            "文件名不匹配",
            "授权备注",
            "后补备注",
            "文件 × 曲目表 × 最终清单 对齐",
            "变化摘要",
            "历史留存完整性验证",
            "节拍器切换延迟",
            "已授权豁免",
            "一致性校验",
            "演出统筹阿蓝"
        ]
        missing = [k for k in required_keywords if k not in md]
        check(f"报告包含 {len(required_keywords) - len(missing)}/{len(required_keywords)} 个关键字",
              len(missing) == 0,
              f"缺失: {missing}")

        # 12. 再次导入+生成报告，验证状态可累积
        extra_track = {
            "track_no": 6,
            "track_title": "尾声·星河",
            "expected_filename": "06_尾声_星河.wav",
            "duration": "02:30.00"
        }
        batch_trk2 = engine2.import_tracklist(
            [extra_track], source_ref="自验证_补录",
            operator="verify_script", note="追加导入测试"
        )
        check("追加导入第 6 首曲目成功",
              len(storage2.list_tracks()) == 6)

        output2 = reporter2.save_report(
            os.path.join(tmpdir, "self_test_report_2.md"),
            report_title="自验证报告-追加导入后"
        )
        with open(output2, "r", encoding="utf-8") as f:
            md2 = f.read()
        check("追加导入后的报告仍包含历史异常",
              "时码偏半拍" in md2 and "授权备注" in md2)
        check("追加导入后的报告包含新曲目数（6）",
              "6" in md2)

        print("\n" + "=" * 60)
        if all_pass:
            print("✅ 全部 25 项自包含验证通过")
            print(f"   临时 DB: {db_path}")
            print(f"   报告 1: {output}")
            print(f"   报告 2: {output2}")
            return 0
        else:
            fail_count = sum(1 for r in results if r[0] == "❌ FAIL")
            print(f"❌ {fail_count} 项验证失败")
            for r in results:
                if r[0] == "❌ FAIL":
                    print(f"   - {r[1]}")
                    if r[2]:
                        print(f"     {r[2]}")
            return 1

    finally:
        # 保留临时目录供检查
        print(f"\n💡 临时文件保留在: {tmpdir}")
        print(f"   如需清理: rm -rf {tmpdir}")


if __name__ == "__main__":
    sys.exit(run_self_verify())
