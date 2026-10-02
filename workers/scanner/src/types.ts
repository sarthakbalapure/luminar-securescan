export type NormalizedFinding = {
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  evidenceSummary: string;
  businessImpact: string;
  technicalImpact: string;
  remediationSummary: string;
  source?: "internal" | "owasp_zap" | "nuclei" | "sqlmap";
  rawZapAlert?: object;
  rawNucleiResult?: object;
  templateId?: string;
  templateName?: string;
  matcherName?: string;
  extractedResults?: string[];
  curlCommand?: string;
  nucleiSeverity?: string;
  nucleiTags?: string[];
  nucleiClassification?: object;
  testedParameter?: string;
  injectionType?: string;
  sqlmapRisk?: string;
  sqlmapLevel?: string;
  rawSqlmapSummary?: object;
  zapRisk?: string;
  confidence?: string;
  solution?: string;
  reference?: string;
  cweId?: string;
  wascId?: string;
  cwe?: string;
  owaspMapping?: string[];
  evidence?: {
    evidenceType: string;
    url?: string;
    requestSummary?: string;
    responseSummary?: string;
    observedValue?: string;
    expectedValue?: string;
    rawJson?: object;
  };
  recommendation?: {
    recommendationType: string;
    remediationText: string;
    retestSteps: string;
    codeExample?: string;
  };
};

export type ScannerContext = {
  scanId: string;
  scanType: string;
  apiBearerToken?: string;
  scanScopePaths?: string[];
  repositoryToken?: string;
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
  apiSpecification?: {
    baseUrl: string;
    rawContent: string;
    parsedJson: unknown;
    endpointsJson: unknown;
    specUrl?: string | null;
  } | null;
};

export type ScannerModule = {
  jobType: string;
  run: (target: string, context?: ScannerContext) => Promise<NormalizedFinding[]>;
};
