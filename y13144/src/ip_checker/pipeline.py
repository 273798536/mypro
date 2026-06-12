"""完整验算流水线 - 整合所有模块，一键执行"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from typing import Dict, List, Any, Optional

from .models import DataSource, VerificationStatus
from .unit_system import UnitSystem
from .field_mapper import FieldMapper
from .calculation_spec import CalculationSpecManager, CalculationRule
from .verification_engine import VerificationEngine
from .audit_trail import AuditTrail
from .report_generator import ReportGenerator


class VerificationPipeline:
    def __init__(self, output_dir: str = "./examples"):
        self.unit_system = UnitSystem()
        self.field_mapper = FieldMapper()
        self.spec_manager = CalculationSpecManager()
        self.engine = VerificationEngine(self.unit_system, self.spec_manager, tolerance=0.01)
        self.audit_trail = AuditTrail("./data/audit_log.json")
        self.report_generator = ReportGenerator(output_dir=output_dir)
        self.all_results: List[pd.DataFrame] = []
        self.context_id: Optional[str] = None

    def create_context(
        self,
        reviewer: str = "建模助教小岑",
        description: str = "整数规划批量验算",
        source_documents: Optional[List[str]] = None,
        assumptions: Optional[Dict[str, Any]] = None,
    ) -> str:
        ctx = self.spec_manager.create_context(
            reviewer=reviewer,
            description=description,
            source_documents=source_documents or [
                "draft_reviewer_A.csv",
                "draft_reviewer_B.csv",
                "draft_manual_entry.csv",
                "system_export.csv",
                "boundary_cases.csv",
            ],
            assumptions=assumptions or {
                "税率默认": "13%，如遇9%税率按实际计算",
                "单位默认": "元",
                "容差设置": "1%以内判定通过",
            },
        )
        self.context_id = ctx.context_id
        return ctx.context_id

    def load_and_map_data(
        self,
        file_path: str,
        data_source: DataSource,
    ) -> pd.DataFrame:
        df = pd.read_csv(file_path)
        mapped_df, mapping_log, status_log = self.field_mapper.map_dataframe(
            df, data_source, self.context_id
        )
        self.audit_trail.log_entry(
            operator="系统",
            action="加载并映射数据",
            field_changed=f"source_{data_source.value}",
            old_value=None,
            new_value={
                "records": len(df),
                "mapped_fields": len([m for m in mapping_log if not m["standard_field"].startswith("_unmapped")]),
                "unmapped_fields": len([m for m in mapping_log if m["standard_field"].startswith("_unmapped")]),
            },
            reason=f"加载文件: {Path(file_path).name}",
        )
        return mapped_df

    def simulate_xiaocen_edits(self):
        """模拟小岑的临时修改操作，用于演示审计历史"""
        self.audit_trail.log_tolerance_adjustment(
            operator="小岑",
            old_tolerance=0.01,
            new_tolerance=0.02,
            reason="早会讨论后放宽容差，现场数据精度有限",
            affected_formula="F001",
        )
        self.engine.tolerance = 0.02

        new_rule = CalculationRule(
            formula_id="F001",
            formula_expression="total_price = quantity * unit_price * 1.01",
            description="合价 = 工程量 × 单价 × 1.01（含1%现场管理费）",
            input_fields=["quantity", "unit_price"],
            output_field="total_price",
            target_unit="元",
            created_by="小岑",
            version=2,
            params={"management_fee_rate": 0.01},
        )
        self.spec_manager.add_rule(new_rule)
        self.audit_trail.log_rule_change(
            operator="小岑",
            rule=new_rule,
            change_description="早会临时决定增加1%现场管理费",
        )

        self.audit_trail.log_field_mapping_change(
            operator="小岑",
            source_field="单位元",
            old_standard="unit_price",
            new_standard="unit_price_cny",
            data_source=DataSource.SYSTEM_EXPORT.value,
            reason="系统导出数据单位已明确，需单独映射",
        )

    def run_verification(
        self,
        df: pd.DataFrame,
        formula_ids: Optional[List[str]] = None,
        expected_field: str = "total_price",
    ) -> pd.DataFrame:
        if formula_ids is None:
            formula_ids = ["F001", "F002", "F004"]

        result_df = self.engine.batch_verify(
            df, formula_ids, self.context_id, expected_field
        )
        self.all_results.append(result_df)
        return result_df

    def run_full_demo(self):
        print("=" * 60)
        print("整数规划批量验算系统 - 现场演示")
        print("=" * 60)
        print()

        print("【步骤1】创建计算上下文")
        ctx_id = self.create_context()
        print(f"上下文ID: {ctx_id}")
        print()

        print("【步骤2】模拟小岑早会临时修改判断")
        self.simulate_xiaocen_edits()
        print("已记录小岑的3项调整：")
        print("  - 调整容差：1% → 2%")
        print("  - 修改公式F001：增加1%现场管理费")
        print("  - 调整字段映射：系统导出单位元单独映射")
        print()

        print("【步骤3】加载各来源数据并映射字段")
        data_sources = [
            ("./data/draft_reviewer_A.csv", DataSource.DRAFT_A),
            ("./data/draft_reviewer_B.csv", DataSource.DRAFT_B),
            ("./data/draft_manual_entry.csv", DataSource.DRAFT_C),
            ("./data/system_export.csv", DataSource.SYSTEM_EXPORT),
            ("./data/boundary_cases.csv", DataSource.DRAFT_C),
        ]

        all_dfs = []
        for file_path, ds in data_sources:
            print(f"  加载 {Path(file_path).name} ({ds.value})...")
            mapped = self.load_and_map_data(file_path, ds)
            all_dfs.append(mapped)
            print(f"    记录数: {len(mapped)}")
        print()

        combined_df = pd.concat(all_dfs, ignore_index=True)
        print(f"合并后总记录数: {len(combined_df)}")
        print()

        print("【步骤4】执行批量验算")
        print("  公式: F001(合价), F002(税额), F004(单位成本)")
        print("  正在验算...")
        result_df = self.run_verification(combined_df)
        print(f"  验算完成，结果数: {len(self.engine.results)}")
        print()

        print("【步骤5】模拟人工复核调整")
        anomalies = self.engine.get_anomalies()
        if anomalies:
            first_anomaly = anomalies[0]
            self.audit_trail.log_manual_override(
                operator="小岑",
                record_id=first_anomaly.record_id,
                old_status=first_anomaly.result_status,
                new_status=VerificationStatus.WARNING,
                reason="边界测试记录，已知异常，转为警告",
            )
            print(f"  小岑人工调整了记录 {first_anomaly.record_id} 的状态")
        print()

        print("【步骤6】生成报告和图表")
        report_files = self.report_generator.generate_all_reports(
            result_df, self.engine, self.spec_manager, self.audit_trail, self.context_id
        )
        print("  生成文件:")
        for key, value in report_files.items():
            if isinstance(value, list):
                for v in value:
                    print(f"    - {Path(v).name}")
            else:
                print(f"    - {Path(value).name}")
        print()

        print("【步骤7】保存审计日志")
        self.audit_trail.save_to_disk()
        print("  审计日志已保存到 data/audit_log.json")
        print()

        print("=" * 60)
        print("验算完成！查看 examples 目录下的报告和图表")
        print("=" * 60)
        print()

        summary = self.engine.get_summary()
        print("【结果汇总】")
        for status, count in summary.items():
            print(f"  {status}: {count}")
        print()

        anomalies = self.engine.get_anomalies()
        if anomalies:
            print(f"【发现 {len(anomalies)} 条异常记录】")
            for i, a in enumerate(anomalies[:3]):
                print(f"  {i+1}. [{a.anomaly_type}] {a.result_status.value} - {a.record_id}")
                if a.error_message:
                    print(f"     {a.error_message}")
            if len(anomalies) > 3:
                print(f"  ... 还有 {len(anomalies) - 3} 条异常，详情见报告")
        print()

        return result_df, report_files


def main():
    pipeline = VerificationPipeline()
    pipeline.run_full_demo()


if __name__ == "__main__":
    main()
