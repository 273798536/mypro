from __future__ import annotations

from datetime import datetime, date, time, timedelta
from typing import Dict

from ..models.schemas import (
    ComponentPosition,
    ShadowPeriod,
    StringTopology,
    HistoricalGeneration,
    WeatherData,
    LossReport,
    ShadowLossRequest,
    DataSource,
    ShadowType,
)


def _build_component(cid: str, string_id: str, row: int, col: int,
                     rated_power: float = 550.0) -> ComponentPosition:
    return ComponentPosition(
        component_id=cid,
        string_id=string_id,
        latitude=30.5833,
        longitude=114.3333,
        elevation=30.0,
        tilt_angle=25.0,
        azimuth=180.0,
        rated_power=rated_power,
        row=row,
        column=col,
        data_source=DataSource(
            name=f"site_survey_{cid}",
            type="manual",
            timestamp=datetime.now(),
            confidence=0.9,
            raw_value=None,
        ),
    )


def _build_shadow(sid: str, cid: str, shadow_type: ShadowType,
                  start_hour: int, end_hour: int, intensity: float,
                  description: str = "") -> ShadowPeriod:
    base_date = date.today() - timedelta(days=1)
    return ShadowPeriod(
        shadow_id=sid,
        component_id=cid,
        shadow_type=shadow_type,
        start_time=datetime.combine(base_date, time(start_hour, 0)),
        end_time=datetime.combine(base_date, time(end_hour, 0)),
        intensity=intensity,
        source_description=description,
        data_source=DataSource(
            name=f"shadow_log_{sid}",
            type="sensor",
            timestamp=datetime.now(),
            confidence=0.85,
            raw_value=f"irradiance_drop={intensity}",
        ),
    )


def _build_topo(string_id: str, inverter_id: str,
                comp_ids: list[str], bypass: int = 1) -> StringTopology:
    return StringTopology(
        string_id=string_id,
        inverter_id=inverter_id,
        component_ids=comp_ids,
        bypass_count=bypass,
        rated_voltage=600.0,
        data_source=DataSource(
            name=f"topo_{string_id}",
            type="manual",
            timestamp=datetime.now(),
            confidence=0.95,
        ),
    )


def _build_history(cid: str, d: date, actual: float,
                   expected: float, irradiance: float,
                   temp: float = 25.0) -> HistoricalGeneration:
    return HistoricalGeneration(
        component_id=cid,
        date=d,
        actual_energy=actual,
        expected_energy=expected,
        irradiance=irradiance,
        temperature=temp,
        data_source=DataSource(
            name=f"meter_{cid}",
            type="sensor",
            timestamp=datetime.now(),
            confidence=0.92,
        ),
    )


def _build_weather(d: date, cloud_cover: float, irradiance: float,
                   temp: float, wind: float = 2.0,
                   precip: float = 0.0) -> WeatherData:
    return WeatherData(
        date=d,
        latitude=30.5833,
        longitude=114.3333,
        cloud_cover=cloud_cover,
        solar_irradiance=irradiance,
        temperature=temp,
        wind_speed=wind,
        precipitation=precip,
        data_source=DataSource(
            name="weather_api",
            type="weather_api",
            timestamp=datetime.now(),
            confidence=0.88,
        ),
    )


def _build_loss(rid: str, cid: str, d: date, loss_pct: float,
                reason: str, severity: str = "medium") -> LossReport:
    return LossReport(
        report_id=rid,
        component_id=cid,
        report_date=d,
        reported_loss_pct=loss_pct,
        loss_reason=reason,
        severity=severity,
        data_source=DataSource(
            name=f"inspection_{rid}",
            type="manual",
            timestamp=datetime.now(),
            confidence=0.9,
        ),
    )


