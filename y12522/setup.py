from setuptools import setup, find_packages

setup(
    name="schedule-validator",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "pydantic>=2.5.0",
        "typer>=0.9.0",
        "rich>=13.7.0",
        "pandas>=2.0.0",
        "openpyxl>=3.1.0",
    ],
    entry_points={
        "console_scripts": [
            "schedule-validator=schedule_validator.cli:main",
        ],
    },
)
