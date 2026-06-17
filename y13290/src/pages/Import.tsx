import { useEffect, useState } from "react";
import { Wand2, Database, Upload, FileText, Inbox } from "lucide-react";
import { useStore, getEntryAnomalies } from "@/store";
import type { EntryInput } from "@/types";
import AnomalyTags from "@/components/AnomalyTag";

const SAMPLE_HINT = "名称,纬度,经度,意见,来源";

function parseText(text: string): { entries: EntryInput[]; skipped: number } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: EntryInput[] = [];
  let skipped = 0;
  for (const line of lines) {
    if (line.startsWith("名称,") || line === SAMPLE_HINT) {
      skipped++;
      continue;
    }
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) {
      skipped++;
      continue;
    }
    const [name, latStr, lngStr, opinion, source] = parts;
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
      skipped++;
      continue;
    }
    entries.push({ name, latitude: lat, longitude: lng, opinion, source });
  }
  return { entries, skipped };
}

export default function ImportPage() {
  const fetchEntries = useStore((s) => s.fetchEntries);
  const createEntries = useStore((s) => s.createEntries);
  const seedData = useStore((s) => s.seedData);
  const showToast = useStore((s) => s.showToast);
  const dbCount = useStore((s) => s.entries.length);

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<EntryInput[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleParse = () => {
    const { entries, skipped } = parseText(text);
    setParsed(entries);
    setSkipped(skipped);
    if (entries.length === 0) showToast("未解析到有效条目");
    else showToast(`已解析 ${entries.length} 条`);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedData();
      showToast("已载入示例数据");
    } catch {
      showToast("载入失败");
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async () => {
    if (parsed.length === 0) return;
    setSubmitting(true);
    try {
      const created = await createEntries(parsed);
      showToast(`已提交 ${created.length} 条`);
      setParsed([]);
      setSkipped(0);
      setText("");
    } catch {
      showToast("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const flags = getEntryAnomalies(parsed);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-3">
        <div className="text-sm text-slate-500">
          当前数据库已录入 <span className="font-semibold text-slate-800">{dbCount}</span> 条点位记录
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Database size={15} />
          {seeding ? "载入中…" : "载入示例数据"}
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <FileText size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">纪要录入区</h2>
          <span className="ml-auto text-xs text-slate-400">每行格式：{SAMPLE_HINT}</span>
        </div>
        <div className="p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={`慢行桥北坡道,31.2304,121.4737,坡度偏陡建议放缓,2026年3月社区协调会纪要\n慢行天桥北坡道,31.2305,121.4738,防滑条脱落,2026年3月社区协调会纪要`}
            className="w-full resize-y rounded-md border border-slate-200 p-3 font-mono text-sm text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleParse}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Wand2 size={15} />
              解析预览
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || parsed.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={15} />
              {submitting ? "提交中…" : "提交条目"}
            </button>
            {skipped > 0 && (
              <span className="text-xs text-amber-600">已跳过 {skipped} 行无效数据</span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">条目预览表</h2>
          <span className="ml-auto text-xs text-slate-400">共 {parsed.length} 条</span>
        </div>
        {parsed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Inbox size={32} className="mb-2 opacity-60" />
            <p className="text-sm">粘贴会议纪要后点击「解析预览」查看条目</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">序号</th>
                  <th className="px-3 py-2 font-medium">名称</th>
                  <th className="px-3 py-2 font-medium">坐标</th>
                  <th className="px-3 py-2 font-medium">意见</th>
                  <th className="px-3 py-2 font-medium">来源</th>
                  <th className="px-5 py-2 font-medium">异常标记</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((entry, idx) => (
                  <tr key={idx} className="row-hover border-b border-slate-50 align-top">
                    <td className="px-5 py-2.5 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{entry.name}</td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{entry.opinion}</td>
                    <td className="px-3 py-2.5 text-slate-500">{entry.source}</td>
                    <td className="px-5 py-2.5">
                      <AnomalyTags flags={flags[idx]} />
                      {!flags[idx].nameInconsistent && !flags[idx].coordOffset && (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
