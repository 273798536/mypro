"""输出模块：终端摘要输出 + 文件明细输出，两者分离。"""
import os
import json
import pandas as pd
from datetime import datetime
from typing import Dict


def ensure_output_dirs(output_dir: str) -> Dict[str, str]:
    """创建输出目录结构，返回各子目录路径。

    目录结构：
    output/
    ├── summary/      # 终端摘要（文本）
    ├── details/      # 明细数据（CSV/Excel）
    ├── charts/       # 图表
    └── anomalies/    # 异常/坏数据明细
    """
    dirs = {
        "summary": os.path.join(output_dir, "summary"),
        "details": os.path.join(output_dir, "details"),
        "charts": os.path.join(output_dir, "charts"),
        "anomalies": os.path.join(output_dir, "anomalies"),
    }
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)
    return dirs


def format_terminal_summary(summary: Dict, note: str = "") -> str:
    """格式化终端摘要（仅摘要，不含明细数据）。"""
    lines = []
    lines.append("=" * 60)
    lines.append("       热泵循环阈值预警 — 终端摘要")
    lines.append("=" * 60)
    lines.append(f"  生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"  设备铭牌数：{summary['设备铭牌数']} 台")
    lines.append(f"  样本总数：{summary['样本总数']} 条")
    lines.append("-" * 60)
    lines.append(f"  有效样本：{summary['有效样本数']} 条（纳入统计）")
    lines.append(f"  坏数据：{summary['坏数据数']} 条（已剔除）")
    lines.append(f"  采样缺口：{summary['采样缺口数']} 条（已标记）")
    lines.append(f"  无铭牌数据：{summary['无铭牌数据数']} 条")
    lines.append("-" * 60)
    lines.append(f"  正常通过：{summary['正常样本数']} 条")
    lines.append(f"  触发预警：{summary['预警样本数']} 条")
    if summary["整体平均COP"] is not None:
        lines.append(f"  整体平均COP：{summary['整体平均COP']}")
    else:
        lines.append("  整体平均COP：无有效数据")
    lines.append("-" * 60)

    if summary["预警类型分布"]:
        lines.append("  预警类型分布：")
        for k, v in summary["预警类型分布"].items():
            lines.append(f"    - {k}：{v} 条")
        lines.append("-" * 60)

    lines.append("  设备维度统计：")
    for dev, stats in summary["设备统计"].items():
        flag = "⚠预警" if stats["预警数"] > 0 else "✓正常"
        cop_str = f", 平均COP={stats['平均COP']}" if stats['平均COP'] is not None else ""
        lines.append(
            f"    {dev}：有效{stats['有效样本']}/{stats['样本总数']}, "
            f"预警{stats['预警数']}, 坏数据{stats['坏数据']}, "
            f"缺口{stats['采样缺口']} {flag}{cop_str}"
        )

    if note:
        lines.append("-" * 60)
        lines.append("  后补说明：")
        for nline in note.splitlines():
            lines.append(f"    {nline}")

    lines.append("-" * 60)
    lines.append("  详细数据请查看 output/details/ 目录")
    lines.append("  异常数据请查看 output/anomalies/ 目录")
    lines.append("  图表请查看 output/charts/ 目录")
    lines.append("=" * 60)
    return "\n".join(lines)


def write_summary_file(output_dirs: Dict[str, str], summary_text: str) -> str:
    """写入摘要文件（与终端显示内容一致）。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"summary_{timestamp}.txt"
    filepath = os.path.join(output_dirs["summary"], filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(summary_text)
    return filepath


def write_details(output_dirs: Dict[str, str], details_df: pd.DataFrame) -> Dict[str, str]:
    """写入明细数据（分有效明细和异常明细）。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result = {}

    valid_df = details_df[details_df["是否纳入统计"]].copy()
    valid_path = os.path.join(output_dirs["details"], f"details_valid_{timestamp}.csv")
    valid_df.to_csv(valid_path, index=False, encoding="utf-8-sig")
    result["有效明细"] = valid_path

    anomalies_df = details_df[~details_df["是否纳入统计"]].copy()
    anomalies_path = os.path.join(output_dirs["anomalies"], f"anomalies_{timestamp}.csv")
    anomalies_df.to_csv(anomalies_path, index=False, encoding="utf-8-sig")
    result["异常明细"] = anomalies_path

    full_path = os.path.join(output_dirs["details"], f"details_full_{timestamp}.csv")
    details_df.to_csv(full_path, index=False, encoding="utf-8-sig")
    result["完整明细"] = full_path

    return result


def write_json_output(output_dirs: Dict[str, str], summary: Dict, note: str = "") -> str:
    """写入 JSON 格式的接口返回（结构化数据，与终端摘要分离）。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"result_{timestamp}.json"
    filepath = os.path.join(output_dirs["summary"], filename)

    payload = {
        "生成时间": datetime.now().isoformat(),
        "摘要": summary,
        "后补说明": note,
        "输出文件": {
            "摘要文本": f"summary_{timestamp}.txt",
            "有效明细": f"details_valid_{timestamp}.csv",
            "完整明细": f"details_full_{timestamp}.csv",
            "异常明细": f"anomalies_{timestamp}.csv",
        },
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return filepath


def write_outputs(output_dir: str, details_df: pd.DataFrame,
                  summary: Dict, note: str = "") -> tuple:
    """统一入口：生成所有输出文件。返回 (files, summary_text, output_dirs)。"""
    output_dirs = ensure_output_dirs(output_dir)
    summary_text = format_terminal_summary(summary, note)

    files = {}
    files["摘要文件"] = write_summary_file(output_dirs, summary_text)
    files.update(write_details(output_dirs, details_df))
    files["JSON结果"] = write_json_output(output_dirs, summary, note)

    return files, summary_text, output_dirs
