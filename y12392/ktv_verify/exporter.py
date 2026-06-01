import csv
import os
from typing import List
from ktv_verify.engine import VerifyResult, Anomaly, VerifiedRecord
from ktv_verify.aggregator import AggregationResult


def export_verified_records(records: List[VerifiedRecord], filepath: str) -> str:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "行号", "日期", "包厢ID", "歌曲ID", "歌曲名",
            "版权方", "时长(秒)", "版本标签",
            "版本校验", "是否重复", "是否退款冲销", "核验状态",
        ])
        for r in records:
            status = "有效"
            if not r.version_ok:
                status = "版本异常"
            elif r.is_duplicate:
                status = "重复点播"
            elif r.is_refunded:
                status = "已退款冲销"
            writer.writerow([
                r.row_number, r.date, r.room_id, r.song_id, r.song_name,
                r.copyright_owner, r.duration_sec, r.version_tag,
                "通过" if r.version_ok else "不通过",
                "是" if r.is_duplicate else "否",
                "是" if r.is_refunded else "否",
                status,
            ])
    return filepath


def export_anomalies(anomalies: List[Anomaly], filepath: str) -> str:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["异常类型", "行号", "日期", "包厢ID", "歌曲ID", "歌曲名", "详细说明"])
        for a in anomalies:
            writer.writerow([
                a.anomaly_type, a.row_number, a.date, a.room_id,
                a.song_id, a.song_name, a.detail,
            ])
    return filepath


def export_owner_aggregation(agg: AggregationResult, filepath: str) -> str:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "版权方", "总点播次数", "有效点播次数", "有效点播占比(%)",
            "总时长(秒)", "有效时长(秒)", "时长占比(%)",
            "版本错配数", "重复数", "退款冲销数",
        ])
        for o in agg.by_owner:
            writer.writerow([
                o.copyright_owner, o.total_plays, o.valid_plays,
                o.valid_play_ratio, o.total_duration_sec, o.valid_duration_sec,
                o.duration_ratio, o.version_mismatch, o.duplicates, o.refunded,
            ])
    return filepath


def export_room_aggregation(agg: AggregationResult, filepath: str) -> str:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["包厢ID", "总点播次数", "有效点播次数", "总时长(秒)"])
        for r in agg.by_room:
            writer.writerow([r.room_id, r.total_plays, r.valid_plays, r.total_duration_sec])
    return filepath


def export_date_aggregation(agg: AggregationResult, filepath: str) -> str:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["日期", "总点播次数", "有效点播次数", "总时长(秒)"])
        for d in agg.by_date:
            writer.writerow([d.date, d.total_plays, d.valid_plays, d.total_duration_sec])
    return filepath


def generate_summary_text(
    verify_result: VerifyResult,
    agg: AggregationResult,
) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("KTV版权点播核验报告")
    lines.append("=" * 60)
    lines.append("")
    lines.append("【总体概览】")
    lines.append(f"  点播记录总数: {verify_result.total_playback}")
    lines.append(f"  有效点播数:   {verify_result.valid_playback}")
    lines.append(f"  版本异常数:   {verify_result.version_mismatch_count}")
    lines.append(f"  重复点播数:   {verify_result.duplicate_count}")
    lines.append(f"  退款冲销数:   {verify_result.refund_offset_count}")
    lines.append(f"  总时长(秒):   {agg.grand_total_duration}")
    lines.append(f"  有效时长(秒): {agg.grand_valid_duration}")
    lines.append("")

    lines.append("【版权方归集】")
    for o in agg.by_owner:
        lines.append(
            f"  {o.copyright_owner}: "
            f"点播{o.total_plays}次(有效{o.valid_plays}, {o.valid_play_ratio}%), "
            f"时长{o.total_duration_sec}s, "
            f"版本错{o.version_mismatch} 重复{o.duplicates} 退款{o.refunded}"
        )
    lines.append("")

    lines.append("【包厢归集】")
    for r in agg.by_room:
        lines.append(f"  包厢{r.room_id}: 点播{r.total_plays}次(有效{r.valid_plays}), 时长{r.total_duration_sec}s")
    lines.append("")

    lines.append("【日期归集】")
    for d in agg.by_date:
        lines.append(f"  {d.date}: 点播{d.total_plays}次(有效{d.valid_plays}), 时长{d.total_duration_sec}s")
    lines.append("")

    if verify_result.anomalies:
        lines.append("【异常明细】")
        for a in verify_result.anomalies:
            lines.append(f"  [{a.anomaly_type}] 行{a.row_number} {a.song_name}({a.song_id}) - {a.detail}")
    else:
        lines.append("【异常明细】无异常")

    lines.append("")
    lines.append("=" * 60)
    return "\n".join(lines)


def export_all(
    output_dir: str,
    verify_result: VerifyResult,
    agg: AggregationResult,
) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)
    exported = []

    f1 = export_verified_records(
        verify_result.verified_records,
        os.path.join(output_dir, "verified_records.csv"),
    )
    exported.append(f1)

    f2 = export_anomalies(
        verify_result.anomalies,
        os.path.join(output_dir, "anomalies.csv"),
    )
    exported.append(f2)

    f3 = export_owner_aggregation(
        agg,
        os.path.join(output_dir, "owner_aggregation.csv"),
    )
    exported.append(f3)

    f4 = export_room_aggregation(
        agg,
        os.path.join(output_dir, "room_aggregation.csv"),
    )
    exported.append(f4)

    f5 = export_date_aggregation(
        agg,
        os.path.join(output_dir, "date_aggregation.csv"),
    )
    exported.append(f5)

    summary = generate_summary_text(verify_result, agg)
    f6 = os.path.join(output_dir, "summary.txt")
    with open(f6, "w", encoding="utf-8") as f:
        f.write(summary)
    exported.append(f6)

    return exported
