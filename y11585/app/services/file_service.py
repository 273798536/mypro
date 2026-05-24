import os
import zipfile
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import openpyxl
except ImportError:
    openpyxl = None

from app.config import settings
from app.models.base import Batch, Contract, Attachment, BatchStatus, DuplicateStrategy
from app.schemas.contract import ContractCreate, PaymentNodeCreate, AcceptanceEmailCreate
from app.services.state_machine import ContractStateMachine


class FileService:
    def __init__(self, db: Session):
        self.db = db
        self.state_machine = ContractStateMachine(db)

    def _save_uploaded_file(self, file_content: bytes, filename: str, batch_id: int, 
                           attachment_type: str, uploaded_by: str) -> Attachment:
        batch_dir = settings.UPLOAD_DIR / f"batch_{batch_id}"
        batch_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = batch_dir / filename
        file_path.write_bytes(file_content)
        
        attachment = Attachment(
            batch_id=batch_id,
            file_name=filename,
            file_path=str(file_path),
            file_type=filename.split('.')[-1].lower() if '.' in filename else 'unknown',
            file_size=len(file_content),
            uploaded_by=uploaded_by,
            attachment_type=attachment_type
        )
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def _parse_pdf_contract(self, file_path: Path) -> Dict[str, Any]:
        if PdfReader is None:
            return {}
        
        try:
            reader = PdfReader(str(file_path))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            
            result = {
                "total_pages": len(reader.pages),
                "raw_text": text[:2000]
            }
            
            keywords = ["合同编号", "合同号", "Contract No"]
            for keyword in keywords:
                if keyword in text:
                    idx = text.find(keyword)
                    line = text[idx:idx+100].split('\n')[0]
                    result["contract_no_hint"] = line
            
            return result
        except Exception as e:
            return {"error": str(e)}

    def _parse_excel_payment_nodes(self, file_path: Path) -> List[Dict[str, Any]]:
        if openpyxl is None:
            return []
        
        try:
            wb = openpyxl.load_workbook(str(file_path))
            ws = wb.active
            nodes = []
            
            headers = []
            for cell in ws[1]:
                headers.append(cell.value)
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                row_data = dict(zip(headers, row))
                if row_data.get('node_name') or row_data.get('节点名称'):
                    nodes.append({
                        "node_name": row_data.get('node_name') or row_data.get('节点名称', ''),
                        "node_type": row_data.get('node_type') or row_data.get('节点类型', 'milestone'),
                        "payment_ratio": float(row_data.get('payment_ratio') or row_data.get('付款比例', 0) or 0),
                        "payment_amount": float(row_data.get('payment_amount') or row_data.get('付款金额', 0) or 0),
                        "due_date": row_data.get('due_date') or row_data.get('到期日'),
                        "status": row_data.get('status') or row_data.get('状态', 'pending')
                    })
            
            return nodes
        except Exception as e:
            return []

    def _parse_eml_file(self, file_path: Path) -> Dict[str, Any]:
        try:
            import email
            from email import policy
            
            with open(file_path, 'rb') as f:
                msg = email.message_from_bytes(f.read(), policy=policy.default)
            
            subject = msg['subject'] or ''
            from_addr = msg['from'] or ''
            to_addr = msg['to'] or ''
            date_str = msg['date']
            
            content = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == 'text/plain':
                        content += part.get_payload(decode=True).decode('utf-8', errors='ignore')
            else:
                content = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            
            return {
                "subject": subject,
                "from": from_addr,
                "to": to_addr,
                "date": date_str,
                "content": content[:2000]
            }
        except Exception as e:
            return {"error": str(e)}

    def process_contract_pdf(self, batch_id: int, file_content: bytes, filename: str, 
                            uploaded_by: str) -> Dict[str, Any]:
        attachment = self._save_uploaded_file(file_content, filename, batch_id, "contract_pdf", uploaded_by)
        parsed = self._parse_pdf_contract(Path(attachment.file_path))
        
        contract_data = ContractCreate(
            contract_no=f"PDF_{batch_id}_{attachment.id}",
            contract_name=filename.replace('.pdf', ''),
            total_amount=0,
            metadata_={"parsed_pdf": parsed}
        )
        
        contract = self.state_machine.create_contract(batch_id, contract_data, uploaded_by)
        attachment.contract_id = contract.id
        self.db.commit()
        
        return {
            "contract_id": contract.id,
            "attachment_id": attachment.id,
            "parsed": parsed
        }

    def process_payment_excel(self, batch_id: int, contract_id: int, file_content: bytes, 
                             filename: str, uploaded_by: str) -> Dict[str, Any]:
        attachment = self._save_uploaded_file(file_content, filename, batch_id, "payment_excel", uploaded_by)
        attachment.contract_id = contract_id
        
        nodes = self._parse_excel_payment_nodes(Path(attachment.file_path))
        
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if contract:
            for node_data in nodes:
                from app.models.base import PaymentNode
                due_date = node_data.get('due_date')
                if isinstance(due_date, str):
                    try:
                        due_date = datetime.fromisoformat(due_date)
                    except:
                        due_date = None
                
                node = PaymentNode(
                    contract_id=contract_id,
                    node_name=node_data.get('node_name', ''),
                    node_type=node_data.get('node_type', 'milestone'),
                    payment_ratio=node_data.get('payment_ratio', 0),
                    payment_amount=node_data.get('payment_amount', 0),
                    due_date=due_date,
                    status=node_data.get('status', 'pending')
                )
                self.db.add(node)
        
        self.db.commit()
        return {"nodes_count": len(nodes), "attachment_id": attachment.id}

    def process_acceptance_email(self, batch_id: int, contract_id: int, file_content: bytes,
                                filename: str, uploaded_by: str) -> Dict[str, Any]:
        attachment = self._save_uploaded_file(file_content, filename, batch_id, "acceptance_email", uploaded_by)
        attachment.contract_id = contract_id
        
        parsed = self._parse_eml_file(Path(attachment.file_path))
        
        from app.models.base import AcceptanceEmail
        email = AcceptanceEmail(
            contract_id=contract_id,
            email_subject=parsed.get('subject', ''),
            email_from=parsed.get('from', ''),
            email_to=parsed.get('to', ''),
            email_date=datetime.utcnow(),
            acceptance_result="pending",
            acceptance_amount=0,
            content=parsed.get('content', '')
        )
        self.db.add(email)
        self.db.commit()
        
        return {"email_id": email.id, "attachment_id": attachment.id, "parsed": parsed}

    def process_price_change_excel(self, batch_id: int, contract_id: int, file_content: bytes,
                                  filename: str, uploaded_by: str) -> Dict[str, Any]:
        attachment = self._save_uploaded_file(file_content, filename, batch_id, "price_change", uploaded_by)
        attachment.contract_id = contract_id
        
        if openpyxl:
            wb = openpyxl.load_workbook(file_content, data_only=True)
            ws = wb.active
            
            from app.models.base import PriceChange
            count = 0
            
            headers = []
            for cell in ws[1]:
                headers.append(cell.value)
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                row_data = dict(zip(headers, row))
                if row_data.get('original_price') is not None:
                    pc = PriceChange(
                        contract_id=contract_id,
                        original_price=float(row_data.get('original_price', 0) or 0),
                        new_price=float(row_data.get('new_price', 0) or 0),
                        change_reason=str(row_data.get('change_reason') or row_data.get('变更原因', '')),
                        approved_by=str(row_data.get('approved_by') or row_data.get('审批人', uploaded_by)),
                        approved_date=datetime.utcnow(),
                        effective_date=datetime.utcnow(),
                        is_manual=True
                    )
                    self.db.add(pc)
                    count += 1
            
            self.db.commit()
            return {"price_changes_count": count, "attachment_id": attachment.id}
        
        return {"attachment_id": attachment.id}

    def process_zip_archive(self, batch_id: int, file_content: bytes, filename: str,
                           uploaded_by: str, duplicate_strategy: DuplicateStrategy) -> Dict[str, Any]:
        attachment = self._save_uploaded_file(file_content, filename, batch_id, "archive", uploaded_by)
        
        temp_dir = tempfile.mkdtemp()
        zip_path = Path(temp_dir) / filename
        
        with open(zip_path, 'wb') as f:
            f.write(file_content)
        
        results = {
            "pdfs": 0,
            "excels": 0,
            "emls": 0,
            "contracts_created": 0,
            "errors": []
        }
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                for file_info in zf.infolist():
                    if file_info.is_dir():
                        continue
                    
                    inner_filename = file_info.filename
                    inner_content = zf.read(file_info)
                    
                    try:
                        if inner_filename.lower().endswith('.pdf'):
                            r = self.process_contract_pdf(batch_id, inner_content, inner_filename, uploaded_by)
                            results["pdfs"] += 1
                            results["contracts_created"] += 1
                        elif inner_filename.lower().endswith(('.xlsx', '.xls')):
                            results["excels"] += 1
                        elif inner_filename.lower().endswith('.eml'):
                            results["emls"] += 1
                    except Exception as e:
                        results["errors"].append(f"{inner_filename}: {str(e)}")
        except Exception as e:
            results["errors"].append(str(e))
        
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return results

    def get_attachments(self, batch_id: int, contract_id: Optional[int] = None) -> List[Attachment]:
        query = self.db.query(Attachment).filter(Attachment.batch_id == batch_id)
        if contract_id:
            query = query.filter(Attachment.contract_id == contract_id)
        return query.all()
