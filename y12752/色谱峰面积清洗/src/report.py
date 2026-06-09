import os
from datetime import datetime
import pandas as pd
from .batch_record import BatchRecordManager


def export_to_excel(manager: BatchRecordManager, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(output_dir, f"色谱峰面积清洗报告_{timestamp}.xlsx")

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        latest_df = _build_latest_summary(manager)
        latest_df.to_excel(writer, sheet_name="最终结果汇总", index=False)

        dup_df = _build_duplicate_summary(manager)
        if not dup_df.empty:
            dup_df.to_excel(writer, sheet_name="重复批号说明", index=False)

        all_df = manager.to_dataframe()
        all_df.to_excel(writer, sheet_name="全部记录明细", index=False)

        plain_df = _build_plain_language_explanation(manager)
        plain_df.to_excel(writer, sheet_name="安全员说明（可直接转发）", index=False)

        trace_df = _build_traceability_sheet(manager)
        trace_df.to_excel(writer, sheet_name="异常追溯明细", index=False)

    return file_path


def _build_latest_summary(manager: BatchRecordManager) -> pd.DataFrame:
    rows = []
    for rec in sorted(manager.get_all_latest(), key=lambda r: r.batch_no):
        row = {
            "批号": rec.batch_no,
            "样品名称": rec.sample_name,
            "记录编号": rec.record_id,
            "检测日期": rec.record_time.strftime("%Y-%m-%d"),
            "主峰面积": rec._get_main_peak_area(),
            "最终结论": rec.final_decision or "待确认",
            "是否复检批次": "是" if rec.is_duplicate else "否",
            "备注": rec.human_explanation if rec.is_duplicate else "",
        }
        rows.append(row)
    return pd.DataFrame(rows)


def _build_duplicate_summary(manager: BatchRecordManager) -> pd.DataFrame:
    dups = manager.get_duplicate_batches()
    if not dups:
        return pd.DataFrame()
    return pd.DataFrame(dups)


def _build_plain_language_explanation(manager: BatchRecordManager) -> pd.DataFrame:
    rows = []
    rows.append({
        "类型": "总体说明",
        "内容": (
            "各位同事：以下是本批次色谱峰面积清洗后的结果说明。"
            "所有批号均已与称量单和谱图判读记录核对，重复检测的批号已标注并采用最新数据。"
            "如对结果有疑问，可查看「异常追溯明细」表，每条记录均可回溯到原始谱图数据文件和处理意见。"
        ),
    })

    dups = manager.get_duplicate_batches()
    for d in dups:
        rows.append({
            "类型": f"批号重复说明 - {d['批号']}",
            "内容": d["说明"],
        })

    for rec in sorted(manager.get_all_latest(), key=lambda r: r.batch_no):
        if rec.final_decision and "复检" in rec.final_decision:
            rows.append({
                "类型": f"复检结果说明 - {rec.batch_no}",
                "内容": (
                    f"样品「{rec.sample_name}」（批号{rec.batch_no}）经过复检，"
                    f"最终结论为：{rec.final_decision}。"
                    f"原始谱图数据文件：{', '.join(p.get('数据文件名','') for p in rec.peak_areas)}。"
                ),
            })
        elif rec.interpretation and rec.interpretation.get("异常类型"):
            rows.append({
                "类型": f"异常处理说明 - {rec.batch_no}",
                "内容": (
                    f"样品「{rec.sample_name}」（批号{rec.batch_no}）检测中发现："
                    f"{rec.interpretation.get('异常类型','')}。"
                    f"处理意见：{rec.interpretation.get('处理意见','')}。"
                    f"复核结论：{rec.interpretation.get('复核结论','')}。"
                ),
            })

    return pd.DataFrame(rows)


def _build_traceability_sheet(manager: BatchRecordManager) -> pd.DataFrame:
    rows = []
    for batch_no in sorted(manager._records.keys()):
        trace = manager.trace_batch(batch_no)
        if "error" in trace:
            continue
        for idx, entry in enumerate(trace["记录时间线"], 1):
            row = {
                "批号": batch_no,
                "样品名称": trace["样品名称"],
                "第几次检测": idx,
                "记录编号": entry["记录编号"],
                "检测时间": entry["记录时间"],
                "记录类型": entry["记录类型"],
                "主峰面积": entry["主峰面积"],
                "处理意见": entry["处理意见"],
                "结论": entry["结论"],
                "谱图数据文件": "; ".join(entry["谱图数据文件"]),
            }
            if entry["称量详情"]:
                row["称量单号"] = entry["称量详情"].get("称量单号", "")
                row["称量重量(g)"] = entry["称量详情"].get("样品重量(g)", "")
                row["稀释倍数"] = entry["称量详情"].get("稀释倍数", "")
            if entry["判读详情"]:
                row["判读人"] = entry["判读详情"].get("判读人", "")
                row["峰形评价"] = entry["判读详情"].get("峰形评价", "")
                row["异常类型"] = entry["判读详情"].get("异常类型", "")
                row["复核人"] = entry["判读详情"].get("复核人", "")
            rows.append(row)
    return pd.DataFrame(rows)


def print_summary(manager: BatchRecordManager) -> None:
    latest = manager.get_all_latest()
    dups = manager.get_duplicate_batches()

    print("=" * 60)
    print("  色谱峰面积清洗结果摘要")
    print("=" * 60)
    print(f"总计处理批号数：{len(latest)}")
    print(f"存在重复检测的批号数：{len(dups)}")
    print()

    print("--- 各批号最终结果 ---")
    for rec in sorted(latest, key=lambda r: r.batch_no):
        tag = " [复检/重复]" if rec.is_duplicate else ""
        print(f"  {rec.batch_no} | {rec.sample_name:<15} | {rec.final_decision or '待确认'}{tag}")

    if dups:
        print()
        print("--- 重复批号说明 ---")
        for d in dups:
            print(f"  {d['批号']}: 共检测{d['检测次数']}次，采用记录 {d['采用记录']}")
            print(f"      {d['说明']}")

    print()
    print("--- 异常追溯入口 ---")
    print("  如需追溯某批号，请使用命令：")
    print("  python main.py trace --batch <批号>")
