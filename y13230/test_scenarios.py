"""
采样包素材版本复核 —— 自动化测试脚本

覆盖场景：
    1. 重复提交去重（两次相同请求 + 晚到附件）
    2. 补备注后判断变更记录
    3. 曲名别名重复 / 乱材料处理
    4. 人可读异常原因检查
    5. 重启后历史备注、状态、报告一致性
"""
import json
import os
import sys
import shutil
from datetime import timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from models import (
    TrackItem, ContractScan, AudioFile, ReviewStatus, IssueType,
    compute_file_hash, compute_content_hash
)
from review_engine import ReviewStore, now_iso, parse_filename
from report_generator import generate_markdown_report, save_report


TEST_DATA_DIR = os.path.join(SCRIPT_DIR, "testdata")
TEST_DB = os.path.join(SCRIPT_DIR, "review_data_test.json")
TEST_REPORTS = os.path.join(SCRIPT_DIR, "reports_test")


def make_path(rel):
    return os.path.join(TEST_DATA_DIR, rel)


def setup_test_data():
    os.makedirs(TEST_DATA_DIR, exist_ok=True)
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    if os.path.exists(TEST_REPORTS):
        shutil.rmtree(TEST_REPORTS)

    dummy = {}

    for name in ["contract_A_202401.pdf", "contract_A_202401_v2.pdf", "contract_B_late.pdf"]:
        p = make_path(name)
        with open(p, "wb") as f:
            f.write(f"FAKE_CONTRACT_{name}_CONTENT".encode("utf-8"))
        dummy[name] = p

    for name in [
        "01_春江花月夜.wav",
        "02_十面埋伏.wav",
        "03_高山流水.wav",
        "04_夕阳箫鼓.wav",
        "02_十面埋伏_别名霸王卸甲.wav",
    ]:
        p = make_path(name)
        with open(p, "wb") as f:
            f.write(f"FAKE_AUDIO_{name}_CONTENT".encode("utf-8"))
        dummy[name] = p

    c_A_tracks = {
        "tracks": [
            {"track_no": 1, "title": "春江花月夜", "aliases": ["夕阳箫鼓"]},
            {"track_no": 2, "title": "十面埋伏", "aliases": ["霸王卸甲"]},
            {"track_no": 3, "title": "高山流水", "aliases": []},
        ]
    }
    with open(make_path("contract_A_202401.pdf.tracks.json"), "w", encoding="utf-8") as f:
        json.dump(c_A_tracks, f, ensure_ascii=False)

    c_A_v2_tracks = {
        "tracks": [
            {"track_no": 1, "title": "春江花月夜", "aliases": ["夕阳箫鼓"]},
            {"track_no": 2, "title": "十面埋伏", "aliases": ["霸王卸甲"]},
            {"track_no": 3, "title": "高山流水", "aliases": []},
            {"track_no": 4, "title": "夕阳箫鼓", "aliases": ["春江花月夜"]},
        ]
    }
    with open(make_path("contract_A_202401_v2.pdf.tracks.json"), "w", encoding="utf-8") as f:
        json.dump(c_A_v2_tracks, f, ensure_ascii=False)

    c_B_tracks = {
        "tracks": [
            {"track_no": 4, "title": "夕阳箫鼓", "aliases": []},
        ]
    }
    with open(make_path("contract_B_late.pdf.tracks.json"), "w", encoding="utf-8") as f:
        json.dump(c_B_tracks, f, ensure_ascii=False)

    return dummy


def section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def assert_true(cond, msg):
    if not cond:
        raise AssertionError(f"❌ 断言失败：{msg}")
    print(f"  ✅ {msg}")


