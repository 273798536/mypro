from .param_table import ParameterTable, SegmentParams
from .boundary_samples import BoundarySampleSet, BoundarySample, SampleQuality
from .core import BoundaryCorrectionEngine, CorrectionResult, CorrectionStatus
from .error_analysis import ErrorAnalyzer, AnalysisReport, ErrorMetrics
from .cli import main

__version__ = "1.0.0"
__all__ = [
    "ParameterTable",
    "SegmentParams",
    "BoundarySampleSet",
    "BoundarySample",
    "SampleQuality",
    "BoundaryCorrectionEngine",
    "CorrectionResult",
    "CorrectionStatus",
    "ErrorAnalyzer",
    "AnalysisReport",
    "ErrorMetrics",
    "main",
]
