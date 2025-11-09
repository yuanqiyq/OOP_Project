package com.example.backend.controller;

import com.example.backend.model.report.SystemUsageReport;
import com.example.backend.service.SystemUsageReportService;
import com.example.backend.util.PdfGenerator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Controller: SystemUsageReportController
 *
 * Purpose: REST API endpoints for system-wide usage reports
 *
 * Endpoints:
 * - GET /api/report/system-usage: Generate system-wide usage report in PDF format
 *
 * Features:
 * - Flexible date range selection (defaults to current month)
 * - Aggregates statistics across all clinics
 * - Professional PDF output
 *
 * Version: 1.0
 */
@RestController
@RequestMapping("/api/report")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "System Reports", description = "APIs for generating system-wide usage reports")
public class SystemUsageReportController {

    private final SystemUsageReportService reportService;

    /**
     * Generate a system-wide usage report in PDF format
     *
     * Provides comprehensive statistics across all clinics including:
     * - Total appointments booked (excluding cancelled)
     * - Total cancellations
     * - Patients seen (completed appointments)
     * - Average waiting time
     * - No-show rate
     *
     * Default date range: First day of current month to today
     *
     * @param startDate Optional start date (ISO format: yyyy-MM-dd)
     * @param endDate Optional end date (ISO format: yyyy-MM-dd)
     * @return PDF file as byte stream with Content-Disposition inline
     */
    @GetMapping("/system-usage")
    @Operation(
        summary = "Generate system-wide usage report",
        description = "Creates a comprehensive PDF report of system performance across all clinics for the specified date range. " +
                     "Default range is from the first day of current month to today."
    )
    public ResponseEntity<byte[]> generateSystemUsageReport(
            @Parameter(description = "Start date of reporting period (yyyy-MM-dd)", example = "2025-11-01")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
            LocalDate startDate,
            
            @Parameter(description = "End date of reporting period (yyyy-MM-dd)", example = "2025-11-09")
            @RequestParam(required = false) 
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) 
            LocalDate endDate) {

        try {
            // Generate the report data
            SystemUsageReport report = reportService.generateSystemUsageReport(startDate, endDate);

            // Generate PDF
            byte[] pdfBytes = PdfGenerator.generateSystemUsageReportPdf(report);

            // Format dates for filename
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
            String startDateStr = report.getStartDate().format(formatter);
            String endDateStr = report.getEndDate().format(formatter);
            String filename = String.format("SystemUsageReport_%s_%s.pdf", startDateStr, endDateStr);

            // Set response headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", filename);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            // Log error and return error response
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(("Error generating report: " + e.getMessage()).getBytes());
        }
    }
}