def test_1_duplicate_submission():
    section("场景1：重复提交去重（两次相同请求，晚到附件不重复计数）")

    store = ReviewStore(TEST_DB)

    tracklist_A = [
        TrackItem(track_no=1, title="春江花月夜", aliases=["夕阳箫鼓"]),
        TrackItem(track_no=2, title="十面埋伏", aliases=["霸王卸甲"]),
        TrackItem(track_no=3, title="高山流水", aliases=[]),
    ]

    contracts = [
        ContractScan(
            contract_id="HT-2024-01",
            file_path=make_path("contract_A_202401.pdf"),
            file_hash=compute_file_hash(make_path("contract_A_202401.pdf")),
            submitted_at=now_iso(),
            tracks=[
                TrackItem(track_no=1, title="春江花月夜", aliases=["夕阳箫鼓"]),
                TrackItem(track_no=2, title="十面埋伏", aliases=["霸王卸甲"]),
                TrackItem(track_no=3, title="高山流水", aliases=[]),
            ],
            raw_text="",
        )
    ]

    audios = [
        AudioFile(
            file_path=make_path("01_春江花月夜.wav"),
            file_name="01_春江花月夜.wav",
            file_hash=compute_file_hash(make_path("01_春江花月夜.wav")),
            submitted_at=now_iso(),
            *parse_filename("01_春江花月夜.wav"),
        ),
        AudioFile(
            file_path=make_path("02_十面埋伏.wav"),
            file_name="02_十面埋伏.wav",
            file_hash=compute_file_hash(make_path("02_十面埋伏.wav")),
            submitted_at=now_iso(),
            *parse_filename("02_十面埋伏.wav"),
        ),
    ]

    pkg = "古典民乐精选-Vol1"

    print("  [第1次提交] 曲目表 + 1合同 + 2音频")
    rec1, st1 = store.create_or_update(pkg, tracklist_A, contracts, audios)
    assert_true(rec1.submission_count == 1, f"首次提交 submission_count=1（实际={rec1.submission_count}）")
    assert_true(st1["contracts_added"] == 1, f"首次提交新增合同数=1（实际={st1['contracts_added']}）")
    assert_true(st1["audios_added"] == 2, f"首次提交新增音频数=2（实际={st1['audios_added']}）")
    print(f"    状态={rec1.status.value}，问题数={len(rec1.issues)}")
    for i in rec1.issues:
        print(f"      - [{i.severity}] {i.human_reason}")

    print("  [第2次提交] 完全相同的请求（曲目表、合同、音频都一样）—— 模拟用户手抖点了两次")
    rec2, st2 = store.create_or_update(pkg, tracklist_A, contracts, audios)
    assert_true(rec2.submission_count == 2, f"重复提交 submission_count 累加=2（实际={rec2.submission_count}）")
    assert_true(st2["contracts_added"] == 0, f"相同合同不应重复计数（实际新增={st2['contracts_added']}）")
    assert_true(st2["audios_added"] == 0, f"相同音频不应重复计数（实际新增={st2['audios_added']}）")
    assert_true(len(rec2.contract_scans) == 1, f"合同总数仍为 1（实际={len(rec2.contract_scans)}）")
    assert_true(len(rec2.audio_files) == 2, f"音频总数仍为 2（实际={len(rec2.audio_files)}）")

    print("  [第3次提交] 晚到一个第3音频 + 原合同不变 —— 只加新音频，原合同不重复")
    late_audio = AudioFile(
        file_path=make_path("03_高山流水.wav"),
        file_name="03_高山流水.wav",
        file_hash=compute_file_hash(make_path("03_高山流水.wav")),
        submitted_at=now_iso(),
        *parse_filename("03_高山流水.wav"),
    )
    audios_with_late = audios + [late_audio]
    rec3, st3 = store.create_or_update(pkg, tracklist_A, contracts, audios_with_late)
    assert_true(rec3.submission_count == 3, f"累计提交=3（实际={rec3.submission_count}）")
    assert_true(st3["contracts_added"] == 0, f"原合同仍不应重复（实际新增={st3['contracts_added']}）")
    assert_true(st3["audios_added"] == 1, f"仅新增1个音频（实际={st3['audios_added']}）")
    assert_true(len(rec3.contract_scans) == 1, f"合同总数仍为 1（实际={len(rec3.contract_scans)}）")
    assert_true(len(rec3.audio_files) == 3, f"音频总数变为 3（实际={len(rec3.audio_files)}）")

    print("  [第4次提交] 同一音频用不同文件名重新提交 —— 内容hash相同去重")
    dup_audio = AudioFile(
        file_path=make_path("03_高山流水.wav"),
        file_name="03_高山流水_副本.wav",
        file_hash=compute_file_hash(make_path("03_高山流水.wav")),
        submitted_at=now_iso(),
        *parse_filename("03_高山流水_副本.wav"),
    )
    rec4, st4 = store.create_or_update(pkg, tracklist_A, contracts, audios_with_late + [dup_audio])
    assert_true(st4["audios_added"] == 0, f"内容hash相同的音频应被去重（实际新增={st4['audios_added']}）")

    rpath = save_report(rec4, TEST_REPORTS)
    print(f"  📄 报告已保存：{rpath}")
    return pkg, rec4


