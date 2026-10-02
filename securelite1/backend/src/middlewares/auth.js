import { User } from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("You need to log in first", 401);
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    throw new AppError("This account no longer exists", 401);
  }

  req.user = user;
  next();
});

export const authorizeOwner = (req, _res, next) => {
  if (req.user.role !== "owner") {
    return next(new AppError("Owner access only", 403));
  }

  next();
};
