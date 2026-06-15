import { ScreenshotRecord, VersionSnapshot } from "@/types"

function v(trigger: VersionSnapshot["trigger"], offset: number): VersionSnapshot {
  const ts = new Date(Date.now() - offset).toISOString()
  return {
    versionId: `v-${Date.now() - offset}`,
    timestamp: ts,
    trigger,
    data: {
      participants: [],
      shares: [],
      introType: "",
    },
    annotationApplied: trigger === "manual_annotation",
    notesIncluded: trigger === "rescan",
  }
}

export function createSeedData(): ScreenshotRecord[] {
  const now = Date.now()
  return [
    {
      id: "seed-001",
      fileName: "排练群_6月10日_片头A分配.png",
      uploadTime: new Date(now - 86400000 * 6).toISOString(),
      status: "recognized",
      recognizedData: {
        participants: ["老许", "小陈", "阿明"],
        shares: [
          { name: "老许", ratio: 0.4 },
          { name: "小陈", ratio: 0.35 },
          { name: "阿明", ratio: 0.25 },
        ],
        introType: "标准片头",
      },
      manualAnnotation: null,
      rehearsalNote: "",
      authorizationNote: "",
      versions: [
        {
          ...v("initial_recognition", 86400000 * 6),
          data: {
            participants: ["老许", "小陈", "阿明"],
            shares: [
              { name: "老许", ratio: 0.4 },
              { name: "小陈", ratio: 0.35 },
              { name: "阿明", ratio: 0.25 },
            ],
            introType: "标准片头",
          },
        },
      ],
      isBoundarySample: false,
    },
    {
      id: "seed-002",
      fileName: "排练群_6月11日_片头B讨论.jpg",
      uploadTime: new Date(now - 86400000 * 5).toISOString(),
      status: "anomaly",
      recognizedData: {
        participants: ["老许", "小陈"],
        shares: [
          { name: "老许", ratio: 0.6 },
          { name: "小陈", ratio: 0.4 },
        ],
        introType: "过渡片头（识别置信度低）",
      },
      manualAnnotation: null,
      rehearsalNote: "",
      authorizationNote: "",
      versions: [
        {
          ...v("initial_recognition", 86400000 * 5),
          data: {
            participants: ["老许", "小陈"],
            shares: [
              { name: "老许", ratio: 0.6 },
              { name: "小陈", ratio: 0.4 },
            ],
            introType: "过渡片头（识别置信度低）",
          },
        },
      ],
      isBoundarySample: false,
    },
    {
      id: "seed-003",
      fileName: "排练群_6月12日_阿明进步反馈.png",
      uploadTime: new Date(now - 86400000 * 4).toISOString(),
      status: "annotated",
      recognizedData: {
        participants: ["老许", "小陈", "阿明"],
        shares: [
          { name: "老许", ratio: 0.35 },
          { name: "小陈", ratio: 0.35 },
          { name: "阿明", ratio: 0.3 },
        ],
        introType: "标准片头",
      },
      manualAnnotation: {
        overrideData: {
          participants: ["老许", "小陈", "阿明"],
          shares: [
            { name: "老许", ratio: 0.3 },
            { name: "小陈", ratio: 0.3 },
            { name: "阿明", ratio: 0.4 },
          ],
          introType: "标准片头",
        },
        reason: "阿明近期排练进步明显，老师反馈应提高其分账比例",
        timestamp: new Date(now - 86400000 * 3).toISOString(),
      },
      rehearsalNote: "阿明连续三周排练准时且质量提升",
      authorizationNote: "",
      versions: [
        {
          ...v("initial_recognition", 86400000 * 4),
          data: {
            participants: ["老许", "小陈", "阿明"],
            shares: [
              { name: "老许", ratio: 0.35 },
              { name: "小陈", ratio: 0.35 },
              { name: "阿明", ratio: 0.3 },
            ],
            introType: "标准片头",
          },
        },
        {
          ...v("manual_annotation", 86400000 * 3),
          data: {
            participants: ["老许", "小陈", "阿明"],
            shares: [
              { name: "老许", ratio: 0.3 },
              { name: "小陈", ratio: 0.3 },
              { name: "阿明", ratio: 0.4 },
            ],
            introType: "标准片头",
          },
          annotationApplied: true,
          notesIncluded: false,
        },
      ],
      isBoundarySample: false,
    },
    {
      id: "seed-004",
      fileName: "排练群_6月13日_片头C截图模糊.jpg",
      uploadTime: new Date(now - 86400000 * 3).toISOString(),
      status: "anomaly",
      recognizedData: null,
      manualAnnotation: null,
      rehearsalNote: "",
      authorizationNote: "",
      versions: [],
      isBoundarySample: true,
    },
    {
      id: "seed-005",
      fileName: "排练群_6月14日_补充授权说明.png",
      uploadTime: new Date(now - 86400000 * 2).toISOString(),
      status: "recognized",
      recognizedData: {
        participants: ["老许", "阿明"],
        shares: [
          { name: "老许", ratio: 0.5 },
          { name: "阿明", ratio: 0.5 },
        ],
        introType: "联合片头",
      },
      manualAnnotation: null,
      rehearsalNote: "此片头为老许和阿明联合创作",
      authorizationNote: "双方已口头确认五五分账",
      versions: [
        {
          ...v("initial_recognition", 86400000 * 2),
          data: {
            participants: ["老许", "阿明"],
            shares: [
              { name: "老许", ratio: 0.5 },
              { name: "阿明", ratio: 0.5 },
            ],
            introType: "联合片头",
          },
          notesIncluded: true,
        },
      ],
      isBoundarySample: false,
    },
  ]
}