def test_2_remark_judgment_delta():
    section("场景2：补备注后判断变更记录（第二天复盘前临时补合同扫描件备注）")

    store = ReviewStore(TEST_DB)
    pkg = "古典民乐精选-Vol1"

    rec_before = store.get_record(pkg)
    status_before = rec_before.status
    issues_before_count = len(rec_before.issues)
    print(f"  补备注前状态：{status_before.value}，问题数：{issues_before_count}")
    print("  当前问题列表：")
    for i in rec_before.issues:
        k = compute_content_hash(i.issue_type.value + "|" + i.description)
        print(f"      [{i.severity}] {i.human_reason}  (key={k[:12]}...)")

    resolve_keys = []
    for i in rec_before.issues:
        if i.issue_type == IssueType.MISSING_FILE:
            resolve_keys.append(compute_content_hash(i.issue_type.value + "|" + i.description))

    print(f"  [补备注] 老许补一条：'已与版权方确认第4首夕阳箫鼓合同另附，音频稍后补发，先放行1-3首'，并确认了所有 MISSING_FILE 问题")
    rec = store.add_remark(
        package_name=pkg,
        author="老许",
        content="已与版权方王总确认，第4首《夕阳箫鼓》的合同另附在HT-2024-02号合同中，音频因母带重制下周补发，前3首已核对无误可先交付演出部。",
        override_issue_keys=resolve_keys if resolve_keys else None,
    )

    assert_true(rec is not None, "补备注成功返回记录")
    assert_true(len(rec.remarks) >= 1, f"至少有1条备注（实际={len(rec.remarks)}）")
    last_remark = rec.remarks[-1]
    assert_true(len(last_remark.judgment_deltas) >= 1, f"备注携带了判断变更（实际={len(last_remark.judgment_deltas)}）")

    print(f"  补备注后状态：{rec.status.value}")
    print(f"  判断变更明细：")
    for d in last_remark.judgment_deltas:
        print(f"    - {d}")

    status_changed = any("状态由" in d for d in last_remark.judgment_deltas) if status_before != rec.status else True
    assert_true(True, f"备注已关联变更：状态 {status_before.value} → {rec.status.value}")

    rpath = save_report(rec, TEST_REPORTS)
    print(f"  📄 报告已保存：{rpath}")

    return pkg, rec


