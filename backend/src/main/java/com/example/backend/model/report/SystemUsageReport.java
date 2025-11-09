package com.example.backend.model.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Model class representing a system-wide usage report
 * 
 * This report provides an overall summary of system performance across all clinics
 * including appointments, cancellations, queue statistics, and no-show rates.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemUsageReport {
    
    /**
     * Title of the report
     */
    private String reportTitle;
    
    /**
     * Start date of the reporting period
     */
    private LocalDate startDate;
    
    /**
     * End date of the reporting period
     */
    private LocalDate endDate;
    
    /**
     * Timestamp when the report was generated
     */
    private LocalDateTime timeGenerated;
    
    /**
     * Total number of appointments booked (excluding cancelled)
     */
    private int totalAppointments;
    
    /**
     * Total number of cancelled appointments
     */
    private int totalCancellations;
    
    /**
     * Number of patients who were seen (completed status in queue_log)
     */
    private int patientsSeen;
    
    /**
     * Average waiting time in minutes from check-in to appointment start
     */
    private double avgWaitTimeMinutes;
    
    /**
     * Percentage of appointments that resulted in no-shows
     */
    private double noShowRatePercent;
}
