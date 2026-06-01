import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import uuid

from .models import (
    ScoreProject,
    ImportSource,
    Measure,
    MusicSymbol,
    Note,
    Accidental,
    Slur,
    BoundingBox,
    SymbolType,
    AccidentalType,
    NotePitch,
    VersionHistory,
)


class ScoreImporter:
    def __init__(self, project: ScoreProject):
        self.project = project

    def import_photo(self, photo_path: str, metadata: Optional[Dict[str, Any]] = None) -> ImportSource:
        source = ImportSource(
            source_type="photo",
            file_path=photo_path,
            version=self.project.current_version,
            metadata=metadata or {},
        )
        self.project.import_sources.append(source)
        self._update_version("导入乐谱照片", "importer", [f"照片: {os.path.basename(photo_path)}"])
        return source

    def import_ocr_result(self, ocr_data: Dict[str, Any], source_name: str = "ocr") -> ImportSource:
        source = ImportSource(
            source_type="ocr",
            file_path=source_name,
            version=self.project.current_version,
            metadata={"raw_data": ocr_data},
        )
        self.project.import_sources.append(source)

        if "measures" in ocr_data:
            self._merge_measures_from_ocr(ocr_data["measures"])

        self._update_version("导入OCR结果", "importer", [f"OCR数据源: {source_name}"])
        return source

    def import_symbol_list(self, symbols_data: List[Dict[str, Any]], source_name: str = "symbols") -> ImportSource:
        source = ImportSource(
            source_type="symbols",
            file_path=source_name,
            version=self.project.current_version,
            metadata={"symbol_count": len(symbols_data)},
        )
        self.project.import_sources.append(source)

        for symbol_data in symbols_data:
            self._merge_symbol(symbol_data)

        self._update_version("导入符号清单", "importer", [f"导入 {len(symbols_data)} 个符号"])
        return source

    def import_from_json_file(self, file_path: str) -> ImportSource:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        source_type = data.get("type", "unknown")

        if source_type == "ocr":
            return self.import_ocr_result(data, os.path.basename(file_path))
        elif source_type == "symbols":
            return self.import_symbol_list(data.get("symbols", []), os.path.basename(file_path))
        else:
            source = ImportSource(
                source_type=source_type,
                file_path=file_path,
                version=self.project.current_version,
                metadata=data,
            )
            self.project.import_sources.append(source)
            return source

    def _merge_measures_from_ocr(self, measures_data: List[Dict[str, Any]]):
        existing_measures = {m.measure_number: m for m in self.project.measures}

        for measure_data in measures_data:
            measure_num = measure_data.get("measure_number")
            if measure_num is None:
                continue

            if measure_num in existing_measures:
                measure = existing_measures[measure_num]
                self._update_existing_measure(measure, measure_data)
            else:
                measure = self._create_measure(measure_data)
                self.project.measures.append(measure)

        self.project.measures.sort(key=lambda m: m.measure_number)

    def _create_measure(self, measure_data: Dict[str, Any]) -> Measure:
        measure_id = measure_data.get("id", f"measure_{uuid.uuid4().hex[:8]}")
        position_data = measure_data.get("position")
        position = BoundingBox(**position_data) if position_data else None

        measure = Measure(
            id=measure_id,
            measure_number=measure_data["measure_number"],
            time_signature=measure_data.get("time_signature"),
            key_signature=measure_data.get("key_signature"),
            position=position,
            is_complete=measure_data.get("is_complete", True),
        )

        for symbol_data in measure_data.get("symbols", []):
            symbol = self._create_symbol(symbol_data)
            if symbol:
                measure.symbols.append(symbol)

        return measure

    def _update_existing_measure(self, measure: Measure, measure_data: Dict[str, Any]):
        if measure_data.get("time_signature"):
            measure.time_signature = measure_data["time_signature"]
        if measure_data.get("key_signature"):
            measure.key_signature = measure_data["key_signature"]
        if measure_data.get("position"):
            measure.position = BoundingBox(**measure_data["position"])
        measure.is_complete = measure_data.get("is_complete", measure.is_complete)

        existing_symbol_ids = {s.id for s in measure.symbols}
        for symbol_data in measure_data.get("symbols", []):
            symbol_id = symbol_data.get("id")
            if symbol_id and symbol_id not in existing_symbol_ids:
                symbol = self._create_symbol(symbol_data)
                if symbol:
                    measure.symbols.append(symbol)

    def _create_symbol(self, symbol_data: Dict[str, Any]) -> Optional[MusicSymbol]:
        symbol_type_str = symbol_data.get("symbol_type")
        if not symbol_type_str:
            return None

        try:
            symbol_type = SymbolType(symbol_type_str)
        except ValueError:
            return None

        symbol_id = symbol_data.get("id", f"symbol_{uuid.uuid4().hex[:8]}")
        position_data = symbol_data.get("position", {})
        position = BoundingBox(
            x=position_data.get("x", 0),
            y=position_data.get("y", 0),
            width=position_data.get("width", 0),
            height=position_data.get("height", 0),
            confidence=position_data.get("confidence"),
        )

        base_params = {
            "id": symbol_id,
            "symbol_type": symbol_type,
            "position": position,
            "raw_text": symbol_data.get("raw_text"),
            "confidence": symbol_data.get("confidence", 1.0),
            "metadata": symbol_data.get("metadata", {}),
        }

        if symbol_type == SymbolType.NOTE:
            try:
                pitch = NotePitch(symbol_data.get("pitch", "C"))
            except ValueError:
                pitch = NotePitch.C

            return Note(
                **base_params,
                pitch=pitch,
                octave=symbol_data.get("octave", 4),
                duration=symbol_data.get("duration", 1.0),
                accidental=AccidentalType(symbol_data["accidental"]) if symbol_data.get("accidental") else None,
                dots=symbol_data.get("dots", 0),
            )
        elif symbol_type == SymbolType.ACCIDENTAL:
            try:
                acc_type = AccidentalType(symbol_data.get("accidental_type", "natural"))
            except ValueError:
                acc_type = AccidentalType.NATURAL
            return Accidental(**base_params, accidental_type=acc_type)
        elif symbol_type == SymbolType.SLUR:
            return Slur(
                **base_params,
                start_note_id=symbol_data.get("start_note_id"),
                end_note_id=symbol_data.get("end_note_id"),
                is_complete=symbol_data.get("is_complete", True),
            )
        else:
            return MusicSymbol(**base_params)

    def _merge_symbol(self, symbol_data: Dict[str, Any]):
        measure_num = symbol_data.get("measure_number")
        if measure_num is None:
            return

        measure = self._get_or_create_measure(measure_num)
        symbol = self._create_symbol(symbol_data)
        if symbol:
            existing_ids = {s.id for s in measure.symbols}
            if symbol.id not in existing_ids:
                measure.symbols.append(symbol)

    def _get_or_create_measure(self, measure_number: int) -> Measure:
        for measure in self.project.measures:
            if measure.measure_number == measure_number:
                return measure

        measure = Measure(
            id=f"measure_{measure_number}_{uuid.uuid4().hex[:6]}",
            measure_number=measure_number,
        )
        self.project.measures.append(measure)
        self.project.measures.sort(key=lambda m: m.measure_number)
        return measure

    def _update_version(self, description: str, changed_by: str, changes: List[str]):
        self.project.current_version += 1
        self.project.updated_at = datetime.now()

        version_entry = VersionHistory(
            version=self.project.current_version,
            timestamp=datetime.now(),
            description=description,
            changed_by=changed_by,
            changes=changes,
        )
        self.project.version_history.append(version_entry)


def create_new_project(name: str) -> ScoreProject:
    project = ScoreProject(
        id=f"proj_{uuid.uuid4().hex[:12]}",
        name=name,
    )

    project.version_history.append(
        VersionHistory(
            version=1,
            timestamp=project.created_at,
            description="创建新项目",
            changed_by="system",
            changes=[f"项目名称: {name}"],
        )
    )

    return project


def save_project(project: ScoreProject, output_dir: str) -> str:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    file_path = os.path.join(output_dir, f"{project.id}.json")

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(project.model_dump(mode="json"), f, ensure_ascii=False, indent=2)

    return file_path


def load_project(file_path: str) -> ScoreProject:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ScoreProject(**data)
