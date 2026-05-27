"""Main cleaning pipeline orchestration."""

import os
import glob
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd

from .types import (
    CleaningRules,
    ReturnData,
    CleaningResult,
    CorrectionTrace,
    AssetInfo,
)
from .missing_handler import MissingValueHandler
from .covariance import CovarianceCleaner
from .order_handler import OrderHandler
from .report_generator import ReportGenerator


class CleaningPipeline:
    """Main pipeline for covariance matrix cleaning."""

    def __init__(self, rules: CleaningRules, output_dir: str):
        self.rules = rules
        self.output_dir = output_dir
        self.all_traces: List[CorrectionTrace] = []
        self.source_files: List[str] = []

    def load_returns(self, input_dir: str) -> List[ReturnData]:
        """Load return data from input directory."""
        return_data_list = []

        pattern = os.path.join(input_dir, "*.csv")
        csv_files = sorted(glob.glob(pattern))

        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in input directory: {input_dir}")

        for filepath in csv_files:
            filename = os.path.basename(filepath)
            try:
                df = pd.read_csv(filepath, index_col=0, parse_dates=True)
                df = df.apply(pd.to_numeric, errors="coerce")

                asset_info = {}
                for col in df.columns:
                    asset_info[col] = AssetInfo(
                        asset_id=col,
                        label=col,
                        source_file=filename,
                    )

                return_data = ReturnData(
                    returns=df,
                    source_file=filename,
                    asset_info=asset_info,
                )
                return_data_list.append(return_data)
                self.source_files.append(filename)

            except Exception as e:
                print(f"Error loading {filename}: {e}")

        return return_data_list

    def merge_returns(self, return_data_list: List[ReturnData]) -> Tuple[pd.DataFrame, List[CorrectionTrace]]:
        """Merge multiple return data sources."""
        traces = []

        if len(return_data_list) == 1:
            return return_data_list[0].returns, traces

        merged = None
        for i, data in enumerate(return_data_list):
            df = data.returns.copy()
            df = df.add_suffix(f"_{i+1}") if i > 0 else df

            if merged is None:
                merged = df
            else:
                merged = merged.join(df, how="outer")

            from .types import CorrectionType, Severity
            traces.append(CorrectionTrace(
                correction_type=CorrectionType.ORDER_REORDER,
                severity=Severity.INFO,
                description=f"Merged {data.source_file} with {len(df.columns)} assets",
                source_file=data.source_file,
                details={"n_assets": len(df.columns)},
            ))

        if merged is None:
            raise ValueError("No return data to merge")

        return merged, traces

    def run(
        self,
        input_dir: str,
        reference_order_file: Optional[str] = None,
    ) -> Tuple[CleaningResult, pd.DataFrame]:
        """Run the complete cleaning pipeline."""
        self.all_traces = []
        self.source_files = []

        return_data_list = self.load_returns(input_dir)

        reference_order = None
        order_handler = OrderHandler(self.rules)

        if reference_order_file and os.path.exists(reference_order_file):
            reference_order = order_handler.load_reference_order(
                reference_order_file,
                source_file=reference_order_file,
            )
            self.all_traces.extend(order_handler.traces)

        merged_returns, merge_traces = self.merge_returns(return_data_list)
        self.all_traces.extend(merge_traces)

        if reference_order:
            ordered_assets, order_traces = order_handler.get_ordered_assets(
                merged_returns,
                reference_order,
                source_file="merged",
            )
            self.all_traces.extend(order_traces)

            extra_cols = [c for c in merged_returns.columns if c not in ordered_assets]
            if extra_cols and self.rules.allow_drop_extra_assets:
                merged_returns = merged_returns.drop(columns=extra_cols)

            missing_cols = [c for c in ordered_assets if c not in merged_returns.columns]
            if missing_cols and self.rules.allow_add_missing_assets:
                for col in missing_cols:
                    merged_returns[col] = np.nan

            merged_returns = merged_returns[ordered_assets]

        missing_handler = MissingValueHandler(self.rules)
        cleaned_returns, missing_traces = missing_handler.clean(
            ReturnData(returns=merged_returns, source_file="merged")
        )
        self.all_traces.extend(missing_traces)

        cov_cleaner = CovarianceCleaner(self.rules)
        raw_cov = cov_cleaner.estimate_covariance(cleaned_returns, source_file="merged")
        self.all_traces.extend(cov_cleaner.traces)

        original_cov = raw_cov.copy()

        cleaned_cov, posdef_traces = cov_cleaner.make_positive_definite(
            raw_cov,
            source_file="merged",
        )
        self.all_traces.extend(posdef_traces)

        if reference_order and self.rules.enforce_order:
            ordered_cov, final_order_traces = order_handler.enforce_order(
                cleaned_cov,
                reference_order,
                source_file="merged",
            )
            self.all_traces.extend(final_order_traces)
            final_matrix = ordered_cov
        else:
            final_matrix = cleaned_cov

        result = CleaningResult(
            cleaned_matrix=final_matrix,
            traces=self.all_traces,
            asset_order=list(final_matrix.columns),
            source_files=self.source_files,
        )

        return result, original_cov

    def save_matrix(self, matrix: pd.DataFrame, output_dir: str, prefix: str = "") -> str:
        """Save cleaned matrix to output directory."""
        filepath = os.path.join(output_dir, f"{prefix}covariance_matrix.csv")
        matrix.to_csv(filepath, encoding="utf-8")
        return filepath

    def run_with_reports(
        self,
        input_dir: str,
        reference_order_file: Optional[str] = None,
        run_id: Optional[str] = None,
    ) -> Tuple[CleaningResult, Optional[str], List[str]]:
        """Run pipeline and generate all outputs."""
        import datetime

        if run_id is None:
            run_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        run_output_dir = os.path.join(self.output_dir, run_id)
        os.makedirs(run_output_dir, exist_ok=True)

        result, original_cov = self.run(input_dir, reference_order_file)

        matrix_path = self.save_matrix(result.cleaned_matrix, run_output_dir)

        report_gen = ReportGenerator(run_output_dir)
        report = report_gen.generate_all_reports(result, original_cov)

        return result, run_id, report.plots
