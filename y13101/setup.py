from setuptools import setup, find_packages

setup(
    name="segment-check",
    version="1.0.0",
    description="分段回归边界校验工具 - 数据分析质量保障系统",
    packages=find_packages(),
    install_requires=[
        "click>=8.0.0",
        "pandas>=1.3.0",
        "numpy>=1.21.0",
        "tabulate>=0.8.9",
    ],
    entry_points={
        "console_scripts": [
            "segment-check=segment_check.cli:main",
        ],
    },
    python_requires=">=3.8",
)
