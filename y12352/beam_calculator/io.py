from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Union
import json
import csv
from pathlib import Path
from datetime import datetime
from .models import Beam, Load, LoadType, BoundaryCondition, BeamSection, Material
from .units import Quantity, Unit, UnitSystem


@dataclass
class RawData:
    beam_length_raw: Optional[str] = None
    beam_length_unit_raw: Optional[str] = None
    left_support_raw: Optional[str] = None
    right_support_raw: Optional[str] = None
    loads_raw: List[Dict[str, Any]] = field(default_factory=list)
    section_raw: Optional[Dict[str, Any]] = None
    material_raw: Optional[Dict[str, Any]] = None
    notes_raw: List[str] = field(default_factory=list)
    class_notes: List[str] = field(default_factory=list)
    source_files: Dict[str, str] = field(default_factory=dict)
    source_meta: Dict[str, Any] = field(default_factory=dict)
    import_timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "beam_length_raw": self.beam_length_raw,
            "beam_length_unit_raw": self.beam_length_unit_raw,
            "left_support_raw": self.left_support_raw,
            "right_support_raw": self.right_support_raw,
            "loads_raw": self.loads_raw,
            "section_raw": self.section_raw,
            "material_raw": self.material_raw,
            "notes_raw": self.notes_raw,
            "class_notes": self.class_notes,
            "source_files": self.source_files,
            "source_meta": self.source_meta,
            "import_timestamp": self.import_timestamp.isoformat(),
        }

    def save(self, filepath: str) -> None:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)


@dataclass
class ProcessedData:
    beam: Optional[Beam] = None
    unit_system: Optional[UnitSystem] = None
    validation_result: Optional[Any] = None
    calculation_result: Optional[Any] = None
    processing_timestamp: datetime = field(default_factory=datetime.now)
    raw_data_ref: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "beam": self._beam_to_dict(self.beam) if self.beam else None,
            "unit_system": {
                "length_unit": self.unit_system.length_unit.symbol,
                "force_unit": self.unit_system.force_unit.symbol,
                "moment_unit": self.unit_system.moment_unit.symbol,
                "pressure_unit": self.unit_system.pressure_unit.symbol,
                "distributed_load_unit": self.unit_system.distributed_load_unit.symbol,
            } if self.unit_system else None,
            "validation_result": str(self.validation_result) if self.validation_result else None,
            "calculation_result": self._calc_to_dict(self.calculation_result) if self.calculation_result else None,
            "processing_timestamp": self.processing_timestamp.isoformat(),
            "raw_data_ref": self.raw_data_ref,
        }

    def _beam_to_dict(self, beam: Beam) -> Dict[str, Any]:
        return {
            "name": beam.name,
            "length": str(beam.length),
            "left_support": beam.left_support.value,
            "right_support": beam.right_support.value,
            "loads": [self._load_to_dict(load) for load in beam.loads],
            "section": {
                "width": str(beam.section.width) if beam.section and beam.section.width else None,
                "height": str(beam.section.height) if beam.section and beam.section.height else None,
                "area": str(beam.section.area) if beam.section and beam.section.area else None,
                "moment_of_inertia": str(beam.section.moment_of_inertia) if beam.section and beam.section.moment_of_inertia else None,
                "section_modulus": str(beam.section.section_modulus) if beam.section and beam.section.section_modulus else None,
                "name": beam.section.name if beam.section else None,
            } if beam.section else None,
            "material": {
                "elastic_modulus": str(beam.material.elastic_modulus) if beam.material and beam.material.elastic_modulus else None,
                "poissons_ratio": beam.material.poissons_ratio if beam.material else None,
                "yield_strength": str(beam.material.yield_strength) if beam.material and beam.material.yield_strength else None,
                "name": beam.material.name if beam.material else None,
            } if beam.material else None,
            "notes": beam.notes,
            "source": beam.source,
        }

    def _load_to_dict(self, load: Load) -> Dict[str, Any]:
        return {
            "load_type": load.load_type.value,
            "magnitude": str(load.magnitude),
            "position": str(load.position) if load.position else None,
            "start_position": str(load.start_position) if load.start_position else None,
            "end_position": str(load.end_position) if load.end_position else None,
            "magnitude_end": str(load.magnitude_end) if load.magnitude_end else None,
            "direction": load.direction,
            "source": load.source,
        }

    def _calc_to_dict(self, calc_result: Any) -> Dict[str, Any]:
        if hasattr(calc_result, "to_dict"):
            return calc_result.to_dict()
        return {"summary": str(calc_result)}

    def save(self, filepath: str) -> None:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)


