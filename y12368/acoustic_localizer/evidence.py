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
            "coordinate_issues": [
                {
                    "microphone_id": c.microphone_id,
                    "reported_position": c.reported_position,
                    "verified_position": c.verified_position,
                    "displacement_m": c.displacement,
                    "detected_by": c.detected_by,
                    "confidence": c.confidence
                }
                for c in self.coordinate_issues
            ],
            "time_gaps": [
                {
                    "pair": g.pair,
                    "expected_value_s": g.expected_value,
                    "actual_value_s": g.actual_value,
                    "gap_type": g.gap_type,
                    "severity": g.severity,
                    "impact_description": g.impact_description
                }
                for g in self.time_gaps
            ],
            "noise_archive": [
                {
                    "timestamp": p.timestamp,
                    "frequency_hz": p.frequency_hz,
                    "amplitude_db": p.amplitude_db,
                    "microphone_id": p.microphone_id,
                    "version_tag": p.version_tag,
                    "window_start": p.window_start,
                    "window_end": p.window_end,
                    "is_archived": p.is_archived
                }
                for p in self.noise_peak_archive
            ],
            "summary": self.generate_evidence_summary()
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

        for c in data.get("coordinate_issues", []):
            issue = CoordinateMisalignment(
                microphone_id=c["microphone_id"],
                reported_position=c["reported_position"],
                verified_position=c.get("verified_position"),
                displacement=c.get("displacement_m", c.get("displacement", 0)),
                detected_by=c["detected_by"],
                confidence=c["confidence"]
            )
            self.coordinate_issues.append(issue)

        for g in data.get("time_gaps", []):
            gap = TimeDifferenceGap(
                pair=g["pair"],
                expected_value=g["expected_value_s"],
                actual_value=g.get("actual_value_s", g.get("actual_value")),
                gap_type=g["gap_type"],
                severity=g["severity"],
                impact_description=g["impact_description"]
            )
            self.time_gaps.append(gap)

        for p in data.get("noise_archive", []):
            peak = NoisePeakRecord(
                timestamp=p["timestamp"],
                frequency_hz=p["frequency_hz"],
                amplitude_db=p["amplitude_db"],
                microphone_id=p["microphone_id"],
                window_start=p.get("window_start", 0.0),
                window_end=p.get("window_end", 0.0),
                version_tag=p["version_tag"],
                is_archived=p.get("is_archived", True)
            )
            self.noise_peak_archive.append(peak)

    def analyze_microphone_geometry(self, mics_dict: Dict[str, Dict[str, float]]) -> List[CoordinateMisalignment]:
        issues = []
        mic_ids = list(mics_dict.keys())

        for i in range(len(mic_ids)):
            for j in range(i + 1, len(mic_ids)):
                id1, id2 = mic_ids[i], mic_ids[j]
                p1 = mics_dict[id1]
                p2 = mics_dict[id2]
                dist = np.sqrt(
                    (p1.get("x", 0) - p2.get("x", 0)) ** 2 +
                    (p1.get("y", 0) - p2.get("y", 0)) ** 2 +
                    (p1.get("z", 0) - p2.get("z", 0)) ** 2
                )
                if dist < 0.01:
                    issue = CoordinateMisalignment(
                        microphone_id=f"{id1}/{id2}",
                        reported_position={"mic1": p1, "mic2": p2},
                        verified_position=None,
                        displacement=dist,
                        detected_by="overlap_check",
                        confidence=0.95
                    )
                    issues.append(issue)
                    self.record_coordinate_misalignment(issue)

        if len(mic_ids) >= 3:
            positions = [np.array([mics_dict[mid].get("x", 0),
                                   mics_dict[mid].get("y", 0)])
                         for mid in mic_ids]

            all_collinear = True
            p0 = positions[0]
            p1 = positions[1]
            v1 = p1 - p0
            base_len = np.linalg.norm(v1)

            if base_len > 0.001:
                for i in range(2, len(positions)):
                    v2 = positions[i] - p0
                    cross = np.abs(np.cross(v1, v2))
                    height = cross / base_len
                    if height > 0.01:
                        all_collinear = False
                        break
            else:
                all_collinear = False

            if all_collinear and len(mic_ids) >= 3:
                for mid in mic_ids:
                    issue = CoordinateMisalignment(
                        microphone_id=mid,
                        reported_position=mics_dict[mid],
                        verified_position=None,
                        displacement=0.0,
                        detected_by="all_collinear_geometry",
                        confidence=0.7
                    )
                    issues.append(issue)
                    self.record_coordinate_misalignment(issue)

        return issues

    def analyze_time_difference_quality(self, tds_list: List[Dict],
                                         mic_positions: Dict[str, Dict[str, float]],
                                         source_position: List[float],
                                         speed_of_sound: float = 343.0) -> List[TimeDifferenceGap]:
        gaps = []
        src = np.array(source_position[:2])

        for td in tds_list:
            mic1_id = td.get("mic1_id", td.get("mic1", ""))
            mic2_id = td.get("mic2_id", td.get("mic2", ""))
            measured_dt = td.get("delta_t", 0)

            if mic1_id in mic_positions and mic2_id in mic_positions:
                p1 = np.array([mic_positions[mic1_id].get("x", 0),
                               mic_positions[mic1_id].get("y", 0)])
                p2 = np.array([mic_positions[mic2_id].get("x", 0),
                               mic_positions[mic2_id].get("y", 0)])

                d1 = np.linalg.norm(src - p1)
                d2 = np.linalg.norm(src - p2)
                expected_dt = (d1 - d2) / speed_of_sound

                diff = abs(measured_dt - expected_dt)
                if diff > 0.0005:
                    pair = f"{mic1_id}-{mic2_id}"
                    gap_type = "inconsistency"
                    severity = "high" if diff > 0.002 else "medium" if diff > 0.001 else "low"

                    gap = TimeDifferenceGap(
                        pair=pair,
                        expected_value=expected_dt,
                        actual_value=measured_dt,
                        gap_type=gap_type,
                        severity=severity,
                        impact_description=f"时间差残差 {diff*1000:.2f}ms，超出容忍范围"
                    )
                    gaps.append(gap)
                    self.record_time_difference_gap(gap)

        return gaps

    def archive_time_difference_noise_peaks(self, tds_list: List[Dict]) -> List[NoisePeakRecord]:
        archived = []

        for td in tds_list:
            noise_peak = td.get("noise_peak")
            if noise_peak is not None:
                mic1_id = td.get("mic1_id", td.get("mic1", ""))
                mic2_id = td.get("mic2_id", td.get("mic2", ""))

                peak = NoisePeakRecord(
                    timestamp=datetime.now().isoformat(),
                    frequency_hz=td.get("frequency_hz", 1000.0),
                    amplitude_db=float(noise_peak),
                    microphone_id=f"{mic1_id}/{mic2_id}",
                    window_start=td.get("window_start", 0.0),
                    window_end=td.get("window_end", 0.0),
                    version_tag="v1.0",
                    is_archived=False
                )
                self.archive_noise_peak(peak)
                archived.append(peak)

        return archived

    def auto_detect_all(self, mics_dict: Dict[str, Dict[str, float]],
                        tds_list: List[Dict],
                        source_position: List[float] = None,
                        speed_of_sound: float = 343.0) -> Dict:
        geometry_issues = self.analyze_microphone_geometry(mics_dict)

        if source_position is not None:
            td_gaps = self.analyze_time_difference_quality(
                tds_list, mic_positions=mics_dict,
                source_position=source_position,
                speed_of_sound=speed_of_sound
            )
        else:
            td_gaps = []

        noise_peaks = self.archive_time_difference_noise_peaks(tds_list)

        return {
            "coordinate_issues": len(geometry_issues),
            "time_difference_gaps": len(td_gaps),
            "archived_noise_peaks": len(noise_peaks)
        }