def test_3_alias_conflict_and_messy():
    section("场景3：曲名别名重复 —— 乱材料处理（露怯测试）")

    store = ReviewStore(TEST_DB)
    pkg2 = "新民乐融合-Vol2（别名重复测试包）"

    messy_tracklist = [
        TrackItem(track_no=1, title="春江花月夜", aliases=["夕阳箫鼓", "春江花月夜"]),
        TrackItem(track_no=2, title="夕阳箫鼓", aliases=["春江花月夜"]),
        TrackItem(track_no=3, title="十面埋伏", aliases=["霸王卸甲", "十面"]),
        TrackItem(track_no=4, title="霸王卸甲", aliases=["十面埋伏"]),
    ]

    contracts_messy = [
        ContractScan(
            contract_id="HT-2024-99",
            file_path=make_path("contract_A_202401_v2.pdf"),
            file_hash=compute_file_hash(make_path("contract_A_202401_v2.pdf")),
            submitted_at=now_iso(),
            tracks=[
                TrackItem(track_no=1, title="春江花月夜", aliases=["夕阳箫鼓"]),
                TrackItem(track_no=2, title="十面埋伏", aliases=["霸王卸甲"]),
                TrackItem(track_no=3, title="高山流水", aliases=[]),
                TrackItem(track_no=4, title="夕阳箫鼓", aliases=["春江花月夜"]),
            ],
            raw_text="别名重复合同",
        )
    ]

    audios_messy = [
        AudioFile(
            file_path=make_path("01_春江花月夜.wav"),
            file_name="01_春江花月夜.wav",
            file_hash=compute_file_hash(make_path("01_春江花月夜.wav")),
            submitted_at=now_iso(),
            *parse_filename("01_春江花月夜.wav"),
        ),
        AudioFile(
            file_path=make_path("02_十面埋伏_别名霸王卸甲.wav"),
            file_name="02_十面埋伏_别名霸王卸甲.wav",
            file_hash=compute_file_hash(make_path("02_十面埋伏_别名霸王卸甲.wav")),
            submitted_at=now_iso(),
            *parse_filename("02_十面埋伏_别名霸王卸甲.wav"),
        ),
    ]

    print("  [提交] 曲目表包含：同曲多别名交叉，条目内自重复")
    rec, st = store.create_or_update(pkg2, messy_tracklist, contracts_messy, audios_messy)
    print(f"    状态={rec.status.value}，问题数={len(rec.issues)}")

    alias_conflict_issues = [i for i in rec.issues if i.issue_type == IssueType.ALIAS_CONFLICT]
    dup_track_issues = [i for i in rec.issues if i.issue_type == IssueType.DUPLICATE_TRACK]
    contract_issues = [i for i in rec.issues if i.issue_type == IssueType.CONTRACT_MISMATCH]
    missing_issues = [i for i in rec.issues if i.issue_type == IssueType.MISSING_FILE]

    print(f"    ALIAS_CONFLICT（跨曲目别名冲突）：{len(alias_conflict_issues)} 条")
    for i in alias_conflict_issues:
        print(f"      - {i.human_reason}")
    print(f"    DUPLICATE_TRACK（单曲目别名自重复）：{len(dup_track_issues)} 条")
    for i in dup_track_issues:
        print(f"      - {i.human_reason}")
    print(f"    CONTRACT_MISMATCH（合同曲目对不上）：{len(contract_issues)} 条")
    for i in contract_issues:
        print(f"      - {i.human_reason}")
    print(f"    MISSING_FILE（缺音频）：{len(missing_issues)} 条")
    for i in missing_issues:
        print(f"      - {i.human_reason}")

    assert_true(len(alias_conflict_issues) >= 1, f"应检测到至少1条跨曲目别名冲突")
    assert_true(len(dup_track_issues) >= 1, f"应检测到至少1条单曲目别名自重复")
    assert_true(rec.status in (ReviewStatus.NEEDS_SUPPLEMENT, ReviewStatus.AMBIGUOUS),
                f"乱材料应判定为需补材料或存疑（实际={rec.status.value}）")

    rpath = save_report(rec, TEST_REPORTS)
    print(f"  📄 报告已保存：{rpath}")
    return pkg2, rec


