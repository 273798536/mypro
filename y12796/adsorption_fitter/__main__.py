#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吸附等温线拟合 · 课题组复核版 —— 命令行入口

化学老师用的，别要求先手工整理半天。直接给原始csv就跑。
"""
import os
import sys
import argparse
import textwrap
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from adsorption_fitter.src import (  # noqa: E402
    clean_raw_data,
    run_full_analysis,
    generate_text_report,
    write_output_files,
)


EXAMPLES = textwrap.dedent("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
使用样例（直接复制粘贴）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【1】跑内置样例（推荐第一次使用）
    python -m adsorption_fitter --demo

【2】用自己的数据（最常用）
    python -m adsorption_fitter \\
        --raw  data/adsorption_raw.csv \\
        --batch data/batch_report.csv \\
        --ledger data/reagent_ledger.csv \\
        --output output/我的材料_20240528

【3】只拟合单一批次（不交叉复核）
    python -m adsorption_fitter \\
        --raw  data/adsorption_raw.csv \\
        --only-batch MIL-101-Cr-20240512

【4】改变默认体积（比如不是50mL是100mL）
    python -m adsorption_fitter --demo --volume-mL 100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
原始CSV必须包含的列（列名要完全一致，单位写在单元格里就行）：
    序号, 材料批次, 初始浓度, 平衡浓度, 吸附剂投量, 温度, 反应时间, 吸光度
例子：  1, MIL-101-Cr-20240512, 10 mg/L, 2.31 mg/L, 10 mg, 298 K, 24 h, 0.231
        2, MIL-101-Cr-20240512, 20 ppm, 5.87 ppm, 10 mg, 25℃, , 0.587   ← ppm/℃自动识别，时间空也没关系
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")


def build_parser():
    p = argparse.ArgumentParser(
        prog="adsorption_fitter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="吸附等温线拟合工具（Langmuir/Freundlich + 批次复核 + 人话报告）",
        epilog=EXAMPLES,
    )
    p.add_argument("--raw", metavar="PATH",
                   help="原始吸附数据CSV（含初始浓度、平衡浓度、温度、时间等）")
    p.add_argument("--batch", metavar="PATH",
                   help="批次报告CSV（用来查批号重复、合成人、合成条件）")
    p.add_argument("--ledger", metavar="PATH",
                   help="试剂台账CSV（列出当次领用了哪些试剂，让报告对应具体这批材料）")
    p.add_argument("--output", metavar="DIR", default=None,
                   help="输出目录（默认 ./output/日期时间）")
    p.add_argument("--only-batch", metavar="BATCH_ID",
                   help="只分析指定批次（默认分析所有批次）")
    p.add_argument("--volume-mL", type=float, default=50.0,
                   help="吸附体系体积 mL（默认50，用来计算吸附量qe）")
    p.add_argument("--demo", action="store_true",
                   help="用data/目录下的内置样例完整跑一遍，输出所有结果")
    p.add_argument("--silent", action="store_true",
                   help="不把报告打印到终端（只写文件）")
    return p


def _auto_output_dir():
    from datetime import datetime
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(SCRIPT_DIR, "output", f"run_{stamp}")


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if not any([args.raw, args.demo]):
        print("错误：必须指定 --raw 或 --demo。\n")
        parser.print_help()
        return 2

    # demo模式：强制用内置样例
    if args.demo:
        data_dir = os.path.join(SCRIPT_DIR, "data")
        args.raw = os.path.join(data_dir, "adsorption_raw.csv")
        args.batch = os.path.join(data_dir, "batch_report.csv")
        args.ledger = os.path.join(data_dir, "reagent_ledger.csv")
        if args.output is None:
            args.output = os.path.join(SCRIPT_DIR, "output", "demo_run")
        print("=== 演示模式，使用内置样例数据 ===")

    # 检查文件
    for path, label in [(args.raw, "--raw"), (args.batch, "--batch"), (args.ledger, "--ledger")]:
        if path and not os.path.exists(path):
            print(f"错误：{label} = {path} 不存在")
            return 2

    if args.output is None:
        args.output = _auto_output_dir()

    print(f"[1/5] 读取原始数据: {args.raw}")
    raw_df = pd.read_csv(args.raw)
    if args.only_batch:
        before = len(raw_df)
        raw_df = raw_df[raw_df["材料批次"].astype(str) == args.only_batch].reset_index(drop=True)
        print(f"      筛选批次【{args.only_batch}】: {before} → {len(raw_df)} 行")

    print(f"[2/5] 数据清洗 + 单位归一 + 异常留痕 ...")
    cleaned = clean_raw_data(
        raw_path=args.raw,
        batch_path=args.batch,
        ledger_path=args.ledger,
    )
    # 过滤only_batch
    if args.only_batch:
        cleaned.df = cleaned.df[cleaned.df["材料批次"].astype(str) == args.only_batch].reset_index(drop=True)

    # 体积参数覆盖：我们在data_cleaner里写死了0.05L，这里重新算一遍
    if abs(args.volume_mL - 50.0) > 1e-9:
        V_L_new = args.volume_mL / 1000.0
        cleaned.df["qe_mg_g"] = (cleaned.df["C0_mg_L"] - cleaned.df["Ce_mg_L"]) * V_L_new / (cleaned.df["投量_mg"] / 1000.0)
        print(f"      体积已覆盖为 {args.volume_mL} mL，qe已重算")

    s = cleaned.summary()
    print(f"      → 结果: {s['总行数']}行 保留 / {s['删除行数']}行 剔除 / "
          f"{s['错误']}错 {s['警告']}警 {s['提示']}提示")

    print(f"[3/5] 按批次拟合 Langmuir + Freundlich + 敏感性分析 ...")
    analysis = run_full_analysis(cleaned, raw_df)

    print(f"[4/5] 生成课题组复核版报告 ...")
    report_text = generate_text_report(
        cleaned=cleaned,
        analysis=analysis,
        raw_path=args.raw,
        batch_path=args.batch,
        ledger_path=args.ledger,
    )

    print(f"[5/5] 写入输出目录: {args.output}")
    write_output_files(args.output, cleaned, analysis, report_text)

    if not args.silent:
        print("")
        print(report_text)
        print("")

    print("✅ 完成！输出文件：")
    for fname in sorted(os.listdir(args.output)):
        fpath = os.path.join(args.output, fname)
        size = os.path.getsize(fpath)
        print(f"   · {fname}  ({size:,} B)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
