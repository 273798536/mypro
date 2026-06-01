import type {
  VerificationResult,
  CgModificationImpact,
  HullParams,
  InclinationRecord,
  ExportFormat,
} from "@/types";

function toCsvRow(fields: string[]): string {
  return fields.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(",");
}

function anomalyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    load_eccentricity: "载荷偏心",
    density_misuse: "密度错用",
    inclination_exceedance: "倾角越界",
  };
  return map[type] ?? type;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pass: "正常",
    anomaly: "异常",
    uncalculable: "不可计算",
  };
  return map[status] ?? status;
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    input: "手动录入",
    import: "文件导入",
    sample: "样例数据",
    sensor: "传感器",
    manual: "人工记录",
    calculated: "计算值",
  };
  return map[source] ?? source;
}

export function exportNormalResults(
  results: VerificationResult[],
  format: ExportFormat
): string {
  const normal = results.filter((r) => r.status === "pass");

  if (format === "json") {
    return JSON.stringify(
      normal.map((r) => ({
        船体名称: r.hullName,
        校验状态: statusLabel(r.status),
        初稳性高GM_m: r.gm,
        横倾角_deg: r.rollAngle,
        纵倾角_deg: r.pitchAngle,
        纵倾角_trim_deg: r.trimAngle,
        船体参数来源: sourceLabel(r.hullSource),
        倾角记录来源: sourceLabel(r.inclinationSource),
        计算时间: r.calculatedAt,
      })),
      null,
      2
    );
  }

  const header = toCsvRow([
    "船体名称",
    "校验状态",
    "初稳性高GM(m)",
    "横倾角(°)",
    "纵倾角(°)",
    "纵倾角trim(°)",
    "船体参数来源",
    "倾角记录来源",
    "计算时间",
  ]);
  const rows = normal.map((r) =>
    toCsvRow([
      r.hullName,
      statusLabel(r.status),
      String(r.gm ?? ""),
      String(r.rollAngle ?? ""),
      String(r.pitchAngle ?? ""),
      String(r.trimAngle ?? ""),
      sourceLabel(r.hullSource),
      sourceLabel(r.inclinationSource),
      r.calculatedAt,
    ])
  );
  return [header, ...rows].join("\n");
}

export function exportAnomalyResults(
  results: VerificationResult[],
  format: ExportFormat
): string {
  const anomalous = results.filter((r) => r.status !== "pass");

  if (format === "json") {
    return JSON.stringify(
      anomalous.map((r) => ({
        船体名称: r.hullName,
        校验状态: statusLabel(r.status),
        异常详情: r.anomalies.map((a) => ({
          异常类型: anomalyTypeLabel(a.type),
          严重程度: a.severity === "critical" ? "严重" : "警告",
          说明: a.description,
          关联参数: a.relatedParam,
          阈值: a.threshold,
          实际值: a.actual,
        })),
        船体参数来源: sourceLabel(r.hullSource),
        倾角记录来源: sourceLabel(r.inclinationSource),
        计算时间: r.calculatedAt,
      })),
      null,
      2
    );
  }

  const header = toCsvRow([
    "船体名称",
    "校验状态",
    "异常类型",
    "严重程度",
    "说明",
    "关联参数",
    "阈值",
    "实际值",
    "船体参数来源",
    "倾角记录来源",
    "计算时间",
  ]);
  const rows: string[] = [];
  for (const r of anomalous) {
    if (r.anomalies.length === 0) {
      rows.push(
        toCsvRow([
          r.hullName,
          statusLabel(r.status),
          "",
          "",
          "",
          "",
          "",
          "",
          sourceLabel(r.hullSource),
          sourceLabel(r.inclinationSource),
          r.calculatedAt,
        ])
      );
    } else {
      for (const a of r.anomalies) {
        rows.push(
          toCsvRow([
            r.hullName,
            statusLabel(r.status),
            anomalyTypeLabel(a.type),
            a.severity === "critical" ? "严重" : "警告",
            a.description,
            a.relatedParam,
            String(a.threshold),
            String(a.actual),
            sourceLabel(r.hullSource),
            sourceLabel(r.inclinationSource),
            r.calculatedAt,
          ])
        );
      }
    }
  }
  return [header, ...rows].join("\n");
}

