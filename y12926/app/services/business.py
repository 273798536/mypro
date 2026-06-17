import os
import io
import re
import hashlib
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

try:
    import pandas as pd
except ImportError:
    pd = None

from sqlalchemy.orm import Session

from app.services.crud import (
    BatchCRUD, MaterialCRUD, QuestionCRUD, ChangeCRUD,
    RoutingCRUD, RollbackCRUD
)
from app.schemas.schemas import (
    BatchCreate, QuestionImportItem, DedupResult
)
from app.config import BatchStatus, QuestionStatus


ROUTING_RULES = [
    {
        "name": "model_math_v1",
        "model_name": "math-specialist-v2",
        "keywords": ["计算", "公式", "方程", "函数", "导数", "积分", "概率", "统计", "几何", "向量"],
        "categories": ["数学", "数学题", "计算题"],
        "min_confidence": 0.7,
    },
    {
        "name": "model_code_v1",
        "model_name": "code-expert-v3",
        "keywords": ["代码", "编程", "python", "java", "算法", "调试", "函数", "类", "接口", "递归", "遍历", "循环"],
        "categories": ["编程", "代码题", "算法题"],
        "min_confidence": 0.7,
    },
    {
        "name": "model_lang_v1",
        "model_name": "language-understanding-v1",
        "keywords": ["阅读", "理解", "翻译", "写作", "作文", "语法", "语义", "修辞", "文言文", "英语", "完形"],
        "categories": ["语文", "英语", "阅读理解", "写作"],
        "min_confidence": 0.65,
    },
    {
        "name": "model_science_v1",
        "model_name": "science-lab-v1",
        "keywords": ["实验", "物理", "化学", "生物", "反应", "电路", "力学", "分子", "细胞", "元素", "化合"],
        "categories": ["物理", "化学", "生物", "科学"],
        "min_confidence": 0.7,
    },
    {
        "name": "model_history_v1",
        "model_name": "history-humanities-v1",
        "keywords": ["历史", "朝代", "战争", "条约", "年代", "地理", "政治", "经济", "文化", "宗教", "哲学"],
        "categories": ["历史", "地理", "政治", "人文"],
        "min_confidence": 0.65,
    },
    {
        "name": "model_general_v1",
        "model_name": "general-qa-v2",
        "keywords": [],
        "categories": [],
        "min_confidence": 0.0,
        "fallback": True,
    },
]


def _hash_file(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def parse_excel_to_items(file_bytes: bytes, filename: str = "upload.xlsx") -> List[Dict[str, Any]]:
    if pd is None:
        raise RuntimeError("pandas 未安装，无法解析 Excel")
    result = []
    xl = pd.ExcelFile(io.BytesIO(file_bytes))
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name=sheet_name)
        df = df.where(pd.notnull(df), None)
        col_map = _normalize_columns(list(df.columns))
        for idx, row in df.iterrows():
            item = _row_to_import_item(row, col_map)
            if item and item.get("title"):
                item["source_sheet"] = sheet_name
                item["source_row"] = int(idx) + 2
                item["source_material"] = f"{filename}::{sheet_name}"
                result.append(item)
    return result


def _normalize_columns(cols: List[str]) -> Dict[str, str]:
    mapping = {}
    key_aliases = {
        "题目": "title", "题干": "title", "问题": "title", "标题": "title",
        "question": "title", "title": "title",
        "题目编号": "question_no", "题号": "question_no", "编号": "question_no", "no": "question_no",
        "内容": "content", "详细内容": "content", "描述": "content", "description": "content",
        "答案": "answer", "参考答案": "answer", "标准答": "answer",
        "分类": "category", "类别": "category", "学科": "category", "类型": "category",
        "难度": "difficulty", "level": "difficulty",
        "标签": "tags", "关键字": "tags", "关键词": "tags",
        "期望模型": "expected_model", "推荐模型": "expected_model",
        "备注": "remark", "说明": "remark",
        "补录备注": "remark_append", "补充说明": "remark_append", "追加备注": "remark_append",
        "单位": "unit", "计量单位": "unit",
    }
    for c in cols:
        if c is None:
            continue
        key = str(c).strip().lower()
        matched = None
        for alias, target in key_aliases.items():
            if alias.lower() in key:
                matched = target
                break
        mapping[c] = matched or "extra"
    return mapping


