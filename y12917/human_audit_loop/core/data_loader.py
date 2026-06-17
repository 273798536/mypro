import os
import pandas as pd
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


OLD_SCHEMA_MAP = {
    "流水号": "record_id",
    "客户姓名": "customer_name",
    "所属地区": "city",
    "订购产品": "product",
    "消费金额": "amount",
    "金额单位": "unit",
    "登记日期": "date",
    "原审核人": "auditor_old",
    "备注": "remark",
}

NEW_SCHEMA_MAP = {
    "审核单号": "record_id",
    "关联旧流水号": "link_old_id",
    "客户名称": "customer_name",
    "所在城市": "city",
    "产品名称": "product",
    "订单金额(元)": "amount",
    "计量单位": "unit",
    "提交时间": "date",
    "一级审核人": "auditor_new",
    "复核结论": "review_result",
    "备注说明": "remark",
}

LABEL_SCHEMA_MAP = {
    "标注批次号": "batch_id",
    "记录唯一ID": "record_id",
    "来源表类型": "source_type",
    "标注标签": "label",
    "标注时间": "label_time",
    "标注人": "labeler",
    "处理意见": "opinion",
    "跟进负责人": "owner",
    "当前状态": "status",
}

GRAY_SCHEMA_MAP = {
    "记录唯一ID": "record_id",
    "所属灰度组": "gray_group",
    "模型/规则版本": "model_version",
    "系统自动判定": "auto_decision",
    "人工复核结果": "human_decision",
    "是否一致": "is_consistent",
    "判定时间": "decision_time",
}

EXCEPTION_SCHEMA_MAP = {
    "异常ID": "excep_id",
    "关联记录ID": "record_id",
    "异常类型": "excep_type",
    "发现时间": "found_time",
    "问题描述": "description",
    "影响范围": "impact",
    "当前处理人": "handler",
    "处理进展": "progress",
    "证据截图/路径": "evidence_path",
}


@dataclass
class UnifiedRecord:
    record_id: str
    source_table: str
    customer_name: str = ""
    city: str = ""
    product: str = ""
    amount: float = 0.0
    unit: str = ""
    date: str = ""
    remark: str = ""
    auditor: str = ""
    review_result: str = ""
    link_old_id: str = ""
    label: str = ""
    label_time: str = ""
    labeler: str = ""
    opinion: str = ""
    owner: str = ""
    status: str = ""
    gray_group: str = ""
    model_version: str = ""
    auto_decision: str = ""
    human_decision: str = ""
    is_consistent: str = ""
    decision_time: str = ""
    is_duplicate: bool = False
    duplicate_of: str = ""
    dedupe_reason: str = ""
    issues: List[str] = field(default_factory=list)
    truncation_reasons: Dict[str, str] = field(default_factory=dict)


@dataclass
class BatchProcessResult:
    batch_id: str
    run_time: str
    unified_records: List[UnifiedRecord]
    raw_old_df: pd.DataFrame
    raw_new_df: pd.DataFrame
    raw_label_df: pd.DataFrame
    raw_gray_df: pd.DataFrame
    raw_excep_df: pd.DataFrame
    dedup_groups: Dict[str, List[str]]
    stats: Dict[str, object]


def _map_columns(df: pd.DataFrame, schema_map: Dict[str, str]) -> pd.DataFrame:
    available = {k: v for k, v in schema_map.items() if k in df.columns}
    mapped = df.rename(columns=available).copy()
    for target in schema_map.values():
        if target not in mapped.columns:
            mapped[target] = ""
    return mapped[list(schema_map.values())]


def _safe_str(val) -> str:
    if pd.isna(val):
        return ""
    s = str(val).strip()
    if s.lower() == "nan":
        return ""
    return s


def _detect_issues(row: pd.Series, source: str) -> List[str]:
    issues = []
    amt = row.get("amount")
    if pd.isna(amt) or _safe_str(amt) == "":
        issues.append("金额缺失")
    unit = _safe_str(row.get("unit"))
    if not unit:
        issues.append("金额单位未填")
    if not _safe_str(row.get("customer_name")):
        issues.append("客户姓名缺失")
    if not _safe_str(row.get("city")):
        issues.append("地区/城市缺失")
    remark = _safe_str(row.get("remark"))
    if "补录" in remark:
        issues.append("存在补录备注")
    return issues


