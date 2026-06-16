import difflib
import hashlib
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from dataclasses import asdict
import pandas as pd
import numpy as np

from .data_models import (
    SafetyRule, ModelLog, TrainingSample,
    AnalysisRecord, EvaluationRecord,
    DifficultyLevel, ConflictType, DataSource
)
from .sample_data import get_conflict_type_descriptions


class DifficultyAnalyzer:
    def __init__(self, safety_rules: List[SafetyRule]):
        self.safety_rules = safety_rules
        self.conflict_descriptions = get_conflict_type_descriptions()
        
    def _calculate_safety_rule_matches(self, features: Dict, content: str) -> Tuple[List[str], List[str]]:
        matched = []
        missing = []
        
        content_lower = content.lower()
        
        rule_keywords = {
            "SR-001": ["身份证", "手机号", "电话", "住址", "地址", "姓名"],
            "SR-002": ["贷款", "理财", "投资", "金融", "保险", "收益", "利率"],
            "SR-003": ["糖尿病", "药品", "治疗", "诊断", "医生", "医院", "病", "症状", "用药"],
            "SR-004": ["广告", "功效", "100%", "根治", "不反弹", "无副作用", "最新技术"],
            "SR-005": ["孩子", "小朋友", "未成年人", "12岁", "3岁", "学生", "儿童"]
        }
        
        for rule in self.safety_rules:
            keywords = rule_keywords.get(rule.rule_id, [])
            has_match = any(kw in content_lower for kw in keywords)
            
            if has_match:
                field_missing = False
                for req_field in rule.required_fields:
                    if req_field not in features or features.get(req_field) in [None, False, "", []]:
                        if req_field != "敏感词数量":
                            field_missing = True
                            break
                
                if field_missing:
                    missing.append(rule.rule_name)
                else:
                    matched.append(rule.rule_name)
        
        return matched, missing
    
    def _detect_conflicts(self, 
                          sample: TrainingSample, 
                          log: ModelLog) -> Tuple[List[ConflictType], List[str], List[str]]:
        conflicts = []
        details = []
        label_conflict_sources = []
        
        if sample.label != log.prediction:
            conflicts.append(ConflictType.LABEL_MISMATCH)
            details.append(
                f"人工标注为「{sample.label}」，但模型判断为「{log.prediction}」，两者结论不一致"
            )
            label_conflict_sources.extend([
                f"训练样本标注：{sample.annotator}（{sample.annotation_time}）",
                f"模型日志判断：{log.model_version}（{log.timestamp}）"
            ])
        
        if "单位" in sample.remarks or "漏填单位" in sample.content or "单位缺失" in sample.remarks:
            conflicts.append(ConflictType.UNIT_MISSING)
            details.append(
                "数值后面没有填写计量单位（如元、万元、克等），可能导致金额或数量判断错误"
            )
        
        if "旧表" in sample.content or "旧系统" in sample.remarks or "旧表格式" in sample.remarks:
            conflicts.append(ConflictType.OLD_FORMAT)
            details.append(
                "这条数据是从旧系统迁移过来的，字段格式和新系统不一样，需要额外处理"
            )
        
        if "补录" in sample.content or "补充" in sample.content:
            conflicts.append(ConflictType.SUPPLEMENT_NOTE)
            details.append(
                "原始记录信息不完整，重要内容是后面在备注里补充的，可能存在信息遗漏风险"
            )
        
        if "乱码" in sample.content or "坏数据" in sample.remarks:
            conflicts.append(ConflictType.SAFETY_RULE_MISSING)
            details.append(
                "数据包含乱码或特殊字符，内容解析失败，无法正常匹配安全规则"
            )
        
        return conflicts, details, label_conflict_sources
    
    def _calculate_difficulty_score(self, 
                                   conflicts: List[ConflictType], 
                                   confidence: float) -> Tuple[float, DifficultyLevel]:
        score = 0.0
        
        conflict_weights = {
            ConflictType.LABEL_MISMATCH: 25,
            ConflictType.SAFETY_RULE_MISSING: 30,
            ConflictType.UNIT_MISSING: 15,
            ConflictType.OLD_FORMAT: 10,
            ConflictType.SUPPLEMENT_NOTE: 10,
            ConflictType.DUPLICATE: 15
        }
        
        for conflict in conflicts:
            score += conflict_weights.get(conflict, 10)
        
        score += (1 - confidence) * 20
        
        if score < 20:
            level = DifficultyLevel.EASY
        elif score < 40:
            level = DifficultyLevel.MEDIUM
        elif score < 65:
            level = DifficultyLevel.HARD
        else:
            level = DifficultyLevel.EXTREME
        
        return min(score, 100), level
    
    def analyze_sample(self, 
                      sample: TrainingSample, 
                      log: ModelLog,
                      duplicate_map: Dict[str, str]) -> AnalysisRecord:
        conflicts, details, label_sources = self._detect_conflicts(sample, log)
        
        if sample.sample_id in duplicate_map:
            conflicts.append(ConflictType.DUPLICATE)
            original_id = duplicate_map[sample.sample_id]
            details.append(f"这条记录和样本 {original_id} 内容几乎完全一样，属于重复录入")
            is_duplicate = True
            duplicate_of = original_id
        else:
            is_duplicate = False
            duplicate_of = None
        
        matched_rules, missing_rules = self._calculate_safety_rule_matches(log.features, sample.content)
        
        if missing_rules and ConflictType.SAFETY_RULE_MISSING not in conflicts:
            conflicts.append(ConflictType.SAFETY_RULE_MISSING)
            for rule_name in missing_rules:
                details.append(
                    f"内容涉及「{rule_name}」的适用范围，但安全规则中缺少必要的检查字段"
                )
        
        difficulty_score, difficulty_level = self._calculate_difficulty_score(
            conflicts, log.confidence
        )
        
        source_materials = [
            f"训练样本：{sample.sample_id}（标注人：{sample.annotator}）",
            f"模型日志：{log.log_id}（模型版本：{log.model_version}）"
        ]
        
        raw_data = {
            "training_sample": asdict(sample),
            "model_log": asdict(log)
        }
        
        return AnalysisRecord(
            sample_id=sample.sample_id,
            difficulty=difficulty_level,
            conflicts=conflicts,
            conflict_details=details,
            safety_rule_matches=matched_rules,
            safety_rule_missing=missing_rules,
            label_conflict_sources=label_sources,
            source_materials=source_materials,
            is_duplicate=is_duplicate,
            duplicate_of=duplicate_of,
            difficulty_score=difficulty_score,
            raw_data=raw_data
        )


