"""输入输出目录读写模块。"""
from __future__ import annotations

import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import GraphData, InspectionResult, BatchReport


class DataLoader:
    """从输入目录加载图数据和计算草稿。"""

    GRAPH_PATTERNS = ["*.json", "*.JSON"]
    DRAFT_SUBDIR = "drafts"
    DRAFT_SUFFIX = "_draft.json"

    def __init__(self, input_dir: str | Path):
        self.input_dir = Path(input_dir)
        if not self.input_dir.exists():
            raise FileNotFoundError(f"输入目录不存在: {self.input_dir}")
        if not self.input_dir.is_dir():
            raise NotADirectoryError(f"输入路径不是目录: {self.input_dir}")

    def list_graph_files(self) -> List[Path]:
        files: List[Path] = []
        for pat in self.GRAPH_PATTERNS:
            files.extend(self.input_dir.glob(pat))
        drafts_dir = self.input_dir / self.DRAFT_SUBDIR
        if drafts_dir.exists() and drafts_dir.is_dir():
            for pat in self.GRAPH_PATTERNS:
                files.extend(drafts_dir.glob(pat))
        # 去重并排序
        unique = sorted({f.resolve() for f in files})
        # 排除掉草稿文件本身
        return [f for f in unique if self.DRAFT_SUFFIX not in f.name]

    def load_graph(self, path: Path) -> Tuple[Optional[GraphData], Optional[str]]:
        """加载单个图文件，返回 (图数据, 错误信息)。"""
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            graph = GraphData.from_dict(data)
            return graph, None
        except json.JSONDecodeError as e:
            return None, f"JSON 解析失败: {e}"
        except KeyError as e:
            return None, f"缺少必填字段: {e}"
        except Exception as e:
            return None, f"加载失败: {e}"

    def load_all(self) -> Tuple[Dict[str, GraphData], Dict[str, str]]:
        """加载所有图文件，返回 (成功的图映射, graph_id -> 错误信息)。"""
        graphs: Dict[str, GraphData] = {}
        errors: Dict[str, str] = {}
        for f in self.list_graph_files():
            graph, err = self.load_graph(f)
            if graph is None:
                errors[f.stem] = err or "未知错误"
            else:
                if graph.graph_id in graphs:
                    errors[graph.graph_id] = (
                        f"重复的 graph_id: {graph.graph_id} (文件: {f.name})"
                    )
                else:
                    graphs[graph.graph_id] = graph
        return graphs, errors

    def has_draft(self, graph_id: str) -> bool:
        """检查计算草稿是否存在。"""
        draft_path = self._draft_path(graph_id)
        return draft_path.exists()

    def load_draft(self, graph_id: str) -> Optional[dict]:
        """加载计算草稿。"""
        draft_path = self._draft_path(graph_id)
        if not draft_path.exists():
            return None
        try:
            with open(draft_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def _draft_path(self, graph_id: str) -> Path:
        drafts_dir = self.input_dir / self.DRAFT_SUBDIR
        if drafts_dir.exists():
            p = drafts_dir / f"{graph_id}{self.DRAFT_SUFFIX}"
            if p.exists():
                return p
        return self.input_dir / f"{graph_id}{self.DRAFT_SUFFIX}"


class ResultWriter:
    """将巡检结果写入输出目录。保证幂等性：同一输入重复运行覆盖旧结果。"""

    RESULTS_DIR = "results"
    HISTORY_DIR = "history"
    REPORT_FILE = "report.json"
    SUMMARY_FILE = "summary.txt"
    MISSING_DRAFTS_FILE = "missing_drafts.txt"

    def __init__(self, output_dir: str | Path):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / self.RESULTS_DIR).mkdir(parents=True, exist_ok=True)
        (self.output_dir / self.HISTORY_DIR).mkdir(parents=True, exist_ok=True)

    def write_result(self, result: InspectionResult) -> Path:
        """写入单个巡检结果。同名文件直接覆盖（幂等）。"""
        path = self.output_dir / self.RESULTS_DIR / f"{result.graph_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        return path

    def archive_history(self, batch_id: str, report: BatchReport) -> Path:
        """归档本次报告到历史目录，用 batch_id + 微秒时间戳 区分，保证每次都不冲突。"""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        safe_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in batch_id)
        path = self.output_dir / self.HISTORY_DIR / f"{safe_id}_{ts}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)
        return path

    def load_previous_report(self) -> Optional[BatchReport]:
        """加载最近一次历史报告（用于对比）。"""
        history_dir = self.output_dir / self.HISTORY_DIR
        if not history_dir.exists():
            return None
        files = sorted(history_dir.glob("*.json"))
        if not files:
            return None
        latest = files[-1]
        try:
            with open(latest, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self._dict_to_report(data)
        except Exception:
            return None

    def write_report(self, report: BatchReport) -> Path:
        """写入整批报告。"""
        path = self.output_dir / self.REPORT_FILE
        with open(path, "w", encoding="utf-8") as f:
            f.write(report.to_json())
        return path

    def write_summary(self, report: BatchReport) -> Path:
        """写入人可读的摘要。"""
        path = self.output_dir / self.SUMMARY_FILE
        lines = [
            "=" * 60,
            f"  图论最短路巡检报告",
            f"  批次: {report.batch_id}",
            f"  时间: {report.timestamp}",
            f"  输入: {report.input_dir}",
            f"  输出: {report.output_dir}",
            "=" * 60,
            "",
            f"  总计:   {report.total}",
            f"  已计算: {report.computed}",
            f"  通过:   {report.passed}",
            f"  失败:   {report.failed}",
            "",
        ]
        if report.missing_draft_graphs:
            lines.append("  缺少计算草稿的图:")
            for gid in report.missing_draft_graphs:
                lines.append(f"    - {gid}")
            lines.append("")
        if report.needs_confirmation_graphs:
            lines.append("  需要人工确认的图:")
            for gid in report.needs_confirmation_graphs:
                lines.append(f"    - {gid}")
            lines.append("")
        lines.append("  各图结果:")
        for gid, r in report.results.items():
            status = "PASS" if r.all_passed else "FAIL"
            flag = ""
            if r.missing_drafts:
                flag += " [缺草稿]"
            if r.needs_confirmation:
                flag += " [待确认]"
            if r.confirmed is True:
                flag += " [已确认]"
            elif r.confirmed is False:
                flag += " [已驳回]"
            lines.append(f"    [{status}] {gid}{flag}")
            for v in r.validations:
                vstat = "✓" if v.passed else "✗"
                lines.append(f"        {vstat} {v.name}: {v.message}")
        lines.append("")
        lines.append("=" * 60)

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        return path

    def write_missing_drafts(self, graph_ids: List[str]) -> Path:
        """写出缺失草稿的清单。"""
        path = self.output_dir / self.MISSING_DRAFTS_FILE
        with open(path, "w", encoding="utf-8") as f:
            f.write("# 以下图缺少计算草稿文件 (drafts/<graph_id>_draft.json)\n")
            for gid in graph_ids:
                f.write(f"{gid}\n")
        return path

    def load_result(self, graph_id: str) -> Optional[InspectionResult]:
        """加载已有单个结果（用于确认/补录流程）。"""
        path = self.output_dir / self.RESULTS_DIR / f"{graph_id}.json"
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self._dict_to_result(data)
        except Exception:
            return None

    @staticmethod
    def _dict_to_result(data: dict) -> InspectionResult:
        from .models import PathResult, ValidationItem

        comp = PathResult(**data["computation"])
        validations = [ValidationItem(**v) for v in data.get("validations", [])]
        return InspectionResult(
            graph_id=data["graph_id"],
            computation=comp,
            validations=validations,
            missing_drafts=list(data.get("missing_drafts", [])),
            needs_confirmation=data.get("needs_confirmation", False),
            confirmed=data.get("confirmed"),
            confirmed_by=data.get("confirmed_by"),
            confirmed_at=data.get("confirmed_at"),
        )

    @staticmethod
    def _dict_to_report(data: dict) -> BatchReport:
        results = {
            gid: ResultWriter._dict_to_result(r)
            for gid, r in data.get("results", {}).items()
        }
        return BatchReport(
            batch_id=data["batch_id"],
            timestamp=data["timestamp"],
            input_dir=data["input_dir"],
            output_dir=data["output_dir"],
            total=data.get("total", 0),
            computed=data.get("computed", 0),
            passed=data.get("passed", 0),
            failed=data.get("failed", 0),
            missing_draft_graphs=list(data.get("missing_draft_graphs", [])),
            needs_confirmation_graphs=list(data.get("needs_confirmation_graphs", [])),
            results=results,
        )


def make_batch_id(graphs: Dict[str, GraphData]) -> str:
    """根据输入图集合的内容生成稳定的批次 ID（用于幂等性）。"""
    keys = sorted(graphs.keys())
    raw = json.dumps(
        {k: graphs[k].to_dict() for k in keys},
        ensure_ascii=False,
        sort_keys=True,
    )
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
    return f"batch_{h}"
