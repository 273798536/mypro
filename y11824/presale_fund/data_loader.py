import os
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Tuple
from .models import (
    ProjectNode, Invoice, SupervisionAccount,
    NodeStatus, InvoiceStatus
)


class DataLoader:
    @staticmethod
    def load_excel(input_path: str) -> Tuple[List[ProjectNode], List[Invoice], List[SupervisionAccount]]:
        nodes = []
        invoices = []
        accounts = []
        
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"输入路径不存在: {input_path}")
        
        if os.path.isdir(input_path):
            for file in os.listdir(input_path):
                if file.endswith(('.xlsx', '.xls')):
                    file_path = os.path.join(input_path, file)
                    n, i, a = DataLoader._load_single_excel(file_path)
                    nodes.extend(n)
                    invoices.extend(i)
                    accounts.extend(a)
        else:
            nodes, invoices, accounts = DataLoader._load_single_excel(input_path)
        
        return nodes, invoices, accounts
    
    @staticmethod
    def _load_single_excel(file_path: str) -> Tuple[List[ProjectNode], List[Invoice], List[SupervisionAccount]]:
        nodes = []
        invoices = []
        accounts = []
        
        excel_file = pd.ExcelFile(file_path)
        
        if '工程节点' in excel_file.sheet_names:
            df_nodes = pd.read_excel(file_path, sheet_name='工程节点')
            nodes = DataLoader._parse_nodes(df_nodes)
        
        if '发票' in excel_file.sheet_names:
            df_invoices = pd.read_excel(file_path, sheet_name='发票')
            invoices = DataLoader._parse_invoices(df_invoices)
        
        if '监管账户' in excel_file.sheet_names:
            df_accounts = pd.read_excel(file_path, sheet_name='监管账户')
            accounts = DataLoader._parse_accounts(df_accounts)
        
        return nodes, invoices, accounts
    
    @staticmethod
    def _parse_nodes(df: pd.DataFrame) -> List[ProjectNode]:
        nodes = []
        for _, row in df.iterrows():
            status = NodeStatus.COMPLETED if str(row.get('状态', '')).find('完成') >= 0 else \
                     NodeStatus.IN_PROGRESS if str(row.get('状态', '')).find('进行') >= 0 else \
                     NodeStatus.NOT_STARTED
            
            is_withdrawn = str(row.get('是否撤回', '')).find('是') >= 0 or \
                          str(row.get('状态', '')).find('撤回') >= 0
            
            if is_withdrawn:
                status = NodeStatus.WITHDRAWN
            
            node = ProjectNode(
                node_id=str(row.get('节点ID', f"node_{len(nodes)+1}")),
                node_name=str(row.get('节点名称', '')),
                project_id=str(row.get('项目ID', '')),
                project_name=str(row.get('项目名称', '')),
                completed_amount=float(row.get('已完成金额', 0) or 0),
                total_amount=float(row.get('总金额', 0) or 0),
                status=status,
                completion_date=pd.to_datetime(row.get('完成日期')) if pd.notna(row.get('完成日期')) else None,
                version=int(row.get('版本', 1) or 1),
                is_withdrawn=is_withdrawn,
                withdrawn_reason=str(row.get('撤回原因', '')) if pd.notna(row.get('撤回原因')) else None
            )
            nodes.append(node)
        return nodes
    
    @staticmethod
    def _parse_invoices(df: pd.DataFrame) -> List[Invoice]:
        invoices = []
        for _, row in df.iterrows():
            is_red_flushed = str(row.get('是否红冲', '')).find('是') >= 0 or \
                           str(row.get('状态', '')).find('红冲') >= 0
            
            status = InvoiceStatus.RED_FLUSHED if is_red_flushed else InvoiceStatus.NORMAL
            
            invoice = Invoice(
                invoice_id=str(row.get('发票ID', f"inv_{len(invoices)+1}")),
                invoice_no=str(row.get('发票号', '')),
                project_id=str(row.get('项目ID', '')),
                project_name=str(row.get('项目名称', '')),
                node_id=str(row.get('节点ID', '')),
                amount=float(row.get('金额', 0) or 0),
                invoice_date=pd.to_datetime(row.get('发票日期')) if pd.notna(row.get('发票日期')) else datetime.now(),
                status=status,
                is_red_flushed=is_red_flushed,
                red_flush_reason=str(row.get('红冲原因', '')) if pd.notna(row.get('红冲原因')) else None,
                original_invoice_id=str(row.get('原发票ID', '')) if pd.notna(row.get('原发票ID')) else None
            )
            invoices.append(invoice)
        return invoices
    
    @staticmethod
    def _parse_accounts(df: pd.DataFrame) -> List[SupervisionAccount]:
        accounts = []
        for _, row in df.iterrows():
            account = SupervisionAccount(
                account_id=str(row.get('账户ID', f"acc_{len(accounts)+1}")),
                account_no=str(row.get('账号', '')),
                project_id=str(row.get('项目ID', '')),
                project_name=str(row.get('项目名称', '')),
                bank_name=str(row.get('开户行', '')),
                total_fund=float(row.get('监管资金总额', 0) or 0),
                used_fund=float(row.get('已使用资金', 0) or 0),
                balance=float(row.get('账户余额', 0) or 0),
                supervision_ratio=float(row.get('监管比例', 0) or 0),
                ratio_version=str(row.get('比例版本', 'v1.0')),
                ratio_effective_date=pd.to_datetime(row.get('比例生效日期')) if pd.notna(row.get('比例生效日期')) else datetime.now()
            )
            accounts.append(account)
        return accounts
    
    @staticmethod
    def load_json_history(history_path: str) -> Dict:
        if os.path.exists(history_path):
            with open(history_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
