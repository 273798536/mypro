#!/bin/bash
cd "$(dirname "$0")"
echo "工作目录: $(pwd)"
echo "Python 版本:"
python3 --version 2>&1
echo "---"
echo "语法检查:"
python3 -m py_compile models.py review_engine.py report_generator.py main.py test_scenarios.py 2>&1 && echo "语法检查通过"
echo "---"
echo "运行测试:"
python3 test_scenarios.py 2>&1
