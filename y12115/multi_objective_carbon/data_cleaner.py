"""数据清洗和异常检测模块"""
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Any, Optional
from datetime import datetime, timedelta
import re

from .models import (
    DepartmentEmission, BudgetLimit, ReductionProject,
    BusinessIndicator, Anomaly, ProjectStatus
)


class DataCleaner:
    """数据清洗器 - 处理脏数据、缺失字段、备注解析"""

    def __init__(self):
        self.anomalies: List[Anomaly] = []

    def parse_remark_for_data(self, remark: str, data_type: str) -> Dict[str, Any]:
        """从备注中提取潜在的数据信息"""
        if not remark:
            return {}

        extracted = {}
        remark_lower = remark.lower()

        if data_type == "emission":
            patterns = {
                "estimated": r"估算|预计|预估|estimated",
                "partial": r"部分|partial",
                "corrected": r"修正|corrected",
                "source": r"来源[：:]\s*(\S+)",
                "adjustment": r"调[整节][：:]\s*([-+]?\d*\.?\d+)",
            }
        elif data_type == "budget":
            patterns = {
                "tentative": r"暂定|tentative",
                "revision": r"修订|revision",
                "approval_status": r"(已批准|未批准|待批|approved|pending)",
            }
        elif data_type == "project":
            patterns = {
                "risk": r"风险[：:]\s*(\S+)",
                "dependency_note": r"依赖[：:]\s*(\S+)",
                "funding_source": r"资金[：:]\s*(\S+)",
            }
        else:
            patterns = {}

        for key, pattern in patterns.items():
            match = re.search(pattern, remark_lower)
            if match:
                if match.groups():
                    extracted[key] = match.group(1)
                else:
                    extracted[key] = True

        return extracted

    def clean_department_emissions(self, df: pd.DataFrame) -> Tuple[List[DepartmentEmission], List[Anomaly]]:
        """清洗部门排放数据"""
        anomalies = []
        cleaned_data = []

        required_cols = ["department_id", "department_name", "emission", "period"]
        optional_cols = ["unit", "remark", "source"]

        for col in required_cols:
            if col not in df.columns:
                anomalies.append(Anomaly(
                    data_type="emission",
                    record_id="schema",
                    anomaly_type="missing_column",
                    description=f"缺少必需列: {col}",
                    severity="error",
                    suggested_fix=f"请在数据中添加 {col} 列"
                ))

        if any(a.severity == "error" for a in anomalies):
            return [], anomalies

        for idx, row in df.iterrows():
            record_id = f"{row.get('department_id', f'row_{idx}')}"
            row_anomalies = []

            department_id = str(row["department_id"]).strip() if pd.notna(row["department_id"]) else None
            if not department_id:
                row_anomalies.append(Anomaly(
                    data_type="emission",
                    record_id=record_id,
                    anomaly_type="missing_value",
                    description="部门ID为空",
                    severity="error",
                    suggested_fix="请填写有效的部门ID"
                ))

            department_name = str(row["department_name"]).strip() if pd.notna(row["department_name"]) else None
            if not department_name:
                row_anomalies.append(Anomaly(
                    data_type="emission",
                    record_id=record_id,
                    anomaly_type="missing_value",
                    description="部门名称为空",
                    severity="warning",
                    suggested_fix="建议补充部门名称"
                ))

            emission_value = None
            if pd.notna(row["emission"]):
                try:
                    emission_value = float(row["emission"])
                    if emission_value < 0:
                        row_anomalies.append(Anomaly(
                            data_type="emission",
                            record_id=record_id,
                            anomaly_type="negative_value",
                            description=f"排放量为负数: {emission_value}",
                            severity="warning",
                            suggested_fix="请核实数据，排放量通常应为非负数"
                        ))
                    if emission_value == 0:
                        row_anomalies.append(Anomaly(
                            data_type="emission",
                            record_id=record_id,
                            anomaly_type="zero_value",
                            description="排放量为0",
                            severity="info",
                            suggested_fix="请确认该部门是否确实无排放"
                        ))
                except (ValueError, TypeError):
                    row_anomalies.append(Anomaly(
                        data_type="emission",
                        record_id=record_id,
                        anomaly_type="invalid_numeric",
                        description=f"排放量格式无效: {row['emission']}",
                        severity="error",
                        suggested_fix="请将排放量转换为有效的数值格式"
                    ))
            else:
                row_anomalies.append(Anomaly(
                    data_type="emission",
                    record_id=record_id,
                    anomaly_type="missing_value",
                    description="排放量缺失",
                    severity="error",
                    suggested_fix="请填写排放量数据"
                ))

            period = str(row["period"]).strip() if pd.notna(row["period"]) else None
            if not period:
                row_anomalies.append(Anomaly(
                    data_type="emission",
                    record_id=record_id,
                    anomaly_type="missing_value",
                    description="统计周期为空",
                    severity="warning",
                    suggested_fix="建议填写统计周期，如'2024-Q1'或'2024'"
                ))

            remark = str(row["remark"]).strip() if pd.notna(row.get("remark")) else None
            if remark:
                extracted = self.parse_remark_for_data(remark, "emission")
                if extracted:
                    row_anomalies.append(Anomaly(
                        data_type="emission",
                        record_id=record_id,
                        anomaly_type="remark_info",
                        description=f"备注包含信息: {list(extracted.keys())}",
                        severity="info",
                        suggested_fix="已自动提取备注信息，建议核实后结构化存储"
                    ))

            unit = str(row["unit"]).strip() if pd.notna(row.get("unit")) else "ton_CO2e"
            source = str(row["source"]).strip() if pd.notna(row.get("source")) else None

            if not any(a.severity == "error" for a in row_anomalies):
                cleaned_data.append(DepartmentEmission(
                    department_id=department_id,
                    department_name=department_name,
                    emission=emission_value,
                    period=period,
                    unit=unit,
                    remark=remark,
                    source=source
                ))

            anomalies.extend(row_anomalies)

        self.anomalies.extend(anomalies)
        return cleaned_data, anomalies

    def clean_budget_limits(self, df: pd.DataFrame) -> Tuple[List[BudgetLimit], List[Anomaly]]:
        """清洗预算上限数据 - 处理可能缺失的字段"""
        anomalies = []
        cleaned_data = []

        required_cols = ["budget_amount", "period"]

        for col in required_cols:
            if col not in df.columns:
                anomalies.append(Anomaly(
                    data_type="budget",
                    record_id="schema",
                    anomaly_type="missing_column",
                    description=f"缺少必需列: {col}",
                    severity="error",
                    suggested_fix=f"请在数据中添加 {col} 列"
                ))

        if any(a.severity == "error" for a in anomalies):
            return [], anomalies

        has_department = "department_id" in df.columns or "department_name" in df.columns

        for idx, row in df.iterrows():
            record_id = f"budget_{idx}"
            row_anomalies = []

            department_id = None
            if "department_id" in df.columns and pd.notna(row["department_id"]):
                department_id = str(row["department_id"]).strip()
                record_id = f"budget_{department_id}"

            department_name = None
            if "department_name" in df.columns and pd.notna(row["department_name"]):
                department_name = str(row["department_name"]).strip()
                if not department_id:
                    record_id = f"budget_{department_name}"

            if not department_id and not department_name:
                row_anomalies.append(Anomaly(
                    data_type="budget",
                    record_id=record_id,
                    anomaly_type="missing_department",
                    description="预算未关联部门，将作为公司整体预算处理",
                    severity="info",
                    suggested_fix="如需部门级预算控制，请补充部门ID或名称"
                ))

            budget_amount = None
            if pd.notna(row["budget_amount"]):
                try:
                    budget_amount = float(row["budget_amount"])
                    if budget_amount <= 0:
                        row_anomalies.append(Anomaly(
                            data_type="budget",
                            record_id=record_id,
                            anomaly_type="non_positive_value",
                            description=f"预算金额非正数: {budget_amount}",
                            severity="warning",
                            suggested_fix="预算金额应为正数，请核实"
                        ))
                except (ValueError, TypeError):
                    row_anomalies.append(Anomaly(
                        data_type="budget",
                        record_id=record_id,
                        anomaly_type="invalid_numeric",
                        description=f"预算金额格式无效: {row['budget_amount']}",
                        severity="error",
                        suggested_fix="请将预算金额转换为有效的数值格式"
                    ))
            else:
                row_anomalies.append(Anomaly(
                    data_type="budget",
                    record_id=record_id,
                    anomaly_type="missing_value",
                    description="预算金额缺失",
                    severity="error",
                    suggested_fix="请填写预算金额"
                ))

            period = str(row["period"]).strip() if pd.notna(row["period"]) else None
            if not period:
                row_anomalies.append(Anomaly(
                    data_type="budget",
                    record_id=record_id,
                    anomaly_type="missing_value",
                    description="预算周期为空",
                    severity="warning",
                    suggested_fix="建议填写预算周期"
                ))

            budget_type = str(row["budget_type"]).strip() if "budget_type" in df.columns and pd.notna(row["budget_type"]) else "carbon"
            currency = str(row["currency"]).strip() if "currency" in df.columns and pd.notna(row["currency"]) else "CNY"
            remark = str(row["remark"]).strip() if "remark" in df.columns and pd.notna(row["remark"]) else None

            if remark:
                extracted = self.parse_remark_for_data(remark, "budget")
                if extracted.get("tentative"):
                    row_anomalies.append(Anomaly(
                        data_type="budget",
                        record_id=record_id,
                        anomaly_type="tentative_budget",
                        description="该预算为暂定版本，可能会有调整",
                        severity="warning",
                        suggested_fix="建议确认预算最终版本后再进行优化分析"
                    ))

            if not any(a.severity == "error" for a in row_anomalies):
                cleaned_data.append(BudgetLimit(
                    department_id=department_id,
                    department_name=department_name,
                    budget_amount=budget_amount,
                    period=period,
                    budget_type=budget_type,
                    currency=currency,
                    remark=remark
                ))

            anomalies.extend(row_anomalies)

        self.anomalies.extend(anomalies)
        return cleaned_data, anomalies

    def clean_reduction_projects(self, df: pd.DataFrame) -> Tuple[List[ReductionProject], List[Anomaly]]:
        """清洗减碳项目数据"""
        anomalies = []
        cleaned_data = []

        required_cols = ["project_id", "project_name", "department_id", "cost", "reduction_potential"]

        for col in required_cols:
            if col not in df.columns:
                anomalies.append(Anomaly(
                    data_type="project",
                    record_id="schema",
                    anomaly_type="missing_column",
                    description=f"缺少必需列: {col}",
                    severity="error",
                    suggested_fix=f"请在数据中添加 {col} 列"
                ))

        if any(a.severity == "error" for a in anomalies):
            return [], anomalies

        for idx, row in df.iterrows():
            project_id = str(row["project_id"]).strip() if pd.notna(row["project_id"]) else f"proj_{idx}"
            row_anomalies = []

            project_name = str(row["project_name"]).strip() if pd.notna(row["project_name"]) else None
            if not project_name:
                row_anomalies.append(Anomaly(
                    data_type="project",
                    record_id=project_id,
                    anomaly_type="missing_value",
                    description="项目名称为空",
                    severity="warning",
                    suggested_fix="建议补充项目名称"
                ))

            department_id = str(row["department_id"]).strip() if pd.notna(row["department_id"]) else None
            if not department_id:
                row_anomalies.append(Anomaly(
                    data_type="project",
                    record_id=project_id,
                    anomaly_type="missing_value",
                    description="项目所属部门为空",
                    severity="error",
                    suggested_fix="请填写项目所属部门ID"
                ))

            cost = None
            if pd.notna(row["cost"]):
                try:
                    cost = float(row["cost"])
                    if cost < 0:
                        row_anomalies.append(Anomaly(
                            data_type="project",
                            record_id=project_id,
                            anomaly_type="negative_value",
                            description=f"项目成本为负数: {cost}",
                            severity="warning",
                            suggested_fix="请核实项目成本"
                        ))
                except (ValueError, TypeError):
                    row_anomalies.append(Anomaly(
                        data_type="project",
                        record_id=project_id,
                        anomaly_type="invalid_numeric",
                        description=f"项目成本格式无效: {row['cost']}",
                        severity="error",
                        suggested_fix="请将项目成本转换为有效的数值格式"
                    ))
            else:
                row_anomalies.append(Anomaly(
                    data_type="project",
                    record_id=project_id,
                    anomaly_type="missing_value",
                    description="项目成本缺失",
                    severity="error",
                    suggested_fix="请填写项目成本"
                ))

            reduction_potential = None
            if pd.notna(row["reduction_potential"]):
                try:
                    reduction_potential = float(row["reduction_potential"])
                    if reduction_potential <= 0:
                        row_anomalies.append(Anomaly(
                            data_type="project",
                            record_id=project_id,
                            anomaly_type="non_positive_value",
                            description=f"减排潜力非正数: {reduction_potential}",
                            severity="warning",
                            suggested_fix="减排潜力应为正数，请核实"
                        ))
                except (ValueError, TypeError):
                    row_anomalies.append(Anomaly(
                        data_type="project",
                        record_id=project_id,
                        anomaly_type="invalid_numeric",
                        description=f"减排潜力格式无效: {row['reduction_potential']}",
                        severity="error",
                        suggested_fix="请将减排潜力转换为有效的数值格式"
                    ))
            else:
                row_anomalies.append(Anomaly(
                    data_type="project",
                    record_id=project_id,
                    anomaly_type="missing_value",
                    description="减排潜力缺失",
                    severity="error",
                    suggested_fix="请填写项目减排潜力"
                ))

            duration_months = 12
            if "duration_months" in df.columns and pd.notna(row["duration_months"]):
                try:
                    duration_months = int(row["duration_months"])
                except (ValueError, TypeError):
                    row_anomalies.append(Anomaly(
                        data_type="project",
                        record_id=project_id,
                        anomaly_type="invalid_numeric",
                        description=f"工期格式无效: {row['duration_months']}",
                        severity="warning",
                        suggested_fix="工期应为整数月，已使用默认值12个月"
                    ))

            status = ProjectStatus.PLANNED
            if "status" in df.columns and pd.notna(row["status"]):
                try:
                    status_str = str(row["status"]).lower().strip()
                    status_map = {
                        "planned": ProjectStatus.PLANNED,
                        "in_progress": ProjectStatus.IN_PROGRESS,
                        "in progress": ProjectStatus.IN_PROGRESS,
                        "进行中": ProjectStatus.IN_PROGRESS,
                        "completed": ProjectStatus.COMPLETED,
                        "已完成": ProjectStatus.COMPLETED,
                    }
                    status = status_map.get(status_str, ProjectStatus.PLANNED)
                except Exception:
                    pass

            priority = 3
            if "priority" in df.columns and pd.notna(row["priority"]):
                try:
                    priority = int(row["priority"])
                    if priority < 1 or priority > 5:
                        row_anomalies.append(Anomaly(
                            data_type="project",
                            record_id=project_id,
                            anomaly_type="out_of_range",
                            description=f"优先级超出范围(1-5): {priority}",
                            severity="warning",
                            suggested_fix="优先级应在1-5之间，已自动修正"
                        ))
                        priority = max(1, min(5, priority))
                except (ValueError, TypeError):
                    pass

            dependencies = []
            if "dependencies" in df.columns and pd.notna(row["dependencies"]):
                deps_str = str(row["dependencies"]).strip()
                if deps_str:
                    dependencies = [d.strip() for d in deps_str.split(",") if d.strip()]

            mutually_exclusive = []
            if "mutually_exclusive" in df.columns and pd.notna(row["mutually_exclusive"]):
                me_str = str(row["mutually_exclusive"]).strip()
                if me_str:
                    mutually_exclusive = [m.strip() for m in me_str.split(",") if m.strip()]

            remark = str(row["remark"]).strip() if "remark" in df.columns and pd.notna(row["remark"]) else None

            if not any(a.severity == "error" for a in row_anomalies):
                cleaned_data.append(ReductionProject(
                    project_id=project_id,
                    project_name=project_name,
                    department_id=department_id,
                    cost=cost,
                    reduction_potential=reduction_potential,
                    duration_months=duration_months,
                    status=status,
                    priority=priority,
                    dependencies=dependencies,
                    mutually_exclusive=mutually_exclusive,
                    remark=remark
                ))

            anomalies.extend(row_anomalies)

        self.anomalies.extend(anomalies)
        return cleaned_data, anomalies

    def clean_business_indicators(self, df: Optional[pd.DataFrame],
                                  current_date: Optional[datetime] = None) -> Tuple[List[BusinessIndicator], List[Anomaly]]:
        """清洗业务指标数据 - 处理晚到情况"""
        anomalies = []
        cleaned_data = []

        if df is None or df.empty:
            anomalies.append(Anomaly(
                data_type="indicator",
                record_id="all",
                anomaly_type="data_late",
                description="业务指标数据尚未到达",
                severity="info",
                suggested_fix="业务指标晚到不影响核心优化，但会影响关联分析，数据到达后可重新运行"
            ))
            return [], anomalies

        current_date = current_date or datetime.now()
        required_cols = ["department_id", "indicator_name", "indicator_value", "period"]

        for col in required_cols:
            if col not in df.columns:
                anomalies.append(Anomaly(
                    data_type="indicator",
                    record_id="schema",
                    anomaly_type="missing_column",
                    description=f"缺少必需列: {col}",
                    severity="warning",
                    suggested_fix=f"建议添加 {col} 列以完善业务指标分析"
                ))
                return [], anomalies

        for idx, row in df.iterrows():
            department_id = str(row["department_id"]).strip() if pd.notna(row["department_id"]) else None
            indicator_name = str(row["indicator_name"]).strip() if pd.notna(row["indicator_name"]) else None
            record_id = f"{department_id}_{indicator_name}"

            indicator_value = None
            if pd.notna(row["indicator_value"]):
                try:
                    indicator_value = float(row["indicator_value"])
                except (ValueError, TypeError):
                    anomalies.append(Anomaly(
                        data_type="indicator",
                        record_id=record_id,
                        anomaly_type="invalid_numeric",
                        description=f"指标值格式无效: {row['indicator_value']}",
                        severity="warning",
                        suggested_fix="请将指标值转换为有效的数值格式"
                    ))
                    continue

            period = str(row["period"]).strip() if pd.notna(row["period"]) else None

            arrival_delay = None
            if "expected_arrival" in df.columns and pd.notna(row["expected_arrival"]):
                try:
                    expected = pd.to_datetime(row["expected_arrival"])
                    if current_date > expected:
                        arrival_delay = (current_date - expected).days
                        anomalies.append(Anomaly(
                            data_type="indicator",
                            record_id=record_id,
                            anomaly_type="data_late",
                            description=f"业务指标数据晚到 {arrival_delay} 天",
                            severity="warning",
                            suggested_fix="数据晚到不影响当前优化，但建议催交数据以获得更完整的分析"
                        ))
                except Exception:
                    pass

            unit = str(row["unit"]).strip() if "unit" in df.columns and pd.notna(row["unit"]) else ""

            cleaned_data.append(BusinessIndicator(
                department_id=department_id,
                indicator_name=indicator_name,
                indicator_value=indicator_value,
                period=period,
                unit=unit,
                arrival_delay=arrival_delay
            ))

        self.anomalies.extend(anomalies)
        return cleaned_data, anomalies

    def detect_outliers(self, data: List[float], threshold: float = 2.0) -> List[int]:
        """使用Z-score检测异常值"""
        if len(data) < 3:
            return []

        arr = np.array(data)
        mean = np.mean(arr)
        std = np.std(arr)

        if std == 0:
            return []

        z_scores = np.abs((arr - mean) / std)
        return list(np.where(z_scores > threshold)[0])

    def get_summary(self) -> Dict[str, Any]:
        """获取清洗摘要"""
        summary = {
            "total_anomalies": len(self.anomalies),
            "by_severity": {},
            "by_type": {}
        }

        for anomaly in self.anomalies:
            summary["by_severity"][anomaly.severity] = summary["by_severity"].get(anomaly.severity, 0) + 1
            summary["by_type"][anomaly.anomaly_type] = summary["by_type"].get(anomaly.anomaly_type, 0) + 1

        return summary
