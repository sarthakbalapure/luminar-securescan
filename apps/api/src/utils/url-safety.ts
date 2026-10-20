import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { BadRequestException } from '@nestjs/common';

const blockedTargetMessage = 'This target is not allowed for SaaS-hosted scanning.';
const cloudMetadataHosts = new Set(['metadata.google.internal']);
const cloudMetadataIps = new Set(['169.254.169.254']);

export async function assertSaasScanTargetAllowed(target: string) {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    throw new BadRequestException('Target URL is invalid.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestException('Target URL must use http or https.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (isBlockedHostname(hostname)) throwBlockedTarget();
  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throwBlockedTarget();
    return url;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new BadRequestException('Target hostname did not resolve.');
  }
  if (!records.length) throw new BadRequestException('Target hostname did not resolve.');
  if (records.some((record) => isBlockedIp(record.address))) throwBlockedTarget();
  return url;
}

export function isBlockedHostname(hostname: string) {
  return hostname === 'localhost' || hostname.endsWith('.local') || cloudMetadataHosts.has(hostname);
}

export function isBlockedIp(address: string) {
  const lower = address.toLowerCase().replace(/^\[|\]$/g, '');
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)?.[1];
  if (mappedIpv4) return isBlockedIp(mappedIpv4);

  return (
    lower.startsWith('0.') ||
    lower.startsWith('127.') ||
    lower.startsWith('10.') ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower) ||
    lower.startsWith('192.168.') ||
    lower.startsWith('192.0.0.') ||
    lower.startsWith('192.0.2.') ||
    lower.startsWith('169.254.') ||
    lower.startsWith('198.18.') ||
    lower.startsWith('198.19.') ||
    lower.startsWith('198.51.100.') ||
    lower.startsWith('203.0.113.') ||
    /^22[4-9]\./.test(lower) ||
    /^23\d\./.test(lower) ||
    /^2(4\d|5[0-5])\./.test(lower) ||
    cloudMetadataIps.has(lower) ||
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('ff') ||
    lower.startsWith('2001:db8:')
  );
}

function throwBlockedTarget(): never {
  throw new BadRequestException(blockedTargetMessage);
}
