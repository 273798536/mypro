from typing import List, Dict, Optional
import csv
import json
import os
from models import (
    Particle, Liquid, ExperimentRecord,
    SizeUnit, DensityUnit
)
from datetime import datetime


class DataLoader:
    @staticmethod
    def _parse_size_unit(raw_unit: str) -> Optional[SizeUnit]:
        return SizeUnit.from_string(raw_unit)

    @staticmethod
    def _parse_density_unit(raw_unit: str) -> Optional[DensityUnit]:
        return DensityUnit.from_string(raw_unit)

    @classmethod
    def load_from_csv(
        cls,
        particle_file: Optional[str] = None,
        liquid_file: Optional[str] = None,
        combined_file: Optional[str] = None
    ) -> List[ExperimentRecord]:
        records: List[ExperimentRecord] = []

        if combined_file:
            return cls._load_combined_csv(combined_file)

        if particle_file and liquid_file:
            particle_records = cls._load_particle_csv(particle_file)
            liquid_records = cls._load_liquid_csv(liquid_file)
            return cls._merge_particle_liquid(particle_records, liquid_records)

        return records

    @classmethod
    def _load_combined_csv(cls, file_path: str) -> List[ExperimentRecord]:
        records: List[ExperimentRecord] = []

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, 2):
                sample_id = row.get('sample_id', '').strip()
                if not sample_id:
                    continue

                raw_size_unit = row.get('diameter_unit', '').strip()
                size_unit = cls._parse_size_unit(raw_size_unit)

                raw_density_unit = row.get('density_unit', '').strip() or "kg/m³"
                density_unit = cls._parse_density_unit(raw_density_unit)

                raw_liquid_density_unit = row.get('liquid_density_unit', '').strip() or "kg/m³"
                liquid_density_unit = cls._parse_density_unit(raw_liquid_density_unit)

                try:
                    diameter = float(row.get('diameter', 0))
                except (ValueError, TypeError):
                    diameter = 0.0

                try:
                    particle_density = float(row.get('particle_density', 0))
                except (ValueError, TypeError):
                    particle_density = 2650.0

                try:
                    liquid_density = float(row.get('liquid_density', 998.2))
                except (ValueError, TypeError):
                    liquid_density = 998.2

                try:
                    viscosity = float(row.get('viscosity', 0))
                except (ValueError, TypeError):
                    viscosity = 0.0

                temperature = None
                temp_str = row.get('temperature', '').strip()
                if temp_str:
                    try:
                        temperature = float(temp_str)
                    except (ValueError, TypeError):
                        pass

                particle = Particle(
                    sample_id=sample_id,
                    diameter=diameter,
                    diameter_unit=size_unit,
                    raw_diameter_unit=raw_size_unit,
                    density=particle_density,
                    density_unit=density_unit,
                    source=row.get('source', ''),
                    metadata={
                        'original_row': dict(row)
                    }
                )

                liquid = Liquid(
                    sample_id=sample_id,
                    density=liquid_density,
                    density_unit=liquid_density_unit,
                    viscosity=viscosity,
                    temperature=temperature,
                    source=row.get('liquid_source', row.get('source', '')),
                    metadata={
                        'original_row': dict(row)
                    }
                )

                record = ExperimentRecord(
                    sample_id=sample_id,
                    particle=particle,
                    liquid=liquid,
                    raw_data=dict(row),
                    source_file=file_path,
                    line_number=line_num
                )
                records.append(record)

        return records

    @classmethod
    def _load_particle_csv(cls, file_path: str) -> List[ExperimentRecord]:
        records: List[ExperimentRecord] = []

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, 2):
                sample_id = row.get('sample_id', '').strip()
                if not sample_id:
                    continue

                raw_size_unit = row.get('diameter_unit', '').strip()
                size_unit = cls._parse_size_unit(raw_size_unit)

                raw_density_unit = row.get('density_unit', '').strip() or "kg/m³"
                density_unit = cls._parse_density_unit(raw_density_unit)

                try:
                    diameter = float(row.get('diameter', 0))
                except (ValueError, TypeError):
                    diameter = 0.0

                try:
                    particle_density = float(row.get('density', 2650.0))
                except (ValueError, TypeError):
                    particle_density = 2650.0

                temperature = None
                temp_str = row.get('temperature', '').strip()
                if temp_str:
                    try:
                        temperature = float(temp_str)
                    except (ValueError, TypeError):
                        pass

                liquid_density = None
                ld_str = row.get('liquid_density', '').strip()
                if ld_str:
                    try:
                        liquid_density = float(ld_str)
                    except (ValueError, TypeError):
                        pass

                particle = Particle(
                    sample_id=sample_id,
                    diameter=diameter,
                    diameter_unit=size_unit,
                    raw_diameter_unit=raw_size_unit,
                    density=particle_density,
                    density_unit=density_unit,
                    source=row.get('source', '颗粒维护组'),
                    metadata={
                        'temperature': temperature,
                        'liquid_density': liquid_density,
                        'original_row': dict(row)
                    }
                )

                record = ExperimentRecord(
                    sample_id=sample_id,
                    particle=particle,
                    raw_data=dict(row),
                    source_file=file_path,
                    line_number=line_num
                )
                records.append(record)

        return records

    @classmethod
    def _load_liquid_csv(cls, file_path: str) -> List[ExperimentRecord]:
        records: List[ExperimentRecord] = []

        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, 2):
                sample_id = row.get('sample_id', '').strip()
                if not sample_id:
                    continue

                raw_density_unit = row.get('density_unit', '').strip() or "kg/m³"
                density_unit = cls._parse_density_unit(raw_density_unit)

                try:
                    liquid_density = float(row.get('density', 998.2))
                except (ValueError, TypeError):
                    liquid_density = 998.2

                try:
                    viscosity = float(row.get('viscosity', 0))
                except (ValueError, TypeError):
                    viscosity = 0.0

                temperature = None
                temp_str = row.get('temperature', '').strip()
                if temp_str:
                    try:
                        temperature = float(temp_str)
                    except (ValueError, TypeError):
                        pass

                particle_density = None
                pd_str = row.get('particle_density', '').strip()
                if pd_str:
                    try:
                        particle_density = float(pd_str)
                    except (ValueError, TypeError):
                        pass

                liquid = Liquid(
                    sample_id=sample_id,
                    density=liquid_density,
                    density_unit=density_unit,
                    viscosity=viscosity,
                    temperature=temperature,
                    source=row.get('source', '液体维护组'),
                    metadata={
                        'particle_density': particle_density,
                        'original_row': dict(row)
                    }
                )

                record = ExperimentRecord(
                    sample_id=sample_id,
                    liquid=liquid,
                    raw_data=dict(row),
                    source_file=file_path,
                    line_number=line_num
                )
                records.append(record)

        return records

    @classmethod
    def _merge_particle_liquid(
        cls,
        particle_records: List[ExperimentRecord],
        liquid_records: List[ExperimentRecord]
    ) -> List[ExperimentRecord]:
        particle_map = {p.sample_id: p.particle for p in particle_records if p.particle}
        liquid_map = {l.sample_id: l.liquid for l in liquid_records if l.liquid}

        all_sample_ids = set(particle_map.keys()) | set(liquid_map.keys())

        merged_records: List[ExperimentRecord] = []
        for sample_id in all_sample_ids:
            particle = particle_map.get(sample_id)
            liquid = liquid_map.get(sample_id)

            particle_record = next(
                (p for p in particle_records if p.sample_id == sample_id),
                None
            )
            liquid_record = next(
                (l for l in liquid_records if l.sample_id == sample_id),
                None
            )

            source_file = ""
            line_number = 0
            raw_data = {}

            if particle_record:
                source_file = particle_record.source_file
                line_number = particle_record.line_number
                raw_data.update(particle_record.raw_data)
            if liquid_record:
                if not source_file:
                    source_file = liquid_record.source_file
                    line_number = liquid_record.line_number
                raw_data.update(liquid_record.raw_data)

            merged_record = ExperimentRecord(
                sample_id=sample_id,
                particle=particle,
                liquid=liquid,
                raw_data=raw_data,
                source_file=source_file,
                line_number=line_number
            )
            merged_records.append(merged_record)

        return merged_records

    @staticmethod
    def save_results_to_csv(
        results,
        output_path: str,
        include_metadata: bool = False
    ):
        from models import SedimentationResult

        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '样本编号', '沉降速度(m/s)', '沉降1米时间(s)',
                '沉降1米时间(分钟)', '雷诺数', '流态',
                '粒径(μm)', '颗粒密度(kg/m³)', '液体密度(kg/m³)',
                '温度(°C)', '备注'
            ])

            for r in results:
                if isinstance(r, SedimentationResult):
                    flow_state = "层流" if r.is_laminar else "紊流"
                    temp = r.temperature if r.temperature else 20.0
                    writer.writerow([
                        r.sample_id,
                        f"{r.velocity:.6e}",
                        f"{r.settling_time_1m:.2f}",
                        f"{r.settling_time_1m / 60:.2f}",
                        f"{r.reynolds_number:.4f}",
                        flow_state,
                        f"{r.particle_diameter_m * 1e6:.2f}",
                        f"{r.particle_density_kgm3:.2f}",
                        f"{r.liquid_density_kgm3:.2f}",
                        temp,
                        r.calculation_note
                    ])

    @staticmethod
    def save_anomalies_to_csv(anomalies, output_path: str):
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '样本编号', '异常类型', '严重程度',
                '技术信息', '人话解释',
                '源文件', '行号', '字段名', '原始值', '期望值'
            ])

            for a in anomalies:
                writer.writerow([
                    a.sample_id,
                    a.anomaly_type.value,
                    a.severity,
                    a.message,
                    a.human_readable_message,
                    a.source_file,
                    a.line_number,
                    a.field_name,
                    a.raw_value,
                    a.expected
                ])

    @staticmethod
    def save_conflicts_to_csv(conflicts, output_path: str):
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '样本编号', '冲突字段',
                '颗粒数据值', '颗粒来源',
                '液体数据值', '液体来源',
                '说明'
            ])

            for c in conflicts:
                writer.writerow([
                    c.sample_id,
                    c.field_name,
                    c.particle_value,
                    c.particle_source,
                    c.liquid_value,
                    c.liquid_source,
                    c.resolution_note
                ])
