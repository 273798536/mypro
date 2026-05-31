import os
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
from .segment_identifier import Segment, SegmentType, format_time


@dataclass
class SourceRef:
    file_path: str
    file_type: str
    line_number: Optional[int] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": os.path.abspath(self.file_path),
            "file_name": os.path.basename(self.file_path),
            "file_type": self.file_type,
            "line_number": self.line_number,
            "details": self.details
        }


@dataclass
class Finding:
    finding_id: str
    finding_type: str
    severity: str
    message: str
    start_ms: int
    end_ms: int
    segment_type: str
    confidence: float
    sources: List[SourceRef] = field(default_factory=list)
    evidence: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration_str(self) -> str:
        return format_time(self.end_ms - self.start_ms)

    @property
    def time_range_str(self) -> str:
        return f"{format_time(self.start_ms)} - {format_time(self.end_ms)}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "finding_id": self.finding_id,
            "finding_type": self.finding_type,
            "severity": self.severity,
            "message": self.message,
            "start_ms": self.start_ms,
            "end_ms": self.end_ms,
            "time_range": self.time_range_str,
            "duration": self.duration_str,
            "segment_type": self.segment_type,
            "confidence": self.confidence,
            "sources": [s.to_dict() for s in self.sources],
            "evidence": self.evidence,
            "metadata": self.metadata
        }


@dataclass
class CorrectionRecord:
    timestamp: str
    finding_id: str
    original_type: str
    corrected_type: str
    reason: str
    corrected_by: str = "manual"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "finding_id": self.finding_id,
            "original_type": self.original_type,
            "corrected_type": self.corrected_type,
            "reason": self.reason,
            "corrected_by": self.corrected_by
        }


@dataclass
class FileSummary:
    source_file: str
    duration_ms: int
    total_findings: int
    findings_by_type: Dict[str, int]
    segments: List[Dict[str, Any]]

    @property
    def file_name(self) -> str:
        return os.path.basename(self.source_file)

    @property
    def duration_str(self) -> str:
        return format_time(self.duration_ms)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_file": os.path.abspath(self.source_file),
            "file_name": self.file_name,
            "duration_ms": self.duration_ms,
            "duration_str": self.duration_str,
            "total_findings": self.total_findings,
            "findings_by_type": self.findings_by_type,
            "segments": self.segments
        }


@dataclass
class CheckReport:
    report_id: str
    timestamp: str
    input_dir: str
    output_dir: str
    parameters: Dict[str, Any]
    files: List[FileSummary] = field(default_factory=list)
    findings: List[Finding] = field(default_factory=list)
    corrections: List[CorrectionRecord] = field(default_factory=list)

    @property
    def total_files(self) -> int:
        return len(self.files)

    @property
    def total_findings(self) -> int:
        return len(self.findings)

    @property
    def findings_by_severity(self) -> Dict[str, int]:
        result = {}
        for f in self.findings:
            result[f.severity] = result.get(f.severity, 0) + 1
        return result

    @property
    def findings_by_type(self) -> Dict[str, int]:
        result = {}
        for f in self.findings:
            result[f.finding_type] = result.get(f.finding_type, 0) + 1
        return result

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "timestamp": self.timestamp,
            "input_dir": os.path.abspath(self.input_dir),
            "output_dir": os.path.abspath(self.output_dir),
            "parameters": self.parameters,
            "summary": {
                "total_files": self.total_files,
                "total_findings": self.total_findings,
                "findings_by_severity": self.findings_by_severity,
                "findings_by_type": self.findings_by_type
            },
            "files": [f.to_dict() for f in self.files],
            "findings": [f.to_dict() for f in self.findings],
            "corrections": [c.to_dict() for c in self.corrections]
        }

    def save_json(self, file_path: str) -> None:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load_json(cls, file_path: str) -> 'CheckReport':
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CheckReport':
        files = [
            FileSummary(
                source_file=f["source_file"],
                duration_ms=f["duration_ms"],
                total_findings=f["total_findings"],
                findings_by_type=f["findings_by_type"],
                segments=f["segments"]
            )
            for f in data.get("files", [])
        ]

        findings = [
            Finding(
                finding_id=f["finding_id"],
                finding_type=f["finding_type"],
                severity=f["severity"],
                message=f["message"],
                start_ms=f["start_ms"],
                end_ms=f["end_ms"],
                segment_type=f["segment_type"],
                confidence=f["confidence"],
                evidence=f.get("evidence", []),
                metadata=f.get("metadata", {})
            )
            for f in data.get("findings", [])
        ]

        corrections = [
            CorrectionRecord(
                timestamp=c["timestamp"],
                finding_id=c["finding_id"],
                original_type=c["original_type"],
                corrected_type=c["corrected_type"],
                reason=c["reason"],
                corrected_by=c.get("corrected_by", "manual")
            )
            for c in data.get("corrections", [])
        ]

        return cls(
            report_id=data["report_id"],
            timestamp=data["timestamp"],
            input_dir=data["input_dir"],
            output_dir=data["output_dir"],
            parameters=data["parameters"],
            files=files,
            findings=findings,
            corrections=corrections
        )


