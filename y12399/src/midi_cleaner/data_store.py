"""JSON数据存储层"""

import os
import json
import shutil
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
from collections import defaultdict

from .midi_parser import MidiParser, ParsedMidi
from .velocity_cleaner import VelocityCleaner, CleanedVelocityData
from .measure_align import MeasureAlignChecker, AlignmentResult
from .version_tracker import VersionTracker, VersionCheckResult


@dataclass
class CorrectionRecord:
    """修正记录"""
    correction_id: str
    note_id: int
    anomaly_id: Optional[str]
    old_velocity: int
    new_velocity: int
    reason: str
    corrected_by: str
    corrected_at: str
    context: Dict = field(default_factory=dict)


@dataclass
class CorrectionHistory:
    """修正历史"""
    file_hash: str
    corrections: List[CorrectionRecord]
    created_at: str
    updated_at: str


@dataclass
class FileRelationship:
    """文件对应关系"""
    midi_file: str
    midi_hash: str
    cleaned_data_file: str
    velocity_curve_file: str
    report_json_file: str
    report_markdown_file: str
    correction_history_file: str
    created_at: str
    updated_at: str


@dataclass
class CleaningSession:
    """清洗会话"""
    session_id: str
    midi_file_path: str
    midi_file_hash: str
    source_version: str
    track_version: str
    parsed_at: str
    cleaned_at: str
    has_manual_corrections: bool
    statistics_modified: bool
    modified_fields: List[str]
    relationships: FileRelationship


