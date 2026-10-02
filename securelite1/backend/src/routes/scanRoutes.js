import { Router } from "express";
import {
  downloadScanPdf,
  getScanById,
  getScanHistory,
  startConfigScan,
  startMalwareScan,
  startPortScan,
  startScan,
  startSqlScan,
  startSslScan,
  startXssScan
} from "../controllers/scanController.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { scanValidator } from "../utils/validators.js";

const router = Router();

router.use(protect);
router.get("/", getScanHistory);
router.get("/:id/report.pdf", downloadScanPdf);
router.post("/", scanValidator, validate, startScan);
router.post("/sql", scanValidator, validate, startSqlScan);
router.post("/xss", scanValidator, validate, startXssScan);
router.post("/ssl", scanValidator, validate, startSslScan);
router.post("/ports", scanValidator, validate, startPortScan);
router.post("/config", scanValidator, validate, startConfigScan);
router.post("/malware", scanValidator, validate, startMalwareScan);
router.get("/:id", getScanById);

export default router;
