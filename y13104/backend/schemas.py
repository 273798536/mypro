from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ParameterSheetBase(BaseModel):
    file_name: str
    version: str
    uploaded_by: str = "unknown"
    notes: str = ""


class ParameterSheetCreate(ParameterSheetBase):
    column_mapping: Dict[str, Optional[str]] = {}
    raw_columns: List[str] = []


class ParameterSheetOut(ParameterSheetBase):
    id: int
    uploaded_at: datetime
    column_mapping: Dict[str, Optional[str]] = {}
    raw_columns: List[str] = []
    row_count: int = 0
    has_result: bool = False

    class Config:
        from_attributes = True


class ParameterRowOut(BaseModel):
    id: int
    sheet_id: int
    excel_row_number: int
    security_code: Optional[str] = None
    security_name: Optional[str] = None
    weight: Optional[float] = None
    x_value: Optional[float] = None
    y_value: Optional[float] = None
    unit: Optional[str] = None
    unit_source: Optional[str] = None
    breakpoint: Optional[float] = None
    row_status: str
    warnings: List[str] = []
    raw_data: Dict[str, Any] = {}

    class Config:
        from_attributes = True


class ColumnMatchResult(BaseModel):
    canonical: str
    candidates: List[str] = []
    chosen: Optional[str] = None
    confidence: float = 0.0


class UploadResponse(BaseModel):
    sheet_id: int
    file_name: str
    version: str
    row_count: int
    column_matches: List[ColumnMatchResult]
    warnings: List[str] = []
    rows_with_issues: List[Dict[str, Any]] = []


class RegressionResultOut(BaseModel):
    id: int
    sheet_id: int
    run_at: datetime
    segment_count: int
    breakpoints: List[float] = []
    coefficients: Dict[str, Any] = {}
    r_squared: Optional[float] = None
    total_points: int = 0
    anomaly_count: int = 0

    class Config:
        from_attributes = True


class AnomalyPointOut(BaseModel):
    id: int
    result_id: int
    param_row_id: int
    security_code: Optional[str] = None
    security_name: Optional[str] = None
    x_value: Optional[float] = None
    y_value: Optional[float] = None
    predicted_y: Optional[float] = None
    residual: Optional[float] = None
    z_score: Optional[float] = None
    is_outlier: bool = False
    anomaly_reason: Optional[str] = None
    review_status: str
    reviewer_note: str = ""
    overridden: bool = False

    class Config:
        from_attributes = True


class ReviewUpdate(BaseModel):
    review_status: str
    reviewer_note: str = ""


class ReviewSummary(BaseModel):
    processed: int = 0
    pending_material: int = 0
    manual_overrule: int = 0
    anomalies: List[AnomalyPointOut] = []


class ScatterPoint(BaseModel):
    x: float
    y: float
    security_code: Optional[str] = None
    security_name: Optional[str] = None
    param_row_id: Optional[int] = None
    is_anomaly: bool = False
    review_status: str = "processed"


class RegressionChartData(BaseModel):
    points: List[ScatterPoint] = []
    breakpoints: List[float] = []
    fitted_lines: List[Dict[str, Any]] = []
    r_squared: Optional[float] = None


class ReviewDashboard(BaseModel):
    sheet: ParameterSheetOut
    latest_result: Optional[RegressionResultOut] = None
    chart: RegressionChartData
    anomalies: List[AnomalyPointOut] = []
    review_summary: ReviewSummary
    change_logs: List[Dict[str, Any]] = []
