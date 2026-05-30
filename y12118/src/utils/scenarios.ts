import type { Channel, Material, ScenarioPreset } from "./types";

export function getScenarioData(
  preset: ScenarioPreset
): { channels: Channel[]; materials: Material[]; totalBudget: number; label: string } {
  switch (preset) {
    case "smooth":
      return {
        label: "顺利场景",
        totalBudget: 8000,
        channels: [
          {
            id: "ch1",
            name: "抖音-信息流",
            dailyCap: 5000,
            cpaBid: 80,
            conversionRate: 0.04,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.002,
          },
          {
            id: "ch2",
            name: "微信-朋友圈",
            dailyCap: 3000,
            cpaBid: 120,
            conversionRate: 0.03,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.0015,
          },
          {
            id: "ch3",
            name: "百度-搜索",
            dailyCap: 2000,
            cpaBid: 60,
            conversionRate: 0.05,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.0025,
          },
        ],
        materials: [
          { id: "m1", name: "视频-A1", channelId: "ch1", tags: ["大促", "短视频"] },
          { id: "m2", name: "图片-B1", channelId: "ch2", tags: ["品牌", "静态图"] },
          { id: "m3", name: "图文-C1", channelId: "ch3", tags: ["大促", "图文"] },
        ],
      };

    case "budget_exhausted":
      return {
        label: "预算耗尽场景",
        totalBudget: 3000,
        channels: [
          {
            id: "ch1",
            name: "抖音-信息流",
            dailyCap: 5000,
            cpaBid: 80,
            conversionRate: 0.04,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.002,
          },
          {
            id: "ch2",
            name: "微信-朋友圈",
            dailyCap: 3000,
            cpaBid: 120,
            conversionRate: 0.03,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.0015,
          },
          {
            id: "ch3",
            name: "百度-搜索",
            dailyCap: 2000,
            cpaBid: 60,
            conversionRate: 0.05,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.0025,
          },
        ],
        materials: [
          { id: "m1", name: "视频-A1", channelId: "ch1", tags: ["大促", "短视频"] },
          { id: "m2", name: "图片-B1", channelId: "ch2", tags: ["品牌", "静态图"] },
          { id: "m3", name: "图文-C1", channelId: "ch3", tags: ["大促", "图文"] },
        ],
      };

    case "conversion_delay":
      return {
        label: "转化延迟场景",
        totalBudget: 6000,
        channels: [
          {
            id: "ch1",
            name: "抖音-信息流",
            dailyCap: 5000,
            cpaBid: 80,
            conversionRate: 0.04,
            conversionDelayDays: 3,
            efficiencyAlpha: 0.002,
          },
          {
            id: "ch2",
            name: "微信-朋友圈",
            dailyCap: 3000,
            cpaBid: 120,
            conversionRate: 0.03,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.0015,
          },
        ],
        materials: [
          { id: "m1", name: "视频-A1", channelId: "ch1", tags: ["大促", "短视频"] },
          { id: "m2", name: "图片-B1", channelId: "ch2", tags: ["品牌", "静态图"] },
        ],
      };

    case "material_duplicate":
      return {
        label: "素材重复场景",
        totalBudget: 6000,
        channels: [
          {
            id: "ch1",
            name: "抖音-信息流",
            dailyCap: 5000,
            cpaBid: 80,
            conversionRate: 0.04,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.002,
          },
          {
            id: "ch2",
            name: "微信-朋友圈",
            dailyCap: 3000,
            cpaBid: 120,
            conversionRate: 0.03,
            conversionDelayDays: 0,
            efficiencyAlpha: 0.0015,
          },
        ],
        materials: [
          { id: "m1", name: "视频-A1", channelId: "ch1", tags: ["大促", "短视频"] },
          { id: "m2", name: "视频-A2", channelId: "ch1", tags: ["大促", "短视频"] },
          { id: "m3", name: "图片-B1", channelId: "ch2", tags: ["品牌", "静态图"] },
        ],
      };
  }
}
