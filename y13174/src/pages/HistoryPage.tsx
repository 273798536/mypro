import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeflectionStore } from '@/store/useDeflectionStore';
import { useHistoryTracking } from '@/hooks/useHistoryTracking';
import StatusBadge from '@/components/common/StatusBadge';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import RemarkTimeline from '@/components/timeline/RemarkTimeline';
import SnapshotCompare from '@/components/timeline/SnapshotCompare';
import type { RecordStatus } from '@/types';
import { STATUS_LABELS } from '@/types';

type TabKey = 'remarks' | 'snapshots' | 'confirmations';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'remarks', label: '备注时间线' },
  { key: 'snapshots', label: '截图快照' },
  { key: 'confirmations', label: '人工确认记录' },
];

export default function HistoryPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const rawRecords = useDeflectionStore((s) => s.rawRecords);
  const confirmRecord = useDeflectionStore((s) => s.confirmRecord);
  const { remarks, snapshots, confirmations, addRemark } = useHistoryTracking(recordId!);

  const record = useMemo(
    () => rawRecords.find((r) => r.id === recordId),
    [rawRecords, recordId]
  );

  const [activeTab, setActiveTab] = useState<TabKey>('remarks');
  const [showRemarkForm, setShowRemarkForm] = useState(false);
  const [remarkContent, setRemarkContent] = useState('');
  const [remarkAuthor, setRemarkAuthor] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<RecordStatus>('CONFIRMED_PASS');
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmOperator, setConfirmOperator] = useState('');

  if (!record) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f2440]">
        <div className="text-center">
          <p className="text-[#4a5568] text-lg mb-4">记录不存在</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#1e3a5f] border-2 border-[#2d5a8e] text-white px-6 py-2 hover:border-[#5a9fd4]"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const handleAddRemark = () => {
    if (!remarkContent.trim() || !remarkAuthor.trim()) return;
    addRemark(remarkContent, remarkAuthor);
    setRemarkContent('');
    setRemarkAuthor('');
    setShowRemarkForm(false);
  };

  const handleConfirm = () => {
    if (!confirmReason.trim() || !confirmOperator.trim()) return;
    confirmRecord(recordId!, confirmStatus, confirmReason, confirmOperator);
    setShowConfirmDialog(false);
    setConfirmReason('');
    setConfirmOperator('');
  };

  return (
    <div className="min-h-screen bg-[#0f2440] pb-32">
      <header className="bg-[#1e3a5f] border-b-2 border-[#2d5a8e] px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-[#8ba7c7] hover:text-white transition-colors"
          >
            ← 返回
          </button>
          <h1 className="text-white text-xl font-bold tracking-wide">记录详情</h1>
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[#8ba7c7] text-xs mb-1">梁号</p>
              <p className="text-white font-mono text-lg">{record.beamNumber}</p>
            </div>
            <div>
              <p className="text-[#8ba7c7] text-xs mb-1">检测时间</p>
              <p className="text-white text-sm">{record.detectionTime}</p>
            </div>
            <div>
              <p className="text-[#8ba7c7] text-xs mb-1">挠度值</p>
              <p className="text-white font-mono text-lg">
                <AnimatedNumber value={record.deflectionValue} decimals={3} />
                <span className="text-[#8ba7c7] ml-1">mm</span>
              </p>
            </div>
            <div>
              <p className="text-[#8ba7c7] text-xs mb-1">状态</p>
              <StatusBadge status={record.status} />
            </div>
            <div className="col-span-2">
              <p className="text-[#8ba7c7] text-xs mb-1">阈值范围</p>
              <p className="text-white font-mono text-sm">
                [{record.threshold.min.toFixed(3)}, {record.threshold.max.toFixed(3)}] mm
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="flex border-b-2 border-[#2d5a8e]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-[#5a9fd4] -mb-[2px]'
                  : 'text-[#4a5568] hover:text-[#8ba7c7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        {activeTab === 'remarks' && <RemarkTimeline remarks={remarks} />}
        {activeTab === 'snapshots' && <SnapshotCompare snapshots={snapshots} />}
        {activeTab === 'confirmations' && (
          <div className="space-y-2">
            {confirmations.length === 0 ? (
              <p className="text-[#4a5568] text-sm text-center py-8">暂无确认记录</p>
            ) : (
              confirmations.map((c) => (
                <div key={c.id} className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.statusBefore} />
                      <span className="text-[#4a5568]">→</span>
                      <StatusBadge status={c.statusAfter} />
                    </div>
                    <span className="text-[#8ba7c7] text-xs">{c.confirmedAt}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-[#8ba7c7]">原值: </span>
                      <span className="text-white font-mono">{c.valueBefore.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-[#8ba7c7]">新值: </span>
                      <span className="text-white font-mono">{c.valueAfter.toFixed(3)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#8ba7c7]">原因: </span>
                      <span className="text-white">{c.reason}</span>
                    </div>
                    <div>
                      <span className="text-[#8ba7c7]">操作人: </span>
                      <span className="text-white">{c.operator}</span>
                    </div>
                    <div>
                      <span className="text-[#8ba7c7]">公式版本: </span>
                      <span className="text-white font-mono">{c.formulaVersion}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showRemarkForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-6 w-full max-w-md mx-4">
            <h3 className="text-white font-semibold mb-4">添加备注</h3>
            <textarea
              value={remarkContent}
              onChange={(e) => setRemarkContent(e.target.value)}
              placeholder="备注内容..."
              className="w-full bg-[#0f2440] border-2 border-[#2d5a8e] text-white px-3 py-2 mb-3 min-h-[100px] resize-none placeholder-[#4a5568] focus:outline-none focus:border-[#5a9fd4]"
            />
            <input
              type="text"
              value={remarkAuthor}
              onChange={(e) => setRemarkAuthor(e.target.value)}
              placeholder="作者"
              className="w-full bg-[#0f2440] border-2 border-[#2d5a8e] text-white px-3 py-2 mb-4 placeholder-[#4a5568] focus:outline-none focus:border-[#5a9fd4]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemarkForm(false)}
                className="flex-1 bg-[#0f2440] border-2 border-[#2d5a8e] text-[#8ba7c7] py-2 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddRemark}
                className="flex-1 bg-[#5a67d8] border-2 border-[#6b76e8] text-white py-2 hover:bg-[#4c59c7] transition-colors"
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-6 w-full max-w-md mx-4">
            <h3 className="text-white font-semibold mb-4">确认此记录</h3>
            <div className="mb-3">
              <label className="text-[#8ba7c7] text-xs block mb-1">新状态</label>
              <select
                value={confirmStatus}
                onChange={(e) => setConfirmStatus(e.target.value as RecordStatus)}
                className="w-full bg-[#0f2440] border-2 border-[#2d5a8e] text-white px-3 py-2 focus:outline-none focus:border-[#5a9fd4]"
              >
                <option value="CONFIRMED_PASS">{STATUS_LABELS.CONFIRMED_PASS}</option>
                <option value="CONFIRMED_REJECT">{STATUS_LABELS.CONFIRMED_REJECT}</option>
              </select>
            </div>
            <input
              type="text"
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              placeholder="确认原因"
              className="w-full bg-[#0f2440] border-2 border-[#2d5a8e] text-white px-3 py-2 mb-3 placeholder-[#4a5568] focus:outline-none focus:border-[#5a9fd4]"
            />
            <input
              type="text"
              value={confirmOperator}
              onChange={(e) => setConfirmOperator(e.target.value)}
              placeholder="操作人姓名"
              className="w-full bg-[#0f2440] border-2 border-[#2d5a8e] text-white px-3 py-2 mb-4 placeholder-[#4a5568] focus:outline-none focus:border-[#5a9fd4]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 bg-[#0f2440] border-2 border-[#2d5a8e] text-[#8ba7c7] py-2 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-[#2f855a] border-2 border-[#38a169] text-white py-2 hover:bg-[#276749] transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-[#1e3a5f] border-t-2 border-[#2d5a8e] px-6 py-3 flex gap-3">
        <button
          onClick={() => setShowRemarkForm(true)}
          className="flex-1 bg-[#1e3a5f] border-2 border-[#2d5a8e] text-white py-2.5 hover:border-[#5a9fd4] transition-colors"
        >
          添加备注
        </button>
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="flex-1 bg-[#5a67d8] border-2 border-[#6b76e8] text-white py-2.5 hover:bg-[#4c59c7] transition-colors"
        >
          确认此记录
        </button>
      </div>
    </div>
  );
}
