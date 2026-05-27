from datetime import date as dt_date, datetime, time
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class DataSource(BaseModel):
    name: str = Field(..., description="数据源名称")
    type: str = Field(..., description="数据来源类型：sensor/simulation/manual/weather_api")
    timestamp: datetime = Field(..., description="数据采集时间戳")
    confidence: float = Field(..., ge=0.0, le=1.0, description="数据置信度")
    raw_value: Optional[str] = Field(None, description="原始值记录")


class CorrectionTrace(BaseModel):
    field: str = Field(..., description="被修正的字段名")
    original_value: Any = Field(..., description="原始值")
    corrected_value: Any = Field(..., description="修正后的值")
    reason: str = Field(..., description="修正原因")
    corrected_by: str = Field(..., description="修正来源：auto/user/system")
    corrected_at: datetime = Field(default_factory=datetime.now, description="修正时间")


class ValidationResult(BaseModel):
    passed: bool = Field(..., description="校验是否通过")
    field: str = Field(..., description="校验的字段")
    message: str = Field(..., description="校验信息")
    severity: str = Field(..., description="严重级别：info/warning/error")
    suggestion: Optional[str] = Field(None, description="修复建议")


class ShadowType(str, Enum):
    TREE = "tree"
    BUILDING = "building"
    CLOUD = "cloud"
    OTHER = "other"


class ComponentPosition(BaseModel):
    component_id: str = Field(..., description="组件唯一标识")
    string_id: str = Field(..., description="所属组串ID")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="纬度")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="经度")
    elevation: float = Field(0.0, ge=-500.0, le=9000.0, description="海拔高度(m)")
    tilt_angle: float = Field(0.0, ge=0.0, le=90.0, description="倾斜角度(度)")
    azimuth: float = Field(180.0, ge=0.0, le=360.0, description="方位角(度)")
    rated_power: float = Field(..., gt=0, description="额定功率(W)")
    row: int = Field(..., ge=0, description="组件所在行号")
    column: int = Field(..., ge=0, description="组件所在列号")
    data_source: DataSource


class ShadowPeriod(BaseModel):
    shadow_id: str = Field(..., description="阴影唯一标识")
    component_id: str = Field(..., description="受影响的组件ID")
    shadow_type: ShadowType = Field(..., description="阴影类型")
    start_time: datetime = Field(..., description="阴影开始时间")
    end_time: datetime = Field(..., description="阴影结束时间")
    intensity: float = Field(..., ge=0.0, le=1.0, description="阴影强度系数")
    source_description: str = Field("", description="阴影来源描述")
    data_source: DataSource

    @field_validator("end_time")
    @classmethod
    def end_time_after_start(cls, v, info):
        if v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class StringTopology(BaseModel):
    string_id: str = Field(..., description="组串唯一标识")
    inverter_id: str = Field(..., description="所属逆变器ID")
    component_ids: List[str] = Field(..., min_length=1, description="组串内组件ID列表")
    bypass_count: int = Field(0, ge=0, description="旁路二极管数量")
    rated_voltage: float = Field(..., gt=0, description="组串额定电压(V)")
    data_source: DataSource


class HistoricalGeneration(BaseModel):
    component_id: str = Field(..., description="组件ID")
    date: dt_date = Field(..., description="发电日期")
    actual_energy: float = Field(..., ge=0, description="实际发电量(kWh)")
    expected_energy: float = Field(..., ge=0, description="预期发电量(kWh)")
    irradiance: float = Field(0.0, ge=0, description="辐照量(kWh/m²)")
    temperature: float = Field(25.0, description="环境温度(°C)")
    data_source: DataSource


class WeatherData(BaseModel):
    date: dt_date = Field(..., description="天气日期")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    cloud_cover: float = Field(..., ge=0.0, le=1.0, description="云量覆盖率")
    solar_irradiance: float = Field(..., ge=0, description="太阳辐照(W/m²)")
    temperature: float = Field(25.0, description="温度(°C)")
    wind_speed: float = Field(0.0, ge=0, description="风速(m/s)")
    precipitation: float = Field(0.0, ge=0, description="降水量(mm)")
    data_source: DataSource


class LossReport(BaseModel):
    report_id: str = Field(..., description="损失报告ID")
    component_id: str = Field(..., description="组件ID")
    report_date: dt_date = Field(..., description="报告日期")
    reported_loss_pct: float = Field(..., ge=0.0, le=1.0, description="报告损失率")
    loss_reason: str = Field("", description="损失原因描述")
    severity: str = Field("medium", description="严重级别：low/medium/high/critical")
    data_source: DataSource


class ShadowLossRequest(BaseModel):
    request_id: str = Field(..., description="请求唯一标识")
    station_id: str = Field(..., description="电站ID")
    calculation_date: dt_date = Field(..., description="计算基准日期")
    components: List[ComponentPosition] = Field(..., description="组件位置信息")
    shadow_periods: List[ShadowPeriod] = Field(default_factory=list, description="阴影时段记录")
    string_topology: List[StringTopology] = Field(..., description="组串拓扑")
    historical_generations: List[HistoricalGeneration] = Field(default_factory=list, description="历史发电数据")
    weather_data: List[WeatherData] = Field(default_factory=list, description="天气数据")
    loss_reports: List[LossReport] = Field(default_factory=list, description="损失报告")
    trace_enabled: bool = Field(True, description="是否启用追溯记录")


