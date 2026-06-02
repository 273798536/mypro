#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import numpy as np
import pandas as pd
from pathlib import Path

from data_manager import DataManager
from correlation_analyzer import CorrelationAnalyzer
from spurious_correlation_detector import SpuriousCorrelationDetector


def test_edge_case():
    print("=" * 80)
    print("  边界情况测试: 异常点拉高的伪相关")
    print("=" * 80)
    
    np.random.seed(42)
    n_samples = 50
    
    sample_ids = [f"S{i:03d}" for i in range(1, n_samples + 1)]
    
    x = np.random.normal(0, 1, n_samples)
    y = np.random.normal(0, 1, n_samples)
    
    print(f"\n原始数据: x 和 y 独立随机，真实相关系数接近 0")
    print(f"原始相关: {np.corrcoef(x, y)[0, 1]:.4f}")
    
    outlier_idx = [0, 1, 2]
    for idx in outlier_idx:
        x[idx] = 10
        y[idx] = 10
    
    print(f"\n加入 {len(outlier_idx)} 个极端异常点 (x=10, y=10)")
    print(f"异常样本: {[sample_ids[i] for i in outlier_idx]}")
    print(f"含异常的相关: {np.corrcoef(x, y)[0, 1]:.4f}")
    
    test_dir = Path("./edge_case_data")
    test_dir.mkdir(exist_ok=True)
    
    df = pd.DataFrame({
        'sample_id': sample_ids,
        'feature_x': x,
        'feature_y': y
    })
    df.to_csv(test_dir / "metrics.csv", index=False)
    
    dm = DataManager(data_dir="./edge_case_data")
    dm.import_metrics(test_dir / "metrics.csv", id_col="sample_id", overwrite=True)
    
    print("\n1. 运行相关性分析...")
    ca = CorrelationAnalyzer(dm)
    ca.analyze_all_pairs()
    
    for p in ca.corr_results['pairs']:
        print(f"   {p['metric1']} vs {p['metric2']}:")
        print(f"     原始相关: {p['correlation']:.4f} (p={p['p_value']:.6f})")
        print(f"     剔除异常后: {p['corr_without_outliers']:.4f}")
        print(f"     变化量: {p['correlation_diff']:.4f}")
        print(f"     显著: {p['significant']}")
    
    print("\n2. 运行热力假象检测 (宽松阈值)...")
    scd = SpuriousCorrelationDetector(ca)
    scd.detect_spurious_correlations(
        corr_diff_threshold=0.1,
        leverage_threshold=0.05,
        cooks_d_threshold=0.1
    )
    
    summary = scd.get_summary()
    print(f"   发现假象: {summary['spurious_count']} 对")
    print(f"   高风险: {summary['high_risk_count']} 对")
    
    if summary['high_risk_pairs']:
        for p in summary['high_risk_pairs']:
            print(f"\n   高风险假象: {p['metric1']} vs {p['metric2']}")
            print(f"     类型: {p['spurious_type']}")
            print(f"     原始相关: {p['original_corr']:.4f}")
            print(f"     剔除后: {p['clean_corr']:.4f}")
            print(f"     下降: {p['corr_drop']:.4f}")
            print(f"     关键异常点: {', '.join(p['key_outliers'])}")
    
    print("\n3. 追溯详情:")
    audit = scd.get_audit_trail('feature_x', 'feature_y')
    if audit:
        print(f"   样本数: {audit['n_samples']}")
        print(f"   原始P值: {audit['original_p_value']:.6f}")
        print(f"   剔除后P值: {audit['clean_p_value']:.6f}")
        print(f"   异常点: {', '.join(audit['influential_sample_ids'])}")
        
        orig_sig = audit['original_p_value'] < 0.05
        clean_sig = audit['clean_p_value'] < 0.05
        print(f"   显著性变化: {orig_sig} -> {clean_sig}")
        if orig_sig and not clean_sig:
            print("   ⚠️  显著性消失！这是典型的异常点驱动的伪相关")
    
    raw_data = scd.get_raw_data_for_pair('feature_x', 'feature_y')
    print(f"\n4. 原始明细数据 (含异常标记):")
    print(raw_data.sort_values('is_influential', ascending=False).head(10).to_string(index=False))
    
    print("\n" + "=" * 80)
    print("  边界情况测试完成!")
    print("=" * 80)


if __name__ == "__main__":
    test_edge_case()
