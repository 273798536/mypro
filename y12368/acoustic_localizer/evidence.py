import numpy as np
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import json
import hashlib
from pathlib import Path


@dataclass
class EvidenceItem:
    id: str
    timestamp: str
    type: str
    description: str
    data: Dict[str, Any]
    source: str
    version: str = "1.0"
    notes: str = ""

    def generate_id(self) -> str:
        data_str = json.dumps(self.data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]


@dataclass
class TimeDifferenceGap:
    pair: str
    expected_value: float
    actual_value: Optional[float]
    gap_type: str
    severity: str
    impact_description: str


@dataclass
class CoordinateMisalignment:
    microphone_id: str
    reported_position: Dict[str, float]
    verified_position: Optional[Dict[str, float]]
    displacement: float
    detected_by: str
    confidence: float


@dataclass
class NoisePeakRecord:
    timestamp: str
    frequency_hz: float
    amplitude_db: float
    microphone_id: str
    window_start: float
    window_end: float
    version_tag: str
    is_archived: bool = False


@dataclass
class TuningNote:
    id: str
    timestamp: str
    author: str
    category: str
    content: str
    related_evidence: List[str] = field(default_factory=list)
    severity: str = "info"
    resolved: bool = False


class EvidenceManager:
    def __init__(self, case_id: str = "default"):
        self.case_id = case_id
        self.evidence_items: List[EvidenceItem] = []
        self.tuning_notes: List[TuningNote] = []
        self.noise_peak_archive: List[NoisePeakRecord] = []
        self.time_gaps: List[TimeDifferenceGap] = []
        self.coordinate_issues: List[CoordinateMisalignment] = []
        self.version_history: List[str] = []

    def add_tuning_note(self, note: TuningNote) -> str:
        note.id = f"note_{len(self.tuning_notes) + 1}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.tuning_notes.append(note)
        return note.id

    def record_time_difference_gap(self, gap: TimeDifferenceGap) -> None:
        self.time_gaps.append(gap)
        self._add_evidence_item(
            type="time_difference_gap",
            description=f"时间差缺失或异常: {gap.pair}",
            data={
                "pair": gap.pair,
                "expected": gap.expected_value,
                "actual": gap.actual_value,
                "gap_type": gap.gap_type,
                "severity": gap.severity,
                "impact": gap.impact_description
            },
            source="auto_detection"
        )

    def record_coordinate_misalignment(self, issue: CoordinateMisalignment) -> None:
        self.coordinate_issues.append(issue)
        self._add_evidence_item(
            type="coordinate_misalignment",
            description=f"坐标错位检测: {issue.microphone_id}",
            data={
                "microphone_id": issue.microphone_id,
                "reported_position": issue.reported_position,
                "verified_position": issue.verified_position,
                "displacement_m": issue.displacement,
                "detected_by": issue.detected_by,
                "confidence": issue.confidence
            },
            source="coordinate_validation"
        )

    def archive_noise_peak(self, peak: NoisePeakRecord) -> None:
        peak.is_archived = True
        self.noise_peak_archive.append(peak)
        self._add_evidence_item(
            type="noise_peak_archive",
            description=f"噪声峰值归档: {peak.frequency_hz}Hz @ {peak.microphone_id}",
            data={
                "frequency_hz": peak.frequency_hz,
                "amplitude_db": peak.amplitude_db,
                "microphone_id": peak.microphone_id,
                "version_tag": peak.version_tag,
                "window": [peak.window_start, peak.window_end]
            },
            source="measurement_archive"
        )

    def _add_evidence_item(self, type: str, description: str, data: Dict, source: str) -> str:
        item = EvidenceItem(
            id="",
            timestamp=datetime.now().isoformat(),
            type=type,
            description=description,
            data=data,
            source=source
        )
        item.id = item.generate_id()
        self.evidence_items.append(item)
        return item.id

    def get_evidence_by_type(self, evidence_type: str) -> List[EvidenceItem]:
        return [e for e in self.evidence_items if e.type == evidence_type]

    def get_supporting_evidence(self, position: np.ndarray, tolerance: float = 0.5) -> List[EvidenceItem]:
        supporting = []
        for item in self.evidence_items:
            if "position" in item.data:
                item_pos = np.array([
                    item.data["position"].get("x", 0),
                    item.data["position"].get("y", 0)
                ])
                if np.linalg.norm(position - item_pos) < tolerance:
                    supporting.append(item)
        return supporting

    def validate_coordinates(self, reported_mics: Dict, expected_positions: Dict) -> List[CoordinateMisalignment]:
        issues = []
        for mic_id, reported in reported_mics.items():
            if mic_id in expected_positions:
                expected = expected_positions[mic_id]
                displacement = np.sqrt(
                    (reported["x"] - expected["x"]) ** 2 +
                    (reported["y"] - expected["y"]) ** 2
                )
                if displacement > 0.05:
                    issue = CoordinateMisalignment(
                        microphone_id=mic_id,
                        reported_position=reported,
                        verified_position=expected,
                        displacement=displacement,
                        detected_by="expected_position_comparison",
                        confidence=0.9
                    )
                    issues.append(issue)
                    self.record_coordinate_misalignment(issue)
        return issues

    def check_time_difference_consistency(self, measured_tds: Dict, expected_tds: Dict,
                                         tolerance: float = 0.0005) -> List[TimeDifferenceGap]:
        gaps = []
        for pair, measured in measured_tds.items():
            if pair in expected_tds:
                expected = expected_tds[pair]
                diff = abs(measured - expected)
                if diff > tolerance:
                    gap = TimeDifferenceGap(
                        pair=pair,
                        expected_value=expected,
                        actual_value=measured,
                        gap_type="inconsistency",
                        severity="high" if diff > tolerance * 3 else "medium",
                        impact_description=f"时间差超出容忍范围 {diff*1000:.2f}ms"
                    )
                    gaps.append(gap)
                    self.record_time_difference_gap(gap)
            else:
                gap = TimeDifferenceGap(
                    pair=pair,
                    expected_value=0.0,
                    actual_value=measured,
                    gap_type="unexpected",
                    severity="low",
                    impact_description="未预期的时间差测量"
                )
                gaps.append(gap)

        for pair, expected in expected_tds.items():
            if pair not in measured_tds:
                gap = TimeDifferenceGap(
                    pair=pair,
                    expected_value=expected,
                    actual_value=None,
                    gap_type="missing",
                    severity="high",
                    impact_description="关键时间差测量缺失"
                )
                gaps.append(gap)
                self.record_time_difference_gap(gap)

        return gaps

    def generate_evidence_summary(self) -> Dict:
        return {
            "case_id": self.case_id,
            "total_evidence_items": len(self.evidence_items),
            "evidence_by_type": self._count_by_type(),
            "tuning_notes": {
                "total": len(self.tuning_notes),
                "resolved": len([n for n in self.tuning_notes if n.resolved]),
                "by_severity": self._count_notes_by_severity()
            },
            "coordinate_issues": len(self.coordinate_issues),
            "time_gaps": len(self.time_gaps),
            "archived_noise_peaks": len(self.noise_peak_archive)
        }

    def _count_by_type(self) -> Dict[str, int]:
        counts = {}
        for item in self.evidence_items:
            counts[item.type] = counts.get(item.type, 0) + 1
        return counts

    def _count_notes_by_severity(self) -> Dict[str, int]:
        counts = {}
        for note in self.tuning_notes:
            counts[note.severity] = counts.get(note.severity, 0) + 1
        return counts

    def export_evidence(self, filepath: str) -> None:
        export_data = {
            "case_id": self.case_id,
            "export_timestamp": datetime.now().isoformat(),
            "evidence_items": [
                {
                    "id": e.id,
                    "timestamp": e.timestamp,
                    "type": e.type,
                    "description": e.description,
                    "data": e.data,
                    "source": e.source,
                    "version": e.version,
                    "notes": e.notes
                }
                for e in self.evidence_items
            ],
            "tuning_notes": [
                {
                    "id": n.id,
                    "timestamp": n.timestamp,
                    "author": n.author,
                    "category": n.category,
                    "content": n.content,
                    "related_evidence": n.related_evidence,
                    "severity": n.severity,
                    "resolved": n.resolved
                }
                for n in self.tuning_notes
            ],
            "noise_archive": [
                {
                    "timestamp": p.timestamp,
                    "frequency_hz": p.frequency_hz,
                    "amplitude_db": p.amplitude_db,
                    "microphone_id": p.microphone_id,
                    "version_tag": p.version_tag
                }
                for p in self.noise_peak_archive
            ]
        }

        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

    def import_evidence(self, filepath: str) -> None:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for e in data.get("evidence_items", []):
            item = EvidenceItem(
                id=e["id"],
                timestamp=e["timestamp"],
                type=e["type"],
                description=e["description"],
                data=e["data"],
                source=e["source"],
                version=e.get("version", "1.0"),
                notes=e.get("notes", "")
            )
            self.evidence_items.append(item)

        for n in data.get("tuning_notes", []):
            note = TuningNote(
                id=n["id"],
                timestamp=n["timestamp"],
                author=n["author"],
                category=n["category"],
                content=n["content"],
                related_evidence=n.get("related_evidence", []),
                severity=n.get("severity", "info"),
                resolved=n.get("resolved", False)
            )
            self.tuning_notes.append(note)
