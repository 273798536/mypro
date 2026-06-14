import { useState } from 'react';
import { useStore } from '../store';
import { parseRehearsalText } from '../utils/textParser';
import { DEMO_RAW_TEXT, DEMO_INTRO } from '../data/demo';

export function ImportPanel() {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [lastResult, setLastResult] = useState<{
    success: number;
    failed: number;
    issues: number;
  } | null>(null);

  const handleImport = () => {
    if (!text.trim()) return;
    const result = parseRehearsalText(text, state.items);
    dispatch({ type: 'IMPORT', payload: result });
    setLastResult({
      success: result.success.length,
      failed: result.failed.length,
      issues: result.issues.length,
    });
    setText('');
  };

  const handleLoadDemo = () => {
    setText(DEMO_RAW_TEXT);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">导入排练群文本</h2>
        <button
          onClick={handleLoadDemo}
          className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
        >
          加载演示数据
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'粘贴排练群截图转写的文本，每行一条记录\n支持格式：曲名  艺人  授权日期  备注（字段间用Tab或2+空格分隔）'}
        className="w-full h-40 p-3 text-sm border border-gray-300 rounded font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {text.includes('演示') || DEMO_RAW_TEXT.includes(text.split('\n')[0] ?? '') ? (
        <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded whitespace-pre-line">
          {DEMO_INTRO}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {lastResult && (
            <span>
              上次导入：成功 <b className="text-green-600">{lastResult.success}</b> 条，失败{' '}
              <b className="text-red-600">{lastResult.failed}</b> 条，检出问题{' '}
              <b className="text-amber-600">{lastResult.issues}</b> 个
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setText('')}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            清空
          </button>
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导入并归档
          </button>
        </div>
      </div>
    </div>
  );
}
