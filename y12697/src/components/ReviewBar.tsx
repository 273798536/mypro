import { useState } from 'react';
import type { ProcessingRecord } from '../../../shared/types';
import { CheckCircle2, XCircle, AlertTriangle, Send } from 'lucide-react';

interface Props {
  snapshotId: string;
  record: ProcessingRecord | null;
  onSubmit: (data: {
    snapshotId: string;
    processingRecord: ProcessingRecord;
    riskApproved: boolean;
    coordinateApproved: boolean;
    conversionApproved: boolean;
    reviewComment: string;
    changeReason: string;
    operator: string;
  }) => void;
}

export default function ReviewBar({ snapshotId, record, onSubmit }: Props) {
  const [riskApproved, setRiskApproved] = useState<boolean | null>(null);
  const [coordApproved, setCoordApproved] = useState<boolean | null>(null);
  const [convApproved, setConvApproved] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('舞台统筹');

  const allDone = riskApproved !== null && coordApproved !== null && convApproved !== null && reason.trim().length > 0;

  const handleSubmit = () => {
    if (!record || !allDone) return;
    onSubmit({
      snapshotId,
      processingRecord: record,
      riskApproved: !!riskApproved,
      coordinateApproved: !!coordApproved,
      conversionApproved: !!convApproved,
      reviewComment: comment,
      changeReason: reason,
      operator,
    });
  };

  const Pill = ({ label, val, setVal, icon: Icon }: any) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-charcoal-300">{label}</span>
      <div className="flex border border-charcoal-700 rounded-sm overflow-hidden">
        <button
          onClick={() => setVal(true)}
          className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors ${
            val === true ? 'bg-alert-green text-charcoal-950' : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
          }`}
        >
          <Icon className="w-3 h-3" /> 通过
        </button>
        <button
          onClick={() => setVal(false)}
          className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors ${
            val === false ? 'bg-alert-red text-white' : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
          }`}
        >
          <XCircle className="w-3 h-3" /> 驳回
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-charcoal-800 bg-charcoal-900/95 backdrop-blur shadow-industrial">
      <div className="px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-alert-orange">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">统一复核 · 风险备注 / 设备坐标 / 单位换算 同轮提交</span>
        </div>
        <div className="flex-1" />
        <Pill label="风险备注" val={riskApproved} setVal={setRiskApproved} icon={CheckCircle2} />
        <Pill label="设备坐标" val={coordApproved} setVal={setCoordApproved} icon={CheckCircle2} />
        <Pill label="单位换算" val={convApproved} setVal={setConvApproved} icon={CheckCircle2} />
        <div className="h-6 w-px bg-charcoal-800" />
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-charcoal-400">复核人</label>
          <input
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-24 bg-charcoal-800 border border-charcoal-700 rounded-sm px-2 py-1 text-xs text-white focus:outline-none focus:border-alert-orange"
          />
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="修改原因（必填）"
          className="w-56 bg-charcoal-800 border border-charcoal-700 rounded-sm px-2 py-1 text-xs text-white placeholder-charcoal-500 focus:outline-none focus:border-alert-orange"
        />
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="复核意见（可选）"
          className="w-64 bg-charcoal-800 border border-charcoal-700 rounded-sm px-2 py-1 text-xs text-white placeholder-charcoal-500 focus:outline-none focus:border-alert-orange"
        />
        <button
          onClick={handleSubmit}
          disabled={!allDone}
          className={`btn-warning ${!allDone ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Send className="w-4 h-4" />
          提交复核
        </button>
      </div>
    </div>
  );
}
