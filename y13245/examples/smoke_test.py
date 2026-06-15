"""冒烟测试：跑一遍示例曲目表，观察输出结构"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from podcast_intro_review.parser import parse_tracklist, parse_delivery_list
from podcast_intro_review.engine import VersionReviewEngine, infer_expected_versions
from podcast_intro_review.models import ReviewStatus
from podcast_intro_review.storage import (
    new_session,
    save_session,
    align_with_previous_session,
    load_latest_session,
    finalize_session,
)
from podcast_intro_review.report import print_full_report, maybe_raise
from podcast_intro_review.exceptions import OldMasterDetected, UnresolvedIssuesRemain


def main() -> int:
    tracklist = HERE / "tracklist.csv"
    delivery = HERE / "delivery.csv"

    with tempfile.TemporaryDirectory() as td:
        # 把示例文件拷到临时目录，避免污染源
        tmp_tl = Path(td) / "tracklist.csv"
        tmp_dl = Path(td) / "delivery.csv"
        tmp_tl.write_bytes(tracklist.read_bytes())
        tmp_dl.write_bytes(delivery.read_bytes())

        print("====== 第一次扫描（无批注，有挂起项）======")
        tracks = parse_tracklist(str(tmp_tl))
        assert tracks, "应当解析出若干行"
        # 原始数据应被保留
        for t in tracks:
            assert t.raw_csv_line, f"第{t.row_number}行原始行丢失"
            assert t.raw_fields, f"第{t.row_number}行原始字段丢失"
            assert t.row_hash, f"第{t.row_number}行hash丢失"

        expected = infer_expected_versions(tracks)
        refs = parse_delivery_list(str(tmp_dl))
        engine = VersionReviewEngine(expected_versions=expected, delivery_refs=refs)
        session = new_session(str(tmp_tl), delivery_list_path=str(tmp_dl))
        session.tracks = tracks
        for t in tracks:
            engine.review(t)
        finalize_session(session)
        save_session(session)
        print_full_report(session, verbose=False)

        counters = session.counters()
        print("\n-- 计数器：", counters)
        assert counters["total"] > 0
        assert counters[ReviewStatus.SUSPENDED.value] >= 1, "应当至少有一条旧版母带挂起"

        # 第一次扫描应该抛旧版母带异常
        raised = False
        try:
            maybe_raise(session)
        except OldMasterDetected as e:
            print(f"\n✓ 正确抛出 OldMasterDetected：《{e.track_title}》")
            raised = True
        except UnresolvedIssuesRemain:
            # 挂起的都被先抛了，若没挂起则会到这
            pass
        assert raised, "应当检测到旧版母带挂起"

        # ============ 重扫：加载上次会话 + 模拟补完备注 ============
        print("\n====== 重扫：补完授权备注并对齐上次会话 ======")
        # 模拟用户在曲目表中补了两条备注：第 10 行「下期预告」补授权，第 8 行补授权到期
        lines = tmp_tl.read_text(encoding="utf-8").splitlines()
        # 简单按行号补：第 10 行(index 9) 上期预告，第 8 行(index 7) 广告插播
        patched = False
        for i, ln in enumerate(lines):
            if ln.startswith("下期预告,"):
                lines[i] = ln.rstrip() + ',"授权至2026-09-30,排练确认",'
                patched = True
            elif ln.startswith("广告插播 v2,") and "2027" not in ln:
                pass  # 已在原表里了
        assert patched, "应当补完下期预告行"
        tmp_tl.write_text("\n".join(lines) + "\n", encoding="utf-8")

        tracks2 = parse_tracklist(str(tmp_tl))
        prev_session = load_latest_session(str(tmp_tl))
        assert prev_session is not None, "应当能加载上次会话"
        align_with_previous_session(tracks2, prev_session)
        expected2 = infer_expected_versions(tracks2)
        engine2 = VersionReviewEngine(expected_versions=expected2, delivery_refs=refs)
        session2 = new_session(str(tmp_tl), delivery_list_path=str(tmp_dl))
        session2.tracks = tracks2
        for t in tracks2:
            engine2.review(t)
        finalize_session(session2)
        save_session(session2)
        print_full_report(session2, verbose=True)
        c2 = session2.counters()
        print("\n-- 第二次扫描计数器：", c2)
        # 下期预告补完备注后应当 pending → processed
        next_ep = next((t for t in tracks2 if "下期预告" in t.track_title), None)
        if next_ep:
            print(f"「下期预告」状态：{next_ep.status}  evidence={next_ep.version_evidence}")

    print("\n✓ 冒烟测试通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
