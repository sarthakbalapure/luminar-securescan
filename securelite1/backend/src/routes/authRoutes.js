import { Router } from "express";
import { getMe, login, signup } from "../controllers/authController.js";
import { validate } from "../middlewares/validate.js";
import { protect } from "../middlewares/auth.js";
import { loginValidator, signupValidator } from "../utils/validators.js";

const router = Router();

router.post("/signup", signupValidator, validate, signup);
router.post("/login", loginValidator, validate, login);
router.get("/me", protect, getMe);

export default router;
