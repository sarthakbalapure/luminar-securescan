import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./modules/admin/admin.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { FindingsModule } from "./modules/findings/findings.module";
import { FixRequestsModule } from "./modules/fix-requests/fix-requests.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ScansModule } from "./modules/scans/scans.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    SubscriptionsModule,
    DashboardModule,
    OrganizationsModule,
    ProjectsModule,
    AssetsModule,
    ScansModule,
    FindingsModule,
    FixRequestsModule,
    ReportsModule,
    AdminModule,
    AuditModule
  ]
})
export class AppModule {}
