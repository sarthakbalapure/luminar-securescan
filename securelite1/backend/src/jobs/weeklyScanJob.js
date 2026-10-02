import cron from "node-cron";
import { Scan } from "../models/Scan.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { createAndRunScan } from "../services/scanService.js";

export const startWeeklyScanJob = () => {
  if (!env.enableWeeklyScans) {
    return;
  }

  cron.schedule(env.weeklyScanCron, async () => {
    try {
      const latestScans = await Scan.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { user: "$user", targetUrl: "$targetUrl" },
            latestScanId: { $first: "$_id" }
          }
        }
      ]);

      for (const item of latestScans) {
        const latestScan = await Scan.findById(item.latestScanId);
        const user = await User.findById(item._id.user);

        if (!latestScan || !user || user.role === "owner") {
          continue;
        }

        await createAndRunScan({
          user,
          targetUrl: latestScan.targetUrl,
          scanType: "full",
          triggeredBy: "scheduler"
        });
      }

      console.log("Weekly scheduled scans completed");
    } catch (error) {
      console.error("Weekly scheduled scans failed", error);
    }
  });
};
