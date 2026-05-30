from typing import List, Optional, Set, Tuple
from models import (
    ExperimentRecord, Particle, Liquid, AnomalyRecord, AnomalyType,
    SizeUnit, DensityUnit
)
from unit_converter import UnitConverter


class DataValidator:
    def __init__(self):
        self.seen_sample_ids: Set[str] = set()
        self.duplicate_locations: dict = {}

    def _create_anomaly(
        self,
        sample_id: str,
        anomaly_type: AnomalyType,
        severity: str,
        message: str,
        human_readable_message: str,
        source_file: str = "",
        line_number: int = 0,
        field_name: str = "",
        raw_value: str = "",
        expected: str = ""
    ) -> AnomalyRecord:
        if source_file and line_number > 0:
            location_note = f"（记录位置：{source_file} 第{line_number}行）"
            human_readable_message = human_readable_message + location_note

        return AnomalyRecord(
            sample_id=sample_id,
            anomaly_type=anomaly_type,
            severity=severity,
            message=message,
            human_readable_message=human_readable_message,
            source_file=source_file,
            line_number=line_number,
            field_name=field_name,
            raw_value=raw_value,
            expected=expected
        )

    def _validate_particle(
        self,
        particle: Optional[Particle],
        record: ExperimentRecord
    ) -> List[AnomalyRecord]:
        anomalies: List[AnomalyRecord] = []

        if particle is None:
            anomalies.append(self._create_anomaly(
                sample_id=record.sample_id,
                anomaly_type=AnomalyType.MISSING_SIZE_UNIT,
                severity="critical",
                message="Particle data is missing",
                human_readable_message=f"样本【{record.sample_id}】缺少颗粒数据，无法进行沉降计算。",
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="particle"
            ))
            return anomalies

        if particle.raw_diameter_unit == "" or particle.diameter_unit is None:
            anomalies.append(self._create_anomaly(
                sample_id=particle.sample_id,
                anomaly_type=AnomalyType.MISSING_SIZE_UNIT,
                severity="critical",
                message="Size unit is missing",
                human_readable_message=(
                    f"样本【{particle.sample_id}】的粒径单位漏掉了。"
                    f"当前只写了数字{particle.diameter}，但没说是毫米、微米还是纳米。"
                    f"打个比方：1000微米=1毫米，差了1000倍，算出来的沉降速度会差100万倍。"
                    f"请补上单位（如：μm、mm、nm）。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="diameter_unit",
                raw_value=str(particle.raw_diameter_unit),
                expected="mm / μm / nm / m 其中之一"
            ))

        elif particle.diameter_unit is None:
            anomalies.append(self._create_anomaly(
                sample_id=particle.sample_id,
                anomaly_type=AnomalyType.INVALID_SIZE_UNIT,
                severity="critical",
                message=f"Invalid size unit: {particle.raw_diameter_unit}",
                human_readable_message=(
                    f"样本【{particle.sample_id}】的粒径单位写错了：'{particle.raw_diameter_unit}'。"
                    f"系统不认这个单位哦。正确的单位有：μm（微米）、mm（毫米）、nm（纳米）、m（米）。"
                    f"常见的坑：写了'um'而不是'μm'（希腊字母缪，不是英文字母u）。"
                    f"这个坑一旦踩了，后面所有计算都要返工。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="diameter_unit",
                raw_value=particle.raw_diameter_unit,
                expected="mm / μm / nm / m 其中之一"
            ))

        if particle.diameter < 0:
            anomalies.append(self._create_anomaly(
                sample_id=particle.sample_id,
                anomaly_type=AnomalyType.NEGATIVE_VALUE,
                severity="critical",
                message=f"Negative diameter: {particle.diameter}",
                human_readable_message=(
                    f"样本【{particle.sample_id}】的粒径是负数{particle.diameter}。"
                    f"现实中不存在负的粒径大小，请检查是否多打了负号。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="diameter",
                raw_value=str(particle.diameter)
            ))

        if particle.diameter_unit is not None:
            try:
                diameter_m = UnitConverter.diameter_to_meters(
                    particle.diameter, particle.diameter_unit
                )
                diameter_um = diameter_m * 1e6

                if diameter_um < 0.001 or diameter_um > 10000:
                    anomalies.append(self._create_anomaly(
                        sample_id=particle.sample_id,
                        anomaly_type=AnomalyType.SIZE_OUT_OF_MODEL_RANGE,
                        severity="warning",
                        message=f"Size {diameter_um}μm out of typical model range",
                        human_readable_message=(
                            f"样本【{particle.sample_id}】的粒径换算后是{diameter_um:.2f}微米。"
                            f"这个值超出了Stokes模型通常适用的范围（0.1~1000微米）。"
                            f"太小可能出现布朗运动干扰，太大则进入紊流区。"
                            f"计算结果会标记为边界值，请谨慎使用。"
                        ),
                        source_file=record.source_file,
                        line_number=record.line_number,
                        field_name="diameter"
                    ))
            except ValueError:
                pass

        return anomalies

    def _validate_liquid(
        self,
        liquid: Optional[Liquid],
        record: ExperimentRecord
    ) -> List[AnomalyRecord]:
        anomalies: List[AnomalyRecord] = []

        if liquid is None:
            anomalies.append(self._create_anomaly(
                sample_id=record.sample_id,
                anomaly_type=AnomalyType.MISSING_TEMPERATURE,
                severity="warning",
                message="Liquid data is missing",
                human_readable_message=f"样本【{record.sample_id}】缺少液体数据，无法进行沉降计算。",
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="liquid"
            ))
            return anomalies

        if liquid.temperature is None:
            anomalies.append(self._create_anomaly(
                sample_id=liquid.sample_id,
                anomaly_type=AnomalyType.MISSING_TEMPERATURE,
                severity="warning",
                message="Temperature is missing, using default 20°C viscosity",
                human_readable_message=(
                    f"样本【{liquid.sample_id}】的实验温度没填。"
                    f"系统会默认用20°C的水粘度（1.002 mPa·s）来计算。"
                    f"如果实际温度不是20°C，沉降速度可能有偏差。"
                    f"建议补上实验温度。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="temperature"
            ))

        if liquid.density < 0:
            anomalies.append(self._create_anomaly(
                sample_id=liquid.sample_id,
                anomaly_type=AnomalyType.NEGATIVE_VALUE,
                severity="critical",
                message=f"Negative liquid density: {liquid.density}",
                human_readable_message=(
                    f"样本【{liquid.sample_id}】的液体密度是负数{liquid.density}。"
                    f"现实中不存在负的密度，请检查是否多打了负号。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="liquid_density",
                raw_value=str(liquid.density)
            ))

        if liquid.viscosity < 0:
            anomalies.append(self._create_anomaly(
                sample_id=liquid.sample_id,
                anomaly_type=AnomalyType.NEGATIVE_VALUE,
                severity="critical",
                message=f"Negative viscosity: {liquid.viscosity}",
                human_readable_message=(
                    f"样本【{liquid.sample_id}】的液体粘度是负数{liquid.viscosity}。"
                    f"粘度不可能为负，请检查数据。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="viscosity",
                raw_value=str(liquid.viscosity)
            ))

        return anomalies

    def _check_duplicate(
        self,
        record: ExperimentRecord
    ) -> List[AnomalyRecord]:
        anomalies: List[AnomalyRecord] = []
        sample_id = record.sample_id

        if sample_id in self.seen_sample_ids:
            prev_loc = self.duplicate_locations.get(sample_id, "")
            curr_loc = f"{record.source_file} 第{record.line_number}行" if record.source_file else "当前位置"

            anomalies.append(self._create_anomaly(
                sample_id=sample_id,
                anomaly_type=AnomalyType.DUPLICATE_SAMPLE,
                severity="warning",
                message=f"Duplicate sample ID: {sample_id}",
                human_readable_message=(
                    f"样本编号【{sample_id}】重复了。"
                    f"第一次出现在：{prev_loc}"
                    f"这次又出现在：{curr_loc}"
                    f"请确认是同一个样本重复测试（正常），还是样本编号写错了（需要修正）。"
                ),
                source_file=record.source_file,
                line_number=record.line_number,
                field_name="sample_id",
                raw_value=sample_id,
                expected="唯一的样本编号"
            ))
        else:
            self.seen_sample_ids.add(sample_id)
            loc = f"{record.source_file} 第{record.line_number}行" if record.source_file else "未知位置"
            self.duplicate_locations[sample_id] = loc

        return anomalies

    def validate(
        self,
        record: ExperimentRecord,
        check_duplicate: bool = True
    ) -> Tuple[List[AnomalyRecord], bool]:
        anomalies: List[AnomalyRecord] = []

        if check_duplicate:
            anomalies.extend(self._check_duplicate(record))

        anomalies.extend(self._validate_particle(record.particle, record))
        anomalies.extend(self._validate_liquid(record.liquid, record))

        has_critical = any(a.severity == "critical" for a in anomalies)

        return anomalies, has_critical

    def validate_particle_only(
        self,
        particle: Particle,
        source_file: str = "",
        line_number: int = 0
    ) -> List[AnomalyRecord]:
        dummy_record = ExperimentRecord(
            sample_id=particle.sample_id,
            particle=particle,
            source_file=source_file,
            line_number=line_number
        )
        return self._validate_particle(particle, dummy_record)

    def validate_liquid_only(
        self,
        liquid: Liquid,
        source_file: str = "",
        line_number: int = 0
    ) -> List[AnomalyRecord]:
        dummy_record = ExperimentRecord(
            sample_id=liquid.sample_id,
            liquid=liquid,
            source_file=source_file,
            line_number=line_number
        )
        return self._validate_liquid(liquid, dummy_record)

    def reset(self):
        self.seen_sample_ids.clear()
        self.duplicate_locations.clear()
