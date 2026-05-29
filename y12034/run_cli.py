#!/usr/bin/env python3
"""
充电站分时电价收益分析系统 - 便捷入口脚本

使用方式:
  python run_cli.py <命令> [参数]

示例:
  python run_cli.py analyze examples/充电站充电订单_测试数据.xlsx
  python run_cli.py analyze examples/充电站充电订单_测试数据.xlsx --export-report
  python run_cli.py filter examples/充电站充电订单_测试数据.xlsx --type offline_device
  python run_cli.py trace examples/充电站充电订单_测试数据.xlsx --order-id ORD007 -v
  python run_cli.py report examples/充电站充电订单_测试数据.xlsx -o output/report.xlsx
  python run_cli.py web --port 8000
"""
import sys
from charging_station_analytics.cli.main import main

if __name__ == "__main__":
    main()
