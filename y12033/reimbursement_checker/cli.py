import argparse
import sys
from pathlib import Path
from .loader import load_all_data
from .checks import run_all_checks
from .report import generate_reports


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="reimbursement-checker",
        description="院校科研经费报销校验工具 - 校验预算占用、发票重复、合同余额",
    )
    parser.add_argument(
        "-i", "--input-dir",
        default="./input",
        help="输入数据目录，包含 budgets.csv, contracts.csv, invoices.csv, reimbursements.csv",
    )
    parser.add_argument(
        "-o", "--output-dir",
        default="./output",
        help="输出报告目录",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="显示详细日志",
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"❌ 错误: 输入目录不存在: {input_dir}", file=sys.stderr)
        print(f"   请确保目录存在并包含以下文件:")
        print(f"   - budgets.csv 或 budgets.json (项目预算)")
        print(f"   - contracts.csv 或 contracts.json (合同台账)")
        print(f"   - invoices.csv 或 invoices.json (发票信息)")
        print(f"   - reimbursements.csv 或 reimbursements.json (报销记录)")
        return 1

    if args.verbose:
        print(f"📂 输入目录: {input_dir}")
        print(f"📂 输出目录: {output_dir}")
        print(f"🔄 正在加载数据...")

    try:
        records, budgets, invoices, contracts = load_all_data(input_dir)
    except Exception as e:
        print(f"❌ 数据加载失败: {e}", file=sys.stderr)
        return 1

    if not records:
        print(f"⚠️  未找到报销记录，请检查输入目录。", file=sys.stderr)
        return 1

    if args.verbose:
        print(f"   报销记录: {len(records)} 条")
        print(f"   预算科目: {len(budgets)} 条")
        print(f"   合同台账: {len(contracts)} 条")
        print(f"   发票信息: {len(invoices)} 条")
        print(f"🔍 正在执行校验...")

    try:
        results = run_all_checks(records, budgets, invoices, contracts)
    except Exception as e:
        print(f"❌ 校验执行失败: {e}", file=sys.stderr)
        return 1

    if args.verbose:
        print(f"   完成 {len(results)} 项检查")

    try:
        summary = generate_reports(results, output_dir)
    except Exception as e:
        print(f"❌ 报告生成失败: {e}", file=sys.stderr)
        return 1

    return 1 if summary.has_failure else 0


if __name__ == "__main__":
    sys.exit(main())
