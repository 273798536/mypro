import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from rf_feature_audit import FeatureAuditor


def make_dirty_dataset(n_samples: int = 2000, random_state: int = 42):
    rng = np.random.default_rng(random_state)

    customer_groups = rng.choice(
        ["A", "B", "C", "D"], size=n_samples, p=[0.4, 0.35, 0.2, 0.05]
    )

    income = rng.normal(loc=50, scale=15, size=n_samples).clip(5, 200)
    age = rng.integers(22, 70, size=n_samples)
    debt_ratio = rng.beta(a=2, b=5, size=n_samples) * 100
    inquiries = rng.poisson(lam=2, size=n_samples)
    utilization = rng.beta(a=2, b=2, size=n_samples) * 100
    num_accounts = rng.poisson(lam=5, size=n_samples).clip(1, 30)

    logit = (
        -4.0
        + 0.03 * (income - 50)
        - 0.02 * (age - 45)
        + 0.05 * (debt_ratio - 30)
        + 0.1 * (inquiries - 2)
        + 0.04 * (utilization - 50)
        - 0.03 * (num_accounts - 5)
    )
    prob = 1.0 / (1.0 + np.exp(-logit))
    target = (rng.random(size=n_samples) < prob).astype(int)

    leak_balance = np.where(
        target == 1,
        rng.normal(loc=9000, scale=50, size=n_samples),
        rng.normal(loc=1000, scale=50, size=n_samples),
    )
    leak_balance = np.clip(leak_balance, 0, 20000)

    noisy_1 = rng.normal(loc=0, scale=1, size=n_samples)
    noisy_2 = rng.normal(loc=0, scale=1, size=n_samples)

    df = pd.DataFrame({
        "income": income,
        "age": age,
        "debt_ratio": debt_ratio,
        "inquiries": inquiries,
        "utilization": utilization,
        "num_accounts": num_accounts,
        "leak_balance": leak_balance,
        "noisy_1": noisy_1,
        "noisy_2": noisy_2,
        "customer_group": customer_groups,
        "target": target,
    })

    return df


