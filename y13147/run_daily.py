#!/usr/bin/env python3
"""
蒙特卡洛误差参数试算 - 项目经理日常脚本
==========================================
用法:
    python run_daily.py                        # 使用默认 data/param_table.csv
    python run_daily.py -i 我的参数表.csv       # 指定输入文件
    python run_daily.py -i x.xlsx -o 结果.csv   # 指定输入输出
    python run_daily.py --seed 42               # 指定随机种子

稳定约定 (请勿修改下列参数名和输出列):
    输入列名见 mc_engine.REQUIRED_COLUMNS
    输出列: 参数编号,案例名称,状态,错误/警告码,均值估计,标准差,
            置信下限,置信上限,Cp,Cpk,超规格率,分布类型,合成公式,随机种子
    状态枚举: 已处理 / 已处理（带警告） / 待补材料 / 人工改判
    错误码枚举: ERR_MC_001 ~ ERR_MC_007
"""

import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

from mc_engine import (
    run_batch,
    run_single_trial,
    REQUIRED_COLUMNS,
    STATUS_LABELS,
    ERROR_MESSAGES,
)


def main():
    parser = argparse.ArgumentParser(
        description="蒙特卡洛误差参数试算 - 日常批量脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "-i", "--input",
        default=str(Path(__file__).parent / "data" / "param_table.csv"),
        help="输入参数表路径 (CSV 或 Excel)，默认 data/param_table.csv",
    )
    parser.add_argument(
        "-o", "--output",
        default=str(Path(__file__).parent / "output" / "mc_result.csv"),
        help="输出结果 CSV 路径，默认 output/mc_result.csv",
    )
    parser.add_argument("--seed", type=int, default=20260613, help="随机种子，默认 20260613")
    parser.add_argument("-v", "--verbose", action="store_true", help="打印每条明细")
    args = parser.parse_args()

    # 读入
    in_path = Path(args.input)
    if not in_path.exists():
        print(f"[ERR_MC_001] 输入文件不存在: {in_path}")
        sys.exit(1)

    if in_path.suffix.lower() == ".csv":
        param_df = pd.read_csv(in_path)
    else:
        param_df = pd.read_excel(in_path)

    # 列检查
    missing = [c for c in REQUIRED_COLUMNS if c not in param_df.columns]
    if missing:
        print(f"[ERR_MC_001] 缺少必要列: {', '.join(missing)}")
        print(f"         必备列: {', '.join(REQUIRED_COLUMNS)}")
        sys.exit(1)

    print(f"=== 蒙特卡洛误差参数试算 ===")
    print(f"输入文件: {in_path}")
    print(f"参数条数: {len(param_df)}")
    print(f"随机种子: {args.seed}")
    print()

    # 执行
    results = [run_single_trial(row, seed=args.seed) for _, row in param_df.iterrows()]

    # 统计
    counts = {"PROCESSED": 0, "PROCESSED_WARN": 0, "MATERIAL_PENDING": 0, "MANUAL_REVIEW": 0}
    for r in results:
        counts[r.status] = counts.get(r.status, 0) + 1

    print("--- 状态汇总 ---")
    for k, label in STATUS_LABELS.items():
        print(f"  {label}: {counts.get(k, 0)}")
    print()

    # 明细 (verbose 模式)
    if args.verbose:
        print("--- 明细 ---")
        for r in results:
            mark = {
                "PROCESSED": "🟢",
                "PROCESSED_WARN": "🟡",
                "MATERIAL_PENDING": "🔵",
                "MANUAL_REVIEW": "🔴",
            }.get(r.status, "?")
            cpk_str = f"Cpk={r.cpk:.3f}" if r.cpk is not None else "Cpk=--"
            err_str = (
                " [" + ", ".join(r.error_codes) + "]"
                if r.error_codes else ""
            )
            print(f"  {mark} {r.param_id} {r.case_name}  {r.status_label}  {cpk_str}{err_str}")
        print()

    # 导出
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    records = []
    for r in results:
        rec = {
            "参数编号": r.param_id,
            "案例名称": r.case_name,
            "状态": r.status_label,
            "错误/警告码": "、".join(r.error_codes) if r.error_codes else "",
            "错误/警告描述": "；".join(r.error_messages) if r.error_messages else "",
            "均值估计": r.mean_estimated,
            "标准差": r.std_estimated,
            "置信下限": r.lower_bound,
            "置信上限": r.upper_bound,
            "Cp": r.cp,
            "Cpk": r.cpk,
            "超规格率(%)": round(r.out_of_spec_rate * 100, 4) if r.out_of_spec_rate is not None else None,
        }
        if r.trace:
            rec["分布类型"] = r.trace.distribution_type
            rec["合成公式"] = r.trace.formula
            rec["随机种子"] = r.trace.random_seed
        else:
            rec["分布类型"] = ""
            rec["合成公式"] = ""
            rec["随机种子"] = args.seed
        records.append(rec)

    pd.DataFrame(records).to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"结果已导出: {out_path}")

    # 异常提示 (给日常脚本用，非零退出码提醒有异常)
    exit_code = 0
    if counts.get("MATERIAL_PENDING", 0) > 0:
        print(f"\n[WARN] 有 {counts['MATERIAL_PENDING']} 条参数待补材料")
        exit_code = 2
    if counts.get("MANUAL_REVIEW", 0) > 0:
        print(f"[WARN] 有 {counts['MANUAL_REVIEW']} 条参数需人工改判")
        exit_code = 3 if exit_code == 0 else exit_code
    if counts.get("PROCESSED_WARN", 0) > 0:
        print(f"[INFO] 有 {counts['PROCESSED_WARN']} 条参数带警告")
        if exit_code == 0:
            exit_code = 1

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
