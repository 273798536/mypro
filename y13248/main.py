from podcast_intro_alert.models import ChannelTableEntry
from podcast_intro_alert.detector import AnomalyDetector
from podcast_intro_alert.adjudicator import Adjudicator
from podcast_intro_alert.reporter import Reporter


SAMPLE_ENTRIES = [
    ChannelTableEntry(
        entry_id="E001", episode="EP12", channel="CH-A",
        song_name="晨光序曲", song_alias="开场曲",
        intro_file="intro_ep12_cha.wav", duration_sec=12.5,
        artist="李明",
    ),
    ChannelTableEntry(
        entry_id="E002", episode="EP12", channel="CH-B",
        song_name="夜行船", song_alias="开场曲",
        intro_file="intro_ep12_chb.wav", duration_sec=10.0,
        artist="王芳",
    ),
    ChannelTableEntry(
        entry_id="E003", episode="EP12", channel="CH-A",
        song_name="归途", song_alias=None,
        intro_file="intro_ep12_cha_2.wav", duration_sec=8.0,
        artist="李明",
    ),
    ChannelTableEntry(
        entry_id="E004", episode="EP13", channel="CH-A",
        song_name="晨光序曲", song_alias="开场曲",
        intro_file="intro_ep13_cha.wav", duration_sec=12.5,
        artist="张伟",
    ),
    ChannelTableEntry(
        entry_id="E005", episode="EP13", channel="CH-B",
        song_name="浮光", song_alias=None,
        intro_file=None, duration_sec=None,
        artist="赵敏",
    ),
    ChannelTableEntry(
        entry_id="E006", episode="EP13", channel="CH-C",
        song_name="海上花", song_alias="插曲A",
        intro_file="intro_ep13_chc.wav", duration_sec=15.0,
        artist="陈东",
    ),
    ChannelTableEntry(
        entry_id="E007", episode="EP14", channel="CH-A",
        song_name="海上花", song_alias="插曲A",
        intro_file="intro_ep14_cha.wav", duration_sec=14.5,
        artist="陈东",
    ),
    ChannelTableEntry(
        entry_id="E008", episode="EP14", channel="CH-B",
        song_name="归途", song_alias=None,
        intro_file=None, duration_sec=None,
        artist="刘洋",
    ),
]


def main() -> None:
    print("=" * 50)
    print("  播客片头异常提醒 — 端到端流程")
    print("=" * 50)

    print("\n[1] 载入舞台通道表...")
    entries = SAMPLE_ENTRIES
    print(f"    共 {len(entries)} 条记录")

    print("\n[2] 运行异常检测...")
    detector = AnomalyDetector()
    anomalies = detector.detect(entries)
    print(f"    发现 {len(anomalies)} 条异常")
    for a in anomalies:
        print(f"    - {a.anomaly_id} [{a.category.value}] {a.human_reason[:50]}...")

    print("\n[3] 处理异常（改判 / 确认 / 豁免 / 需补证据）...")
    adj = Adjudicator(entries)

    duplicate_anomalies = [a for a in anomalies if a.category.value == "曲名别名重复"]
    missing_anomalies = [a for a in anomalies if a.category.value == "片头素材缺失"]
    conflict_anomalies = [a for a in anomalies if a.category.value == "通道占用冲突"]
    metadata_anomalies = [a for a in anomalies if a.category.value == "元数据不一致"]

    if len(duplicate_anomalies) >= 1:
        a = duplicate_anomalies[0]
        rj = adj.rejudge(
            anomaly=a,
            operator="老许",
            new_verdict="确认同名异曲，保留各自片头",
            reason="EP12 CH-A「晨光序曲」与 CH-B「夜行船」虽共用别名「开场曲」，但确为两首不同曲目，分属不同通道，不影响片头播放",
            evidence_refs=["EP12_通道分配表_v2.pdf", "老许_改判说明.docx"],
        )
        print(f"    ✅ {a.anomaly_id} 改判 → {rj.new_verdict}")

    if len(duplicate_anomalies) >= 2:
        a = duplicate_anomalies[1]
        adj.confirm(a, conclusion="同一曲目跨期使用，片头文件已更新，无需修改")
        print(f"    ✅ {a.anomaly_id} 确认 → {a.conclusion}")

    if len(missing_anomalies) >= 1:
        a = missing_anomalies[0]
        adj.request_evidence(a)
        print(f"    ⚠️ {a.anomaly_id} 标记需补证据")

    if len(missing_anomalies) >= 2:
        a = missing_anomalies[1]
        adj.waive(a, reason="EP14「归途」为本期新增曲目，片头素材尚在制作中，预计本周五交付")
        print(f"    🟡 {a.anomaly_id} 豁免 → {a.conclusion}")

    if conflict_anomalies:
        a = conflict_anomalies[0]
        adj.confirm(a, conclusion="同通道分时安排：前 30 秒为「晨光序曲」片头，之后切入「归途」过渡段，已确认时序无误")
        print(f"    ✅ {a.anomaly_id} 确认 → {a.conclusion}")

    if metadata_anomalies:
        a = metadata_anomalies[0]
        rj = adj.rejudge(
            anomaly=a,
            operator="老许",
            new_verdict="EP13 版本为翻弹，演出者标注应为「张伟翻弹」而非仅「张伟」",
            reason="原始录入遗漏翻弹标识，已修正元数据",
            evidence_refs=["EP13_曲目信息更正单.xlsx"],
        )
        print(f"    ✅ {a.anomaly_id} 改判 → {rj.new_verdict}")

    print("\n[4] 生成报告...")
    reporter = Reporter(adj)
    output_dir = "output"
    paths = reporter.generate(entries, anomalies, output_dir)

    print("    生成文件：")
    for name, p in paths.items():
        print(f"    - {name}: {p}")

    print("\n[5] 交付状态总览：")
    resolved = sum(1 for a in anomalies if a.is_resolved())
    evidence = sum(1 for a in anomalies if a.status.value == "需补证据")
    pending = sum(1 for a in anomalies if a.status.value == "待处理")
    print(f"    已处理：{resolved}  |  需补证据：{evidence}  |  待处理：{pending}")

    print("\n" + "=" * 50)
    print("  完成！请查看 output/ 目录下的三份交付文件")
    print("=" * 50)


if __name__ == "__main__":
    main()
