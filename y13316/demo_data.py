from datetime import datetime, timedelta
from typing import List, Dict, Tuple

from models import (
    Sample, ModelOutput, ThresholdConfig, ManualJudgment,
    Attachment, JudgmentStatus, ThresholdDriftRecord, BadDataRecord
)


def generate_demo_data() -> Tuple[
    List[Sample],
    List[ModelOutput],
    List[ThresholdConfig],
    List[ManualJudgment],
    List[Attachment],
    Dict[str, JudgmentStatus],
    Dict[str, str],
    Dict[str, str],
    Dict[str, datetime],
]:
    base_time = datetime.now()

    samples = [
        Sample(
            sample_id="S001",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240601",
            image_path="/images/s001.jpg",
            captured_at=base_time - timedelta(hours=48),
            meta={"defect_type": "surface_scratch", "severity": "low"}
        ),
        Sample(
            sample_id="S002",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240601",
            image_path="/images/s002.jpg",
            captured_at=base_time - timedelta(hours=47),
            meta={"defect_type": "crack", "severity": "high"}
        ),
        Sample(
            sample_id="S003",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240601",
            image_path="/images/s003.jpg",
            captured_at=base_time - timedelta(hours=46),
            meta={"defect_type": "missing_component", "severity": "critical"}
        ),
        Sample(
            sample_id="S004",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240601",
            image_path="/images/s004.jpg",
            captured_at=base_time - timedelta(hours=45),
            meta={"defect_type": "none", "severity": "none"}
        ),
        Sample(
            sample_id="S005",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240601",
            image_path="/images/s005.jpg",
            captured_at=base_time - timedelta(hours=44),
            meta={"defect_type": "discoloration", "severity": "medium"}
        ),
        Sample(
            sample_id="S006",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240602",
            image_path="/images/s006.jpg",
            captured_at=base_time - timedelta(hours=24),
            meta={"defect_type": "bending", "severity": "low"}
        ),
        Sample(
            sample_id="S007",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240602",
            image_path="/images/s007.jpg",
            captured_at=base_time - timedelta(hours=23),
            meta={"defect_type": "none", "severity": "none"}
        ),
        Sample(
            sample_id="S008",
            product_line="PL-B",
            category="机械部件",
            batch_number="B20240601",
            image_path="/images/s008.jpg",
            captured_at=base_time - timedelta(hours=36),
            meta={"defect_type": "rust", "severity": "medium"}
        ),
        Sample(
            sample_id="S009",
            product_line="PL-B",
            category="机械部件",
            batch_number="B20240601",
            image_path="/images/s009.jpg",
            captured_at=base_time - timedelta(hours=35),
            meta={"defect_type": "none", "severity": "none"}
        ),
        Sample(
            sample_id="S010",
            product_line="PL-B",
            category="机械部件",
            batch_number="B20240601",
            image_path="/images/s010.jpg",
            captured_at=base_time - timedelta(hours=34),
            meta={"defect_type": "deformation", "severity": "high"}
        ),
        Sample(
            sample_id="S011",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240602",
            image_path="/images/s011.jpg",
            captured_at=base_time - timedelta(hours=22),
            meta={"defect_type": "none", "severity": "none"}
        ),
        Sample(
            sample_id="S012",
            product_line="PL-A",
            category="电子元件",
            batch_number="B20240602",
            image_path="/images/s012.jpg",
            captured_at=base_time - timedelta(hours=21),
            meta={"defect_type": "short_circuit", "severity": "critical"}
        ),
    ]

    model_outputs = [
        ModelOutput(
            raw_line_number=1,
            sample_id="S001",
            model_score=0.85,
            model_prediction="PASS",
            confidence=0.92,
            raw_object={"score": 0.85, "prediction": "PASS", "confidence": 0.92, "bbox": [10, 20, 50, 60]},
            created_at=base_time - timedelta(hours=47),
        ),
        ModelOutput(
            raw_line_number=2,
            sample_id="S002",
            model_score=0.15,
            model_prediction="FAIL",
            confidence=0.95,
            raw_object={"score": 0.15, "prediction": "FAIL", "confidence": 0.95, "bbox": [30, 40, 70, 80]},
            created_at=base_time - timedelta(hours=46),
        ),
        ModelOutput(
            raw_line_number=3,
            sample_id="S003",
            model_score=0.05,
            model_prediction="FAIL",
            confidence=0.98,
            raw_object={"score": 0.05, "prediction": "FAIL", "confidence": 0.98, "bbox": [15, 25, 55, 65]},
            created_at=base_time - timedelta(hours=45),
        ),
        ModelOutput(
            raw_line_number=4,
            sample_id="S004",
            model_score=0.92,
            model_prediction="PASS",
            confidence=0.88,
            raw_object={"score": 0.92, "prediction": "PASS", "confidence": 0.88, "bbox": [5, 15, 45, 55]},
            created_at=base_time - timedelta(hours=44),
        ),
        ModelOutput(
            raw_line_number=5,
            sample_id="S005",
            model_score=0.45,
            model_prediction="FAIL",
            confidence=0.75,
            raw_object={"score": 0.45, "prediction": "FAIL", "confidence": 0.75, "bbox": [20, 30, 60, 70]},
            created_at=base_time - timedelta(hours=43),
        ),
        ModelOutput(
            raw_line_number=6,
            sample_id="S006",
            model_score=0.25,
            model_prediction="FAIL",
            confidence=0.42,
            raw_object={"score": 0.25, "prediction": "FAIL", "confidence": 0.42, "bbox": [25, 35, 65, 75]},
            created_at=base_time - timedelta(hours=23),
        ),
        ModelOutput(
            raw_line_number=7,
            sample_id="S007",
            model_score=1.5,
            model_prediction="PASS",
            confidence=0.90,
            raw_object={"score": 1.5, "prediction": "PASS", "confidence": 0.90, "bbox": [8, 18, 48, 58]},
            created_at=base_time - timedelta(hours=22),
        ),
        ModelOutput(
            raw_line_number=8,
            sample_id="S008",
            model_score=0.35,
            model_prediction="PASS",
            confidence=0.55,
            raw_object={"score": 0.35, "prediction": "PASS", "confidence": 0.55, "bbox": [12, 22, 52, 62]},
            created_at=base_time - timedelta(hours=35),
        ),
        ModelOutput(
            raw_line_number=9,
            sample_id="S009",
            model_score=0.88,
            model_prediction="PASS",
            confidence=0.91,
            raw_object={"score": 0.88, "prediction": "PASS", "confidence": 0.91, "bbox": [6, 16, 46, 56]},
            created_at=base_time - timedelta(hours=34),
        ),
        ModelOutput(
            raw_line_number=10,
            sample_id="S010",
            model_score=0.12,
            model_prediction="FAIL",
            confidence=0.94,
            raw_object={"score": 0.12, "prediction": "FAIL", "confidence": 0.94, "bbox": [18, 28, 58, 68]},
            created_at=base_time - timedelta(hours=33),
        ),
        ModelOutput(
            raw_line_number=11,
            sample_id="S011",
            model_score=0.18,
            model_prediction="FAIL",
            confidence=0.80,
            raw_object={"score": 0.18, "prediction": "FAIL", "confidence": 0.80, "bbox": [14, 24, 54, 64]},
            created_at=base_time - timedelta(hours=21),
        ),
        ModelOutput(
            raw_line_number=12,
            sample_id="S012",
            model_score=0.22,
            model_prediction="FAIL",
            confidence=0.85,
            raw_object={"score": 0.22, "prediction": "FAIL", "confidence": 0.85, "bbox": [16, 26, 56, 66]},
            created_at=base_time - timedelta(hours=20),
        ),
    ]

    sample_product_line_map = {s.sample_id: s.product_line for s in samples}
    sample_category_map = {s.sample_id: s.category for s in samples}

    threshold_configs = [
        ThresholdConfig(
            version="v1.0",
            product_line="PL-A",
            category="电子元件",
            pass_threshold=0.70,
            fail_threshold=0.40,
            effective_from=base_time - timedelta(days=30),
            is_active=True,
        ),
        ThresholdConfig(
            version="v1.0",
            product_line="PL-B",
            category="机械部件",
            pass_threshold=0.75,
            fail_threshold=0.35,
            effective_from=base_time - timedelta(days=30),
            is_active=True,
        ),
        ThresholdConfig(
            version="v0.9",
            product_line="PL-A",
            category="电子元件",
            pass_threshold=0.75,
            fail_threshold=0.35,
            effective_from=base_time - timedelta(days=60),
            effective_to=base_time - timedelta(days=30),
            is_active=False,
        ),
    ]

    baseline_judgments = {
        "S001": JudgmentStatus.PASS,
        "S002": JudgmentStatus.FAIL,
        "S003": JudgmentStatus.FAIL,
        "S004": JudgmentStatus.PASS,
        "S005": JudgmentStatus.PASS,
        "S006": JudgmentStatus.FAIL,
        "S007": JudgmentStatus.PASS,
        "S008": JudgmentStatus.PASS,
        "S009": JudgmentStatus.PASS,
        "S010": JudgmentStatus.FAIL,
        "S011": JudgmentStatus.PASS,
        "S012": JudgmentStatus.FAIL,
    }

    manual_judgments = [
        ManualJudgment(
            judgment_id="MJ001",
            sample_id="S005",
            operator="张工",
            judgment=JudgmentStatus.PASS,
            reason="轻微变色不影响功能，已复核确认",
            judged_at=base_time - timedelta(hours=40),
            is_late=False,
        ),
        ManualJudgment(
            judgment_id="MJ002",
            sample_id="S008",
            operator="李工",
            judgment=JudgmentStatus.FAIL,
            reason="模型预测与分数不一致，人工复核判定为FAIL",
            judged_at=base_time - timedelta(hours=30),
            is_late=False,
        ),
        ManualJudgment(
            judgment_id="MJ003",
            sample_id="S011",
            operator="王主管",
            judgment=JudgmentStatus.PASS,
            reason="晚到的复检报告显示样本合格",
            judged_at=base_time - timedelta(hours=2),
            is_late=True,
        ),
    ]

    attachments = [
        Attachment(
            attachment_id="ATT001",
            sample_id="S002",
            file_path="/attachments/s002_xray.jpg",
            file_type="image/jpeg",
            uploaded_at=base_time - timedelta(hours=46),
            is_late_arrival=False,
            description="X光检测原始图像",
        ),
        Attachment(
            attachment_id="ATT002",
            sample_id="S003",
            file_path="/attachments/s003_microscope.jpg",
            file_type="image/jpeg",
            uploaded_at=base_time - timedelta(hours=45),
            is_late_arrival=False,
            description="显微镜放大图像",
        ),
        Attachment(
            attachment_id="ATT003",
            sample_id="S011",
            file_path="/attachments/s011_recheck_report.pdf",
            file_type="application/pdf",
            uploaded_at=base_time - timedelta(hours=1),
            is_late_arrival=True,
            description="复检报告：确认样本合格",
        ),
    ]

    sample_capture_times = {s.sample_id: s.captured_at for s in samples}

    judgment_times = {}
    for mj in manual_judgments:
        judgment_times[mj.sample_id] = mj.judged_at
    for s in samples:
        if s.sample_id not in judgment_times:
            judgment_times[s.sample_id] = s.captured_at + timedelta(hours=2)

    return (
        samples,
        model_outputs,
        threshold_configs,
        manual_judgments,
        attachments,
        baseline_judgments,
        sample_product_line_map,
        sample_category_map,
        sample_capture_times,
        judgment_times,
    )