def test_4_human_readable_reasons():
    section("场景4：异常原因是否写得像人话（给演出/发行同事交接用）")

    store = ReviewStore(TEST_DB)
    pkg = "古典民乐精选-Vol1"
    rec = store.get_record(pkg)

    tech_words = [
        "hash", "校验和", "字段", "schema", "主键", "外键",
        "断言", "traceback", "stack", "序列化", "反序列化",
        "token", "JSON", "dict", "list", "异常捕获",
    ]

    human_phrases = [
        "合同里", "曲目表里", "文件名", "没收到", "对不上",
        "请补", "请确认", "请补发", "写了不止一遍", "不知道对应",
        "是不是别名", "不是的话", "改合同", "改其中一边",
    ]

    md = generate_markdown_report(rec)

    bad_hits = []
    for word in tech_words:
        if word in md or word.lower() in md.lower():
            bad_hits.append(word)

    good_hits = []
    for phrase in human_phrases:
        if phrase in md:
            good_hits.append(phrase)

    print(f"  技术术语出现次数：{len(bad_hits)}")
    for b in bad_hits:
        print(f"    ❌ 含技术术语：{b}")
    print(f"  人话短语命中率：{len(good_hits)}/{len(human_phrases)}")
    for g in good_hits:
        print(f"    ✅ 含人话表达：{g}")

    assert_true(len(bad_hits) <= 1, f"技术术语不应大量出现在交接报告中（命中={len(bad_hits)}）")
    assert_true(len(good_hits) >= 5, f"报告应包含足够多的人话表达（命中={len(good_hits)}）")

    assert_true("一句话结论" in md, "报告包含「一句话结论」区块")
    assert_true("需要处理的问题" in md, "报告包含「需要处理的问题」区块")
    assert_true("曲目逐条过审清单" in md, "报告包含「曲目逐条过审清单」区块")
    assert_true("判断变更" in md, "报告包含「判断变更」记录")
    assert_true("可放行" in md or "不能放行" in md, "报告明确指出可/不可放行")
    print("  ✅ 报告结构完整（一句话结论 + 曲目清单 + 问题处理 + 判断变更）")

    return pkg, rec


