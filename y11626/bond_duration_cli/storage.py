"""历史存储与来源追踪 - 保留数据来源和每次修正的痕迹"""
from __future__ import annotations

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

from pydantic import BaseModel

from .models import (
    Bond, CorrectionRecord, SourceInfo, YieldCurve,
)


class DataStoreConfig(BaseModel):
    """数据存储配置"""
    data_dir: str = ".bdcli_data"
    bonds_dir: str = "bonds"
    curves_dir: str = "curves"
    results_dir: str = "results"
    sources_dir: str = "sources"
    corrections_dir: str = "corrections"
    history_file: str = "history.json"


class DataStore:
    """数据持久化存储 - 保证重启后数字一致"""

    def __init__(self, config: Optional[DataStoreConfig] = None):
        self.config = config or DataStoreConfig()
        self.base_path = Path(self.config.data_dir)
        self._init_dirs()

    def _init_dirs(self):
        for d in [
            self.config.bonds_dir, self.config.curves_dir,
            self.config.results_dir, self.config.sources_dir,
            self.config.corrections_dir,
        ]:
            (self.base_path / d).mkdir(parents=True, exist_ok=True)

    # ── 来源信息 ───────────────────────────────────────

    def save_source(self, source: SourceInfo) -> Path:
        path = self.base_path / self.config.sources_dir / f"{source.source_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(source.dict(), f, ensure_ascii=False, indent=2, default=str)
        self._log_history("source", source.source_id, "imported")
        return path

    def load_source(self, source_id: str) -> Optional[SourceInfo]:
        path = self.base_path / self.config.sources_dir / f"{source_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["imported_at"] = datetime.fromisoformat(data["imported_at"])
        return SourceInfo(**data)

    def list_sources(self) -> list[dict]:
        sources = []
        for p in (self.base_path / self.config.sources_dir).glob("*.json"):
            s = self.load_source(p.stem)
            if s:
                sources.append({
                    "source_id": s.source_id,
                    "source_name": s.source_name,
                    "source_type": s.source_type,
                    "imported_at": s.imported_at.isoformat(),
                    "version": s.version,
                })
        return sorted(sources, key=lambda x: x["imported_at"], reverse=True)

    # ── 修正记录 ───────────────────────────────────────

    def save_correction(self, correction: CorrectionRecord) -> Path:
        path = self.base_path / self.config.corrections_dir / f"{correction.correction_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(correction.dict(), f, ensure_ascii=False, indent=2, default=str)
        self._log_history("correction", correction.correction_id, "applied")
        return path

    def load_correction(self, correction_id: str) -> Optional[CorrectionRecord]:
        path = self.base_path / self.config.corrections_dir / f"{correction_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["corrected_at"] = datetime.fromisoformat(data["corrected_at"])
        return CorrectionRecord(**data)

    def list_corrections(self, target: Optional[str] = None) -> list[dict]:
        corrections = []
        for p in (self.base_path / self.config.corrections_dir).glob("*.json"):
            c = self.load_correction(p.stem)
            if c and (target is None or c.target == target):
                corrections.append({
                    "correction_id": c.correction_id,
                    "target": c.target,
                    "field": c.field,
                    "old_value": c.old_value,
                    "new_value": c.new_value,
                    "reason": c.reason,
                    "corrected_by": c.corrected_by,
                    "corrected_at": c.corrected_at.isoformat(),
                })
        return sorted(corrections, key=lambda x: x["corrected_at"], reverse=True)

    # ── 债券持仓 ───────────────────────────────────────

    def save_bonds(self, bonds: list[Bond], source_id: str) -> Path:
        data = {
            "source_id": source_id,
            "saved_at": datetime.now().isoformat(),
            "bonds": [json.loads(b.json()) for b in bonds],
        }
        path = self.base_path / self.config.bonds_dir / f"portfolio_{source_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        self._log_history("bonds", source_id, "saved")
        return path

    def load_bonds(self, source_id: str) -> Optional[list[Bond]]:
        path = self.base_path / self.config.bonds_dir / f"portfolio_{source_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        bonds = []
        for b_data in data["bonds"]:
            b_data["issue_date"] = datetime.strptime(b_data["issue_date"], "%Y-%m-%d").date()
            b_data["maturity_date"] = datetime.strptime(b_data["maturity_date"], "%Y-%m-%d").date()
            if b_data.get("call_date"):
                b_data["call_date"] = datetime.strptime(b_data["call_date"], "%Y-%m-%d").date()
            if b_data.get("put_date"):
                b_data["put_date"] = datetime.strptime(b_data["put_date"], "%Y-%m-%d").date()
            bonds.append(Bond(**b_data))
        return bonds

    def list_portfolios(self) -> list[dict]:
        portfolios = []
        for p in (self.base_path / self.config.bonds_dir).glob("portfolio_*.json"):
            source_id = p.stem.replace("portfolio_", "")
            bonds = self.load_bonds(source_id)
            if bonds:
                portfolios.append({
                    "source_id": source_id,
                    "bond_count": len(bonds),
                    "total_position": sum(b.position for b in bonds),
                })
        return portfolios

    # ── 收益率曲线 ─────────────────────────────────────

    def save_curve(self, curve: YieldCurve, source_id: str) -> Path:
        data = {
            "source_id": source_id,
            "saved_at": datetime.now().isoformat(),
            "curve": json.loads(curve.json()),
        }
        path = self.base_path / self.config.curves_dir / f"{curve.curve_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        self._log_history("curve", curve.curve_id, "saved")
        return path

    def load_curve(self, curve_id: str) -> Optional[YieldCurve]:
        path = self.base_path / self.config.curves_dir / f"{curve_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        c_data = data["curve"]
        c_data["as_of_date"] = datetime.strptime(c_data["as_of_date"], "%Y-%m-%d").date()
        return YieldCurve(**c_data)

    def list_curves(self) -> list[dict]:
        curves = []
        for p in (self.base_path / self.config.curves_dir).glob("*.json"):
            c = self.load_curve(p.stem)
            if c:
                curves.append({
                    "curve_id": c.curve_id,
                    "name": c.name,
                    "as_of_date": str(c.as_of_date),
                    "point_count": len(c.points),
                })
        return sorted(curves, key=lambda x: x["as_of_date"], reverse=True)

    # ── 分析结果 ───────────────────────────────────────

    def save_result(self, result: dict) -> Path:
        result_id = result.get("result_id", f"result_{datetime.now():%Y%m%d_%H%M%S}")
        path = self.base_path / self.config.results_dir / f"{result_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2, default=str)
        self._log_history("result", result_id, "saved")
        return path

    def load_result(self, result_id: str) -> Optional[dict]:
        path = self.base_path / self.config.results_dir / f"{result_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_results(self) -> list[dict]:
        results = []
        for p in (self.base_path / self.config.results_dir).glob("*.json"):
            r = self.load_result(p.stem)
            if r:
                results.append({
                    "result_id": r.get("result_id", p.stem),
                    "scenario": r.get("scenario_name", r.get("scenario", "unknown")),
                    "created_at": r.get("created_at", ""),
                    "total_dv01": r.get("portfolio", {}).get("total_dv01", 0),
                })
        return sorted(results, key=lambda x: x["created_at"], reverse=True)

    # ── 历史日志 ───────────────────────────────────────

    def _log_history(self, item_type: str, item_id: str, action: str):
        log_path = self.base_path / self.config.history_file
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "type": item_type,
            "id": item_id,
            "action": action,
        }
        existing = []
        if log_path.exists():
            try:
                with open(log_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except json.JSONDecodeError:
                existing = []
        existing.append(log_entry)
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)

    def get_history(self, limit: int = 50) -> list[dict]:
        log_path = self.base_path / self.config.history_file
        if not log_path.exists():
            return []
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError:
            return []
        return data[-limit:] if limit > 0 else data

    # ── 清理与备份 ─────────────────────────────────────

    def clear_all(self):
        """清空所有数据"""
        if self.base_path.exists():
            shutil.rmtree(self.base_path)
        self._init_dirs()

    def backup(self, backup_name: Optional[str] = None) -> Path:
        """备份数据"""
        if not backup_name:
            backup_name = f"backup_{datetime.now():%Y%m%d_%H%M%S}"
        backup_path = self.base_path.parent / backup_name
        if self.base_path.exists():
            shutil.copytree(self.base_path, backup_path)
        return backup_path
