package com.example.backend.model.report;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model: DailyReport
 *
 * Purpose: Represents a daily clinic report with aggregated metrics
 *
 * Key Features:
 * - Clinic-specific daily statistics
 * - Patient count, wait times, and no-show tracking
 * - Generated timestamp for audit trail
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DailyReport {

    private Long clinicId;
    private String clinicName;
    private LocalDate reportDate;
    private LocalDateTime timeGenerated;
    private int patientsSeen;
    private double avgWaitTimeMinutes;
    private double noShowRatePercent;

    /**
     * Constructor with basic clinic information
     */
    public DailyReport(Long clinicId, String clinicName, LocalDate reportDate) {
        this.clinicId = clinicId;
        this.clinicName = clinicName;
        this.reportDate = reportDate;
        this.timeGenerated = LocalDateTime.now();
        this.patientsSeen = 0;
        this.avgWaitTimeMinutes = 0.0;
        this.noShowRatePercent = 0.0;
    }
}
