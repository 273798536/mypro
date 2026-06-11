import { Request, Response } from "express";
import { ReviewService } from "../service/ReviewService";
import { ExportService } from "../service/ExportService";
import { HistoryService } from "../service/HistoryService";
import { GuideService } from "../service/GuideService";
import {
  CreateReviewDto,
  UpdateReviewDto,
  AddCadLayerDto,
  AddMaterialDto,
  AddRemarkDto,
  ConfirmCollisionDto,
  AddViewConfigDto,
  ExportOptions
} from "../types";

export class ReviewController {
  private reviewService: ReviewService;
  private exportService: ExportService;
  private historyService: HistoryService;
  private guideService: GuideService;

  constructor() {
    this.reviewService = new ReviewService();
    this.exportService = new ExportService();
    this.historyService = new HistoryService();
    this.guideService = new GuideService();
  }

  createReview = async (req: Request, res: Response) => {
    try {
      const dto: CreateReviewDto = req.body;
      const result = await this.reviewService.createReview(dto);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getReviewList = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const result = await this.reviewService.getReviewList(page, pageSize);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getReviewDetail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.reviewService.getReviewDetail(id);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  updateReview = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const dto: UpdateReviewDto = req.body;
      const result = await this.reviewService.updateReview(id, dto);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  deleteReview = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.reviewService.deleteReview(id);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, message: "删除成功" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  addCadLayer = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const dto: AddCadLayerDto = req.body;
      const result = await this.reviewService.addCadLayer(reviewId, dto);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  addMaterial = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const dto: AddMaterialDto = req.body;
      const result = await this.reviewService.addMaterial(reviewId, dto);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  addRemark = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const dto: AddRemarkDto = req.body;
      const result = await this.reviewService.addRemark(reviewId, dto);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  runDetection = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const result = await this.reviewService.runDetection(reviewId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  confirmCollision = async (req: Request, res: Response) => {
    try {
      const { collisionId } = req.params;
      const dto: ConfirmCollisionDto = req.body;
      const result = await this.reviewService.confirmCollision(collisionId, dto);
      if (!result) {
        return res.status(404).json({ success: false, message: "异常记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  addViewConfig = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const dto: AddViewConfigDto = req.body;
      const result = await this.reviewService.addViewConfig(reviewId, dto);
      if (!result) {
        return res.status(404).json({ success: false, message: "预审记录不存在" });
      }
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getViewConfigs = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const result = await this.reviewService.getViewConfigs(reviewId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  exportReview = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const format = (req.query.format as string) || (req.body?.format) || "excel";
      const options: ExportOptions = {
        format,
        includeCollisions: req.body?.includeCollisions ?? true,
        includeHistory: req.body?.includeHistory ?? true
      };
      const result = await this.exportService.exportReview(reviewId, options);
      
      res.download(result.filePath, result.fileName, (err) => {
        if (err) {
          res.status(500).json({ success: false, message: "导出失败" });
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getHistories = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const result = await this.historyService.getReviewHistories(reviewId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getHistorySummary = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const result = await this.historyService.generateHistorySummary(reviewId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getGrayReleaseHistories = async (req: Request, res: Response) => {
    try {
      const result = await this.historyService.getGrayReleaseReviewHistories();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getGuide = async (req: Request, res: Response) => {
    try {
      const result = this.guideService.getGuideItems();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getQuickStart = async (req: Request, res: Response) => {
    try {
      const result = this.guideService.getQuickStart();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getFAQ = async (req: Request, res: Response) => {
    try {
      const result = this.guideService.getFAQ();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  createSampleReview = async (req: Request, res: Response) => {
    try {
      const result = await this.reviewService.createSampleReview();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  createTestReview = async (req: Request, res: Response) => {
    try {
      const result = await this.reviewService.createTestReviewWithFloorMixed();
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
