import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    scanner: { type: String, default: "custom" },
    type: { type: String, required: true },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "info"],
      required: true
    },
    title: { type: String, required: true },
    technicalDetails: { type: String, default: "" },
    plainEnglish: { type: String, required: true },
    recommendation: { type: String, required: true },
    howToFix: {
      type: [String],
      default: []
    },
    sampleFix: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const scanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    targetUrl: {
      type: String,
      required: true,
      trim: true
    },
    domain: {
      type: String,
      required: true
    },
    scanType: {
      type: String,
      enum: ["full", "sql", "xss", "ssl", "ports", "config", "malware"],
      default: "full"
    },
    triggeredBy: {
      type: String,
      enum: ["manual", "scheduler"],
      default: "manual"
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued"
    },
    source: {
      type: String,
      enum: ["mock", "zap", "nmap", "hybrid", "virustotal", "virustotal-fallback"],
      default: "mock"
    },
    securityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low"
    },
    summary: {
      type: String,
      default: ""
    },
    issues: [issueSchema],
    findingsByType: {
      sql: {
        status: { type: String, default: "pending" },
        issues: { type: [issueSchema], default: [] }
      },
      xss: {
        status: { type: String, default: "pending" },
        issues: { type: [issueSchema], default: [] }
      },
      ssl: {
        status: { type: String, default: "pending" },
        issues: { type: [issueSchema], default: [] }
      },
      ports: {
        status: { type: String, default: "pending" },
        issues: { type: [issueSchema], default: [] }
      },
      config: {
        status: { type: String, default: "pending" },
        issues: { type: [issueSchema], default: [] }
      },
      malware: {
        status: { type: String, default: "pending" },
        issues: { type: [issueSchema], default: [] }
      }
    },
    fixes: {
      type: [
        {
          label: String,
          action: String
        }
      ],
      default: []
    },
    openPorts: [
      {
        port: Number,
        status: String
      }
    ],
    ssl: {
      isValid: { type: Boolean, default: false },
      issuer: { type: String, default: "" },
      validTo: { type: String, default: "" },
      message: { type: String, default: "" }
    },
    malware: {
      grade: { type: String, default: "" },
      riskScore: { type: Number, default: 0 },
      reputation: {
        malicious: { type: Number, default: 0 },
        suspicious: { type: Number, default: 0 },
        harmless: { type: Number, default: 0 },
        undetected: { type: Number, default: 0 },
        timeout: { type: Number, default: 0 }
      },
      message: { type: String, default: "" }
    },
    rawFindings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    schedule: {
      enabled: {
        type: Boolean,
        default: false
      },
      nextRunAt: Date
    },
    lastAlertSentAt: Date
  },
  {
    timestamps: true
  }
);

export const Scan = mongoose.model("Scan", scanSchema);
