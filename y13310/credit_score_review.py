#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import sys
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime

ERROR_MESSAGES = {
    "PARAM_INVALID": "参数校验失败：{field} 不符合要求，当前值为 {value}",
    "THRESHOLD_MISSING": "阈值配置缺失：缺少 {threshold_name} 阈值",
    "DATA_EMPTY": "输入数据为空：未找到待复核的版本说明记录",
    "RECORD_INVALID": "记录格式错误：第 {line} 行缺少关键字段 {field}",
    "DRIFT_DETECTED": "阈值漂移警告：{metric} 从 {old_val} 偏移至 {new_val}，偏差 {deviation:.2f}%",
    "EVIDENCE_MISSING": "证据缺失：记录 {record_id} 需要补充 {evidence_type} 证据",
    "FILE_NOT_FOUND": "文件不存在：未找到路径 {file_path}",
    "JSON_PARSE_ERROR": "JSON解析失败：第 {line} 行格式错误，{error_msg}",
}

STABLE_PARAMS = {
    "input_file": "待复核版本说明文件路径",
    "threshold_file": "阈值配置文件路径",
    "output_file": "复核结果输出路径",
    "drift_tolerance": "阈值漂移容忍度(%)",
    "min_sample_size": "最小样本量",
    "evidence_fields": "需复核的证据字段列表",
}


@dataclass
class VersionRecord:
    record_id: str
    line_number: int
    customer_id: str
    credit_score: float
    score_version: str
    model_version: str
    approval_result: str
    evidence_provided: List[str]
    raw_data: Dict
    review_status: str = "pending"
    issues: List[str] = field(default_factory=list)
    drift_impact: Optional[float] = None


@dataclass
class ThresholdConfig:
    score_pass: float
    score_warning: float
    drift_tolerance: float
    min_evidence_count: int
    required_evidence: List[str]


@dataclass
class DriftRecord:
    metric: str
    old_value: float
    new_value: float
    deviation: float
    source_line: int
    affected_records: List[str]
    impact_scope: str
    severity: str


@dataclass
class ReviewResult:
    total_records: int = 0
    normal_records: int = 0
    problematic_records: int = 0
    drift_records: List[DriftRecord] = field(default_factory=list)
    biased_samples: List[Dict] = field(default_factory=list)
    pending_evidence: List[Dict] = field(default_factory=list)
    processed_records: List[str] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)


def stable_error(error_code: str, **kwargs) -> str:
    template = ERROR_MESSAGES.get(error_code, f"未知错误：{error_code}")
    return template.format(**kwargs)


def validate_params(args) -> Tuple[bool, Optional[str]]:
    if args.drift_tolerance < 0 or args.drift_tolerance > 100:
        return False, stable_error("PARAM_INVALID", field="drift_tolerance", value=args.drift_tolerance)
    if args.min_sample_size < 1:
        return False, stable_error("PARAM_INVALID", field="min_sample_size", value=args.min_sample_size)
    return True, None


def load_threshold_config(config_path: Optional[str]) -> ThresholdConfig:
    default_config = ThresholdConfig(
        score_pass=600.0,
        score_warning=650.0,
        drift_tolerance=5.0,
        min_evidence_count=2,
        required_evidence=["income_proof", "credit_report", "employment_verify"]
    )
    if config_path:
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                default_config.score_pass = data.get("score_pass", default_config.score_pass)
                default_config.score_warning = data.get("score_warning", default_config.score_warning)
                default_config.drift_tolerance = data.get("drift_tolerance", default_config.drift_tolerance)
                default_config.min_evidence_count = data.get("min_evidence_count", default_config.min_evidence_count)
                default_config.required_evidence = data.get("required_evidence", default_config.required_evidence)
        except FileNotFoundError:
            print(stable_error("FILE_NOT_FOUND", file_path=config_path), file=sys.stderr)
        except json.JSONDecodeError as e:
            print(stable_error("JSON_PARSE_ERROR", line=0, error_msg=str(e)), file=sys.stderr)
    return default_config


def load_version_records(input_path: Optional[str]) -> List[VersionRecord]:
    demo_data = generate_demo_records()
    if input_path:
        records = []
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        record = parse_version_record(data, line_num)
                        records.append(record)
                    except json.JSONDecodeError as e:
                        print(stable_error("JSON_PARSE_ERROR", line=line_num, error_msg=str(e)), file=sys.stderr)
                    except KeyError as e:
                        print(stable_error("RECORD_INVALID", line=line_num, field=str(e)), file=sys.stderr)
            if records:
                return records
        except FileNotFoundError:
            print(stable_error("FILE_NOT_FOUND", file_path=input_path), file=sys.stderr)
    print("使用演示数据进行试跑...")
    return demo_data


