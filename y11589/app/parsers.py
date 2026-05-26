import os
import re
import json
import zipfile
import tarfile
import tempfile
import traceback
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

try:
    import pdfplumber
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import email
    from email import policy
    from email.parser import BytesParser
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False


@dataclass
class ParseResult:
    success: bool
    data: Dict[str, Any]
    errors: List[str]
    raw_text: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseParser:
    def __init__(self):
        self.errors: List[str] = []

    def add_error(self, error: str):
        self.errors.append(error)

    def parse(self, file_path: str, file_name: str) -> ParseResult:
        raise NotImplementedError


class PDFParser(BaseParser):
    AMOUNT_PATTERNS = [
        r'(?:合同)?总金额[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d+)?)',
        r'(?:合同)?价款[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d+)?)',
        r'(?:人民币)?\s*([\d,]+(?:\.\d+)?)\s*元',
        r'¥\s*([\d,]+(?:\.\d+)?)',
        r'￥\s*([\d,]+(?:\.\d+)?)',
    ]

    DATE_PATTERNS = [
        r'签订日期[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)',
        r'签约日期[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)',
        r'生效日期[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)',
        r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日',
        r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})',
    ]

    CONTRACT_NO_PATTERNS = [
        r'合同编号[：:]\s*([A-Za-z0-9\-_]+)',
        r'合同号[：:]\s*([A-Za-z0-9\-_]+)',
        r'编号[：:]\s*([A-Za-z0-9\-_]+)',
    ]

    PARTY_PATTERNS = [
        r'甲方[：:]\s*([^，。；\n]+)',
        r'甲方（盖章）[：:]\s*([^，。；\n]+)',
        r'乙方[：:]\s*([^，。；\n]+)',
        r'乙方（盖章）[：:]\s*([^，。；\n]+)',
        r'发包方[：:]\s*([^，。；\n]+)',
        r'承包方[：:]\s*([^，。；\n]+)',
    ]

    PAYMENT_NODE_PATTERNS = [
        r'(第[一二三四五六七八九十\d]+[期次阶段笔])[，：:](.*?)([\d,]+(?:\.\d+)?)\s*元',
        r'(预付款|首付款|进度款|验收款|质保金|尾款)[，：:](.*?)([\d,]+(?:\.\d+)?)\s*元',
        r'([Pp]\d{1,3})\s*[,，:：](.*?)([\d,]+(?:\.\d+)?)\s*元',
    ]

    def parse(self, file_path: str, file_name: str) -> ParseResult:
        if not PDF_AVAILABLE:
            return ParseResult(
                success=False,
                data={},
                errors=["PDF解析库未安装，请安装pdfplumber和pypdf"],
                raw_text=None,
                metadata={"file_name": file_name, "parser": "PDFParser", "available": False}
            )

        self.errors = []
        full_text = ""
        metadata = {"file_name": file_name, "parser": "PDFParser", "pages": 0}

        try:
            with pdfplumber.open(file_path) as pdf:
                metadata["pages"] = len(pdf.pages)
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    full_text += text + "\n"

            try:
                with open(file_path, 'rb') as f:
                    reader = PdfReader(f)
                    if reader.metadata:
                        metadata["pdf_metadata"] = {
                            "title": reader.metadata.title,
                            "author": reader.metadata.author,
                            "subject": reader.metadata.subject,
                            "creator": reader.metadata.creator,
                            "pages": len(reader.pages)
                        }
            except Exception as e:
                self.add_error(f"读取PDF元数据失败: {str(e)}")

        except Exception as e:
            self.add_error(f"解析PDF失败: {str(e)}")
            return ParseResult(
                success=False,
                data={},
                errors=self.errors,
                raw_text=None,
                metadata=metadata
            )

        if not full_text.strip():
            self.add_error("PDF内容为空，无法提取文本")
            return ParseResult(
                success=False,
                data={},
                errors=self.errors,
                raw_text=None,
                metadata=metadata
            )

        result_data = self._extract_contract_info(full_text)
        result_data["payment_nodes"] = self._extract_payment_nodes(full_text)
        result_data["file_name"] = file_name
        result_data["parse_method"] = "pdf_text_extraction"

        return ParseResult(
            success=len(self.errors) == 0,
            data=result_data,
            errors=self.errors,
            raw_text=full_text[:5000],
            metadata=metadata
        )

    def _extract_contract_info(self, text: str) -> Dict[str, Any]:
        info = {
            "contract_name": self._extract_contract_name(text),
            "contract_no": self._extract_by_patterns(text, self.CONTRACT_NO_PATTERNS),
            "party_a": self._extract_party(text, "甲方"),
            "party_b": self._extract_party(text, "乙方"),
            "total_amount": self._extract_amount(text),
            "sign_date": self._extract_date(text, ["签订", "签约"]),
            "effective_date": self._extract_date(text, ["生效"]),
            "expiry_date": self._extract_date(text, ["到期", "截止", "结束"]),
        }
        return info

    def _extract_contract_name(self, text: str) -> str:
        lines = text.split('\n')
        for line in lines[:10]:
            line = line.strip()
            if line and ('合同' in line or '协议' in line) and len(line) > 5:
                return line
        return "未命名合同"

    def _extract_by_patterns(self, text: str, patterns: List[str]) -> Optional[str]:
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        return None

    def _extract_party(self, text: str, party_type: str) -> Optional[str]:
        patterns = [
            rf'{party_type}[（(]盖章[)）]?[：:]\s*([^，。；\n\r]+)',
            rf'{party_type}[：:]\s*([^，。；\n\r]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                party = match.group(1).strip()
                party = re.sub(r'\s+', ' ', party)
                if len(party) > 2 and len(party) < 100:
                    return party
        return None

    def _extract_amount(self, text: str) -> Optional[float]:
        for pattern in self.AMOUNT_PATTERNS:
            match = re.search(pattern, text)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '')
                    return float(amount_str)
                except (ValueError, IndexError):
                    continue
        return None

    def _extract_date(self, text: str, keywords: List[str]) -> Optional[str]:
        for keyword in keywords:
            pattern = rf'{keyword}日期[：:]\s*(\d{{4}}[-/年]\d{{1,2}}[-/月]\d{{1,2}}日?)'
            match = re.search(pattern, text)
            if match:
                date_str = match.group(1)
                return self._normalize_date(date_str)

        date_pattern = r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日'
        matches = list(re.finditer(date_pattern, text))
        if matches and keywords:
            for match in matches:
                context = text[max(0, match.start() - 20):match.end() + 5]
                if any(kw in context for kw in keywords):
                    return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"
        return None

    def _normalize_date(self, date_str: str) -> Optional[str]:
        date_str = date_str.replace('年', '-').replace('月', '-').replace('日', '')
        date_str = date_str.replace('/', '-')
        try:
            parts = date_str.split('-')
            if len(parts) == 3:
                year, month, day = parts
                return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
        except ValueError:
            pass
        return None

    def _extract_payment_nodes(self, text: str) -> List[Dict[str, Any]]:
        nodes = []
        lines = text.split('\n')

        current_node = None
        for line_no, line in enumerate(lines, 1):
            line = line.strip()
            if not line or len(line) < 5:
                continue

            amount_match = re.search(r'([¥￥]?\s*[\d,]+(?:\.\d+)?)\s*元', line)
            node_keywords = ['预付款', '首付款', '进度款', '验收款', '质保金', '尾款',
                            '第一期', '第二期', '第三期', '第四期', '第五期',
                            '第1期', '第2期', '第3期', '第4期', '第5期',
                            'P1', 'P2', 'P3', 'P4', 'P01', 'P02', 'P03', 'P04']

            if any(kw in line for kw in node_keywords) and amount_match:
                try:
                    amount_str = amount_match.group(1).replace('¥', '').replace('￥', '').replace(',', '').strip()
                    amount = float(amount_str) if amount_str else None

                    colon_match = re.match(r'^[\d\.、\s]*([^：:：]+)[：:]', line)
                    if colon_match:
                        node_name = colon_match.group(1).strip()
                        if len(node_name) > 50:
                            node_name = node_name[:50]
                    else:
                        node_name = line.split('：')[0].split(':')[0].strip()
                        for kw in node_keywords:
                            if kw in line:
                                node_name = kw
                                break

                    milestone_match = re.search(r'(?:完成|通过|交付|验收|签订)[^，。；]*', line)
                    milestone = milestone_match.group(0) if milestone_match else None

                    date_match = re.search(r'(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})', line)
                    planned_date = self._normalize_date(date_match.group(1)) if date_match else None

                    node_no = f"P{len(nodes) + 1:03d}"
                    no_match = re.search(r'[Pp](\d{1,3})', line)
                    if no_match:
                        node_no = f"P{int(no_match.group(1)):03d}"

                    node = {
                        "node_name": node_name,
                        "node_no": node_no,
                        "planned_amount": amount,
                        "planned_date": planned_date,
                        "milestone": milestone or f"付款节点{len(nodes) + 1}",
                        "original_line_no": line_no,
                        "original_line_text": line,
                        "extracted_from": "pdf_text"
                    }
                    nodes.append(node)
                except Exception as e:
                    self.add_error(f"解析付款节点第{line_no}行失败: {str(e)}")
                    continue

        if len(nodes) == 0:
            self.add_error("未能从PDF中提取到任何付款节点，请检查合同格式")

        return nodes


