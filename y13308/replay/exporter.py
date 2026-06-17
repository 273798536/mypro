"""导出模块：确保导出文件的状态标记与页面显示一致"""

import pandas as pd
import os
import json
from datetime import datetime
from typing import List, Dict, Any
from replay.models import Record, ProcessStats
from replay.constants import MARK_DUPLICATE, MARK_OUTLIER


def ensure_export_dir(export_dir: str = "exports") -> str:
    """确保导出目录存在"""
    if not os.path.exists(export_dir):
        os.makedirs(export_dir)
    return export_dir


def records_to_dataframe(records: List[Record]) -> pd.DataFrame:
    """将记录列表转换为 DataFrame，保持与页面显示一致的字段名和状态"""
    data = []
    for rec in records:
        row = rec.to_dict()
        data.append(row)
    return pd.DataFrame(data)


def export_csv(records: List[Record], stats: ProcessStats,
              export_dir: str = "exports", prefix: str = "replay") -> str:
    """
    导出 CSV 文件。
    状态标记与页面显示完全一致：
    - 处理状态：已处理/已跳过/坏行
    - 重复评测标记："重复评测" 或空
    - 拉偏结论标记："拉偏结论" 或空
    """
    export_dir = ensure_export_dir(export_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{timestamp}.csv"
    filepath = os.path.join(export_dir, filename)

    df = records_to_dataframe(records)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")
    return filepath


def export_excel(records: List[Record], stats: ProcessStats,
                export_dir: str = "exports", prefix: str = "replay") -> str:
    """导出 Excel 文件，包含汇总表和明细表"""
    export_dir = ensure_export_dir(export_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{timestamp}.xlsx"
    filepath = os.path.join(export_dir, filename)

    detail_df = records_to_dataframe(records)

    summary_data = {
        "统计项": list(stats.to_dict().keys()),
        "数值": [str(v) if isinstance(v, list) else v for v in stats.to_dict().values()]
    }
    summary_df = pd.DataFrame(summary_data)

    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="统计汇总", index=False)
        detail_df.to_excel(writer, sheet_name="明细数据", index=False)

    return filepath


def export_json(records: List[Record], stats: ProcessStats,
               extra_info: Dict[str, Any],
               export_dir: str = "exports", prefix: str = "replay") -> str:
    """导出 JSON 文件，保留完整信息用于重跑"""
    export_dir = ensure_export_dir(export_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_{timestamp}.json"
    filepath = os.path.join(export_dir, filename)

    export_data = {
        "export_time": datetime.now().isoformat(),
        "threshold": extra_info.get("threshold"),
        "stats": stats.to_dict(),
        "records": [rec.to_dict() for rec in records],
        "column_mapping": {k: v for k, v in extra_info.get("column_mapping", {}).items()},
        "warnings": extra_info.get("warnings", [])
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    return filepath


def export_screenshot_report(records: List[Record], stats: ProcessStats,
                            threshold: float = 0.75,
                            export_dir: str = "exports", prefix: str = "replay") -> str:
    """
    导出截图说明报告（Markdown 格式）。
    关键：页面上看到的状态和文件里的说法完全一致。
    """
    export_dir = ensure_export_dir(export_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_截图说明_{timestamp}.md"
    filepath = os.path.join(export_dir, filename)

    wrong_records = [r for r in records if r.eval_result == "误判"]
    outlier_records = [r for r in records if r.is_outlier]
    duplicate_records = [r for r in records if r.is_duplicate]

    lines = []
    lines.append("# 病历问答误判回放 - 截图说明报告")
    lines.append("")
    lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**阈值**: {threshold}")
    lines.append("")

    lines.append("## 📊 统计汇总")
    lines.append("")
    lines.append("| 统计项 | 数量 |")
    lines.append("|--------|------|")
    stats_dict = stats.to_dict()
    for k, v in stats_dict.items():
        if isinstance(v, list):
            v = ", ".join(v) if v else "-"
        lines.append(f"| {k} | {v} |")
    lines.append("")

    lines.append("## ⚠️ 拉偏结论样本")
    lines.append("")
    if outlier_records:
        lines.append("| 样本ID | 来源 | 评测结论 | 置信度 | 重复评测 | 备注 |")
        lines.append("|--------|------|----------|--------|----------|------|")
        for rec in outlier_records:
            dup_mk = MARK_DUPLICATE if rec.is_duplicate else ""
            score_str = f"{rec.score:.3f}" if rec.score else "-"
            lines.append(f"| {rec.record_id} | {rec.source} | {rec.eval_result or '-'} | {score_str} | {dup_mk} | {'; '.join(rec.notes)} |")
    else:
        lines.append("未检测到拉偏结论样本。")
    lines.append("")

    lines.append("## ❌ 误判样本详情")
    lines.append("")
    if wrong_records:
        for i, rec in enumerate(wrong_records, 1):
            lines.append(f"### {i}. 样本 {rec.record_id}")
            lines.append("")
            dup_mk = f" - **{MARK_DUPLICATE}**" if rec.is_duplicate else ""
            outlier_mk = f" - **{MARK_OUTLIER}**" if rec.is_outlier else ""
            lines.append(f"- **来源**: {rec.source}{dup_mk}{outlier_mk}")
            lines.append(f"- **处理状态**: {rec.status}")
            lines.append(f"- **评测结论**: {rec.eval_result or '-'}")
            lines.append(f"- **置信度**: {rec.score:.3f}" if rec.score else "- **置信度**: -")
            if rec.question:
                lines.append(f"- **问题**: {rec.question}")
            if rec.answer:
                lines.append(f"- **回答**: {rec.answer}")
            lines.append(f"- **金标准**: {rec.label or '-'}")
            lines.append(f"- **预测结果**: {rec.prediction or '-'}")
            if rec.notes:
                lines.append(f"- **备注**: {'; '.join(rec.notes)}")
            lines.append("")
    else:
        lines.append("无误判样本。")
    lines.append("")

    lines.append("## 🔄 重复评测样本")
    lines.append("")
    if duplicate_records:
        for rec in duplicate_records:
            lines.append(f"- {rec.record_id} (来源: {rec.source}, 结论: {rec.eval_result or '-'})")
    else:
        lines.append("无重复评测样本。")
    lines.append("")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return filepath
