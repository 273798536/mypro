import { useEffect, useState, useMemo } from "react";
import { Search as SearchIcon, Filter, X } from "lucide-react";
import { useStore, SearchHit } from "@/store";

function HighlightedSnippet({ snippet, keyword }: { snippet: string; keyword: string }) {
  if (!keyword) return <span>{snippet}</span>;

  const parts: (string | JSX.Element)[] = [];
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const segments = snippet.split(regex);

  segments.forEach((seg, i) => {
    if (regex.test(seg)) {
      parts.push(
        <mark key={i} className="bg-gutong/20 text-mohei px-0.5 rounded-sm">
          {seg}
        </mark>
      );
    } else {
      parts.push(<span key={i}>{seg}</span>);
    }
  });

  return <>{parts}</>;
}

export default function Search() {
  const { materials, searchResults, searchLoading, runSearch } = useStore();
  const [keyword, setKeyword] = useState("");
  const [filterVersion, setFilterVersion] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<{ version?: string; type?: string }>({});

  useEffect(() => {
    if (keyword.trim()) {
      runSearch(keyword, activeFilters);
    }
  }, [activeFilters]);

  const versions = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => set.add(m.version));
    return Array.from(set).sort();
  }, [materials]);

  const types = [
    { value: "score", label: "琴谱" },
    { value: "annotation", label: "注疏" },
    { value: "note", label: "笔记" },
  ];

  const groupedResults = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    searchResults.forEach((hit) => {
      const list = map.get(hit.version) || [];
      list.push(hit);
      map.set(hit.version, list);
    });
    return map;
  }, [searchResults]);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    const filters: { version?: string; type?: string } = {};
    if (filterVersion) filters.version = filterVersion;
    if (filterType) filters.type = filterType;
    setActiveFilters(filters);
    runSearch(keyword, filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const removeFilter = (key: "version" | "type") => {
    const next = { ...activeFilters };
    delete next[key];
    setActiveFilters(next);
    if (key === "version") setFilterVersion("");
    if (key === "type") setFilterType("");
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-mohei">片段检索</h2>
        <p className="text-sm text-gray-500 font-serif mt-1">
          在材料中检索指法片段
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-white shadow-warm transition-all duration-200"
              placeholder="输入检索关键词..."
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!keyword.trim() || searchLoading}
            className="flex items-center gap-2 px-5 py-3 rounded-md bg-gutong text-white hover:bg-gutong/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-serif text-sm"
          >
            <SearchIcon size={16} />
            检索
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterVersion}
            onChange={(e) => setFilterVersion(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gutong/20 text-xs font-serif focus:outline-none focus:border-gutong bg-white transition-all duration-200"
          >
            <option value="">全部版本</option>
            {versions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gutong/20 text-xs font-serif focus:outline-none focus:border-gutong bg-white transition-all duration-200"
          >
            <option value="">全部类型</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {activeFilters.version && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-dianlan/10 text-dianlan font-serif">
              版本: {activeFilters.version}
              <button onClick={() => removeFilter("version")}>
                <X size={10} />
              </button>
            </span>
          )}
          {activeFilters.type && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gutong/10 text-gutong font-serif">
              类型: {types.find((t) => t.value === activeFilters.type)?.label}
              <button onClick={() => removeFilter("type")}>
                <X size={10} />
              </button>
            </span>
          )}
        </div>
      </div>

      {searchLoading ? (
        <div className="text-center py-12 text-gray-400 font-serif">检索中...</div>
      ) : groupedResults.size === 0 && keyword ? (
        <div className="text-center py-12">
          <SearchIcon size={36} className="mx-auto text-gutong/30 mb-3" />
          <p className="text-gray-400 font-serif">未找到相关结果</p>
        </div>
      ) : groupedResults.size === 0 ? (
        <div className="text-center py-12">
          <SearchIcon size={48} className="mx-auto text-gutong/30 mb-4" />
          <p className="text-gray-400 font-serif">输入关键词开始检索</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedResults.entries()).map(([version, hits]) => (
            <div key={version}>
              <h3 className="font-serif text-sm font-semibold text-dianlan mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-dianlan" />
                版本: {version}
                <span className="text-gray-400 font-normal">({hits.length} 条结果)</span>
              </h3>
              <div className="space-y-2">
                {hits.map((hit) => (
                  <div
                    key={hit.id}
                    className="bg-white rounded-md shadow-warm p-4 hover:shadow-warm-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif font-semibold text-mohei text-sm">
                        {hit.materialTitle}
                      </h4>
                      <span className="text-xs text-gray-400 font-serif">
                        位置: {hit.position}
                      </span>
                    </div>
                    <p className="text-sm text-mohei/80 font-serif leading-relaxed">
                      <HighlightedSnippet snippet={hit.snippet} keyword={keyword} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
