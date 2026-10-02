import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../../prisma.service";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { UserWorkspaceGuard } from "./user-workspace.guard";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET is required.");
        return {
          secret,
          signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN", "1h") }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [PrismaService, AuthService, JwtAuthGuard, AuthRateLimitGuard, UserWorkspaceGuard],
  exports: [JwtModule, AuthService, JwtAuthGuard, UserWorkspaceGuard]
})
export class AuthModule {}