class DataImporter:
    def __init__(self, unit_system: Optional[UnitSystem] = None):
        self.unit_system = unit_system or UnitSystem.metric_engineering()
        self.raw_data = RawData()
        self.processed_data = ProcessedData(unit_system=self.unit_system)

    def import_beam_length(self, value: Union[str, float], unit: Optional[str] = None, source: Optional[str] = None) -> None:
        self.raw_data.beam_length_raw = str(value)
        self.raw_data.beam_length_unit_raw = unit
        if source:
            self.raw_data.source_files["beam_length"] = source

    def import_supports(self, left: str, right: str, source: Optional[str] = None) -> None:
        self.raw_data.left_support_raw = left
        self.raw_data.right_support_raw = right
        if source:
            self.raw_data.source_files["supports"] = source

    def import_load(self, load_data: Dict[str, Any], source: Optional[str] = None) -> None:
        load_copy = dict(load_data)
        if source:
            load_copy["_source"] = source
            self.raw_data.source_files[f"load_{len(self.raw_data.loads_raw)}"] = source
        self.raw_data.loads_raw.append(load_copy)

    def import_loads(self, loads_data: List[Dict[str, Any]], source: Optional[str] = None) -> None:
        for load_data in loads_data:
            self.import_load(load_data, source)

    def import_notes(self, notes: List[str], source: Optional[str] = None) -> None:
        self.raw_data.notes_raw.extend(notes)
        if source:
            self.raw_data.source_files["notes"] = source

    def import_class_notes(self, notes: List[str], source: Optional[str] = None) -> None:
        self.raw_data.class_notes.extend(notes)
        if source:
            self.raw_data.source_files["class_notes"] = source

    def import_section(self, section_data: Dict[str, Any], source: Optional[str] = None) -> None:
        self.raw_data.section_raw = dict(section_data)
        if source:
            self.raw_data.source_files["section"] = source

    def import_material(self, material_data: Dict[str, Any], source: Optional[str] = None) -> None:
        self.raw_data.material_raw = dict(material_data)
        if source:
            self.raw_data.source_files["material"] = source

    def import_json(self, filepath: str) -> None:
        path = Path(filepath)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "beam_length" in data:
            self.import_beam_length(
                data["beam_length"].get("value"),
                data["beam_length"].get("unit"),
                source=filepath,
            )
        if "supports" in data:
            self.import_supports(
                data["supports"].get("left", "pinned"),
                data["supports"].get("right", "roller"),
                source=filepath,
            )
        if "loads" in data:
            self.import_loads(data["loads"], source=filepath)
        if "notes" in data:
            self.import_notes(data["notes"], source=filepath)
        if "class_notes" in data:
            self.import_class_notes(data["class_notes"], source=filepath)
        if "section" in data:
            self.import_section(data["section"], source=filepath)
        if "material" in data:
            self.import_material(data["material"], source=filepath)

        self.raw_data.source_files["main"] = filepath

    def import_csv(self, filepath: str, data_type: str = "loads") -> None:
        path = Path(filepath)
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if data_type == "loads":
            loads_data = []
            for row in rows:
                load_data = {k.strip(): v.strip() for k, v in row.items() if v.strip()}
                if load_data:
                    loads_data.append(load_data)
            self.import_loads(loads_data, source=filepath)
        elif data_type == "notes":
            notes = [row.get("note", row.get("content", "")).strip() for row in rows if row]
            self.import_notes(notes, source=filepath)

        self.raw_data.source_files[f"csv_{data_type}"] = filepath

    def process(self) -> Beam:
        beam_length = self._parse_quantity(
            self.raw_data.beam_length_raw,
            self.raw_data.beam_length_unit_raw,
            Unit.M,
        )

        left_support = BoundaryCondition.from_string(self.raw_data.left_support_raw or "pinned")
        right_support = BoundaryCondition.from_string(self.raw_data.right_support_raw or "roller")

        beam = Beam(
            length=beam_length,
            left_support=left_support,
            right_support=right_support,
            notes=list(self.raw_data.notes_raw),
            source=self.raw_data.source_files.get("main"),
        )

        for load_raw in self.raw_data.loads_raw:
            load = self._parse_load(load_raw)
            beam.add_load(load)

        if self.raw_data.section_raw:
            beam.section = self._parse_section(self.raw_data.section_raw)

        if self.raw_data.material_raw:
            beam.material = self._parse_material(self.raw_data.material_raw)

        self.processed_data.beam = beam
        return beam

    def _parse_quantity(self, value_str: Optional[str], unit_str: Optional[str], default_unit: Unit) -> Quantity:
        if value_str is None:
            raise ValueError("数值不能为空")

        value = float(value_str)
        unit = default_unit
        if unit_str:
            unit = Unit.from_string(unit_str)
        return Quantity(value, unit)

    def _parse_load(self, load_raw: Dict[str, Any]) -> Load:
        load_type = LoadType.from_string(load_raw.get("type", load_raw.get("load_type", "concentrated_force")))

        magnitude = self._parse_quantity(
            load_raw.get("magnitude", load_raw.get("value")),
            load_raw.get("magnitude_unit", load_raw.get("unit")),
            Unit.N,
        )

        load = Load(
            load_type=load_type,
            magnitude=magnitude,
            direction=load_raw.get("direction", "downward"),
            source=load_raw.get("_source", load_raw.get("source")),
        )

        if load_type in [LoadType.CONCENTRATED_FORCE, LoadType.CONCENTRATED_MOMENT]:
            pos_val = load_raw.get("position", load_raw.get("location"))
            pos_unit = load_raw.get("position_unit", load_raw.get("location_unit"))
            if pos_val is not None:
                load.position = self._parse_quantity(str(pos_val), pos_unit, Unit.M)

        if load_type in [LoadType.UNIFORM_DISTRIBUTED,
                         LoadType.TRIANGULAR_DISTRIBUTED,
                         LoadType.TRAPEZOIDAL_DISTRIBUTED]:
            start_val = load_raw.get("start_position", load_raw.get("start"))
            start_unit = load_raw.get("start_unit")
            end_val = load_raw.get("end_position", load_raw.get("end"))
            end_unit = load_raw.get("end_unit")

            if start_val is not None:
                load.start_position = self._parse_quantity(str(start_val), start_unit, Unit.M)
            if end_val is not None:
                load.end_position = self._parse_quantity(str(end_val), end_unit, Unit.M)

        if load_type == LoadType.TRAPEZOIDAL_DISTRIBUTED:
            mag_end_val = load_raw.get("magnitude_end", load_raw.get("value_end"))
            mag_end_unit = load_raw.get("magnitude_end_unit")
            if mag_end_val is not None:
                load.magnitude_end = self._parse_quantity(str(mag_end_val), mag_end_unit, Unit.N_M)

        return load

    def _parse_section(self, section_raw: Dict[str, Any]) -> BeamSection:
        section = BeamSection(name=section_raw.get("name", "default"))

        if "width" in section_raw:
            section.width = self._parse_quantity(str(section_raw["width"]), section_raw.get("width_unit"), Unit.M)
        if "height" in section_raw:
            section.height = self._parse_quantity(str(section_raw["height"]), section_raw.get("height_unit"), Unit.M)
        if "area" in section_raw:
            section.area = self._parse_quantity(str(section_raw["area"]), section_raw.get("area_unit"), Unit.M)
        if "moment_of_inertia" in section_raw:
            section.moment_of_inertia = self._parse_quantity(
                str(section_raw["moment_of_inertia"]),
                section_raw.get("moment_of_inertia_unit"),
                Unit.M4,
            )
        if "section_modulus" in section_raw:
            section.section_modulus = self._parse_quantity(
                str(section_raw["section_modulus"]),
                section_raw.get("section_modulus_unit"),
                Unit.M3,
            )

        return section

    def _parse_material(self, material_raw: Dict[str, Any]) -> Material:
        material = Material(name=material_raw.get("name", "default"))

        if "elastic_modulus" in material_raw:
            material.elastic_modulus = self._parse_quantity(
                str(material_raw["elastic_modulus"]),
                material_raw.get("elastic_modulus_unit"),
                Unit.PA,
            )
        if "poissons_ratio" in material_raw:
            material.poissons_ratio = float(material_raw["poissons_ratio"])
        if "yield_strength" in material_raw:
            material.yield_strength = self._parse_quantity(
                str(material_raw["yield_strength"]),
                material_raw.get("yield_strength_unit"),
                Unit.PA,
            )

        return material

    def save_raw(self, filepath: str) -> None:
        self.raw_data.save(filepath)
        self.processed_data.raw_data_ref = filepath

    def save_processed(self, filepath: str) -> None:
        self.processed_data.save(filepath)
