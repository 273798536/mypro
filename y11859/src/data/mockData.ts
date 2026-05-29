import type { Building, NoiseSource, TimeRange } from "@/types";

export const MOCK_BUILDINGS: Building[] = [
  {
    id: "b-a",
    name: "A栋·翠园小区",
    position: [-20, 0, -15],
    floors: 20,
    floorHeight: 3,
    width: 12,
    depth: 10,
  },
  {
    id: "b-b",
    name: "B栋·翠园小区",
    position: [-20, 0, 5],
    floors: 18,
    floorHeight: 3,
    width: 12,
    depth: 10,
  },
  {
    id: "b-c",
    name: "C栋·和景花苑",
    position: [10, 0, -15],
    floors: 25,
    floorHeight: 3,
    width: 14,
    depth: 10,
  },
  {
    id: "b-d",
    name: "D栋·和景花苑",
    position: [10, 0, 5],
    floors: 22,
    floorHeight: 3,
    width: 14,
    depth: 10,
  },
  {
    id: "b-e",
    name: "E栋·悦府",
    position: [35, 0, -5],
    floors: 15,
    floorHeight: 3,
    width: 16,
    depth: 12,
  },
];

const FULL_DAY: TimeRange[] = [
  { startHour: 0, endHour: 6, level: 58 },
  { startHour: 6, endHour: 8, level: 65 },
  { startHour: 8, endHour: 12, level: 72 },
  { startHour: 12, endHour: 14, level: 68 },
  { startHour: 14, endHour: 18, level: 74 },
  { startHour: 18, endHour: 22, level: 70 },
  { startHour: 22, endHour: 24, level: 60 },
];

const FULL_DAY_MINOR: TimeRange[] = [
  { startHour: 0, endHour: 6, level: 50 },
  { startHour: 6, endHour: 8, level: 55 },
  { startHour: 8, endHour: 12, level: 60 },
  { startHour: 12, endHour: 14, level: 57 },
  { startHour: 14, endHour: 18, level: 62 },
  { startHour: 18, endHour: 22, level: 58 },
  { startHour: 22, endHour: 24, level: 48 },
];

export const MOCK_NOISE_SOURCES: NoiseSource[] = [
  {
    id: "s-road-1",
    type: "road",
    name: "城东主干道",
    position: [-5, 0.5, -35],
    baseLevel: 74,
    timeRanges: FULL_DAY,
    importedAt: Date.now() - 3600000,
  },
  {
    id: "s-road-2",
    type: "road",
    name: "翠园支路",
    position: [-40, 0.5, -5],
    baseLevel: 62,
    timeRanges: FULL_DAY_MINOR,
    importedAt: Date.now() - 3600000,
  },
  {
    id: "s-const-1",
    type: "construction",
    name: "地铁3号线工地",
    position: [5, 0.5, 25],
    baseLevel: 78,
    timeRanges: [
      { startHour: 8, endHour: 12, level: 78 },
      { startHour: 12, endHour: 14, level: 65 },
      { startHour: 14, endHour: 20, level: 80 },
    ],
    importedAt: Date.now() - 1800000,
  },
  {
    id: "s-comm-1",
    type: "commercial",
    name: "万达商业街",
    position: [40, 0.5, 20],
    baseLevel: 68,
    timeRanges: [
      { startHour: 10, endHour: 14, level: 65 },
      { startHour: 14, endHour: 18, level: 68 },
      { startHour: 18, endHour: 22, level: 72 },
    ],
    importedAt: Date.now() - 1800000,
  },
];

export const INITIAL_IMPORTED_AT = Date.now() - 3600000;