def _row_to_import_item(row, col_map: Dict[str, str]) -> Dict[str, Any]:
    item: Dict[str, Any] = {}
    tags_buf = []
    extra = {}
    for col, field in col_map.items():
        try:
            val = row[col]
        except (KeyError, IndexError):
            continue
        if val is None:
            continue
        if isinstance(val, float) and pd.isna(val):
            continue
        if field == "tags":
            if isinstance(val, str):
                tags_buf.extend([t.strip() for t in re.split(r"[，,、;；]", val) if t.strip()])
            elif isinstance(val, (list, tuple)):
                tags_buf.extend([str(x).strip() for x in val if str(x).strip()])
        elif field == "extra":
            extra[col] = val
        else:
            item[field] = val
    if tags_buf:
        item["tags"] = tags_buf
    if extra:
        item["original_data_extra"] = extra
    return item


class ImportService:
    @staticmethod
    def import_batch(db: Session, batch_data: BatchCreate, items: List[QuestionImportItem],
                     materials: List[Dict[str, Any]] = None,
                     source_file: str = None, source_bytes: bytes = None) -> Tuple[Any, List[str]]:
        warnings: List[str] = []
        source_hash = _hash_file(source_bytes) if source_bytes else None
        batch = BatchCRUD.create(db, batch_data, source_file=source_file, source_hash=source_hash)

        material_map: Dict[str, Any] = {}
        if materials:
            for idx, m in enumerate(materials):
                mat = MaterialCRUD.create(
                    db, batch_id=batch.id,
                    material_name=m.get("material_name", f"材料{idx+1}"),
                    material_type=m.get("material_type"),
                    sheet_name=m.get("sheet_name"),
                    import_order=m.get("import_order", idx),
                    remark=m.get("remark"),
                )
                material_map[mat.material_name] = mat

        created_questions = []
        for idx, item in enumerate(items):
            mat_obj = None
            src_mat = item.source_material or f"默认材料"
            if src_mat not in material_map:
                sheet = item.source_sheet
                mat_obj = MaterialCRUD.create(
                    db, batch_id=batch.id,
                    material_name=src_mat,
                    sheet_name=sheet,
                    import_order=len(material_map),
                )
                material_map[src_mat] = mat_obj
            else:
                mat_obj = material_map[src_mat]

            if not item.title or not str(item.title).strip():
                warnings.append(f"第{idx+1}条题目标题为空，跳过")
                continue
            if len(str(item.title).strip()) < 2:
                warnings.append(f"第{idx+1}条题目标题过短，仍导入: {str(item.title)[:30]}")

            q = QuestionCRUD.create(
                db, batch_id=batch.id, item=item,
                material_id=mat_obj.id if mat_obj else None,
                status=QuestionStatus.PENDING,
                original_data=item.model_dump(exclude_unset=False),
            )
            created_questions.append(q)

        BatchCRUD.update_counts(db, batch.id)
        return batch, warnings


class DeduplicationService:
    @staticmethod
    def run_deduplication(db: Session, batch_id: int, operator: str = "system") -> DedupResult:
        batch = BatchCRUD.get(db, batch_id)
        if not batch:
            raise ValueError("批次不存在")
        rnd = batch.current_round
        dup_groups = QuestionCRUD.find_duplicates(db, batch_id)
        total_removed = 0
        affected_materials = set()

        for key, group in dup_groups.items():
            sorted_group = sorted(group, key=lambda q: (
                0 if q.status == QuestionStatus.VALID else 1,
                -len(q.title or ""),
                q.id,
            ))
            master = sorted_group[0]
            QuestionCRUD.mark_valid(db, master.id)
            for dup_q in sorted_group[1:]:
                QuestionCRUD.mark_duplicate(
                    db, dup_q.id, master.id,
                    dedup_round=rnd, operator=operator,
                )
                if dup_q.source_material:
                    affected_materials.add(dup_q.source_material)
                total_removed += 1

        pending_qs = QuestionCRUD.list_by_batch(db, batch_id, status=QuestionStatus.PENDING)
        for q in pending_qs:
            QuestionCRUD.mark_valid(db, q.id)

        BatchCRUD.update_counts(db, batch_id)
        BatchCRUD.update_status(db, batch_id, BatchStatus.DEDUPLICATED, operator=operator, operation="deduplicate")

        questions_all = QuestionCRUD.list_by_batch(db, batch_id, limit=10000)
        remaining = sum(1 for q in questions_all if q.status != QuestionStatus.DUPLICATE)
        return DedupResult(
            total=len(questions_all),
            duplicates_removed=total_removed,
            remaining=remaining,
            affected_materials=list(affected_materials),
        )


