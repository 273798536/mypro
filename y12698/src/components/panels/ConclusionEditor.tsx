import { useState, useMemo } from 'react';
import { FileEdit, Link2, Save } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useReviewStore } from '../../store/reviewStore';
import { useSceneStore } from '../../store/sceneStore';
import type { DataRecord } from '../../types';

interface Props {
  record: DataRecord;
}

const ANCHOR_RE = /\{\{time:([^}]+)\}\}/g;

export default function ConclusionEditor({ record }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(record.conclusion);
  const updateConclusion = useDataStore((s) => s.updateRecordConclusion);
  const setCurrentTime = useReviewStore((s) => s.setCurrentTimeParam);
  const timeParams = useReviewStore((s) => s.timeParams);
  const selectRecord = useSceneStore((s) => s.selectRecord);
  const setSelectedId = useSceneStore((s) => s.setSelectedRecordId);
  const allRecords = useDataStore((s) => s.records);

  const save = () => {
    updateConclusion(record.id, text);
    setEditing(false);
  };

  const insertAnchor = () => {
    const tp = useReviewStore.getState().currentTimeParam;
    setText((prev) => prev + ` {{time:${tp}}}`);
  };

  const rendered = useMemo(() => {
    const parts: (string | JSX.Element)[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    ANCHOR_RE.lastIndex = 0;
    while ((m = ANCHOR_RE.exec(record.conclusion)) !== null) {
      if (m.index > last) parts.push(record.conclusion.slice(last, m.index));
      const tp = m[1];
      const linkedRec = allRecords.find((r) => r.timeParam === tp);
      parts.push(
        <button
          key={m.index}
          onClick={() => {
            setCurrentTime(tp);
            if (linkedRec) {
              selectRecord(linkedRec);
            }
          }}
          className="mx-0.5 rounded border border-[#00D4AA]/40 bg-[#00D4AA]/10 px-1 font-mono text-[11px] text-[#00D4AA] transition-all hover:bg-[#00D4AA]/20"
          title={`点击跳转至 ${tp.slice(5, 16)}`}
        >
          ⏱ {tp.slice(5, 16)}
        </button>
      );
      last = m.index + m[0].length;
    }
    if (last < record.conclusion.length) parts.push(record.conclusion.slice(last));
    return parts;
  }, [record.conclusion, allRecords, setCurrentTime, selectRecord]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileEdit size={12} className="text-slate-500" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400">结论备注（含可回溯时间锚点）</span>
        <div className="ml-auto flex gap-1">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-[10px] text-slate-400 transition-all hover:border-slate-600 hover:text-slate-200"
            >
              编辑
            </button>
          ) : (
            <>
              <button
                onClick={insertAnchor}
                className="flex items-center gap-1 rounded border border-[#00D4AA]/40 bg-[#00D4AA]/10 px-2 py-0.5 text-[10px] text-[#00D4AA] transition-all hover:bg-[#00D4AA]/20"
                title="在光标位置插入当前时间锚点"
              >
                <Link2 size={10} /> 插入锚点
              </button>
              <button
                onClick={save}
                className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 transition-all hover:bg-emerald-500/20"
              >
                <Save size={10} /> 保存
              </button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-28 w-full resize-none rounded border border-slate-700 bg-slate-900/80 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300 outline-none transition-all focus:border-[#00D4AA]/50 focus:shadow-[0_0_0_1px_#00D4AA]/30"
          placeholder="输入结论，使用 {{time:2024-03-15T10:00}} 格式插入可点击时间锚点..."
        />
      ) : (
        <div className="min-h-[84px] rounded border border-slate-700 bg-slate-900/60 p-2.5 text-[11px] leading-relaxed text-slate-300">
          {rendered}
        </div>
      )}
    </div>
  );
}
