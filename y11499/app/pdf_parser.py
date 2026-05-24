import hashlib
import io
from typing import Dict, Any, Optional, List
from datetime import datetime
import pdfplumber


def parse_invoice_pdf(pdf_content: bytes) -> Dict[str, Any]:
    result = {
        "invoice_number": None,
        "invoice_code": None,
        "invoice_date": None,
        "seller_name": None,
        "seller_tax_no": None,
        "buyer_name": None,
        "buyer_tax_no": None,
        "total_amount": 0,
        "tax_amount": 0,
        "amount_with_tax": 0,
        "category": None,
        "raw_text": "",
        "tables": []
    }
    
    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                
                tables = page.extract_tables()
                for table in tables:
                    result["tables"].append(table)
            
            result["raw_text"] = full_text
            
            lines = full_text.split("\n")
            
            for line in lines:
                line_lower = line.lower()
                
                if "发票号码" in line or "发票号" in line:
                    num = ''.join(filter(str.isdigit, line))
                    if num:
                        result["invoice_number"] = num[-8:]
                
                if "发票代码" in line:
                    code = ''.join(filter(str.isdigit, line))
                    if code:
                        result["invoice_code"] = code[-12:]
                
                if "开票日期" in line or "日期" in line:
                    import re
                    date_match = re.search(r'(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})', line)
                    if date_match:
                        year, month, day = date_match.groups()
                        try:
                            result["invoice_date"] = datetime(int(year), int(month), int(day)).isoformat()
                        except:
                            pass
                
                if "销售方" in line or "销货方" in line or "卖方" in line:
                    if "名称" in line or line_lower.find("name") > 0:
                        parts = line.split("：") if "：" in line else line.split(":")
                        if len(parts) > 1:
                            result["seller_name"] = parts[1].strip()
                
                if "购买方" in line or "购货方" in line or "买方" in line:
                    if "名称" in line:
                        parts = line.split("：") if "：" in line else line.split(":")
                        if len(parts) > 1:
                            result["buyer_name"] = parts[1].strip()
                
                if "纳税人识别号" in line:
                    import re
                    tax_match = re.search(r'[0-9A-Z]{15,20}', line)
                    if tax_match:
                        if result["seller_tax_no"] is None:
                            result["seller_tax_no"] = tax_match.group()
                        else:
                            result["buyer_tax_no"] = tax_match.group()
                
                if "合计" in line or "总计" in line or "total" in line_lower:
                    import re
                    amounts = re.findall(r'[￥¥]?\s*(\d+\.?\d*)', line)
                    if amounts and len(amounts) >= 1:
                        try:
                            result["amount_with_tax"] = float(amounts[-1])
                        except:
                            pass
                
                if "税额" in line and "tax" in line_lower:
                    import re
                    tax_matches = re.findall(r'[￥¥]?\s*(\d+\.?\d*)', line)
                    if tax_matches:
                        try:
                            result["tax_amount"] = float(tax_matches[-1])
                        except:
                            pass
            
            if result["amount_with_tax"] > 0 and result["tax_amount"] > 0:
                result["total_amount"] = result["amount_with_tax"] - result["tax_amount"]
            
            if "住宿" in full_text or "hotel" in full_text.lower():
                result["category"] = "住宿"
                result["expense_type"] = "hotel"
            elif "交通" in full_text or "transport" in full_text.lower() or "打车" in full_text:
                result["category"] = "交通"
                result["expense_type"] = "transport"
            elif "餐饮" in full_text or "餐" in full_text or "food" in full_text.lower():
                result["category"] = "餐饮"
                result["expense_type"] = "food"
            elif "办公" in full_text or "office" in full_text.lower():
                result["category"] = "办公"
                result["expense_type"] = "office"
    
    except Exception as e:
        result["parse_error"] = str(e)
    
    return result


def get_pdf_hash(pdf_content: bytes) -> str:
    return hashlib.sha256(pdf_content).hexdigest()


def extract_table_data(tables: List[List[List[str]]]) -> List[Dict[str, Any]]:
    items = []
    for table in tables:
        if len(table) > 1:
            headers = table[0]
            for row in table[1:]:
                if any(cell and str(cell).strip() for cell in row):
                    item = {}
                    for i, header in enumerate(headers):
                        if i < len(row):
                            item[str(header).strip() if header else f"col_{i}"] = row[i]
                    items.append(item)
    return items
