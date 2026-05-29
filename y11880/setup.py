from setuptools import setup, find_packages

setup(
    name="kmeans-explainer",
    version="1.0.0",
    description="KMeans分群讲解台 - 可解释的客户分群命令行工具",
    author="运营分析师团队",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.21.0",
        "pandas>=1.3.0",
        "scikit-learn>=1.0.0",
        "scipy>=1.7.0",
        "jinja2>=3.0.0",
        "pyyaml>=6.0",
        "click>=8.0.0",
        "tabulate>=0.8.9",
    ],
    entry_points={
        "console_scripts": [
            "kmeans-explainer=kmeans_explainer.cli:main",
        ],
    },
    python_requires=">=3.8",
)
