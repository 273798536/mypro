import os
import uuid
from datetime import datetime
from models import Sample, SampleStatus, QualityLevel, QualityControl, DuplicateRecord
import pandas as pd
import numpy as np

def generate_batch_no():
    now = datetime.now()
    return f"BATCH-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"

def generate_filename(batch_no, prefix='report'):
    now = datetime.now()
    return f"{prefix}_{batch_no}_{now.strftime('%Y%m%d_%H%M%S')}"

def detect_duplicates(samples_df, existing_barcodes=None):
    if existing_barcodes is None:
        existing_barcodes = {}
    
    duplicates = {}
    seen_in_batch = {}
    
    for idx, row in samples_df.iterrows():
        barcode = str(row.get('条码', row.get('barcode', ''))).strip()
        if not barcode:
            continue
        
        if barcode in seen_in_batch:
            if barcode not in duplicates:
                duplicates[barcode] = {
                    'type': 'batch_internal',
                    'rows': [seen_in_batch[barcode], idx],
                    'reason': f'批次内重复：该条码在本批数据中第{seen_in_batch[barcode]+2}行和第{idx+2}行重复出现'
                }
            else:
                duplicates[barcode]['rows'].append(idx)
        else:
            seen_in_batch[barcode] = idx
        
        if barcode in existing_barcodes:
            if barcode not in duplicates:
                duplicates[barcode] = {
                    'type': 'cross_batch',
                    'rows': [idx],
                    'existing_samples': existing_barcodes[barcode],
                    'reason': f'跨批次重复：该条码已在{len(existing_barcodes[barcode])}个历史批次中存在，首次出现于{existing_barcodes[barcode][0]["batch_no"]}'
                }
            else:
                duplicates[barcode]['type'] = 'both'
                duplicates[barcode]['existing_samples'] = existing_barcodes.get(barcode, [])
    
    return duplicates

def analyze_quality_difference(qc: QualityControl, historical_qc_list=None):
    if not qc:
        return None
    
    analyses = []
    
    if qc.overall_score is not None:
        if qc.overall_score >= 90:
            analyses.append(f"综合评分{qc.overall_score:.1f}分，质量等级为【{qc.quality_level}】，样本质量优秀，可用于统计分析。")
        elif qc.overall_score >= 75:
            analyses.append(f"综合评分{qc.overall_score:.1f}分，质量等级为【{qc.quality_level}】，样本质量良好，正常可用。")
        elif qc.overall_score >= 60:
            analyses.append(f"综合评分{qc.overall_score:.1f}分，质量等级为【{qc.quality_level}】，样本质量较差，数据使用需谨慎。")
        else:
            analyses.append(f"综合评分{qc.overall_score:.1f}分，质量等级为【{qc.quality_level}】，样本质量不合格，标记为不可用。")
    
    if qc.size_cv is not None:
        if qc.size_cv <= 10:
            analyses.append(f"个体大小变异系数(CV)为{qc.size_cv:.1f}%，苗种规格整齐度好。")
        elif qc.size_cv <= 20:
            analyses.append(f"个体大小变异系数(CV)为{qc.size_cv:.1f}%，苗种规格整齐度一般。")
        else:
            analyses.append(f"个体大小变异系数(CV)为{qc.size_cv:.1f}%，苗种规格差异较大，整齐度差。")
    
    if qc.abnormal_rate is not None and qc.abnormal_rate > 0:
        analyses.append(f"检测到异常个体{qc.abnormal_count}尾，异常率{qc.abnormal_rate:.1f}%。{qc.abnormal_description or ''}")
    
    if historical_qc_list and len(historical_qc_list) > 0:
        prev_scores = [h.overall_score for h in historical_qc_list if h.overall_score is not None]
        if prev_scores and qc.overall_score is not None:
            avg_prev = np.mean(prev_scores)
            diff = qc.overall_score - avg_prev
            if abs(diff) >= 10:
                trend = "显著提升" if diff > 0 else "显著下降"
                analyses.append(f"与历史质控结果相比，本次综合评分{trend}{abs(diff):.1f}分，需关注质量变化原因。")
            elif abs(diff) >= 5:
                trend = "有所提升" if diff > 0 else "有所下降"
                analyses.append(f"与历史质控结果相比，本次综合评分{trend}{abs(diff):.1f}分。")
    
    if qc.morphological_score is not None and qc.morphological_score < 70:
        analyses.append(f"形态学评分偏低({qc.morphological_score:.1f}分)，可能存在畸形、损伤等形态学问题。")
    
    if qc.activity_score is not None and qc.activity_score < 70:
        analyses.append(f"活力评分偏低({qc.activity_score:.1f}分)，苗种游动能力、应激反应较弱。")
    
    if qc.uniformity_score is not None and qc.uniformity_score < 70:
        analyses.append(f"均匀度评分偏低({qc.uniformity_score:.1f}分)，个体间差异较大。")
    
    if qc.diff_analysis_update_count and qc.diff_analysis_update_count > 0:
        analyses.append(f"本次差异分析为第{qc.diff_analysis_update_count + 1}次更新，显微照片补录后重新分析。")
    
    return "\n".join(analyses)

