from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
import uuid
import os
import shutil
import zipfile
import json
from pathlib import Path
from datetime import datetime

from app.core.config import settings
from app.core.constants import OperationType, RecordType
from app.models import Batch, Attachment
from app.services.audit_service import AuditService


class AttachmentService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
    
    def _get_attachment_dir(self, batch_id: str) -> Path:
        batch_dir = settings.UPLOAD_DIR / batch_id
        batch_dir.mkdir(parents=True, exist_ok=True)
        return batch_dir
    
    def _save_file(
        self,
        batch_id: str,
        original_name: str,
        file_content: bytes,
    ) -> Tuple[str, str, int]:
        batch_dir = self._get_attachment_dir(batch_id)
        file_extension = os.path.splitext(original_name)[1]
        saved_name = f"{uuid.uuid4().hex}{file_extension}"
        file_path = batch_dir / saved_name
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        file_size = len(file_content)
        
        return saved_name, str(file_path), file_size
    
    def upload_attachment(
        self,
        batch_id: str,
        original_name: str,
        file_content: bytes,
        attachment_type: str,
        operator: str,
        description: Optional[str] = None,
    ) -> Attachment:
        batch = self.db.query(Batch).filter(
            Batch.id == batch_id,
            Batch.is_deleted == False,
        ).first()
        if not batch:
            raise ValueError(f"批次不存在: {batch_id}")
        
        saved_name, file_path, file_size = self._save_file(
            batch_id=batch_id,
            original_name=original_name,
            file_content=file_content,
        )
        
        file_type = self._detect_file_type(original_name)
        
        attachment = Attachment(
            id=str(uuid.uuid4()),
            batch_id=batch_id,
            file_name=saved_name,
            original_name=original_name,
            file_path=file_path,
            file_size=str(file_size),
            file_type=file_type,
            attachment_type=attachment_type,
            description=description,
            upload_operator=operator,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        self.db.add(attachment)
        self.db.flush()
        
        self.audit_service.log_operation(
            batch_id=batch_id,
            operation_type=OperationType.ATTACHMENT_UPLOAD,
            record_type="attachment",
            record_id=attachment.id,
            operator=operator,
            before_data=None,
            after_data={
                "original_name": original_name,
                "attachment_type": attachment_type,
                "file_size": file_size,
                "file_type": file_type,
            },
            change_reason=f"上传附件: {original_name}",
        )
        
        self.db.commit()
        self.db.refresh(attachment)
        return attachment
    
    def _detect_file_type(self, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        type_map = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".zip": "application/zip",
            ".rar": "application/x-rar-compressed",
            ".json": "application/json",
            ".txt": "text/plain",
            ".csv": "text/csv",
        }
        return type_map.get(ext, "application/octet-stream")
    
    def get_attachments(
        self,
        batch_id: str,
        attachment_type: Optional[str] = None,
    ) -> List[Attachment]:
        query = self.db.query(Attachment).filter(
            Attachment.batch_id == batch_id,
            Attachment.is_deleted == False,
        )
        
        if attachment_type:
            query = query.filter(Attachment.attachment_type == attachment_type)
        
        return query.order_by(Attachment.created_at.desc()).all()
    
    def get_attachment(self, attachment_id: str) -> Optional[Attachment]:
        return self.db.query(Attachment).filter(
            Attachment.id == attachment_id,
            Attachment.is_deleted == False,
        ).first()
    
    def delete_attachment(self, attachment_id: str, operator: str) -> bool:
        attachment = self.get_attachment(attachment_id)
        if not attachment:
            return False
        
        before_data = {
            "original_name": attachment.original_name,
            "attachment_type": attachment.attachment_type,
        }
        
        attachment.is_deleted = True
        attachment.updated_at = datetime.now()
        
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)
        
        self.audit_service.log_operation(
            batch_id=attachment.batch_id,
            operation_type=OperationType.ATTACHMENT_UPLOAD,
            record_type="attachment",
            record_id=attachment.id,
            operator=operator,
            before_data=before_data,
            after_data={"is_deleted": True},
            change_reason=f"删除附件: {attachment.original_name}",
        )
        
        self.db.commit()
        return True
    
    def parse_zip_archive(
        self,
        batch_id: Optional[str],
        attachment_id: str,
        operator: str,
    ) -> Dict[str, Any]:
        attachment = self.get_attachment(attachment_id)
        if not attachment:
            raise ValueError(f"附件不存在: {attachment_id}")
        
        if not batch_id:
            batch_id = attachment.batch_id
        
        if not attachment.file_type == "application/zip" and not attachment.original_name.lower().endswith(".zip"):
            raise ValueError("仅支持ZIP格式的压缩包")
        
        extract_dir = self._get_attachment_dir(batch_id) / f"extracted_{attachment.id}"
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        parsed_data = {
            "inspection_records": [],
            "calibration_certificates": [],
            "repair_quotes": [],
            "price_adjustments": [],
            "extracted_files": [],
            "errors": [],
        }
        
        try:
            with zipfile.ZipFile(attachment.file_path, "r") as zip_ref:
                zip_ref.extractall(extract_dir)
                
                for file_info in zip_ref.infolist():
                    if file_info.is_dir():
                        continue
                    
                    parsed_data["extracted_files"].append({
                        "name": file_info.filename,
                        "size": file_info.file_size,
                    })
                    
                    file_path = extract_dir / file_info.filename
                    
                    if file_info.filename.lower().endswith(".json"):
                        try:
                            with open(file_path, "r", encoding="utf-8") as f:
                                json_data = json.load(f)
                            
                            if isinstance(json_data, list):
                                for item in json_data:
                                    self._classify_json_item(item, parsed_data)
                            elif isinstance(json_data, dict):
                                self._classify_json_item(json_data, parsed_data)
                        except Exception as e:
                            parsed_data["errors"].append(f"解析 {file_info.filename} 失败: {str(e)}")
        
        except zipfile.BadZipFile:
            raise ValueError("无效的ZIP压缩包文件")
        
        self.audit_service.log_operation(
            batch_id=batch_id,
            operation_type=OperationType.DATA_IMPORT,
            record_type="zip_archive",
            record_id=attachment.id,
            operator=operator,
            before_data={"attachment_id": attachment_id},
            after_data={
                "extracted_files": len(parsed_data["extracted_files"]),
                "inspection_records": len(parsed_data["inspection_records"]),
                "calibration_certificates": len(parsed_data["calibration_certificates"]),
                "repair_quotes": len(parsed_data["repair_quotes"]),
                "price_adjustments": len(parsed_data["price_adjustments"]),
            },
            change_reason=f"解析历史压缩包: {attachment.original_name}",
        )
        
        return parsed_data
    
    def _classify_json_item(self, item: Dict[str, Any], parsed_data: Dict[str, Any]) -> None:
        if "record_no" in item or "inspection_result" in item:
            parsed_data["inspection_records"].append(item)
        elif "certificate_no" in item or "expiry_date" in item:
            parsed_data["calibration_certificates"].append(item)
        elif "quote_no" in item or "quote_amount" in item:
            parsed_data["repair_quotes"].append(item)
        elif "adjustment_no" in item or "original_price" in item:
            parsed_data["price_adjustments"].append(item)
    
    def import_from_zip(
        self,
        batch_id: Optional[str],
        attachment_id: str,
        operator: str,
    ) -> Dict[str, Any]:
        from app.services.import_service import ImportService
        
        parsed_data = self.parse_zip_archive(batch_id, attachment_id, operator)
        
        if not batch_id:
            attachment = self.get_attachment(attachment_id)
            batch_id = attachment.batch_id
        
        import_service = ImportService(self.db)
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        
        results = import_service.import_batch_data(
            batch=batch,
            inspection_records=parsed_data["inspection_records"],
            calibration_certificates=parsed_data["calibration_certificates"],
            repair_quotes=parsed_data["repair_quotes"],
            price_adjustments=parsed_data["price_adjustments"],
            operator=operator,
        )
        
        from app.services.batch_service import BatchService
        batch_service = BatchService(self.db)
        batch_service.update_batch_stats(batch)
        
        return {
            "parsed_data": parsed_data,
            "import_results": results,
        }
