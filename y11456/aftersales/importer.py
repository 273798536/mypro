import os
import json
import pandas as pd
from typing import List, Dict, Tuple, Any
from .models import (
    create_source_file, check_duplicate_file, insert_raw_record,
    get_batch, upsert_aftersales_order, get_raw_records_by_batch
)


SUPPORTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']


class ImportError(Exception):
    pass


class DuplicateFileError(ImportError):
    pass


class UnsupportedFileTypeError(ImportError):
    pass


def read_file(file_path: str) -> pd.DataFrame:
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.csv':
        return pd.read_csv(file_path, dtype=str)
    elif ext in ['.xlsx', '.xls']:
        return pd.read_excel(file_path, dtype=str)
    else:
        raise UnsupportedFileTypeError(f"不支持的文件格式: {ext}")


def parse_leader_refund(df: pd.DataFrame) -> List[Dict]:
    records = []
    column_mapping = {
        '订单号': ['订单号', 'order_no', '订单编号'],
        '商品编码': ['商品编码', 'sku_code', 'SKU编码', 'sku'],
        '商品名称': ['商品名称', 'sku_name', '品名'],
        '退款金额': ['退款金额', 'refund_amount', '金额', '申请金额'],
        '退款原因': ['退款原因', 'refund_reason', '原因', '问题描述'],
        '问题类型': ['问题类型', 'problem_type', '类型'],
        '数量': ['数量', 'quantity', '件数'],
        '团长备注': ['团长备注', 'leader_remark', '备注']
    }
    
    actual_cols = {}
    for target, candidates in column_mapping.items():
        for cand in candidates:
            if cand in df.columns:
                actual_cols[target] = cand
                break
    
    for idx, row in df.iterrows():
        record = {
            'source_type': 'leader_refund',
            'original_row_no': idx + 2,
            'order_no': str(row.get(actual_cols.get('订单号'), '')).strip(),
            'sku_code': str(row.get(actual_cols.get('商品编码'), '')).strip(),
            'sku_name': str(row.get(actual_cols.get('商品名称'), '')).strip(),
            'refund_amount': parse_amount(row.get(actual_cols.get('退款金额'), 0)),
            'refund_reason': str(row.get(actual_cols.get('退款原因'), '')).strip(),
            'problem_type': normalize_problem_type(str(row.get(actual_cols.get('问题类型'), '')).strip()),
            'quantity': parse_int(row.get(actual_cols.get('数量'), 1)),
            'leader_remark': str(row.get(actual_cols.get('团长备注'), '')).strip()
        }
        records.append(record)
    
    return records


def parse_warehouse_review(df: pd.DataFrame) -> List[Dict]:
    records = []
    column_mapping = {
        '订单号': ['订单号', 'order_no', '订单编号'],
        '商品编码': ['商品编码', 'sku_code', 'SKU编码', 'sku'],
        '商品名称': ['商品名称', 'sku_name', '品名'],
        '复核金额': ['复核金额', 'warehouse_amount', '金额', '实际退款'],
        '仓库备注': ['仓库备注', 'warehouse_remark', '复核说明', '说明'],
        '问题类型': ['问题类型', 'problem_type', '复核结论'],
        '数量': ['数量', 'quantity', '件数']
    }
    
    actual_cols = {}
    for target, candidates in column_mapping.items():
        for cand in candidates:
            if cand in df.columns:
                actual_cols[target] = cand
                break
    
    for idx, row in df.iterrows():
        record = {
            'source_type': 'warehouse_review',
            'original_row_no': idx + 2,
            'order_no': str(row.get(actual_cols.get('订单号'), '')).strip(),
            'sku_code': str(row.get(actual_cols.get('商品编码'), '')).strip(),
            'sku_name': str(row.get(actual_cols.get('商品名称'), '')).strip(),
            'warehouse_refund_amount': parse_amount(row.get(actual_cols.get('复核金额'), 0)),
            'warehouse_remark': str(row.get(actual_cols.get('仓库备注'), '')).strip(),
            'problem_type': normalize_problem_type(str(row.get(actual_cols.get('问题类型'), '')).strip()),
            'quantity': parse_int(row.get(actual_cols.get('数量'), 1))
        }
        records.append(record)
    
    return records


