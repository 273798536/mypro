import { ScreenshotRecord } from "@/types"
import { useStore } from "@/store/useStore"
import { MessageSquare, Shield, RefreshCw } from "lucide-react"
import { useState } from "react"

export function NotesCard({ record }: { record: ScreenshotRecord }) {
  const updateNotes = useStore((s) => s.updateNotes)
  const rescan = useStore((s) => s.rescan)
  const [rehearsalEditing, setRehearsalEditing] = useState(false)
  const [authEditing, setAuthEditing] = useState(false)
  const [rehearsalVal, setRehearsalVal] = useState(record.rehearsalNote)
  const [authVal, setAuthVal] = useState(record.authorizationNote)

  const saveRehearsal = () => {
    updateNotes(record.id, "rehearsalNote", rehearsalVal)
    setRehearsalEditing(false)
  }

  const saveAuth = () => {
    updateNotes(record.id, "authorizationNote", authVal)
    setAuthEditing(false)
  }

  const startRehearsalEdit = () => {
    setRehearsalVal(record.rehearsalNote)
    setRehearsalEditing(true)
  }

  const startAuthEdit = () => {
    setAuthVal(record.authorizationNote)
    setAuthEditing(true)
  }

  const handleRescan = () => {
    rescan(record.id)
  }

  return (
    <div className="bg-studio-card border border-studio-border rounded-lg p-4 space-y-4">
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-studio-mint" />
              <span className="text-sm font-medium text-studio-text">排练备注</span>
            </div>
            {!rehearsalEditing && (
              <button
                onClick={startRehearsalEdit}
                className="text-xs text-studio-muted hover:text-studio-amber transition-colors"
              >
                {record.rehearsalNote ? "编辑" : "添加"}
              </button>
            )}
          </div>
          {rehearsalEditing ? (
            <div className="space-y-2">
              <textarea
                value={rehearsalVal}
                onChange={(e) => setRehearsalVal(e.target.value)}
                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none resize-none"
                rows={2}
                placeholder="排练进展、学生进步等备注"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRehearsalEditing(false)}
                  className="text-xs text-studio-muted hover:text-studio-text px-2 py-1 rounded"
                >
                  取消
                </button>
                <button
                  onClick={saveRehearsal}
                  className="text-xs bg-studio-amber/20 text-studio-amber border border-studio-amber/40 hover:bg-studio-amber/30 px-2 py-1 rounded"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-studio-text-dim">
              {record.rehearsalNote || "（未添加）"}
            </p>
          )}
        </div>

        <div className="border-t border-studio-border pt-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-studio-amber" />
              <span className="text-sm font-medium text-studio-text">授权备注</span>
            </div>
            {!authEditing && (
              <button
                onClick={startAuthEdit}
                className="text-xs text-studio-muted hover:text-studio-amber transition-colors"
              >
                {record.authorizationNote ? "编辑" : "添加"}
              </button>
            )}
          </div>
          {authEditing ? (
            <div className="space-y-2">
              <textarea
                value={authVal}
                onChange={(e) => setAuthVal(e.target.value)}
                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-sm text-studio-text focus:border-studio-amber outline-none resize-none"
                rows={2}
                placeholder="授权说明、确认信息等"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setAuthEditing(false)}
                  className="text-xs text-studio-muted hover:text-studio-text px-2 py-1 rounded"
                >
                  取消
                </button>
                <button
                  onClick={saveAuth}
                  className="text-xs bg-studio-amber/20 text-studio-amber border border-studio-amber/40 hover:bg-studio-amber/30 px-2 py-1 rounded"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-studio-text-dim">
              {record.authorizationNote || "（未添加）"}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-studio-border pt-3">
        <button
          onClick={handleRescan}
          className="flex items-center gap-2 text-sm text-studio-amber hover:text-studio-amber-dim transition-colors"
        >
          <RefreshCw size={14} />
          重新扫描（结合备注重扫）
        </button>
        <p className="text-xs text-studio-muted/60 mt-1">
          补充备注后重扫，备注不丢失，生成新版本快照
        </p>
      </div>
    </div>
  )
}
