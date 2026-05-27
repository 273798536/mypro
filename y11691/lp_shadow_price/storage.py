from __future__ import annotations

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from .models import LPInput, LPOutput, ValidationResult


class VersionedStorage:
    def __init__(self, output_dir: str, input_dir: Optional[str] = None):
        self.output_dir = Path(output_dir).resolve()
        self.input_dir = Path(input_dir).resolve() if input_dir else None
        self._ensure_dirs()

    def _ensure_dirs(self):
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "inputs").mkdir(exist_ok=True)
        (self.output_dir / "outputs").mkdir(exist_ok=True)
        (self.output_dir / "reports").mkdir(exist_ok=True)
        (self.output_dir / "validations").mkdir(exist_ok=True)

    def save_run(
        self,
        lp_input: LPInput,
        lp_output: LPOutput,
        validation: ValidationResult,
        report: str,
        run_id: Optional[str] = None,
    ) -> str:
        if run_id is None:
            run_id = self._generate_run_id()

        run_dir = self.output_dir / "runs" / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        input_path = run_dir / "input.json"
        output_path = run_dir / "output.json"
        validation_path = run_dir / "validation.json"
        report_path = run_dir / "report.md"

        self._write_json(input_path, lp_input.model_dump(mode="json"))
        self._write_json(output_path, lp_output.model_dump(mode="json"))
        self._write_json(validation_path, validation.model_dump(mode="json"))
        self._write_text(report_path, report)

        latest_link = self.output_dir / "runs" / "latest"
        if latest_link.exists() or latest_link.is_symlink():
            if latest_link.is_symlink():
                latest_link.unlink()
            elif latest_link.is_dir():
                shutil.rmtree(latest_link)
            else:
                latest_link.unlink()

        try:
            os.symlink(run_dir, latest_link)
        except (OSError, AttributeError):
            with open(self.output_dir / "runs" / "latest.txt", "w") as f:
                f.write(str(run_dir))

        self._update_index(run_id, lp_input, lp_output, validation)

        return run_id

    def _generate_run_id(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"run_{timestamp}"

    def _write_json(self, path: Path, data: Dict):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _write_text(self, path: Path, text: str):
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    def _update_index(self, run_id: str, lp_input: LPInput, lp_output: LPOutput, validation: ValidationResult):
        index_path = self.output_dir / "runs" / "index.json"

        index = {}
        if index_path.exists():
            with open(index_path, "r", encoding="utf-8") as f:
                index = json.load(f)

        index[run_id] = {
            "version": lp_input.version,
            "description": lp_input.description,
            "status": lp_output.status.value,
            "total_profit": lp_output.total_profit,
            "has_errors": validation.has_errors,
            "issues_count": len(validation.issues),
            "created_at": lp_output.created_at.isoformat() if hasattr(lp_output.created_at, 'isoformat') else str(lp_output.created_at),
            "solve_time": lp_output.solve_time,
        }

        self._write_json(index_path, index)

    def list_runs(self, limit: int = 10) -> List[Dict]:
        index_path = self.output_dir / "runs" / "index.json"
        if not index_path.exists():
            return []

        with open(index_path, "r", encoding="utf-8") as f:
            index = json.load(f)

        runs = sorted(index.items(), key=lambda x: x[0], reverse=True)
        return [{"run_id": rid, **info} for rid, info in runs[:limit]]

    def load_input(self, file_path: str) -> LPInput:
        path = Path(file_path)
        if not path.is_absolute() and self.input_dir:
            path = self.input_dir / file_path

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        return LPInput(**data)

    def load_run(self, run_id: str) -> Dict:
        run_dir = self.output_dir / "runs" / run_id
        if not run_dir.exists():
            raise FileNotFoundError(f"Run {run_id} not found")

        result = {}

        input_path = run_dir / "input.json"
        if input_path.exists():
            with open(input_path, "r", encoding="utf-8") as f:
                result["input"] = LPInput(**json.load(f))

        output_path = run_dir / "output.json"
        if output_path.exists():
            with open(output_path, "r", encoding="utf-8") as f:
                result["output"] = LPOutput(**json.load(f))

        validation_path = run_dir / "validation.json"
        if validation_path.exists():
            with open(validation_path, "r", encoding="utf-8") as f:
                result["validation"] = ValidationResult(**json.load(f))

        report_path = run_dir / "report.md"
        if report_path.exists():
            with open(report_path, "r", encoding="utf-8") as f:
                result["report"] = f.read()

        return result