class DuplicateDetector:
    def __init__(self, threshold: float = 0.9):
        self.threshold = threshold
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        return difflib.SequenceMatcher(None, text1, text2).ratio()
    
    def _content_hash(self, text: str) -> str:
        import re
        cleaned = re.sub(r'【.*?】', '', text)
        cleaned = re.sub(r'\s+', '', cleaned)
        return hashlib.md5(cleaned.encode('utf-8')).hexdigest()
    
    def detect_duplicates(self, samples: List[TrainingSample]) -> Tuple[Dict[str, str], List[Tuple[str, str, float]]]:
        import re
        duplicate_map = {}
        duplicate_pairs = []
        seen_hash = {}
        seen_content = {}
        
        for sample in samples:
            content = sample.content
            cleaned_content = re.sub(r'【.*?】', '', content)
            h = self._content_hash(content)
            
            if h in seen_hash:
                duplicate_map[sample.sample_id] = seen_hash[h]
                duplicate_pairs.append((seen_hash[h], sample.sample_id, 1.0))
            else:
                matched = False
                for existing_id, existing_cleaned in seen_content.items():
                    sim = self._text_similarity(cleaned_content, existing_cleaned)
                    if sim >= self.threshold:
                        duplicate_map[sample.sample_id] = existing_id
                        duplicate_pairs.append((existing_id, sample.sample_id, sim))
                        matched = True
                        break
                
                if not matched:
                    seen_hash[h] = sample.sample_id
                    seen_content[sample.sample_id] = cleaned_content
        
        return duplicate_map, duplicate_pairs
    
    def deduplicate(self, records: List[AnalysisRecord]) -> Tuple[List[AnalysisRecord], List[AnalysisRecord]]:
        kept = []
        removed = []
        seen_ids = set()
        
        for record in records:
            if record.is_duplicate:
                removed.append(record)
            else:
                kept.append(record)
                seen_ids.add(record.sample_id)
        
        return kept, removed


