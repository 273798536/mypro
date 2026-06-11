import { Router } from "express";
import { ReviewController } from "../controller/ReviewController";

const router = Router();
const controller = new ReviewController();

router.post("/reviews", controller.createReview);
router.get("/reviews", controller.getReviewList);
router.get("/reviews/:id", controller.getReviewDetail);
router.put("/reviews/:id", controller.updateReview);
router.delete("/reviews/:id", controller.deleteReview);

router.post("/reviews/:reviewId/layers", controller.addCadLayer);
router.post("/reviews/:reviewId/materials", controller.addMaterial);
router.post("/reviews/:reviewId/remarks", controller.addRemark);
router.post("/reviews/:reviewId/detect", controller.runDetection);
router.post("/reviews/:reviewId/views", controller.addViewConfig);
router.get("/reviews/:reviewId/views", controller.getViewConfigs);
router.post("/reviews/:reviewId/export", controller.exportReview);
router.get("/reviews/:reviewId/histories", controller.getHistories);
router.get("/reviews/:reviewId/history-summary", controller.getHistorySummary);

router.put("/collisions/:collisionId/confirm", controller.confirmCollision);

router.get("/guide", controller.getGuide);
router.get("/guide/quick-start", controller.getQuickStart);
router.get("/guide/faq", controller.getFAQ);

router.get("/gray-release/histories", controller.getGrayReleaseHistories);

router.post("/sample-review", controller.createSampleReview);
router.post("/test-review", controller.createTestReview);

export default router;
