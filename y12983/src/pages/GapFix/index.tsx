import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useGapStore } from '@/stores/gapStore';
import { useHistoryStore } from '@/stores/historyStore';
import Card from '@/components/Card/Card';
import StatusBadge from '@/components/Status/StatusBadge';
import Button from '@/components/Button/Button';
import { formatDateTime } from '@/utils/format';
import type { DuplicateResult } from '@/types';

export default function GapFix() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentGap, fetchGap, concludeGap, detectDuplicatesById, duplicates, updateStatus } = useGapStore();
  const { add: addHistory } = useHistoryStore();

  const [fixType, setFixType] = useState('supplement');
  const [solution, setSolution] = useState('');
  const [supplementData, setSupplementData] = useState('');
  const [remark, setRemark] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [step, setStep] = useState(1);
  const [showDuplicateCheck, setShowDuplicateCheck] = useState(false);

  useEffect(() => {
    if (id) {
      fetchGap(id);
      const dups = detectDuplicatesById(id, 0.6);
      if (dups.length > 0) {
        setShowDuplicateCheck(true);
      }
    }
  }, [id, fetchGap, detectDuplicatesById]);

  if (!currentGap) {
    return <div className="p-6 text-center text-slate-500">加载中...</div>;
  }

  const fixTypes = [
    { value: 'supplement', label: '数据补录', desc: '补充缺失的采样数据' },
    { value: 'dedup', label: '去重处理', desc: '删除重复的记录数据' },
    { value: 'rebuild', label: '重建索引/分区', desc: '重建表索引或分区' },
    { value: 'other', label: '其他修正', desc: '其他类型的修复方式' },
  ];

  const handleNext = () => {
    if (step === 1 && !solution) {
      alert('请填写修正方案');
      return;
    }
    if (step === 2 && !conclusion) {
      alert('请填写最终结论');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    if (!id) return;

    concludeGap(id, conclusion, '当前用户');
    addHistory({
      gapId: id,
      action: 'fixed',
      operator: '当前用户',
      detail: `修正类型：${fixTypes.find(t => t.value === fixType)?.label}，方案：${solution.slice(0, 50)}`,
    });
    navigate(`/gaps/${id}`);
  };

  const handleStartFix = () => {
    if (!id) return;
    updateStatus(id, 'processing', '当前用户');
    setStep(2);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/gaps/${id}`)}
          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">缺口修正</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <StatusBadge status={currentGap.status} size="sm" />
            <span>{currentGap.title}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {step > s ? <CheckCircle2 size={16} /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-20 h-0.5 mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-16 -mt-2 mb-6 text-xs text-slate-500">
        <span>选择修正方式</span>
        <span>填写修正方案</span>
        <span>确认最终结论</span>
      </div>

      {showDuplicateCheck && duplicates.length > 0 && step === 1 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0" size={20} />
            <div className="flex-1">
              <div className="text-amber-400 font-medium text-sm">
                重复导入检测
              </div>
              <p className="text-xs text-slate-400 mt-1">
                系统检测到 {duplicates.length} 条相似记录，修正前请确认是否为重复导入
              </p>
              <div className="mt-3 space-y-2">
                {duplicates.slice(0, 2).map((dup: DuplicateResult) => (
                  <div key={dup.gap.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                  <div>
                    <div className="text-sm text-slate-200">{dup.gap.title}</div>
                    <div className="text-xs text-slate-500">{dup.reason}</div>
                  </div>
                  <span className="text-xs text-amber-400">
                    相似度 {Math.round(dup.similarity * 100)}%
                  </span>
                </div>
                ))}
              </div>
              <button
                onClick={() => setShowDuplicateCheck(false)}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300"
              >
                已知晓，继续修正
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <Card title="选择修正类型">
          <div className="grid grid-cols-2 gap-3">
            {fixTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setFixType(type.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  fixType === type.value
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className={`font-medium text-sm ${
                  fixType === type.value ? 'text-blue-400' : 'text-slate-200'
                }`}>
                  {type.label}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {type.desc}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleStartFix}>
              开始修正
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="修正方案">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                修正方案 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="请详细描述修正方案..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {fixType === 'supplement' && (
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">
                  补录数据说明
                </label>
                <textarea
                  value={supplementData}
                  onChange={(e) => setSupplementData(e.target.value)}
                  placeholder="补录的数据范围、来源等说明..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-mono text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                备注
              </label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="其他需要说明的内容..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              上一步
            </Button>
            <Button onClick={handleNext}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="确认最终结论">
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-2">修正信息确认</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">修正类型</span>
                  <span className="ml-2 text-slate-200">
                    {fixTypes.find(t => t.value === fixType)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">操作人</span>
                  <span className="ml-2 text-slate-200">当前用户</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">修正方案</span>
                  <p className="text-slate-300 mt-1">{solution}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                最终结论 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="请输入最终结论，确认后将标记为已修正..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                <AlertTriangle size={12} className="inline mr-1" />
                确认结论后，缺口状态将变更为「已修正」，并记录到历史记录中。
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              上一步
            </Button>
            <Button onClick={handleSubmit}>
              确认并提交
            </Button>
          </div>
        </Card>
      )}

      <div className="text-center text-xs text-slate-600">
        操作时间：{formatDateTime(new Date().toISOString())}
      </div>
    </div>
  );
}
