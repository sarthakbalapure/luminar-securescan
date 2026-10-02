import { Scan } from "../models/Scan.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createAndRunScan } from "../services/scanService.js";
import { AppError } from "../utils/appError.js";
import { buildPdfReport } from "../services/pdfReportService.js";

const runScanResponse = async ({ req, res, scanType }) => {
  const scan = await createAndRunScan({
    user: req.user,
    targetUrl: req.body.targetUrl,
    scanType
  });

  res.status(201).json({
    success: true,
    message: `${scanType === "full" ? "Full" : scanType.toUpperCase()} scan completed`,
    data: scan
  });
};

export const startScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "full" });
});

export const startSqlScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "sql" });
});

export const startXssScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "xss" });
});

export const startSslScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "ssl" });
});

export const startPortScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "ports" });
});

export const startConfigScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "config" });
});

export const startMalwareScan = asyncHandler(async (req, res) => {
  await runScanResponse({ req, res, scanType: "malware" });
});

export const getScanHistory = asyncHandler(async (req, res) => {
  const scans = await Scan.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: scans
  });
});

export const getScanById = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({ _id: req.params.id, user: req.user._id });

  if (!scan) {
    throw new AppError("Scan not found", 404);
  }

  res.json({
    success: true,
    data: scan
  });
});

export const downloadScanPdf = asyncHandler(async (req, res) => {
  const scan = await Scan.findOne({ _id: req.params.id, user: req.user._id });

  if (!scan) {
    throw new AppError("Scan not found", 404);
  }

  const pdfBuffer = await buildPdfReport({ scan });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="securelite-report-${scan.domain}.pdf"`);
  res.send(pdfBuffer);
});
