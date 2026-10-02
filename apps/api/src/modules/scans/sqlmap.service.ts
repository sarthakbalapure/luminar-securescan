import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const execFileAsync = promisify(execFile);

@Injectable()
export class SqlmapService {
  async checkSqlmapAvailability() {
    if (process.env.SQLMAP_ENABLED === 'false') {
      throw new ServiceUnavailableException('sqlmap scanning is disabled.');
    }
    const binary = process.env.SQLMAP_BINARY_PATH ?? 'sqlmap';
    try {
      const result = await execFileAsync(binary, ['--version'], { timeout: 10_000, windowsHide: true });
      return { healthy: true, version: (result.stdout || result.stderr || 'available').trim() };
    } catch {
      throw new ServiceUnavailableException('sqlmap scanner is unavailable. Please check sqlmap configuration.');
    }
  }
}
