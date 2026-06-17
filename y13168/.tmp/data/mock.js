const equipments = [
  { id: "EQ-001", name: "1\u53F7\u4E3B\u7535\u673A", model: "YX3-250M-4", manufacturer: "\u4E2D\u8FBE\u7535\u901A" },
  { id: "EQ-002", name: "2\u53F7\u8F85\u52A9\u7535\u673A", model: "YX3-200L-4", manufacturer: "ABB\u4E2D\u56FD" }
];
const motorComponents = [
  { id: "CMP-STATOR", equipmentId: "EQ-001", name: "\u5B9A\u5B50", type: "stator", position: [0, 0, 0], scale: [1.2, 1.2, 2.4], color: "#4A6FA5" },
  { id: "CMP-ROTOR", equipmentId: "EQ-001", name: "\u8F6C\u5B50", type: "rotor", position: [0, 0, 0], scale: [0.8, 0.8, 2.2], color: "#7B8D9E" },
  { id: "CMP-BEARING-F", equipmentId: "EQ-001", name: "\u524D\u8F74\u627F", type: "bearing", position: [0, 0, 1.4], scale: [0.9, 0.9, 0.3], color: "#C0C0C0" },
  { id: "CMP-BEARING-R", equipmentId: "EQ-001", name: "\u540E\u8F74\u627F", type: "bearing", position: [0, 0, -1.4], scale: [0.9, 0.9, 0.3], color: "#C0C0C0" },
  { id: "CMP-SHAFT", equipmentId: "EQ-001", name: "\u4E3B\u8F74", type: "shaft", position: [0, 0, 0], scale: [0.3, 0.3, 3], color: "#8B8682" },
  { id: "CMP-HOUSING", equipmentId: "EQ-001", name: "\u673A\u58F3", type: "housing", position: [0, 0, 0], scale: [1.4, 1.4, 2.6], color: "#5C6670" },
  { id: "CMP-WINDING", equipmentId: "EQ-001", name: "\u7ED5\u7EC4", type: "winding", position: [0, 0, 0.4], scale: [1, 1, 0.8], color: "#D4A76A" },
  { id: "CMP-SENSOR", equipmentId: "EQ-001", name: "\u626D\u77E9\u4F20\u611F\u5668", type: "sensor", position: [1, 0, 1.6], scale: [0.2, 0.2, 0.2], color: "#FF6B35" }
];
const nameplateRecords = [
  { id: "NP-001", equipmentId: "EQ-001", fieldName: "\u989D\u5B9A\u626D\u77E9", originalValue: "955", currentValue: "955", unit: "N\xB7m", changed: false },
  { id: "NP-002", equipmentId: "EQ-001", fieldName: "\u989D\u5B9A\u8F6C\u901F", originalValue: "1500", currentValue: "1500", unit: "r/min", changed: false },
  { id: "NP-003", equipmentId: "EQ-001", fieldName: "\u989D\u5B9A\u529F\u7387", originalValue: "150", currentValue: "155", unit: "kW", changed: true },
  { id: "NP-004", equipmentId: "EQ-001", fieldName: "\u989D\u5B9A\u7535\u538B", originalValue: "380", currentValue: "380", unit: "V", changed: false },
  { id: "NP-005", equipmentId: "EQ-001", fieldName: "\u7EDD\u7F18\u7B49\u7EA7", originalValue: "F", currentValue: "H", unit: "", changed: true },
  { id: "NP-006", equipmentId: "EQ-001", fieldName: "\u5B89\u5168\u9608\u503C", originalValue: "5", currentValue: "8", unit: "%", changed: true }
];
const nameplateChanges = [
  { id: "NC-001", recordId: "NP-003", oldValue: "150", newValue: "155", changedAt: "2025-03-12 14:30", changedBy: "\u5F20\u5DE5", source: "\u53E3\u5934\u8BF4\u660E" },
  { id: "NC-002", recordId: "NP-005", oldValue: "F", newValue: "H", changedAt: "2025-03-15 09:15", changedBy: "\u674E\u5DE5", source: "\u94ED\u724C" },
  { id: "NC-003", recordId: "NP-006", oldValue: "5", newValue: "8", changedAt: "2025-03-18 16:45", changedBy: "\u738B\u5DE5", source: "\u53E3\u5934\u8BF4\u660E" }
];
const generateTimePoints = (count, startStr) => {
  const start = new Date(startStr).getTime();
  const interval = 3600 * 1e3;
  return Array.from({ length: count }, (_, i) => new Date(start + i * interval).toISOString());
};
const timePoints = generateTimePoints(72, "2025-03-10T08:00:00");
const torqueRecords = timePoints.flatMap((ts, i) => {
  const baseError = Math.sin(i / 12) * 2 + (i > 40 ? (i - 40) * 0.3 : 0);
  const severity = Math.abs(baseError) > 6 ? "critical" : Math.abs(baseError) > 4 ? "warning" : "normal";
  return motorComponents.map((cmp) => ({
    id: `TR-${i}-${cmp.id}`,
    equipmentId: "EQ-001",
    componentId: cmp.id,
    measuredTorque: 955 + baseError * (cmp.type === "rotor" ? 3 : cmp.type === "bearing" ? 5 : 2) + (Math.random() - 0.5) * 2,
    ratedTorque: 955,
    errorPercent: parseFloat((baseError * (cmp.type === "rotor" ? 1.5 : cmp.type === "bearing" ? 2 : 0.8) + (Math.random() - 0.5) * 0.5).toFixed(2)),
    timestamp: ts,
    severity
  }));
});
const anomalyEvents = [
  { id: "AE-001", componentId: "CMP-ROTOR", type: "\u626D\u77E9\u8D85\u9650", severity: "high", timestamp: "2025-03-12 14:00", description: "\u8F6C\u5B50\u626D\u77E9\u504F\u5DEE\u8FBE7.2%\uFF0C\u8D85\u8FC7\u5B89\u5168\u9608\u503C5%" },
  { id: "AE-002", componentId: "CMP-BEARING-F", type: "\u626D\u77E9\u8D85\u9650", severity: "medium", timestamp: "2025-03-15 10:30", description: "\u524D\u8F74\u627F\u626D\u77E9\u504F\u5DEE4.8%\uFF0C\u63A5\u8FD1\u5B89\u5168\u9608\u503C" },
  { id: "AE-003", componentId: "CMP-SENSOR", type: "\u6570\u636E\u5F02\u5E38", severity: "high", timestamp: "2025-03-18 16:00", description: "\u626D\u77E9\u4F20\u611F\u5668\u8BFB\u6570\u8DF3\u53D8\uFF0C\u7591\u4F3C\u6821\u51C6\u504F\u79FB" },
  { id: "AE-004", componentId: "CMP-ROTOR", type: "\u9608\u503C\u53D8\u66F4", severity: "high", timestamp: "2025-03-18 16:45", description: "\u5B89\u5168\u9608\u503C\u4ECE5%\u8C03\u6574\u4E3A8%\uFF0C\u9700\u590D\u6838\u5F52\u56E0\u7ED3\u8BBA" }
];
const thresholdBreaches = [
  { id: "TB-001", recordId: "TR-50-CMP-ROTOR", parameterName: "\u5B89\u5168\u9608\u503C", oldValue: 5, newValue: 8, changedAt: "2025-03-18 16:45" }
];
const defaultParameterSet = {
  id: "PS-001",
  safetyThreshold: 8,
  calculationCoeff: 1,
  formula: "\u8BEF\u5DEE% = (\u5B9E\u6D4B\u626D\u77E9 - \u989D\u5B9A\u626D\u77E9) / \u989D\u5B9A\u626D\u77E9 \xD7 100%",
  unit: "%"
};
function recalculate(params, componentId, componentName, currentError, previousThreshold) {
  const adjustedError = currentError * params.calculationCoeff;
  const wasBreached = Math.abs(currentError) > previousThreshold;
  const isBreached = Math.abs(adjustedError) > params.safetyThreshold;
  const boundaryValue = params.safetyThreshold;
  const boundarySample = `\u8FB9\u754C\u6837\u672C\uFF1A\u5F53\u8BEF\u5DEE = ${boundaryValue}${params.unit}\u65F6\uFF0C\u6070\u597D\u89E6\u53CA\u9608\u503C\u7EBF\uFF0C\u5B9E\u6D4B\u626D\u77E9 = ${(955 * (1 + boundaryValue / 100)).toFixed(1)} N\xB7m`;
  let explanation = "";
  if (wasBreached && !isBreached) {
    explanation = `\u9608\u503C\u4ECE${previousThreshold}${params.unit}\u8C03\u6574\u4E3A${params.safetyThreshold}${params.unit}\u540E\uFF0C${componentName}\u7684\u8BEF\u5DEE${adjustedError.toFixed(2)}${params.unit}\u4E0D\u518D\u8D8A\u9650\u3002\u6B64\u524D\u89E6\u53D1\u7684\u5F02\u5E38\u544A\u8B66\u53EF\u80FD\u4E0D\u518D\u6210\u7ACB\uFF0C\u5EFA\u8BAE\u590D\u6838\u5F52\u56E0\u7ED3\u8BBA\u3002`;
  } else if (!wasBreached && isBreached) {
    explanation = `\u9608\u503C\u4ECE${previousThreshold}${params.unit}\u8C03\u6574\u4E3A${params.safetyThreshold}${params.unit}\u540E\uFF0C${componentName}\u7684\u8BEF\u5DEE${adjustedError.toFixed(2)}${params.unit}\u53D8\u4E3A\u8D8A\u9650\u3002\u9700\u8981\u5173\u6CE8\u662F\u5426\u9057\u6F0F\u4E86\u5F02\u5E38\u3002`;
  } else {
    explanation = `\u53C2\u6570\u8C03\u6574\u540E\uFF0C${componentName}\u7684\u8BEF\u5DEE\u7531${currentError.toFixed(2)}${params.unit}\u53D8\u4E3A${adjustedError.toFixed(2)}${params.unit}\uFF0C${isBreached ? "\u4ECD\u4E3A\u8D8A\u9650\u72B6\u6001" : "\u4ECD\u5728\u5B89\u5168\u8303\u56F4\u5185"}\u3002\u8BA1\u7B97\u7CFB\u6570${params.calculationCoeff}\u5BF9\u7ED3\u679C\u4EA7\u751F${params.calculationCoeff > 1 ? "\u653E\u5927" : params.calculationCoeff < 1 ? "\u7F29\u5C0F" : "\u65E0"}\u5F71\u54CD\u3002`;
  }
  return {
    id: `RR-${params.id}-${componentId}`,
    parameterSetId: params.id,
    componentId,
    componentName,
    oldValue: currentError,
    newValue: parseFloat(adjustedError.toFixed(2)),
    delta: parseFloat((adjustedError - currentError).toFixed(2)),
    boundarySample,
    explanation
  };
}
function checkConsistency(displayedRecords, csvRecords) {
  const mismatches = [];
  if (displayedRecords.length !== csvRecords.length) {
    mismatches.push(`\u8BB0\u5F55\u6570\u91CF\u4E0D\u4E00\u81F4\uFF1A\u9875\u9762${displayedRecords.length}\u6761 vs CSV ${csvRecords.length}\u6761`);
  }
  for (let i = 0; i < Math.min(displayedRecords.length, csvRecords.length); i++) {
    const d = displayedRecords[i];
    const c = csvRecords[i];
    if (d.severity !== c.severity) {
      mismatches.push(`\u8BB0\u5F55${d.id}\u4E25\u91CD\u7B49\u7EA7\u4E0D\u4E00\u81F4\uFF1A\u9875\u9762${d.severity} vs CSV ${c.severity}`);
    }
    if (Math.abs(d.errorPercent - c.errorPercent) > 0.01) {
      mismatches.push(`\u8BB0\u5F55${d.id}\u8BEF\u5DEE\u503C\u4E0D\u4E00\u81F4\uFF1A\u9875\u9762${d.errorPercent} vs CSV ${c.errorPercent}`);
    }
  }
  return {
    passed: mismatches.length === 0,
    pageStatus: `${displayedRecords.length}\u6761\u8BB0\u5F55`,
    csvStatus: `${csvRecords.length}\u6761\u8BB0\u5F55`,
    mismatches
  };
}
function detectCaliberInconsistency() {
  return [
    {
      field: "\u989D\u5B9A\u529F\u7387",
      issue: "\u94ED\u724C\u8BB0\u5F55150kW vs \u53E3\u5934\u8BF4\u660E155kW\uFF0C\u53E3\u5F84\u4E0D\u4E00\u81F4",
      sources: ["\u94ED\u724C", "\u53E3\u5934\u8BF4\u660E"]
    },
    {
      field: "\u7EDD\u7F18\u7B49\u7EA7",
      issue: "\u539F\u59CB\u8BB0\u5F55F\u7EA7 vs \u5F53\u524D\u94ED\u724CH\u7EA7\uFF0C\u53D8\u66F4\u6765\u6E90\u6807\u6CE8\u4E3A\u94ED\u724C\u672C\u8EAB",
      sources: ["\u94ED\u724C", "\u6B63\u5E38\u8BB0\u5F55"]
    },
    {
      field: "\u5B89\u5168\u9608\u503C",
      issue: "\u539F\u59CB5%\u88AB\u6539\u4E3A8%\uFF0C\u53E3\u5934\u8BF4\u660E\u4E2D\u65E0\u6B64\u53D8\u66F4\u4F9D\u636E",
      sources: ["\u53E3\u5934\u8BF4\u660E", "\u94ED\u724C"]
    }
  ];
}
export {
  anomalyEvents,
  checkConsistency,
  defaultParameterSet,
  detectCaliberInconsistency,
  equipments,
  motorComponents,
  nameplateChanges,
  nameplateRecords,
  recalculate,
  thresholdBreaches,
  torqueRecords
};
