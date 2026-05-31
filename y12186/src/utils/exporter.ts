import type { AnalysisResult, ExportFormat } from "@/types"

export function exportData(results: AnalysisResult[], format: ExportFormat): void {
  let content: string
  let mimeType: string
  let extension: string

  if (format === "json") {
    content = JSON.stringify(results, null, 2)
    mimeType = "application/json"
    extension = "json"
  } else {
    const headers = [
      "结果ID", "学生姓名", "曲目", "练习次数",
      "换气点时间", "换气点时长", "换气点置信度", "换气点来源",
      "静音段开始", "静音段结束", "静音段时长", "是否误判",
      "歌词段", "歌词开始时间", "歌词结束时间", "歌词错位", "长句超限",
    ]

    const rows: string[][] = []
    for (const r of results) {
      const maxLen = Math.max(
        r.breathingPoints.length,
        r.silenceSegments.length,
        r.lyricsAlignments.length
      )
      if (maxLen === 0) {
        rows.push([r.id, r.studentName, r.songTitle, String(r.practiceIndex)])
        continue
      }
      for (let i = 0; i < maxLen; i++) {
        const bp = r.breathingPoints[i]
        const ss = r.silenceSegments[i]
        const la = r.lyricsAlignments[i]
        rows.push([
          r.id, r.studentName, r.songTitle, String(r.practiceIndex),
          bp ? String(bp.timestamp) : "",
          bp ? String(bp.duration.toFixed(3)) : "",
          bp ? String(bp.confidence.toFixed(2)) : "",
          bp ? bp.source : "",
          ss ? String(ss.startTimestamp) : "",
          ss ? String(ss.endTimestamp) : "",
          ss ? String(ss.duration.toFixed(3)) : "",
          ss ? (ss.isMisjudgment ? "是" : "否") : "",
          la ? la.lyricsSegment : "",
          la ? String(la.startTimestamp) : "",
          la ? String(la.endTimestamp) : "",
          la ? (la.isMisaligned ? "是" : "否") : "",
          la ? (la.isOverLong ? "是" : "否") : "",
        ])
      }
    }

    const csvContent = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n")

    content = "\uFEFF" + csvContent
    mimeType = "text/csv;charset=utf-8"
    extension = "csv"
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `声乐换气分析结果.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
