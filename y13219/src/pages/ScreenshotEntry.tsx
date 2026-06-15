import { useStore, ScreenshotRecord } from '@/store/useStore'
import { Plus, Link2, Upload, X } from 'lucide-react'
import { useState } from 'react'

export default function ScreenshotEntry() {
  const entries = useStore((s) => s.entries)
  const addScreenshot = useStore((s) => s.addScreenshot)
  const screenshots = useStore((s) => s.screenshots)

  const [sourceGroup, setSourceGroup] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [rawText, setRawText] = useState('')
  const [authorizationPeriodFromNote, setAuthorizationPeriodFromNote] = useState('')
  const [revenueShareFromNote, setRevenueShareFromNote] = useState('')
  const [relatedSongNames, setRelatedSongNames] = useState<string[]>([])
  const [songSearch, setSongSearch] = useState('')
  const [success, setSuccess] = useState(false)

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

    addScreenshot(screenshot)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)

    setSourceGroup('')
    setSpeaker('')
    setRawText('')
    setAuthorizationPeriodFromNote('')
    setRevenueShareFromNote('')
    setRelatedSongNames([])
    setSongSearch('')
  }

  return (
    <div className="min-h-screen bg-parchment">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-inkstone">排练群截图录入</h2>
        <p className="text-sm text-driftwood mt-1">
          录入排练群截图及关联信息，支持从截图追溯到具体条目
        </p>
      </div>

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
            <p className="text-[10px] text-amber/70 mt-0.5">授权期限经常藏在备注里，请仔细提取</p>
          </div>

          <div>
            <label className="text-xs text-driftwood block mb-1">备注中的分账比例</label>
            <input
              type="text"
              value={revenueShareFromNote}
              onChange={(e) => setRevenueShareFromNote(e.target.value)}
              className="w-full text-sm border border-sandstone/60 rounded px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-inkstone/20"
              placeholder="如：40%"
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
            录入截图
          </button>

          {success && (
            <div className="bg-sage/10 border border-sage/20 rounded px-3 py-2 text-sm text-moss">
              截图录入成功！录入后可回到总览页点击"重扫对齐"生成新版本快照。
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-sandstone/60 p-5">
            <h3 className="text-sm font-semibold text-inkstone mb-3">已录入截图 ({screenshots.length})</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {screenshots.map((ss) => (
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
                  {ss.authorizationPeriodFromNote && (
                    <div className="mt-1.5 text-xs text-amber flex items-center gap-1">
                      <span className="font-medium">备注期限：</span>
                      {ss.authorizationPeriodFromNote}
                    </div>
                  )}
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
