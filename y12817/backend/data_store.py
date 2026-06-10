import json
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import random
import uuid

from models import (
    Sample, SampleMetadata, SequencingResult, ProcessingRecord,
    QCFlag, CoverageReport, CoverageEstimate
)
from coverage_estimator import (
    estimate_coverage_from_sequencing,
    generate_plain_language_summary
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SAMPLES_FILE = os.path.join(DATA_DIR, "samples.json")


def _ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def load_samples() -> Dict[str, Sample]:
    _ensure_data_dir()
    if not os.path.exists(SAMPLES_FILE):
        return {}
    with open(SAMPLES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    samples = {}
    for sid, sdata in data.items():
        samples[sid] = Sample(**sdata)
    return samples


def save_samples(samples: Dict[str, Sample]):
    _ensure_data_dir()
    data = {}
    for sid, sample in samples.items():
        data[sid] = sample.model_dump()
    with open(SAMPLES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _add_processing_record(
    sample: Sample,
    operator: str,
    action_type: str,
    details: dict,
    reason: Optional[str] = None
):
    record = ProcessingRecord(
        record_id=generate_id("REC"),
        timestamp=now_str(),
        operator=operator,
        action_type=action_type,
        details=details,
        reason=reason
    )
    sample.processing_records.append(record)


def generate_sample_data() -> Dict[str, Sample]:
    samples: Dict[str, Sample] = {}

    common_species = [
        "羊草", "针茅", "冷蒿", "小叶锦鸡儿", "猪毛菜",
        "糙隐子草", "百里香", "麻黄", "沙蒿", "驼绒藜",
        "冰草", "披碱草", "早熟禾", "苔草", "鸢尾"
    ]

    sample_configs = [
        {
            "sample_id": "Q2024-001",
            "quadrat_id": "Q-A01",
            "location": "内蒙古锡林郭勒草原",
            "habitat_type": "典型草原",
            "collector": "张育种",
            "collection_date": "2024-07-15",
            "num_species": 8,
            "total_reads": 150000,
            "is_normal": True
        },
        {
            "sample_id": "Q2024-002",
            "quadrat_id": "Q-A02",
            "location": "内蒙古锡林郭勒草原",
            "habitat_type": "典型草原",
            "collector": "张育种",
            "collection_date": "2024-07-15",
            "num_species": 5,
            "total_reads": 120000,
            "is_normal": True
        },
        {
            "sample_id": "Q2024-003",
            "quadrat_id": "Q-B01",
            "location": "宁夏沙坡头",
            "habitat_type": "荒漠草原",
            "collector": "李专员",
            "collection_date": "2024-07-18",
            "num_species": 4,
            "total_reads": 90000,
            "is_normal": False,
            "contamination": True
        },
        {
            "sample_id": "Q2024-004",
            "quadrat_id": "Q-C01",
            "location": "青海三江源",
            "habitat_type": "高寒草甸",
            "collector": "王研究员",
            "collection_date": "2024-08-01",
            "num_species": 12,
            "total_reads": 200000,
            "is_normal": True
        },
        {
            "sample_id": "Q2024-005",
            "quadrat_id": "Q-C02",
            "location": "青海三江源",
            "habitat_type": "高寒草甸",
            "collector": "王研究员",
            "collection_date": "2024-08-01",
            "num_species": 10,
            "total_reads": 180000,
            "is_normal": False,
            "low_quality": True
        },
        {
            "sample_id": "Q2024-006",
            "quadrat_id": "Q-D01",
            "location": "云南西双版纳",
            "habitat_type": "热带雨林",
            "collector": "赵博士",
            "collection_date": "2024-08-10",
            "num_species": 15,
            "total_reads": 250000,
            "is_normal": True
        }
    ]

    random.seed(42)

    for cfg in sample_configs:
        selected_species = random.sample(common_species, cfg["num_species"])
        reads_per_species = []

        total_reads = cfg["total_reads"]
        weights = [random.uniform(0.5, 2.0) for _ in range(cfg["num_species"])]
        total_weight = sum(weights)

        for w in weights:
            reads = int((w / total_weight) * total_reads)
            reads_per_species.append(reads)

        if cfg.get("contamination"):
            contamination_species = "大肠杆菌(疑似污染)"
            selected_species.append(contamination_species)
            contam_reads = int(total_reads * 0.15)
            reads_per_species.append(contam_reads)

        sequencing_results = []
        for i, species in enumerate(selected_species):
            reads = reads_per_species[i]
            total_r = sum(reads_per_species)
            rel_abd = reads / total_r if total_r > 0 else 0

            quality = random.uniform(28, 38)
            if cfg.get("low_quality") and i == 0:
                quality = random.uniform(18, 22)

            gc = random.uniform(40, 60)

            sequencing_results.append(SequencingResult(
                species_name=species,
                read_count=reads,
                relative_abundance=round(rel_abd, 6),
                gc_content=round(gc, 2),
                quality_score=round(quality, 2)
            ))

        metadata = SampleMetadata(
            sample_id=cfg["sample_id"],
            quadrat_id=cfg["quadrat_id"],
            location=cfg["location"],
            collection_date=cfg["collection_date"],
            collector=cfg["collector"],
            habitat_type=cfg["habitat_type"],
            area_m2=1.0
        )

        sample = Sample(
            metadata=metadata,
            sequencing_results=sequencing_results,
            is_contaminated=cfg.get("contamination", False)
        )

        _add_processing_record(
            sample,
            operator=cfg["collector"],
            action_type="sample_collection",
            details={
                "location": cfg["location"],
                "habitat_type": cfg["habitat_type"],
                "area_m2": 1.0
            },
            reason="野外样方采集"
        )

        _add_processing_record(
            sample,
            operator="测序中心-刘技术",
            action_type="sequencing",
            details={
                "platform": "Illumina NovaSeq",
                "total_reads": cfg["total_reads"],
                "read_length": "PE150"
            },
            reason="样本送检测序"
        )

        if cfg.get("contamination"):
            qc_flag = QCFlag(
                flag_id=generate_id("QC"),
                sample_id=cfg["sample_id"],
                flag_type="contamination",
                description="检测到非目标物种序列，疑似样本污染",
                severity="high",
                status="open",
                raised_by="自动质控系统",
                raised_at=now_str()
            )
            sample.qc_flags.append(qc_flag)

        if cfg.get("low_quality"):
            qc_flag = QCFlag(
                flag_id=generate_id("QC"),
                sample_id=cfg["sample_id"],
                flag_type="low_quality",
                description="部分物种测序质量值偏低，可能影响覆盖度估算",
                severity="medium",
                status="open",
                raised_by="自动质控系统",
                raised_at=now_str()
            )
            sample.qc_flags.append(qc_flag)

        samples[cfg["sample_id"]] = sample

    save_samples(samples)
    return samples


def get_all_samples() -> List[dict]:
    samples = load_samples()
    result = []
    for sid, sample in samples.items():
        result.append({
            "sample_id": sample.metadata.sample_id,
            "quadrat_id": sample.metadata.quadrat_id,
            "location": sample.metadata.location,
            "habitat_type": sample.metadata.habitat_type,
            "collection_date": sample.metadata.collection_date,
            "collector": sample.metadata.collector,
            "species_count": len(sample.sequencing_results),
            "has_qc_flags": len(sample.qc_flags) > 0,
            "qc_flags": [f.model_dump() for f in sample.qc_flags],
            "is_contaminated": sample.is_contaminated,
            "contamination_resolved": sample.contamination_resolved,
            "current_report_version": sample.current_report_version,
            "total_coverage": _get_latest_coverage(sample)
        })
    return result


def _get_latest_coverage(sample: Sample) -> Optional[float]:
    if sample.reports:
        latest = max(sample.reports, key=lambda r: r.version)
        return latest.estimate.total_coverage
    return None


def get_sample_detail(sample_id: str) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None
    return sample.model_dump()


def run_estimation(sample_id: str, operator: str) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    estimate = estimate_coverage_from_sequencing(
        sample.sequencing_results,
        sample.metadata.area_m2
    )
    estimate.sample_id = sample_id

    summary, copyable = generate_plain_language_summary(
        estimate,
        sample_id,
        sample.metadata.habitat_type
    )

    new_version = sample.current_report_version + 1
    parent_version = sample.current_report_version if sample.current_report_version > 0 else None

    report = CoverageReport(
        report_id=generate_id("RPT"),
        sample_id=sample_id,
        generated_at=now_str(),
        generated_by=operator,
        estimate=estimate,
        plain_language_summary=summary,
        copyable_text=copyable,
        version=new_version,
        parent_version=parent_version
    )

    sample.reports.append(report)
    sample.current_report_version = new_version

    _add_processing_record(
        sample,
        operator=operator,
        action_type="coverage_estimation",
        details={
            "report_id": report.report_id,
            "version": new_version,
            "method": estimate.estimation_method,
            "total_coverage": estimate.total_coverage
        },
        reason="执行覆盖度估算"
    )

    save_samples(samples)
    return report.model_dump()


def modify_sequencing_result(
    sample_id: str,
    species_name: str,
    new_read_count: int,
    operator: str,
    reason: str
) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    old_read_count = None
    for result in sample.sequencing_results:
        if result.species_name == species_name:
            old_read_count = result.read_count
            result.read_count = new_read_count
            break

    if old_read_count is None:
        return None

    total_reads = sum(r.read_count for r in sample.sequencing_results)
    for result in sample.sequencing_results:
        result.relative_abundance = round(result.read_count / total_reads, 6) if total_reads > 0 else 0

    _add_processing_record(
        sample,
        operator=operator,
        action_type="modify_sequencing",
        details={
            "species_name": species_name,
            "old_read_count": old_read_count,
            "new_read_count": new_read_count,
            "change": new_read_count - old_read_count
        },
        reason=reason
    )

    save_samples(samples)
    return sample.model_dump()


def add_species(
    sample_id: str,
    species_name: str,
    read_count: int,
    operator: str,
    reason: str
) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    for result in sample.sequencing_results:
        if result.species_name == species_name:
            return None

    new_result = SequencingResult(
        species_name=species_name,
        read_count=read_count,
        relative_abundance=0.0,
        gc_content=45.0,
        quality_score=32.0
    )
    sample.sequencing_results.append(new_result)

    total_reads = sum(r.read_count for r in sample.sequencing_results)
    for result in sample.sequencing_results:
        result.relative_abundance = round(result.read_count / total_reads, 6) if total_reads > 0 else 0

    _add_processing_record(
        sample,
        operator=operator,
        action_type="add_species",
        details={
            "species_name": species_name,
            "read_count": read_count
        },
        reason=reason
    )

    save_samples(samples)
    return sample.model_dump()


def remove_species(
    sample_id: str,
    species_name: str,
    operator: str,
    reason: str
) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    removed = None
    new_results = []
    for result in sample.sequencing_results:
        if result.species_name == species_name:
            removed = result
        else:
            new_results.append(result)

    if not removed:
        return None

    sample.sequencing_results = new_results

    total_reads = sum(r.read_count for r in sample.sequencing_results)
    for result in sample.sequencing_results:
        result.relative_abundance = round(result.read_count / total_reads, 6) if total_reads > 0 else 0

    _add_processing_record(
        sample,
        operator=operator,
        action_type="remove_species",
        details={
            "species_name": species_name,
            "read_count_removed": removed.read_count
        },
        reason=reason
    )

    save_samples(samples)
    return sample.model_dump()


def resolve_qc_flag(
    sample_id: str,
    flag_id: str,
    resolution: str,
    operator: str,
    mark_contamination_resolved: bool = False
) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    flag = None
    for f in sample.qc_flags:
        if f.flag_id == flag_id:
            flag = f
            break

    if not flag:
        return None

    flag.status = "resolved"
    flag.resolved_by = operator
    flag.resolved_at = now_str()
    flag.resolution = resolution

    if mark_contamination_resolved and flag.flag_type == "contamination":
        sample.contamination_resolved = True

    _add_processing_record(
        sample,
        operator=operator,
        action_type="qc_resolve",
        details={
            "flag_id": flag_id,
            "flag_type": flag.flag_type,
            "resolution": resolution,
            "mark_contamination_resolved": mark_contamination_resolved
        },
        reason="处理质控问题"
    )

    save_samples(samples)
    return sample.model_dump()


def get_report_versions(sample_id: str) -> Optional[List[dict]]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    reports = sorted(sample.reports, key=lambda r: r.version, reverse=True)
    return [r.model_dump() for r in reports]


def compare_reports(sample_id: str, version_a: int, version_b: int) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    report_a = None
    report_b = None
    for r in sample.reports:
        if r.version == version_a:
            report_a = r
        if r.version == version_b:
            report_b = r

    if not report_a or not report_b:
        return None

    est_a = report_a.estimate
    est_b = report_b.estimate

    species_set = set(est_a.species_coverage.keys()) | set(est_b.species_coverage.keys())
    species_diff = {}
    for sp in species_set:
        cov_a = est_a.species_coverage.get(sp, 0)
        cov_b = est_b.species_coverage.get(sp, 0)
        species_diff[sp] = {
            "version_a": cov_a,
            "version_b": cov_b,
            "difference": round(cov_b - cov_a, 2)
        }

    comparison = {
        "sample_id": sample_id,
        "version_a": version_a,
        "version_b": version_b,
        "generated_at_a": report_a.generated_at,
        "generated_at_b": report_b.generated_at,
        "generated_by_a": report_a.generated_by,
        "generated_by_b": report_b.generated_by,
        "total_coverage": {
            "version_a": est_a.total_coverage,
            "version_b": est_b.total_coverage,
            "difference": round(est_b.total_coverage - est_a.total_coverage, 2)
        },
        "species_richness": {
            "version_a": est_a.species_richness,
            "version_b": est_b.species_richness,
            "difference": est_b.species_richness - est_a.species_richness
        },
        "shannon_index": {
            "version_a": est_a.shannon_index,
            "version_b": est_b.shannon_index,
            "difference": round(est_b.shannon_index - est_a.shannon_index, 4)
        },
        "dominant_species": {
            "version_a": est_a.dominant_species,
            "version_b": est_b.dominant_species,
            "changed": est_a.dominant_species != est_b.dominant_species
        },
        "species_coverage_diff": species_diff
    }

    return comparison


def get_processing_history(sample_id: str) -> Optional[List[dict]]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    records = sorted(
        sample.processing_records,
        key=lambda r: r.timestamp,
        reverse=True
    )
    return [r.model_dump() for r in records]


def trace_anomaly(sample_id: str, flag_id: str) -> Optional[dict]:
    samples = load_samples()
    sample = samples.get(sample_id)
    if not sample:
        return None

    flag = None
    for f in sample.qc_flags:
        if f.flag_id == flag_id:
            flag = f
            break

    if not flag:
        return None

    related_records = []
    for record in sample.processing_records:
        if flag.flag_type in record.action_type or "qc" in record.action_type:
            related_records.append(record.model_dump())

    affected_species = []
    if flag.flag_type == "contamination":
        for seq in sample.sequencing_results:
            if "污染" in seq.species_name or "大肠" in seq.species_name:
                affected_species.append(seq.model_dump())
    elif flag.flag_type == "low_quality":
        for seq in sample.sequencing_results:
            if seq.quality_score and seq.quality_score < 25:
                affected_species.append(seq.model_dump())

    trace_result = {
        "flag": flag.model_dump(),
        "sample_metadata": sample.metadata.model_dump(),
        "affected_species": affected_species,
        "related_processing_records": related_records,
        "all_processing_records": [r.model_dump() for r in sample.processing_records],
        "sequencing_results": [s.model_dump() for s in sample.sequencing_results],
        "reports": [r.model_dump() for r in sample.reports]
    }

    return trace_result
