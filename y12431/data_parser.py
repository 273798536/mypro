import pandas as pd
import os
import re
from datetime import datetime
from typing import List, Tuple, Dict, Any
from models import (
    AuthorizationContract, DepositRecord, PaymentReport,
    SourceReference, MaterialType
)
from config import UPLOAD_DIR


def parse_date(date_str: Any) -> datetime.date:
    if pd.isna(date_str):
        return None
    if isinstance(date_str, datetime):
        return date_str.date()
    if isinstance(date_str, str):
        for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y年%m月%d日', '%m/%d/%Y']:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
    return None


def parse_float(value: Any) -> float:
    if pd.isna(value):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r'[^\d.-]', '', value)
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def detect_sheet_type(df: pd.DataFrame, file_name: str) -> MaterialType:
    columns = [str(col).lower() for col in df.columns]
    
    contract_keywords = ['保底', '分成比例', '授权期限', '合同编号', '品牌名称', '合作方']
    deposit_keywords = ['保证金', '到账日期', '核销', '押金']
    payment_keywords = ['回款', '销售额', '退货额', '渠道', '周期', '授权费']
    
    contract_score = sum(1 for kw in contract_keywords if any(kw in col for col in columns))
    deposit_score = sum(1 for kw in deposit_keywords if any(kw in col for col in columns))
    payment_score = sum(1 for kw in payment_keywords if any(kw in col for col in columns))
    
    if contract_score >= deposit_score and contract_score >= payment_score:
        return MaterialType.CONTRACT
    elif deposit_score >= payment_score:
        return MaterialType.DEPOSIT
    else:
        return MaterialType.PAYMENT


def find_column(df: pd.DataFrame, keywords: List[str]) -> str:
    columns = [str(col) for col in df.columns]
    for kw in keywords:
        for col in columns:
            if kw.lower() in col.lower():
                return col
    return None


def parse_contract_sheet(df: pd.DataFrame, file_name: str, sheet_name: str) -> List[AuthorizationContract]:
    contracts = []
    
    col_brand = find_column(df, ['品牌名称', '品牌', '品牌方'])
    col_partner = find_column(df, ['合作方', '合作方名称', '被授权方', '客户'])
    col_contract = find_column(df, ['合同编号', '合同号', '合同编码'])
    col_start = find_column(df, ['开始日期', '授权开始', '起始日期'])
    col_end = find_column(df, ['结束日期', '授权结束', '到期日期'])
    col_guarantee = find_column(df, ['保底金额', '保底', '年度保底', '保底销售'])
    col_rate = find_column(df, ['分成比例', '费率', '授权费率', '提点'])
    col_cycle = find_column(df, ['结算周期', '付款周期', '回款周期', '周期'])
    
    for idx, row in df.iterrows():
        contract_no = str(row.get(col_contract, f'CTR-{idx+1}')) if col_contract else f'CTR-{idx+1}'
        
        source = SourceReference(
            file_name=file_name,
            sheet_name=sheet_name,
            row_number=idx + 2,
            material_type=MaterialType.CONTRACT
        )
        
        contract = AuthorizationContract(
            id=f"contract_{file_name}_{sheet_name}_{idx}",
            brand_name=str(row.get(col_brand, '未知品牌')) if col_brand else '未知品牌',
            partner_name=str(row.get(col_partner, '未知合作方')) if col_partner else '未知合作方',
            contract_no=contract_no,
            start_date=parse_date(row.get(col_start)) if col_start else None,
            end_date=parse_date(row.get(col_end)) if col_end else None,
            guaranteed_amount=parse_float(row.get(col_guarantee)),
            royalty_rate=parse_float(row.get(col_rate)) / 100 if parse_float(row.get(col_rate)) > 1 else parse_float(row.get(col_rate)),
            payment_cycle=str(row.get(col_cycle, '月度')) if col_cycle else '月度',
            source=source
        )
        contracts.append(contract)
    
    return contracts


