from typing import List, Dict, Optional, Tuple
from models import Particle, Liquid, MergeConflict, ExperimentRecord
from unit_converter import UnitConverter


class ConflictDetector:
    def __init__(self, density_tolerance: float = 0.01):
        self.density_tolerance = density_tolerance
        self.conflicts: List[MergeConflict] = []

    def _compare_values(
        self,
        val1: Optional[float],
        val2: Optional[float],
        tolerance: float
    ) -> Tuple[bool, bool]:
        if val1 is None or val2 is None:
            return False, val1 is not None or val2 is not None

        diff = abs(val1 - val2)
        max_val = max(abs(val1), abs(val2), 1e-10)
        rel_diff = diff / max_val

        return rel_diff > tolerance, True

    def detect_conflicts(
        self,
        record: ExperimentRecord
    ) -> List[MergeConflict]:
        conflicts: List[MergeConflict] = []

        if record.particle is None or record.liquid is None:
            return conflicts

        particle = record.particle
        liquid = record.liquid

        if particle.density is not None and particle.density_unit is not None:
            try:
                particle_density_kgm3 = UnitConverter.density_to_kgm3(
                    particle.density, particle.density_unit
                )
                liquid_density_kgm3 = UnitConverter.density_to_kgm3(
                    liquid.density, liquid.density_unit
                )

                if particle_density_kgm3 <= liquid_density_kgm3:
                    has_conflict, has_both = self._compare_values(
                        particle_density_kgm3,
                        liquid_density_kgm3,
                        self.density_tolerance
                    )
                    if particle_density_kgm3 < liquid_density_kgm3:
                        conflicts.append(MergeConflict(
                            sample_id=record.sample_id,
                            field_name="density_relationship",
                            particle_value=particle_density_kgm3,
                            particle_source=particle.source or "颗粒数据",
                            liquid_value=liquid_density_kgm3,
                            liquid_source=liquid.source or "液体数据",
                            resolution_note=(
                                "颗粒密度小于液体密度，颗粒会上浮而不是沉降。"
                                "请核实哪组数据准确：颗粒密度应该大于液体密度才能沉降。"
                            )
                        ))
            except ValueError:
                pass

        if particle.density is not None and liquid.density is not None:
            if (particle.metadata.get('liquid_density') is not None or
                    liquid.metadata.get('particle_density') is not None):

                p_liq_density = particle.metadata.get('liquid_density')
                l_liq_density = liquid.density

                if p_liq_density is not None:
                    try:
                        p_liq_density_kgm3 = float(p_liq_density)
                        l_liq_density_kgm3 = UnitConverter.density_to_kgm3(
                            l_liq_density, liquid.density_unit
                        )

                        has_conflict, _ = self._compare_values(
                            p_liq_density_kgm3,
                            l_liq_density_kgm3,
                            self.density_tolerance
                        )

                        if has_conflict:
                            conflicts.append(MergeConflict(
                                sample_id=record.sample_id,
                                field_name="liquid_density",
                                particle_value=p_liq_density_kgm3,
                                particle_source=particle.source or "颗粒数据维护者",
                                liquid_value=l_liq_density_kgm3,
                                liquid_source=liquid.source or "液体数据维护者",
                                resolution_note=(
                                    f"液体密度有两个不同的值："
                                    f"颗粒数据里写的是{p_liq_density_kgm3:.2f} kg/m³，"
                                    f"液体数据里写的是{l_liq_density_kgm3:.2f} kg/m³。"
                                    f"请两位维护者确认哪个是对的，不要让系统自己选。"
                                )
                            ))
                    except (ValueError, TypeError):
                        pass

        if particle.metadata.get('temperature') is not None and liquid.temperature is not None:
            try:
                p_temp = float(particle.metadata.get('temperature'))
                l_temp = liquid.temperature

                has_conflict, _ = self._compare_values(p_temp, l_temp, 0.02)

                if has_conflict:
                    conflicts.append(MergeConflict(
                        sample_id=record.sample_id,
                        field_name="temperature",
                        particle_value=p_temp,
                        particle_source=particle.source or "颗粒数据维护者",
                        liquid_value=l_temp,
                        liquid_source=liquid.source or "液体数据维护者",
                        resolution_note=(
                            f"实验温度有两个不同的值："
                            f"颗粒数据里写的是{p_temp}°C，"
                            f"液体数据里写的是{l_temp}°C。"
                            f"请确认实际实验温度，温度会影响液体粘度，进而影响沉降速度。"
                        )
                    ))
            except (ValueError, TypeError):
                pass

        self.conflicts.extend(conflicts)
        return conflicts

    def get_all_conflicts(self) -> List[MergeConflict]:
        return list(self.conflicts)

    def reset(self):
        self.conflicts.clear()

    def summarize_conflicts(self) -> Dict:
        summary = {
            "total_conflicts": len(self.conflicts),
            "by_field": {},
            "by_sample": set()
        }

        for conflict in self.conflicts:
            field = conflict.field_name
            summary["by_field"][field] = summary["by_field"].get(field, 0) + 1
            summary["by_sample"].add(conflict.sample_id)

        summary["affected_samples"] = len(summary["by_sample"])
        del summary["by_sample"]

        return summary
