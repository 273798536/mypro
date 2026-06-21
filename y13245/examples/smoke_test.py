"""冒烟测试 v2 —— 验证以下闭环：
1. 第 1 次扫描：挂起检测到旧版母带（退出码 2）
2. 用户补授权备注 → 同一曲目的 identity_hash **保持不变**
3. 用旧挂起时的 identity_hash 写人工批注 → 即使备注补了新内容也能命中
4. 第 2 次扫描应用外部批注 → 挂起被人工 ok 覆盖，退出码不再是 2
5. 没有传 annotation 文件的重扫 → 会话文件里保存的人工批注自动继承
"""
from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import shutil
from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from podcast_intro_review.parser import parse_tracklist, parse_delivery_list
from podcast_intro_review.engine import VersionReviewEngine, infer_expected_versions
from podcast_intro_review.models import ReviewStatus
from podcast_intro_review.storage import (
    new_session, save_session, align_with_previous_session,
    load_latest_session, apply_external_annotations, finalize_session,
    state_dir_for,
)
from podcast_intro_review.report import maybe_raise
from podcast_intro_review.exceptions import OldMasterDetected, UnresolvedIssuesRemain
from podcast_intro_review.__main__ import run as cli_run


def _silent_cli(argv):
    """跑 CLI，同时捕获输出与退出码"""
    out = io.StringIO()
    err = io.StringIO()
    rc = None
    with redirect_stdout(out), redirect_stderr(err):
        try:
            rc = cli_run(argv)
        except SystemExit as e:
            rc = e.code
    return rc, out.getvalue(), err.getvalue()


