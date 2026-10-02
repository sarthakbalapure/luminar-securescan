import { Injectable } from "@nestjs/common";

@Injectable()
export class DailyScanScheduler {
  status() {
    return {
      enabled: false,
      message: "Daily scan is available in Max plan. Scheduling configuration will be available soon.",
    };
  }
}
