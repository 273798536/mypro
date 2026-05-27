"""Asset order locking and validation."""

import os
from typing import List, Tuple, Optional

import numpy as np
import pandas as pd

from .types import (
    CorrectionTrace,
    CorrectionType,
    Severity,
    CleaningRules,
    AssetInfo,
)


class OrderHandler:
    """Handles asset order validation, locking, and enforcement."""

    def __init__(self, rules: CleaningRules):
        self.rules = rules
        self.traces: List[CorrectionTrace] = []
        self.reference_order: Optional[List[str]] = None

    def load_reference_order(self, order_file: str, source_file: str) -> List[str]:
        """Load reference asset order from file."""
        if not os.path.exists(order_file):
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.ERROR,
                description=f"Reference order file not found: {order_file}",
                source_file=source_file,
                details={"order_file": order_file},
            ))
            return []

        try:
            if order_file.endswith(".csv"):
                df = pd.read_csv(order_file)
                if "asset" in df.columns:
                    order = df["asset"].tolist()
                elif "asset_id" in df.columns:
                    order = df["asset_id"].tolist()
                else:
                    order = df.iloc[:, 0].tolist()
            elif order_file.endswith(".txt"):
                with open(order_file, "r") as f:
                    order = [line.strip() for line in f if line.strip()]
            else:
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.ORDER_REORDER,
                    severity=Severity.ERROR,
                    description=f"Unsupported order file format: {order_file}. Use .csv or .txt",
                    source_file=source_file,
                    details={"order_file": order_file},
                ))
                return []

            self.reference_order = [str(x) for x in order]
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.INFO,
                description=f"Loaded reference order with {len(self.reference_order)} assets from {order_file}",
                source_file=source_file,
                details={"n_assets": len(self.reference_order), "order_file": order_file},
            ))
            return self.reference_order

        except Exception as e:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.ERROR,
                description=f"Failed to load reference order: {str(e)}",
                source_file=source_file,
                details={"order_file": order_file, "error": str(e)},
            ))
            return []

    def validate_order(
        self,
        current_assets: List[str],
        reference_order: Optional[List[str]] = None,
        source_file: str = "",
    ) -> Tuple[bool, List[str], List[str], List[str]]:
        """Validate current asset order against reference."""
        if reference_order is None:
            reference_order = self.reference_order

        if reference_order is None:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.INFO,
                description="No reference order specified - using natural order",
                source_file=source_file,
            ))
            return True, [], [], []

        current_set = set(current_assets)
        reference_set = set(reference_order)

        missing_assets = [a for a in reference_order if a not in current_set]
        extra_assets = [a for a in current_assets if a not in reference_set]

        current_order_filtered = [a for a in current_assets if a in reference_set]
        reference_filtered = [a for a in reference_order if a in current_set]
        order_matches = current_order_filtered == reference_filtered

        if not order_matches:
            mismatches = []
            for i, (cur, ref) in enumerate(zip(current_order_filtered, reference_filtered)):
                if cur != ref:
                    mismatches.append(f"pos {i}: expected '{ref}', got '{cur}'")
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.WARNING,
                description=f"Asset order mismatch detected: {len(mismatches)} positions differ",
                source_file=source_file,
                details={
                    "mismatches": mismatches[:10],
                    "current_order": current_order_filtered[:20],
                    "expected_order": reference_filtered[:20],
                },
            ))

        if missing_assets:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_ADD_MISSING,
                severity=Severity.WARNING,
                description=f"Missing {len(missing_assets)} assets from reference order",
                source_file=source_file,
                details={"missing_assets": missing_assets},
            ))

        if extra_assets:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_DROP_EXTRA,
                severity=Severity.WARNING,
                description=f"Found {len(extra_assets)} extra assets not in reference order",
                source_file=source_file,
                details={"extra_assets": extra_assets},
            ))

        is_valid = order_matches and not missing_assets and not extra_assets
        return is_valid, missing_assets, extra_assets, current_order_filtered

    def enforce_order(
        self,
        matrix: pd.DataFrame,
        reference_order: Optional[List[str]] = None,
        source_file: str = "",
    ) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Enforce reference order on the matrix."""
        self.traces = []

        if reference_order is None:
            reference_order = self.reference_order

        if reference_order is None:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.INFO,
                description="No reference order specified - matrix order unchanged",
                source_file=source_file,
            ))
            return matrix, self.traces

        current_assets = list(matrix.columns)
        is_valid, missing, extra, current_filtered = self.validate_order(
            current_assets, reference_order, source_file
        )

        if is_valid:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.INFO,
                description="Asset order already matches reference",
                source_file=source_file,
            ))
            return matrix, self.traces

        result = matrix.copy()

        if extra and self.rules.allow_drop_extra_assets:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_DROP_EXTRA,
                severity=Severity.WARNING,
                description=f"Dropping {len(extra)} extra assets not in reference order",
                source_file=source_file,
                details={"dropped_assets": extra},
                before_value=extra,
                after_value=[],
            ))
            result = result.drop(columns=extra, index=extra)
        elif extra:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_DROP_EXTRA,
                severity=Severity.CRITICAL,
                description=f"CRITICAL: {len(extra)} extra assets found but dropping not allowed - requires manual review",
                source_file=source_file,
                details={"extra_assets": extra},
            ))

        if missing and self.rules.allow_add_missing_assets:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_ADD_MISSING,
                severity=Severity.WARNING,
                description=f"Adding {len(missing)} missing assets with NaN values - requires manual imputation",
                source_file=source_file,
                details={"added_assets": missing},
                before_value=[],
                after_value=missing,
            ))
            for asset in missing:
                result[asset] = np.nan
                result.loc[asset] = np.nan
        elif missing:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_ADD_MISSING,
                severity=Severity.CRITICAL,
                description=f"CRITICAL: {len(missing)} missing assets from reference but adding not allowed - requires manual review",
                source_file=source_file,
                details={"missing_assets": missing},
            ))

        final_order = [a for a in reference_order if a in result.columns]
        result = result.loc[final_order, final_order]

        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.ORDER_REORDER,
            severity=Severity.INFO,
            description=f"Reordered matrix to {len(final_order)} assets matching reference order",
            source_file=source_file,
            details={"final_assets": final_order},
            before_value=list(matrix.columns),
            after_value=final_order,
        ))

        return result, self.traces

    def get_ordered_assets(
        self,
        returns: pd.DataFrame,
        reference_order: Optional[List[str]] = None,
        source_file: str = "",
    ) -> Tuple[List[str], List[CorrectionTrace]]:
        """Get ordered asset list for returns data."""
        self.traces = []

        if reference_order is None:
            reference_order = self.reference_order

        current_assets = list(returns.columns)

        if reference_order is None:
            self.traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.INFO,
                description=f"Using natural order for {len(current_assets)} assets",
                source_file=source_file,
                details={"assets": current_assets},
            ))
            return current_assets, self.traces

        is_valid, missing, extra, current_filtered = self.validate_order(
            current_assets, reference_order, source_file
        )

        if is_valid:
            return reference_order, self.traces

        final_order = []
        for asset in reference_order:
            if asset in current_assets:
                final_order.append(asset)
            elif self.rules.allow_add_missing_assets:
                final_order.append(asset)
                self.traces.append(CorrectionTrace(
                    correction_type=CorrectionType.ORDER_ADD_MISSING,
                    severity=Severity.WARNING,
                    description=f"Asset '{asset}' from reference order missing from data",
                    source_file=source_file,
                    asset=asset,
                ))

        for asset in current_assets:
            if asset not in reference_order:
                if self.rules.allow_drop_extra_assets:
                    self.traces.append(CorrectionTrace(
                        correction_type=CorrectionType.ORDER_DROP_EXTRA,
                        severity=Severity.WARNING,
                        description=f"Asset '{asset}' not in reference order will be dropped",
                        source_file=source_file,
                        asset=asset,
                    ))
                else:
                    final_order.append(asset)
                    self.traces.append(CorrectionTrace(
                        correction_type=CorrectionType.ORDER_DROP_EXTRA,
                        severity=Severity.CRITICAL,
                        description=f"Asset '{asset}' not in reference order but dropping not allowed",
                        source_file=source_file,
                        asset=asset,
                    ))

        self.traces.append(CorrectionTrace(
            correction_type=CorrectionType.ORDER_REORDER,
            severity=Severity.INFO,
            description=f"Ordered {len(final_order)} assets according to reference",
            source_file=source_file,
            details={"final_order": final_order},
        ))

        return final_order, self.traces