def generate_demo_records() -> List[VersionRecord]:
    demo_raw = [
        {
            "record_id": "VER20260615001",
            "customer_id": "CUS001",
            "credit_score": 720.0,
            "score_version": "v2.1.0",
            "model_version": "model-202605",
            "approval_result": "pass",
            "evidence_provided": ["income_proof", "credit_report", "employment_verify"],
            "version_note": "2026年6月上半月批量审批，收入证明来自银行流水",
            "data_source": "core_banking"
        },
        {
            "record_id": "VER20260615002",
            "customer_id": "CUS002",
            "credit_score": 580.0,
            "score_version": "v2.1.0",
            "model_version": "model-202605",
            "approval_result": "reject",
            "evidence_provided": ["income_proof", "credit_report"],
            "version_note": "2026年6月上半月批量审批，缺少就业验证材料",
            "data_source": "core_banking"
        },
        {
            "record_id": "VER20260615003",
            "customer_id": "CUS003",
            "credit_score": 630.0,
            "score_version": "v2.1.1",
            "model_version": "model-202606-patch",
            "approval_result": "pass",
            "evidence_provided": ["income_proof", "credit_report", "employment_verify"],
            "version_note": "紧急补丁版本，评分模型调整了负债权重，阈值疑似漂移",
            "data_source": "patch_channel"
        },
        {
            "record_id": "VER20260615004",
            "customer_id": "CUS004",
            "credit_score": 590.0,
            "score_version": "v2.1.1",
            "model_version": "model-202606-patch",
            "approval_result": "pass",
            "evidence_provided": ["credit_report"],
            "version_note": "紧急补丁版本，原评分610分降至590分仍通过，阈值漂移影响",
            "data_source": "patch_channel"
        },
        {
            "record_id": "VER20260615005",
            "customer_id": "CUS005",
            "credit_score": 680.0,
            "score_version": "v2.1.0",
            "model_version": "model-202605",
            "approval_result": "pass",
            "evidence_provided": ["income_proof", "employment_verify"],
            "version_note": "2026年6月上半月批量审批，缺少央行征信报告",
            "data_source": "core_banking"
        },
        {
            "record_id": "VER20260615006",
            "customer_id": "CUS006",
            "credit_score": 705.0,
            "score_version": "v2.1.0",
            "model_version": "model-202605",
            "approval_result": "pass",
            "evidence_provided": ["income_proof", "credit_report", "employment_verify", "collateral_proof"],
            "version_note": "正常记录：2026年6月上半月标准审批流程，材料齐全评分稳定",
            "data_source": "core_banking"
        },
        {
            "record_id": "VER20260615007",
            "customer_id": "CUS007",
            "credit_score": 560.0,
            "score_version": "v2.1.1",
            "model_version": "model-202606-patch",
            "approval_result": "pass",
            "evidence_provided": ["income_proof", "credit_report"],
            "version_note": "紧急补丁版本，严重漂移样本，原620分骤降60分仍通过",
            "data_source": "patch_channel"
        }
    ]
    
    records = []
    for i, data in enumerate(demo_raw, 1):
        records.append(parse_version_record(data, i))
    return records


def parse_version_record(data: Dict, line_number: int) -> VersionRecord:
    required_fields = ["record_id", "customer_id", "credit_score", "score_version", 
                       "model_version", "approval_result", "evidence_provided"]
    for field in required_fields:
        if field not in data:
            raise KeyError(field)
    
    return VersionRecord(
        record_id=data["record_id"],
        line_number=line_number,
        customer_id=data["customer_id"],
        credit_score=float(data["credit_score"]),
        score_version=data["score_version"],
        model_version=data["model_version"],
        approval_result=data["approval_result"],
        evidence_provided=data["evidence_provided"],
        raw_data=data
    )


