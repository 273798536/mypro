import type { Material, LightObject, PendingConfirm } from "../data/types";

export function detectCaliberChanges(materials: Material[]): Material[] {
  const objectMaterials = new Map<string, Material[]>();
  for (const mat of materials) {
    const list = objectMaterials.get(mat.relatedObjectId) || [];
    list.push(mat);
    objectMaterials.set(mat.relatedObjectId, list);
  }

  const result = materials.map((mat) => {
    const group = objectMaterials.get(mat.relatedObjectId) || [];
    const hasRetraction = group.some((m) => m.hasRetraction);
    const hasModification = mat.modifiedAt > mat.importedAt;
    const caliberChanged = hasRetraction || hasModification;
    return { ...mat, caliberChanged };
  });

  return result;
}
