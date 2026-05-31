import { useState } from 'react';
import { Settings, Save, FolderOpen, Trash2 } from 'lucide-react';
import useAppStore from '@/store/useAppStore';

export default function ParameterPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const parameters = useAppStore((state) => state.parameters);
  const updateParameters = useAppStore((state) => state.updateParameters);
  const saveSession = useAppStore((state) => state.saveSession);
  const loadSession = useAppStore((state) => state.loadSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const sessions = useAppStore((state) => state.sessions);

  const handleSaveSession = () => {
    if (sessionName.trim()) {
      const result = saveSession(sessionName.trim());
      if (result) {
        setSessionName('');
        setShowSessionModal(false);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-20 p-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/50 hover:bg-slate-800/90 transition-colors"
        title="参数设置"
      >
        <Settings className="w-5 h-5 text-slate-300" />
      </button>

      {isOpen && (
        <div className="absolute top-16 right-4 z-20 w-72 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-white">参数控制</h3>
          </div>

          <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">赔付率阈值</h4>
              <div className="space-y-2">
                {['低风险', '中低风险', '中风险', '中高风险'].map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-16">{label}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={parameters.lossRatioThresholds[i]}
                      onChange={(e) => {
                        const newThresholds = [...parameters.lossRatioThresholds] as [
                          number,
                          number,
                          number,
                          number
                        ];
                        newThresholds[i] = Number(e.target.value);
                        updateParameters({ lossRatioThresholds: newThresholds });
                      }}
                      className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:bg-blue-500
                        [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <span className="text-xs text-slate-300 font-mono w-10">
                      {(parameters.lossRatioThresholds[i] * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">楼块高度缩放</h4>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={parameters.heightScale}
                  onChange={(e) => updateParameters({ heightScale: Number(e.target.value) })}
                  className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:bg-emerald-500
                    [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-xs text-slate-300 font-mono w-10">
                  {parameters.heightScale.toFixed(1)}x
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-300">历史会话</h4>
              <button
                onClick={() => setShowSessionModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                保存当前分析
              </button>

              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">暂无保存的会话</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 truncate">{session.name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(session.timestamp).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadSession(session.id)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          title="加载"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">保存分析会话</h3>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="输入会话名称..."
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSessionModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSession}
                disabled={!sessionName.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
