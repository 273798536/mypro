#!/usr/bin/env python3
"""
海草床覆盖度估算 - 主入口
运行：python3 run.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from seagrass.pipeline import SeagrassPipeline
from seagrass.sample_data import generate_sample_records, sample_tide_stations


def main():
    batch_id = os.environ.get("BATCH_ID", "BATCH_ACCEPTANCE_01")
    print(f"[seagrass] 开始运行，批次: {batch_id}")

    records = generate_sample_records(batch_id=batch_id)
    tide_stations = sample_tide_stations()

    pipeline = SeagrassPipeline(tide_stations=tide_stations, output_dir="output")
    result = pipeline.run(records, batch_id=batch_id)

    pipeline.print_summary()

    print("")
    print("[seagrass] 运行完成。使用 --acceptance 运行验收测试。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
