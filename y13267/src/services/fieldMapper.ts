import { GUARANTEED_FIELD_MAPPING, ComplaintSource, ComplaintStatus } from "@/types";

export function normalizeFieldKey(rawKey: string): string {
  return rawKey.trim().toLowerCase().replace(/[\s_\-\/]/g, "");
}

export function mapGuaranteedFields(
  rawData: Record<string, any>
): { source: ComplaintSource; status: ComplaintStatus; rawFields: Record<string, string> } {
  let source: ComplaintSource = "其他";
  let status: ComplaintStatus = "pending";
  const rawFields: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = normalizeFieldKey(key);
    let matched = false;

    for (const [targetKey, candidates] of Object.entries(GUARANTEED_FIELD_MAPPING)) {
      if (candidates.some((c) => normalizeFieldKey(c) === normalizedKey)) {
        if (targetKey === "source") {
          source = mapSourceValue(String(value ?? ""));
        } else if (targetKey === "status") {
          status = mapStatusValue(String(value ?? ""));
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      rawFields[key] = String(value ?? "");
    }
  }

  return { source, status, rawFields };
}

function mapSourceValue(val: string): ComplaintSource {
  const v = val.trim();
  const map: Record<string, ComplaintSource> = {
    "12345": "12345热线",
    "12345热线": "12345热线",
    热线: "12345热线",
    社区: "社区信箱",
    社区信箱: "社区信箱",
    信箱: "社区信箱",
    网格员: "网格员上报",
    网格员上报: "网格员上报",
    网格: "网格员上报",
    媒体: "媒体曝光",
    媒体曝光: "媒体曝光",
  };
  for (const [k, v2] of Object.entries(map)) {
    if (v.includes(k)) return v2;
  }
  return "其他";
}

function mapStatusValue(val: string): ComplaintStatus {
  const v = val.trim();
  if (v.includes("重复") || v.includes("dup") || v.toLowerCase().includes("duplicate")) return "duplicate";
  if (v.includes("结案") || v.includes("完成") || v.includes("closed") || v.includes("done") || v.includes("备案"))
    return "closed";
  if (v.includes("处理中") || v.includes("进行") || v.includes("processing") || v.includes("doing"))
    return "processing";
  return "pending";
}