def load_all_data(sample_dir: str) -> Tuple[pd.DataFrame, ...]:
    old_path = os.path.join(sample_dir, "旧版人审表_5月.xlsx")
    new_path = os.path.join(sample_dir, "新版人审表_5月下.xlsx")
    label_path = os.path.join(sample_dir, "标注记录及处理意见.xlsx")
    gray_path = os.path.join(sample_dir, "灰度对比反馈表.xlsx")
    excep_path = os.path.join(sample_dir, "版本回滚与异常案例.xlsx")

    old_df = _map_columns(pd.read_excel(old_path), OLD_SCHEMA_MAP)
    new_df = _map_columns(pd.read_excel(new_path), NEW_SCHEMA_MAP)
    label_df = _map_columns(pd.read_excel(label_path), LABEL_SCHEMA_MAP)
    gray_df = _map_columns(pd.read_excel(gray_path), GRAY_SCHEMA_MAP)
    excep_df = _map_columns(pd.read_excel(excep_path), EXCEPTION_SCHEMA_MAP)

    return old_df, new_df, label_df, gray_df, excep_df


def build_unified_records(
    old_df: pd.DataFrame,
    new_df: pd.DataFrame,
    label_df: pd.DataFrame,
    gray_df: pd.DataFrame,
) -> List[UnifiedRecord]:
    records: List[UnifiedRecord] = []

    for _, row in old_df.iterrows():
        rid = _safe_str(row["record_id"])
        rec = UnifiedRecord(record_id=rid, source_table="旧版人审表")
        rec.customer_name = _safe_str(row.get("customer_name"))
        rec.city = _safe_str(row.get("city"))
        rec.product = _safe_str(row.get("product"))
        try:
            amt = row.get("amount", 0)
            rec.amount = 0.0 if pd.isna(amt) else float(amt)
        except (ValueError, TypeError):
            rec.amount = 0.0
        rec.unit = _safe_str(row.get("unit"))
        rec.date = _safe_str(row.get("date"))
        rec.remark = _safe_str(row.get("remark"))
        rec.auditor = _safe_str(row.get("auditor_old"))
        rec.issues = _detect_issues(row, "old")
        records.append(rec)

    for _, row in new_df.iterrows():
        rid = _safe_str(row["record_id"])
        rec = UnifiedRecord(record_id=rid, source_table="新版人审表")
        rec.customer_name = _safe_str(row.get("customer_name"))
        rec.city = _safe_str(row.get("city"))
        rec.product = _safe_str(row.get("product"))
        try:
            amt = row.get("amount", 0)
            rec.amount = 0.0 if pd.isna(amt) else float(amt)
        except (ValueError, TypeError):
            rec.amount = 0.0
        rec.unit = _safe_str(row.get("unit"))
        rec.date = _safe_str(row.get("date"))
        rec.remark = _safe_str(row.get("remark"))
        rec.auditor = _safe_str(row.get("auditor_new"))
        rec.review_result = _safe_str(row.get("review_result"))
        rec.link_old_id = _safe_str(row.get("link_old_id"))
        rec.issues = _detect_issues(row, "new")
        records.append(rec)

    label_map = {}
    for _, row in label_df.iterrows():
        rid = _safe_str(row["record_id"])
        label_map[rid] = row

    for rec in records:
        if rec.record_id in label_map:
            row = label_map[rec.record_id]
            rec.label = _safe_str(row.get("label"))
            rec.label_time = _safe_str(row.get("label_time"))
            rec.labeler = _safe_str(row.get("labeler"))
            rec.opinion = _safe_str(row.get("opinion"))
            rec.owner = _safe_str(row.get("owner"))
            rec.status = _safe_str(row.get("status"))

    gray_map = {}
    for _, row in gray_df.iterrows():
        rid = _safe_str(row["record_id"])
        gray_map[rid] = row
    for rec in records:
        if rec.record_id in gray_map:
            row = gray_map[rec.record_id]
            rec.gray_group = _safe_str(row.get("gray_group"))
            rec.model_version = _safe_str(row.get("model_version"))
            rec.auto_decision = _safe_str(row.get("auto_decision"))
            rec.human_decision = _safe_str(row.get("human_decision"))
            rec.is_consistent = _safe_str(row.get("is_consistent"))
            rec.decision_time = _safe_str(row.get("decision_time"))

    return records
