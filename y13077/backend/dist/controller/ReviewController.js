"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const ReviewService_1 = require("../service/ReviewService");
const ExportService_1 = require("../service/ExportService");
const HistoryService_1 = require("../service/HistoryService");
const GuideService_1 = require("../service/GuideService");
class ReviewController {
    reviewService;
    exportService;
    historyService;
    guideService;
    constructor() {
        this.reviewService = new ReviewService_1.ReviewService();
        this.exportService = new ExportService_1.ExportService();
        this.historyService = new HistoryService_1.HistoryService();
        this.guideService = new GuideService_1.GuideService();
    }
    createReview = async (req, res) => {
        try {
            const dto = req.body;
            const result = await this.reviewService.createReview(dto);
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getReviewList = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const result = await this.reviewService.getReviewList(page, pageSize);
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getReviewDetail = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.reviewService.getReviewDetail(id);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    updateReview = async (req, res) => {
        try {
            const { id } = req.params;
            const dto = req.body;
            const result = await this.reviewService.updateReview(id, dto);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    deleteReview = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.reviewService.deleteReview(id);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, message: "删除成功" });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    addCadLayer = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const dto = req.body;
            const result = await this.reviewService.addCadLayer(reviewId, dto);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    addMaterial = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const dto = req.body;
            const result = await this.reviewService.addMaterial(reviewId, dto);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    addRemark = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const dto = req.body;
            const result = await this.reviewService.addRemark(reviewId, dto);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    runDetection = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const result = await this.reviewService.runDetection(reviewId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    confirmCollision = async (req, res) => {
        try {
            const { collisionId } = req.params;
            const dto = req.body;
            const result = await this.reviewService.confirmCollision(collisionId, dto);
            if (!result) {
                return res.status(404).json({ success: false, message: "异常记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    addViewConfig = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const dto = req.body;
            const result = await this.reviewService.addViewConfig(reviewId, dto);
            if (!result) {
                return res.status(404).json({ success: false, message: "预审记录不存在" });
            }
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getViewConfigs = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const result = await this.reviewService.getViewConfigs(reviewId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    exportReview = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const options = req.body;
            const result = await this.exportService.exportReview(reviewId, options);
            res.download(result.filePath, result.fileName, (err) => {
                if (err) {
                    res.status(500).json({ success: false, message: "导出失败" });
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getHistories = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const result = await this.historyService.getReviewHistories(reviewId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getHistorySummary = async (req, res) => {
        try {
            const { reviewId } = req.params;
            const result = await this.historyService.generateHistorySummary(reviewId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getGrayReleaseHistories = async (req, res) => {
        try {
            const result = await this.historyService.getGrayReleaseReviewHistories();
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getGuide = async (req, res) => {
        try {
            const result = this.guideService.getGuideItems();
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getQuickStart = async (req, res) => {
        try {
            const result = this.guideService.getQuickStart();
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    getFAQ = async (req, res) => {
        try {
            const result = this.guideService.getFAQ();
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    createSampleReview = async (req, res) => {
        try {
            const result = await this.reviewService.createSampleReview();
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    createTestReview = async (req, res) => {
        try {
            const result = await this.reviewService.createTestReviewWithFloorMixed();
            res.json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
exports.ReviewController = ReviewController;
