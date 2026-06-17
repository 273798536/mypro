import type {
  ReviewRecord,
  ActionType,
  DashboardMetrics,
  ImpactAnalysis,
} from "@/types";
import { storage } from "@/services/storage";
import { uid } from "@/utils/helpers";

export const reviewService = {
  getAll(): ReviewRecord[] {
    const data = storage.load();
    return data.review_records.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getByOrderId(orderId: string): ReviewRecord[] {
    return this.getAll().filter((r) => r.order_id === orderId);
  },

  create(
    orderId: string,
    actionType: ActionType,
    operator: string,
    beforeSummary: string,
    afterSummary: string,
    note: string
  ): ReviewRecord {
    const data = storage.load();
    const record: ReviewRecord = {
      id: uid("rr"),
      order_id: orderId,
      action_type: actionType,
      operator,
      before_summary: beforeSummary,
      after_summary: afterSummary,
      note,
      created_at: new Date().toISOString(),
    };
    data.review_records.unshift(record);
    storage.save(data);
    return record;
  },

  getMetrics(): DashboardMetrics {
    const data = storage.load();
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const todayRecords = data.review_records.filter(
      (r) => new Date(r.created_at).getTime() >= todayStart
    );
    const todayCount = todayRecords.length;
    const confirmCount = todayRecords.filter(
      (r) => r.action_type === "confirm" || r.action_type === "modify"
    ).length;
    const revokeCount = todayRecords.filter(
      (r) => r.action_type === "revoke"
    ).length;

    const pendingCount = data.work_orders.filter(
      (o) => o.status === "pending"
    ).length;
    const affectedCount = data.work_orders.filter(
      (o) => o.threshold_affected && o.status === "pending"
    ).length;
    const totalAffected = data.work_orders.filter(
      (o) => o.threshold_affected
    ).length;

    const totalThresholdAffected = Math.max(totalAffected, 1);
    const handled = data.work_orders.filter(
      (o) =>
        o.threshold_affected &&
        (o.status === "confirmed" || o.status === "revoked")
    ).length;
    const thresholdHealth = Math.round((handled / totalThresholdAffected) * 100);

    return {
      today_judgement_count: todayCount,
      confirm_rate:
        todayCount === 0 ? 0 : Math.round((confirmCount / todayCount) * 100),
      revoke_rate:
        todayCount === 0 ? 0 : Math.round((revokeCount / todayCount) * 100),
      threshold_health: thresholdHealth,
      pending_count: pendingCount,
      affected_by_threshold: affectedCount,
    };
  },

  getImpactAnalysis(): ImpactAnalysis[] {
    const data = storage.load();
    const totalWeight = data.work_orders.reduce(
      (sum, o) => sum + o.impact_weight,
      0
    );
    return data.work_orders
      .sort((a, b) => b.impact_weight - a.impact_weight)
      .map((o) => {
        const contribution =
          totalWeight === 0
            ? 0
            : Math.round((o.impact_weight / totalWeight) * 1000) / 10;
        let description = "";
        if (o.impact_weight >= 1.8) {
          description = `高权重样本，拉偏总结论约 ${contribution}%，阈值修改时极易改变分类结果，需优先人工复核。`;
        } else if (o.impact_weight >= 1.2) {
          description = `中高权重样本，贡献总结论 ${contribution}%，与相邻3条共同决定阈值边界。`;
        } else if (o.impact_weight >= 0.6) {
          description = `常规权重样本，贡献 ${contribution}%，可批量通过。`;
        } else {
          description = `低权重样本，贡献仅 ${contribution}%，对总结论影响微弱。`;
        }
        return {
          order_id: o.id,
          order_title: o.title,
          impact_weight: o.impact_weight,
          contribution,
          description,
        };
      });
  },

  exportReviewPackage(): {
    generated_at: string;
    summary: string;
    work_orders: unknown[];
    review_records: unknown[];
    screenshots: unknown[];
  } {
    const data = storage.load();
    const metrics = this.getMetrics();
    return {
      generated_at: new Date().toISOString(),
      summary: `客服摘要人工改判复盘材料包 - 今日改判 ${metrics.today_judgement_count} 条，确认率 ${metrics.confirm_rate}%，撤回率 ${metrics.revoke_rate}%，阈值健康度 ${metrics.threshold_health}%。包含 ${data.work_orders.length} 条工单，${data.review_records.length} 条改判历史，${data.screenshots.length} 张截图说明。`,
      work_orders: data.work_orders,
      review_records: data.review_records,
      screenshots: data.screenshots,
    };
  },
};
