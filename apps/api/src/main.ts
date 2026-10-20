import "reflect-metadata";
import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpException, HttpStatus, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

type RequestLike = {
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};
type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: "finish", listener: () => void): void;
};
type CorsOriginCallback = (error: Error | null, allowed?: boolean) => void;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.getHttpAdapter().getInstance().set("trust proxy", config.get<string>("TRUST_PROXY", "false") === "true" ? 1 : false);
  app.use(helmet({
    contentSecurityPolicy: config.get<string>("NODE_ENV") === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: Number(config.get<string>("HSTS_MAX_AGE_SECONDS", "15552000")),
      includeSubDomains: true,
      preload: false,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  app.use((req: RequestLike, res: ResponseLike, next: () => void) => {
    res.setHeader("X-Request-Id", requestId(req));
    const startedAt = Date.now();
    res.on("finish", () => {
      console.info(JSON.stringify({
        event: "http_request",
        method: req.method,
        path: sanitizePath(req.originalUrl ?? req.url),
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        ip: req.ip,
        requestId: requestId(req),
      }));
    });
    next();
  });
  app.use((req: RequestLike, res: ResponseLike, next: () => void) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const contentType = String(req.headers["content-type"] ?? "");
      const hasBody = Number(req.headers["content-length"] ?? 0) > 0 || req.headers["transfer-encoding"];
      if (hasBody && !contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
        throw new BadRequestException("Unsupported content type.");
      }
    }
    next();
  });
  const allowedOrigins = parseOrigins(config.get<string>("WEB_ORIGIN", "http://localhost:3010"));
  const isProduction = config.get<string>("NODE_ENV") === "production";
  app.enableCors({
    origin: (origin: string | undefined, callback: CorsOriginCallback) => {
      if (!origin || allowedOrigins.includes(origin) || (!isProduction && isLocalDevOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: config.get<string>("NODE_ENV") === "production",
    })
  );
  app.useGlobalFilters(new SanitizedExceptionFilter(config.get<string>("NODE_ENV") === "production"));

  await app.listen(config.get<number>("API_PORT", 4000), config.get<string>("API_HOST", "0.0.0.0"));
}

@Catch()
class SanitizedExceptionFilter implements ExceptionFilter {
  constructor(private readonly production: boolean) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status(statusCode: number): { json(body: object): void };
    }>();
    const request = context.getRequest<RequestLike>();
    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : undefined;
    const message = this.production && statusCode >= 500
      ? "Internal server error."
      : messageFrom(payload, statusCode);

    if (!isHttp) {
      console.error(JSON.stringify({
        event: "unhandled_exception",
        path: sanitizePath(request.originalUrl ?? request.url),
        error: exception instanceof Error ? exception.message : "Unknown error",
      }));
    }

    response.status(statusCode).json({
      statusCode,
      message: redactMessage(message),
      timestamp: new Date().toISOString(),
      path: sanitizePath(request.originalUrl ?? request.url),
      requestId: requestId(request),
    });
  }
}

function parseOrigins(value: string) {
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function isLocalDevOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["3000", "3010", "3700"].includes(url.port) &&
      (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)
      )
    );
  } catch {
    return false;
  }
}

function requestId(req: RequestLike) {
  const header = req.headers["x-request-id"];
  return Array.isArray(header) ? header[0] : header || "not-provided";
}

function sanitizePath(path: string) {
  try {
    const url = new URL(path, "http://local");
    for (const key of url.searchParams.keys()) {
      if (/token|secret|password|key|authorization|cookie/i.test(key)) {
        url.searchParams.set(key, "<redacted>");
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return path.split("?")[0] ?? path;
  }
}

function messageFrom(payload: unknown, statusCode: number) {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: string | string[] }).message;
    return Array.isArray(message) ? message.join("; ") : message;
  }
  return statusCode >= 500 ? "Internal server error." : "Request failed.";
}

function redactMessage(message: string) {
  return message.replace(/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1<redacted>")
    .replace(/(token|secret|password|apikey|api_key)=([^&\s]+)/gi, "$1=<redacted>");
}

void bootstrap();
