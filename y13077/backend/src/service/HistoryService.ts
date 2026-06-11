import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { ReviewHistory, HistoryAction } from "../entity/ReviewHistory";
import { Review } from "../entity/Review";

export class HistoryService {
  private historyRepository: Repository<ReviewHistory>;
  private reviewRepository: Repository<Review>;

  constructor() {
    this.historyRepository = AppDataSource.getRepository(ReviewHistory);
    this.reviewRepository = AppDataSource.getRepository(Review);
  }

  async addHistory(
    reviewId: string,
    action: HistoryAction,
    options: {
      fieldName?: string;
      oldValue?: string;
      newValue?: string;
      operator?: string;
      description?: string;
    } = {}
  ): Promise<ReviewHistory> {
    const history = this.historyRepository.create({
      reviewId,
      action,
      fieldName: options.fieldName,
      oldValue: options.oldValue,
      newValue: options.newValue,
      operator: options.operator || "系统",
      description: options.description
    });

    return await this.historyRepository.save(history);
  }

  async getReviewHistories(reviewId: string): Promise<ReviewHistory[]> {
    return await this.historyRepository.find({
      where: { reviewId },
      order: { createdAt: "DESC" }
    });
  }

  async getFieldChangeHistory(
    reviewId: string,
    fieldName: string
  ): Promise<ReviewHistory[]> {
    return await this.historyRepository.find({
      where: { reviewId, fieldName },
      order: { createdAt: "DESC" }
    });
  }

  async compareVersions(
    reviewId: string,
    historyId1: string,
    historyId2: string
  ): Promise<{ field: string; oldValue: string; newValue: string }[]> {
    const h1 = await this.historyRepository.findOneBy({ id: historyId1 });
    const h2 = await this.historyRepository.findOneBy({ id: historyId2 });

    if (!h1 || !h2) {
      throw new Error("历史记录不存在");
    }

    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    const review = await this.reviewRepository.findOneBy({ id: reviewId });
    if (!review) {
      throw new Error("预审记录不存在");
    }

    if (h1.oldValue !== h2.oldValue) {
      changes.push({
        field: h1.fieldName || "unknown",
        oldValue: h1.oldValue || "",
        newValue: h2.newValue || ""
      });
    }

    return changes;
  }

  async getGrayReleaseReviewHistories(): Promise<ReviewHistory[]> {
    const reviews = await this.reviewRepository.find({
      where: { isGrayRelease: true },
      select: ["id"]
    });

    const reviewIds = reviews.map(r => r.id);
    if (reviewIds.length === 0) return [];

    return await this.historyRepository
      .createQueryBuilder("history")
      .where("history.reviewId IN (:...ids)", { ids: reviewIds })
      .andWhere("history.action IN (:...actions)", {
        actions: ["confirm_collision", "update_remark", "status_change", "conclusion_change"]
      })
      .orderBy("history.createdAt", "DESC")
      .getMany();
  }

  async generateHistorySummary(reviewId: string): Promise<string> {
    const histories = await this.getReviewHistories(reviewId);
    
    if (histories.length === 0) {
      return "暂无历史变更记录";
    }

    const actionNames: Record<HistoryAction, string> = {
      create: "创建预审",
      update: "更新信息",
      confirm_collision: "确认异常",
      update_remark: "更新备注",
      export: "导出结果",
      status_change: "状态变更",
      conclusion_change: "结论变更"
    };

    const summary = histories
      .slice(0, 10)
      .map(h => {
        const time = h.createdAt.toLocaleString("zh-CN");
        const action = actionNames[h.action] || h.action;
        let detail = "";
        
        if (h.fieldName && h.oldValue && h.newValue) {
          detail = ` ${h.fieldName}: "${h.oldValue}" → "${h.newValue}"`;
        } else if (h.description) {
          detail = ` ${h.description}`;
        }

        return `[${time}] ${h.operator} - ${action}${detail}`;
      })
      .join("\n");

    return summary;
  }
}