def detect_threshold_drift(records: List[VersionRecord], 
                           config: ThresholdConfig) -> List[DriftRecord]:
    drift_results = []
    
    version_groups = {}
    for record in records:
        version_key = (record.score_version, record.model_version)
        if version_key not in version_groups:
            version_groups[version_key] = []
        version_groups[version_key].append(record)
    
    if len(version_groups) < 2:
        return drift_results
    
    versions = sorted(version_groups.keys())
    baseline_version = versions[0]
    baseline_records = version_groups[baseline_version]
    baseline_avg = sum(r.credit_score for r in baseline_records) / len(baseline_records)
    baseline_pass_rate = sum(1 for r in baseline_records if r.approval_result == "pass") / len(baseline_records)
    
    for version in versions[1:]:
        current_records = version_groups[version]
        current_avg = sum(r.credit_score for r in current_records) / len(current_records)
        current_pass_rate = sum(1 for r in current_records if r.approval_result == "pass") / len(current_records)
        
        avg_deviation = abs(current_avg - baseline_avg) / baseline_avg * 100
        pass_deviation = abs(current_pass_rate - baseline_pass_rate) / baseline_pass_rate * 100
        
        if avg_deviation > config.drift_tolerance:
            affected = [r.record_id for r in current_records]
            source_line = min(r.line_number for r in current_records)
            severity = "high" if avg_deviation > 15 else "medium"
            
            drift_results.append(DriftRecord(
                metric="avg_credit_score",
                old_value=round(baseline_avg, 2),
                new_value=round(current_avg, 2),
                deviation=round(avg_deviation, 2),
                source_line=source_line,
                affected_records=affected,
                impact_scope=f"版本 {version[0]}/{version[1]} 共 {len(affected)} 条记录",
                severity=severity
            ))
        
        if pass_deviation > config.drift_tolerance:
            affected = [r.record_id for r in current_records if r.approval_result == "pass" 
                       and r.credit_score < config.score_pass]
            if affected:
                source_line = min(r.line_number for r in current_records 
                                 if r.record_id in affected)
                severity = "high" if pass_deviation > 20 else "medium"
                
                drift_results.append(DriftRecord(
                    metric="pass_threshold",
                    old_value=config.score_pass,
                    new_value=round(min(r.credit_score for r in current_records 
                                       if r.approval_result == "pass"), 2),
                    deviation=round(pass_deviation, 2),
                    source_line=source_line,
                    affected_records=affected,
                    impact_scope=f"阈值实际生效下限偏移，涉及 {len(affected)} 条通过记录低于标准阈值",
                    severity=severity
                ))
    
    return drift_results


def analyze_biased_samples(records: List[VersionRecord], 
                           drift_records: List[DriftRecord],
                           config: ThresholdConfig) -> List[Dict]:
    biased = []
    
    drift_affected = set()
    for drift in drift_records:
        drift_affected.update(drift.affected_records)
    
    all_scores = [r.credit_score for r in records]
    mean_score = sum(all_scores) / len(all_scores)
    
    for record in records:
        bias_factors = []
        bias_score = 0.0
        
        if record.record_id in drift_affected:
            bias_factors.append("受阈值漂移影响")
            bias_score += 0.4
        
        if record.credit_score < config.score_pass and record.approval_result == "pass":
            bias_factors.append("低于标准阈值仍通过")
            bias_score += 0.3
            deviation_from_threshold = (config.score_pass - record.credit_score) / config.score_pass * 100
        elif record.credit_score >= config.score_warning and record.approval_result == "reject":
            bias_factors.append("高于警告阈值仍拒绝")
            bias_score += 0.2
        
        missing_evidence = set(config.required_evidence) - set(record.evidence_provided)
        if missing_evidence:
            bias_factors.append(f"缺少证据: {', '.join(missing_evidence)}")
            bias_score += 0.2 * len(missing_evidence)
        
        score_deviation = abs(record.credit_score - mean_score) / mean_score * 100
        if score_deviation > 20:
            bias_factors.append(f"评分偏离均值 {score_deviation:.1f}%")
            bias_score += 0.1
        
        if bias_score >= 0.3:
            biased.append({
                "record_id": record.record_id,
                "line_number": record.line_number,
                "customer_id": record.customer_id,
                "credit_score": record.credit_score,
                "approval_result": record.approval_result,
                "bias_score": round(bias_score, 2),
                "bias_factors": bias_factors,
                "version_note": record.raw_data.get("version_note", "")
            })
    
    return sorted(biased, key=lambda x: x["bias_score"], reverse=True)


