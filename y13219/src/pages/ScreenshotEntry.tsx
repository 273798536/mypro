import { useStore, ScreenshotRecord, IngestResult } from '@/store/useStore'
import { Plus, Link2, Upload, X, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function ScreenshotEntry() {
  const entries = useStore((s) => s.entries)
  const ingestScreenshot = useStore((s) => s.ingestScreenshot)
  const screenshots = useStore((s) => s.screenshots)
  const lastIngestResult = useStore((s) => s.lastIngestResult)
  const setLastIngestResult = useStore((s) => s.setLastIngestResult)

  const [sourceGroup, setSourceGroup] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [rawText, setRawText] = useState('')
  const [authorizationPeriodFromNote, setAuthorizationPeriodFromNote] = useState('')
  const [revenueShareFromNote, setRevenueShareFromNote] = useState('')
  const [relatedSongNames, setRelatedSongNames] = useState<string[]>([])
  const [songSearch, setSongSearch] = useState('')

  const filteredEntries = entries.filter((e) =>
    e.songName.toLowerCase().includes(songSearch.toLowerCase()) ||
    e.aliases.some((a) => a.toLowerCase().includes(songSearch.toLowerCase()))
  )

  const toggleSong = (name: string) => {
    setRelatedSongNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const handleSubmit = () => {
    if (!sourceGroup || !speaker || !rawText) return

    const screenshot: ScreenshotRecord = {
      id: `ss-${Date.now()}`,
      imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wechat%20chat%20screenshot%20Chinese%20rehearsal%20room&image_size=landscape_16_9`,
      sourceGroup,
      speaker,
      relatedSongNames,
      authorizationPeriodFromNote: authorizationPeriodFromNote || null,
      revenueShareFromNote: revenueShareFromNote || null,
      rawText,
      createdAt: new Date().toISOString(),
    }

    ingestScreenshot(screenshot)

    setSourceGroup('')
    setSpeaker('')
    setRawText('')
    setAuthorizationPeriodFromNote('')
    setRevenueShareFromNote('')
    setRelatedSongNames([])
    setSongSearch('')
  }

  const dismissResult = () => setLastIngestResult(null)

  return (
    <div className="min-h-screen bg-parchment">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-inkstone">排练群截图录入</h2>
        <p className="text-sm text-driftwood mt-1">
          录入排练群截图及关联信息，系统自动解析备注、匹配条目、更新对齐状态
        </p>
      </div>

      {lastIngestResult && <ResultBanner result={lastIngestResult} onDismiss={dismissResult} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-sandstone/60 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-inkstone flex items-center gap-1.5">
            <Upload size={14} />
            截图信息
          </h3>

          <div>
            <label className="text-xs text-driftwood block mb-1">来源群名 *</label>
            <input
              type="text"
              value={sourceGroup}
              onChange={(e) => setSourceGroup(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20"
              placeholder="如：琴房排练通知群"
            />
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">发言者 *</label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20"
              placeholder="如：张老师"
            />
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">截图原始文本 *</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={4}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20 resize-none"
              placeholder="复制粘贴排练群截图中的文字内容..."
            />
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">备注中的授权期限</label>
            <input
              type="text"
              value={authorizationPeriodFromNote}
              onChange={(e) => setAuthorizationPeriodFromNote(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber/30"
              placeholder="如：2025-03-01至2026-02-28（从备注中提取）"
            />
            <p className="text-[10px] text-amber/70 mt-0.5">授权期限经常藏在备注里，请仔细提取，重扫后会自动更新条目</p>
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">备注中的分账比例</label>
            <input
              type="text"
              value={revenueShareFromNote}
              onChange={(e) => setRevenueShareFromNote(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20"
              placeholder="如：40% 或 月光30% 春风20%"
            />
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1 flex items-center gap-1">
              <Link2 size={12} />
              关联已有条目
            </label>
            <input
              type="text"
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20"
              placeholder="搜索曲名或别名..."
            />
            {relatedSongNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {relatedSongNames.map((name) => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-moss/10 text-moss rounded text-xs">
                    {name}
                    <button onClick={() => toggleSong(name)}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {songSearch && (
              <div className="mt-2 border border-sandstone/40 rounded max-h-32 overflow-y-auto">
                {filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      toggleSong(entry.songName)
                      setSongSearch('')
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-sandstone/30 transition-colors ${
                      relatedSongNames.includes(entry.songName) ? 'bg-sage/10' : ''
                    }`}
                  >
                    {entry.songName}
                    {entry.aliases.length > 0 && (
                      <span className="text-driftwood text-xs ml-2">
                        ({entry.aliases.join('、')})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!sourceGroup || !speaker || !rawText}
            className="w-full py-2.5 text-sm bg-inkstone text-parchment rounded font-medium hover:bg-moss transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            录入截图并解析
          </button>

          <div className="bg-sandstone/30 border border-sandstone/40 rounded px-3 py-2.5 text-xs text-driftwood leading-relaxed">
            <p className="font-medium text-inkstone mb-1 flex items-center gap-1">
              <Sparkles size={12} className="text-amber" />
              录入后会发生什么
            </p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>自动匹配已有条目或创建新条目</li>
              <li>将截图 ID 写入条目关联列表</li>
              <li>解析备注中的授权期限和分账比例</li>
              <li>回到总览页点「重扫对齐」更新状态</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-sandstone/60 p-5">
            <h3 className="text-sm font-semibold text-inkstone mb-3">已录入截图 ({screenshots.length})</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {screenshots.slice().reverse().map((ss) => (
                <div key={ss.id} className="bg-parchment/60 rounded-lg p-3 border border-sandstone/30">
                  <div className="flex items-center justify-between text-xs text-driftwood mb-1.5">
                    <span className="font-medium text-inkstone">{ss.sourceGroup}</span>
                    <span>{new Date(ss.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-driftwood mb-2">
                    <span>{ss.speaker}</span>
                    <span>·</span>
                    <span>关联：{ss.relatedSongNames.join('、') || '无'}</span>
                  </div>
                  <div className="bg-white rounded p-2 text-xs text-inkstone/70 border border-sandstone/30">
                    "{ss.rawText}"
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {ss.authorizationPeriodFromNote && (
                      <span className="text-amber flex items-center gap-1">
                        <span className="font-medium">备注期限：</span>
                        {ss.authorizationPeriodFromNote}
                      </span>
                    )}
                    {ss.revenueShareFromNote && (
                      <span className="text-moss flex items-center gap-1">
                        <span className="font-medium">备注分账：</span>
                        {ss.revenueShareFromNote}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber/5 border border-amber/15 rounded-lg p-4">
            <h4 className="text-xs font-medium text-amber mb-2">截图溯源说明</h4>
            <p className="text-xs text-driftwood leading-relaxed">
              每张截图录入后，系统会自动关联到对应条目。在总览页点击条目卡片中的别名标签，可追溯到排练群截图中的原始说法——不是含糊警告，而是展示完整的截图来源、发言者和原始措辞。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultBanner({ result, onDismiss }: { result: IngestResult; onDismiss: () => void }) {
  const hasWarning = result.warnings.length > 0
  const hasMatch = result.matchedEntries.length > 0
  const hasNew = result.newEntryIds.length > 0

  return (
    <div className={`mb-5 rounded-lg border p-4 ${
      hasWarning && !hasMatch
        ? 'bg-ochre/8 border-ochre/20'
        : hasNew
          ? 'bg-amber/8 border-amber/25'
          : 'bg-sage/8 border-sage/25'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {hasWarning && !hasMatch ? (
            <AlertTriangle size={16} className="text-ochre shrink-0 mt-0.5" />
          ) : hasNew ? (
            <Sparkles size={16} className="text-amber shrink-0 mt-0.5" />
          ) : (
            <CheckCircle size={16} className="text-sage shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              hasWarning && !hasMatch ? 'text-ochre' : hasNew ? 'text-amber' : 'text-moss'
            }`}>
              截图录入完成
            </p>
            <div className="mt-1.5 space-y-1 text-xs">
              {hasMatch && (
                <p className="text-driftwood">
                  匹配到现有条目：{result.matchedEntries.map(n => `「${n}」`).join('、')}
                </p>
              )}
              {hasNew && (
                <p className="text-amber">
                  新建 {result.newEntryIds.length} 条条目（已关联截图）
                </p>
              )}
              {result.warnings.length > 0 && (
                <ul className="space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-ochre/80">· {w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-driftwood/60 hover:text-driftwood transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