class HistoryTracker:
    HISTORY_DIR = ".check_history"

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.history_path = os.path.join(output_dir, self.HISTORY_DIR)
        os.makedirs(self.history_path, exist_ok=True)

    def _generate_id(self, prefix: str = "") -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}{timestamp}"

    def create_report(self, input_dir: str, parameters: Dict[str, Any]) -> CheckReport:
        return CheckReport(
            report_id=self._generate_id("REP_"),
            timestamp=datetime.now().isoformat(),
            input_dir=input_dir,
            output_dir=self.output_dir,
            parameters=parameters
        )

    def create_finding(self, segment: Segment, finding_type: str,
                       severity: str, message: str,
                       additional_sources: Optional[List[SourceRef]] = None) -> Finding:
        sources = []

        sources.append(SourceRef(
            file_path=segment.source_file,
            file_type="audio",
            details={
                "average_rms_db": segment.average_rms_db,
                "start_ms": segment.start_ms,
                "end_ms": segment.end_ms
            }
        ))

        for marker in segment.markers:
            sources.append(SourceRef(
                file_path=marker.source_file,
                file_type="marker",
                line_number=marker.line_number,
                details={
                    "label": marker.label,
                    "marker_start_ms": marker.start_ms,
                    "marker_end_ms": marker.end_ms
                }
            ))

        if additional_sources:
            sources.extend(additional_sources)

        return Finding(
            finding_id=self._generate_id("FND_"),
            finding_type=finding_type,
            severity=severity,
            message=message,
            start_ms=segment.start_ms,
            end_ms=segment.end_ms,
            segment_type=segment.segment_type.value,
            confidence=segment.confidence,
            sources=sources,
            evidence=list(segment.evidence)
        )

    def add_correction(self, report: CheckReport, finding_id: str,
                       original_type: str, corrected_type: str,
                       reason: str) -> CorrectionRecord:
        correction = CorrectionRecord(
            timestamp=datetime.now().isoformat(),
            finding_id=finding_id,
            original_type=original_type,
            corrected_type=corrected_type,
            reason=reason
        )
        report.corrections.append(correction)

        for finding in report.findings:
            if finding.finding_id == finding_id:
                finding.segment_type = corrected_type
                finding.metadata["corrected"] = True
                finding.metadata["correction_reason"] = reason
                break

        return correction

    def save_history(self, report: CheckReport) -> str:
        history_file = os.path.join(
            self.history_path,
            f"{report.report_id}.json"
        )
        report.save_json(history_file)

        latest_file = os.path.join(self.history_path, "latest.json")
        report.save_json(latest_file)

        return history_file

    def load_latest(self) -> Optional[CheckReport]:
        latest_file = os.path.join(self.history_path, "latest.json")
        if os.path.exists(latest_file):
            return CheckReport.load_json(latest_file)
        return None

    def list_history(self) -> List[str]:
        if not os.path.exists(self.history_path):
            return []
        files = [f for f in os.listdir(self.history_path)
                 if f.startswith("REP_") and f.endswith(".json")]
        return sorted(files, reverse=True)

    def compare_with_previous(self, current_report: CheckReport,
                              previous_report: Optional[CheckReport] = None) -> Dict[str, Any]:
        if previous_report is None:
            previous_report = self.load_latest()
            if previous_report is None:
                return {"has_previous": False}

        current_ids = {f.finding_id for f in current_report.findings}
        previous_ids = {f.finding_id for f in previous_report.findings}

        new_findings = [f for f in current_report.findings
                        if f.finding_id not in previous_ids]
        resolved_findings = [f for f in previous_report.findings
                             if f.finding_id not in current_ids]

        return {
            "has_previous": True,
            "previous_report_id": previous_report.report_id,
            "previous_timestamp": previous_report.timestamp,
            "new_findings": [f.to_dict() for f in new_findings],
            "resolved_findings": [f.to_dict() for f in resolved_findings],
            "new_count": len(new_findings),
            "resolved_count": len(resolved_findings)
        }