def check_evidence_completeness(records: List[VersionRecord], 
                                config: ThresholdConfig,
                                drift_records: List[DriftRecord]) -> Tuple[List[str], List[Dict]]:
    processed = []
    pending = []
    
    drift_affected = set()
    for drift in drift_records:
        drift_affected.update(drift.affected_records)
    
    for record in records:
        missing_evidence = set(config.required_evidence) - set(record.evidence_provided)
        has_drift_impact = record.record_id in drift_affected
        has_threshold_issue = (record.credit_score < config.score_pass 
                              and record.approval_result == "pass")
        
        if not missing_evidence and not has_drift_impact and not has_threshold_issue:
            record.review_status = "processed"
            processed.append(record.record_id)
        else:
            record.review_status = "pending_evidence"
            pending_items = []
            
            if missing_evidence:
                for ev in missing_evidence:
                    pending_items.append({
                        "evidence_type": ev,
                        "reason": "缺少必需证据材料"
                    })
            
            if has_drift_impact:
                pending_items.append({
                    "evidence_type": "drift_explanation",
                    "reason": "受阈值漂移影响，需补充版本变更说明"
                })
            
            if has_threshold_issue:
                pending_items.append({
                    "evidence_type": "manual_approval_note",
                    "reason": "低于标准阈值通过，需补充人工审批说明"
                })
            
            pending.append({
                "record_id": record.record_id,
                "line_number": record.line_number,
                "customer_id": record.customer_id,
                "credit_score": record.credit_score,
                "pending_items": pending_items,
                "version_note": record.raw_data.get("version_note", "")
            })
    
    return processed, pending


def run_review(input_file: Optional[str] = None,
               threshold_file: Optional[str] = None,
               output_file: Optional[str] = None,
               drift_tolerance: float = 5.0,
               min_sample_size: int = 3,
               evidence_fields: Optional[List[str]] = None) -> ReviewResult:
    
    config = load_threshold_config(threshold_file)
    config.drift_tolerance = drift_tolerance
    if evidence_fields:
        config.required_evidence = evidence_fields
    
    records = load_version_records(input_file)
    
    if len(records) < min_sample_size:
        print(stable_error("DATA_EMPTY"), file=sys.stderr)
        return ReviewResult()
    
    result = ReviewResult()
    result.total_records = len(records)
    
    drift_records = detect_threshold_drift(records, config)
    result.drift_records = drift_records
    
    biased_samples = analyze_biased_samples(records, drift_records, config)
    result.biased_samples = biased_samples
    
    processed, pending = check_evidence_completeness(records, config, drift_records)
    result.processed_records = processed
    result.pending_evidence = pending
    result.normal_records = len(processed)
    result.problematic_records = len(pending)
    
    for drift in drift_records:
        for record_id in drift.affected_records:
            for record in records:
                if record.record_id == record_id:
                    record.drift_impact = drift.deviation
                    record.issues.append(stable_error(
                        "DRIFT_DETECTED",
                        metric=drift.metric,
                        old_val=drift.old_value,
                        new_val=drift.new_value,
                        deviation=drift.deviation
                    ))
    
    result.summary = {
        "review_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_records": result.total_records,
        "normal_records": result.normal_records,
        "problematic_records": result.problematic_records,
        "drift_count": len(drift_records),
        "biased_sample_count": len(biased_samples),
        "pending_evidence_count": len(pending),
        "process_rate": f"{len(processed)/len(records)*100:.1f}%",
        "threshold_config": {
            "score_pass": config.score_pass,
            "score_warning": config.score_warning,
            "drift_tolerance": config.drift_tolerance
        }
    }
    
    return result


