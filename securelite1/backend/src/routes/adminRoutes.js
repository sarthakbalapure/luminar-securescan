import { Router } from "express";
import { getAdminOverview } from "../controllers/adminController.js";
import { authorizeOwner, protect } from "../middlewares/auth.js";

const router = Router();

router.use(protect, authorizeOwner);
router.get("/overview", getAdminOverview);

export default router;
