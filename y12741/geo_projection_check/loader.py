from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import yaml

from .models import (
    ChartSnapshot,
    MaterialBundle,
    MaterialStatus,
    ProjectionParams,
    ProjectionType,
    QuestionItem,
    ScoreRecord,
)


_NUMERIC = re.compile(r"^\s*[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?\s*$")


def _parse_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s or s.lower() in {"nan", "na", "n/a", "none", "null", "--", "-"}:
        return None
    s = s.replace(",", "")
    if _NUMERIC.match(s):
        try:
            return float(s)
        except ValueError:
            return None
    return None


def _parse_point(value: Any) -> Optional[tuple[float, float]]:
    if value is None:
        return None
    if isinstance(value, (list, tuple)) and len(value) == 2:
        x, y = _parse_float(value[0]), _parse_float(value[1])
        if x is not None and y is not None:
            return (x, y)
        return None
    s = str(value).strip()
    if not s:
        return None
    s = s.strip("()[] ")
    if "," in s:
        parts = s.split(",")
    elif " " in s:
        parts = s.split()
    else:
        return None
    if len(parts) >= 2:
        x, y = _parse_float(parts[0]), _parse_float(parts[1])
        if x is not None and y is not None:
            return (x, y)
    return None


@dataclass
class LoadReport:
    warnings: list[str]
    loaded_counts: dict[str, int]