def parse_user_remark(df: pd.DataFrame) -> List[Dict]:
    records = []
    column_mapping = {
        '订单号': ['订单号', 'order_no', '订单编号'],
        '商品编码': ['商品编码', 'sku_code', 'SKU编码', 'sku'],
        '用户备注': ['用户备注', 'user_remark', '备注', '用户说明'],
        '外部回执': ['外部回执', 'external_receipt', '回执', '图片链接']
    }
    
    actual_cols = {}
    for target, candidates in column_mapping.items():
        for cand in candidates:
            if cand in df.columns:
                actual_cols[target] = cand
                break
    
    for idx, row in df.iterrows():
        record = {
            'source_type': 'user_remark',
            'original_row_no': idx + 2,
            'order_no': str(row.get(actual_cols.get('订单号'), '')).strip(),
            'sku_code': str(row.get(actual_cols.get('商品编码'), '')).strip(),
            'user_remark': str(row.get(actual_cols.get('用户备注'), '')).strip(),
            'external_receipt': str(row.get(actual_cols.get('外部回执'), '')).strip()
        }
        records.append(record)
    
    return records


def parse_amount(value: Any) -> float:
    if pd.isna(value) or value == '':
        return 0.0
    try:
        s = str(value).replace('¥', '').replace('￥', '').replace(',', '').strip()
        return float(s)
    except (ValueError, TypeError):
        return 0.0


def parse_int(value: Any) -> int:
    if pd.isna(value) or value == '':
        return 1
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return 1


def normalize_problem_type(problem_type: str) -> str:
    pt = problem_type.lower()
    if any(k in pt for k in ['少发', '漏发', '缺少', '缺货', 'missing']):
        return '少发'
    elif any(k in pt for k in ['坏品', '破损', '变质', '损坏', '质量', 'damaged', 'bad']):
        return '坏品'
    elif any(k in pt for k in ['错发', '发错', 'wrong']):
        return '错发'
    elif any(k in pt for k in ['退款', '退单', '取消', 'refund']):
        return '用户退款'
    else:
        return problem_type if problem_type else '未分类'


PARSERS = {
    'leader_refund': parse_leader_refund,
    'warehouse_review': parse_warehouse_review,
    'user_remark': parse_user_remark
}

FILE_TYPE_NAMES = {
    'leader_refund': '团长退款表',
    'warehouse_review': '仓库复核表',
    'user_remark': '用户备注',
    'external_receipt': '外部回执'
}


def import_file(batch_no: str, file_path: str, file_type: str) -> Tuple[int, List[Dict]]:
    batch = get_batch(batch_no)
    if not batch:
        raise ImportError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    if file_type not in PARSERS:
        raise ImportError(f"不支持的文件类型: {file_type}")
    
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileTypeError(f"不支持的文件格式，仅支持: {', '.join(SUPPORTED_EXTENSIONS)}")
    
    if check_duplicate_file(batch_id, file_type, file_path):
        raise DuplicateFileError(f"该文件已在当前批次导入过，请勿重复提交")
    
    try:
        df = read_file(file_path)
    except Exception as e:
        raise ImportError(f"读取文件失败: {str(e)}")
    
    parser = PARSERS[file_type]
    
    try:
        parsed_records = parser(df)
    except Exception as e:
        raise ImportError(f"解析文件失败: {str(e)}")
    
    source_file_id = create_source_file(
        batch_id=batch_id,
        file_type=file_type,
        file_name=os.path.basename(file_path),
        file_path=file_path,
        total_rows=len(parsed_records)
    )
    
    failed_records = []
    
    for record in parsed_records:
        original_row_no = record.pop('original_row_no')
        source_type = record.pop('source_type')
        
        raw_data = json.dumps(record, ensure_ascii=False)
        
        try:
            insert_raw_record(
                batch_id=batch_id,
                source_file_id=source_file_id,
                source_type=source_type,
                original_row_no=original_row_no,
                parsed_data=record,
                raw_data=raw_data
            )
        except Exception as e:
            failed_records.append({
                'row_no': original_row_no,
                'data': record,
                'error': str(e)
            })
    
    return len(parsed_records) - len(failed_records), failed_records


