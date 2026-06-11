export interface Showcase {
  id: string;
  name: string;
  zone: string;
  type: string;
}

export interface LightObject {
  id: string;
  showcaseId: string;
  name: string;
  intensity: number;
  colorTemp: number;
  position: [number, number, number];
  type: "spot" | "ambient" | "point";
}

export interface Material {
  id: string;
  relatedObjectId: string;
  type: "inspection_photo" | "retraction_record" | "verbal_note";
  title: string;
  content: string;
  importedAt: string;
  modifiedAt: string;
  hasRetraction: boolean;
  caliberChanged: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "import" | "retraction" | "modification" | "confirm" | "note";
  description: string;
  relatedObjectId: string;
  relatedMaterialId: string;
  status: "confirmed" | "pending" | "retracted" | "modified";
  isCaliberChange: boolean;
}

export interface Viewpoint {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  zoom: number;
  selectedObjectId: string | null;
  filterState: FilterState;
  savedAt: string;
  thumbnailUrl: string;
}

export interface FilterState {
  objectType: string | null;
  zone: string | null;
  materialType: string | null;
}

export interface PendingConfirm {
  id: string;
  reason: string;
  impactScope: string[];
  relatedObjectIds: string[];
  createdAt: string;
  resolved: boolean;
}

export const STATUS_LABEL_MAP: Record<string, string> = {
  confirmed: "已确认",
  pending: "待确认",
  retracted: "已撤回",
  modified: "已修改",
};

export const EVENT_TYPE_LABEL_MAP: Record<string, string> = {
  import: "材料导入",
  retraction: "撤回记录",
  modification: "参数修改",
  confirm: "确认操作",
  note: "口头说明",
};

export const MATERIAL_TYPE_LABEL_MAP: Record<string, string> = {
  inspection_photo: "巡检照片",
  retraction_record: "撤回记录",
  verbal_note: "口头说明",
};
