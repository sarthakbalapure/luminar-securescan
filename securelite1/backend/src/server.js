import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startWeeklyScanJob } from "./jobs/weeklyScanJob.js";

const startServer = async () => {
  try {
    await connectDb();
    startWeeklyScanJob();
    app.listen(env.port, () => {
      console.log(`SecureLite backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
};

startServer();
