package com.example.backend.util;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

import com.example.backend.model.report.DailyReport;
import com.example.backend.model.report.SystemUsageReport;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;

/**
 * Utility: PdfGenerator
 *
 * Purpose: Generates PDF documents for clinic reports
 *
 * Key Features:
 * - Professional PDF layout with headers and footers
 * - Tabular data presentation
 * - Consistent formatting and styling
 * - Uses iText 7 library
 *
 * Version: 1.0
 */
public class PdfGenerator {

    // Color scheme
    private static final DeviceRgb HEADER_COLOR = new DeviceRgb(41, 128, 185); // Professional blue
    private static final DeviceRgb TABLE_HEADER_COLOR = new DeviceRgb(52, 152, 219); // Lighter blue

    /**
     * Generate a PDF report from DailyReport data
     *
     * @param report The DailyReport object containing data
     * @return byte array of the generated PDF
     * @throws Exception if PDF generation fails
     */
    public static byte[] generateDailyReportPdf(DailyReport report) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        // Initialize PDF writer and document
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc, PageSize.A4);
        
        // Set margins
        document.setMargins(50, 50, 50, 50);

        // Add title
        Paragraph title = new Paragraph("Daily Clinic Report")
                .setFontSize(24)
                .setBold()
                .setFontColor(HEADER_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(10);
        document.add(title);

        // Add clinic name
        Paragraph clinicName = new Paragraph("Clinic: " + report.getClinicName())
                .setFontSize(16)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
        document.add(clinicName);

        // Add generation timestamp
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        
        Paragraph reportInfo = new Paragraph()
                .add("Report Date: " + report.getReportDate().format(dateFormatter) + "\n")
                .add("Generated on: " + report.getTimeGenerated().format(dateTimeFormatter))
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(30);
        document.add(reportInfo);

        // Add separator line
        document.add(new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20));

        // Create metrics table
        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        table.setWidth(UnitValue.createPercentValue(80));
        table.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);

        // Add table header
        Cell headerCell1 = new Cell()
                .add(new Paragraph("Metric").setBold())
                .setBackgroundColor(TABLE_HEADER_COLOR)
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(10);
        
        Cell headerCell2 = new Cell()
                .add(new Paragraph("Value").setBold())
                .setBackgroundColor(TABLE_HEADER_COLOR)
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(10);
        
        table.addHeaderCell(headerCell1);
        table.addHeaderCell(headerCell2);

        // Add data rows
        addTableRow(table, "Patients Seen", String.valueOf(report.getPatientsSeen()));
        addTableRow(table, "Average Wait Time", String.format("%.2f minutes", report.getAvgWaitTimeMinutes()));
        addTableRow(table, "No-Show Rate", String.format("%.2f%%", report.getNoShowRatePercent()));

        document.add(table);

        // Add footer with disclaimer
        Paragraph footer = new Paragraph("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(40);
        document.add(footer);

        Paragraph confidential = new Paragraph("Confidential — Clinic Internal Use Only")
                .setFontSize(10)
                .setItalic()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.DARK_GRAY);
        document.add(confidential);

        // Close document
        document.close();

        return baos.toByteArray();
    }

    /**
     * Helper method to add a row to the metrics table
     *
     * @param table The table to add the row to
     * @param metric The metric name
     * @param value The metric value
     */
    private static void addTableRow(Table table, String metric, String value) {
        Cell cell1 = new Cell()
                .add(new Paragraph(metric))
                .setPadding(10)
                .setTextAlignment(TextAlignment.LEFT);
        
        Cell cell2 = new Cell()
                .add(new Paragraph(value).setBold())
                .setPadding(10)
                .setTextAlignment(TextAlignment.CENTER);
        
        table.addCell(cell1);
        table.addCell(cell2);
    }

    /**
     * Generate a PDF report from SystemUsageReport data
     *
     * @param report The SystemUsageReport object containing data
     * @return byte array of the generated PDF
     * @throws Exception if PDF generation fails
     */
    public static byte[] generateSystemUsageReportPdf(SystemUsageReport report) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        // Initialize PDF writer and document
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc, PageSize.A4);
        
        // Set margins
        document.setMargins(50, 50, 50, 50);

        // Add title
        Paragraph title = new Paragraph("System-Wide Usage Report")
                .setFontSize(24)
                .setBold()
                .setFontColor(HEADER_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(10);
        document.add(title);

        // Add reporting period
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Paragraph period = new Paragraph("Period: " + 
                report.getStartDate().format(dateFormatter) + " to " + 
                report.getEndDate().format(dateFormatter))
                .setFontSize(16)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
        document.add(period);

        // Add generation timestamp
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        Paragraph generatedOn = new Paragraph("Generated on: " + 
                report.getTimeGenerated().format(dateTimeFormatter))
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(30);
        document.add(generatedOn);

        // Add separator line
        document.add(new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20));

        // Create metrics table
        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}));
        table.setWidth(UnitValue.createPercentValue(80));
        table.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);

        // Add table header
        Cell headerCell1 = new Cell()
                .add(new Paragraph("Metric").setBold())
                .setBackgroundColor(TABLE_HEADER_COLOR)
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(10);
        
        Cell headerCell2 = new Cell()
                .add(new Paragraph("Value").setBold())
                .setBackgroundColor(TABLE_HEADER_COLOR)
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(10);
        
        table.addHeaderCell(headerCell1);
        table.addHeaderCell(headerCell2);

        // Add data rows
        addTableRow(table, "Total Appointments Booked", String.valueOf(report.getTotalAppointments()));
        addTableRow(table, "Total Cancellations", String.valueOf(report.getTotalCancellations()));
        addTableRow(table, "Patients Seen", String.valueOf(report.getPatientsSeen()));
        addTableRow(table, "Average Waiting Time (minutes)", String.format("%.2f", report.getAvgWaitTimeMinutes()));
        addTableRow(table, "No-Show Rate (%)", String.format("%.2f", report.getNoShowRatePercent()));

        document.add(table);

        // Add footer with disclaimer
        Paragraph footer = new Paragraph("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(40);
        document.add(footer);

        Paragraph confidential = new Paragraph("Confidential — Internal Use Only")
                .setFontSize(10)
                .setItalic()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(ColorConstants.DARK_GRAY);
        document.add(confidential);

        // Close document
        document.close();

        return baos.toByteArray();
    }
}
