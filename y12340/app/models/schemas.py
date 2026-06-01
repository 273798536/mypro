from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class DataPointCreate(BaseModel):
    timestamp: float
    timestamp_unit: str = "s"
    displacement: float
    displacement_unit: str = "m"
    notes: Optional[str] = None


class DataPointResponse(BaseModel):
    id: int
    experiment_id: int
    timestamp: float
    timestamp_unit: str
    displacement: float
    displacement_unit: str
    is_valid: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    mass: float
    mass_unit: str = "kg"
    data_source: Optional[str] = None
    created_by: Optional[str] = None
    data_points: List[DataPointCreate]


class ExperimentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    mass: float
    mass_unit: str
    data_source: Optional[str]
    created_by: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    version: int
    data_points: List[DataPointResponse] = []

    class Config:
        from_attributes = True


class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mass: Optional[float] = None
    mass_unit: Optional[str] = None
    status: Optional[str] = None
    data_points: Optional[List[DataPointCreate]] = None
    change_description: Optional[str] = None


class ValidationResultResponse(BaseModel):
    id: int
    experiment_id: int
    check_type: str
    passed: bool
    message: str
    affected_points: Optional[str]
    severity: str
    created_at: datetime

    class Config:
        from_attributes = True


class FittingResultResponse(BaseModel):
    id: int
    experiment_id: int
    spring_constant: Optional[float]
    spring_constant_unit: str
    damping_coefficient: Optional[float]
    damping_coefficient_unit: str
    natural_frequency: Optional[float]
    damping_ratio: Optional[float]
    r_squared: Optional[float]
    fitted_equation: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ExperimentSummary(BaseModel):
    id: int
    name: str
    status: str
    mass: float
    mass_unit: str
    data_points_count: int
    created_at: datetime
    version: int
    has_errors: bool = False
    has_warnings: bool = False

    class Config:
        from_attributes = True
