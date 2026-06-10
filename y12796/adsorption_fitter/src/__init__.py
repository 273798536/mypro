"""
吸附等温线拟合工具（课题组复核版）

用法见 python -m adsorption_fitter --help
"""

from .isotherm_models import (
    FitResult,
    fit_langmuir,
    fit_freundlich,
    fit_both,
    langmuir,
    freundlich,
)
from .data_cleaner import (
    CleanedDataset,
    TraceLog,
    clean_raw_data,
)
from .analysis import (
    BatchFit,
    FullAnalysis,
    run_full_analysis,
    run_sensitivity,
)
from .reporter import (
    generate_text_report,
    write_output_files,
)

__all__ = [
    "FitResult",
    "fit_langmuir",
    "fit_freundlich",
    "fit_both",
    "langmuir",
    "freundlich",
    "CleanedDataset",
    "TraceLog",
    "clean_raw_data",
    "BatchFit",
    "FullAnalysis",
    "run_full_analysis",
    "run_sensitivity",
    "generate_text_report",
    "write_output_files",
]
