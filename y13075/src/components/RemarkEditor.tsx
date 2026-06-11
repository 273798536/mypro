import { useEffect, useRef, useState } from 'react';
import { Check, Edit3, Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => Promise<any> | any;
  placeholder?: string;
  minRows?: number;
  readOnly?: boolean;
}

export default function RemarkEditor({
  value,
  onChange,
  placeholder = '请填写复核备注（如：已与现场运维核对，确认为传感器漂移；建议…）',
  minRows = 4,
  readOnly = false,
}: Props) {
  const [text, setText] = useState(value ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setText(next);
    setStatus('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setStatus('saving');
        await onChange(next);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 1200);
      } catch (err: any) {
        setStatus('idle');
        alert('保存失败：' + (err?.message ?? '未知错误'));
      }
    }, 500);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <Edit3 className="w-3.5 h-3.5 text-brand-500" />
        <span className="label mb-0">复核备注</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-brand-500">
          {status === 'saving' ? (
            <><Loader2 className="w-3 h-3 animate-spin" />保存中…</>
          ) : status === 'saved' ? (
            <span className="text-status-normal font-medium"><Check className="w-3 h-3 inline mr-0.5" />已同步到导出</span>
          ) : (
            <span>修改后 0.5s 自动保存</span>
          )}
        </span>
      </div>
      <textarea
        className="input font-sans leading-relaxed resize-y"
        rows={minRows}
        value={text}
        placeholder={placeholder}
        onChange={e => handleChange(e.target.value)}
        readOnly={readOnly}
      />
    </div>
  );
}