class JsonDataStore:
    """JSON数据存储器"""

    def __init__(
        self,
        base_dir: str,
        midi_dir: Optional[str] = None,
        cleaned_dir: Optional[str] = None,
        reports_dir: Optional[str] = None
    ):
        self.base_dir = base_dir
        self.midi_dir = midi_dir or os.path.join(base_dir, "midi")
        self.cleaned_dir = cleaned_dir or os.path.join(base_dir, "cleaned")
        self.reports_dir = reports_dir or os.path.join(base_dir, "reports")
        self.index_file = os.path.join(self.cleaned_dir, "index.json")
        self.relationships_file = os.path.join(self.cleaned_dir, "relationships.json")

        self._ensure_directories()
        self._init_index()

    def _ensure_directories(self) -> None:
        """确保目录存在"""
        for dir_path in [self.base_dir, self.midi_dir, self.cleaned_dir, self.reports_dir]:
            os.makedirs(dir_path, exist_ok=True)

    def _init_index(self) -> None:
        """初始化索引文件"""
        if not os.path.exists(self.index_file):
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "sessions": {},
                    "file_hash_to_session": {}
                }, f, ensure_ascii=False, indent=2)

        if not os.path.exists(self.relationships_file):
            with open(self.relationships_file, 'w', encoding='utf-8') as f:
                json.dump({"relationships": []}, f, ensure_ascii=False, indent=2)

    def _read_index(self) -> Dict:
        """读取索引"""
        with open(self.index_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _write_index(self, data: Dict) -> None:
        """写入索引"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _read_relationships(self) -> Dict:
        """读取对应关系"""
        with open(self.relationships_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _write_relationships(self, data: Dict) -> None:
        """写入对应关系"""
        with open(self.relationships_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def save_parsed_midi(self, parsed_midi: ParsedMidi, session_id: str) -> str:
        """保存解析后的MIDI数据"""
        file_name = f"{session_id}_parsed.json"
        file_path = os.path.join(self.cleaned_dir, file_name)

        parser = MidiParser()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(parser.to_dict(parsed_midi), f, ensure_ascii=False, indent=2)

        return file_path

    def save_cleaned_data(
        self,
        cleaned_data: CleanedVelocityData,
        alignment_result: AlignmentResult,
        version_result: Optional[VersionCheckResult],
        session_id: str
    ) -> Dict[str, str]:
        """保存清洗后的数据"""
        result = {}

        velocity_cleaner = VelocityCleaner()
        align_checker = MeasureAlignChecker()
        version_tracker = VersionTracker()

        velocity_file = f"{session_id}_velocity_cleaned.json"
        velocity_path = os.path.join(self.cleaned_dir, velocity_file)
        with open(velocity_path, 'w', encoding='utf-8') as f:
            json.dump(velocity_cleaner.to_dict(cleaned_data), f, ensure_ascii=False, indent=2)
        result["velocity_data"] = velocity_path

        curve_file = f"{session_id}_velocity_curve.json"
        curve_path = os.path.join(self.cleaned_dir, curve_file)
        curve_data = self._generate_velocity_curve_data(cleaned_data)
        with open(curve_path, 'w', encoding='utf-8') as f:
            json.dump(curve_data, f, ensure_ascii=False, indent=2)
        result["velocity_curve"] = curve_path

        align_file = f"{session_id}_alignment.json"
        align_path = os.path.join(self.cleaned_dir, align_file)
        with open(align_path, 'w', encoding='utf-8') as f:
            json.dump(align_checker.to_dict(alignment_result), f, ensure_ascii=False, indent=2)
        result["alignment_data"] = align_path

        if version_result:
            version_file = f"{session_id}_versions.json"
            version_path = os.path.join(self.cleaned_dir, version_file)
            with open(version_path, 'w', encoding='utf-8') as f:
                json.dump(version_tracker.to_dict(version_result), f, ensure_ascii=False, indent=2)
            result["version_data"] = version_path

        return result

    def _generate_velocity_curve_data(self, cleaned_data: CleanedVelocityData) -> Dict:
        """生成力度曲线数据（用于可视化）"""
        notes = sorted(cleaned_data.cleaned_notes, key=lambda n: n.start_time)

        original_velocities = []
        cleaned_velocities = []
        timestamps = []
        measure_numbers = []
        note_ids = []
        manually_corrected = []
        original_values = []

        for note in notes:
            timestamps.append(round(note.start_time, 3))
            measure_numbers.append(note.measure)
            note_ids.append(note.note_id)
            manually_corrected.append(note.is_manually_corrected)

            if note.original_velocity is not None:
                original_velocities.append(note.original_velocity)
                original_values.append(note.original_velocity)
            else:
                original_velocities.append(note.velocity)
                original_values.append(None)

            cleaned_velocities.append(note.velocity)

        track_curves = defaultdict(lambda: {
            "timestamps": [],
            "original_velocities": [],
            "cleaned_velocities": [],
            "measures": []
        })

        for note in notes:
            tc = track_curves[note.track]
            tc["timestamps"].append(round(note.start_time, 3))
            tc["measures"].append(note.measure)
            if note.original_velocity is not None:
                tc["original_velocities"].append(note.original_velocity)
            else:
                tc["original_velocities"].append(note.velocity)
            tc["cleaned_velocities"].append(note.velocity)

        return {
            "session_id": "",
            "generated_at": datetime.now().isoformat(),
            "statistics": {
                "original": {
                    "mean": round(sum(original_velocities) / len(original_velocities), 2) if original_velocities else 0,
                    "min": min(original_velocities) if original_velocities else 0,
                    "max": max(original_velocities) if original_velocities else 0
                },
                "cleaned": {
                    "mean": round(sum(cleaned_velocities) / len(cleaned_velocities), 2) if cleaned_velocities else 0,
                    "min": min(cleaned_velocities) if cleaned_velocities else 0,
                    "max": max(cleaned_velocities) if cleaned_velocities else 0
                },
                "is_manually_modified": cleaned_data.statistics.is_manually_modified,
                "modified_fields": cleaned_data.statistics.modified_fields
            },
            "global_curve": {
                "timestamps": timestamps,
                "original_velocities": original_velocities,
                "cleaned_velocities": cleaned_velocities,
                "measures": measure_numbers,
                "note_ids": note_ids,
                "manually_corrected": manually_corrected,
                "original_values": original_values
            },
            "track_curves": {
                str(track_id): dict(data)
                for track_id, data in track_curves.items()
            },
            "anomaly_positions": [
                {
                    "anomaly_id": a.anomaly_id,
                    "note_id": a.note_id,
                    "type": a.type,
                    "severity": a.severity,
                    "original_velocity": a.original_velocity,
                    "suggested_velocity": a.suggested_velocity,
                    "is_manually_corrected": a.is_manually_corrected,
                    "corrected_velocity": a.corrected_velocity,
                    "measure": a.measure,
                    "start_time": a.start_time
                }
                for a in cleaned_data.anomalies
            ]
        }

    def save_reports(
        self,
        report_json: Dict,
        report_markdown: str,
        session_id: str
    ) -> Dict[str, str]:
        """保存报告文件"""
        result = {}

        json_file = f"{session_id}_report.json"
        json_path = os.path.join(self.reports_dir, json_file)
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report_json, f, ensure_ascii=False, indent=2)
        result["report_json"] = json_path

        md_file = f"{session_id}_report.md"
        md_path = os.path.join(self.reports_dir, md_file)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(report_markdown)
        result["report_markdown"] = md_path

        return result

    def save_correction_history(
        self,
        file_hash: str,
        correction_history: CorrectionHistory
    ) -> str:
        """保存修正历史"""
        file_name = f"{file_hash}_corrections.json"
        file_path = os.path.join(self.cleaned_dir, file_name)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump({
                "file_hash": correction_history.file_hash,
                "corrections": [asdict(c) for c in correction_history.corrections],
                "created_at": correction_history.created_at,
                "updated_at": correction_history.updated_at
            }, f, ensure_ascii=False, indent=2)

        return file_path

    def load_correction_history(self, file_hash: str) -> Optional[CorrectionHistory]:
        """加载修正历史"""
        file_name = f"{file_hash}_corrections.json"
        file_path = os.path.join(self.cleaned_dir, file_name)

        if not os.path.exists(file_path):
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return CorrectionHistory(
            file_hash=data["file_hash"],
            corrections=[CorrectionRecord(**c) for c in data["corrections"]],
            created_at=data["created_at"],
            updated_at=data["updated_at"]
        )

    def add_correction(
        self,
        file_hash: str,
        correction: CorrectionRecord
    ) -> CorrectionHistory:
        """添加修正记录"""
        history = self.load_correction_history(file_hash)

        if history is None:
            history = CorrectionHistory(
                file_hash=file_hash,
                corrections=[],
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )

        history.corrections.append(correction)
        history.updated_at = datetime.now().isoformat()

        self.save_correction_history(file_hash, history)
        return history

    def register_session(
        self,
        session: CleaningSession,
        midi_file_path: str,
        relationships: FileRelationship
    ) -> None:
        """注册清洗会话"""
        index_data = self._read_index()

        session_dict = {
            "session_id": session.session_id,
            "midi_file_path": midi_file_path,
            "midi_file_hash": session.midi_file_hash,
            "source_version": session.source_version,
            "track_version": session.track_version,
            "parsed_at": session.parsed_at,
            "cleaned_at": session.cleaned_at,
            "has_manual_corrections": session.has_manual_corrections,
            "statistics_modified": session.statistics_modified,
            "modified_fields": session.modified_fields,
            "relationships": asdict(relationships)
        }

        index_data["sessions"][session.session_id] = session_dict
        index_data["file_hash_to_session"][session.midi_file_hash] = session.session_id

        self._write_index(index_data)

        rel_data = self._read_relationships()
        rel_data["relationships"].append(asdict(relationships))
        self._write_relationships(rel_data)

    def get_session(self, session_id: str) -> Optional[Dict]:
        """获取会话信息"""
        index_data = self._read_index()
        return index_data["sessions"].get(session_id)

    def get_session_by_hash(self, file_hash: str) -> Optional[Dict]:
        """通过文件哈希获取会话"""
        index_data = self._read_index()
        session_id = index_data["file_hash_to_session"].get(file_hash)
        if session_id:
            return index_data["sessions"].get(session_id)
        return None

    def get_all_sessions(self) -> List[Dict]:
        """获取所有会话"""
        index_data = self._read_index()
        return list(index_data["sessions"].values())

    def get_all_relationships(self) -> List[Dict]:
        """获取所有文件对应关系"""
        rel_data = self._read_relationships()
        return rel_data["relationships"]

    def get_relationship_by_midi(self, midi_file_path: str) -> Optional[Dict]:
        """通过MIDI文件路径获取对应关系"""
        relationships = self.get_all_relationships()
        for rel in relationships:
            if rel["midi_file"] == midi_file_path or os.path.basename(rel["midi_file"]) == os.path.basename(midi_file_path):
                return rel
        return None

    def get_relationship_by_hash(self, file_hash: str) -> Optional[Dict]:
        """通过文件哈希获取对应关系"""
        relationships = self.get_all_relationships()
        for rel in relationships:
            if rel["midi_hash"] == file_hash:
                return rel
        return None

    def update_session_correction_status(
        self,
        session_id: str,
        has_manual_corrections: bool,
        statistics_modified: bool,
        modified_fields: List[str]
    ) -> None:
        """更新会话修正状态"""
        index_data = self._read_index()

        if session_id in index_data["sessions"]:
            index_data["sessions"][session_id]["has_manual_corrections"] = has_manual_corrections
            index_data["sessions"][session_id]["statistics_modified"] = statistics_modified
            index_data["sessions"][session_id]["modified_fields"] = modified_fields
            index_data["sessions"][session_id]["updated_at"] = datetime.now().isoformat()
            self._write_index(index_data)

    def generate_session_id(self) -> str:
        """生成会话ID"""
        return f"SESSION_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

    def load_cleaned_data(self, session_id: str) -> Optional[Dict]:
        """加载清洗后的数据"""
        session = self.get_session(session_id)
        if not session:
            return None

        rel = session["relationships"]
        velocity_file = rel["cleaned_data_file"]

        if os.path.exists(velocity_file):
            with open(velocity_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def load_velocity_curve(self, session_id: str) -> Optional[Dict]:
        """加载力度曲线数据"""
        session = self.get_session(session_id)
        if not session:
            return None

        rel = session["relationships"]
        curve_file = rel["velocity_curve_file"]

        if os.path.exists(curve_file):
            with open(curve_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def backup_file(self, file_path: str, backup_dir: Optional[str] = None) -> str:
        """备份文件"""
        if not os.path.exists(file_path):
            return ""

        backup_dir = backup_dir or os.path.join(self.base_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = os.path.basename(file_path)
        backup_name = f"{timestamp}_{file_name}"
        backup_path = os.path.join(backup_dir, backup_name)

        shutil.copy2(file_path, backup_path)
        return backup_path