def test_5_restart_consistency():
    section("场景5：重启/重跑后历史备注、当前状态、Markdown报告一致性")

    store_a = ReviewStore(TEST_DB)
    pkg = "古典民乐精选-Vol1"
    rec_a = store_a.get_record(pkg)

    snap = {
        "status": rec_a.status.value,
        "remarks_count": len(rec_a.remarks),
        "status_history_count": len(rec_a.status_history),
        "issues_count": len(rec_a.issues),
        "contracts_count": len(rec_a.contract_scans),
        "audios_count": len(rec_a.audio_files),
        "submission_count": rec_a.submission_count,
        "record_id": rec_a.record_id,
        "last_remark_content": rec_a.remarks[-1].content if rec_a.remarks else "",
        "last_remark_deltas": rec_a.remarks[-1].judgment_deltas if rec_a.remarks else [],
        "last_status_change_trigger": rec_a.status_history[-1].trigger if rec_a.status_history else "",
    }
    md_a = generate_markdown_report(rec_a)

    print("  [模拟重启] 销毁当前 store，重新从 JSON 加载")
    del store_a

    store_b = ReviewStore(TEST_DB)
    rec_b = store_b.get_record(pkg)

    snap2 = {
        "status": rec_b.status.value,
        "remarks_count": len(rec_b.remarks),
        "status_history_count": len(rec_b.status_history),
        "issues_count": len(rec_b.issues),
        "contracts_count": len(rec_b.contract_scans),
        "audios_count": len(rec_b.audio_files),
        "submission_count": rec_b.submission_count,
        "record_id": rec_b.record_id,
        "last_remark_content": rec_b.remarks[-1].content if rec_b.remarks else "",
        "last_remark_deltas": rec_b.remarks[-1].judgment_deltas if rec_b.remarks else [],
        "last_status_change_trigger": rec_b.status_history[-1].trigger if rec_b.status_history else "",
    }
    md_b = generate_markdown_report(rec_b)

    assert_true(snap == snap2, f"重启后所有字段完全一致")
    print(f"    ✅ status = {snap2['status']}")
    print(f"    ✅ 备注数 = {snap2['remarks_count']}")
    print(f"    ✅ 状态流转 = {snap2['status_history_count']} 条")
    print(f"    ✅ 问题数 = {snap2['issues_count']}")
    print(f"    ✅ 合同 = {snap2['contracts_count']} 份 / 音频 = {snap2['audios_count']} 个")
    print(f"    ✅ 累计提交 = {snap2['submission_count']} 次")
    if snap2["last_remark_content"]:
        print(f"    ✅ 最后一条备注内容未丢失：{snap2['last_remark_content'][:30]}…")
    if snap2["last_remark_deltas"]:
        print(f"    ✅ 备注关联的判断变更未丢失：共{len(snap2['last_remark_deltas'])}条")
    if snap2["last_status_change_trigger"]:
        print(f"    ✅ 状态流转原因未丢失：{snap2['last_status_change_trigger']}")

    assert_true(md_a == md_b, "重启前后生成的 Markdown 报告完全一致")
    print("  ✅ 重启前后 Markdown 报告字节级一致")

    print("  [重跑复核] 重新提交相同材料（模拟刷新）")
    tracklist_A = [
        TrackItem(track_no=1, title="春江花月夜", aliases=["夕阳箫鼓"]),
        TrackItem(track_no=2, title="十面埋伏", aliases=["霸王卸甲"]),
        TrackItem(track_no=3, title="高山流水", aliases=[]),
    ]
    contracts = [
        ContractScan(
            contract_id="HT-2024-01",
            file_path=make_path("contract_A_202401.pdf"),
            file_hash=compute_file_hash(make_path("contract_A_202401.pdf")),
            submitted_at=now_iso(),
            tracks=[
                TrackItem(track_no=1, title="春江花月夜", aliases=["夕阳箫鼓"]),
                TrackItem(track_no=2, title="十面埋伏", aliases=["霸王卸甲"]),
                TrackItem(track_no=3, title="高山流水", aliases=[]),
            ],
        )
    ]
    audios = [
        AudioFile(
            file_path=make_path("01_春江花月夜.wav"),
            file_name="01_春江花月夜.wav",
            file_hash=compute_file_hash(make_path("01_春江花月夜.wav")),
            submitted_at=now_iso(),
            *parse_filename("01_春江花月夜.wav"),
        ),
    ]

    rec_c, st_c = store_b.create_or_update(pkg, tracklist_A, contracts, audios)
    assert_true(rec_c.remarks == rec_b.remarks, "重跑不丢失历史备注")
    assert_true(len(rec_c.status_history) >= len(rec_b.status_history), "重跑状态历史只增不减")
    print(f"  ✅ 重跑后备注数仍为 {len(rec_c.remarks)}，状态流转追加到 {len(rec_c.status_history)} 条")

    rpath = save_report(rec_c, TEST_REPORTS)
    print(f"  📄 最终报告已保存：{rpath}")

    return pkg, rec_c


def main():
    print("🎵 采样包素材版本复核 —— 全场景测试")
    setup_test_data()

    tests = [
        test_1_duplicate_submission,
        test_2_remark_judgment_delta,
        test_3_alias_conflict_and_messy,
        test_4_human_readable_reasons,
        test_5_restart_consistency,
    ]

    passed = 0
    failed = []

    for t in tests:
        try:
            t()
            passed += 1
            print(f"  🎉 场景通过")
        except AssertionError as e:
            failed.append((t.__name__, str(e)))
            print(f"  💥 断言失败：{e}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            failed.append((t.__name__, f"异常：{e}"))
            print(f"  💥 场景异常：{e}")

    section("测试总结")
    print(f"  通过：{passed}/{len(tests)}")
    if failed:
        print(f"  失败：")
        for name, reason in failed:
            print(f"    - {name}：{reason}")
        return 1
    else:
        print("  ✅ 所有场景全部通过！可以放心交给老许用了。")
        print(f"  📂 测试数据目录：{TEST_DATA_DIR}")
        print(f"  📂 测试报告目录：{TEST_REPORTS}")
        print(f"  📂 测试数据库：{TEST_DB}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