export function exportComparison(
  impacts: CgModificationImpact[],
  format: ExportFormat
): string {
  if (format === "json") {
    return JSON.stringify(
      impacts.map((i) => ({
        船体名称: i.hullName,
        原始重心X: i.originalCg.x,
        原始重心Y: i.originalCg.y,
        原始重心Z: i.originalCg.z,
        修改重心X: i.modifiedCg.x,
        修改重心Y: i.modifiedCg.y,
        修改重心Z: i.modifiedCg.z,
        偏移X: i.deltaCg.x,
        偏移Y: i.deltaCg.y,
        偏移Z: i.deltaCg.z,
        原始GM: i.originalGm,
        修改后GM: i.modifiedGm,
        GM变化量: i.deltaGm,
        影响说明: i.impactDescription,
      })),
      null,
      2
    );
  }

  const header = toCsvRow([
    "船体名称",
    "原始重心X",
    "原始重心Y",
    "原始重心Z",
    "修改重心X",
    "修改重心Y",
    "修改重心Z",
    "偏移X",
    "偏移Y",
    "偏移Z",
    "原始GM",
    "修改后GM",
    "GM变化量",
    "影响说明",
  ]);
  const rows = impacts.map((i) =>
    toCsvRow([
      i.hullName,
      String(i.originalCg.x),
      String(i.originalCg.y),
      String(i.originalCg.z),
      String(i.modifiedCg.x),
      String(i.modifiedCg.y),
      String(i.modifiedCg.z),
      String(i.deltaCg.x),
      String(i.deltaCg.y),
      String(i.deltaCg.z),
      String(i.originalGm ?? ""),
      String(i.modifiedGm ?? ""),
      String(i.deltaGm ?? ""),
      i.impactDescription,
    ])
  );
  return [header, ...rows].join("\n");
}

export function exportFullReport(
  results: VerificationResult[],
  impacts: CgModificationImpact[],
  hulls: HullParams[],
  inclinations: InclinationRecord[],
  format: ExportFormat
): string {
  if (format === "json") {
    return JSON.stringify(
      {
        报告标题: "无人船浮态校验报告",
        生成时间: new Date().toISOString(),
        一_船体参数段: hulls.map((h) => ({
          船体名称: h.name,
          船长_m: h.length,
          船宽_m: h.beam,
          型深_m: h.depth,
          吃水_m: h.draft,
          排水量_t: h.displacement,
          重心X: h.cgX,
          重心Y: h.cgY,
          重心Z: h.cgZ,
          重心已修改: h.cgModified,
          介质密度: h.density,
          密度类型: h.densityUnit === "salt" ? "海水" : "淡水",
          航行备注: h.remark,
          数据来源: sourceLabel(h.source),
        })),
        二_倾角记录段: inclinations.map((i) => ({
          船体ID: i.hullId,
          横倾角_deg: i.rollAngle,
          纵倾角_deg: i.pitchAngle,
          测量时间: i.measuredAt,
          数据来源: sourceLabel(i.source),
        })),
        三_校验结论段: results.map((r) => ({
          船体名称: r.hullName,
          校验状态: statusLabel(r.status),
          初稳性高GM_m: r.gm,
          异常详情: r.anomalies.map((a) => ({
            类型: anomalyTypeLabel(a.type),
            说明: a.description,
          })),
          船体参数来源: sourceLabel(r.hullSource),
          倾角记录来源: sourceLabel(r.inclinationSource),
        })),
        四_重心修改对比段: impacts.map((i) => ({
          船体名称: i.hullName,
          原始重心: i.originalCg,
          修改重心: i.modifiedCg,
          GM变化量: i.deltaGm,
          影响说明: i.impactDescription,
        })),
      },
      null,
      2
    );
  }

  const sections: string[] = [];
  sections.push("===== 无人船浮态校验报告 =====");
  sections.push(`生成时间: ${new Date().toISOString()}`);
  sections.push("");

  sections.push("===== 一、船体参数段 =====");
  const hullHeader = toCsvRow([
    "船体名称",
    "船长(m)",
    "船宽(m)",
    "型深(m)",
    "吃水(m)",
    "排水量(t)",
    "重心X",
    "重心Y",
    "重心Z",
    "重心已修改",
    "介质密度",
    "密度类型",
    "航行备注",
    "数据来源",
  ]);
  sections.push(hullHeader);
  for (const h of hulls) {
    sections.push(
      toCsvRow([
        h.name,
        String(h.length),
        String(h.beam),
        String(h.depth),
        String(h.draft),
        String(h.displacement),
        String(h.cgX),
        String(h.cgY),
        String(h.cgZ),
        h.cgModified ? "是" : "否",
        String(h.density),
        h.densityUnit === "salt" ? "海水" : "淡水",
        h.remark,
        sourceLabel(h.source),
      ])
    );
  }
  sections.push("");

  sections.push("===== 二、倾角记录段 =====");
  const incHeader = toCsvRow([
    "船体ID",
    "横倾角(°)",
    "纵倾角(°)",
    "测量时间",
    "数据来源",
  ]);
  sections.push(incHeader);
  for (const i of inclinations) {
    sections.push(
      toCsvRow([
        i.hullId,
        String(i.rollAngle),
        String(i.pitchAngle),
        i.measuredAt,
        sourceLabel(i.source),
      ])
    );
  }
  sections.push("");

  sections.push("===== 三、校验结论段 =====");
  sections.push(exportNormalResults(results, "csv"));
  sections.push("");
  sections.push(exportAnomalyResults(results, "csv"));
  sections.push("");

  if (impacts.length > 0) {
    sections.push("===== 四、重心修改对比段 =====");
    sections.push(exportComparison(impacts, "csv"));
  }

  return sections.join("\n");
}

export function downloadFile(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { sourceLabel, statusLabel, anomalyTypeLabel };
