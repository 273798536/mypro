import { BuoyField } from "@/types";

export interface ParsedRemark {
  extractedRemark: string;
  extractedValues: Partial<Record<BuoyField, number>>;
}

export function separateRemarkAndValue(rawText: string): ParsedRemark {
  const result: ParsedRemark = {
    extractedRemark: "",
    extractedValues: {},
  };

  if (!rawText || rawText.trim() === "") {
    return result;
  }

  const patterns: { field: BuoyField; regex: RegExp; labels: string[] }[] = [
    {
      field: "plasticConcentration",
      regex: /(?:塑料浓度|塑料|浓度)\s*[:：]?\s*(\d+(?:\.\d+)?)/i,
      labels: ["塑料浓度", "塑料", "浓度"],
    },
    {
      field: "turbidity",
      regex: /(?:浊度|浑浊度)\s*[:：]?\s*(\d+(?:\.\d+)?)/i,
      labels: ["浊度", "浑浊度"],
    },
    {
      field: "salinity",
      regex: /(?:盐度|含盐量)\s*[:：]?\s*(\d+(?:\.\d+)?)/i,
      labels: ["盐度", "含盐量"],
    },
    {
      field: "temperature",
      regex: /(?:水温|温度)\s*[:：]?\s*(\d+(?:\.\d+)?)/i,
      labels: ["水温", "温度"],
    },
  ];

  let cleanText = rawText;

  for (const { field, regex } of patterns) {
    const match = rawText.match(regex);
    if (match) {
      result.extractedValues[field] = parseFloat(match[1]);
      cleanText = cleanText.replace(match[0], "").trim();
    }
  }

  cleanText = cleanText.replace(/[，,。.\s]+$/g, "").trim();
  result.extractedRemark = cleanText || rawText;

  return result;
}

export function hasMixedContent(rawText: string): boolean {
  if (!rawText) return false;
  const hasChinese = /[\u4e00-\u9fa5]/.test(rawText);
  const hasNumber = /\d/.test(rawText);
  return hasChinese && hasNumber;
}
