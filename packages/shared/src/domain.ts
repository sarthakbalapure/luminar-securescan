export const USER_ROLES = ['USER', 'PLATFORM_ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORGANIZATION_MEMBER_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

export const DOMAIN_ASSET_TYPES = ['WEBSITE', 'WEB_APP', 'API', 'REPOSITORY', 'CLOUD'] as const;
export type DomainAssetType = (typeof DOMAIN_ASSET_TYPES)[number];

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const DOMAIN_SCAN_TYPES = ['WEBSITE_BASELINE', 'API_BASELINE', 'REPO_SCAN'] as const;
export type DomainScanType = (typeof DOMAIN_SCAN_TYPES)[number];

export const DOMAIN_SCAN_STATUSES = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type DomainScanStatus = (typeof DOMAIN_SCAN_STATUSES)[number];

export const DOMAIN_FINDING_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type DomainFindingSeverity = (typeof DOMAIN_FINDING_SEVERITIES)[number];

export const DOMAIN_FINDING_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RISK_ACCEPTED',
  'FALSE_POSITIVE',
  'FIXED',
  'RETEST_REQUIRED',
] as const;
export type DomainFindingStatus = (typeof DOMAIN_FINDING_STATUSES)[number];

export const REPORT_TYPES = ['EXECUTIVE', 'TECHNICAL', 'FULL'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSummary {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetSummary {
  id: string;
  projectId: string;
  type: DomainAssetType;
  name: string;
  url: string;
  verifiedStatus: VerificationStatus;
  riskLevel: RiskLevel;
}
