from app.models import TemperatureUnit


def parse_temperature_unit(raw_value: str) -> TemperatureUnit:
    if not raw_value:
        return TemperatureUnit.UNKNOWN

    value = str(raw_value).strip().lower()

    if "°c" in value or "℃" in value or value.endswith("c"):
        return TemperatureUnit.CELSIUS
    if "°f" in value or "℉" in value or value.endswith("f"):
        return TemperatureUnit.FAHRENHEIT
    if "k" in value and "°" not in value and "c" not in value and "f" not in value:
        return TemperatureUnit.KELVIN

    if "摄氏" in value or "度" in value:
        return TemperatureUnit.CELSIUS
    if "华氏" in value:
        return TemperatureUnit.FAHRENHEIT

    return TemperatureUnit.UNKNOWN


def extract_temperature_value(raw_value: str) -> float:
    if raw_value is None:
        return None

    value_str = str(raw_value).strip()
    if not value_str:
        return None

    cleaned = ""
    for ch in value_str:
        if ch.isdigit() or ch in ".-":
            cleaned += ch
        elif ch in "°℃℉CFK ,，":
            break

    if cleaned:
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    return None


def to_celsius(value: float, unit: TemperatureUnit) -> float:
    if value is None:
        return None
    if unit == TemperatureUnit.CELSIUS:
        return value
    if unit == TemperatureUnit.FAHRENHEIT:
        return (value - 32) * 5.0 / 9.0
    if unit == TemperatureUnit.KELVIN:
        return value - 273.15
    return value


def celsius_to_fahrenheit(celsius: float) -> float:
    return celsius * 9.0 / 5.0 + 32


def celsius_to_kelvin(celsius: float) -> float:
    return celsius + 273.15


def detect_temperature_anomaly(temperature_value: float, unit: TemperatureUnit,
                                prev_value: float = None, next_value: float = None) -> list:
    issues = []
    if temperature_value is None:
        return issues

    celsius_val = to_celsius(temperature_value, unit)

    if celsius_val is not None:
        if celsius_val < -50 or celsius_val > 1500:
            issues.append(f"温度数值异常: {temperature_value}{unit.value if unit else ''} (超出催化反应常规范围-50°C~1500°C)")

        if prev_value is not None:
            prev_celsius = to_celsius(prev_value, unit)
            if prev_celsius and abs(celsius_val - prev_celsius) > 200:
                issues.append(f"温度突变: 与前一点相差超过200°C (前值约{prev_celsius:.1f}°C, 当前约{celsius_val:.1f}°C)")

        if next_value is not None:
            next_celsius = to_celsius(next_value, unit)
            if next_celsius and abs(celsius_val - next_celsius) > 200:
                issues.append(f"温度突变: 与后一点相差超过200°C (当前约{celsius_val:.1f}°C, 后值约{next_celsius:.1f}°C)")

    return issues
