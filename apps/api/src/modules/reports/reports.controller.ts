import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GenerateReportDto, GenerateReportRequestDto } from "./dto/generate-report.dto";
import { ReportsService } from "./reports.service";

type HeaderResponse = { set(headers: Record<string, string | number>): void };

@Controller()
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post("reports/generate")
  async generate(@Body() dto: GenerateReportRequestDto, @CurrentUser() user: AuthenticatedUser) {
    const report = await this.reports.generateForScan(dto.scanId, dto.reportType, user, dto, dto.assetId);
    return {
      message: "Report generated successfully",
      report: {
        ...report,
        pdfUrl: `/reports/${report.id}/download`,
        htmlUrl: `/reports/${report.id}/html`,
        jsonUrl: `/reports/${report.id}/json`,
        csvUrl: `/reports/${report.id}/findings.csv`,
      },
    };
  }

  @Post("scans/:id/reports")
  generateForScan(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.generateForScan(id, dto.reportType, user, dto);
  }

  @Get("reports")
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.findAll(user);
  }

  @Get("reports/:id")
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.findById(id, user);
  }

  @Get("reports/:id/download")
  async download(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const { pdf, filename } = await this.reports.renderDownload(id, user);
    response.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": pdf.length });
    return new StreamableFile(pdf);
  }

  @Get("reports/:id/html")
  async html(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const html = await this.reports.renderHtml(id, user);
    response.set({ "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html) });
    return new StreamableFile(Buffer.from(html));
  }

  @Get("reports/:id/json")
  async json(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const { contents, filename } = await this.reports.renderJson(id, user);
    response.set({ "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": contents.length });
    return new StreamableFile(contents);
  }

  @Get("reports/:id/findings.csv")
  async csv(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    const { contents, filename } = await this.reports.renderCsv(id, user);
    response.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": contents.length });
    return new StreamableFile(contents);
  }

  @Delete("reports/:id")
  delete(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.delete(id, user);
  }
}
