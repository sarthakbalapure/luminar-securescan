import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ZapService {
  async checkZapHealth() {
    if (process.env.ZAP_ENABLED === 'false') {
      throw new ServiceUnavailableException('OWASP ZAP scanning is disabled.');
    }

    const apiUrl = process.env.ZAP_API_URL ?? 'http://localhost:8080';
    const apiKey = process.env.ZAP_API_KEY;
    const url = new URL('/JSON/core/view/version/', apiUrl);
    if (apiKey) url.searchParams.set('apikey', apiKey);

    let response: Response;
    try {
      response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new ServiceUnavailableException('OWASP ZAP service is unavailable. Please check ZAP configuration and try again.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('OWASP ZAP service is unavailable. Please check ZAP configuration and try again.');
    }
    const payload = await response.json().catch(() => ({}));
    if (!payload.version) {
      throw new ServiceUnavailableException('Unexpected OWASP ZAP API response.');
    }
    return { healthy: true, version: payload.version };
  }
}
