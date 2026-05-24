from setuptools import setup, find_packages

setup(
    name="finance-audit-cli",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "click>=8.0.0",
        "PyPDF2>=3.0.0",
        "pandas>=2.0.0",
        "openpyxl>=3.1.0",
        "python-dateutil>=2.8.0",
        "tabulate>=0.9.0",
    ],
    entry_points={
        "console_scripts": [
            "finance-audit=finance_audit.cli:cli",
        ],
    },
    author="Finance Audit Team",
    description="财务报销稽核多源导入巡检工具",
    keywords="finance audit reimbursement inspection",
)