def _normal_sample() -> ShadowLossRequest:
    base = date.today() - timedelta(days=1)
    comps = [
        _build_component("C_A1", "STR_1", 0, 0),
        _build_component("C_A2", "STR_1", 0, 1),
        _build_component("C_A3", "STR_1", 0, 2),
        _build_component("C_B1", "STR_2", 1, 0),
        _build_component("C_B2", "STR_2", 1, 1),
        _build_component("C_B3", "STR_2", 1, 2),
    ]

    shadows = [
        _build_shadow("SH_001", "C_A1", ShadowType.TREE, 8, 10, 0.45,
                      "东侧梧桐树遮挡上午时段"),
        _build_shadow("SH_002", "C_A2", ShadowType.TREE, 8, 10, 0.30,
                      "东侧梧桐树遮挡上午时段"),
        _build_shadow("SH_003", "C_B1", ShadowType.BUILDING, 16, 18, 0.35,
                      "西侧配电房遮挡傍晚时段"),
    ]

    topo = [
        _build_topo("STR_1", "INV_1", ["C_A1", "C_A2", "C_A3"], bypass=1),
        _build_topo("STR_2", "INV_1", ["C_B1", "C_B2", "C_B3"], bypass=1),
    ]

    history = [
        _build_history("C_A1", base, 3.2, 4.5, 5.2, 26.0),
        _build_history("C_A2", base, 3.6, 4.5, 5.2, 26.0),
        _build_history("C_A3", base, 4.3, 4.5, 5.2, 26.0),
        _build_history("C_B1", base, 3.4, 4.4, 5.1, 28.0),
        _build_history("C_B2", base, 4.1, 4.4, 5.1, 28.0),
        _build_history("C_B3", base, 4.2, 4.4, 5.1, 28.0),
    ]

    weather = [
        _build_weather(base, 0.15, 820.0, 26.5, 2.5, 0.0),
    ]

    loss_reports = [
        _build_loss("LR_001", "C_A1", base, 0.28,
                    "巡检发现树影遮挡，已记录", "high"),
    ]

    return ShadowLossRequest(
        request_id="REQ_NORMAL_001",
        station_id="STATION_DEMO_01",
        calculation_date=date.today(),
        components=comps,
        shadow_periods=shadows,
        string_topology=topo,
        historical_generations=history,
        weather_data=weather,
        loss_reports=loss_reports,
        trace_enabled=True,
    )


def _edge_sample() -> ShadowLossRequest:
    base = date.today() - timedelta(days=1)
    comps = [
        _build_component("C_A1", "STR_1", 0, 0),
        _build_component("C_A2", "STR_1", 0, 1),
        _build_component("C_A3", "STR_1", 0, 2),
        _build_component("C_B1", "STR_2", 1, 0),
        _build_component("C_B2", "STR_2", 1, 1),
        _build_component("C_B3", "STR_2", 1, 2),
        _build_component("C_C1", "STR_3", 2, 0),
        _build_component("C_C2", "STR_3", 2, 1),
    ]

    shadows = [
        _build_shadow("SH_EDGE_001", "C_A1", ShadowType.TREE, 6, 20, 0.6,
                      "持续性大面积遮挡，时段异常长"),
        _build_shadow("SH_EDGE_002", "C_B1", ShadowType.BUILDING, 2, 5, 0.5,
                      "凌晨时段阴影，疑似跨日或录入错误"),
        _build_shadow("SH_EDGE_003", "C_C1", ShadowType.CLOUD, 10, 12, 0.7,
                      "云层遮挡，非固定性阴影"),
        _build_shadow("SH_EDGE_004", "C_C2", ShadowType.TREE, 9, 11, 0.02,
                      "阴影强度极低，几乎无影响"),
    ]

    topo = [
        _build_topo("STR_1", "INV_1", ["C_A1", "C_A2", "C_A3"], bypass=0),
        _build_topo("STR_2", "INV_1", ["C_B1", "C_B2", "C_B3"], bypass=1),
        _build_topo("STR_3", "INV_2", ["C_C1", "C_C2"], bypass=0),
    ]

    history = [
        _build_history("C_A1", base, 1.5, 4.5, 5.0, 30.0),
        _build_history("C_A2", base, 1.8, 4.5, 5.0, 30.0),
        _build_history("C_A3", base, 2.0, 4.5, 5.0, 30.0),
        _build_history("C_B1", base, 4.0, 4.4, 5.0, 22.0),
        _build_history("C_B2", base, 4.1, 4.4, 5.0, 22.0),
        _build_history("C_B3", base, 4.2, 4.4, 5.0, 22.0),
        _build_history("C_C1", base, 3.8, 4.3, 5.0, 28.0),
        _build_history("C_C2", base, 4.1, 4.3, 5.0, 28.0),
    ]

    weather = [
        _build_weather(base, 0.65, 450.0, 32.0, 5.0, 0.5),
    ]

    loss_reports = [
        _build_loss("LR_EDGE_001", "C_A1", base, 0.55,
                    "树影严重遮挡，建议紧急修剪", "critical"),
        _build_loss("LR_EDGE_002", "C_B1", base, 0.10,
                    "建筑遮挡轻微，影响有限", "low"),
    ]

    return ShadowLossRequest(
        request_id="REQ_EDGE_001",
        station_id="STATION_DEMO_01",
        calculation_date=date.today(),
        components=comps,
        shadow_periods=shadows,
        string_topology=topo,
        historical_generations=history,
        weather_data=weather,
        loss_reports=loss_reports,
        trace_enabled=True,
    )


