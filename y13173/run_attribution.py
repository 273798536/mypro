#!/usr/bin/env python3
"""梁体挠度误差归因系统 - 主入口。

用法：
    python run_attribution.py <command> [options]

命令：
    run       执行归因分析
    filter    筛选记录
    detail    查看单条记录详情
    status    状态管理
    demo      生成演示数据

示例：
    # 1. 生成演示数据
    python run_attribution.py demo -o demo_data

    # 2. 运行归因分析
    python run_attribution.py run -i demo_data/demo_experiment_records.csv \
        -o output/result.csv \
        -s output/state.json \
        --report-text output/report.txt \
        --report-md output/report.md \
        --summary-json output/summary.json

    # 3. 查看状态
    python run_attribution.py status list --input-state output/state.json

    # 4. 筛选极端值
    python run_attribution.py filter --input-state output/state.json --only-extremes

    # 5. 查看单条详情
    python run_attribution.py detail --input-state output/state.json <record_id>
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deflection_attribution.cli import main

if __name__ == "__main__":
    sys.exit(main())
