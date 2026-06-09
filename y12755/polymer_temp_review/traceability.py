from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import (
    BatchReport,
    Material,
    MaterialTrace,
    WeighingRecord,
)


class MaterialRegistry:
    """
    材料注册表：从输入目录加载材料清单和称量单，
    支持根据 ID 查找，以及列出缺失文件，给出可操作提示。
    """

    def __init__(self, input_dir: Path):
        self.input_dir = Path(input_dir)
        self.materials: Dict[str, Material] = {}
        self.weighing_records: Dict[str, WeighingRecord] = {}
        self.missing_files: List[str] = []

    def load(self) -> Tuple[List[str], List[str]]:
        """
        扫描输入目录，加载 materials/ 和 weighing_records/ 下的 JSON 文件。

        Returns:
            (加载成功的条目列表, 缺失或出错的文件列表)
        """
        loaded: List[str] = []
        errors: List[str] = []

        materials_dir = self.input_dir / "materials"
        if materials_dir.is_dir():
            for fp in sorted(materials_dir.glob("*.json")):
                try:
                    data = json.loads(fp.read_text(encoding="utf-8"))
                    m = Material.model_validate(data)
                    self.materials[m.material_id] = m
                    loaded.append(f"材料 {m.material_id}")
                except Exception as e:
                    errors.append(f"材料文件 {fp.name} 解析失败: {e}")
        else:
            self.missing_files.append("materials/ 目录不存在")

        wr_dir = self.input_dir / "weighing_records"
        if wr_dir.is_dir():
            for fp in sorted(wr_dir.glob("*.json")):
                try:
                    data = json.loads(fp.read_text(encoding="utf-8"))
                    w = WeighingRecord.model_validate(data)
                    self.weighing_records[w.record_id] = w
                    loaded.append(f"称量单 {w.record_id}")
                except Exception as e:
                    errors.append(f"称量单文件 {fp.name} 解析失败: {e}")
        else:
            self.missing_files.append("weighing_records/ 目录不存在")

        return loaded, errors

    def build_trace(self, report: BatchReport) -> MaterialTrace:
        """
        根据批次报告中声明的来源材料和称量单 ID，构建批次溯源对象。
        缺失的称量单会被记录，方便后续给出"缺哪份称量单"的提示。
        """
        source_materials: List[Material] = []
        weighing_records: List[WeighingRecord] = []
        missing_weighing: List[str] = []
        missing_materials: List[str] = []

        for mid in report.source_material_ids:
            m = self.materials.get(mid)
            if m is not None:
                source_materials.append(m)
            else:
                missing_materials.append(mid)

        for wid in report.weighing_record_ids:
            w = self.weighing_records.get(wid)
            if w is not None:
                weighing_records.append(w)
            else:
                missing_weighing.append(wid)

        trace = MaterialTrace(
            batch_id=report.batch_id,
            source_materials=source_materials,
            weighing_records=weighing_records,
            missing_weighing_record_ids=missing_weighing,
        )
        return trace

    def actionable_missing_messages(self, report: BatchReport) -> List[str]:
        """
        针对单个批次报告，返回可操作的缺失提示，例如：
        - 缺少称量单 W-20240610-003，请在 weighing_records/ 下补充 W-20240610-003.json
        """
        msgs: List[str] = []
        for mid in report.source_material_ids:
            if mid not in self.materials:
                msgs.append(
                    f"缺少来源材料 {mid}：请在 materials/ 目录下补充 {mid}.json "
                    f"（包含 material_id, name, lot_no 等字段）"
                )
        for wid in report.weighing_record_ids:
            if wid not in self.weighing_records:
                msgs.append(
                    f"缺少称量单 {wid}：请在 weighing_records/ 目录下补充 {wid}.json "
                    f"（包含 record_id, material_id, weighed_mass_g 等字段）"
                )
        return msgs


def load_batch_reports(input_dir: Path) -> Tuple[List[BatchReport], List[str]]:
    """
    从 input_dir/batch_reports/ 加载所有批次报告 JSON。

    Returns:
        (批次报告列表, 错误提示列表)
    """
    reports: List[BatchReport] = []
    errors: List[str] = []

    br_dir = Path(input_dir) / "batch_reports"
    if not br_dir.is_dir():
        errors.append(
            f"未找到批次报告目录: {br_dir}。"
            f"请在输入目录下创建 batch_reports/ 并放入批次报告 JSON 文件。"
        )
        return reports, errors

    for fp in sorted(br_dir.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            rpt = BatchReport.model_validate(data)
            reports.append(rpt)
        except Exception as e:
            errors.append(f"批次报告 {fp.name} 解析失败: {e}")

    if not reports:
        errors.append(
            f"batch_reports/ 目录为空或没有合法的 JSON 文件。"
            f"至少需要一份批次报告才能运行复盘。"
        )

    return reports, errors


def load_previous_reports(output_dir: Path) -> Dict[str, BatchReport]:
    """
    从上次输出的 run_manifest.json 中加载上一版批次报告，
    用于判断"批次报告改了以后，反应条件和结论是否需要跟着变"。
    """
    manifest = Path(output_dir) / "run_manifest.json"
    if not manifest.is_file():
        return {}

    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
        prev: Dict[str, BatchReport] = {}
        for bid, raw in data.get("last_reports", {}).items():
            prev[bid] = BatchReport.model_validate(raw)
        return prev
    except Exception:
        return {}
