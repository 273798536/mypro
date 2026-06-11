export interface Dispute {
  id: string;
  case_no: string;
  card_no: string | null;
  txn_date: string | null;
  txn_amount: number | null;
  txn_currency: string | null;
  approval_no: string | null;
  merchant: string | null;
  dispute_type: string | null;
  tax_amount: number | null;
  exchange_rate: number | null;
  settle_amount: number | null;
  settle_currency: string | null;
  remark: string | null;
  status: 'pending_materials' | 'processed' | 'manual_review';
  source_email_id: string | null;
  is_manual_override: number;
  created_at: string;
  updated_at: string;
  late_attachment_count: number;
  attachment_count: number;
}

export interface TimelineEvent {
  id: string;
  dispute_id: string;
  case_no: string;
  dispute_status: string;
  event_type: string;
  event_text: string;
  operator: string | null;
  source_type: string | null;
  source_email_id: string | null;
  email_subject: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  dispute_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number;
  source_email_id: string | null;
  is_late_arrival: number;
  arrival_batch_no: string | null;
  uploaded_at: string;
}

export interface ImportResult {
  batchNo: string;
  summary: {
    total: number;
    newDisputes: number;
    updatedDisputes: number;
    attachments: number;
    skipped: number;
  };
  results: Array<{
    file: string;
    caseNo?: string;
    status: 'created' | 'updated' | 'skipped' | 'error';
    note?: string;
    reason?: string;
  }>;
}

export const STATUS_LABEL: Record<string, string> = {
  pending_materials: '待补材料',
  processed: '已处理',
  manual_review: '人工改判'
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  import: '导入创建',
  supplement: '信息补充',
  late_attachment: '晚到凭证',
  attachment: '附件',
  remark_update: '备注修改',
  status_change: '状态变更',
  duplicate_check: '重复检查',
  extracted_data: '数据提取'
};
