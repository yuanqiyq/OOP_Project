package com.example.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.example.backend.model.appointments.Appointment;
import com.example.backend.model.clinic.Clinic;
import com.example.backend.model.queue.QueueLog;
import com.example.backend.model.report.DailyReport;
import com.example.backend.repo.AppointmentRepository;
import com.example.backend.repo.ClinicRepository;
import com.example.backend.repo.QueueRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service: ReportService
 *
 * Purpose: Generates daily clinic reports with aggregated metrics
 *
 * Key Features:
 * - Calculates patients seen (completed queue entries)
 * - Computes average wait time from queue check-in to completion
 * - Determines no-show rate (appointments without queue entries)
 * - Generates comprehensive clinic reports
 *
 * Dependencies:
 * - QueueRepository: Query queue logs
 * - AppointmentRepository: Query appointments
 * - ClinicRepository: Query clinic details
 *
 * Version: 1.0
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final QueueRepository queueRepository;
    private final AppointmentRepository appointmentRepository;
    private final ClinicRepository clinicRepository;

    /**
     * Generate a daily report for a specific clinic
     *
     * @param clinicId The clinic ID
     * @param date     The report date (defaults to today if null)
     * @return DailyReport with aggregated metrics
     */
    public DailyReport generateReport(Long clinicId, LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        // Get clinic details
        Optional<Clinic> clinicOpt = clinicRepository.findById(clinicId);
        if (clinicOpt.isEmpty()) {
            throw new IllegalArgumentException("Clinic not found with ID: " + clinicId);
        }
        Clinic clinic = clinicOpt.get();

        // Create report with clinic information
        DailyReport report = new DailyReport(clinicId, clinic.getName(), date);

        // Calculate metrics
        int patientsSeen = getPatientsSeen(clinicId, date);
        double avgWaitTime = getAverageWaitTime(clinicId, date);
        double noShowRate = getNoShowRate(clinicId, date);

        // Set metrics
        report.setPatientsSeen(patientsSeen);
        report.setAvgWaitTimeMinutes(avgWaitTime);
        report.setNoShowRatePercent(noShowRate);

        return report;
    }

    /**
     * Get count of patients seen (completed queue entries) for a specific date
     *
     * @param clinicId The clinic ID
     * @param date     The date to query
     * @return Count of patients with DONE status
     */
    public int getPatientsSeen(Long clinicId, LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Get all queue logs for the clinic
        List<QueueLog> queueLogs = queueRepository.findByClinicId(clinicId);

        // Filter by date and DONE status
        long count = queueLogs.stream()
                .filter(q -> q.getCreatedAt() != null)
                .filter(q -> !q.getCreatedAt().isBefore(startOfDay) && q.getCreatedAt().isBefore(endOfDay))
                .filter(q -> QueueLog.STATUS_DONE.equals(q.getStatus()))
                .count();

        return (int) count;
    }

    /**
     * Calculate average wait time in minutes for completed appointments
     * Wait time = time from queue check-in (created_at) to when appointment
     * actually starts (appointment_start)
     *
     * @param clinicId The clinic ID
     * @param date     The date to query
     * @return Average wait time in minutes
     */
    public double getAverageWaitTime(Long clinicId, LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Get all completed queue logs for the date
        List<QueueLog> queueLogs = queueRepository.findByClinicId(clinicId);

        List<Double> waitTimes = new ArrayList<>();

        for (QueueLog queueLog : queueLogs) {
            // Filter by date and DONE status
            if (queueLog.getCreatedAt() != null &&
                    !queueLog.getCreatedAt().isBefore(startOfDay) &&
                    queueLog.getCreatedAt().isBefore(endOfDay) &&
                    QueueLog.STATUS_DONE.equals(queueLog.getStatus())) {

                // Calculate wait time: from check-in (created_at) to when appointment actually
                // starts (appointment_start)
                LocalDateTime checkInTime = queueLog.getCreatedAt();
                LocalDateTime appointmentStartTime = queueLog.getAppointmentStart();

                // Only calculate if appointment_start is set and after check-in
                if (appointmentStartTime != null && appointmentStartTime.isAfter(checkInTime)) {
                    // Calculate in seconds first, then convert to fractional minutes
                    long waitSeconds = ChronoUnit.SECONDS.between(checkInTime, appointmentStartTime);
                    double waitMinutes = waitSeconds / 60.0;
                    waitTimes.add(waitMinutes);
                }
            }
        }

        // Calculate average
        if (waitTimes.isEmpty()) {
            return 0.0;
        }

        double sum = waitTimes.stream().mapToDouble(Double::doubleValue).sum();
        return sum / waitTimes.size();
    }

    /**
     * Calculate no-show rate as percentage
     * No-show = appointments explicitly marked with NO_SHOW status
     * Rate = (appointments with NO_SHOW status) / (ALL appointments) * 100
     *
     * @param clinicId The clinic ID
     * @param date     The date to query
     * @return No-show rate as percentage
     */
    public double getNoShowRate(Long clinicId, LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        // Get all appointments for the clinic on that date
        List<Appointment> appointments = appointmentRepository.findByClinicIdAndDateTimeBetween(
                clinicId, startOfDay, endOfDay);

        if (appointments.isEmpty()) {
            return 0.0;
        }

        // Count appointments marked as NO_SHOW
        long noShowCount = appointments.stream()
                .filter(appt -> appt.getApptStatus() != null)
                .filter(appt -> appt.getApptStatus().getValue().equalsIgnoreCase("no-show"))
                .count();

        // Calculate percentage based on ALL appointments
        return (double) noShowCount / appointments.size() * 100.0;
    }
}
