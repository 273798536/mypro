import pandas as pd
from datetime import datetime
from typing import List, Dict, Tuple
from models import (
    Database, ProjectContract, ConstructionNode, 
    NodeStatus, PaymentStatus
)


class DataImporter:
    def __init__(self, db: Database):
        self.db = db

    def import_contract_from_excel(self, file_path: str) -> Tuple[List[ProjectContract], List[str]]:
        errors = []
        contracts = []
        
        try:
            df = pd.read_excel(file_path)
            required_cols = ['项目编号', '项目名称', '客户名称', '承建单位', 
                           '合同金额', '签订日期', '开始日期', '结束日期']
            
            for col in required_cols:
                if col not in df.columns:
                    errors.append(f"缺少必需列: {col}")
            
            if errors:
                return [], errors
            
            for idx, row in df.iterrows():
                try:
                    contract = ProjectContract(
                        id=None,
                        project_code=str(row['项目编号']).strip(),
                        project_name=str(row['项目名称']).strip(),
                        client_name=str(row['客户名称']).strip(),
                        contractor=str(row['承建单位']).strip(),
                        contract_amount=float(row['合同金额']),
                        sign_date=self._format_date(row['签订日期']),
                        start_date=self._format_date(row['开始日期']),
                        end_date=self._format_date(row['结束日期']),
                        payment_terms=str(row.get('付款条款', '')),
                        created_at=datetime.now().isoformat(),
                        updated_at=datetime.now().isoformat()
                    )
                    contracts.append(contract)
                    self.db.insert_contract(contract)
                except Exception as e:
                    errors.append(f"第{idx+2}行导入失败: {str(e)}")
                    
        except Exception as e:
            errors.append(f"文件读取失败: {str(e)}")
            
        return contracts, errors

    def import_nodes_from_excel(self, file_path: str) -> Tuple[List[ConstructionNode], List[str]]:
        errors = []
        nodes = []
        
        try:
            df = pd.read_excel(file_path)
            required_cols = ['项目编号', '节点编号', '节点名称', '计划日期', 
                           '付款比例', '状态']
            
            for col in required_cols:
                if col not in df.columns:
                    errors.append(f"缺少必需列: {col}")
            
            if errors:
                return [], errors
            
            for idx, row in df.iterrows():
                try:
                    project_code = str(row['项目编号']).strip()
                    contract = self.db.get_contract(project_code)
                    payment_ratio = float(row['付款比例'])
                    payment_amount = (contract.contract_amount * payment_ratio / 100) if contract else 0
                    
                    actual_date = row.get('实际日期')
                    if pd.notna(actual_date):
                        actual_date = self._format_date(actual_date)
                    else:
                        actual_date = None
                    
                    node = ConstructionNode(
                        id=None,
                        project_code=project_code,
                        node_code=str(row['节点编号']).strip(),
                        node_name=str(row['节点名称']).strip(),
                        planned_date=self._format_date(row['计划日期']),
                        actual_date=actual_date,
                        status=str(row.get('状态', NodeStatus.NOT_STARTED.value)),
                        payment_ratio=payment_ratio,
                        payment_amount=payment_amount,
                        payment_status=str(row.get('付款状态', PaymentStatus.NOT_DUE.value)),
                        design_change=str(row.get('设计变更', '')),
                        change_approved=bool(row.get('变更已审批', False)),
                        photos_submitted=bool(row.get('照片已提交', False)),
                        photos_count=int(row.get('照片数量', 0) or 0),
                        remarks=str(row.get('备注', '')),
                        remark_history='',
                        created_at=datetime.now().isoformat(),
                        updated_at=datetime.now().isoformat()
                    )
                    nodes.append(node)
                    self.db.insert_node(node)
                except Exception as e:
                    errors.append(f"第{idx+2}行导入失败: {str(e)}")
                    
        except Exception as e:
            errors.append(f"文件读取失败: {str(e)}")
            
        return nodes, errors

    def import_payment_report(self, file_path: str) -> Tuple[List[Dict], List[str]]:
        errors = []
        updates = []
        
        try:
            df = pd.read_excel(file_path)
            
            for idx, row in df.iterrows():
                try:
                    project_code = str(row['项目编号']).strip()
                    node_code = str(row['节点编号']).strip()
                    
                    update_data = {
                        'project_code': project_code,
                        'node_code': node_code,
                        'payment_status': str(row.get('付款状态', '')),
                        'actual_date': self._format_date(row.get('实际日期')) if pd.notna(row.get('实际日期')) else None,
                        'photos_submitted': bool(row.get('照片已提交', False)),
                        'photos_count': int(row.get('照片数量', 0) or 0),
                        'change_approved': bool(row.get('变更已审批', False)),
                        'remarks': str(row.get('备注', ''))
                    }
                    updates.append(update_data)
                    
                    nodes = self.db.get_nodes_by_project(project_code)
                    for node in nodes:
                        if node.node_code == node_code:
                            if update_data['payment_status']:
                                node.payment_status = update_data['payment_status']
                            if update_data['actual_date']:
                                node.actual_date = update_data['actual_date']
                            node.photos_submitted = update_data['photos_submitted']
                            node.photos_count = update_data['photos_count']
                            node.change_approved = update_data['change_approved']
                            if update_data['remarks']:
                                node.remarks = update_data['remarks']
                            node.updated_at = datetime.now().isoformat()
                            self.db.insert_node(node)
                            
                except Exception as e:
                    errors.append(f"第{idx+2}行更新失败: {str(e)}")
                    
        except Exception as e:
            errors.append(f"文件读取失败: {str(e)}")
            
        return updates, errors

    @staticmethod
    def _format_date(date_val) -> str:
        if pd.isna(date_val):
            return ''
        if isinstance(date_val, datetime):
            return date_val.strftime('%Y-%m-%d')
        if isinstance(date_val, str):
            try:
                return datetime.strptime(date_val, '%Y-%m-%d').strftime('%Y-%m-%d')
            except:
                try:
                    return datetime.strptime(date_val, '%Y/%m/%d').strftime('%Y-%m-%d')
                except:
                    return date_val
        return str(date_val)