def calculate_quality_scores(qc_data):
    morphological = qc_data.get('morphological_score', 75)
    activity = qc_data.get('activity_score', 75)
    uniformity = qc_data.get('uniformity_score', 75)
    
    overall = (morphological * 0.35 + activity * 0.35 + uniformity * 0.30)
    
    if overall >= 90:
        level = QualityLevel.EXCELLENT.value
    elif overall >= 75:
        level = QualityLevel.GOOD.value
    elif overall >= 60:
        level = QualityLevel.POOR.value
    else:
        level = QualityLevel.UNAVAILABLE.value
    
    return {
        'morphological_score': morphological,
        'activity_score': activity,
        'uniformity_score': uniformity,
        'overall_score': round(overall, 1),
        'quality_level': level
    }

def parse_sample_row(row, batch_id):
    barcode = str(row.get('条码', row.get('barcode', ''))).strip()
    sample_name = str(row.get('样本名称', row.get('sample_name', ''))).strip()
    species = str(row.get('物种', row.get('species', ''))).strip()
    
    initial_count = row.get('初始数量', row.get('initial_count', 0))
    survival_count = row.get('存活数量', row.get('survival_count', 0))
    
    try:
        initial_count = int(initial_count) if initial_count else 0
        survival_count = int(survival_count) if survival_count else 0
    except (ValueError, TypeError):
        initial_count = 0
        survival_count = 0
    
    survival_rate = (survival_count / initial_count * 100) if initial_count > 0 else 0
    
    try:
        temperature = float(row.get('水温', row.get('culture_temperature', ''))) if row.get('水温', row.get('culture_temperature', '')) else None
    except (ValueError, TypeError):
        temperature = None
    
    try:
        salinity = float(row.get('盐度', row.get('culture_salinity', ''))) if row.get('盐度', row.get('culture_salinity', '')) else None
    except (ValueError, TypeError):
        salinity = None
    
    try:
        days = int(row.get('养殖天数', row.get('culture_days', ''))) if row.get('养殖天数', row.get('culture_days', '')) else None
    except (ValueError, TypeError):
        days = None
    
    sample_time = row.get('采样时间', row.get('sample_time', None))
    if sample_time:
        if isinstance(sample_time, pd.Timestamp):
            sample_time = sample_time.to_pydatetime()
        elif isinstance(sample_time, str):
            try:
                sample_time = datetime.strptime(sample_time, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    sample_time = datetime.strptime(sample_time, '%Y-%m-%d')
                except ValueError:
                    sample_time = None
    
    collector = str(row.get('采样人', row.get('collector', ''))).strip()
    
    return Sample(
        batch_id=batch_id,
        barcode=barcode,
        sample_name=sample_name,
        species=species,
        initial_count=initial_count,
        survival_count=survival_count,
        survival_rate=survival_rate,
        culture_temperature=temperature,
        culture_salinity=salinity,
        culture_days=days,
        sample_time=sample_time,
        collector=collector
    )

def save_photo(file, upload_folder):
    if not file:
        return None
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
        return None
    
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    
    return f"/photos/{filename}"
