package com.example.backend.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dto.QueueEntryDTO;
import com.example.backend.event.QueueChangedEvent;
import com.example.backend.dto.QueuePositionDTO;
import com.example.backend.exception.QueueException;
import com.example.backend.model.appointments.Appointment;
import com.example.backend.model.queue.QueueLog;
import com.example.backend.repo.AppointmentRepository;
import com.example.backend.repo.QueueRepository;

import lombok.RequiredArgsConstructor;

/**
 * Service: QueueService
 *
 * Purpose: Business logic for queue management operations
 *
 * Key Features:
 * - Patient check-in and queue entry creation
 * - Active queue retrieval with sorting by priority and time
 * - Queue position calculation
 * - Status management with transition validation
 * - Missed patient return handling
 * - Transaction management for data consistency
 *
 * Dependencies:
 * - QueueRepository: Data access for queue entries
 * - AppointmentRepository: Validate appointment existence
 *
 * Version: 1.0
 */
@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueRepository queueRepository;
    private final AppointmentRepository appointmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Check in a patient - create a new queue entry
     *
     * @param appointmentId ID of the patient's appointment
     * @param priority      Priority level (1=Normal, 2=Elderly, 3=Emergency)
     * @return Created QueueLog entry
     * @throws QueueException if appointment not found or duplicate IN_QUEUE entry
     *                        exists
     */
    @Transactional
    public QueueLog checkInPatient(Long appointmentId, Integer priority) {
        // Validate priority
        if (!QueueLog.isValidPriority(priority)) {
            throw new QueueException("Invalid priority. Must be 1 (Normal), 2 (Elderly), or 3 (Emergency)");
        }

        // Validate appointment exists
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new QueueException("Appointment not found with ID: " + appointmentId));

        // Prevent duplicate IN_QUEUE entries for the same appointment
        if (queueRepository.existsByAppointmentIdAndStatus(appointmentId, QueueLog.STATUS_IN_QUEUE)) {
            throw new QueueException("Patient already has an active queue entry for this appointment");
        }

        // Create new queue entry
        QueueLog queueEntry = new QueueLog(
                appointment.getClinicId(),
                appointmentId,
                priority);

        QueueLog saved = queueRepository.save(queueEntry);

        // Notify SSE listeners that queue changed
        eventPublisher.publishEvent(new QueueChangedEvent(appointment.getClinicId()));

        return saved;
    }

    /**
     * Get the active queue for a clinic, sorted by priority DESC then created_at
     * ASC
     *
     * @param clinicId ID of the clinic
     * @return List of queue entries (only IN_QUEUE status)
     */
    @Transactional(readOnly = true)
    public List<QueueLog> getClinicQueue(Long clinicId) {
        return queueRepository.findByClinicIdAndStatusOrderByPriorityDescCreatedAtAsc(
                clinicId,
                QueueLog.STATUS_IN_QUEUE);
    }

    /**
     * Get queue entries for a clinic as DTOs with position information
     *
     * @param clinicId ID of the clinic
     * @return List of QueueEntryDTOs with calculated positions
     */
    @Transactional(readOnly = true)
    public List<QueueEntryDTO> getClinicQueueWithDetails(Long clinicId) {
        List<QueueLog> queueEntries = getClinicQueue(clinicId);
        long totalInQueue = queueEntries.size();

        return queueEntries.stream()
                .map((entry) -> {
                    Integer position = queueEntries.indexOf(entry) + 1;
                    return convertToQueueEntryDTO(entry, position, (int) totalInQueue);
                })
                .collect(Collectors.toList());
    }

    /**
     * Calculate the queue position for a specific appointment
     *
     * @param appointmentId ID of the appointment
     * @return QueuePositionDTO with position information
     * @throws QueueException if appointment not found or not in queue
     */
    @Transactional(readOnly = true)
    public QueuePositionDTO getQueuePosition(Long appointmentId) {
        // Find the queue entry for this appointment
        Optional<QueueLog> queueEntry = queueRepository.findByAppointmentIdAndStatus(
                appointmentId,
                QueueLog.STATUS_IN_QUEUE);

        if (queueEntry.isEmpty()) {
            throw new QueueException("No active queue entry found for appointment ID: " + appointmentId);
        }

        QueueLog entry = queueEntry.get();

        // Get the full queue to calculate position
        List<QueueLog> clinicQueue = getClinicQueue(entry.getClinicId());
        int position = clinicQueue.indexOf(entry) + 1;
        int totalInQueue = clinicQueue.size();

        // Build position DTO
        String message = buildPositionMessage(position);

        return QueuePositionDTO.builder()
                .appointmentId(appointmentId)
                .position(position)
                .status(entry.getStatus())
                .priority(entry.getPriority())
                .totalInQueue(totalInQueue)
                .estimatedWaitTimeMinutes(estimateWaitTime(position))
                .message(message)
                .isQueued(true)
                .build();
    }

    /**
     * Update the status of a queue entry
     * Valid transitions: IN_QUEUE → DONE or MISSED
     *
     * @param queueId   ID of the queue entry
     * @param newStatus New status (DONE or MISSED)
     * @return Updated QueueLog entry
     * @throws QueueException if queue entry not found or invalid transition
     */
    @Transactional
    public QueueLog updateQueueStatus(Long queueId, String newStatus) {
        // Validate new status
        if (!QueueLog.isValidStatus(newStatus)) {
            throw new QueueException("Invalid status: " + newStatus +
                    ". Valid statuses are: IN_QUEUE, DONE, MISSED");
        }

        // Find queue entry
        QueueLog queueEntry = queueRepository.findById(queueId)
                .orElseThrow(() -> new QueueException("Queue entry not found with ID: " + queueId));

        // Validate status transition
        if (!QueueLog.isValidTransition(queueEntry.getStatus(), newStatus)) {
            throw new QueueException(
                    "Invalid status transition from " + queueEntry.getStatus() +
                            " to " + newStatus + ". Can only transition from IN_QUEUE to DONE or MISSED");
        }

        // Update status
        queueEntry.setStatus(newStatus);
        QueueLog saved = queueRepository.save(queueEntry);

        // Notify SSE listeners that queue changed
        eventPublisher.publishEvent(new QueueChangedEvent(queueEntry.getClinicId()));

        return saved;
    }

    /**
     * Handle missed patient return - create a new queue entry for them
     * The original MISSED entry is kept for audit purposes
     *
     * @param appointmentId ID of the original appointment
     * @param newPriority   New priority assigned by staff
     * @return Newly created QueueLog entry
     * @throws QueueException if appointment or original queue entry not found
     */
    @Transactional
    public QueueLog handleMissedPatientReturn(Long appointmentId, Integer newPriority) {
        // Validate priority
        if (!QueueLog.isValidPriority(newPriority)) {
            throw new QueueException("Invalid priority. Must be 1 (Normal), 2 (Elderly), or 3 (Emergency)");
        }

        // Verify appointment exists
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new QueueException("Appointment not found with ID: " + appointmentId));

        // Verify original MISSED entry exists
        Optional<QueueLog> missedEntry = queueRepository.findByAppointmentIdAndStatus(
                appointmentId,
                QueueLog.STATUS_MISSED);

        if (missedEntry.isEmpty()) {
            throw new QueueException("No MISSED queue entry found for appointment ID: " + appointmentId);
        }

        // Create new queue entry (original MISSED entry is kept)
        QueueLog newQueueEntry = new QueueLog(
                appointment.getClinicId(),
                appointmentId,
                newPriority);

        QueueLog saved = queueRepository.save(newQueueEntry);

        // Notify SSE listeners that queue changed
        eventPublisher.publishEvent(new QueueChangedEvent(appointment.getClinicId()));

        return saved;
    }

    /**
     * Get all queue entries for an appointment (including history)
     *
     * @param appointmentId ID of the appointment
     * @return List of all queue entries for this appointment
     */
    @Transactional(readOnly = true)
    public List<QueueLog> getAppointmentQueueHistory(Long appointmentId) {
        return queueRepository.findByAppointmentId(appointmentId);
    }

    /**
     * Check if an appointment has an active queue entry
     *
     * @param appointmentId ID of the appointment
     * @return true if appointment is in queue, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean isAppointmentInQueue(Long appointmentId) {
        return queueRepository.existsByAppointmentIdAndStatus(
                appointmentId,
                QueueLog.STATUS_IN_QUEUE);
    }

    /**
     * Get the currently serving patient for a clinic
     *
     * @param clinicId ID of the clinic
     * @return QueueLog entry of patient being served (position #1)
     */
    @Transactional(readOnly = true)
    public Optional<QueueLog> getCurrentlyServing(Long clinicId) {
        return queueRepository.findCurrentlyServing(clinicId);
    }

    /**
     * Get total queue count for a clinic
     *
     * @param clinicId ID of the clinic
     * @return Number of IN_QUEUE entries
     */
    @Transactional(readOnly = true)
    public long getQueueCount(Long clinicId) {
        return queueRepository.countByClinicIdAndStatus(clinicId, QueueLog.STATUS_IN_QUEUE);
    }

    /**
     * Get all missed queue entries for a clinic
     * Used to identify patients who didn't show up and can be re-queued
     * Excludes appointments that have a DONE status (already completed)
     *
     * @param clinicId ID of the clinic
     * @return List of missed queue entries that can still be re-queued
     */
    @Transactional(readOnly = true)
    public List<QueueLog> getMissedQueueEntries(Long clinicId) {
        // Get all MISSED entries for the clinic
        List<QueueLog> missedEntries = queueRepository.findByClinicIdAndStatus(clinicId, QueueLog.STATUS_MISSED);

        // Filter out appointments that have a DONE status (already completed)
        return missedEntries.stream()
                .filter(entry -> {
                    // Check if this appointment has a DONE entry
                    boolean hasDoneEntry = queueRepository.existsByAppointmentIdAndStatus(
                            entry.getAppointmentId(),
                            QueueLog.STATUS_DONE);
                    // Only include if it doesn't have a DONE entry (can still be re-queued)
                    return !hasDoneEntry;
                })
                .collect(Collectors.toList());
    }

    // Helper methods

    /**
     * Convert QueueLog entity to QueueEntryDTO with position information
     */
    private QueueEntryDTO convertToQueueEntryDTO(QueueLog queueLog, Integer position, Integer totalInQueue) {
        // Fetch appointment details if needed
        Optional<Appointment> appointment = appointmentRepository.findById(queueLog.getAppointmentId());

        return QueueEntryDTO.builder()
                .queueId(queueLog.getQueueId())
                .clinicId(queueLog.getClinicId())
                .appointmentId(queueLog.getAppointmentId())
                .patientId(appointment.map(Appointment::getPatientId).orElse(null))
                .doctorId(appointment.map(Appointment::getDoctorId).orElse(null))
                .appointmentDateTime(appointment.map(Appointment::getDateTime).orElse(null))
                .status(queueLog.getStatus())
                .priority(queueLog.getPriority())
                .position(position)
                .createdAt(queueLog.getCreatedAt())
                .totalInQueue(totalInQueue)
                .estimatedWaitTimeMinutes(estimateWaitTime(position))
                .build();
    }

    /**
     * Build a user-friendly position message
     */
    private String buildPositionMessage(Integer position) {
        if (position == 1) {
            return "You are being served now";
        } else if (position == 2) {
            return "You are next";
        } else {
            return (position - 1) + " patients ahead of you";
        }
    }

    /**
     * Estimate wait time based on position
     * Simple calculation: 10 minutes per patient ahead
     * Can be enhanced with historical data
     */
    private Integer estimateWaitTime(Integer position) {
        if (position == 1) {
            return 0;
        }
        return (position - 1) * 10; // 10 minutes per patient
    }
}