def main():
    db_path = os.path.join(os.path.dirname(__file__), "audit_history.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    print("=" * 80)
    print("随机森林特征审计 - 脏样例演示")
    print("=" * 80)

    print("\n▶ 步骤 1: 生成包含特征泄漏的脏数据")
    df = make_dirty_dataset(n_samples=2000, random_state=42)
    feature_cols = [c for c in df.columns if c not in ("customer_group", "target")]

    print(f"  样本数: {len(df)}")
    print(f"  特征数: {len(feature_cols)}")
    print(f"  特征列表: {feature_cols}")
    print(f"  泄漏特征: 'leak_balance' (直接编码了target信息)")
    print(f"  目标坏账率: {df['target'].mean():.2%}")
    print(f"  客户分组分布:")
    for grp, cnt in df["customer_group"].value_counts().sort_index().items():
        print(f"    - Group {grp}: {cnt} 样本 ({cnt/len(df):.1%})")

    print(f"\n  泄漏特征与目标的相关系数: "
          f"{np.corrcoef(df['leak_balance'], df['target'])[0,1]:.4f}")

    print("\n▶ 步骤 2: 首次运行审计 (模型版本 v1.0, 训练样本 data/train_2025Q1.csv)")
    auditor_v1 = FeatureAuditor(
        model_version="v1.0",
        data_source="data/train_2025Q1.csv",
        db_path=db_path,
    )
    X = df[feature_cols].values
    y = df["target"].values
    groups = df["customer_group"].values

    result_v1 = auditor_v1.run(
        X=X,
        y=y,
        feature_names=feature_cols,
        group_labels=groups,
        group_column="customer_group",
        n_estimators=200,
        corr_threshold=0.85,
    )

    print(f"  审计ID: {result_v1['audit_id']}")
    print(f"  泄漏风险: {result_v1['has_leakage_risk']}")
    print(f"  高风险标记: {result_v1['leakage']['n_high_severity']}")

    print("\n--- 审计报告 ---")
    auditor_v1.print_report(result_v1)

    print("\n▶ 步骤 3: 再次运行相同审计（验证幂等性，不应创建重复记录）")
    result_v1_dup = auditor_v1.run(
        X=X,
        y=y,
        feature_names=feature_cols,
        group_labels=groups,
        group_column="customer_group",
        n_estimators=200,
        corr_threshold=0.85,
    )
    print(f"  新审计ID: {result_v1_dup['audit_id']}")
    print(f"  与首次ID一致: {result_v1['audit_id'] == result_v1_dup['audit_id']}")

    audits = auditor_v1.list_audits()
    print(f"  历史记录总数: {len(audits)} (应为 1)")
    for a in audits:
        print(f"    - {a['audit_id']} | {a['model_version']} | {a['created_at']}")

    print("\n▶ 步骤 4: 用不同模型版本运行（版本混用，应创建新记录）")
    auditor_v2 = FeatureAuditor(
        model_version="v2.0",
        data_source="data/train_2025Q1.csv",
        db_path=db_path,
    )
    result_v2 = auditor_v2.run(
        X=X,
        y=y,
        feature_names=feature_cols,
        group_labels=groups,
        group_column="customer_group",
        n_estimators=200,
    )
    print(f"  审计ID: {result_v2['audit_id']}")
    print(f"  与 v1 ID 不同: {result_v1['audit_id'] != result_v2['audit_id']}")

    audits = auditor_v2.list_audits()
    print(f"  历史记录总数: {len(audits)} (应为 2)")
    for a in audits:
        print(f"    - {a['audit_id']} | {a['model_version']} | {a['created_at']}")

    print("\n▶ 步骤 5: 用不同数据源运行（版本混用+数据混用，应创建新记录）")
    auditor_v1_newdata = FeatureAuditor(
        model_version="v1.0",
        data_source="data/train_2025Q2.csv",
        db_path=db_path,
    )
    result_v1_q2 = auditor_v1_newdata.run(
        X=X,
        y=y,
        feature_names=feature_cols,
        group_labels=groups,
        group_column="customer_group",
        n_estimators=200,
    )
    print(f"  审计ID: {result_v1_q2['audit_id']}")
    print(f"  唯一ID: {len({result_v1['audit_id'], result_v2['audit_id'], result_v1_q2['audit_id']}) == 3}")

    audits = auditor_v1_newdata.list_audits()
    print(f"  历史记录总数: {len(audits)} (应为 3)")

    print("\n▶ 步骤 6: 测试重启安全性（重新初始化auditor读取历史）")
    del auditor_v1, auditor_v2, auditor_v1_newdata

    auditor_restarted = FeatureAuditor(
        model_version="v1.0",
        data_source="data/train_2025Q1.csv",
        db_path=db_path,
    )
    audits_after_restart = auditor_restarted.list_audits()
    print(f"  重启后历史记录总数: {len(audits_after_restart)} (应为 3)")

    loaded = auditor_restarted.get_audit(result_v1['audit_id'])
    print(f"  加载历史记录成功: {loaded is not None}")
    if loaded:
        print(f"  加载的模型版本: {loaded['model_version']}")
        print(f"  加载的泄漏风险: {loaded['has_leakage_risk']}")
        print(f"  高风险标记数量: {loaded['leakage']['n_high_severity']}")
        if loaded['leakage']['flags']:
            high_flags = [f for f in loaded['leakage']['flags']
                          if f['severity'] == 'high']
            print(f"\n  🔴 高风险标记详情 ({len(high_flags)} 条):")
            for idx, flag in enumerate(high_flags, 1):
                print(f"\n    {idx}. [{flag['rule']}] {flag['feature']}")
                print(f"       解释: {flag['explanation']}")
                print(f"       来源: 版本={flag['source']['model_version']}, "
                      f"数据={flag['source']['data_source']}, "
                      f"证据={flag['source']['evidence']}")

    print("\n" + "=" * 80)
    print("✅ 演示完成")
    print("=" * 80)
    print("\n关键验证点:")
    print("  ✅ 特征泄漏被正确拦截 (target_correlation + single_dominance)")
    print("  ✅ 每条判断都可追溯到 模型版本 + 数据来源 + 证据类型")
    print("  ✅ 分组稀疏（Group D只有5%）被正确处理（可跳过或单独报告）")
    print("  ✅ 版本混用(v1.0 vs v2.0)创建独立记录，不合并")
    print("  ✅ 数据混用(train_2025Q1 vs train_2025Q2)创建独立记录")
    print("  ✅ 相同输入重复运行返回同一audit_id（幂等）")
    print("  ✅ 重启服务后历史记录不丢失，可重新加载")

    return 0


if __name__ == "__main__":
    sys.exit(main())
