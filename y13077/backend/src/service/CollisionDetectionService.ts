import { CadLayer } from "../entity/CadLayer";
import { Material } from "../entity/Material";
import { Remark } from "../entity/Remark";
import { DetectionResult } from "../types";

export class CollisionDetectionService {
  private standardMaterialNames = new Set([
    "冷通道机柜", "精密空调", "UPS电源", "配电柜", "桥架", 
    "走线架", "防火门", "消防管道", "通风管道", "照明系统"
  ]);

  private standardUnits = new Set(["台", "套", "个", "米", "平方米", "立方米"]);

  private latestVersions = new Map<string, string>([
    ["冷通道布局图", "v3.2"],
    ["设备布置图", "v2.5"],
    ["电气系统图", "v4.1"],
    ["通风系统图", "v1.8"],
    ["消防系统图", "v2.0"]
  ]);

  detectOldCadLayers(layers: CadLayer[]): DetectionResult[] {
    const results: DetectionResult[] = [];

    for (const layer of layers) {
      const latestVersion = this.latestVersions.get(layer.name);
      if (latestVersion && layer.version !== latestVersion) {
        layer.isOldVersion = true;
        layer.issueDescription = `当前版本 ${layer.version}，最新版本 ${latestVersion}`;
        results.push({
          type: "old_cad_layer",
          severity: "high",
          description: `CAD图层「${layer.name}」版本过旧`,
          location: layer.name,
          impactOnConclusion: `旧版图层可能导致设备位置、尺寸信息不准确，影响冷通道布局验证结论`,
          sourceId: layer.id,
          sourceType: "cad_layer"
        });
      }
    }

    return results;
  }

  detectMaterialNameMismatch(materials: Material[]): DetectionResult[] {
    const results: DetectionResult[] = [];

    for (const material of materials) {
      const matchedStandard = this.findClosestMatch(material.name);
      
      if (matchedStandard && matchedStandard !== material.name) {
        material.isNameMismatch = true;
        material.standardName = matchedStandard;
        material.issueDescription = `建议使用标准名称「${matchedStandard}」`;
        results.push({
          type: "material_name_mismatch",
          severity: "medium",
          description: `材料名称不一致：「${material.name}」→ 标准「${matchedStandard}」`,
          location: material.name,
          impactOnConclusion: `名称不一致可能导致材料统计错误，影响工程量核算和成本预估`,
          sourceId: material.id,
          sourceType: "material"
        });
      }
    }

    return results;
  }

  detectUnitMixed(materials: Material[]): DetectionResult[] {
    const results: DetectionResult[] = [];
    const nameToUnits = new Map<string, Set<string>>();

    for (const material of materials) {
      const key = material.standardName || material.name;
      if (!nameToUnits.has(key)) {
        nameToUnits.set(key, new Set());
      }
      nameToUnits.get(key)!.add(material.unit);
    }

    for (const [name, units] of nameToUnits) {
      if (units.size > 1) {
        const affectedMaterials = materials.filter(
          m => (m.standardName || m.name) === name
        );
        
        for (const material of affectedMaterials) {
          material.isUnitMixed = true;
          material.issueDescription = `单位混用：${Array.from(units).join("、")}`;
        }

        results.push({
          type: "unit_mixed",
          severity: "high",
          description: `材料「${name}」单位混用：${Array.from(units).join("、")}`,
          location: name,
          impactOnConclusion: `单位不一致导致数量无法准确汇总，影响工程量计算和碰撞检测精度`,
          sourceId: affectedMaterials[0].id,
          sourceType: "material"
        });
      }
    }

    return results;
  }

  detectFloorUnitMismatch(materials: Material[]): DetectionResult[] {
    const results: DetectionResult[] = [];
    const floorPattern = /^(\d+)(F|层|楼)$/i;
    const floorToFormat = new Map<string, string>();

    for (const material of materials) {
      if (!material.floor) continue;
      
      const match = material.floor.match(floorPattern);
      if (match) {
        const floorNum = match[1];
        const format = match[2].toUpperCase();
        const standardFormat = floorNum + "F";
        
        if (!floorToFormat.has(floorNum)) {
          floorToFormat.set(floorNum, format);
        } else if (floorToFormat.get(floorNum) !== format) {
          material.isUnitMixed = true;
          material.issueDescription = `楼层格式不统一：建议使用「${standardFormat}」`;
          
          const hasExisting = results.some(
            r => r.type === "floor_unit_mismatch" && r.location === floorNum + "层"
          );
          
          if (!hasExisting) {
            results.push({
              type: "floor_unit_mismatch",
              severity: "low",
              description: `楼层 ${floorNum} 层格式不统一：${floorToFormat.get(floorNum)}、${format}`,
              location: floorNum + "层",
              impactOnConclusion: `楼层格式不统一影响材料按楼层统计，但不影响碰撞检测核心结论`,
              sourceId: material.id,
              sourceType: "material"
            });
          }
        }
      }
    }

    return results;
  }

  detectVerbalRemarks(remarks: Remark[]): DetectionResult[] {
    const results: DetectionResult[] = [];

    for (const remark of remarks) {
      if (remark.source === "verbal") {
        results.push({
          type: "verbal_remark",
          severity: "medium",
          description: `存在口头备注：${remark.content.substring(0, 30)}${remark.content.length > 30 ? "..." : ""}`,
          location: "备注",
          impactOnConclusion: `口头备注未形成正式文档，可能导致信息遗漏或误解，建议转化为书面备注`,
          sourceId: remark.id,
          sourceType: "remark"
        });
      }
    }

    return results;
  }

  detectAll(
    layers: CadLayer[],
    materials: Material[],
    remarks: Remark[]
  ): DetectionResult[] {
    return [
      ...this.detectOldCadLayers(layers),
      ...this.detectMaterialNameMismatch(materials),
      ...this.detectUnitMixed(materials),
      ...this.detectFloorUnitMismatch(materials),
      ...this.detectVerbalRemarks(remarks)
    ];
  }

  private findClosestMatch(name: string): string | null {
    if (this.standardMaterialNames.has(name)) return null;

    let bestMatch: string | null = null;
    let highestSimilarity = 0;

    for (const standard of this.standardMaterialNames) {
      const similarity = this.calculateSimilarity(name, standard);
      if (similarity > highestSimilarity && similarity >= 0.6) {
        highestSimilarity = similarity;
        bestMatch = standard;
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    let matches = 0;
    for (const char of s1) {
      if (s2.includes(char)) matches++;
    }

    return matches / Math.max(s1.length, s2.length);
  }

  generateConclusion(detections: DetectionResult[]): {
    overallConclusion: "pass" | "fail" | "pending";
    highCount: number;
    mediumCount: number;
    lowCount: number;
  } {
    const highCount = detections.filter(d => d.severity === "high").length;
    const mediumCount = detections.filter(d => d.severity === "medium").length;
    const lowCount = detections.filter(d => d.severity === "low").length;

    let overallConclusion: "pass" | "fail" | "pending" = "pending";
    if (highCount > 0) {
      overallConclusion = "fail";
    } else if (mediumCount > 2) {
      overallConclusion = "fail";
    } else if (mediumCount === 0 && lowCount <= 1) {
      overallConclusion = "pass";
    }

    return { overallConclusion, highCount, mediumCount, lowCount };
  }
}
