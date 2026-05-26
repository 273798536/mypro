"""基金组合再平衡 CLI 入口

用法:
    python -m rebalance_cli.cli --holdings data/holdings.csv --target data/target.csv
    python -m rebalance_cli.cli --help

所有输入文件均为 CSV 格式，列头支持中文或英文。
"""

import argparse
import sys
from pathlib import Path

from .loader import DataLoadError, load_all
from .models import Portfolio
from .reporter import render_json, render_markdown, render_terminal
from .solver import analyze_portfolio, generate_suggestions, validate_existing_suggestions


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="rebalance-cli",
        description="基金组合再平衡：从目标权重出发，计算调仓建议并校验约束",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "示例:\n"
            "  %(prog)s --holdings h.csv --target t.csv --config c.csv\n"
            "  %(prog)s --holdings h.csv --target t.csv --forbidden f.csv --suggestions s.csv\n"
            "  %(prog)s --holdings h.csv --target t.csv --format json\n"
        ),
    )

    input_group = parser.add_argument_group("输入文件 (CSV)")
    input_group.add_argument("--holdings", default="", help="当前持仓")
    input_group.add_argument("--target", default="", help="目标权重")
    input_group.add_argument("--limits", default="", help="持仓上下限")
    input_group.add_argument("--forbidden", default="", help="禁买名单")
    input_group.add_argument("--suggestions", default="", help="调仓建议（已有建议将被校验，否则自动生成）")
    input_group.add_argument("--config", default="", help="组合配置（现金、最小交易额）")

    output_group = parser.add_argument_group("输出")
    output_group.add_argument(
        "--format",
        choices=["terminal", "json", "markdown", "all"],
        default="terminal",
        help="输出格式 (默认: terminal)",
    )
    output_group.add_argument("--output", default="", help="写入文件（默认: stdout）")
    output_group.add_argument("--no-terminal", action="store_true", help="禁止终端摘要输出")

    return parser


def run(args: argparse.Namespace) -> int:
    try:
        portfolio = load_all(
            holdings_file=args.holdings,
            target_file=args.target,
            limits_file=args.limits,
            forbidden_file=args.forbidden,
            suggestions_file=args.suggestions,
            config_file=args.config,
        )
    except DataLoadError as e:
        print(f"❌ 数据加载失败: {e}", file=sys.stderr)
        return 1
    except FileNotFoundError as e:
        print(f"❌ 文件未找到: {e}", file=sys.stderr)
        return 1

    if not portfolio.holdings:
        print("⚠ 警告: 未提供持仓数据", file=sys.stderr)

    analysis = analyze_portfolio(portfolio)

    if portfolio.suggestions:
        suggestions = validate_existing_suggestions(portfolio)
    else:
        suggestions = generate_suggestions(portfolio, analysis)

    output_parts = []

    if args.format in ("terminal", "all") and not args.no_terminal:
        output_parts.append(render_terminal(portfolio, analysis, suggestions))

    if args.format in ("json", "all"):
        output_parts.append(render_json(portfolio, analysis, suggestions))

    if args.format in ("markdown", "all"):
        output_parts.append(render_markdown(portfolio, analysis, suggestions))

    output_text = "\n\n".join(output_parts)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(output_text, encoding="utf-8")
        if not args.no_terminal:
            print(render_terminal(portfolio, analysis, suggestions))
    else:
        print(output_text)

    failed = [s for s in suggestions if not s.is_valid]
    return 1 if failed else 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