class EvaluationPlayback:
    def __init__(self):
        self.evaluation_records: List[EvaluationRecord] = []
    
    def record_evaluation(self,
                         sample_id: str,
                         original_judgment: str,
                         reviewed_judgment: str,
                         change_reason: str,
                         reviewer: str,
                         before_dedup: Optional[Dict] = None,
                         after_dedup: Optional[Dict] = None) -> EvaluationRecord:
        
        judgment_changed = original_judgment != reviewed_judgment
        
        record = EvaluationRecord(
            record_id=f"EVAL-{len(self.evaluation_records) + 1:04d}",
            sample_id=sample_id,
            original_judgment=original_judgment,
            reviewed_judgment=reviewed_judgment,
            judgment_changed=judgment_changed,
            change_reason=change_reason,
            reviewer=reviewer,
            review_time=pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            before_dedup=before_dedup,
            after_dedup=after_dedup
        )
        
        self.evaluation_records.append(record)
        return record
    
    def get_changed_evaluations(self) -> List[EvaluationRecord]:
        return [r for r in self.evaluation_records if r.judgment_changed]
    
    def get_dedup_comparison(self) -> pd.DataFrame:
        data = []
        for r in self.evaluation_records:
            if r.before_dedup and r.after_dedup:
                data.append({
                    "样本编号": r.sample_id,
                    "去重前标签": r.before_dedup.get("label", ""),
                    "去重后标签": r.after_dedup.get("label", ""),
                    "去重前难度": r.before_dedup.get("difficulty", ""),
                    "去重后难度": r.after_dedup.get("difficulty", ""),
                    "标签是否变化": r.before_dedup.get("label", "") != r.after_dedup.get("label", ""),
                    "变化原因": r.change_reason
                })
        return pd.DataFrame(data)


def run_full_analysis(safety_rules: List[SafetyRule],
                     model_logs: List[ModelLog],
                     training_samples: List[TrainingSample]) -> Dict:
    
    log_map = {log.sample_id: log for log in model_logs}
    
    duplicate_detector = DuplicateDetector(threshold=0.85)
    duplicate_map, duplicate_pairs = duplicate_detector.detect_duplicates(training_samples)
    
    analyzer = DifficultyAnalyzer(safety_rules)
    
    before_dedup_records = []
    for sample in training_samples:
        log = log_map.get(sample.sample_id)
        if log:
            no_dup_map = {}
            record = analyzer.analyze_sample(sample, log, no_dup_map)
            before_dedup_records.append(record)
    
    after_dedup_records = []
    for sample in training_samples:
        log = log_map.get(sample.sample_id)
        if log:
            record = analyzer.analyze_sample(sample, log, duplicate_map)
            after_dedup_records.append(record)
    
    kept_records, removed_records = duplicate_detector.deduplicate(after_dedup_records)
    
    playback = EvaluationPlayback()
    
    for record in after_dedup_records:
        sample = next((s for s in training_samples if s.sample_id == record.sample_id), None)
        log = log_map.get(record.sample_id)
        
        if sample and log:
            original_label = sample.label
            reviewed_label = log.prediction
            
            if record.is_duplicate:
                original_sample = next((s for s in training_samples if s.sample_id == record.duplicate_of), None)
                if original_sample:
                    change_reason = f"与样本 {record.duplicate_of} 内容重复，但原标注为「{original_sample.label}」，此条标注为「{sample.label}」"
                    before_dedup = {
                        "label": sample.label,
                        "difficulty": record.difficulty.value,
                        "sample_id": sample.sample_id
                    }
                    after_dedup = {
                        "label": original_sample.label,
                        "difficulty": "（已去重）",
                        "sample_id": original_sample.sample_id
                    }
                else:
                    change_reason = "重复样本，去重后移除"
                    before_dedup = {"label": sample.label, "difficulty": record.difficulty.value}
                    after_dedup = {"label": "（已移除）", "difficulty": "（已移除）"}
                
                playback.record_evaluation(
                    sample_id=record.sample_id,
                    original_judgment=original_label,
                    reviewed_judgment=reviewed_label,
                    change_reason=change_reason,
                    reviewer="安全审核员",
                    before_dedup=before_dedup,
                    after_dedup=after_dedup
                )
            
            elif record.difficulty in [DifficultyLevel.HARD, DifficultyLevel.EXTREME]:
                change_reason = "难度较高，需要人工复核"
                playback.record_evaluation(
                    sample_id=record.sample_id,
                    original_judgment=original_label,
                    reviewed_judgment=reviewed_label,
                    change_reason=change_reason,
                    reviewer="安全审核员"
                )
    
    difficulty_dist = defaultdict(int)
    conflict_dist = defaultdict(int)
    
    for record in kept_records:
        difficulty_dist[record.difficulty.value] += 1
        for conflict in record.conflicts:
            conflict_dist[conflict.value] += 1
    
    return {
        "before_dedup_records": before_dedup_records,
        "after_dedup_records": after_dedup_records,
        "kept_records": kept_records,
        "removed_records": removed_records,
        "duplicate_pairs": duplicate_pairs,
        "playback": playback,
        "difficulty_distribution": dict(difficulty_dist),
        "conflict_distribution": dict(conflict_dist),
        "safety_rules": safety_rules,
        "model_logs": model_logs,
        "training_samples": training_samples
    }
