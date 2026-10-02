import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { AuthService } from "./auth.service";
import { CurrentUser, type AuthenticatedUser } from "./current-user.decorator";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @UseGuards(AuthRateLimitGuard)
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post("login")
  @UseGuards(AuthRateLimitGuard)
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post("admin/login")
  @UseGuards(AuthRateLimitGuard)
  adminLogin(@Body() body: LoginDto, @Req() request: { ip?: string; socket?: { remoteAddress?: string } }) {
    return this.auth.adminLogin(body, request.ip ?? request.socket?.remoteAddress);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.logout(user.id);
  }
}