def parse_deposit_sheet(df: pd.DataFrame, file_name: str, sheet_name: str) -> List[DepositRecord]:
    deposits = []
    
    col_contract = find_column(df, ['合同编号', '合同号', '合同编码'])
    col_type = find_column(df, ['类型', '保证金类型', '押金类型'])
    col_amount = find_column(df, ['金额', '保证金金额', '押金金额'])
    col_date = find_column(df, ['到账日期', '收款日期', '缴纳日期', '日期'])
    col_verified = find_column(df, ['是否核销', '核销状态', '已核销'])
    col_verified_date = find_column(df, ['核销日期', '核销时间'])
    col_verified_amount = find_column(df, ['核销金额', '已核销金额'])
    
    for idx, row in df.iterrows():
        contract_no = str(row.get(col_contract, f'CTR-{idx+1}')) if col_contract else f'CTR-{idx+1}'
        
        source = SourceReference(
            file_name=file_name,
            sheet_name=sheet_name,
            row_number=idx + 2,
            material_type=MaterialType.DEPOSIT
        )
        
        is_verified = False
        if col_verified:
            val = row.get(col_verified)
            is_verified = str(val).lower() in ['是', '已核销', 'true', 'yes', '1']
        
        deposit = DepositRecord(
            id=f"deposit_{file_name}_{sheet_name}_{idx}",
            contract_no=contract_no,
            deposit_type=str(row.get(col_type, '授权保证金')) if col_type else '授权保证金',
            amount=parse_float(row.get(col_amount)),
            receive_date=parse_date(row.get(col_date)) if col_date else None,
            is_verified=is_verified,
            verified_date=parse_date(row.get(col_verified_date)) if col_verified_date else None,
            verified_amount=parse_float(row.get(col_verified_amount)),
            source=source
        )
        deposits.append(deposit)
    
    return deposits


def parse_payment_sheet(df: pd.DataFrame, file_name: str, sheet_name: str) -> List[PaymentReport]:
    payments = []
    
    col_contract = find_column(df, ['合同编号', '合同号', '合同编码'])
    col_period = find_column(df, ['周期', '结算周期', '月份', '期间', '账期'])
    col_report_date = find_column(df, ['报告日期', '结算日期', '回款日期'])
    col_channel = find_column(df, ['渠道', '销售渠道', '平台'])
    col_sales = find_column(df, ['销售额', '销售金额', '流水'])
    col_return = find_column(df, ['退货额', '退货金额', '退款'])
    col_payment = find_column(df, ['实际回款', '回款金额', '到账金额'])
    col_royalty = find_column(df, ['授权费', '分成金额', '品牌费'])
    
    for idx, row in df.iterrows():
        contract_no = str(row.get(col_contract, f'CTR-{idx+1}')) if col_contract else f'CTR-{idx+1}'
        
        source = SourceReference(
            file_name=file_name,
            sheet_name=sheet_name,
            row_number=idx + 2,
            material_type=MaterialType.PAYMENT
        )
        
        payment = PaymentReport(
            id=f"payment_{file_name}_{sheet_name}_{idx}",
            contract_no=contract_no,
            period=str(row.get(col_period, f'P-{idx+1}')) if col_period else f'P-{idx+1}',
            report_date=parse_date(row.get(col_report_date)) if col_report_date else None,
            channel=str(row.get(col_channel, '未知渠道')) if col_channel else '未知渠道',
            sales_amount=parse_float(row.get(col_sales)),
            return_amount=parse_float(row.get(col_return)),
            actual_payment=parse_float(row.get(col_payment)),
            royalty_amount=parse_float(row.get(col_royalty)),
            source=source
        )
        payments.append(payment)
    
    return payments


def parse_excel_file(file_path: str) -> Tuple[List[AuthorizationContract], List[DepositRecord], List[PaymentReport]]:
    file_name = os.path.basename(file_path)
    all_contracts = []
    all_deposits = []
    all_payments = []
    
    try:
        xls = pd.ExcelFile(file_path)
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            if df.empty:
                continue
            
            sheet_type = detect_sheet_type(df, file_name)
            
            if sheet_type == MaterialType.CONTRACT:
                all_contracts.extend(parse_contract_sheet(df, file_name, sheet_name))
            elif sheet_type == MaterialType.DEPOSIT:
                all_deposits.extend(parse_deposit_sheet(df, file_name, sheet_name))
            else:
                all_payments.extend(parse_payment_sheet(df, file_name, sheet_name))
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    
    return all_contracts, all_deposits, all_payments


def parse_all_files() -> Tuple[List[AuthorizationContract], List[DepositRecord], List[PaymentReport], List[str]]:
    all_contracts = []
    all_deposits = []
    all_payments = []
    source_files = []
    
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(('.xlsx', '.xls', '.csv')):
            file_path = os.path.join(UPLOAD_DIR, filename)
            source_files.append(filename)
            
            if filename.endswith('.csv'):
                df = pd.read_csv(file_path)
                sheet_type = detect_sheet_type(df, filename)
                if sheet_type == MaterialType.CONTRACT:
                    all_contracts.extend(parse_contract_sheet(df, filename, 'Sheet1'))
                elif sheet_type == MaterialType.DEPOSIT:
                    all_deposits.extend(parse_deposit_sheet(df, filename, 'Sheet1'))
                else:
                    all_payments.extend(parse_payment_sheet(df, filename, 'Sheet1'))
            else:
                contracts, deposits, payments = parse_excel_file(file_path)
                all_contracts.extend(contracts)
                all_deposits.extend(deposits)
                all_payments.extend(payments)
    
    return all_contracts, all_deposits, all_payments, source_files