def main() -> int:
    tracklist = HERE / "tracklist.csv"
    delivery = HERE / "delivery.csv"

    with tempfile.TemporaryDirectory() as td:
        tmp_tl = Path(td) / "tracklist.csv"
        tmp_dl = Path(td) / "delivery.csv"
        tmp_tl.write_bytes(tracklist.read_bytes())
        tmp_dl.write_bytes(delivery.read_bytes())

        # ======================================
        # Step 1. 第一次扫描
        # ======================================
        print("==== Step 1: 第一次扫描（检测旧版母带 → 退出码 2）====")
        rc1, out1, err1 = _silent_cli([
            str(tmp_tl), "--delivery", str(tmp_dl), "-v", "--no-strict",
        ])
        # 读 session 拿 identity_hash
        sess1 = load_latest_session(str(tmp_tl))
        assert sess1 is not None, "第一次会话应该已保存"
        suspended = [t for t in sess1.tracks if t.status == ReviewStatus.SUSPENDED]
        print(f"  挂起项数: {len(suspended)}  退出码（no-strict）: {rc1}")
        assert len(suspended) >= 1, "示例数据至少 1 条挂起"

        # 选两条挂起项：一个 identity_hash 做批注 OK，另一个用来测补备注后是否仍能对齐
        s_old_master = next(t for t in suspended if "开场片头 v2" in t.track_title)
        s_rough = next(t for t in suspended if "嘉宾专属" in t.track_title or "rough" in (t.version_evidence + [t.remark]))

        id_hash_v2 = s_old_master.identity_hash
        id_hash_rough = s_rough.identity_hash
        raw_hash_v2_before = s_old_master.raw_hash
        print(f"  《开场片头 v2》 identity_hash={id_hash_v2}  raw_hash={raw_hash_v2_before}")

        # ======================================
        # Step 2. 用户在曲目表里补了授权备注 —— 同曲目的 identity_hash 不变，raw_hash 变
        # ======================================
        print("\n==== Step 2: 模拟用户补备注，验证 identity_hash 稳定性 ===")
        lines = tmp_tl.read_text(encoding="utf-8").splitlines()
        patched = False
        for i, ln in enumerate(lines):
            # 给《开场片头 v2》补「排练通过」备注 —— 这是 identity 稳定字段之外的改动
            if ln.startswith("开场片头 v2,"):
                parts = ln.split(",")
                # 备注位补内容
                while len(parts) < 5:
                    parts.append("")
                parts[3] = (parts[3].strip('"') + "  排练通过 已与录音师确认").strip()
                lines[i] = ",".join(parts)
                patched = True
            # 给 rough cut 那条补一个新的授权到期（整行原文改动更大）
            elif "嘉宾专属" in ln or "rough" in ln.lower():
                lines[i] = ln.rstrip() + ",授权至2026-10-01" if not ln.endswith(",") else ln.rstrip(",") + ',"授权至2026-10-01"'
                patched = True
        assert patched, "应当补完两条备注"
        tmp_tl.write_text("\n".join(lines) + "\n", encoding="utf-8")

        # 重解析，拿同一行的新 hash
        tracks_after = parse_tracklist(str(tmp_tl))
        after_v2 = next(t for t in tracks_after if "开场片头 v2" in t.track_title)
        print(f"  补完备注后《开场片头 v2》:")
        print(f"    identity_hash={after_v2.identity_hash}  不变? {after_v2.identity_hash == id_hash_v2}")
        print(f"    raw_hash     ={after_v2.raw_hash}  不变? {after_v2.raw_hash == raw_hash_v2_before}")
        assert after_v2.identity_hash == id_hash_v2, (
            f"BUG: identity_hash 在补备注后变了！\n"
            f"  前: {id_hash_v2}\n  后: {after_v2.identity_hash}"
        )
        assert after_v2.raw_hash != raw_hash_v2_before, "raw_hash 应该在行改动后变化"
        print("  ✓ identity_hash 稳定，raw_hash 精确")

        # ======================================
        # Step 3. 写人工批注文件（用 Step1 复制的 identity_hash）
        # ======================================
        print("\n==== Step 3: 用 Step1 的旧 identity_hash 写批注 → 应仍能命中 ===")
        ann_path = Path(td) / "annotations.json"
        ann_path.write_text(json.dumps([
            {
                "identity_hash": id_hash_v2,   # ← 故意用补备注前复制的
                "annotator": "老许",
                "status": "ok",
                "comment": "确认：虽版本旧但这次是客户要求的怀旧版，排练通过可交付",
            },
            {
                "identity_hash": id_hash_rough,
                "annotator": "接手同事A",
                "status": "reject",
                "comment": "rough cut 底噪超标，必须重录",
            },
        ], ensure_ascii=False, indent=2), encoding="utf-8")

        # 扫：外部批注要命中（即使行原文被改过），并且 SUSPENDED 要变为 MANUAL_OK/MANUAL_REJECT
        rc3, out3, err3 = _silent_cli([
            str(tmp_tl), "--delivery", str(tmp_dl),
            "--annotation", str(ann_path), "--no-strict",
        ])
        sess3 = load_latest_session(str(tmp_tl))

        v2_after = next(t for t in sess3.tracks if "开场片头 v2" in t.track_title)
        rough_after = next(t for t in sess3.tracks if "嘉宾专属" in t.track_title or "rough" in (t.remark or "").lower())
        print(f"  《开场片头 v2》状态: {v2_after.status.value}  批注人: {v2_after.manual_annotation and v2_after.manual_annotation.annotator}")
        print(f"  《嘉宾专属 rough》状态: {rough_after.status.value}  批注人: {rough_after.manual_annotation and rough_after.manual_annotation.annotator}")
        assert v2_after.status == ReviewStatus.MANUAL_OK, f"外部批注 OK 没生效，状态: {v2_after.status}"
        assert rough_after.status == ReviewStatus.MANUAL_REJECT, f"外部批注 REJECT 没生效，状态: {rough_after.status}"
        assert v2_after.manual_annotation.annotator == "老许"
        print("  ✓ 外部批注正确命中并覆盖自动挂起")

        # ======================================
        # Step 4. 不传 annotation 文件重扫 —— 会话里保存的批注应自动继承
        # ======================================
        print("\n==== Step 4: 不传 annotation 文件重扫 → 会话自动继承 ===")
        rc4, out4, err4 = _silent_cli([
            str(tmp_tl), "--delivery", str(tmp_dl), "--no-strict",
        ])
        sess4 = load_latest_session(str(tmp_tl))
        v2_4 = next(t for t in sess4.tracks if "开场片头 v2" in t.track_title)
        rough_4 = next(t for t in sess4.tracks if "嘉宾专属" in t.track_title or "rough" in (t.remark or "").lower())
        print(f"  《开场片头 v2》: {v2_4.status.value}  (应仍为 manual_ok)")
        print(f"  《嘉宾专属 rough》: {rough_4.status.value}  (应仍为 manual_reject)")
        assert v2_4.status == ReviewStatus.MANUAL_OK
        assert rough_4.status == ReviewStatus.MANUAL_REJECT
        print("  ✓ 会话文件持久化 + 自动继承生效")

        # ======================================
        # Step 5. 严格模式退出码：人工处理了两条挂起，Demo 草稿那条没处理仍挂起 → 退出码 2
        # 补一条批注给 Demo，再跑一次 → 应退出码 1（仍有待补/坏行，但无挂起）
        # ======================================
        print("\n==== Step 5: 严格模式退出码校验 ===")
        rc5, _, err5 = _silent_cli([str(tmp_tl), "--delivery", str(tmp_dl)])
        c = sess4.counters()
        print(f"  计数(处理两条批注后): pending={c['pending']}  suspended={c['suspended']}  bad_row={c['bad_row']}  manual_ok={c['manual_ok']}  manual_reject={c['manual_reject']}  processed={c['processed']}")
        print(f"  仍有 {c['suspended']} 条挂起 → 严格模式退出码: {rc5}")
        assert rc5 == 2, f"有挂起时预期退出码 2，实际 {rc5}"
        assert c["suspended"] == 1, f"预期剩 1 条挂起（开场片头 Demo 草稿）"
        print("  ✓ 未处理的挂起项正确触发退出码 2")

        # 给剩的 Demo 草稿也补批注
        s_demo = next(t for t in sess4.tracks if "Demo 草稿" in t.track_title)
        ann_path2 = Path(td) / "ann2.json"
        ann_path2.write_text(json.dumps([
            {"identity_hash": s_demo.identity_hash,
             "annotator": "接手同事B", "status": "reject",
             "comment": "Demo 版本不能直接用，等重录的最终版"},
        ], ensure_ascii=False), encoding="utf-8")
        rc6, _, err6 = _silent_cli([
            str(tmp_tl), "--delivery", str(tmp_dl),
            "--annotation", str(ann_path2),
        ])
        sess6 = load_latest_session(str(tmp_tl))
        c6 = sess6.counters()
        print(f"\n  给 Demo 草稿补完驳回批注后：suspended={c6['suspended']}  manual_reject={c6['manual_reject']}")
        print(f"  严格模式退出码: {rc6}  (应=1：无挂起但仍有待补证据+坏行)")
        assert rc6 == 1, f"无挂起但有 pending+bad 预期退出码 1，实际 {rc6}"
        assert c6["suspended"] == 0, f"所有挂起项都应被人工裁定，实际还剩 {c6['suspended']}"
        print("  ✓ 所有挂起项裁定后退出码正确回落为 1")

    print("\n" + "=" * 64)
    print("✅ 冒烟测试 v2 通过：identity_hash 稳定 + 三级批注匹配 + 应用顺序可靠")
    return 0


if __name__ == "__main__":
    sys.exit(main())
