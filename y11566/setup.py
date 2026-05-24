from setuptools import setup, find_packages

setup(
    name='lighting-inspection-cli',
    version='1.0.0',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'click>=8.0.0',
        'sqlalchemy>=1.4.0',
        'pandas>=1.5.0',
        'openpyxl>=3.0.0',
        'pillow>=9.0.0',
        'python-dateutil>=2.8.0',
        'tabulate>=0.8.0',
        'pyyaml>=6.0',
    ],
    entry_points={
        'console_scripts': [
            'lighting=lighting_cli.main:cli',
        ],
    },
    author='City Lighting Team',
    description='城市照明抢修多源导入巡检 CLI',
    keywords='lighting inspection repair cli',
    python_requires='>=3.8',
)
