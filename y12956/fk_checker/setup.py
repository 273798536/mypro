from setuptools import setup, find_packages

setup(
    name="fk-checker",
    version="1.0.0",
    description="外键断链排查器 - 数据库外键完整性检测与分析工具",
    packages=find_packages(),
    install_requires=[
        "pymysql>=1.1.0",
        "click>=8.1.0",
        "tabulate>=0.9.0",
        "pyyaml>=6.0",
    ],
    entry_points={
        "console_scripts": [
            "fk-checker=fk_checker.cli:cli",
        ],
    },
    python_requires=">=3.8",
)
