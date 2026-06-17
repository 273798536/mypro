"""输出模块：终端摘要输出 + 文件明细输出，两者分离。

强化点：
- 接口 JSON、终端摘要、持久化文件三者共享同一份 summary 数据源，保证一致
- 写入过程带状态检查：每写一个文件回读校验长度 > 0
- 失败时保留已写成功的文件，JSON 中记录失败项和错误原因
- 写文件附带校验和（行数/字节数）写入 JSON，便于后续比对
"""
import os
import json
import hashlib
import pandas as pd
from datetime import datetime
from typing import Dict, Tuple, List


class OutputWriteError(Exception):
    """输出写入异常，附带已成功写入的文件列表。"""
    def __init__(self, message: str, written_files: Dict = None, errors: List = None):
        super().__init__(message)
        self.written_files = written_files or {}
        self.errors = errors or []


def ensure_output_dirs(output_dir: str) -> Dict[str, str]:
    """创建输出目录结构，返回各子目录路径。"""
    dirs = {
        "summary": os.path.join(output_dir, "summary"),
        "details": os.path.join(output_dir, "details"),
        "charts": os.path.join(output_dir, "charts"),
        "anomalies": os.path.join(output_dir, "anomalies"),
    }
    for name, path in dirs.items():
        try:
            os.makedirs(path, exist_ok=True)
        except OSError as e:
            raise OutputWriteError(f"创建输出目录 {path} 失败：{e}") from e
        if not os.access(path, os.W_OK):
            raise OutputWriteError(f"输出目录 {path} 无写入权限，请检查")
    return dirs


