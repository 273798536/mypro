from typing import Dict, List, Optional, Any, Tuple
from .unit_converter import UnitConverter


class ValidationError:
    def __init__(self, field: str, error_type: str, message: str):
        self.field = field
        self.error_type = error_type
        self.message = message

    def to_dict(self) -> Dict[str, str]:
        return {
            "field": self.field,
            "error_type": self.error_type,
            "message": self.message,
        }


class DataValidator:
    REQUIRED_FIELDS = [
        "sample_id",
        "mass",
        "mass_unit",
        "volume",
        "volume_unit",
        "liquid_density",
        "liquid_density_unit",
        "observed_state",
    ]

    VALID_STATES = ["漂浮", "悬浮", "下沉", "上浮", "漂浮/悬浮", "下沉/悬浮"]

    @classmethod
    def validate_record(cls, record: Dict[str, Any]) -> Tuple[bool, List[ValidationError]]:
        errors = []

        for field in cls.REQUIRED_FIELDS:
            if field not in record or record[field] is None or str(record[field]).strip() == "":
                if field in ["volume", "volume_unit"]:
                    errors.append(ValidationError(
                        field=field,
                        error_type="MISSING_VOLUME",
                        message=f"体积数据缺失: {field} 为空或未提供"
                    ))
                else:
                    errors.append(ValidationError(
                        field=field,
                        error_type="MISSING_FIELD",
                        message=f"必填字段缺失: {field}"
                    ))

        if errors:
            return False, errors

        try:
            mass = float(record["mass"])
            if mass <= 0:
                errors.append(ValidationError(
                    field="mass",
                    error_type="INVALID_VALUE",
                    message=f"质量必须为正数，当前值: {mass}"
                ))
        except (ValueError, TypeError):
            errors.append(ValidationError(
                field="mass",
                error_type="INVALID_FORMAT",
                message=f"质量格式错误，无法转换为数字: {record['mass']}"
            ))

        if not UnitConverter.is_valid_mass_unit(record["mass_unit"]):
            errors.append(ValidationError(
                field="mass_unit",
                error_type="INVALID_UNIT",
                message=f"无效的质量单位: {record['mass_unit']}，支持的单位: {UnitConverter.get_available_mass_units()}"
            ))

        try:
            volume = float(record["volume"])
            if volume <= 0:
                errors.append(ValidationError(
                    field="volume",
                    error_type="INVALID_VALUE",
                    message=f"体积必须为正数，当前值: {volume}"
                ))
        except (ValueError, TypeError):
            errors.append(ValidationError(
                field="volume",
                error_type="INVALID_FORMAT",
                message=f"体积格式错误，无法转换为数字: {record['volume']}"
            ))

        if not UnitConverter.is_valid_volume_unit(record["volume_unit"]):
            errors.append(ValidationError(
                field="volume_unit",
                error_type="INVALID_UNIT",
                message=f"无效的体积单位: {record['volume_unit']}，支持的单位: {UnitConverter.get_available_volume_units()}"
            ))

        try:
            liquid_density = float(record["liquid_density"])
            if liquid_density <= 0:
                errors.append(ValidationError(
                    field="liquid_density",
                    error_type="INVALID_VALUE",
                    message=f"液体密度必须为正数，当前值: {liquid_density}"
                ))
        except (ValueError, TypeError):
            errors.append(ValidationError(
                field="liquid_density",
                error_type="INVALID_FORMAT",
                message=f"液体密度格式错误，无法转换为数字: {record['liquid_density']}"
            ))

        if not UnitConverter.is_valid_density_unit(record["liquid_density_unit"]):
            errors.append(ValidationError(
                field="liquid_density_unit",
                error_type="INVALID_UNIT",
                message=f"无效的密度单位: {record['liquid_density_unit']}，支持的单位: {UnitConverter.get_available_density_units()}"
            ))

        observed = str(record["observed_state"]).strip()
        if observed not in cls.VALID_STATES:
            errors.append(ValidationError(
                field="observed_state",
                error_type="INVALID_STATE",
                message=f"无效的浮沉状态: {observed}，支持的状态: {cls.VALID_STATES}"
            ))

        return len(errors) == 0, errors

    @classmethod
    def validate_batch(cls, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        valid_records = []
        invalid_records = []

        for idx, record in enumerate(records):
            record_with_meta = {
                **record,
                "_row_index": idx,
            }
            is_valid, errors = cls.validate_record(record)
            if is_valid:
                valid_records.append(record_with_meta)
            else:
                invalid_records.append({
                    **record_with_meta,
                    "_validation_errors": [e.to_dict() for e in errors],
                })

        return valid_records, invalid_records