class EmailParser(BaseParser):
    def parse(self, file_path: str, file_name: str) -> ParseResult:
        if not EMAIL_AVAILABLE:
            return ParseResult(
                success=False,
                data={},
                errors=["邮件解析库不可用"],
                metadata={"file_name": file_name, "parser": "EmailParser", "available": False}
            )

        self.errors = []
        metadata = {"file_name": file_name, "parser": "EmailParser"}

        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read()

            msg = BytesParser(policy=policy.default).parsebytes(raw_data)

            subject = msg.get('Subject', '')
            sender = msg.get('From', '')
            receiver = msg.get('To', '')
            date_str = msg.get('Date', '')

            send_date = None
            if date_str:
                try:
                    from email.utils import parsedate_to_datetime
                    dt = parsedate_to_datetime(date_str)
                    send_date = dt.isoformat()
                except:
                    pass

            body = self._get_email_body(msg)

            attachments = []
            for part in msg.iter_attachments():
                if part.get_filename():
                    attachments.append({
                        "filename": part.get_filename(),
                        "content_type": part.get_content_type(),
                        "size": len(part.get_payload(decode=True) or b'')
                    })

            acceptance_result, acceptance_date = self._extract_acceptance_info(body, subject)

            result_data = {
                "email_subject": subject,
                "sender": sender,
                "receiver": receiver,
                "send_date": send_date,
                "email_content": body[:5000],
                "acceptance_result": acceptance_result,
                "acceptance_date": acceptance_date,
                "attachments": attachments,
                "file_name": file_name,
                "parse_method": "eml_parsing"
            }

            metadata["has_attachments"] = len(attachments) > 0
            metadata["attachment_count"] = len(attachments)

            return ParseResult(
                success=True,
                data={"acceptance_emails": [result_data]},
                errors=self.errors,
                raw_text=body[:2000],
                metadata=metadata
            )

        except Exception as e:
            self.add_error(f"解析邮件失败: {str(e)}")
            self.add_error(traceback.format_exc())
            return ParseResult(
                success=False,
                data={},
                errors=self.errors,
                metadata=metadata
            )

    def _get_email_body(self, msg) -> str:
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        return part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    except:
                        pass
                elif content_type == "text/html" and "attachment" not in content_disposition:
                    try:
                        html = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        return re.sub(r'<[^>]+>', '', html)
                    except:
                        pass
        else:
            try:
                return msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            except:
                return msg.get_payload() or ''
        return ''

    def _extract_acceptance_info(self, body: str, subject: str) -> Tuple[Optional[str], Optional[str]]:
        combined_text = subject + '\n' + body

        result_keywords = {
            "通过": ["通过", "同意", "验收合格", "确认", "没问题", "OK", "符合要求"],
            "驳回": ["驳回", "不同意", "不通过", "不合格", "不符合", "拒绝"],
            "待确认": ["待确认", "待审核", "请审阅", "请确认"]
        }

        acceptance_result = None
        for result, keywords in result_keywords.items():
            if any(kw in combined_text for kw in keywords):
                acceptance_result = result
                break

        acceptance_date = None
        date_patterns = [
            r'验收日期[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)',
            r'于\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)\s*验收',
            r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日.*?验收',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, combined_text)
            if match:
                if len(match.groups()) == 3:
                    acceptance_date = f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"
                else:
                    date_str = match.group(1)
                    date_str = date_str.replace('年', '-').replace('月', '-').replace('日', '').replace('/', '-')
                    try:
                        parts = date_str.split('-')
                        acceptance_date = f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
                    except:
                        pass
                break

        return acceptance_result, acceptance_date


class ZipParser(BaseParser):
    SUPPORTED_EXTENSIONS = {
        '.pdf': 'PDF_CONTRACT',
        '.eml': 'ACCEPTANCE_EMAIL',
        '.mbox': 'ACCEPTANCE_EMAIL',
        '.txt': 'PAYMENT_RECORD',
        '.csv': 'PAYMENT_RECORD',
        '.xls': 'PAYMENT_RECORD',
        '.xlsx': 'PAYMENT_RECORD',
        '.json': 'PAYMENT_RECORD',
        '.zip': 'ZIP_ARCHIVE',
        '.tar': 'ZIP_ARCHIVE',
        '.tar.gz': 'ZIP_ARCHIVE',
        '.tgz': 'ZIP_ARCHIVE',
    }

    def parse(self, file_path: str, file_name: str) -> ParseResult:
        self.errors = []
        metadata = {
            "file_name": file_name,
            "parser": "ZipParser",
            "extracted_files": [],
            "nested_archives": []
        }

        all_data = {
            "payment_nodes": [],
            "acceptance_emails": [],
            "supplemental_agreements": [],
            "contract_info": {}
        }

        temp_dir = tempfile.mkdtemp(prefix="zip_extract_")

        try:
            if zipfile.is_zipfile(file_path):
                with zipfile.ZipFile(file_path, 'r') as zf:
                    metadata["total_files"] = len(zf.namelist())
                    for item in zf.namelist():
                        if item.endswith('/'):
                            continue
                        try:
                            zf.extract(item, temp_dir)
                            extracted_path = os.path.join(temp_dir, item)
                            result = self._process_extracted_file(extracted_path, item, metadata)
                            if result:
                                self._merge_data(all_data, result)
                        except Exception as e:
                            self.add_error(f"解压文件 {item} 失败: {str(e)}")

            elif tarfile.is_tarfile(file_path):
                with tarfile.open(file_path, 'r:*') as tf:
                    members = [m for m in tf.getmembers() if m.isfile()]
                    metadata["total_files"] = len(members)
                    for member in members:
                        try:
                            tf.extract(member, temp_dir)
                            extracted_path = os.path.join(temp_dir, member.name)
                            result = self._process_extracted_file(extracted_path, member.name, metadata)
                            if result:
                                self._merge_data(all_data, result)
                        except Exception as e:
                            self.add_error(f"解压文件 {member.name} 失败: {str(e)}")

            else:
                self.add_error("不支持的压缩包格式，仅支持zip和tar格式")
                return ParseResult(
                    success=False,
                    data={},
                    errors=self.errors,
                    metadata=metadata
                )

        except Exception as e:
            self.add_error(f"解析压缩包失败: {str(e)}")
            self.add_error(traceback.format_exc())
            return ParseResult(
                success=False,
                data={},
                errors=self.errors,
                metadata=metadata
            )
        finally:
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass

        all_data["file_name"] = file_name
        all_data["parse_method"] = "archive_extraction"
        all_data["extracted_count"] = len(metadata["extracted_files"])

        return ParseResult(
            success=len(self.errors) == 0,
            data=all_data,
            errors=self.errors,
            metadata=metadata
        )

    def _process_extracted_file(self, file_path: str, rel_path: str, metadata: Dict) -> Optional[Dict]:
        ext = os.path.splitext(rel_path)[1].lower()

        if ext in ['.zip', '.tar', '.gz', '.tgz']:
            metadata["nested_archives"].append(rel_path)
            self.add_error(f"嵌套压缩包 {rel_path} 将单独处理")
            return None

        if ext not in self.SUPPORTED_EXTENSIONS:
            self.add_error(f"不支持的文件类型: {rel_path}")
            return None

        file_type = self.SUPPORTED_EXTENSIONS[ext]
        metadata["extracted_files"].append({
            "path": rel_path,
            "type": file_type,
            "size": os.path.getsize(file_path)
        })

        try:
            if ext == '.pdf':
                parser = PDFParser()
                result = parser.parse(file_path, rel_path)
                if result.success:
                    return result.data
                else:
                    self.errors.extend([f"{rel_path}: {e}" for e in result.errors])
            elif ext in ['.eml', '.mbox']:
                parser = EmailParser()
                result = parser.parse(file_path, rel_path)
                if result.success:
                    return result.data
                else:
                    self.errors.extend([f"{rel_path}: {e}" for e in result.errors])
            elif ext in ['.txt', '.json', '.csv']:
                return self._parse_text_file(file_path, rel_path, ext)

        except Exception as e:
            self.add_error(f"处理文件 {rel_path} 失败: {str(e)}")

        return None

    def _parse_text_file(self, file_path: str, rel_path: str, ext: str) -> Optional[Dict]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if ext == '.json':
                data = json.loads(content)
                if isinstance(data, dict):
                    return data
                elif isinstance(data, list):
                    return {"payment_nodes": data}
            else:
                lines = content.split('\n')
                nodes = []
                for line_no, line in enumerate(lines, 1):
                    line = line.strip()
                    if not line:
                        continue
                    amount_match = re.search(r'([\d,]+(?:\.\d+)?)', line)
                    if amount_match and ('款' in line or '节点' in line or 'P' in line):
                        try:
                            amount = float(amount_match.group(1).replace(',', ''))
                            nodes.append({
                                "node_name": line.split('：')[0].split(':')[0].strip()[:50],
                                "node_no": f"P{len(nodes) + 1:03d}",
                                "planned_amount": amount,
                                "original_line_no": line_no,
                                "extracted_from": rel_path
                            })
                        except:
                            pass
                if nodes:
                    return {"payment_nodes": nodes}

        except Exception as e:
            self.add_error(f"解析文本文件 {rel_path} 失败: {str(e)}")

        return None

    def _merge_data(self, target: Dict, source: Dict):
        for key in ['payment_nodes', 'acceptance_emails', 'supplemental_agreements']:
            if key in source and isinstance(source[key], list):
                target[key].extend(source[key])

        if 'contract_info' in source and isinstance(source['contract_info'], dict):
            for k, v in source['contract_info'].items():
                if v and k not in target['contract_info']:
                    target['contract_info'][k] = v


class TextParser(BaseParser):
    def parse(self, file_path: str, file_name: str) -> ParseResult:
        self.errors = []
        metadata = {"file_name": file_name, "parser": "TextParser"}

        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read()

            import chardet
            detected = chardet.detect(raw_data)
            encoding = detected.get('encoding', 'utf-8')
            content = raw_data.decode(encoding, errors='ignore')

        except Exception as e:
            self.add_error(f"读取文件失败: {str(e)}")
            return ParseResult(
                success=False,
                data={},
                errors=self.errors,
                metadata=metadata
            )

        ext = os.path.splitext(file_name)[1].lower()

        if ext == '.json':
            try:
                data = json.loads(content)
                metadata["format"] = "json"
                return ParseResult(
                    success=True,
                    data=data if isinstance(data, dict) else {"payment_nodes": data},
                    errors=self.errors,
                    raw_text=content[:2000],
                    metadata=metadata
                )
            except json.JSONDecodeError as e:
                self.add_error(f"JSON解析失败: {str(e)}")

        pdf_parser = PDFParser()
        contract_info = pdf_parser._extract_contract_info(content)
        payment_nodes = pdf_parser._extract_payment_nodes(content)
        pdf_parser.errors = []

        result_data = contract_info
        result_data["payment_nodes"] = payment_nodes
        result_data["file_name"] = file_name
        result_data["parse_method"] = "text_regex_extraction"

        metadata["encoding"] = encoding
        metadata["content_length"] = len(content)

        return ParseResult(
            success=len(self.errors) == 0,
            data=result_data,
            errors=self.errors,
            raw_text=content[:2000],
            metadata=metadata
        )


class ParserFactory:
    @staticmethod
    def get_parser(file_type: str, file_name: str) -> Optional[BaseParser]:
        ext = os.path.splitext(file_name)[1].lower()

        if ext in ['.zip', '.tar', '.tar.gz', '.tgz']:
            return ZipParser()
        elif ext in ['.eml', '.mbox']:
            return EmailParser()
        elif ext == '.pdf':
            return PDFParser()
        elif ext in ['.json', '.txt', '.csv']:
            return TextParser()
        elif file_type == "合同PDF":
            return PDFParser()
        elif file_type == "验收邮件":
            return EmailParser()
        elif file_type == "历史压缩包":
            return ZipParser()
        elif file_type in ["付款记录", "人工补录"]:
            return TextParser()
        else:
            return TextParser()

    @staticmethod
    def parse_file(file_path: str, file_name: str, file_type: str) -> ParseResult:
        parser = ParserFactory.get_parser(file_type, file_name)
        if not parser:
            return ParseResult(
                success=False,
                data={},
                errors=[f"无法找到适合 {file_type}/{file_name} 的解析器"],
                metadata={"file_name": file_name, "file_type": file_type}
            )
        return parser.parse(file_path, file_name)
