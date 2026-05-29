"""
协方差矩阵修复器 - 使用示例
"""

import os
import numpy as np
import pandas as pd

from covariance_matrix_fixer import CovarianceMatrixFixer
from missing_handler import MissingMethod
from covariance_fixer import FixMethod


def generate_sample_data(output_dir: str = 'sample_data'):
    """生成示例收益率数据，包含各种问题场景"""
    os.makedirs(output_dir, exist_ok=True)
    
    np.random.seed(42)
    n_days = 252
    dates = pd.date_range('2023-01-01', periods=n_days, freq='B')
    
    n_assets_good = 8
    returns_good = np.random.randn(n_days, n_assets_good) * 0.02
    columns_good = [f'资产{i+1}' for i in range(n_assets_good)]
    df_good = pd.DataFrame(returns_good, index=dates, columns=columns_good)
    df_good.to_csv(os.path.join(output_dir, 'returns_good.csv'))
    print(f"✓ 生成正常数据: returns_good.csv ({n_assets_good}个资产)")
    
    n_assets_missing = 6
    returns_missing = np.random.randn(n_days, n_assets_missing) * 0.02
    columns_missing = [f'资产{i+10}' for i in range(n_assets_missing)]
    df_missing = pd.DataFrame(returns_missing, index=dates, columns=columns_missing)
    
    n_many_missing = int(n_days * 0.5)
    df_missing.iloc[:n_many_missing, 0] = np.nan
    df_missing.iloc[-30:, 2] = np.nan
    df_missing.iloc[:, -1] = np.nan
    
    df_missing.to_csv(os.path.join(output_dir, 'returns_with_missing.csv'))
    print(f"✓ 生成含缺失值数据: returns_with_missing.csv ({n_assets_missing}个资产)")
    
    n_assets_high_corr = 5
    base_factor = np.random.randn(n_days, 1) * 0.02
    returns_high_corr = base_factor.repeat(n_assets_high_corr, axis=1)
    returns_high_corr += np.random.randn(n_days, n_assets_high_corr) * 0.002
    columns_high_corr = [f'高度相关{i+1}' for i in range(n_assets_high_corr)]
    df_high_corr = pd.DataFrame(returns_high_corr, index=dates, columns=columns_high_corr)
    df_high_corr.to_csv(os.path.join(output_dir, 'returns_high_corr.csv'))
    print(f"✓ 生成高度相关数据: returns_high_corr.csv ({n_assets_high_corr}个资产)")
    
    print(f"\n示例数据已生成至: {output_dir}/")
    return output_dir


def run_python_api_example():
    """演示Python API使用方式"""
    print("\n" + "=" * 60)
    print("Python API 使用示例")
    print("=" * 60)
    
    sample_dir = 'sample_data'
    if not os.path.exists(sample_dir):
        generate_sample_data(sample_dir)
    
    import glob
    file_paths = glob.glob(os.path.join(sample_dir, '*.csv'))
    
    fixer = CovarianceMatrixFixer(
        missing_threshold=0.3,
        min_non_missing_obs=50,
        output_dir='example_output'
    )
    
    result = fixer.process_files(
        file_paths=file_paths,
        missing_method=MissingMethod.DROP,
        fix_method=FixMethod.NEAR_PD,
        annualize=False,
        generate_reports=True,
        generate_plots=False
    )
    
    if result['success']:
        print("\n" + "=" * 60)
        print("处理结果摘要:")
        print(f"  有效资产数: {result['valid_assets']}")
        print(f"  被拦截资产数: {result['blocked_assets']}")
        print(f"  矩阵正定: {'是' if result['is_positive_definite'] else '否'}")
        print(f"  错误数量: {result['error_count']}")
        print("=" * 60)
    
    return result


if __name__ == '__main__':
    print("协方差矩阵修复器 - 使用示例")
    print("\n请选择运行模式:")
    print("1. 生成示例数据")
    print("2. 运行Python API示例")
    print("3. 两者都执行")
    
    choice = input("\n请输入选择 (1/2/3): ").strip()
    
    if choice == '1':
        generate_sample_data()
    elif choice == '2':
        run_python_api_example()
    elif choice == '3':
        generate_sample_data()
        run_python_api_example()
    else:
        print("无效选择，生成示例数据...")
        generate_sample_data()
    
    print("\n" + "=" * 60)
    print("命令行使用方式:")
    print("  python covariance_matrix_fixer.py sample_data/ --verbose")
    print("=" * 60)
