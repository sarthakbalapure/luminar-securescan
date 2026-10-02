export type PdfRenderer = { render(html: string): Promise<Buffer> };

export class PlaywrightPdfGenerator implements PdfRenderer {
  async render(html: string) {
    const playwright = this.loadPlaywright();
    if (!playwright) return simplePdfFromHtml(html);
    let browser: Awaited<ReturnType<PlaywrightRuntime["chromium"]["launch"]>> | null = null;
    try {
      browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      return await page.pdf({ format: "A4", printBackground: true, margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" } });
    } catch {
      return simplePdfFromHtml(html);
    } finally {
      await browser?.close();
    }
  }

  private loadPlaywright(): PlaywrightRuntime | null {
    try { return (require as NodeRequire)("playwright") as PlaywrightRuntime; } catch { return null; }
  }
}

type PlaywrightRuntime = { chromium: { launch(options: { headless: boolean }): Promise<{ newPage(): Promise<{ setContent(html: string, options: { waitUntil: "load" }): Promise<void>; pdf(options: { format: "A4"; printBackground: boolean; margin: Record<"top" | "right" | "bottom" | "left", string> }): Promise<Buffer> }>; close(): Promise<void> }> } };

function simplePdfFromHtml(html: string) {
  const lines = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 70);
  const content = ["BT", "/F1 10 Tf", "50 790 Td", ...lines.flatMap((line, index) => [index ? "0 -14 Td" : "", `(${pdfText(line.slice(0, 110))}) Tj`]), "ET"].filter(Boolean).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, "ascii")); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

function pdfText(value: string) { return value.replace(/[^\x20-\x7E]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
