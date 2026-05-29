"""KMeans分群讲解台 - 单元测试"""

import os
import sys
import tempfile
import unittest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kmeans_explainer.data_loader import DataLoader
from kmeans_explainer.standardization import StandardizationManager, StandardizationRule
from kmeans_explainer.merge_diff import MergeDiffDetector, ConflictResolution
from kmeans_explainer.kmeans_clustering import KMeansClusterer
from kmeans_explainer.boundary_detector import BoundaryDetector
from kmeans_explainer.quality_evaluator import QualityEvaluator
from kmeans_explainer.report_generator import ReportGenerator


class TestDataLoader(unittest.TestCase):
    """数据加载器测试"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.test_data = pd.DataFrame({
            'customer_id': ['C001', 'C002', 'C003', 'C004', 'C005'],
            'age': [25, 30, 35, 40, 45],
            'income': [50000, 60000, 70000, 80000, 90000],
            'spending_score': [80, 70, 60, 50, 40]
        })
        self.csv_path = os.path.join(self.test_dir, 'test_data.csv')
        self.test_data.to_csv(self.csv_path, index=False)

    def test_load_csv(self):
        loader = DataLoader(self.csv_path)
        data = loader.load()
        self.assertEqual(len(data), 5)
        self.assertEqual(len(data.columns), 4)

    def test_get_numeric_columns(self):
        loader = DataLoader(self.csv_path)
        loader.load()
        numeric_cols = loader.get_numeric_columns()
        self.assertIn('age', numeric_cols)
        self.assertIn('income', numeric_cols)
        self.assertNotIn('customer_id', numeric_cols)

    def tearDown(self):
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)


class TestStandardization(unittest.TestCase):
    """标准化测试"""

    def setUp(self):
        self.test_data = pd.DataFrame({
            'feature1': np.random.normal(100, 20, 100),
            'feature2': np.random.uniform(0, 1, 100),
            'feature3': np.random.lognormal(3, 0.5, 100)
        })

    def test_standardization_rule(self):
        rule = StandardizationRule('feature1', method='standard')
        rule.fit(self.test_data['feature1'])
        transformed = rule.transform(self.test_data['feature1'])
        self.assertAlmostEqual(transformed.mean(), 0, places=1)
        self.assertAlmostEqual(transformed.std(), 1, places=1)

    def test_manager_fit_transform(self):
        manager = StandardizationManager()
        manager.add_rules_from_dict({
            'feature1': {'method': 'standard'},
            'feature2': {'method': 'minmax'}
        })
        transformed = manager.fit_transform(self.test_data)
        self.assertEqual(transformed.shape, self.test_data.shape)

    def test_detect_scale_issues(self):
        data = pd.DataFrame({
            'normal_feature': np.random.normal(0, 1, 100),
            'large_range_feature': np.random.uniform(0, 2e6, 100)
        })
        manager = StandardizationManager()
        issues = manager.detect_scale_issues(data)
        self.assertIn('large_range_feature', issues)


class TestMergeDiff(unittest.TestCase):
    """合并差异检测测试"""

    def setUp(self):
        self.data = pd.DataFrame({
            'feature1': np.random.normal(0, 1, 50),
            'feature2': np.random.normal(0, 1, 50),
            'feature3': np.random.normal(0, 1, 50)
        })
        self.manager = StandardizationManager()
        self.manager.add_rules_from_dict({
            'feature1': {'method': 'standard'},
            'feature2': {'method': 'minmax'},
            'feature4': {'method': 'standard'}
        })

    def test_detect_diffs(self):
        detector = MergeDiffDetector(self.data, self.manager)
        diffs = detector.detect_all()
        summary = detector.get_diff_summary()
        self.assertGreater(summary['total_diffs'], 0)

    def test_resolve_conflicts_merge(self):
        detector = MergeDiffDetector(self.data, self.manager)
        detector.detect_all()
        resolved = detector.resolve_conflicts(ConflictResolution.MERGE)
        self.assertIn('feature1', resolved)
        self.assertIn('feature3', resolved)


class TestKMeansClustering(unittest.TestCase):
    """KMeans聚类测试"""

    def setUp(self):
        np.random.seed(42)
        group1 = pd.DataFrame({
            'feature1': np.random.normal(0, 0.5, 50),
            'feature2': np.random.normal(0, 0.5, 50)
        })
        group2 = pd.DataFrame({
            'feature1': np.random.normal(5, 0.5, 50),
            'feature2': np.random.normal(5, 0.5, 50)
        })
        self.data = pd.concat([group1, group2], ignore_index=True)

    def test_basic_clustering(self):
        clusterer = KMeansClusterer(n_clusters=2, random_state=42, handle_outliers=False)
        clusterer.fit(self.data)
        self.assertEqual(len(clusterer.labels_), 100)
        self.assertEqual(len(clusterer.cluster_sizes_), 2)

    def test_reproducibility(self):
        clusterer1 = KMeansClusterer(n_clusters=2, random_state=42)
        clusterer1.fit(self.data)
        labels1 = clusterer1.labels_.copy()

        clusterer2 = KMeansClusterer(n_clusters=2, random_state=42)
        clusterer2.fit(self.data)
        labels2 = clusterer2.labels_.copy()

        np.testing.assert_array_equal(labels1, labels2)

    def test_outlier_detection(self):
        data_with_outliers = self.data.copy()
        data_with_outliers.loc[0] = [100, 100]
        data_with_outliers.loc[1] = [-100, -100]

        clusterer = KMeansClusterer(n_clusters=2, handle_outliers=True)
        clusterer.fit(data_with_outliers)
        self.assertGreater(clusterer.outlier_mask_.sum(), 0)

    def test_cluster_explanations(self):
        clusterer = KMeansClusterer(n_clusters=2, random_state=42)
        clusterer.fit(self.data)
        explanations = clusterer.explain_cluster_reasons(top_n_features=2)
        self.assertEqual(len(explanations), 2)
        self.assertIn('feature', explanations[0][0])


class TestBoundaryDetector(unittest.TestCase):
    """边界检测测试"""

    def test_scale_mismatch(self):
        data = pd.DataFrame({
            'normal': np.random.normal(0, 1, 100),
            'large_scale': np.random.uniform(0, 2e6, 100)
        })
        detector = BoundaryDetector()
        issues = detector.detect_all(data)
        summary = detector.get_issue_summary()
        self.assertGreater(summary['total_issues'], 0)

    def test_high_skewness(self):
        data = pd.DataFrame({
            'skewed_feature': np.random.lognormal(0, 2, 100)
        })
        detector = BoundaryDetector(skewness_threshold=1.0)
        issues = detector.detect_all(data)
        types = [issue['type'] for issue in issues]
        self.assertIn('high_skewness', types)

    def test_extreme_values(self):
        data = pd.DataFrame({
            'feature': np.concatenate([np.random.normal(0, 1, 95), [10, 11, 12, 13, 14]])
        })
        detector = BoundaryDetector(outlier_zscore_threshold=3.0)
        issues = detector.detect_all(data)
        types = [issue['type'] for issue in issues]
        self.assertIn('extreme_value', types)


class TestQualityEvaluator(unittest.TestCase):
    """质量评估测试"""

    def setUp(self):
        np.random.seed(42)
        self.data = np.concatenate([
            np.random.normal(0, 0.5, (50, 2)),
            np.random.normal(5, 0.5, (50, 2))
        ])
        self.labels = np.array([0] * 50 + [1] * 50)

    def test_evaluate(self):
        evaluator = QualityEvaluator()
        metrics = evaluator.evaluate(self.data, self.labels)
        self.assertIsNotNone(metrics['silhouette_score'])
        self.assertGreater(metrics['silhouette_score'], 0.5)

    def test_find_best_k(self):
        evaluator = QualityEvaluator()
        result = evaluator.find_best_k(self.data, k_range=(2, 5))
        self.assertIn('best_k_silhouette', result)
        self.assertEqual(result['best_k_silhouette'], 2)


class TestReportGenerator(unittest.TestCase):
    """报告生成测试"""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.cluster_summary = {
            'n_clusters': 2,
            'cluster_sizes': {0: 50, 1: 50},
            'inertia': 100.0,
            'total_samples': 100,
            'cleaned_samples': 100,
            'outliers_detected': 0,
            'random_state': 42
        }
        self.quality_metrics = {
            'silhouette_score': 0.8,
            'calinski_harabasz_score': 500.0,
            'davies_bouldin_score': 0.3,
            'cluster_silhouette_scores': {0: 0.85, 1: 0.75},
            'interpretation': {'silhouette': '优秀'}
        }
        self.cluster_explanations = {
            0: [{'feature': 'f1', 'difference': 1.0, 'direction': '高于均值'}],
            1: [{'feature': 'f1', 'difference': -1.0, 'direction': '低于均值'}]
        }
        self.cluster_details = pd.DataFrame({
            'feature1': np.random.rand(100),
            'feature2': np.random.rand(100),
            'cluster': [0] * 50 + [1] * 50,
            'is_outlier': [False] * 100
        })
        self.centers_df = pd.DataFrame({
            'feature1': [0.2, 0.8],
            'feature2': [0.8, 0.2]
        })

    def test_generate_all_reports(self):
        reporter = ReportGenerator(output_dir=self.test_dir)
        files = reporter.generate_all_reports(
            base_name='test',
            cluster_details=self.cluster_details,
            cluster_summary=self.cluster_summary,
            quality_metrics=self.quality_metrics,
            cluster_explanations=self.cluster_explanations,
            centers_df=self.centers_df
        )

        self.assertTrue(os.path.exists(files['report']))
        self.assertTrue(os.path.exists(files['result']))
        self.assertTrue(os.path.exists(files['csv']))
        self.assertTrue(os.path.exists(files['centers']))

    def tearDown(self):
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
