import { describe, expect, it } from 'vitest';
import { assertSaasScanTargetAllowed, isBlockedIp } from './url-safety';

describe('SaaS target URL safety', () => {
  it.each([
    '0.1.2.3',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.0.2.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    'ff00::1',
    '2001:db8::1',
  ])('blocks non-public address %s', (address) => {
    expect(isBlockedIp(address)).toBe(true);
  });

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('allows public address %s', (address) => {
    expect(isBlockedIp(address)).toBe(false);
  });

  it('rejects a private target before any network request', async () => {
    await expect(assertSaasScanTargetAllowed('http://127.0.0.1:8080/openapi.json')).rejects.toThrow(
      'not allowed',
    );
  });
});
