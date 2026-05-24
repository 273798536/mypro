from setuptools import setup, find_packages

setup(
    name="store-member-storage-inspector",
    version="1.0.0",
    description="门店会员储值多源导入巡检CLI工具",
    packages=find_packages(),
    install_requires=[
        "click>=8.1.7",
        "sqlalchemy>=2.0.25",
        "pandas>=2.2.0",
        "openpyxl>=3.1.2",
        "tabulate>=0.9.0",
    ],
    entry_points={
        "console_scripts": [
            "ms-inspect=inspector.cli:cli",
        ],
    },
    python_requires=">=3.10",
)
