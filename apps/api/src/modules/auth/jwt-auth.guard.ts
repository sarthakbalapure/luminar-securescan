import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma.service";
import type { AuthenticatedUser } from "./current-user.decorator";

type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: AuthenticatedUser }>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Authentication token is required.");

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (!user?.isActive) throw new UnauthorizedException("User is inactive or no longer exists.");
      request.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired authentication token.");
    }
  }
}
