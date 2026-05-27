"""Command-line interface for covariance matrix cleaning."""

import os
import sys
import json
from datetime import datetime
from typing import Optional

import click
import yaml

from . import __version__
from .types import CleaningRules
from .pipeline import CleaningPipeline


def load_config(config_file: Optional[str]) -> CleaningRules:
    """Load cleaning rules from config file or use defaults."""
    if config_file and os.path.exists(config_file):
        with open(config_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
        return CleaningRules(**config)
    return CleaningRules()


@click.group()
@click.version_option(version=__version__)
def main():
    """Covariance Matrix Cleaning CLI for Quantitative Finance."""
    pass


@main.command()
@click.option(
    "--input-dir", "-i",
    required=True,
    type=click.Path(exists=True, file_okay=False, dir_okay=True),
    help="Input directory containing return CSV files",
)
@click.option(
    "--output-dir", "-o",
    required=True,
    type=click.Path(file_okay=False, dir_okay=True),
    help="Output directory for results",
)
@click.option(
    "--config", "-c",
    type=click.Path(exists=True, file_okay=True, dir_okay=False),
    help="YAML config file with cleaning rules",
)
@click.option(
    "--order-file",
    type=click.Path(exists=True, file_okay=True, dir_okay=False),
    help="Reference asset order file (CSV or TXT)",
)
@click.option(
    "--run-id",
    help="Custom run ID for output (default: timestamp)",
)
@click.option(
    "--quiet", "-q",
    is_flag=True,
    help="Suppress detailed output",
)
def clean(
    input_dir: str,
    output_dir: str,
    config: Optional[str],
    order_file: Optional[str],
    run_id: Optional[str],
    quiet: bool,
):
    """Clean covariance matrix from return data."""
    try:
        rules = load_config(config)

        if not quiet:
            click.echo(f"📊 Covariance Matrix Cleaner v{__version__}")
            click.echo(f"📁 Input directory: {input_dir}")
            click.echo(f"📤 Output directory: {output_dir}")
            if config:
                click.echo(f"⚙️  Config file: {config}")
            if order_file:
                click.echo(f"📋 Reference order: {order_file}")
            click.echo("")

        os.makedirs(output_dir, exist_ok=True)

        pipeline = CleaningPipeline(rules, output_dir)
        result, actual_run_id, outputs = pipeline.run_with_reports(
            input_dir=input_dir,
            reference_order_file=order_file,
            run_id=run_id,
        )

        run_output_dir = os.path.join(output_dir, actual_run_id)

        if not quiet:
            click.echo("✅ Processing complete!")
            click.echo(f"🆔 Run ID: {actual_run_id}")
            click.echo(f"📂 Output saved to: {run_output_dir}")
            click.echo("")

            stats = result.cleaned_matrix.shape
            click.echo(f"📐 Matrix dimensions: {stats[0]}x{stats[1]}")
            click.echo(f"📋 Asset order: {', '.join(result.asset_order)}")
            click.echo("")

            click.echo("📊 Processing summary:")
            click.echo(f"  • Total items tracked: {len(result.traces)}")
            click.echo(f"  • Unprocessed (INFO):    {len(result.unprocessed_items)}")
            click.echo(f"  • Corrected (WARNING/ERROR): {len(result.corrected_items)}")
            click.echo(f"  • Needs manual review (CRITICAL): {len(result.manual_items)}")
            click.echo("")

            if result.manual_items:
                click.echo(f"⚠️  WARNING: {len(result.manual_items)} items require manual review!")
                for trace in result.manual_items[:5]:
                    click.echo(f"   - {trace.description}")
                if len(result.manual_items) > 5:
                    click.echo(f"   ... and {len(result.manual_items) - 5} more")
                click.echo("")

            click.echo("📄 Generated outputs:")
            for output in outputs:
                rel_path = os.path.relpath(output, output_dir)
                click.echo(f"  • {rel_path}")
            click.echo("")

            index_file = os.path.join(output_dir, "latest_run.txt")
            with open(index_file, "w", encoding="utf-8") as f:
                f.write(f"{actual_run_id}\n")
                f.write(f"{run_output_dir}\n")

        if result.manual_items:
            sys.exit(2)

    except Exception as e:
        click.echo(f"❌ Error: {str(e)}", err=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


@main.command()
@click.option(
    "--output-dir", "-o",
    required=True,
    type=click.Path(file_okay=False, dir_okay=True),
    help="Output directory to check",
)
@click.option(
    "--run-id",
    help="Specific run ID to check (default: latest)",
)
def status(output_dir: str, run_id: Optional[str]):
    """Check status of previous runs."""
    if run_id is None:
        latest_file = os.path.join(output_dir, "latest_run.txt")
        if os.path.exists(latest_file):
            with open(latest_file, "r", encoding="utf-8") as f:
                lines = f.read().strip().split("\n")
                run_id = lines[0]

    if run_id is None:
        click.echo(f"❌ No runs found in {output_dir}")
        sys.exit(1)

    run_dir = os.path.join(output_dir, run_id)
    if not os.path.exists(run_dir):
        click.echo(f"❌ Run {run_id} not found")
        sys.exit(1)

    report_json = os.path.join(run_dir, "report.json")
    if os.path.exists(report_json):
        with open(report_json, "r", encoding="utf-8") as f:
            report = json.load(f)

        click.echo(f"📊 Run status: {run_id}")
        click.echo(f"🕒 Generated at: {report['generated_at']}")
        click.echo(f"📁 Source files: {', '.join(report['source_files'])}")
        click.echo(f"📐 Matrix shape: {report['matrix_shape']}")
        click.echo("")

        summary = report["summary"]
        click.echo("📊 Summary:")
        click.echo(f"  • Positive definite: {'YES' if summary.get('is_positive_definite', False) else 'NO'}")
        click.echo(f"  • Min eigenvalue: {summary.get('min_eigenvalue', 'N/A')}")
        click.echo(f"  • Condition number: {summary.get('condition_number', 'N/A')}")
        click.echo(f"  • Unprocessed: {summary.get('unprocessed_count', 0)}")
        click.echo(f"  • Corrected: {summary.get('corrected_count', 0)}")
        click.echo(f"  • Needs manual: {summary.get('manual_count', 0)}")

        if summary.get("manual_count", 0) > 0:
            click.echo("")
            click.echo(f"⚠️  {summary['manual_count']} items require manual review!")
            sys.exit(2)
    else:
        click.echo(f"ℹ️  Run {run_id} exists but no detailed report found")


@main.command()
@click.option(
    "--output", "-o",
    type=click.Path(file_okay=True, dir_okay=False),
    default="cleaning_rules.yaml",
    help="Output config file path",
)
def init_config(output: str):
    """Generate a default configuration file."""
    default_rules = CleaningRules()
    config_dict = {
        "max_missing_ratio": default_rules.max_missing_ratio,
        "missing_threshold_warning": default_rules.missing_threshold_warning,
        "missing_threshold_critical": default_rules.missing_threshold_critical,
        "missing_strategy": default_rules.missing_strategy,
        "posdef_strategy": default_rules.posdef_strategy,
        "eigen_epsilon": default_rules.eigen_epsilon,
        "shrinkage_factor": default_rules.shrinkage_factor,
        "enforce_order": default_rules.enforce_order,
        "allow_drop_extra_assets": default_rules.allow_drop_extra_assets,
        "allow_add_missing_assets": default_rules.allow_add_missing_assets,
        "covariance_method": default_rules.covariance_method,
        "min_obs_for_cov": default_rules.min_obs_for_cov,
    }

    comments = """# Covariance Matrix Cleaning Configuration
#
# Missing value handling:
#   max_missing_ratio: Max ratio of missing values allowed before dropping asset/row
#   missing_strategy: impute_mean, impute_median, interpolate, forward_fill
#
# Positive definite repair:
#   posdef_strategy: eigen_clip, shrinkage, nearest
#   eigen_epsilon: Minimum eigenvalue threshold
#
# Order handling:
#   enforce_order: Enforce reference asset order
#   allow_drop_extra_assets: Drop assets not in reference order
#   allow_add_missing_assets: Add assets from reference order missing from data
#
# Covariance estimation:
#   covariance_method: pearson, kendall, spearman
#   min_obs_for_cov: Minimum observations required for covariance estimation

"""

    with open(output, "w", encoding="utf-8") as f:
        f.write(comments)
        yaml.dump(config_dict, f, default_flow_style=False, sort_keys=False)

    click.echo(f"✅ Default config written to: {output}")


if __name__ == "__main__":
    main()
