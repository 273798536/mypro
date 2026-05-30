from setuptools import setup, find_packages

setup(
    name="pricing-fit",
    version="1.0.0",
    description="Nonlinear pricing fitting tool for SaaS business analysis",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.24.0",
        "pandas>=2.0.0",
        "scipy>=1.10.0",
        "matplotlib>=3.7.0",
        "seaborn>=0.12.0",
        "click>=8.1.0",
        "jinja2>=3.1.0",
        "scikit-learn>=1.3.0",
    ],
    entry_points={
        "console_scripts": [
            "pricing-fit=pricing_fit.cli:cli",
        ],
    },
    python_requires=">=3.9",
)
