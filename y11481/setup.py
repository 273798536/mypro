from setuptools import setup, find_packages

setup(
    name='kitchen-inspection',
    version='1.0.0',
    packages=find_packages(),
    install_requires=[
        'click>=8.0.0',
        'tabulate>=0.9.0',
        'python-dateutil>=2.8.2',
    ],
    entry_points={
        'console_scripts': [
            'kitchen-inspect=kitchen_inspection.cli:cli',
        ],
    },
    author='Kitchen Inspection Team',
    description='中央厨房留样多源导入巡检CLI工具',
    python_requires='>=3.7',
)