def format_terminal_summary(summary: Dict, note: str = "",
                            output_refs: Dict = None) -> str:
    """格式化终端摘要（与 summary/*.txt 内容完全一致）。

    数据源：只从 summary Dict 获取，避免与持久化不一致。
    """
    lines = []
    lines.append("=" * 60)
    lines.append("       热泵循环阈值预警 — 终端摘要")
    lines.append("=" * 60)
    lines.append(f"  生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"  设备铭牌数：{summary['设备铭牌数']} 台")
    lines.append(f"  样本总数：{summary['样本总数']} 条")
    lines.append(f"  边界样本数：{summary['边界样本总数']} 条（其中预警 {summary['边界样本中预警数']} 条）")
    lines.append("-" * 60)
    lines.append(f"  有效样本：{summary['有效样本数']} 条（纳入统计）")
    lines.append(f"  坏数据：{summary['坏数据数']} 条（已剔除，见 anomalies/）")
    lines.append(f"  采样缺口：{summary['采样缺口数']} 条（已标记，见 anomalies/）")
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
        for k, v in sorted(summary["预警类型分布"].items()):
            lines.append(f"    - {k}：{v} 条")
        lines.append("-" * 60)

    lines.append("  设备维度统计：")
    for dev, stats in sorted(summary["设备统计"].items()):
        flag = "⚠预警" if stats["预警数"] > 0 else "✓正常"
        cop_str = f", 平均COP={stats['平均COP']}" if stats['平均COP'] is not None else ""
        boundary_str = f", 边界样本={stats['边界样本数']}" if stats.get('边界样本数', 0) > 0 else ""
        lines.append(
            f"    {dev}：有效{stats['有效样本']}/{stats['样本总数']}, "
            f"预警{stats['预警数']}, 坏数据{stats['坏数据']}, "
            f"缺口{stats['采样缺口']}{boundary_str} {flag}{cop_str}"
        )

    if note:
        lines.append("-" * 60)
        lines.append("  后补说明：")
        for nline in note.splitlines():
            lines.append(f"    {nline}")

    lines.append("-" * 60)
    if output_refs:
        lines.append("  本次输出文件（运营接手可直接去对应目录）：")
        for label, path in output_refs.items():
            lines.append(f"    [{label}]  {os.path.basename(path)}")
        lines.append("-" * 60)
    lines.append("  放材料：input/ 目录")
    lines.append("  看异常：output/anomalies/ 目录")
    lines.append("  重新导出：python -m heatpump_alert.cli -i ./input -o ./output")
    lines.append("=" * 60)
    return "\n".join(lines)


def _file_meta(path: str) -> Dict:
    """获取文件元信息（字节数、md5、行数），供一致性校验。"""
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        md5 = hashlib.md5(f.read()).hexdigest()
    lines = None
    if path.endswith(".csv") or path.endswith(".txt"):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            lines = sum(1 for _ in f)
    return {"size_bytes": size, "md5": md5, "lines": lines}


def write_summary_file(output_dirs: Dict[str, str], summary_text: str,
                       errors: List) -> Tuple[str, Dict]:
    """写入摘要文件（与终端显示内容完全一致）。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"summary_{timestamp}.txt"
    filepath = os.path.join(output_dirs["summary"], filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(summary_text)
        meta = _file_meta(filepath)
        assert meta["size_bytes"] > 0, f"摘要文件写入后为空：{filepath}"
        return filepath, meta
    except Exception as e:
        errors.append(f"写入摘要失败：{e}")
        return "", {}


def write_details(output_dirs: Dict[str, str], details_df: pd.DataFrame,
                  errors: List) -> Tuple[Dict[str, str], Dict[str, Dict]]:
    """写入明细数据（分有效明细、异常明细、完整明细），附带元信息。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_paths = {}
    result_meta = {}

    valid_df = details_df[details_df["是否纳入统计"] == True].copy()
    valid_path = os.path.join(output_dirs["details"], f"details_valid_{timestamp}.csv")
    try:
        valid_df.to_csv(valid_path, index=False, encoding="utf-8-sig")
        meta = _file_meta(valid_path)
        assert len(valid_df) == max(0, meta["lines"] - 1), (
            f"有效明细行数不一致：df={len(valid_df)} file={meta['lines']-1}"
        )
        result_paths["有效明细"] = valid_path
        result_meta["有效明细"] = meta
    except Exception as e:
        errors.append(f"写入有效明细失败：{e}")

    anomalies_df = details_df[details_df["是否纳入统计"] != True].copy()
    anomalies_path = os.path.join(output_dirs["anomalies"], f"anomalies_{timestamp}.csv")
    try:
        anomalies_df.to_csv(anomalies_path, index=False, encoding="utf-8-sig")
        meta = _file_meta(anomalies_path)
        assert len(anomalies_df) == max(0, meta["lines"] - 1), (
            f"异常明细行数不一致：df={len(anomalies_df)} file={meta['lines']-1}"
        )
        result_paths["异常明细"] = anomalies_path
        result_meta["异常明细"] = meta
    except Exception as e:
        errors.append(f"写入异常明细失败：{e}")

    full_path = os.path.join(output_dirs["details"], f"details_full_{timestamp}.csv")
    try:
        details_df.to_csv(full_path, index=False, encoding="utf-8-sig")
        meta = _file_meta(full_path)
        assert len(details_df) == max(0, meta["lines"] - 1), (
            f"完整明细行数不一致：df={len(details_df)} file={meta['lines']-1}"
        )
        result_paths["完整明细"] = full_path
        result_meta["完整明细"] = meta
    except Exception as e:
        errors.append(f"写入完整明细失败：{e}")

    return result_paths, result_meta


def write_json_output(output_dirs: Dict[str, str], summary: Dict,
                      all_files: Dict[str, str], all_meta: Dict[str, Dict],
                      errors: List, note: str = "") -> str:
    """写入 JSON 接口返回（结构化数据，与终端摘要、文件三方一致）。"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"result_{timestamp}.json"
    filepath = os.path.join(output_dirs["summary"], filename)

    payload = {
        "生成时间": datetime.now().isoformat(),
        "状态": "部分成功" if errors else "成功",
        "错误信息": errors,
        "摘要": summary,
        "后补说明": note,
        "输出文件": {k: os.path.basename(v) for k, v in all_files.items()},
        "文件校验": {k: v for k, v in all_meta.items()},
    }
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        meta = _file_meta(filepath)
        assert meta["size_bytes"] > 0, f"JSON结果文件写入后为空"
        return filepath
    except Exception as e:
        errors.append(f"写入JSON结果失败：{e}")
        raise OutputWriteError("JSON写入最终失败", written_files=all_files, errors=errors) from e


def write_outputs(output_dir: str, details_df: pd.DataFrame,
                  summary: Dict, note: str = "") -> tuple:
    """统一入口：生成所有输出文件。

    返回：(files_dict, summary_text, output_dirs, errors_list)
    """
    output_dirs = ensure_output_dirs(output_dir)
    errors = []
    all_files = {}
    all_meta = {}

    summary_text = format_terminal_summary(summary, note, None)

    summary_path, summary_meta = write_summary_file(output_dirs, summary_text, errors)
    if summary_path:
        all_files["摘要文件"] = summary_path
        all_meta["摘要文件"] = summary_meta

    detail_paths, detail_meta = write_details(output_dirs, details_df, errors)
    all_files.update(detail_paths)
    all_meta.update(detail_meta)

    final_summary_text = format_terminal_summary(summary, note, all_files)
    if summary_path:
        try:
            with open(summary_path, "w", encoding="utf-8") as f:
                f.write(final_summary_text)
            all_meta["摘要文件"] = _file_meta(summary_path)
        except Exception as e:
            errors.append(f"回写摘要（含文件引用）失败：{e}")

    json_path = write_json_output(output_dirs, summary, all_files, all_meta, errors, note)
    all_files["JSON结果"] = json_path

    return all_files, final_summary_text, output_dirs, errors
