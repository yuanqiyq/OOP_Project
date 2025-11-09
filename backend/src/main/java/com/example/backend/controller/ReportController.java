package com.example.backend.controller;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.model.report.DailyReport;
import com.example.backend.service.ReportService;
import com.example.backend.util.PdfGenerator;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * Controller: ReportController
 *
 * Purpose: REST API endpoints for generating clinic reports
 *
 * Key Features:
 * - Generate daily clinic reports in PDF format
 * - Support for specific date queries
 * - Return PDF files as HTTP response
 *
 * Dependencies:
 * - ReportService: Business logic for report generation
 * - PdfGenerator: Utility for PDF document creation
 *
 * Endpoints:
 * - GET /api/report/daily: Generate daily report for a specific clinic
 *
 * Version: 1.0
 */
@RestController
@RequestMapping("/api/report")
@CrossOrigin(origins = "*")
@Tag(name = "Report Management", description = "APIs for generating clinic reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Generate a daily clinic report in PDF format
     *
     * @param clinicId The clinic ID (required)
     * @param dateStr The report date in ISO format (yyyy-MM-dd), defaults to today
     * @return PDF file as byte array with appropriate headers
     */
    @GetMapping("/daily")
    @Operation(
        summary = "Generate Daily Clinic Report",
        description = "Generates a comprehensive daily report for a specific clinic including patients seen, average wait time, and no-show rate. Returns a PDF file."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "PDF report generated successfully", 
                     content = @Content(mediaType = "application/pdf")),
        @ApiResponse(responseCode = "400", description = "Invalid clinic ID or date format"),
        @ApiResponse(responseCode = "404", description = "Clinic not found"),
        @ApiResponse(responseCode = "500", description = "Error generating PDF report")
    })
    public ResponseEntity<?> generateDailyReport(
            @Parameter(description = "Clinic ID", required = true)
            @RequestParam Long clinicId,
            @Parameter(description = "Report date in ISO format (yyyy-MM-dd), defaults to today", example = "2025-11-09")
            @RequestParam(required = false) String date) {
        
        try {
            // Parse date parameter
            LocalDate reportDate;
            if (date != null && !date.isEmpty()) {
                try {
                    reportDate = LocalDate.parse(date, DATE_FORMATTER);
                } catch (DateTimeParseException e) {
                    return ResponseEntity.badRequest()
                            .body("Invalid date format. Please use yyyy-MM-dd format (e.g., 2025-11-09)");
                }
            } else {
                reportDate = LocalDate.now();
            }

            // Generate report
            DailyReport report = reportService.generateReport(clinicId, reportDate);

            // Generate PDF
            byte[] pdfBytes = PdfGenerator.generateDailyReportPdf(report);

            // Set response headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData(
                "inline", 
                "ClinicReport_" + report.getClinicName().replaceAll("\\s+", "_") + "_" + 
                reportDate.format(DATE_FORMATTER) + ".pdf"
            );
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Clinic not found: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating report: " + e.getMessage());
        }
    }
}