class RoutingService:
    @staticmethod
    def _match_rule(question) -> Optional[Dict[str, Any]]:
        text_parts = [question.title or "", question.content or "", question.answer or ""]
        if question.tags:
            text_parts.extend([str(t) for t in question.tags])
        text = " ".join(text_parts).lower()
        cat = (question.category or "").lower()
        best_rule = None
        best_score = -1

        for rule in ROUTING_RULES:
            if rule.get("fallback"):
                if best_score < 0:
                    best_rule = rule
                    best_score = 0
                continue
            kw_hits = sum(1 for kw in rule["keywords"] if kw.lower() in text)
            cat_hit = 1 if any(c.lower() in cat for c in rule["categories"]) else 0
            score = (kw_hits * 0.8 + cat_hit * 0.5) / max(1, len(rule["keywords"]) // 2 + 1)
            if score > best_score and score >= rule["min_confidence"] * 0.5:
                best_score = score
                best_rule = rule

        return best_rule

    @staticmethod
    def _compute_confidence(question, rule) -> float:
        text_parts = [question.title or "", question.content or "", question.answer or ""]
        if question.tags:
            text_parts.extend([str(t) for t in question.tags])
        text = " ".join(text_parts).lower()
        cat = (question.category or "").lower()
        kw_hits = sum(1 for kw in rule["keywords"] if kw.lower() in text)
        total_kw = max(1, len(rule["keywords"]))
        kw_ratio = kw_hits / total_kw
        cat_hit = 1 if any(c.lower() in cat for c in rule["categories"]) else 0
        score = kw_ratio * 0.7 + cat_hit * 0.3
        if question.expected_model and question.expected_model.lower() in rule["model_name"].lower():
            score = min(1.0, score + 0.2)
        return round(min(1.0, max(score, rule.get("min_confidence", 0))), 3)

    @staticmethod
    def run_routing(db: Session, batch_id: int, operator: str = "auto") -> Dict[str, Any]:
        batch = BatchCRUD.get(db, batch_id)
        if not batch:
            raise ValueError("批次不存在")
        rnd = batch.current_round
        valid_questions = QuestionCRUD.list_by_batch(db, batch_id, status=QuestionStatus.VALID, limit=10000)
        routed_count = 0
        need_review_count = 0
        routing_summary: Dict[str, int] = defaultdict(int)

        for q in valid_questions:
            rule = RoutingService._match_rule(q)
            if not rule:
                continue
            confidence = RoutingService._compute_confidence(q, rule)
            need_review = False
            review_reason = None

            if q.is_old_format:
                need_review = True
                review_reason = "旧表格式题目，需人工复核"
            elif q.has_missing_unit:
                need_review = True
                review_reason = "存在数值但未填单位，需确认"
            elif q.has_append_remark:
                need_review = True
                review_reason = "含补录备注内容，需人工确认影响"
            elif confidence < rule["min_confidence"] + 0.1:
                need_review = True
                review_reason = "命中置信度偏低"
            if q.expected_model and q.expected_model.lower() not in rule["model_name"].lower():
                need_review = True
                review_reason = (review_reason or "") + f" 期望模型{q.expected_model}与路由结果不一致"

            match_tags = [kw for kw in rule["keywords"] if kw.lower() in (q.title or "").lower()][:5]
            from app.schemas.schemas import RoutingResultBase
            rr_data = RoutingResultBase(
                model_name=rule["model_name"],
                confidence=confidence,
                match_reason=f"命中规则[{rule['name']}]，匹配特征：{','.join(match_tags) if match_tags else '通用'}",
                match_tags=match_tags or None,
                routing_rule=rule["name"],
                is_primary=True,
                need_review=need_review,
                review_reason=review_reason,
            )
            RoutingCRUD.create(db, q.id, rr_data, round_no=rnd, created_by=operator)
            target_status = QuestionStatus.NEED_REVIEW if need_review else QuestionStatus.ROUTED
            QuestionCRUD.update_status(db, q.id, target_status)
            routing_summary[rule["model_name"]] += 1
            routed_count += 1
            if need_review:
                need_review_count += 1

        BatchCRUD.update_counts(db, batch_id)
        BatchCRUD.update_status(db, batch_id, BatchStatus.ROUTED, operator=operator, operation="auto_routing")

        return {
            "routed_count": routed_count,
            "need_review_count": need_review_count,
            "routing_summary": dict(routing_summary),
        }
