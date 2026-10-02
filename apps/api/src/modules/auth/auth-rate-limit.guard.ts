import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: { email?: string };
};

type Bucket = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Bucket>();
const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);
const maxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? 10);

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const now = Date.now();
    const key = rateLimitKey(request);
    const bucket = attempts.get(key);
    if (!bucket || bucket.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      cleanup(now);
      return true;
    }

    bucket.count += 1;
    if (bucket.count > maxAttempts) {
      throw new HttpException("Too many authentication attempts. Please retry later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

function rateLimitKey(request: RequestLike) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0] || request.ip || "unknown";
  const email = request.body?.email?.trim().toLowerCase() || "anonymous";
  return `${ip}:${email}`;
}

function cleanup(now: number) {
  if (attempts.size < 1000) return;
  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now) attempts.delete(key);
  }
}
