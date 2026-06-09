import os
import json
import pandas as pd
from sqlalchemy.orm import Session
from app.models import QuestionItem, ParamRecord, BatchStatus
from app.services.batch_service import update_batch_status
from app.config import settings
from datetime import datetime
from typing import Tuple, List


def _save_uploaded_file(file_bytes: bytes, filename: str) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    return file_path


def _read_excel_to_df(file_path: str) -> pd.DataFrame:
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path, dtype=str)
    return pd.read_excel(file_path, dtype=str)


def import_questions(db: Session, batch_id: int, file_bytes: bytes, filename: str,
                     source_remark_prefix: str = "") -> Tuple[int, List[str]]:
    file_path = _save_uploaded_file(file_bytes, filename)
    df = _read_excel_to_df(file_path)
    df = df.where(pd.notnull(df), None)

    cols_lower = {c.lower().strip(): c for c in df.columns}

    def col(name: str):
        return cols_lower.get(name.lower())

    imported = 0
    warnings = []

    for idx, row in df.iterrows():
        original_row_no = idx + 2
        q_code = None
        if col("题目编号"):
            q_code = str(row[col("题目编号")]).strip() if row[col("题目编号")] else None
        elif col("question_code"):
            q_code = str(row[col("question_code")]).strip() if row[col("question_code")] else None
        elif col("编号"):
            q_code = str(row[col("编号")]).strip() if row[col("编号")] else None

        if not q_code or q_code.lower() == "nan":
            warnings.append(f"第{original_row_no}行缺少题目编号，已跳过")
            continue

        q_title = None
        if col("题目"):
            q_title = str(row[col("题目")]).strip() if row[col("题目")] else None
        elif col("题目名称"):
            q_title = str(row[col("题目名称")]).strip() if row[col("题目名称")] else None
        elif col("title"):
            q_title = str(row[col("title")]).strip() if row[col("title")] else None

        image_name = None
        if col("图片"):
            image_name = str(row[col("图片")]).strip() if row[col("图片")] else None
        elif col("图片名"):
            image_name = str(row[col("图片名")]).strip() if row[col("图片名")] else None
        elif col("image"):
            image_name = str(row[col("image")]).strip() if row[col("image")] else None

        remark_parts = [f"来源文件:{filename}"]
        if source_remark_prefix:
            remark_parts.insert(0, source_remark_prefix)
        if col("备注") and row[col("备注")]:
            remark_parts.append(str(row[col("备注")]).strip())
        if col("来源") and row[col("来源")]:
            remark_parts.append(f"原始来源:{str(row[col('来源')]).strip()}")

        kkt_params = None
        kkt_cols = [c for c in df.columns if "kkt" in c.lower() or "参数" in c.lower()]
        if kkt_cols:
            kkt_dict = {}
            for kc in kkt_cols:
                if row[kc] and str(row[kc]).strip().lower() != "nan":
                    kkt_dict[kc] = str(row[kc]).strip()
            if kkt_dict:
                kkt_params = json.dumps(kkt_dict, ensure_ascii=False)

        difficulty = None
        if col("难度"):
            difficulty = str(row[col("难度")]).strip() if row[col("难度")] else None
        elif col("difficulty"):
            difficulty = str(row[col("difficulty")]).strip() if row[col("difficulty")] else None

        kp = None
        if col("知识点"):
            kp = str(row[col("知识点")]).strip() if row[col("知识点")] else None
        elif col("knowledge_point"):
            kp = str(row[col("knowledge_point")]).strip() if row[col("knowledge_point")] else None

        q = QuestionItem(
            batch_id=batch_id,
            original_row_no=original_row_no,
            question_code=q_code,
            question_title=q_title,
            image_name=image_name,
            source_remark="; ".join(remark_parts) if remark_parts else f"来源文件:{filename}",
            kkt_params_json=kkt_params,
            difficulty=difficulty,
            knowledge_point=kp
        )
        db.add(q)
        imported += 1

    db.commit()
    if imported > 0:
        update_batch_status(db, batch_id, BatchStatus.IMPORTED)
    return imported, warnings


def import_params(db: Session, batch_id: int, file_bytes: bytes, filename: str) -> Tuple[int, List[str]]:
    file_path = _save_uploaded_file(file_bytes, filename)
    df = _read_excel_to_df(file_path)
    df = df.where(pd.notnull(df), None)

    cols_lower = {c.lower().strip(): c for c in df.columns}

    def col(name: str):
        return cols_lower.get(name.lower())

    imported = 0
    warnings = []

    for idx, row in df.iterrows():
        original_row_no = idx + 2
        q_code = None
        if col("题目编号"):
            q_code = str(row[col("题目编号")]).strip() if row[col("题目编号")] else None
        elif col("question_code"):
            q_code = str(row[col("question_code")]).strip() if row[col("question_code")] else None
        elif col("编号"):
            q_code = str(row[col("编号")]).strip() if row[col("编号")] else None

        if not q_code or q_code.lower() == "nan":
            warnings.append(f"第{original_row_no}行缺少题目编号，已跳过")
            continue

        source_sheet = None
        if col("sheet"):
            source_sheet = str(row[col("sheet")]).strip() if row[col("sheet")] else None
        elif col("工作表"):
            source_sheet = str(row[col("工作表")]).strip() if row[col("工作表")] else None

        remark_parts = [f"来源文件:{filename}"]
        if col("备注") and row[col("备注")]:
            remark_parts.append(str(row[col("备注")]).strip())

        param_cols = [c for c in df.columns if c.lower() not in {"题目编号", "question_code", "编号", "备注", "sheet", "工作表"}]
        for pc in param_cols:
            val = row[pc]
            if val is not None and str(val).strip().lower() != "nan" and str(val).strip() != "":
                p = ParamRecord(
                    batch_id=batch_id,
                    original_row_no=original_row_no,
                    question_code=q_code,
                    param_key=str(pc).strip(),
                    param_value=str(val).strip(),
                    source_sheet=source_sheet,
                    source_remark="; ".join(remark_parts) if remark_parts else f"来源文件:{filename}"
                )
                db.add(p)
                imported += 1

    db.commit()
    return imported, warnings


def list_questions(db: Session, batch_id: int, skip: int = 0, limit: int = 100,
                   keyword: str = "") -> List[QuestionItem]:
    from sqlalchemy import or_
    query = db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(or_(
            QuestionItem.question_code.like(like),
            QuestionItem.question_title.like(like)
        ))
    return query.order_by(QuestionItem.original_row_no).offset(skip).limit(limit).all()


def list_params(db: Session, batch_id: int, question_code: str = "", skip: int = 0, limit: int = 200) -> List[ParamRecord]:
    query = db.query(ParamRecord).filter(ParamRecord.batch_id == batch_id)
    if question_code:
        query = query.filter(ParamRecord.question_code == question_code)
    return query.order_by(ParamRecord.question_code, ParamRecord.original_row_no).offset(skip).limit(limit).all()


def get_question(db: Session, question_id: int) -> QuestionItem:
    return db.query(QuestionItem).filter(QuestionItem.id == question_id).first()
