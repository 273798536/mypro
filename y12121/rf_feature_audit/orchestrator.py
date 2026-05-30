from typing import Optional, List, Dict, Any
import numpy as np
import pandas as pd

from .persistence import AuditStore
from .importance import compute_importance
from .group_compare import compare_groups
from .leakage import detect_leakage


class FeatureAuditor:
    def __init__(
        self,
        model_version: str,
        data_source: str,
        db_path: str = "audit_history.db",
        random_state: int = 42,
    ):
        self.model_version = model_version
        self.data_source = data_source
        self.store = AuditStore(db_path)
        self.random_state = random_state
        self.last_result: Optional[Dict[str, Any]] = None

    def run(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: List[str],
        group_labels: Optional[np.ndarray] = None,
        group_column: Optional[str] = None,
        n_estimators: int = 200,
        corr_threshold: float = 0.85,
        divergence_threshold: float = 0.15,
        min_group_size: int = 30,
        importance_top_k: float = 0.5,
        single_dominance_ratio: float = 0.35,
    ) -> Dict[str, Any]:
        if X.shape[1] != len(feature_names):
            raise ValueError(
                f"X has {X.shape[1]} columns but {len(feature_names)} feature names provided"
            )
        if X.shape[0] != len(y):
            raise ValueError(
                f"X has {X.shape[0]} rows but y has {len(y)} entries"
            )
        if group_labels is not None:
            if len(group_labels) != X.shape[0]:
                raise ValueError(
                    f"group_labels has {len(group_labels)} entries but X has {X.shape[0]} rows"
                )
            if group_column is None:
                raise ValueError(
                    "group_column must be provided when group_labels is given"
                )

        importance = compute_importance(
            X, y, feature_names,
            model_version=self.model_version,
            data_source=self.data_source,
            n_estimators=n_estimators,
            random_state=self.random_state,
        )

        group_result = None
        if group_labels is not None and group_column is not None:
            group_result = compare_groups(
                X, y, feature_names, group_labels,
                model_version=self.model_version,
                data_source=self.data_source,
                group_column=group_column,
                min_group_size=min_group_size,
                divergence_threshold=divergence_threshold,
                n_estimators=n_estimators,
                random_state=self.random_state,
            )

        leakage = detect_leakage(
            X, y, feature_names,
            model_version=self.model_version,
            data_source=self.data_source,
            importance_result=importance,
            group_result=group_result,
            corr_threshold=corr_threshold,
            importance_top_k=importance_top_k,
            single_dominance_ratio=single_dominance_ratio,
        )

        audit_id = self.store.save(
            model_version=self.model_version,
            data_source=self.data_source,
            feature_list=feature_names,
            group_column=group_column,
            importance_result=importance,
            group_result=group_result,
            leakage_result=leakage,
        )

        result = {
            "audit_id": audit_id,
            "model_version": self.model_version,
            "data_source": self.data_source,
            "importance": importance,
            "group": group_result,
            "leakage": leakage,
            "has_leakage_risk": leakage.get("has_leakage_risk", False),
            "duplicate": False,
        }

        existing = self.store.load(audit_id)
        if existing and existing["fingerprint"] == self.store._make_fingerprint(
            self.model_version, self.data_source, feature_names, group_column
        ):
            if existing["created_at"] != result.get("created_at"):
                pass

        self.last_result = result
        return result

    def get_audit(self, audit_id: str) -> Optional[Dict[str, Any]]:
        rec = self.store.load(audit_id)
        if rec is None:
            return None
        return {
            "audit_id": rec["audit_id"],
            "model_version": rec["model_version"],
            "data_source": rec["data_source"],
            "importance": rec["importance_result"],
            "group": rec["group_result"],
            "leakage": rec["leakage_result"],
            "has_leakage_risk": rec["leakage_result"].get("has_leakage_risk", False),
            "created_at": rec["created_at"],
            "fingerprint": rec["fingerprint"],
        }

    def list_audits(self) -> List[Dict[str, Any]]:
        return self.store.list_runs()

    def print_report(self, result: Optional[Dict[str, Any]] = None,
                     top_n: int = 10):
        r = result or self.last_result
        if r is None:
            print("No result available. Run .run() first.")
            return

        print("=" * 80)
        print(f"随机森林特征审计报告")
        print("=" * 80)
        print(f"审计ID:       {r['audit_id']}")
        print(f"模型版本:     {r['model_version']}")
        print(f"数据来源:     {r['data_source']}")
        print(f"泄漏风险:     {'⚠️  HIGH' if r['has_leakage_risk'] else '✅ OK'}")
        print()

        print("-" * 80)
        print(f"【1】特征重要性 Top-{top_n}")
        print("-" * 80)
        ranked = r["importance"]["ranked_features"]
        header = f"{'排名':<6}{'特征':<30}{'重要性':>12}{'占比(%)':>10}{'累计(%)':>10}{'来源版本':>15}"
        print(header)
        print("-" * 80)
        for idx, item in enumerate(ranked[:top_n], 1):
            src = item["source"]["model_version"]
            print(f"{idx:<6}{item['feature']:<30}{item['importance']:>12.4f}"
                  f"{item['importance_pct']:>10.2f}{item['cumulative_pct']:>10.2f}"
                  f"{src:>15}")

        if r["group"]:
            print()
            print("-" * 80)
            print("【2】分组对比 - 跨组发散特征")
            print("-" * 80)
            grp = r["group"]
            print(f"分组列: {grp['group_column']} | 总组数: {grp['n_groups_total']} | "
                  f"有效组: {grp['n_groups_valid']}")
            print(f"发散特征数: {grp['n_divergent_features']} (阈值 CV > {grp['divergence_threshold']})")
            div = grp["divergence_report"]
            div_divergent = [d for d in div if d["divergent"]]
            if div_divergent:
                header = f"{'特征':<25}{'平均重要性':>14}{'CV':>10}{'发散':>8}"
                print(header)
                print("-" * 80)
                for d in div_divergent[:top_n]:
                    tag = "⚠️ YES" if d["divergent"] else "OK"
                    print(f"{d['feature']:<25}{d['mean_importance']:>14.4f}"
                          f"{d['cv']:>10.4f}{tag:>8}")
                    for g_name, g_imp in d["per_group"].items():
                        print(f"  └─ group '{g_name}': {g_imp:.4f}")
            else:
                print("✅ 未发现跨组发散特征。")

        print()
        print("-" * 80)
        print("【3】泄漏检测")
        print("-" * 80)
        lk = r["leakage"]
        print(f"高风险: {lk['n_high_severity']} | 中风险: {lk['n_medium_severity']}")
        if lk["flags"]:
            for f in lk["flags"]:
                sev_icon = "🔴" if f["severity"] == "high" else "🟡"
                print(f"\n{sev_icon} [{f['severity'].upper()}] {f['rule']}: {f['feature']}")
                print(f"   解释: {f['explanation']}")
                print(f"   详情: {f['detail']}")
                src = f["source"]
                print(f"   来源: 版本={src['model_version']} | 数据={src['data_source']} | "
                      f"证据={src['evidence']}")
        else:
            print("✅ 未检测到特征泄漏风险。")

        print()
        print("=" * 80)
        print("审计完成。")
        print("=" * 80)
