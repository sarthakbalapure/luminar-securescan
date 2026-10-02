import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/current-user.decorator";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!isAdminRole(request.user?.role)) {
      throw new ForbiddenException("Access denied. You do not have permission to access this page.");
    }
    return true;
  }
}

function isAdminRole(role?: string) {
  return role === "PLATFORM_ADMIN" || role === "ADMIN";
}
