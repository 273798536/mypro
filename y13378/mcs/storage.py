"""存储层 - 基于文件系统，保留所有原始痕迹"""
import os
import json
import shutil
from typing import List, Optional, Dict, Any
from pathlib import Path

from .models import (
    Sample, Correction, VersionSnapshot, GrayIssue, Report,
    _new_id
)


class Storage:
    """文件系统存储

    目录结构:
    data/
      samples/
        raw/          - 原始文件原样保留
        parsed/       - 解析后的样本 JSON
      snapshots/
        {snapshot_id}.json
      corrections/
        {correction_id}.json
      reports/
        {report_id}.md
      gray_issues/
        {issue_id}.json
    """

    def __init__(self, root_dir: str = "./data"):
        self.root = Path(root_dir).resolve()
        self._ensure_dirs()

    def _ensure_dirs(self):
        subdirs = [
            "samples/raw",
            "samples/parsed",
            "snapshots",
            "corrections",
            "reports",
            "gray_issues",
        ]
        for d in subdirs:
            (self.root / d).mkdir(parents=True, exist_ok=True)

    # ---- 原始文件 ----

    def save_raw_file(self, source_name: str, content: str) -> str:
        """保存原始文件，原样保留，返回保存后的路径"""
        raw_dir = self.root / "samples" / "raw"
        safe_name = source_name.replace("/", "_").replace("\\", "_")
        # 如果重名，加时间戳后缀
        target = raw_dir / safe_name
        if target.exists():
            from datetime import datetime
            stem = target.stem
            suffix = target.suffix
            ts = datetime.now().strftime("%H%M%S")
            target = raw_dir / f"{stem}_{ts}{suffix}"
        target.write_text(content, encoding="utf-8")
        return str(target)

    def list_raw_files(self) -> List[str]:
        raw_dir = self.root / "samples" / "raw"
        return sorted([str(p) for p in raw_dir.iterdir() if p.is_file()])

    # ---- 样本 ----

    def save_sample(self, sample: Sample) -> str:
        path = self.root / "samples" / "parsed" / f"{sample.sample_id}.json"
        path.write_text(
            json.dumps(sample.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        return str(path)

    def load_sample(self, sample_id: str) -> Optional[Sample]:
        path = self.root / "samples" / "parsed" / f"{sample_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return Sample(**data)

    def list_samples(self) -> List[Sample]:
        parsed_dir = self.root / "samples" / "parsed"
        samples = []
        for p in sorted(parsed_dir.glob("*.json")):
            data = json.loads(p.read_text(encoding="utf-8"))
            samples.append(Sample(**data))
        return samples

    # ---- 快照 ----

    def save_snapshot(self, snapshot: VersionSnapshot) -> str:
        path = self.root / "snapshots" / f"{snapshot.snapshot_id}.json"
        path.write_text(
            json.dumps(snapshot.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        return str(path)

    def load_snapshot(self, snapshot_id: str) -> Optional[VersionSnapshot]:
        path = self.root / "snapshots" / f"{snapshot_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return VersionSnapshot(**data)

    def list_snapshots(self) -> List[VersionSnapshot]:
        snap_dir = self.root / "snapshots"
        snaps = []
        for p in sorted(snap_dir.glob("*.json")):
            data = json.loads(p.read_text(encoding="utf-8"))
            snaps.append(VersionSnapshot(**data))
        return snaps

    def get_latest_snapshot(self, model_version: Optional[str] = None) -> Optional[VersionSnapshot]:
        snaps = self.list_snapshots()
        if model_version:
            snaps = [s for s in snaps if s.model_version == model_version]
        return snaps[-1] if snaps else None

    # ---- 修正记录 ----

    def save_correction(self, correction: Correction) -> str:
        path = self.root / "corrections" / f"{correction.correction_id}.json"
        path.write_text(
            json.dumps(correction.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        return str(path)

    def load_correction(self, correction_id: str) -> Optional[Correction]:
        path = self.root / "corrections" / f"{correction_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return Correction(**data)

    def list_corrections(self, sample_id: Optional[str] = None) -> List[Correction]:
        corr_dir = self.root / "corrections"
        corrs = []
        for p in sorted(corr_dir.glob("*.json")):
            data = json.loads(p.read_text(encoding="utf-8"))
            corr = Correction(**data)
            if sample_id is None or corr.sample_id == sample_id:
                corrs.append(corr)
        return corrs

    # ---- 灰度问题 ----

    def save_gray_issue(self, issue: GrayIssue) -> str:
        path = self.root / "gray_issues" / f"{issue.issue_id}.json"
        path.write_text(
            json.dumps(issue.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        return str(path)

    def list_gray_issues(self, snapshot_id: Optional[str] = None) -> List[GrayIssue]:
        issue_dir = self.root / "gray_issues"
        issues = []
        for p in sorted(issue_dir.glob("*.json")):
            data = json.loads(p.read_text(encoding="utf-8"))
            issue = GrayIssue(**data)
            if snapshot_id is None or issue.snapshot_id == snapshot_id:
                issues.append(issue)
        return issues

    # ---- 报告 ----

    def save_report(self, report: Report) -> str:
        path = self.root / "reports" / f"{report.report_id}.md"
        path.write_text(report.content, encoding="utf-8")
        report.file_path = str(path)
        # 也保存元数据
        meta_path = self.root / "reports" / f"{report.report_id}.json"
        meta_path.write_text(
            json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        return str(path)

    def list_reports(self) -> List[Report]:
        report_dir = self.root / "reports"
        reports = []
        for p in sorted(report_dir.glob("*.json")):
            data = json.loads(p.read_text(encoding="utf-8"))
            reports.append(Report(**data))
        return reports

    def get_raw_path(self) -> str:
        return str(self.root / "samples" / "raw")