def _bad_data_sample() -> ShadowLossRequest:
    base = date.today() - timedelta(days=1)

    comps = [
        _build_component("C_BAD_1", "STR_1", 0, 0),
        _build_component("C_BAD_2", "STR_1", 0, 1, rated_power=550.0),
        _build_component("C_DUP", "STR_1", 0, 2),
        _build_component("C_DUP", "STR_1", 0, 3),
        _build_component("C_NO_STR", "STR_NOT_EXIST", 1, 0),
    ]

    shadows = [
        ShadowPeriod(
            shadow_id="SH_BAD_001",
            component_id="C_NOT_EXIST",
            shadow_type=ShadowType.TREE,
            start_time=datetime.combine(base, time(10, 0)),
            end_time=datetime.combine(base, time(12, 0)),
            intensity=0.5,
            source_description="引用了不存在的组件",
            data_source=DataSource(
                name="shadow_log_SH_BAD_001",
                type="sensor",
                timestamp=datetime.now(),
                confidence=0.85,
                raw_value="irradiance_drop=0.5",
            ),
        ),
        ShadowPeriod(
            shadow_id="SH_BAD_002",
            component_id="C_BAD_1",
            shadow_type=ShadowType.TREE,
            start_time=datetime.combine(base, time(0, 0)),
            end_time=datetime.combine(base + timedelta(days=1), time(0, 0)),
            intensity=0.5,
            source_description="跨日24小时阴影",
            data_source=DataSource(
                name="shadow_log_SH_BAD_002",
                type="sensor",
                timestamp=datetime.now(),
                confidence=0.85,
                raw_value="irradiance_drop=0.5",
            ),
        ),
    ]

    topo = [
        _build_topo("STR_1", "INV_1", ["C_BAD_1", "C_BAD_2", "C_DUP"], bypass=2),
        StringTopology(
            string_id="STR_1",
            inverter_id="INV_2",
            component_ids=["C_BAD_3"],
            bypass_count=0,
            rated_voltage=600.0,
            data_source=DataSource(
                name="topo_STR_1_dup",
                type="manual",
                timestamp=datetime.now(),
                confidence=0.8,
            ),
        ),
        StringTopology(
            string_id="STR_EMPTY",
            inverter_id="INV_1",
            component_ids=["C_NOT_EXIST_4"],
            bypass_count=0,
            rated_voltage=600.0,
            data_source=DataSource(
                name="topo_STR_EMPTY",
                type="manual",
                timestamp=datetime.now(),
                confidence=0.8,
            ),
        ),
    ]

    history = [
        _build_history("C_BAD_1", base, 0.01, 4.5, 5.0, 25.0),
        _build_history("C_BAD_2", base, 12.0, 4.5, 5.0, 45.0),
        _build_history("C_NOT_EXIST2", base, 3.0, 4.5, 5.0, 25.0),
    ]

    weather = [
        _build_weather(base, 0.95, 1400.0, 45.0, 45.0, 20.0),
    ]

    loss_reports = [
        _build_loss("LR_BAD_001", "C_NOT_EXIST3", base, 0.8, "引用不存在的组件", "high"),
    ]

    return ShadowLossRequest(
        request_id="REQ_BAD_001",
        station_id="STATION_DEMO_01",
        calculation_date=date.today(),
        components=comps,
        shadow_periods=shadows,
        string_topology=topo,
        historical_generations=history,
        weather_data=weather,
        loss_reports=loss_reports,
        trace_enabled=True,
    )


SAMPLES: Dict[str, callable] = {
    "normal": _normal_sample,
    "edge": _edge_sample,
    "bad": _bad_data_sample,
}


def get_sample_request(sample_type: str) -> ShadowLossRequest:
    if sample_type not in SAMPLES:
        available = ", ".join(SAMPLES.keys())
        raise ValueError(f"未知样例类型: {sample_type}，可选: {available}")
    return SAMPLES[sample_type]()
