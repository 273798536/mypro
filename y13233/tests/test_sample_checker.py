from __future__ import annotations

import pytest

from sample_checker import (
    SamplePackage,
    SampleItem,
    Note,
    NoteType,
    CheckStatus,
    IdempotencyGuard,
    SampleAnomalyDetector,
    HistoryTracker,
    CrossValidator,
    DeliveryChecklist,
    DeliveryChecklistItem,
)


def make_pkg():
    pkg = SamplePackage(name="测试包", version="v1.0")
    pkg.items = [
        SampleItem(
            name="a.wav",
            duration_sec=3.0,
            sample_rate=44100,
            bit_depth=16,
            timecode_offset_beats=0.0,
            checksum="aaa",
            channel_count=2,
        ),
        SampleItem(
            name="b.wav",
            duration_sec=0.1,
            sample_rate=22050,
            bit_depth=8,
            timecode_offset_beats=0.5,
            checksum="",
            channel_count=6,
        ),
    ]
    pkg.delivery_checklist = DeliveryChecklist(
        items=[
            DeliveryChecklistItem(name="素材A", found=True),
            DeliveryChecklistItem(name="素材B", found=False),
        ]
    )
    return pkg


# ========== 幂等性 ==========
def test_idempotency_same_note_not_counted_twice():
    pkg = make_pkg()
    n1 = Note(
        note_type=NoteType.REHEARSAL,
        content="彩排确认OK",
        author="老赵",
        affects_fields=["duration_min"],
    )
    pkg.add_note(n1)
    pkg.add_note(n1)  # 物理上两条，内容签名相同

    idem = IdempotencyGuard()
    detector = SampleAnomalyDetector()

    rec1 = detector.scan(pkg, operator="小王", idem_guard=idem)
    # 备注数去重后应该是 1
    fresh, skipped = idem.filter_new_notes(pkg.notes, rec1.record_id)
    assert len(fresh) == 0, "同签名备注不应再次被当作新增"
    assert len(skipped) == 2
    assert idem.dedupe_note_count(pkg.notes) == 1

    # 再扫一次，完全相同请求
    rec2 = detector.scan(pkg, operator="小王", idem_guard=idem)
    # 幂等提示应该显示无重复或跳过
    sigs_rec1 = set(rec1.note_signatures_seen)
    sigs_rec2 = set(rec2.note_signatures_seen)
    assert sigs_rec1 == sigs_rec2, "相同包内容两次扫描备注签名集一致"


def test_idempotency_new_note_detected():
    pkg = make_pkg()
    idem = IdempotencyGuard()
    detector = SampleAnomalyDetector()

    rec1 = detector.scan(pkg, operator="小王", idem_guard=idem)

    n1 = Note(
        note_type=NoteType.REHEARSAL,
        content="补一条排练备注",
        author="小赵",
        affects_fields=["duration_min"],
    )
    pkg.add_note(n1)

    added, removed = idem.diff_since_last_scan(pkg.notes)
    assert len(added) == 1
    assert len(removed) == 0


# ========== 时码半拍 HANG ==========
def test_half_beat_triggers_hang():
    pkg = make_pkg()
    pkg.items[1].timecode_offset_beats = 0.48
    detector = SampleAnomalyDetector()
    normal, hang = detector.check_timecode(pkg)
    assert len(hang) == 1
    assert hang[0].status == CheckStatus.HANG
    assert hang[0].requires_confirm_role == "运营主管"
    # 不能给假稳定结论 —— 绝不能是 PASS/WARNING
    assert hang[0].status not in (CheckStatus.PASS, CheckStatus.WARNING)


def test_non_half_beat_not_hang():
    pkg = make_pkg()
    pkg.items[1].timecode_offset_beats = 1.3
    detector = SampleAnomalyDetector()
    normal, hang = detector.check_timecode(pkg)
    assert len(hang) == 0
    assert len(normal) >= 1


# ========== 舞台通道备注改变判断说明 ==========
def test_stage_channel_note_affects_judgments():
    pkg = make_pkg()
    # b.wav 声道数=6 必然触发 warning；然后舞台通道备注覆盖它
    stage_note = Note(
        note_type=NoteType.STAGE_CHANNEL,
        content="B素材走环绕，声道数6正确",
        author="舞台组",
        affects_fields=["channels"],
    )
    pkg.add_note(stage_note)

    detector = SampleAnomalyDetector()
    rec = detector.scan(pkg)

    # 应该能找到「舞台通道表备注：判断影响说明」的汇总条目
    summaries = [r for r in rec.results if "判断影响说明" in r.title]
    assert len(summaries) == 1
    assert rec.stage_channel_note_applied is True
    # 声道数的 warning 应该被覆盖为 PASS
    chan_results = [r for r in rec.results if "声道数" in r.title]
    for r in chan_results:
        if "b.wav" in r.title or "B素材" in r.title:
            assert r.status == CheckStatus.PASS
            assert stage_note.note_id in r.changed_by_note_ids


