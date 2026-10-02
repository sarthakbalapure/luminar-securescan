import { User } from "../models/User.js";
import { Scan } from "../models/Scan.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAdminOverview = asyncHandler(async (_req, res) => {
  const [totalUsers, publicUsers, ownerUsers, totalScans, recentScans, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "public" }),
    User.countDocuments({ role: "owner" }),
    Scan.countDocuments(),
    Scan.find().sort({ createdAt: -1 }).limit(8).populate("user", "name email companyName role"),
    User.find().sort({ createdAt: -1 }).limit(8).select("-password")
  ]);

  const planBreakdown = await User.aggregate([
    {
      $group: {
        _id: "$plan.name",
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        plan: "$_id",
        count: 1
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      metrics: {
        totalUsers,
        publicUsers,
        ownerUsers,
        totalScans
      },
      planBreakdown,
      recentScans,
      recentUsers
    }
  });
});
