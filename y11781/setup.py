from setuptools import setup, find_packages

setup(
    name="var-calculator",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.21.0",
        "pandas>=1.3.0",
        "matplotlib>=3.4.0",
        "scipy>=1.7.0",
        "click>=8.0.0",
    ],
    entry_points={
        "console_scripts": [
            "var-cli=var_cli.main:cli",
        ],
    },
    author="Risk Management Team",
    description="Value at Risk (VaR) Calculator CLI Tool",
    python_requires=">=3.8",
)
