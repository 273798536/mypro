"""边界样例数据生成器 - 生成特征尺度错、空簇、异常值拉偏等测试数据"""

import numpy as np
import pandas as pd
import os


def generate_scale_mismatch_data(output_path: str = None) -> pd.DataFrame:
    """
    生成特征尺度错误的数据（特征量级差异巨大）
    
    场景：收入是万元级，消费评分是0-100级，未标准化直接聚类会导致收入主导
    """
    np.random.seed(42)
    n_samples = 200

    data = pd.DataFrame({
        'customer_id': [f'C{i:03d}' for i in range(1, n_samples + 1)],
        'annual_income': np.random.choice([50000, 150000, 500000], n_samples),
        'spending_score': np.random.uniform(0, 100, n_samples),
        'age': np.random.randint(18, 70, n_samples)
    })

    if output_path:
        data.to_csv(output_path, index=False, encoding='utf-8-sig')

    return data


def generate_outlier_bias_data(output_path: str = None) -> pd.DataFrame:
    """
    生成异常值拉偏的数据
    
    场景：几个超级大客户的异常值会拉偏整个聚类中心
    """
    np.random.seed(42)
    n_samples = 195

    normal_data = pd.DataFrame({
        'customer_id': [f'C{i:03d}' for i in range(1, n_samples + 1)],
        'purchase_amount': np.random.normal(1000, 300, n_samples),
        'visit_frequency': np.random.normal(10, 3, n_samples),
        'customer_satisfaction': np.random.normal(7, 1.5, n_samples)
    })

    outlier_data = pd.DataFrame({
        'customer_id': [f'C{i:03d}' for i in range(n_samples + 1, n_samples + 6)],
        'purchase_amount': [50000, 45000, 60000, 55000, 48000],
        'visit_frequency': [2, 3, 1, 2, 1],
        'customer_satisfaction': [9.5, 9.8, 9.2, 9.7, 9.9]
    })

    data = pd.concat([normal_data, outlier_data], ignore_index=True)

    if output_path:
        data.to_csv(output_path, index=False, encoding='utf-8-sig')

    return data


def generate_empty_cluster_data(output_path: str = None) -> pd.DataFrame:
    """
    生成可能导致空簇的数据
    
    场景：数据分布极不均匀，K值设置过大时容易产生空簇
    """
    np.random.seed(42)

    group1 = pd.DataFrame({
        'customer_id': [f'G1_{i:02d}' for i in range(1, 96)],
        'feature1': np.random.normal(0, 0.5, 95),
        'feature2': np.random.normal(0, 0.5, 95),
    })

    group2 = pd.DataFrame({
        'customer_id': [f'G2_{i:02d}' for i in range(1, 6)],
        'feature1': np.random.normal(10, 0.5, 5),
        'feature2': np.random.normal(10, 0.5, 5),
    })

    data = pd.concat([group1, group2], ignore_index=True)

    if output_path:
        data.to_csv(output_path, index=False, encoding='utf-8-sig')

    return data


def generate_high_skewness_data(output_path: str = None) -> pd.DataFrame:
    """
    生成高偏度数据
    
    场景：收入、消费等通常呈长尾分布，需要对数变换
    """
    np.random.seed(42)
    n_samples = 500

    data = pd.DataFrame({
        'customer_id': [f'C{i:03d}' for i in range(1, n_samples + 1)],
        'monthly_spend': np.random.lognormal(mean=5, sigma=1.2, size=n_samples),
        'transaction_count': np.random.poisson(lam=5, size=n_samples),
        'last_purchase_days': np.random.exponential(scale=30, size=n_samples)
    })

    if output_path:
        data.to_csv(output_path, index=False, encoding='utf-8-sig')

    return data


def generate_mixed_issues_data(output_path: str = None) -> pd.DataFrame:
    """
    生成包含多种问题的综合测试数据
    
    场景：同时存在尺度不匹配、异常值、高偏度
    """
    np.random.seed(42)
    n_samples = 400

    data = pd.DataFrame({
        'customer_id': [f'C{i:03d}' for i in range(1, n_samples + 1)],
        'total_spend': np.concatenate([
            np.random.lognormal(mean=6, sigma=1, size=n_samples - 5),
            [1000000, 950000, 1100000, 890000, 1050000]
        ]),
        'transaction_count': np.random.randint(1, 50, n_samples),
        'avg_order_value': np.concatenate([
            np.random.uniform(10, 500, n_samples - 3),
            [50000, 45000, 48000]
        ]),
        'customer_tenure_days': np.random.randint(1, 3650, n_samples)
    })

    if output_path:
        data.to_csv(output_path, index=False, encoding='utf-8-sig')

    return data


def generate_all_boundary_cases(output_dir: str = 'test_data'):
    """生成所有边界样例数据"""

    os.makedirs(output_dir, exist_ok=True)

    print("🔧 生成边界样例数据...")

    generate_scale_mismatch_data(os.path.join(output_dir, 'scale_mismatch.csv'))
    print(f"  ✅ 特征尺度不匹配: {output_dir}/scale_mismatch.csv")

    generate_outlier_bias_data(os.path.join(output_dir, 'outlier_bias.csv'))
    print(f"  ✅ 异常值拉偏: {output_dir}/outlier_bias.csv")

    generate_empty_cluster_data(os.path.join(output_dir, 'empty_cluster.csv'))
    print(f"  ✅ 空簇场景: {output_dir}/empty_cluster.csv")

    generate_high_skewness_data(os.path.join(output_dir, 'high_skewness.csv'))
    print(f"  ✅ 高偏度数据: {output_dir}/high_skewness.csv")

    generate_mixed_issues_data(os.path.join(output_dir, 'mixed_issues.csv'))
    print(f"  ✅ 综合问题数据: {output_dir}/mixed_issues.csv")

    print("\n🎉 所有边界样例数据生成完成!")


if __name__ == '__main__':
    generate_all_boundary_cases()
