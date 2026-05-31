import csv
import re
import uuid
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from models import (
    StockLoanContract, CustomerAccount, FeeRate, FeeRateVersion,
    ImportResult, ContractStatus
)


class DataImporter:
    def __init__(self):
        self.contracts: Dict[str, StockLoanContract] = {}
        self.accounts: Dict[str, CustomerAccount] = {}
        self.rates: Dict[str, FeeRate] = {}
        self.account_name_mapping: Dict[str, str] = {}

    def _parse_date(self, date_str: str) -> Optional[date]:
        if not date_str or date_str.strip() == "":
            return None
        date_str = date_str.strip()
        formats = [
            "%Y-%m-%d", "%Y/%m/%d", "%Y%m%d",
            "%m-%d-%Y", "%m/%d/%Y",
            "%d-%m-%Y", "%d/%m/%Y"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None

    def _parse_int(self, value: str) -> int:
        if not value:
            return 0
        value = str(value).strip().replace(",", "")
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def _parse_float(self, value: str) -> float:
        if not value:
            return 0.0
        value = str(value).strip().replace(",", "").replace("%", "")
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def _parse_remarks(self, remarks: str) -> Dict[str, str]:
        result = {}
        if not remarks:
            return result
        
        patterns = [
            (r'展期|延期|extend', 'extension'),
            (r'归还|还券|return', 'return'),
            (r'改名|更名|rename', 'rename'),
            (r'调整|变更|change', 'adjustment')
        ]
        
        for pattern, key in patterns:
            if re.search(pattern, remarks, re.IGNORECASE):
                result[key] = remarks
        
        return result

    def _normalize_header(self, header: str) -> str:
        header = str(header).strip().lower()
        header = re.sub(r'[\s_\-]+', '_', header)
        return header

    def _get_column_mapping(self, headers: List[str]) -> Dict[str, str]:
        normalized = {h: self._normalize_header(h) for h in headers}
        
        mapping = {}
        rules = {
            'contract_id': ['合约编号', '合同编号', 'contract_id', 'contractno', 'contract_no'],
            'account_id': ['账户编号', '客户编号', 'account_id', 'accountno', 'account_no'],
            'account_name': ['账户名称', '客户名称', '客户姓名', 'account_name', 'accountname', 'customer'],
            'security_code': ['证券代码', '股票代码', '证券编码', 'security_code', 'stockcode', 'code'],
            'security_name': ['证券名称', '股票名称', 'security_name', 'stockname', 'name'],
            'quantity': ['数量', '股数', '借券数量', 'quantity', 'qty', 'amount'],
            'loan_date': ['出借日期', '借券日期', '开始日期', 'loan_date', 'startdate', 'start_date'],
            'due_date': ['到期日期', '应还日期', 'due_date', 'enddate', 'end_date', 'maturity'],
            'return_date': ['归还日期', '实际归还', 'return_date', 'returndate'],
            'remarks': ['备注', '说明', 'remarks', 'comment', 'note']
        }
        
        for target_key, keywords in rules.items():
            for original, norm in normalized.items():
                for kw in keywords:
                    kw_norm = self._normalize_header(kw)
                    if norm == kw_norm or kw_norm in norm:
                        mapping[target_key] = original
                        break
                if target_key in mapping:
                    break
        
        return mapping

    def import_contracts_from_csv(self, file_path: str) -> ImportResult:
        result = ImportResult(success=False)
        path = Path(file_path)
        
        if not path.exists():
            result.errors.append(f"文件不存在: {file_path}")
            return result
        
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                col_mapping = self._get_column_mapping(headers)
                
                required_fields = ['contract_id', 'account_id', 'security_code', 'quantity', 'loan_date', 'due_date']
                missing_fields = [f for f in required_fields if f not in col_mapping]
                if missing_fields:
                    result.errors.append(f"缺少必要字段: {', '.join(missing_fields)}")
                    return result
                
                for row_num, row in enumerate(reader, start=2):
                    result.total_records += 1
                    try:
                        contract = self._parse_contract_row(row, col_mapping, f"{path.name}:{row_num}")
                        if contract:
                            self.contracts[contract.contract_id] = contract
                            result.imported_records += 1
                            
                            if contract.account_id not in self.accounts:
                                self.accounts[contract.account_id] = CustomerAccount(
                                    account_id=contract.account_id,
                                    account_name=contract.account_name
                                )
                    except Exception as e:
                        result.failed_records += 1
                        result.errors.append(f"第{row_num}行解析失败: {str(e)}")
            
            result.success = True
            
        except Exception as e:
            result.errors.append(f"读取文件失败: {str(e)}")
        
        return result

    def _parse_contract_row(self, row: Dict, mapping: Dict, source: str) -> Optional[StockLoanContract]:
        contract_id = str(row.get(mapping.get('contract_id', ''), '')).strip()
        if not contract_id:
            return None
        
        account_id = str(row.get(mapping.get('account_id', ''), '')).strip()
        account_name = str(row.get(mapping.get('account_name', ''), '')).strip()
        security_code = str(row.get(mapping.get('security_code', ''), '')).strip()
        security_name = str(row.get(mapping.get('security_name', ''), '')).strip()
        quantity = self._parse_int(row.get(mapping.get('quantity', ''), ''))
        loan_date = self._parse_date(str(row.get(mapping.get('loan_date', ''), '')))
        due_date = self._parse_date(str(row.get(mapping.get('due_date', ''), '')))
        return_date = self._parse_date(str(row.get(mapping.get('return_date', ''), '')))
        remarks = str(row.get(mapping.get('remarks', ''), '')).strip()
        
        if not loan_date or not due_date:
            return None
        
        parsed_remarks = self._parse_remarks(remarks)
        is_extended = 'extension' in parsed_remarks
        
        status = ContractStatus.ACTIVE
        if return_date:
            status = ContractStatus.RETURNED
        elif is_extended:
            status = ContractStatus.EXTENDED
        
        return StockLoanContract(
            contract_id=contract_id,
            account_id=account_id,
            account_name=account_name,
            security_code=security_code,
            security_name=security_name,
            quantity=quantity,
            loan_date=loan_date,
            due_date=due_date,
            return_date=return_date,
            actual_return_date=return_date,
            is_extended=is_extended,
            extension_count=1 if is_extended else 0,
            remarks=remarks,
            status=status,
            imported_from=source,
            raw_data=row
        )

    def import_rates_from_csv(self, file_path: str) -> ImportResult:
        result = ImportResult(success=False)
        path = Path(file_path)
        
        if not path.exists():
            result.errors.append(f"文件不存在: {file_path}")
            return result
        
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                
                normalized = {h: self._normalize_header(h) for h in headers}
                mapping = {}
                
                rate_rules = {
                    'security_code': ['证券代码', '股票代码', 'security_code', 'stockcode'],
                    'security_name': ['证券名称', '股票名称', 'security_name', 'stockname'],
                    'rate': ['费率', '利率', 'rate', 'fee_rate'],
                    'effective_date': ['生效日期', '开始日期', 'effective_date', 'startdate'],
                    'expiry_date': ['失效日期', '结束日期', 'expiry_date', 'enddate']
                }
                
                for target_key, keywords in rate_rules.items():
                    for original, norm in normalized.items():
                        for kw in keywords:
                            kw_norm = self._normalize_header(kw)
                            if norm == kw_norm or kw_norm in norm:
                                mapping[target_key] = original
                                break
                        if target_key in mapping:
                            break
                
                required = ['security_code', 'rate', 'effective_date']
                missing = [f for f in required if f not in mapping]
                if missing:
                    result.errors.append(f"费率表缺少必要字段: {', '.join(missing)}")
                    return result
                
                for row_num, row in enumerate(reader, start=2):
                    result.total_records += 1
                    try:
                        security_code = str(row.get(mapping['security_code'], '')).strip()
                        if not security_code:
                            continue
                        
                        security_name = str(row.get(mapping.get('security_name', ''), '')).strip()
                        rate = self._parse_float(row.get(mapping['rate'], ''))
                        effective_date = self._parse_date(str(row.get(mapping['effective_date'], '')))
                        expiry_date = self._parse_date(str(row.get(mapping.get('expiry_date', ''), '')))
                        
                        if not effective_date:
                            result.warnings.append(f"第{row_num}行: 生效日期无效")
                            result.failed_records += 1
                            continue
                        
                        if security_code not in self.rates:
                            self.rates[security_code] = FeeRate(
                                security_code=security_code,
                                security_name=security_name
                            )
                        
                        version_id = f"RATE-{security_code}-{effective_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}"
                        version = FeeRateVersion(
                            version_id=version_id,
                            security_code=security_code,
                            rate=rate,
                            effective_date=effective_date,
                            expiry_date=expiry_date,
                            is_active=True
                        )
                        
                        self.rates[security_code].versions.append(version)
                        self.rates[security_code].versions.sort(key=lambda v: v.effective_date, reverse=True)
                        
                        result.imported_records += 1
                        
                    except Exception as e:
                        result.failed_records += 1
                        result.errors.append(f"第{row_num}行解析失败: {str(e)}")
            
            result.success = True
            
        except Exception as e:
            result.errors.append(f"读取费率文件失败: {str(e)}")
        
        return result

    def import_accounts_from_csv(self, file_path: str) -> ImportResult:
        result = ImportResult(success=False)
        path = Path(file_path)
        
        if not path.exists():
            result.errors.append(f"文件不存在: {file_path}")
            return result
        
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                
                normalized = {h: self._normalize_header(h) for h in headers}
                mapping = {}
                
                account_rules = {
                    'account_id': ['账户编号', '客户编号', 'account_id', 'accountno'],
                    'account_name': ['账户名称', '客户名称', 'account_name', 'accountname'],
                    'previous_names': ['曾用名', '历史名称', 'previous_names', 'old_names']
                }
                
                for target_key, keywords in account_rules.items():
                    for original, norm in normalized.items():
                        for kw in keywords:
                            kw_norm = self._normalize_header(kw)
                            if norm == kw_norm or kw_norm in norm:
                                mapping[target_key] = original
                                break
                        if target_key in mapping:
                            break
                
                if 'account_id' not in mapping:
                    result.errors.append("账户表缺少账户编号字段")
                    return result
                
                for row_num, row in enumerate(reader, start=2):
                    result.total_records += 1
                    try:
                        account_id = str(row.get(mapping['account_id'], '')).strip()
                        if not account_id:
                            continue
                        
                        account_name = str(row.get(mapping.get('account_name', ''), '')).strip()
                        previous_names_str = str(row.get(mapping.get('previous_names', ''), '')).strip()
                        previous_names = [n.strip() for n in previous_names_str.split(';') if n.strip()] if previous_names_str else []
                        
                        account = CustomerAccount(
                            account_id=account_id,
                            account_name=account_name,
                            previous_names=previous_names
                        )
                        
                        self.accounts[account_id] = account
                        self.account_name_mapping[account_name] = account_id
                        for old_name in previous_names:
                            self.account_name_mapping[old_name] = account_id
                        
                        result.imported_records += 1
                        
                    except Exception as e:
                        result.failed_records += 1
                        result.errors.append(f"第{row_num}行解析失败: {str(e)}")
            
            result.success = True
            
        except Exception as e:
            result.errors.append(f"读取账户文件失败: {str(e)}")
        
        return result

    def resolve_account_name(self, account_name: str) -> Optional[str]:
        return self.account_name_mapping.get(account_name)

    def get_contracts(self) -> List[StockLoanContract]:
        return list(self.contracts.values())

    def get_rates(self) -> List[FeeRate]:
        return list(self.rates.values())

    def get_accounts(self) -> List[CustomerAccount]:
        return list(self.accounts.values())
