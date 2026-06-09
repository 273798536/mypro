import { Router } from "express";
import {
  listRecords,
  getRecord,
  putRecord,
  listHistory,
  postImport,
  getExport,
  getTrace,
} from "../controllers/recordController.js";

const router = Router();

router.get("/", listRecords);
router.get("/export", getExport);
router.post("/import", postImport);
router.get("/:id", getRecord);
router.put("/:id", putRecord);
router.get("/:id/history", listHistory);
router.get("/:id/trace", getTrace);

export default router;
