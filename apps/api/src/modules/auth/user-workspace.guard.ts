import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "./current-user.decorator";

@Injectable()
export class UserWorkspaceGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (request.user?.role !== "USER") {
      throw new ForbiddenException("Forbidden: User workspace access required");
    }
    return true;
  }
}
