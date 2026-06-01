from .units import UnitSystem, Unit, Quantity
from .models import Beam, Load, LoadType, BoundaryCondition
from .validator import InputValidator, ValidationResult
from .calculator import BeamCalculator, CalculationResult
from .steps import StepTracker, CalculationStep
from .warnings import WarningCollector, Warning, WarningType
from .report import ReportGenerator
from .io import DataImporter, RawData, ProcessedData

__version__ = "1.0.0"
__all__ = [
    "UnitSystem",
    "Unit",
    "Quantity",
    "Beam",
    "Load",
    "LoadType",
    "BoundaryCondition",
    "InputValidator",
    "ValidationResult",
    "BeamCalculator",
    "CalculationResult",
    "StepTracker",
    "CalculationStep",
    "WarningCollector",
    "Warning",
    "WarningType",
    "ReportGenerator",
    "ChartGenerator",
    "DataImporter",
    "RawData",
    "ProcessedData",
]


def __getattr__(name):
    if name == "ChartGenerator":
        from .charts import ChartGenerator
        return ChartGenerator
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

