import type { SongClip, Contract, TakedownNotice } from '@/types';
import { Music, FileText, AlertTriangle, Clock, MapPin, Percent, Shield, AlertOctagon } from 'lucide-react';

interface SongClipCardProps {
  clip: SongClip;
  isExpanded: boolean;
  onToggle: () => void;
}

export function SongClipCard({ clip, isExpanded, onToggle }: SongClipCardProps) {
  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${
        isExpanded
          ? 'border-blue-500/50 bg-blue-950/20'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Music size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-200 truncate">{clip.title}</h4>
          <p className="text-xs text-slate-400">{clip.artist} · {formatDuration(clip.duration)}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {clip.hasSample && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300">
              含采样
            </span>
          )}
          {clip.isCover && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300">
              翻唱
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-3">
          <div>
            <h5 className="text-xs font-medium text-slate-400 mb-1">歌词片段</h5>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-900/40 rounded p-2">
              {clip.lyrics}
            </p>
          </div>

          <div>
            <h5 className="text-xs font-medium text-slate-400 mb-1">版权标注</h5>
            <ul className="space-y-0.5">
              {clip.copyrightNotes.map((note, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400" />
                  {note}
                </li>
              ))}
            </ul>
          </div>

          {clip.hasSample && clip.sampleOrigin && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5">
              <h5 className="text-xs font-medium text-purple-300 mb-1 flex items-center gap-1.5">
                <AlertOctagon size={12} />
                采样信息
              </h5>
              <p className="text-xs text-purple-200/80">{clip.sampleOrigin}</p>
            </div>
          )}

          {clip.isCover && clip.originalTitle && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
              <h5 className="text-xs font-medium text-blue-300 mb-1">原始作品</h5>
              <p className="text-xs text-blue-200/80">{clip.originalTitle}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ContractCardProps {
  contract: Contract;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ContractCard({ contract, isExpanded, onToggle }: ContractCardProps) {
  const typeLabel = { COVER: '翻唱授权', SAMPLE: '采样授权', BGM: 'BGM授权' }[contract.licenseType];
  const typeColor = {
    COVER: 'text-blue-300 bg-blue-500/20',
    SAMPLE: 'text-purple-300 bg-purple-500/20',
    BGM: 'text-cyan-300 bg-cyan-500/20',
  }[contract.licenseType];

  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${
        contract.isExpired
          ? isExpanded
            ? 'border-red-500/50 bg-red-950/20'
            : 'border-red-500/30 bg-red-950/10'
          : isExpanded
          ? 'border-emerald-500/50 bg-emerald-950/20'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          contract.isExpired ? 'bg-red-500/20' : 'bg-emerald-500/20'
        }`}>
          <FileText size={20} className={contract.isExpired ? 'text-red-400' : 'text-emerald-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-200 truncate">
            {contract.contractNumber}
          </h4>
          <p className="text-xs text-slate-400">
            {contract.partyA} ↔ {contract.partyB}
          </p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${typeColor}`}>{typeLabel}</span>
          {contract.isExpired && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300">
              已过期
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Clock size={12} className="text-slate-500" />
              {contract.effectiveDate} ~ {contract.expiryDate}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Percent size={12} className="text-slate-500" />
              版税率: {(contract.royaltyRate * 100).toFixed(0)}%
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <MapPin size={12} className="text-slate-500" />
            授权区域: {contract.territory.join('、')}
          </div>

          <div>
            <h5 className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
              <Shield size={12} />
              限制条款
            </h5>
            <ul className="space-y-0.5">
              {contract.restrictions.map((r, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {contract.isExpired && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              <p className="text-xs text-red-300 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                此授权合同已于 {contract.expiryDate} 到期，不可自动视为有效
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TakedownCardProps {
  notice: TakedownNotice;
  isExpanded: boolean;
  onToggle: () => void;
}

export function TakedownCard({ notice, isExpanded, onToggle }: TakedownCardProps) {
  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${
        isExpanded
          ? 'border-orange-500/50 bg-orange-950/20'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600/50'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-200 truncate">{notice.noticeNumber}</h4>
          <p className="text-xs text-slate-400">{notice.platform} · {notice.issuedDate}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {notice.isDisputed && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">
              有争议
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-3">
          <div>
            <h5 className="text-xs font-medium text-slate-400 mb-1">下架原因</h5>
            <p className="text-xs text-slate-300 leading-relaxed">{notice.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <h5 className="text-xs font-medium text-slate-400 mb-0.5">影响内容</h5>
              <p className="text-xs text-slate-300">{notice.affectedContent}</p>
            </div>
            <div>
              <h5 className="text-xs font-medium text-slate-400 mb-0.5">投诉方</h5>
              <p className="text-xs text-slate-300">{notice.complainant}</p>
            </div>
          </div>

          {notice.isDisputed && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
              <p className="text-xs text-amber-300 flex items-center gap-1.5">
                <AlertOctagon size={12} />
                此下架单存在争议，需进一步核实
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
