import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Droplets, AlertTriangle, CheckCircle, XCircle, Package, FileText, Clock, User, RefreshCw } from 'lucide-react';
import { useDataStore } from '@/stores/useDataStore';
import { StatusBadge } from '@/components/StatusBadge';
import { DataMarkTags } from '@/components/MarkTag';
import { ProcessTimeline } from '@/components/Timeline';
import { formatDateTime, formatPercent } from '@/utils/format';
import type { JudgeResult } from '@/types';
import { cn } from '@/lib/utils';

export const DataDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { towerData, getNotesByDataId, getRecordsByDataId, updateJudgeResult } = useDataStore();
  
  const [judgeResult, setJudgeResult] = useState<JudgeResult>('none');
  const [judgeReason, setJudgeReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const item = towerData.find((d) => d.id === id);
  const notes = item ? getNotesByDataId(item.id) : [];
  const records = item ? getRecordsByDataId(item.id) : [];
  
  const handleSubmit = () => {
    if (!item || judgeResult === 'none') return;
    
    updateJudgeResult(item.id, judgeResult, judgeReason);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">未找到对应数据</p>
        <button
          onClick={() => navigate('/list')}
          className="text-teal-glow text-sm hover:underline"
        >
          返回列表
        </button>
      </div>
    );
  }
  
  const currentNote = notes.find((n) => n.isCurrent);
  const oldNotes = notes.filter((n) => !n.isCurrent);
  
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/list')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-gray-300 font-mono">{item.id}</span>
      </div>
      
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center',
              item.status === 'critical' ? 'bg-orange-alert/20' : item.status === 'warning' ? 'bg-amber-warn/20' : 'bg-teal-glow/20'
            )}>
              <Droplets className={cn(
                'w-7 h-7',
                item.status === 'critical' ? 'text-orange-alert' : item.status === 'warning' ? 'text-amber-warn' : 'text-teal-glow'
              )} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-white">{item.id}</h2>
                <StatusBadge status={item.status} size="md" />
              </div>
              <p className="text-sm text-gray-400">{item.towerId} · {item.materialName}</p>
              <div className="mt-2">
                <DataMarkTags
                  isNoiseSuspected={item.isNoiseSuspected}
                  isOldNote={item.isOldNote}
                  isNameMismatch={item.isNameMismatch}
                  isVerbalNote={item.isVerbalNote}
                  isPending={item.judgeResult === 'pending'}
                  isManual={item.judgeResult !== 'none'}
                />
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-white mb-1">
              {item.dropletValue.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">阈值 {item.threshold}</div>
            <div className={cn(
              'text-sm font-mono font-semibold mt-1',
              item.deviation > 20 ? 'text-orange-alert' : item.deviation > 0 ? 'text-amber-warn' : 'text-teal-glow'
            )}>
              {formatPercent(item.deviation)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
          <div>
            <div className="text-xs text-gray-500 mb-1">采集时间</div>
            <div className="text-sm text-gray-300 font-mono">{formatDateTime(item.timestamp)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">材料名称</div>
            <div className="text-sm text-gray-300">{item.materialName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">判定结果</div>
            <div className="text-sm text-gray-300">
              {item.judgeResult === 'none' ? '未判定' : 
               item.judgeResult === 'normal' ? '正常' :
               item.judgeResult === 'noise' ? '噪声' : '待补材料'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">判定人</div>
            <div className="text-sm text-gray-300">{item.judgeOperator || '-'}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-glow" />
              维修备注
            </h3>
            
            {currentNote && (
              <div className="mb-4 p-4 rounded-lg bg-teal-glow/5 border border-teal-glow/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-teal-glow/20 text-teal-glow font-medium">
                      当前版本 {currentNote.version}
                    </span>
                    <span className="text-xs text-gray-500">{currentNote.author}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatDateTime(currentNote.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{currentNote.content}</p>
              </div>
            )}
            
            {oldNotes.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  历史版本备注
                </div>
                <div className="space-y-2">
                  {oldNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-white/[0.02] border border-white/5 opacity-70"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">
                            {note.version}
                          </span>
                          <span className="text-xs text-gray-500">{note.author}</span>
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono">
                          {formatDateTime(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {notes.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                暂无维修备注
              </div>
            )}
          </div>
          
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-glow" />
              处理记录
            </h3>
            
            {records.length > 0 ? (
              <ProcessTimeline records={records} />
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                暂无处理记录
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-glow" />
              人工改判
            </h3>
            
            {item.judgeResult !== 'none' && (
              <div className="mb-4 p-3 rounded-lg bg-teal-glow/5 border border-teal-glow/20">
                <div className="text-xs text-gray-500 mb-1">当前判定</div>
                <div className="text-sm font-medium text-teal-glow mb-1">
                  {item.judgeResult === 'normal' ? '判定为正常' :
                   item.judgeResult === 'noise' ? '判定为噪声' : '标记待补材料'}
                </div>
                {item.judgeReason && (
                  <p className="text-xs text-gray-400">理由：{item.judgeReason}</p>
                )}
                {item.judgeTime && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {item.judgeOperator} · {formatDateTime(item.judgeTime)}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-2 block">判定结果</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setJudgeResult('normal')}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-lg border transition-all',
                      judgeResult === 'normal'
                        ? 'bg-teal-glow/15 border-teal-glow/50 text-teal-glow'
                        : 'bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20'
                    )}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">正常</span>
                  </button>
                  <button
                    onClick={() => setJudgeResult('noise')}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-lg border transition-all',
                      judgeResult === 'noise'
                        ? 'bg-orange-alert/15 border-orange-alert/50 text-orange-alert'
                        : 'bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20'
                    )}
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">噪声</span>
                  </button>
                  <button
                    onClick={() => setJudgeResult('pending')}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-lg border transition-all',
                      judgeResult === 'pending'
                        ? 'bg-blue-400/15 border-blue-400/50 text-blue-400'
                        : 'bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20'
                    )}
                  >
                    <Package className="w-5 h-5" />
                    <span className="text-xs font-medium">待补材料</span>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-2 block">改判理由</label>
                <textarea
                  value={judgeReason}
                  onChange={(e) => setJudgeReason(e.target.value)}
                  placeholder="请填写改判理由..."
                  rows={3}
                  className="w-full px-3 py-2 bg-deep-blue-700/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-glow/50 transition-colors resize-none"
                />
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={judgeResult === 'none'}
                className={cn(
                  'w-full py-2.5 rounded-lg text-sm font-medium transition-all',
                  judgeResult !== 'none'
                    ? 'bg-teal-glow text-deep-blue-900 hover:bg-teal-glow-400'
                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                )}
              >
                {showSuccess ? '✓ 已提交' : '确认提交'}
              </button>
            </div>
          </div>
          
          {item.isNameMismatch && (
            <div className="glass-card rounded-xl p-5 border-amber-warn/30 bg-amber-warn/5">
              <h3 className="text-sm font-semibold text-amber-warn mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                名称不一致提示
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                材料名称 <span className="text-amber-warn">"{item.materialName}"</span> 与标准库不匹配
              </p>
              {item.standardMaterialName && (
                <p className="text-xs text-gray-400 mb-3">
                  标准名称应为 <span className="text-teal-glow">"{item.standardMaterialName}"</span>
                </p>
              )}
              <Link
                to="/recalc"
                className="inline-flex items-center gap-1.5 text-xs text-teal-glow hover:text-teal-glow-400 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                去复算对比验证
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
