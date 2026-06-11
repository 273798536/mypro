"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const data_source_1 = require("../data-source");
const Review_1 = require("../entity/Review");
const CadLayer_1 = require("../entity/CadLayer");
const Material_1 = require("../entity/Material");
const Collision_1 = require("../entity/Collision");
const Remark_1 = require("../entity/Remark");
const ViewConfig_1 = require("../entity/ViewConfig");
const CollisionDetectionService_1 = require("./CollisionDetectionService");
const HistoryService_1 = require("./HistoryService");
class ReviewService {
    reviewRepository;
    layerRepository;
    materialRepository;
    collisionRepository;
    remarkRepository;
    viewRepository;
    collisionDetectionService;
    historyService;
    constructor() {
        this.reviewRepository = data_source_1.AppDataSource.getRepository(Review_1.Review);
        this.layerRepository = data_source_1.AppDataSource.getRepository(CadLayer_1.CadLayer);
        this.materialRepository = data_source_1.AppDataSource.getRepository(Material_1.Material);
        this.collisionRepository = data_source_1.AppDataSource.getRepository(Collision_1.Collision);
        this.remarkRepository = data_source_1.AppDataSource.getRepository(Remark_1.Remark);
        this.viewRepository = data_source_1.AppDataSource.getRepository(ViewConfig_1.ViewConfig);
        this.collisionDetectionService = new CollisionDetectionService_1.CollisionDetectionService();
        this.historyService = new HistoryService_1.HistoryService();
    }
    async createReview(dto, operator = "运营主管") {
        const code = `CA-${Date.now().toString().slice(-8)}`;
        const review = this.reviewRepository.create({
            ...dto,
            code,
            status: "pending",
            conclusion: "pending"
        });
        const saved = await this.reviewRepository.save(review);
        await this.historyService.addHistory(saved.id, "create", {
            operator,
            description: "创建预审记录"
        });
        return saved;
    }
    async getReviewList(page = 1, pageSize = 10) {
        const [list, total] = await this.reviewRepository.findAndCount({
            order: { createdAt: "DESC" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            relations: ["collisions"]
        });
        return { list, total };
    }
    async getReviewDetail(id) {
        return await this.reviewRepository.findOne({
            where: { id },
            relations: ["cadLayers", "materials", "collisions", "histories", "viewConfigs", "remarks"]
        });
    }
    async updateReview(id, dto, operator = "运营主管") {
        const review = await this.reviewRepository.findOneBy({ id });
        if (!review)
            return null;
        const oldRemark = review.operatorRemark;
        const oldStatus = review.status;
        const oldConclusion = review.conclusion;
        if (dto.operatorRemark !== undefined && dto.operatorRemark !== oldRemark) {
            await this.historyService.addHistory(id, "update_remark", {
                fieldName: "运营备注",
                oldValue: oldRemark || "",
                newValue: dto.operatorRemark,
                operator,
                description: "更新运营备注"
            });
        }
        if (dto.status !== undefined && dto.status !== oldStatus) {
            await this.historyService.addHistory(id, "status_change", {
                fieldName: "状态",
                oldValue: oldStatus,
                newValue: dto.status,
                operator,
                description: "变更预审状态"
            });
        }
        if (dto.conclusion !== undefined && dto.conclusion !== oldConclusion) {
            await this.historyService.addHistory(id, "conclusion_change", {
                fieldName: "结论",
                oldValue: oldConclusion,
                newValue: dto.conclusion,
                operator,
                description: "变更预审结论"
            });
        }
        Object.assign(review, dto);
        return await this.reviewRepository.save(review);
    }
    async addCadLayer(reviewId, dto) {
        const review = await this.reviewRepository.findOneBy({ id: reviewId });
        if (!review)
            return null;
        const layer = this.layerRepository.create({
            ...dto,
            reviewId
        });
        return await this.layerRepository.save(layer);
    }
    async addMaterial(reviewId, dto) {
        const review = await this.reviewRepository.findOneBy({ id: reviewId });
        if (!review)
            return null;
        const material = this.materialRepository.create({
            ...dto,
            reviewId
        });
        return await this.materialRepository.save(material);
    }
    async addRemark(reviewId, dto, operator = "运营主管") {
        const review = await this.reviewRepository.findOneBy({ id: reviewId });
        if (!review)
            return null;
        const remark = this.remarkRepository.create({
            ...dto,
            reviewId
        });
        const saved = await this.remarkRepository.save(remark);
        await this.historyService.addHistory(reviewId, "update_remark", {
            operator,
            description: `添加${dto.source === "verbal" ? "口头" : "书面"}备注`
        });
        return saved;
    }
    async runDetection(reviewId) {
        const review = await this.reviewRepository.findOne({
            where: { id: reviewId },
            relations: ["cadLayers", "materials", "remarks", "collisions"]
        });
        if (!review) {
            throw new Error("预审记录不存在");
        }
        await this.collisionRepository.delete({ reviewId });
        const detections = this.collisionDetectionService.detectAll(review.cadLayers, review.materials, review.remarks);
        for (const detection of detections) {
            const collision = this.collisionRepository.create({
                ...detection,
                reviewId
            });
            await this.collisionRepository.save(collision);
        }
        const { overallConclusion, highCount, mediumCount, lowCount } = this.collisionDetectionService.generateConclusion(detections);
        review.status = "processing";
        review.conclusion = overallConclusion;
        await this.reviewRepository.save(review);
        await this.historyService.addHistory(reviewId, "update", {
            operator: "系统",
            description: `完成碰撞检测，发现${highCount}个高风险、${mediumCount}个中风险、${lowCount}个低风险异常`
        });
        return { detections, conclusion: overallConclusion, highCount, mediumCount, lowCount };
    }
    async confirmCollision(collisionId, dto, operator = "运营主管") {
        const collision = await this.collisionRepository.findOneBy({ id: collisionId });
        if (!collision)
            return null;
        const oldConfirmed = collision.isConfirmed;
        Object.assign(collision, dto);
        const saved = await this.collisionRepository.save(collision);
        await this.historyService.addHistory(collision.reviewId, "confirm_collision", {
            fieldName: "异常确认",
            oldValue: oldConfirmed ? "已确认" : "待确认",
            newValue: dto.isConfirmed ? "已确认" : "待确认",
            operator,
            description: `${dto.isConfirmed ? "确认" : "取消确认"}异常: ${collision.description}`
        });
        return saved;
    }
    async addViewConfig(reviewId, dto) {
        const review = await this.reviewRepository.findOneBy({ id: reviewId });
        if (!review)
            return null;
        const view = this.viewRepository.create({
            ...dto,
            reviewId
        });
        return await this.viewRepository.save(view);
    }
    async getViewConfigs(reviewId) {
        return await this.viewRepository.find({
            where: { reviewId },
            order: { createdAt: "DESC" }
        });
    }
    async deleteReview(id) {
        const result = await this.reviewRepository.delete({ id });
        return result.affected ? result.affected > 0 : false;
    }
    async createSampleReview() {
        const review = await this.createReview({
            name: "数据中心冷通道碰撞预审（样例）",
            description: "标准样例预审，包含各种异常场景演示"
        });
        await this.addCadLayer(review.id, {
            name: "冷通道布局图",
            version: "v2.0",
            layerType: "建筑"
        });
        await this.addCadLayer(review.id, {
            name: "设备布置图",
            version: "v2.5",
            layerType: "设备"
        });
        await this.addMaterial(review.id, {
            name: "冷通道机柜",
            standardName: "冷通道机柜",
            unit: "台",
            quantity: 20,
            floor: "3F"
        });
        await this.addMaterial(review.id, {
            name: "机柜",
            standardName: "冷通道机柜",
            unit: "个",
            quantity: 15,
            floor: "3层"
        });
        await this.addMaterial(review.id, {
            name: "精密空调",
            standardName: "精密空调",
            unit: "台",
            quantity: 4,
            floor: "3F"
        });
        await this.addRemark(review.id, {
            content: "张工说3楼空调位置要左移2米避开柱子",
            source: "verbal",
            author: "林姐"
        });
        await this.runDetection(review.id);
        return review;
    }
    async createTestReviewWithFloorMixed() {
        const review = await this.createReview({
            name: "数据中心冷通道碰撞预审（楼层单位混写测试",
            description: "测试楼层单位混写场景，测试系统是否能正确检测"
        });
        await this.addMaterial(review.id, {
            name: "冷通道机柜",
            unit: "台",
            quantity: 10,
            floor: "5F"
        });
        await this.addMaterial(review.id, {
            name: "冷通道机柜",
            unit: "台",
            quantity: 8,
            floor: "5层"
        });
        await this.addMaterial(review.id, {
            name: "冷通道机柜",
            unit: "台",
            quantity: 12,
            floor: "5楼"
        });
        await this.runDetection(review.id);
        return review;
    }
}
exports.ReviewService = ReviewService;