def consolidate_orders(batch_no: str) -> Tuple[int, List[Dict]]:
    batch = get_batch(batch_no)
    if not batch:
        raise ImportError(f"批次不存在: {batch_no}")
    
    batch_id = batch['id']
    
    raw_records = get_raw_records_by_batch(batch_id)
    
    order_map = {}
    
    for record in raw_records:
        order_no = record.get('order_no', '')
        sku_code = record.get('sku_code', '')
        
        if not order_no or not sku_code:
            continue
        
        key = (order_no, sku_code)
        
        if key not in order_map:
            order_map[key] = {
                'order_no': order_no,
                'sku_code': sku_code,
                'sku_name': record.get('sku_name', ''),
                'leader_refund_amount': 0,
                'warehouse_refund_amount': 0,
                'problem_types': set(),
                'problem_type': '',
                'user_remark': '',
                'warehouse_remark': '',
                'leader_remark': '',
                'external_receipt': '',
                'quantity': 0,
                'source_rows': []
            }
        
        order = order_map[key]
        source_type = record.get('source_type')
        
        order['source_rows'].append({
            'source': FILE_TYPE_NAMES.get(source_type, source_type),
            'row_no': record.get('original_row_no'),
            'file': record.get('file_name')
        })
        
        if source_type == 'leader_refund':
            order['leader_refund_amount'] += record.get('refund_amount', 0)
            if record.get('sku_name'):
                order['sku_name'] = record.get('sku_name')
            if record.get('problem_type'):
                order['problem_types'].add(record.get('problem_type'))
            order['leader_remark'] = record.get('leader_remark', '')
            order['quantity'] = max(order['quantity'], record.get('quantity', 1))
        
        elif source_type == 'warehouse_review':
            order['warehouse_refund_amount'] += record.get('warehouse_refund_amount', 0)
            if record.get('sku_name'):
                order['sku_name'] = record.get('sku_name')
            if record.get('problem_type'):
                order['problem_types'].add(record.get('problem_type'))
            order['warehouse_remark'] = record.get('warehouse_remark', '')
            order['quantity'] = max(order['quantity'], record.get('quantity', 1))
        
        elif source_type == 'user_remark':
            order['user_remark'] = record.get('user_remark', '')
            order['external_receipt'] = record.get('external_receipt', '')
    
    consolidated = 0
    issues = []
    
    for (order_no, sku_code), order_data in order_map.items():
        problem_types = order_data.pop('problem_types')
        source_rows = order_data.pop('source_rows')
        order_data.pop('order_no', None)
        order_data.pop('sku_code', None)
        
        if len(problem_types) == 1:
            order_data['problem_type'] = list(problem_types)[0]
        elif len(problem_types) > 1:
            order_data['problem_type'] = '|'.join(sorted(problem_types))
            issues.append({
                'order_no': order_no,
                'sku_code': sku_code,
                'issue': '多源问题类型不一致',
                'types': list(problem_types)
            })
        
        order_data['combined_refund_amount'] = max(
            order_data['leader_refund_amount'],
            order_data['warehouse_refund_amount']
        )
        
        try:
            upsert_aftersales_order(
                batch_id=batch_id,
                order_no=order_no,
                sku_code=sku_code,
                **order_data
            )
            consolidated += 1
        except Exception as e:
            issues.append({
                'order_no': order_no,
                'sku_code': sku_code,
                'issue': '保存订单失败',
                'error': str(e)
            })
    
    return consolidated, issues


def get_file_type_display(file_type: str) -> str:
    return FILE_TYPE_NAMES.get(file_type, file_type)
