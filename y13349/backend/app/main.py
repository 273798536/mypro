from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import PlainTextResponse, FileResponse
from typing import List, Optional
import os

from .models import (
    SampleRecord, ReviewMetric, FilterCriteria,
    DashboardSummary, ReportConfig, VersionDiff,
    MetricDetail, ReviewStatus, SourceType
)
from .parser import MarkdownParser, filter_samples
from .metrics import metrics_calculator
from .version_diff import version_diff_detector
from .report import report_generator

app = FastAPI(title="代码审查指标看板 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(os.path.dirname(__file__)))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), 'frontend')
DATA_DIR = os.path.join(BASE_DIR, 'data')

parser = MarkdownParser(DATA_DIR)

_samples_cache = None
_version_notes_cache = None


def _load_data():
    """加载并缓存数据"""
    global _samples_cache, _version_notes_cache
    if _samples_cache is None or _version_notes_cache is None:
        _version_notes_cache, _samples_cache = parser.parse_all_materials()
    return _version_notes_cache, _samples_cache


def _reload_data():
    """重新加载数据（重跑用）"""
    global _samples_cache, _version_notes_cache
    _version_notes_cache, _samples_cache = parser.parse_all_materials()
    return _version_notes_cache, _samples_cache


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/dashboard", response_model=DashboardSummary)
def get_dashboard(
    versions: Optional[str] = Query(None, description="逗号分隔的版本列表"),
    categories: Optional[str] = Query(None, description="逗号分隔的分类列表"),
    statuses: Optional[str] = Query(None, description="逗号分隔的状态列表"),
    source_types: Optional[str] = Query(None, description="逗号分隔的来源类型列表"),
    has_missing_refs: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
):
    """获取看板汇总数据"""
    _, samples = _load_data()

    criteria = _build_filter_criteria(versions, categories, statuses, source_types, has_missing_refs, is_duplicate)
    return metrics_calculator.get_dashboard_summary(samples, criteria)


@app.get("/api/samples", response_model=List[SampleRecord])
def get_samples(
    versions: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    statuses: Optional[str] = Query(None),
    source_types: Optional[str] = Query(None),
    has_missing_refs: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
):
    """获取样本列表"""
    _, samples = _load_data()

    criteria = _build_filter_criteria(versions, categories, statuses, source_types, has_missing_refs, is_duplicate)
    return filter_samples(samples, criteria)


@app.get("/api/samples/{sample_id}", response_model=SampleRecord)
def get_sample_detail(sample_id: str):
    """获取样本详情"""
    _, samples = _load_data()

    for s in samples:
        if s.sample_id == sample_id:
            return s
    raise HTTPException(status_code=404, detail="Sample not found")


@app.get("/api/metrics", response_model=ReviewMetric)
def get_metrics(
    versions: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    statuses: Optional[str] = Query(None),
    source_types: Optional[str] = Query(None),
    has_missing_refs: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
):
    """获取总体指标"""
    _, samples = _load_data()

    criteria = _build_filter_criteria(versions, categories, statuses, source_types, has_missing_refs, is_duplicate)
    filtered = filter_samples(samples, criteria)
    return metrics_calculator.calculate(filtered)


@app.get("/api/metrics/detail", response_model=MetricDetail)
def get_metrics_detail(
    versions: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    statuses: Optional[str] = Query(None),
    source_types: Optional[str] = Query(None),
    has_missing_refs: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
    top_n: int = 10,
):
    """获取详细指标，包含影响最大的样本"""
    _, samples = _load_data()

    criteria = _build_filter_criteria(versions, categories, statuses, source_types, has_missing_refs, is_duplicate)
    filtered = filter_samples(samples, criteria)
    return metrics_calculator.calculate_detail(filtered, top_n)


@app.get("/api/version-diff", response_model=VersionDiff)
def get_version_diff(
    old_version: str,
    new_version: str,
):
    """比较两个版本的差异"""
    _, samples = _load_data()

    old_samples = [s for s in samples if s.review_version == old_version]
    new_samples = [s for s in samples if s.review_version == new_version]

    if not old_samples and not new_samples:
        raise HTTPException(status_code=404, detail="Version not found")

    return version_diff_detector.detect_sample_changes(old_samples, new_samples)


@app.get("/api/report", response_class=PlainTextResponse)
def get_report(
    versions: Optional[str] = Query(None),
    categories: Optional[str] = Query(None),
    statuses: Optional[str] = Query(None),
    source_types: Optional[str] = Query(None),
    has_missing_refs: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
    include_details: bool = True,
    include_version_diff: bool = False,
    old_version: Optional[str] = None,
    new_version: Optional[str] = None,
):
    """生成Markdown报告"""
    _, samples = _load_data()

    criteria = _build_filter_criteria(versions, categories, statuses, source_types, has_missing_refs, is_duplicate)
    filtered = filter_samples(samples, criteria)
    metric = metrics_calculator.calculate(filtered)
    detail = metrics_calculator.calculate_detail(filtered)

    config = ReportConfig(
        include_details=include_details,
        include_filter_criteria=True,
        include_version_diff=include_version_diff
    )

    version_diff = None
    if include_version_diff and old_version and new_version:
        old_samples = [s for s in samples if s.review_version == old_version]
        new_samples = [s for s in samples if s.review_version == new_version]
        version_diff = version_diff_detector.detect_sample_changes(old_samples, new_samples)

    report = report_generator.generate_report(
        samples=filtered,
        metric=metric,
        criteria=criteria,
        config=config,
        version_diff=version_diff,
        influential_samples=detail.top_influential_samples
    )

    return report


@app.post("/api/reload")
def reload_data():
    """重新加载数据（重跑）"""
    version_notes, samples = _reload_data()
    return {
        "status": "ok",
        "version_notes_count": len(version_notes),
        "samples_count": len(samples),
        "versions": sorted(set(s.review_version for s in samples))
    }


@app.get("/api/materials")
def list_materials():
    """列出所有材料文件"""
    materials = parser.list_material_files()
    return {
        "count": len(materials),
        "materials": [
            {
                "version": m.version,
                "source_type": m.source_type.value,
                "source_file": m.source_file,
                "created_at": m.created_at.isoformat()
            }
            for m in materials
        ]
    }


@app.get("/api/samples/{sample_id}/original-statement")
def get_original_statement(sample_id: str):
    """查找样本在版本说明中的原始说法"""
    version_notes, samples = _load_data()

    sample = None
    for s in samples:
        if s.sample_id == sample_id:
            sample = s
            break

    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    results = version_diff_detector.find_original_statement(version_notes, sample)

    return {
        "sample_id": sample_id,
        "sample_name": sample.sample_name,
        "matches": [
            {
                "version": note.version,
                "title": note.title,
                "source_file": note.source_file,
                "matched_content": content
            }
            for note, content in results
        ]
    }


def _build_filter_criteria(
    versions: Optional[str],
    categories: Optional[str],
    statuses: Optional[str],
    source_types: Optional[str],
    has_missing_refs: Optional[bool],
    is_duplicate: Optional[bool],
) -> FilterCriteria:
    """从查询参数构建筛选条件"""
    criteria = FilterCriteria()

    if versions:
        criteria.versions = [v.strip() for v in versions.split(",") if v.strip()]
    if categories:
        criteria.categories = [c.strip() for c in categories.split(",") if c.strip()]
    if statuses:
        criteria.statuses = [ReviewStatus(s.strip()) for s in statuses.split(",") if s.strip()]
    if source_types:
        criteria.source_types = [SourceType(s.strip()) for s in source_types.split(",") if s.strip()]
    if has_missing_refs is not None:
        criteria.has_missing_refs = has_missing_refs
    if is_duplicate is not None:
        criteria.is_duplicate = is_duplicate

    return criteria


if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def read_root():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
