"""Core type definitions for covariance matrix cleaning."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd


class Severity(str, Enum):
    """Severity level for diagnostics and corrections."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class CorrectionType(str, Enum):
    """Type of correction applied."""
    MISSING_DROP_ROW = "missing_drop_row"
    MISSING_DROP_COL = "missing_drop_col"
    MISSING_IMPUTE_MEAN = "missing_impute_mean"
    MISSING_IMPUTE_MEDIAN = "missing_impute_median"
    MISSING_INTERPOLATE = "missing_interpolate"
    MISSING_FORWARD_FILL = "missing_forward_fill"
    POSDEF_EIGEN_CLIP = "posdef_eigen_clip"
    POSDEF_SHRINKAGE = "posdef_shrinkage"
    POSDEF_NEAREST = "posdef_nearest"
    ORDER_REORDER = "order_reorder"
    ORDER_DROP_EXTRA = "order_drop_extra"
    ORDER_ADD_MISSING = "order_add_missing"


class StatusCategory(str, Enum):
    """Category for report items."""
    UNPROCESSED = "unprocessed"
    CORRECTED = "corrected"
    NEEDS_MANUAL = "needs_manual"


@dataclass
class CorrectionTrace:
    """Record of a single correction applied during cleaning."""
    correction_type: CorrectionType
    severity: Severity
    description: str
    source_file: Optional[str] = None
    asset: Optional[str] = None
    timestamp: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    before_value: Optional[Any] = None
    after_value: Optional[Any] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


@dataclass
class AssetInfo:
    """Metadata about an asset."""
    asset_id: str
    label: str
    source_file: str
    order_index: Optional[int] = None
    tags: List[str] = field(default_factory=list)


@dataclass
class CleaningRules:
    """Configuration rules for the cleaning process."""
    max_missing_ratio: float = 0.3
    missing_threshold_warning: float = 0.1
    missing_threshold_critical: float = 0.3
    missing_strategy: str = "impute_mean"
    posdef_strategy: str = "eigen_clip"
    eigen_epsilon: float = 1e-6
    shrinkage_factor: Optional[float] = None
    enforce_order: bool = True
    reference_order_file: Optional[str] = None
    allow_drop_extra_assets: bool = True
    allow_add_missing_assets: bool = False
    covariance_method: str = "pearson"
    min_obs_for_cov: int = 30


@dataclass
class ReturnData:
    """Container for return data with source tracking."""
    returns: pd.DataFrame
    source_file: str
    asset_info: Dict[str, AssetInfo] = field(default_factory=dict)
    load_time: Optional[str] = None

    def __post_init__(self):
        if self.load_time is None:
            self.load_time = datetime.now().isoformat()


@dataclass
class CleaningResult:
    """Result of the covariance matrix cleaning process."""
    cleaned_matrix: pd.DataFrame
    traces: List[CorrectionTrace] = field(default_factory=list)
    unprocessed_items: List[CorrectionTrace] = field(default_factory=list)
    corrected_items: List[CorrectionTrace] = field(default_factory=list)
    manual_items: List[CorrectionTrace] = field(default_factory=list)
    asset_order: List[str] = field(default_factory=list)
    source_files: List[str] = field(default_factory=list)
    cleaning_time: Optional[str] = None

    def __post_init__(self):
        if self.cleaning_time is None:
            self.cleaning_time = datetime.now().isoformat()
        self._categorize_traces()

    def _categorize_traces(self):
        """Categorize traces into unprocessed, corrected, and needs_manual."""
        self.unprocessed_items = []
        self.corrected_items = []
        self.manual_items = []

        for trace in self.traces:
            if trace.severity == Severity.CRITICAL:
                self.manual_items.append(trace)
            elif trace.severity in (Severity.WARNING, Severity.ERROR):
                self.corrected_items.append(trace)
            else:
                self.unprocessed_items.append(trace)


@dataclass
class DiagnosticReport:
    """Complete diagnostic report."""
    result: CleaningResult
    summary_stats: Dict[str, Any] = field(default_factory=dict)
    plots: List[str] = field(default_factory=list)
    generated_at: Optional[str] = None

    def __post_init__(self):
        if self.generated_at is None:
            self.generated_at = datetime.now().isoformat()
