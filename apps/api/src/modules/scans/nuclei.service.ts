import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const execFileAsync = promisify(execFile);

@Injectable()
export class NucleiService {
  async checkNucleiAvailability() {
    if (process.env.NUCLEI_ENABLED === 'false') {
      throw new ServiceUnavailableException('Nuclei scanning is disabled.');
    }
    const binary = process.env.NUCLEI_BINARY_PATH ?? 'nuclei';
    try {
      const result = await execFileAsync(binary, ['-version'], { timeout: 10_000, windowsHide: true });
      return { healthy: true, version: (result.stdout || result.stderr || 'available').trim() };
    } catch {
      throw new ServiceUnavailableException('Nuclei scanner is unavailable. Please check Nuclei configuration and try again.');
    }
  }
}