def generate_historical_outputs() -> Tuple[List[ModelOutput], Dict[str, str], Dict[str, str]]:
    base_time = datetime.now()
    historical = []
    hist_pl_map = {}
    hist_cat_map = {}

    normal_scores = [0.72, 0.85, 0.78, 0.91, 0.68, 0.75, 0.82, 0.79, 0.88, 0.70]
    for i, score in enumerate(normal_scores):
        sample_id = f"HIST{i:03d}"
        mo = ModelOutput(
            raw_line_number=100 + i,
            sample_id=sample_id,
            model_score=score,
            model_prediction="PASS" if score >= 0.7 else "FAIL",
            confidence=0.85 + 0.01 * i,
            raw_object={"score": score, "prediction": "PASS" if score >= 0.7 else "FAIL", "confidence": 0.85 + 0.01 * i},
            created_at=base_time - timedelta(days=2, hours=i),
        )
        hist_pl_map[sample_id] = "PL-A"
        hist_cat_map[sample_id] = "电子元件"
        historical.append(mo)

    drift_scores = [0.18, 0.22, 0.15, 0.28, 0.20, 0.12, 0.25, 0.19, 0.30, 0.21]
    for i, score in enumerate(drift_scores):
        sample_id = f"DRIFT{i:03d}"
        mo = ModelOutput(
            raw_line_number=200 + i,
            sample_id=sample_id,
            model_score=score,
            model_prediction="FAIL",
            confidence=0.90 + 0.005 * i,
            raw_object={"score": score, "prediction": "FAIL", "confidence": 0.90 + 0.005 * i},
            created_at=base_time - timedelta(hours=24 + i),
        )
        hist_pl_map[sample_id] = "PL-A"
        hist_cat_map[sample_id] = "电子元件"
        historical.append(mo)

    return historical, hist_pl_map, hist_cat_map
