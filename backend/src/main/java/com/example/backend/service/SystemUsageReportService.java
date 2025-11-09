package com.example.backend.service;

import com.example.backend.model.appointments.Appointment;
import com.example.backend.model.queue.QueueLog;
import com.example.backend.model.report.SystemUsageReport;
import com.example.backend.repo.AppointmentRepository;
import com.example.backend.repo.QueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service: SystemUsageReportService
 *
 * Purpose: Business logic for generating system-wide usage reports
 *
 * Key Features:
 * - Aggregate statistics across all clinics
 * - Calculate total appointments, cancellations, queue metrics
 * - Generate comprehensive system usage reports
 *
 * Dependencies:
 * - AppointmentRepository: Query appointment data
 * - QueueRepository: Query queue log data
 */
@Service
@RequiredArgsConstructor
public class SystemUsageReportService {

    private final AppointmentRepository appointmentRepository;
    private final QueueRepository queueRepository;

    /**
     * Generate a comprehensive system usage report for the specified date range
     *
     * @param startDate Start date of reporting period (defaults to first day of current month)
     * @param endDate End date of reporting period (defaults to today)
     * @return SystemUsageReport with all aggregated metrics
     */
    public SystemUsageReport generateSystemUsageReport(LocalDate startDate, LocalDate endDate) {
        // Set defaults if not provided
        if (startDate == null) {
            startDate = LocalDate.now().withDayOfMonth(1);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        // Convert to LocalDateTime for queries
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        // Build the report
        SystemUsageReport report = new SystemUsageReport();
        report.setReportTitle("System-Wide Usage Report");
        report.setStartDate(startDate);
        report.setEndDate(endDate);
        report.setTimeGenerated(LocalDateTime.now());

        // Calculate metrics
        report.setTotalAppointments(getTotalAppointments(startDateTime, endDateTime));
        report.setTotalCancellations(getTotalCancellations(startDateTime, endDateTime));
        report.setPatientsSeen(getPatientsSeen(startDateTime, endDateTime));
        report.setAvgWaitTimeMinutes(getAverageWaitTime(startDateTime, endDateTime));
        report.setNoShowRatePercent(getNoShowRate(startDateTime, endDateTime));

        return report;
    }

    /**
     * Count total appointments booked (excluding cancelled)
     *
     * @param startDateTime Start of date range
     * @param endDateTime End of date range
     * @return Count of non-cancelled appointments
     */
    public int getTotalAppointments(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<Appointment> allAppointments = appointmentRepository.findByDateTimeBetween(startDateTime, endDateTime);
        
        return (int) allAppointments.stream()
                .filter(appt -> appt.getApptStatus() != null && 
                               !appt.getApptStatus().getValue().equalsIgnoreCase("cancelled"))
                .count();
    }

    /**
     * Count total cancelled appointments
     *
     * @param startDateTime Start of date range
     * @param endDateTime End of date range
     * @return Count of cancelled appointments
     */
    public int getTotalCancellations(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<Appointment> allAppointments = appointmentRepository.findByDateTimeBetween(startDateTime, endDateTime);
        
        return (int) allAppointments.stream()
                .filter(appt -> appt.getApptStatus() != null && 
                               appt.getApptStatus().getValue().equalsIgnoreCase("cancelled"))
                .count();
    }

    /**
     * Count patients seen (completed queue entries)
     *
     * @param startDateTime Start of date range
     * @param endDateTime End of date range
     * @return Count of completed queue entries
     */
    public int getPatientsSeen(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<QueueLog> allQueueLogs = queueRepository.findAll();
        
        return (int) allQueueLogs.stream()
                .filter(log -> QueueLog.STATUS_DONE.equals(log.getStatus()))
                .filter(log -> log.getCreatedAt() != null)
                .filter(log -> !log.getCreatedAt().isBefore(startDateTime) && 
                              !log.getCreatedAt().isAfter(endDateTime))
                .count();
    }

    /**
     * Calculate average waiting time for completed appointments
     *
     * Waiting time = appointment_start - created_at (check-in time)
     *
     * @param startDateTime Start of date range
     * @param endDateTime End of date range
     * @return Average wait time in minutes, or 0 if no data
     */
    public double getAverageWaitTime(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<QueueLog> allQueueLogs = queueRepository.findAll();
        
        // Filter for completed entries with both timestamps
        List<QueueLog> completedWithTimes = allQueueLogs.stream()
                .filter(log -> QueueLog.STATUS_DONE.equals(log.getStatus()))
                .filter(log -> log.getCreatedAt() != null && log.getAppointmentStart() != null)
                .filter(log -> !log.getCreatedAt().isBefore(startDateTime) && 
                              !log.getCreatedAt().isAfter(endDateTime))
                .toList();

        if (completedWithTimes.isEmpty()) {
            return 0.0;
        }

        // Calculate average wait time
        double totalWaitMinutes = completedWithTimes.stream()
                .mapToLong(log -> ChronoUnit.MINUTES.between(log.getCreatedAt(), log.getAppointmentStart()))
                .average()
                .orElse(0.0);

        // Round to 2 decimal places
        return Math.round(totalWaitMinutes * 100.0) / 100.0;
    }

    /**
     * Calculate no-show rate
     *
     * No-show = appointments that have no queue_log entry at all
     * Rate = (appointments without queue_log) / (total appointments) * 100
     *
     * @param startDateTime Start of date range
     * @param endDateTime End of date range
     * @return No-show rate as percentage, or 0 if no appointments
     */
    public double getNoShowRate(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<Appointment> allAppointments = appointmentRepository.findByDateTimeBetween(startDateTime, endDateTime);
        
        if (allAppointments.isEmpty()) {
            return 0.0;
        }

        // Count appointments that have no queue log entry
        long noShowCount = allAppointments.stream()
                .filter(appt -> {
                    List<QueueLog> logs = queueRepository.findByAppointmentId(appt.getAppointmentId());
                    return logs.isEmpty();
                })
                .count();

        // Calculate percentage
        double rate = (noShowCount * 100.0) / allAppointments.size();
        
        // Round to 2 decimal places
        return Math.round(rate * 100.0) / 100.0;
    }
}
