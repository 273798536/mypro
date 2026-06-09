from .core import NormalityTester, TestResult, NormalityVerdict
from .data_processor import DataProcessor, ProcessedData
from .visualizer import NormalityVisualizer
from .report_generator import ReportGenerator

__version__ = "1.0.0"
__all__ = [
    "NormalityTester",
    "TestResult",
    "NormalityVerdict",
    "DataProcessor",
    "ProcessedData",
    "NormalityVisualizer",
    "ReportGenerator",
]
