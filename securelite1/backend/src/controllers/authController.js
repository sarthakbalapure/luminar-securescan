import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";
import { signToken } from "../utils/jwt.js";

const createAuthResponse = (user) => ({
  token: signToken({ id: user._id }),
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    companyName: user.companyName,
    role: user.role,
    plan: user.plan,
    alertPreferences: user.alertPreferences
  }
});

export const signup = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });

  if (existingUser) {
    throw new AppError("An account with that email already exists", 409);
  }

  const user = await User.create({
    ...req.body,
    role: "public",
    plan: {
      code: "starter",
      name: "Starter",
      priceInr: 50,
      billingCycle: "monthly",
      status: "active",
      scanLimitMonthly: 10,
      scansUsedThisMonth: 0
    }
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: createAuthResponse(user)
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+password");

  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new AppError("Invalid email or password", 401);
  }

  res.json({
    success: true,
    message: "Login successful",
    data: createAuthResponse(user)
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});
