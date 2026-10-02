import { Global, Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { DailyScanScheduler } from "./daily-scan-scheduler";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [PrismaService, SubscriptionService, DailyScanScheduler],
  exports: [SubscriptionService, DailyScanScheduler],
})
export class SubscriptionsModule {}