def print_review_report(result: ReviewResult, output_file: Optional[str] = None):
    report_lines = []
    
    report_lines.append("=" * 70)
    report_lines.append("                    信贷评分证据复核报告")
    report_lines.append("=" * 70)
    report_lines.append(f"复核时间: {result.summary['review_time']}")
    report_lines.append("")
    
    report_lines.append("-" * 70)
    report_lines.append("一、总体指标")
    report_lines.append("-" * 70)
    report_lines.append(f"总记录数: {result.summary['total_records']}")
    report_lines.append(f"正常记录: {result.summary['normal_records']}")
    report_lines.append(f"问题记录: {result.summary['problematic_records']}")
    report_lines.append(f"阈值漂移数: {result.summary['drift_count']}")
    report_lines.append(f"拉偏样本数: {result.summary['biased_sample_count']}")
    report_lines.append(f"待补证据数: {result.summary['pending_evidence_count']}")
    report_lines.append(f"处理完成率: {result.summary['process_rate']}")
    report_lines.append("")
    
    report_lines.append("-" * 70)
    report_lines.append("二、阈值漂移检测")
    report_lines.append("-" * 70)
    if result.drift_records:
        for i, drift in enumerate(result.drift_records, 1):
            report_lines.append(f"漂移 #{i}: {drift.metric}")
            report_lines.append(f"  严重程度: {drift.severity.upper()}")
            report_lines.append(f"  来源行号: 第 {drift.source_line} 行")
            report_lines.append(f"  原值: {drift.old_value} → 新值: {drift.new_value}")
            report_lines.append(f"  偏差幅度: {drift.deviation}%")
            report_lines.append(f"  影响范围: {drift.impact_scope}")
            report_lines.append(f"  影响记录: {', '.join(drift.affected_records)}")
            report_lines.append("")
    else:
        report_lines.append("未检测到阈值漂移")
        report_lines.append("")
    
    report_lines.append("-" * 70)
    report_lines.append("三、拉偏样本分析 (按影响程度排序)")
    report_lines.append("-" * 70)
    if result.biased_samples:
        for i, sample in enumerate(result.biased_samples, 1):
            report_lines.append(f"样本 #{i}: {sample['record_id']} (第 {sample['line_number']} 行)")
            report_lines.append(f"  客户ID: {sample['customer_id']}")
            report_lines.append(f"  信用评分: {sample['credit_score']}")
            report_lines.append(f"  审批结果: {sample['approval_result']}")
            report_lines.append(f"  拉偏系数: {sample['bias_score']}")
            report_lines.append(f"  拉偏因素:")
            for factor in sample['bias_factors']:
                report_lines.append(f"    - {factor}")
            report_lines.append(f"  版本说明: {sample['version_note']}")
            report_lines.append("")
    else:
        report_lines.append("未发现显著拉偏样本")
        report_lines.append("")
    
    report_lines.append("-" * 70)
    report_lines.append("四、处理状态追踪")
    report_lines.append("-" * 70)
    report_lines.append(f"【已处理 - {len(result.processed_records)} 条】")
    if result.processed_records:
        for pid in result.processed_records:
            report_lines.append(f"  ✓ {pid}")
    else:
        report_lines.append("  (无)")
    report_lines.append("")
    
    report_lines.append(f"【待补证据 - {len(result.pending_evidence)} 条】")
    if result.pending_evidence:
        for item in result.pending_evidence:
            report_lines.append(f"  ✗ {item['record_id']} (第 {item['line_number']} 行) - {item['customer_id']}")
            report_lines.append(f"    评分: {item['credit_score']}")
            for pending in item['pending_items']:
                report_lines.append(f"    · 需补充: {pending['evidence_type']} - {pending['reason']}")
            report_lines.append(f"    版本说明: {item['version_note']}")
            report_lines.append("")
    else:
        report_lines.append("  (无)")
        report_lines.append("")
    
    report_lines.append("=" * 70)
    report_lines.append("                    复核报告结束")
    report_lines.append("=" * 70)
    
    full_report = "\n".join(report_lines)
    print(full_report)
    
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_report)
            f.write("\n\n--- 详细JSON数据 ---\n")
            json.dump({
                "summary": result.summary,
                "drift_records": [vars(d) for d in result.drift_records],
                "biased_samples": result.biased_samples,
                "pending_evidence": result.pending_evidence,
                "processed_records": result.processed_records
            }, f, ensure_ascii=False, indent=2)
        print(f"\n报告已保存至: {output_file}")
    
    return full_report


def main():
    parser = argparse.ArgumentParser(
        description="信贷评分证据复核工具 - 检测阈值漂移、分析拉偏样本、追踪证据完整性",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument("--input-file", "-i", 
                       help=STABLE_PARAMS["input_file"],
                       default=None)
    parser.add_argument("--threshold-file", "-t",
                       help=STABLE_PARAMS["threshold_file"],
                       default=None)
    parser.add_argument("--output-file", "-o",
                       help=STABLE_PARAMS["output_file"],
                       default=None)
    parser.add_argument("--drift-tolerance", "-d",
                       type=float,
                       default=5.0,
                       help=STABLE_PARAMS["drift_tolerance"])
    parser.add_argument("--min-sample-size", "-m",
                       type=int,
                       default=3,
                       help=STABLE_PARAMS["min_sample_size"])
    parser.add_argument("--evidence-fields", "-e",
                       nargs="+",
                       default=None,
                       help=STABLE_PARAMS["evidence_fields"])
    
    args = parser.parse_args()
    
    valid, error_msg = validate_params(args)
    if not valid:
        print(error_msg, file=sys.stderr)
        sys.exit(1)
    
    print(f"开始信贷评分证据复核...")
    print(f"参数配置: 漂移容忍度={args.drift_tolerance}%, 最小样本量={args.min_sample_size}")
    print()
    
    result = run_review(
        input_file=args.input_file,
        threshold_file=args.threshold_file,
        output_file=args.output_file,
        drift_tolerance=args.drift_tolerance,
        min_sample_size=args.min_sample_size,
        evidence_fields=args.evidence_fields
    )
    
    print_review_report(result, args.output_file)
    
    if result.problematic_records > 0:
        sys.exit(2)
    elif len(result.drift_records) > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