class EdgeWarning(BaseModel):
    warning_type: str = Field(..., description="警告类型")
    message: str = Field(..., description="警告信息")
    affected_fields: List[str] = Field(default_factory=list, description="受影响字段")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="警告置信度")
    recommendation: str = Field("", description="处理建议")
    is_blocking: bool = Field(False, description="是否阻断计算")


class ShadowAttribution(BaseModel):
    component_id: str = Field(..., description="组件ID")
    string_id: str = Field(..., description="组串ID")
    shadow_type: ShadowType = Field(..., description="阴影类型")
    shadow_loss_pct: float = Field(..., ge=0.0, le=1.0, description="阴影损失率")
    affected_hours: float = Field(0.0, ge=0, description="受影响时长(小时)")
    estimated_energy_loss_kwh: float = Field(0.0, ge=0, description="估算电量损失(kWh)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="归因置信度")
    source_ids: List[str] = Field(default_factory=list, description="来源数据ID列表")


class StringCalculation(BaseModel):
    string_id: str = Field(..., description="组串ID")
    inverter_id: str = Field(..., description="逆变器ID")
    total_components: int = Field(..., ge=1, description="总组件数")
    affected_components: int = Field(0, ge=0, description="受影响组件数")
    string_shadow_loss_pct: float = Field(0.0, ge=0.0, le=1.0, description="组串整体阴影损失率")
    estimated_string_loss_kwh: float = Field(0.0, ge=0, description="组串估算电量损失(kWh)")
    hotspot_risk: float = Field(0.0, ge=0.0, le=1.0, description="热斑风险")
    calculation_method: str = Field("", description="计算方法说明")
    warnings: List[str] = Field(default_factory=list, description="计算过程警告")


class ScenarioComparison(BaseModel):
    scenario_name: str = Field(..., description="情景名称")
    description: str = Field("", description="情景描述")
    shadow_loss_pct: float = Field(..., ge=0.0, le=1.0, description="阴影损失率")
    estimated_annual_loss_kwh: float = Field(0.0, ge=0, description="估算年电量损失(kWh)")
    estimated_annual_revenue_loss: float = Field(0.0, ge=0, description="估算年收益损失(元)")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="情景参数")


class MaintenanceSuggestion(BaseModel):
    suggestion_id: str = Field(..., description="建议ID")
    priority: str = Field(..., description="优先级：low/medium/high/critical")
    action_type: str = Field(..., description="建议类型：prune/trim/inspect/monitor/report")
    target_id: str = Field(..., description="目标ID（组件/组串/区域）")
    description: str = Field(..., description="建议描述")
    estimated_effect_pct: float = Field(0.0, ge=0.0, le=1.0, description="估算改善效果")
    estimated_cost: float = Field(0.0, ge=0, description="估算成本(元)")
    estimated_roi_period: Optional[float] = Field(None, description="估算回本周期(天)")
    time_window: str = Field("", description="建议执行时间窗口")


class ExportReport(BaseModel):
    report_id: str = Field(..., description="报告ID")
    generated_at: datetime = Field(default_factory=datetime.now, description="生成时间")
    station_id: str = Field(..., description="电站ID")
    period_start: dt_date = Field(..., description="分析起始日期")
    period_end: dt_date = Field(..., description="分析结束日期")
    total_components: int = Field(..., description="总组件数")
    affected_components: int = Field(0, description="受影响组件数")
    overall_shadow_loss_pct: float = Field(0.0, description="整体阴影损失率")
    total_estimated_loss_kwh: float = Field(0.0, description="总估算电量损失(kWh)")
    top_shadow_sources: List[str] = Field(default_factory=list, description="主要阴影来源")
    maintenance_actions: List[str] = Field(default_factory=list, description="维护建议摘要")
    data_quality_score: float = Field(1.0, description="数据质量评分")


class ShadowLossResponse(BaseModel):
    request_id: str = Field(..., description="请求ID")
    station_id: str = Field(..., description="电站ID")
    status: str = Field(..., description="状态：success/partial/failed")
    calculation_date: dt_date = Field(..., description="计算基准日期")
    validations: List[ValidationResult] = Field(default_factory=list, description="校验结果")
    corrections: List[CorrectionTrace] = Field(default_factory=list, description="修正痕迹")
    edge_warnings: List[EdgeWarning] = Field(default_factory=list, description="边缘警告")
    shadow_attributions: List[ShadowAttribution] = Field(default_factory=list, description="阴影归因结果")
    string_calculations: List[StringCalculation] = Field(default_factory=list, description="组串计算结果")
    scenario_comparisons: List[ScenarioComparison] = Field(default_factory=list, description="情景对比")
    maintenance_suggestions: List[MaintenanceSuggestion] = Field(default_factory=list, description="维修建议")
    export_report: Optional[ExportReport] = Field(None, description="导出报告")
    processing_time_ms: float = Field(0.0, description="处理耗时(ms)")
