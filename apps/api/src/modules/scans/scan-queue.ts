import { Provider } from "@nestjs/common";
import { Queue } from "bullmq";

export const SCAN_QUEUE = Symbol("SCAN_QUEUE");
export const WEBSITE_SCAN_QUEUE_NAME = "website-scans";

export type ScanQueuePayload = {
  scanId: string;
  apiBearerTokenCiphertext?: string;
  scanScopePaths?: string[];
  repositoryTokenCiphertext?: string;
  repositoryBranch?: string;
  repositoryZipBase64?: string;
  sqlmapConfig?: {
    targetUrl: string;
    method: "GET" | "POST";
    parameter: string;
    postBody?: string;
    authorizationHeader?: string;
  };
};
export type ScanQueue = Queue<ScanQueuePayload>;

function connectionFromRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
  };
}

export const scanQueueProvider: Provider = {
  provide: SCAN_QUEUE,
  useFactory: () => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    return new Queue<ScanQueuePayload>(WEBSITE_SCAN_QUEUE_NAME, {
      connection: connectionFromRedisUrl(redisUrl),
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  },
};
