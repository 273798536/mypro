from setuptools import setup, find_packages

setup(
    name="queue-scheduler",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "click>=8.1.0",
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "matplotlib>=3.7.0",
        "seaborn>=0.12.0",
        "rich>=13.0.0",
        "jinja2>=3.1.0",
        "openpyxl>=3.1.0",
        "scipy>=1.10.0",
    ],
    entry_points={
        "console_scripts": [
            "qs=queue_scheduler.__main__:main",
            "queue-scheduler=queue_scheduler.__main__:main",
        ],
    },
)
