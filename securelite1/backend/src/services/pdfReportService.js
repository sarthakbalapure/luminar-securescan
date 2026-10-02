import PDFDocument from "pdfkit";

const severityColor = {
  critical: "#b42318",
  high: "#d64545",
  medium: "#f4a340",
  low: "#2a9d6f",
  info: "#175cd3"
};

const drawSectionTitle = (doc, title) => {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#14213d").text(title);
  doc.moveDown(0.3);
};

const drawMetaRow = (doc, label, value) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#14213d").text(`${label}: `, { continued: true });
  doc.font("Helvetica").fillColor("#334155").text(value || "-");
};

export const buildPdfReport = ({ scan }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 48, bottom: 48, left: 48, right: 48 }
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .roundedRect(48, 40, 500, 90, 18)
        .fillAndStroke("#f4f8ff", "#d8e4fb")
        .fillColor("#14213d")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text("SecureLite Security Report", 72, 62)
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#475569")
        .text("Professional website security summary", 72, 94);

      doc.y = 150;
      drawMetaRow(doc, "Scanned URL", scan.targetUrl);
      drawMetaRow(doc, "Scan date", new Date(scan.createdAt).toLocaleString());
      drawMetaRow(doc, "Security score", `${scan.securityScore}/100`);
      drawMetaRow(doc, "Risk level", scan.riskLevel);
      drawMetaRow(doc, "Scan type", scan.scanType);

      drawSectionTitle(doc, "Summary");
      doc.font("Helvetica").fontSize(11).fillColor("#334155").text(scan.summary || "No summary available.");

      drawSectionTitle(doc, "Vulnerabilities");
      if (!scan.issues?.length) {
        doc.font("Helvetica").fontSize(11).fillColor("#334155").text("No vulnerabilities were listed in this scan.");
      } else {
        scan.issues.forEach((issue, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc
            .roundedRect(48, doc.y, 500, 92, 14)
            .fillAndStroke("#ffffff", "#e5edf8");

          const boxTop = doc.y - 92;
          doc
            .fillColor(severityColor[issue.severity] || "#175cd3")
            .font("Helvetica-Bold")
            .fontSize(10)
            .text(String(issue.severity || "info").toUpperCase(), 64, boxTop + 14);

          doc
            .fillColor("#14213d")
            .font("Helvetica-Bold")
            .fontSize(12)
            .text(issue.title || `Issue ${index + 1}`, 64, boxTop + 32, { width: 460 });

          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#475569")
            .text(issue.plainEnglish || "", 64, boxTop + 50, { width: 460, height: 30 });

          doc
            .font("Helvetica-Bold")
            .fillColor("#14213d")
            .text("Recommendation: ", 64, boxTop + 72, { continued: true });
          doc.font("Helvetica").fillColor("#475569").text(issue.recommendation || "", { width: 400 });

          doc.moveDown(0.5);
        });
      }

      drawSectionTitle(doc, "Recommendations");
      if (!scan.issues?.length) {
        doc.font("Helvetica").fontSize(11).fillColor("#334155").text("Keep monitoring the site and rerun scans after major changes.");
      } else {
        scan.issues.slice(0, 8).forEach((issue) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#14213d")
            .text(`- ${issue.title}`);
          doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#475569")
            .text(issue.recommendation || "", {
              indent: 12
            });
          doc.moveDown(0.2);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
