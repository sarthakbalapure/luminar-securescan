import { apiSafeEndpointCheck, openApiSpecCheck } from "./api-baseline-checks";
import { cookieSecurityCheck } from "./cookie-security-check";
import { exposedFilesCheck } from "./exposed-files-check";
import { httpsCheck } from "./https-check";
import { nucleiCveScan, nucleiFullScan, nucleiSafeBaselineScan } from "./nuclei-scan";
import { repositorySecurityScan } from "./repository-security-scan";
import { securityHeadersCheck } from "./security-headers-check";
import { sqlmapDetectionScan } from "./sqlmap-scan";
import { tlsSummaryCheck } from "./tls-summary-check";
import { zapBaselineScan, zapFullScan } from "./zap-baseline-scan";

export const scannerModules = [
  httpsCheck,
  securityHeadersCheck,
  cookieSecurityCheck,
  exposedFilesCheck,
  tlsSummaryCheck,
  zapBaselineScan,
  zapFullScan,
  nucleiSafeBaselineScan,
  nucleiCveScan,
  nucleiFullScan,
  sqlmapDetectionScan,
  openApiSpecCheck,
  apiSafeEndpointCheck,
  repositorySecurityScan,
];