def test_stage_channel_does_not_clear_hang():
    pkg = make_pkg()
    pkg.items[1].timecode_offset_beats = 0.5
    stage_note = Note(
        note_type=NoteType.STAGE_CHANNEL,
        content="半拍系故意设计，但仍需主管确认",
        author="舞台组",
        affects_fields=["timecode_half_beat_hang"],
    )
    pkg.add_note(stage_note)

    detector = SampleAnomalyDetector()
    rec = detector.scan(pkg)
    hangs = [r for r in rec.results if r.status == CheckStatus.HANG]
    assert len(hangs) >= 1, "HANG 状态不应该被舞台通道备注直接消除"
    # 但应该标记 changed_by_note_ids
    h = hangs[0]
    assert stage_note.note_id in h.changed_by_note_ids or "舞台通道" in h.detail


# ========== 交叉验证 ==========
def test_cross_validation_missing_annotation_flagged():
    pkg = make_pkg()
    detector = SampleAnomalyDetector()
    cross = CrossValidator()

    rec = detector.scan(pkg, operator="小王")
    cross.apply(pkg, rec, None)

    # 清单里"素材B" found=False，且批注为空 → 应报问题
    assert rec.cross_validation_ok is False
    issues_text = "\n".join(rec.cross_validation_issues)
    assert "素材B" in issues_text or "缺失" in issues_text


def test_cross_validation_alignment_pass():
    pkg = make_pkg()
    pkg.manual_annotations.append("素材B缺，下午重新交付")
    detector = SampleAnomalyDetector()
    cross = CrossValidator()

    rec = detector.scan(pkg, operator="小王")
    cross.apply(pkg, rec, None)

    text = "\n".join(rec.cross_validation_issues)
    assert "已对齐" in text


# ========== 历史 & 林姐改动留存 ==========
def test_history_tracks_teacher_edits():
    pkg = make_pkg()
    hist = HistoryTracker()
    detector = SampleAnomalyDetector()

    hist.snapshot_package(pkg, "系统", "基线")

    # 林姐改
    teacher_note = Note(
        note_type=NoteType.TEACHER_EDIT,
        content="林姐：b.wav 时长故意短，不要警告",
        author="音乐老师·林姐",
        affects_fields=["duration_min"],
    )
    pkg.add_note(teacher_note)
    hist.snapshot_package(pkg, "音乐老师·林姐", "临改时长判定")

    rec = detector.scan(pkg, "小王")
    hist.record_scan(pkg, rec)

    # 按作者过滤
    lin_changes = hist.get_change_log(author="音乐老师·林姐")
    assert len(lin_changes) >= 1
    assert "临改" in lin_changes[0].changed_reason

    # 交接班摘要里必须出现林姐改动
    summary = hist.handoff_summary(pkg, rec)
    assert "林姐" in summary or "音乐老师" in summary
    # 变更历史
    assert "完整变更轨迹" in summary or "版本" in summary


def test_handoff_shows_history_not_just_final():
    pkg = make_pkg()
    hist = HistoryTracker()
    detector = SampleAnomalyDetector()
    cross = CrossValidator()

    hist.snapshot_package(pkg, "系统", "基线v1.0")
    rec1 = detector.scan(pkg, "早班·小李")
    cross.apply(pkg, rec1, None)
    hist.record_scan(pkg, rec1)

    # 加一条备注，升版
    pkg.add_note(Note(
        note_type=NoteType.AUTHORIZATION,
        content="版权确认OK",
        author="法务·小陈",
    ))
    pkg.version = "v1.1"
    hist.snapshot_package(pkg, "法务·小陈", "加版权备注+升版v1.1")
    rec2 = detector.scan(pkg, "白班·小王")
    cross.apply(pkg, rec2, rec1)
    hist.record_scan(pkg, rec2)

    summary = hist.handoff_summary(pkg, rec2)
    # 必须有轨迹相关内容（含版本 1 2、两个操作人）
    assert "v1.1" in summary
    assert "法务" in summary or "小陈" in summary or "版权" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