class MaterialLoader:
    def __init__(self) -> None:
        self.warnings: list[str] = []
        self.loaded_counts: dict[str, int] = {}

    def _warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def reset(self) -> None:
        self.warnings = []
        self.loaded_counts = {}

    def load_params_yaml(self, path: str | Path) -> ProjectionParams:
        p = Path(path)
        with p.open("r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
        raw = {k.lower(): v for k, v in raw.items()}

        ptype_str = str(raw.get("projection_type", "orthographic")).lower()
        try:
            ptype = ProjectionType(ptype_str)
        except ValueError:
            self._warn(f"参数表 {p.name}: 未知投影类型 '{ptype_str}'，默认使用 orthographic")
            ptype = ProjectionType.ORTHOGRAPHIC

        params = ProjectionParams(
            projection_type=ptype,
            focal_length=_parse_float(raw.get("focal_length")),
            view_angle_deg=_parse_float(raw.get("view_angle_deg")) or 0.0,
            scale_factor=_parse_float(raw.get("scale_factor")) or 1.0,
            origin_x=_parse_float(raw.get("origin_x")) or 0.0,
            origin_y=_parse_float(raw.get("origin_y")) or 0.0,
            tolerance_px=_parse_float(raw.get("tolerance_px")) or 2.0,
            source_file=str(p),
            last_maintained_by=str(raw.get("maintained_by")) if raw.get("maintained_by") else None,
        )

        maintained_at_raw = raw.get("maintained_at")
        if maintained_at_raw:
            try:
                params.maintained_at = datetime.fromisoformat(str(maintained_at_raw))
            except ValueError:
                self._warn(f"参数表 {p.name}: maintained_at 格式无法解析: {maintained_at_raw}")

        notes = raw.get("notes")
        if isinstance(notes, list):
            params.notes = [str(n) for n in notes]
        elif isinstance(notes, str):
            params.notes = [notes]

        for prob in params.validate():
            self._warn(f"参数表 {p.name}: {prob}")

        self.loaded_counts["params"] = self.loaded_counts.get("params", 0) + 1
        return params

    def load_questions_csv(self, path: str | Path) -> list[QuestionItem]:
        p = Path(path)
        items: list[QuestionItem] = []
        try:
            with p.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                for lineno, row in enumerate(reader, start=2):
                    row_lc = {k.lower().strip(): v for k, v in row.items() if k}
                    item_id = (row_lc.get("item_id") or row_lc.get("id") or "").strip()
                    if not item_id:
                        self._warn(f"题目清单 {p.name}:{lineno} 缺少 item_id，跳过该行")
                        continue
                    content = (row_lc.get("content") or row_lc.get("题目") or row_lc.get("description") or "").strip()
                    expected = _parse_point(row_lc.get("expected") or row_lc.get("expected_point") or row_lc.get("基准"))
                    legacy_note = (row_lc.get("legacy_note") or row_lc.get("备注") or row_lc.get("note") or "").strip() or None
                    tags_raw = row_lc.get("tags") or row_lc.get("标签") or ""
                    tags = [t.strip() for t in str(tags_raw).split(";") if t.strip()]
                    is_placeholder = str(row_lc.get("placeholder") or "").strip().lower() in {"1", "true", "yes", "是"}

                    if not content:
                        self._warn(f"题目清单 {p.name}:{lineno} item_id={item_id} 内容为空，标记为占位")
                        is_placeholder = True

                    items.append(
                        QuestionItem(
                            item_id=item_id,
                            content=content,
                            expected_projection=expected,
                            legacy_note=legacy_note,
                            source_file=str(p),
                            tags=tags,
                            is_placeholder=is_placeholder,
                        )
                    )
        except FileNotFoundError:
            self._warn(f"题目清单文件不存在: {p}")
            return items

        self.loaded_counts["questions"] = self.loaded_counts.get("questions", 0) + len(items)
        return items

    def load_scores_csv(self, path: str | Path) -> list[ScoreRecord]:
        p = Path(path)
        records: list[ScoreRecord] = []
        try:
            with p.open("r", encoding="utf-8-sig", newline="") as f:
                reader = csv.DictReader(f)
                for lineno, row in enumerate(reader, start=2):
                    row_lc = {k.lower().strip(): v for k, v in row.items() if k}
                    item_id = (row_lc.get("item_id") or "").strip()
                    scorer = (row_lc.get("scorer") or row_lc.get("评分人") or "anonymous").strip()
                    projected = _parse_point(row_lc.get("projected") or row_lc.get("point") or row_lc.get("投影坐标"))
                    score = _parse_float(row_lc.get("score") or row_lc.get("分数"))

                    if not item_id:
                        self._warn(f"评分记录 {p.name}:{lineno} 缺少 item_id，跳过")
                        continue
                    if projected is None:
                        self._warn(f"评分记录 {p.name}:{lineno} item_id={item_id} 投影坐标无法解析，跳过")
                        continue
                    if score is None:
                        self._warn(f"评分记录 {p.name}:{lineno} item_id={item_id} 分数缺失，默认 0.0")
                        score = 0.0

                    raw_note = (row_lc.get("note") or row_lc.get("备注") or "").strip() or None
                    scored_at_raw = row_lc.get("scored_at") or row_lc.get("评分时间")
                    scored_at = datetime.now()
                    if scored_at_raw:
                        try:
                            scored_at = datetime.fromisoformat(str(scored_at_raw).strip())
                        except ValueError:
                            self._warn(f"评分记录 {p.name}:{lineno} scored_at 无法解析，使用当前时间")

                    records.append(
                        ScoreRecord(
                            record_id=f"{p.stem}-{lineno}",
                            item_id=item_id,
                            scorer=scorer,
                            projected_point=projected,
                            score=score,
                            scored_at=scored_at,
                            source_file=str(p),
                            raw_note=raw_note,
                        )
                    )
        except FileNotFoundError:
            self._warn(f"评分记录文件不存在: {p}")
            return records

        self.loaded_counts["scores"] = self.loaded_counts.get("scores", 0) + len(records)
        return records

    def load_chart_json(self, path: str | Path, name: Optional[str] = None) -> Optional[ChartSnapshot]:
        p = Path(path)
        if not p.exists():
            self._warn(f"图表快照文件不存在: {p}（将以差异比对时缺失对待）")
            return None
        try:
            with p.open("r", encoding="utf-8") as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            self._warn(f"图表快照 {p.name} 读取失败: {e}")
            return None

        points: dict[str, tuple[float, float]] = {}
        raw_points = raw.get("points") if isinstance(raw, dict) else None
        if isinstance(raw_points, dict):
            for k, v in raw_points.items():
                pt = _parse_point(v)
                if pt is not None:
                    points[str(k)] = pt
                else:
                    self._warn(f"图表快照 {p.name}: 点 {k} 坐标无法解析")
        elif isinstance(raw_points, list):
            for i, v in enumerate(raw_points):
                pt = _parse_point(v)
                if pt is not None:
                    points[f"p{i}"] = pt

        meta = {k: v for k, v in raw.items() if k != "points"} if isinstance(raw, dict) else {}
        snap = ChartSnapshot(
            name=name or p.stem,
            points=points,
            source_file=str(p),
            meta=meta,
        )
        self.loaded_counts["charts"] = self.loaded_counts.get("charts", 0) + 1
        return snap

    def load_bundle(
        self,
        *,
        label: str = "",
        params_path: Optional[str | Path] = None,
        questions_path: Optional[str | Path] = None,
        scores_path: Optional[str | Path] = None,
        chart_before_path: Optional[str | Path] = None,
        chart_after_path: Optional[str | Path] = None,
        allow_empty: bool = True,
    ) -> MaterialBundle:
        self.reset()
        bundle = MaterialBundle(label=label)

        if params_path:
            bundle.params = self.load_params_yaml(params_path)
        if questions_path:
            bundle.questions = self.load_questions_csv(questions_path)
        if scores_path:
            bundle.scores = self.load_scores_csv(scores_path)
        if chart_before_path:
            bundle.chart_before = self.load_chart_json(chart_before_path, name="before")
        if chart_after_path:
            bundle.chart_after = self.load_chart_json(chart_after_path, name="after")

        if not allow_empty and not (bundle.questions or bundle.scores):
            self._warn("材料包为空：没有题目清单也没有评分记录")

        bundle.load_warnings = list(self.warnings)

        if bundle.questions or bundle.scores or bundle.params:
            bundle.status = MaterialStatus.LOADED if not self.warnings else MaterialStatus.PARTIAL
        else:
            bundle.status = MaterialStatus.PARTIAL

        return bundle

    def last_report(self) -> LoadReport:
        return LoadReport(warnings=list(self.warnings), loaded_counts=dict(self.loaded_counts))
