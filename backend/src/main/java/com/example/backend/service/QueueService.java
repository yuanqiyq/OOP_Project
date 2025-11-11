package com.example.backend.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
import com.example.backend.model.Patient;
import com.example.backend.model.Doctor;
import com.example.backend.model.clinic.Clinic;
import com.example.backend.model.appointments.Appointment;
import com.example.backend.model.appointments.AppointmentStatus;
import com.example.backend.model.notification.NotificationRequest;
import com.example.backend.model.queue.QueueLog;
import com.example.backend.repo.AppointmentRepository;
import com.example.backend.repo.ClinicRepository;
import com.example.backend.repo.DoctorRepository;
import com.example.backend.repo.PatientRepository;
import com.example.backend.repo.QueueRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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
@Slf4j
public class QueueService {

    private final QueueRepository queueRepository;
    private final AppointmentRepository appointmentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;
    private final PatientRepository patientRepository;
    private final ClinicRepository clinicRepository;
    private final DoctorRepository doctorRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

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

        // Check and send queue position notifications (position 1 and position 3)
        checkAndSendQueueNotifications(appointment.getClinicId());

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
     * Handles both IN_QUEUE and CALLED status entries
     *
     * @param appointmentId ID of the appointment
     * @return QueuePositionDTO with position information
     * @throws QueueException if appointment not found or not in queue
     */
    @Transactional(readOnly = true)
    public QueuePositionDTO getQueuePosition(Long appointmentId) {
        // First try to find IN_QUEUE entry
        Optional<QueueLog> queueEntry = queueRepository.findByAppointmentIdAndStatus(
                appointmentId,
                QueueLog.STATUS_IN_QUEUE);

        // If not found, check for CALLED status
        if (queueEntry.isEmpty()) {
            queueEntry = queueRepository.findByAppointmentIdAndStatus(
                    appointmentId,
                    QueueLog.STATUS_CALLED);
        }

        if (queueEntry.isEmpty()) {
            throw new QueueException("No active queue entry found for appointment ID: " + appointmentId);
        }

        QueueLog entry = queueEntry.get();

        // If status is CALLED, return special response
        if (QueueLog.STATUS_CALLED.equals(entry.getStatus())) {
            // Get the full queue to calculate total (for context)
            List<QueueLog> clinicQueue = getClinicQueue(entry.getClinicId());
            int totalInQueue = clinicQueue.size();

            return QueuePositionDTO.builder()
                    .appointmentId(appointmentId)
                    .position(0) // Position 0 indicates called
                    .status(entry.getStatus())
                    .priority(entry.getPriority())
                    .totalInQueue(totalInQueue)
                    .estimatedWaitTimeMinutes(0) // No wait time when called
                    .message("You have been called - please proceed to reception")
                    .isQueued(true)
                    .build();
        }

        // For IN_QUEUE status, calculate position normally
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
     * Mark queue entry as DONE by appointment ID
     * Finds active queue entry (IN_QUEUE or CALLED) and marks it as DONE
     * Used when completing an appointment
     *
     * @param appointmentId ID of the appointment
     * @return Updated QueueLog entry
     * @throws QueueException if no active queue entry found
     */
    @Transactional
    public QueueLog markAppointmentDone(Long appointmentId) {
        // Find active queue entry (IN_QUEUE or CALLED)
        Optional<QueueLog> inQueueEntry = queueRepository.findByAppointmentIdAndStatus(
                appointmentId, QueueLog.STATUS_IN_QUEUE);
        Optional<QueueLog> calledEntry = queueRepository.findByAppointmentIdAndStatus(
                appointmentId, QueueLog.STATUS_CALLED);

        QueueLog queueEntry = inQueueEntry.orElse(calledEntry.orElse(null));

        if (queueEntry == null) {
            // No active queue entry found - this is okay, appointment might not be in queue
            log.info("No active queue entry found for appointment {}, skipping queue status update", appointmentId);
            return null;
        }

        // Update to DONE
        queueEntry.setStatus(QueueLog.STATUS_DONE);
        QueueLog saved = queueRepository.save(queueEntry);

        // Notify SSE listeners that queue changed
        eventPublisher.publishEvent(new QueueChangedEvent(queueEntry.getClinicId()));

        log.info("Marked queue entry {} (appointment {}) as DONE", saved.getQueueId(), appointmentId);
        return saved;
    }

    /**
     * Update the status of a queue entry
     * Valid transitions:
     * - IN_QUEUE → CALLED (staff explicitly calls patient)
     * - IN_QUEUE → MISSED (patient no-show before calling)
     * - CALLED → DONE (appointment completed)
     * - CALLED → MISSED (patient no-show after calling)
     *
     * @param queueId   ID of the queue entry
     * @param newStatus New status
     * @return Updated QueueLog entry
     * @throws QueueException if queue entry not found or invalid transition
     */
    @Transactional
    public QueueLog updateQueueStatus(Long queueId, String newStatus) {
        // Validate new status
        if (!QueueLog.isValidStatus(newStatus)) {
            throw new QueueException("Invalid status: " + newStatus +
                    ". Valid statuses are: IN_QUEUE, CALLED, DONE, MISSED");
        }

        // Find queue entry
        QueueLog queueEntry = queueRepository.findById(queueId)
                .orElseThrow(() -> new QueueException("Queue entry not found with ID: " + queueId));

        // Validate status transition
        if (!QueueLog.isValidTransition(queueEntry.getStatus(), newStatus)) {
            throw new QueueException(
                    "Invalid status transition from " + queueEntry.getStatus() +
                            " to " + newStatus + ". Valid transitions: IN_QUEUE→CALLED/MISSED, CALLED→DONE/MISSED");
        }

        // Get queue position before status change (for "your turn" notification)
        int queuePosition = 1; // Default to 1 if patient is being called
        if (QueueLog.STATUS_DONE.equals(newStatus) && QueueLog.STATUS_IN_QUEUE.equals(queueEntry.getStatus())) {
            try {
                QueuePositionDTO positionDTO = getQueuePosition(queueEntry.getAppointmentId());
                queuePosition = positionDTO.getPosition();
            } catch (QueueException e) {
                log.warn("Could not get queue position before status change: {}", e.getMessage());
            }
        }

        // Update status
        queueEntry.setStatus(newStatus);
        QueueLog saved = queueRepository.save(queueEntry);

        // If queue status is MISSED, update the appointment status to MISSED
        if (QueueLog.STATUS_MISSED.equals(newStatus)) {
            Optional<Appointment> appointmentOpt = appointmentRepository.findById(queueEntry.getAppointmentId());
            if (appointmentOpt.isPresent()) {
                Appointment appointment = appointmentOpt.get();
                appointment.setApptStatus(AppointmentStatus.MISSED);
                appointmentRepository.save(appointment);
                log.info("Updated appointment {} status to MISSED", queueEntry.getAppointmentId());
            } else {
                log.warn("Could not update appointment status: appointment {} not found", queueEntry.getAppointmentId());
            }
        }

        // Notify SSE listeners that queue changed
        eventPublisher.publishEvent(new QueueChangedEvent(queueEntry.getClinicId()));

        // Log status change
        if (QueueLog.STATUS_DONE.equals(newStatus)) {
            log.info("Status changed to DONE for queue entry {}", queueEntry.getQueueId());
        } else if (QueueLog.STATUS_CALLED.equals(newStatus)) {
            log.info("Status changed to CALLED for queue entry {}", queueEntry.getQueueId());
        } else if (QueueLog.STATUS_MISSED.equals(newStatus)) {
            log.info("Status changed to MISSED for queue entry {}", queueEntry.getQueueId());
        }

        // Check and send queue position notifications (only "three away" for position 3)
        checkAndSendQueueNotifications(queueEntry.getClinicId());

        return saved;
    }

    /**
     * Handle missed patient return - update existing MISSED entry to IN_QUEUE
     * Updates the most recent MISSED entry for the appointment instead of creating a duplicate
     *
     * @param appointmentId ID of the original appointment
     * @param newPriority   New priority assigned by staff
     * @return Updated QueueLog entry
     * @throws QueueException if appointment or MISSED queue entry not found
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

        // Find the most recent MISSED entry for this appointment
        Optional<QueueLog> missedEntry = queueRepository.findByAppointmentId(appointmentId)
                .stream()
                .filter(entry -> QueueLog.STATUS_MISSED.equals(entry.getStatus()))
                .max((e1, e2) -> e1.getCreatedAt().compareTo(e2.getCreatedAt())); // Get most recent

        if (missedEntry.isEmpty()) {
            throw new QueueException("No MISSED queue entry found for appointment ID: " + appointmentId);
        }

        QueueLog queueEntry = missedEntry.get();

        // Validate transition
        if (!QueueLog.isValidTransition(queueEntry.getStatus(), QueueLog.STATUS_IN_QUEUE)) {
            throw new QueueException("Invalid status transition from " + queueEntry.getStatus() + " to IN_QUEUE");
        }

        // Update appointment status back to SCHEDULED since patient is being requeued
        appointment.setApptStatus(AppointmentStatus.SCHEDULED);
        appointmentRepository.save(appointment);
        log.info("Updated appointment {} status to SCHEDULED (requeued)", appointmentId);

        // Update existing MISSED entry to IN_QUEUE
        queueEntry.setStatus(QueueLog.STATUS_IN_QUEUE);
        queueEntry.setPriority(newPriority);
        queueEntry.setCreatedAt(LocalDateTime.now()); // Update timestamp for queue ordering
        QueueLog saved = queueRepository.save(queueEntry);

        log.info("Updated MISSED queue entry {} (appointment {}) to IN_QUEUE with priority {}", 
                saved.getQueueId(), appointmentId, newPriority);

        // Notify SSE listeners that queue changed
        eventPublisher.publishEvent(new QueueChangedEvent(appointment.getClinicId()));

        // Check and send queue position notifications (position 1 and position 3)
        checkAndSendQueueNotifications(appointment.getClinicId());

        return saved;
    }

    /**
     * Call next patient in queue - staff-controlled queue progression
     *
     * Atomic operation:
     * 1. Mark current "being served" patient (CALLED) as DONE
     * 2. Call next waiting patient (position 1 IN_QUEUE) as CALLED
     * 3. Send "your turn" notification to newly called patient
     *
     * @param clinicId ID of the clinic
     * @return The newly called patient's QueueLog entry
     * @throws QueueException if no patients waiting in queue
     */
    @Transactional
    public QueueLog callNextQueueNumber(Long clinicId) {
        // Step 1: Mark current "being served" patient as DONE (if exists)
        Optional<QueueLog> currentlyServing = queueRepository.findByClinicIdAndStatus(
                clinicId,
                QueueLog.STATUS_CALLED).stream().findFirst();

        if (currentlyServing.isPresent()) {
            QueueLog current = currentlyServing.get();
            current.setStatus(QueueLog.STATUS_DONE);
            queueRepository.save(current);
            log.info("Marked currently serving patient (queue {}) as DONE", current.getQueueId());
        }

        // Step 2: Get next waiting patient (position 1 from IN_QUEUE)
        List<QueueLog> waitingQueue = queueRepository
                .findByClinicIdAndStatusOrderByPriorityDescCreatedAtAsc(
                        clinicId,
                        QueueLog.STATUS_IN_QUEUE);

        if (waitingQueue.isEmpty()) {
            throw new QueueException("No patients waiting in queue for clinic: " + clinicId);
        }

        QueueLog nextPatient = waitingQueue.get(0); // Position 1

        // Step 3: Mark next patient as CALLED (being served) and set appointment start time
        nextPatient.setStatus(QueueLog.STATUS_CALLED);
        nextPatient.setAppointmentStart(LocalDateTime.now()); // Record when patient is called in
        QueueLog called = queueRepository.save(nextPatient);

        // Step 4: Send "your turn" notification
        sendYourTurnNotification(called, 1); // Position 1

        // Step 5: Publish event for SSE updates
        eventPublisher.publishEvent(new QueueChangedEvent(clinicId));

        // Step 6: Check if new position 3 needs "three away" notification
        checkAndSendQueueNotifications(clinicId);

        log.info("Called next patient (queue {}, appointment {}) for clinic {}",
                called.getQueueId(), called.getAppointmentId(), clinicId);

        return called;
    }

    /**
     * Call specific patient by appointment ID - staff manually selects patient
     *
     * Changes target patient status from IN_QUEUE to CALLED and sends "your turn" notification.
     * Used when staff needs to call someone out of order.
     *
     * @param appointmentId ID of the appointment to call
     * @return The called patient's QueueLog entry
     * @throws QueueException if appointment not in queue
     */
    @Transactional
    public QueueLog callByAppointmentId(Long appointmentId) {
        // Step 1: Find patient's queue entry (must be IN_QUEUE)
        Optional<QueueLog> queueEntry = queueRepository.findByAppointmentIdAndStatus(
                appointmentId,
                QueueLog.STATUS_IN_QUEUE);

        if (queueEntry.isEmpty()) {
            throw new QueueException("Appointment " + appointmentId + " is not in queue");
        }

        QueueLog patient = queueEntry.get();

        // Step 2: Get current position (for logging/notification context)
        List<QueueLog> queue = queueRepository
                .findByClinicIdAndStatusOrderByPriorityDescCreatedAtAsc(
                        patient.getClinicId(),
                        QueueLog.STATUS_IN_QUEUE);
        int position = queue.indexOf(patient) + 1;

        // Step 3: Mark patient as CALLED (being served) and set appointment start time
        patient.setStatus(QueueLog.STATUS_CALLED);
        patient.setAppointmentStart(LocalDateTime.now()); // Record when patient is called in
        QueueLog called = queueRepository.save(patient);

        // Step 4: Send "your turn" notification
        sendYourTurnNotification(called, position);

        // Step 5: Publish event for SSE updates
        eventPublisher.publishEvent(new QueueChangedEvent(patient.getClinicId()));

        // Step 6: Check if queue positions changed (new position 3)
        checkAndSendQueueNotifications(patient.getClinicId());

        log.info("Called patient by appointment ID {} (queue {}, was position {})",
                appointmentId, called.getQueueId(), position);

        return called;
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
     * Excludes appointments that are currently IN_QUEUE (already re-queued)
     * Groups by appointmentId and returns only the latest missed entry per
     * appointment
     *
     * @param clinicId ID of the clinic
     * @return List of missed queue entries that can still be re-queued (one per
     *         appointment)
     */
    @Transactional(readOnly = true)
    public List<QueueLog> getMissedQueueEntries(Long clinicId) {
        // Get all MISSED entries for the clinic
        List<QueueLog> missedEntries = queueRepository.findByClinicIdAndStatus(clinicId, QueueLog.STATUS_MISSED);

        // Group by appointmentId and keep only the latest missed entry (by createdAt)
        // for each appointment
        List<QueueLog> latestMissedEntries = missedEntries.stream()
                .collect(Collectors.groupingBy(
                        QueueLog::getAppointmentId,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                entries -> entries.stream()
                                        .max((e1, e2) -> e1.getCreatedAt().compareTo(e2.getCreatedAt()))
                                        .orElse(null))))
                .values()
                .stream()
                .filter(entry -> entry != null)
                .collect(Collectors.toList());

        // Filter out appointments that have a DONE status (already completed)
        // Filter out appointments that are IN_QUEUE (already re-queued - they're in the
        // queue section)
        return latestMissedEntries.stream()
                .filter(entry -> {
                    // Check if this appointment has a DONE entry
                    boolean hasDoneEntry = queueRepository.existsByAppointmentIdAndStatus(
                            entry.getAppointmentId(),
                            QueueLog.STATUS_DONE);
                    // Check if this appointment is currently IN_QUEUE
                    boolean isInQueue = queueRepository.existsByAppointmentIdAndStatus(
                            entry.getAppointmentId(),
                            QueueLog.STATUS_IN_QUEUE);
                    // Only include if it doesn't have a DONE entry and is not currently IN_QUEUE
                    return !hasDoneEntry && !isInQueue;
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

        // Fetch patient details to get name
        String patientName = null;
        if (appointment.isPresent() && appointment.get().getPatientId() != null) {
            Optional<Patient> patient = patientRepository.findById(appointment.get().getPatientId());
            if (patient.isPresent()) {
                String fname = patient.get().getFname() != null ? patient.get().getFname() : "";
                String lname = patient.get().getLname() != null ? patient.get().getLname() : "";
                patientName = (fname + " " + lname).trim();
                if (patientName.isEmpty()) {
                    patientName = null;
                }
            }
        }

        return QueueEntryDTO.builder()
                .queueId(queueLog.getQueueId())
                .clinicId(queueLog.getClinicId())
                .appointmentId(queueLog.getAppointmentId())
                .patientId(appointment.map(Appointment::getPatientId).orElse(null))
                .patientName(patientName)
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

    /**
     * Formats first and last name with proper spacing
     */
    private String formatFullName(String fname, String lname) {
        String firstName = fname != null ? fname.trim() : "";
        String lastName = lname != null ? lname.trim() : "";

        if (firstName.isEmpty() && lastName.isEmpty()) {
            return "";
        } else if (firstName.isEmpty()) {
            return lastName;
        } else if (lastName.isEmpty()) {
            return firstName;
        } else {
            return firstName + " " + lastName;
        }
    }

    /**
     * Sends "your turn" notification when patient is at position 1 in queue
     * or when their queue status changes to DONE
     */
    private void sendYourTurnNotification(QueueLog queueEntry, int queuePosition) {
        try {
            Appointment appointment = appointmentRepository.findById(queueEntry.getAppointmentId()).orElse(null);
            if (appointment == null) {
                log.warn("Cannot send 'your turn' notification: appointment not found for queue entry {}",
                        queueEntry.getQueueId());
                return;
            }

            Patient patient = patientRepository.findById(appointment.getPatientId()).orElse(null);
            Clinic clinic = clinicRepository.findById(appointment.getClinicId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);

            if (patient == null || clinic == null || doctor == null || patient.getEmail() == null) {
                log.warn(
                        "Cannot send 'your turn' notification: missing patient, clinic, doctor, or email for queue entry {}",
                        queueEntry.getQueueId());
                return;
            }

            // Build notification request
            String patientName = formatFullName(patient.getFname(), patient.getLname());
            String doctorName = formatFullName(doctor.getFname(), doctor.getLname());
            String appointmentDateTime = appointment.getDateTime().format(DATE_TIME_FORMATTER);

            NotificationRequest request = new NotificationRequest();
            request.setToEmail(patient.getEmail());
            request.setPatientName(patientName);
            request.setClinicName(clinic.getName());
            request.setDoctorName(doctorName);
            request.setAppointmentDateTime(appointmentDateTime);
            request.setQueueNumber(queuePosition);
            request.setRoomNumber(null); // Room number - can be enhanced later if available
            request.setAppointmentNumber(appointment.getAppointmentId());

            log.info("Attempting to send 'your turn' email to {} for appointment {} (queue entry {})",
                    patient.getEmail(), appointment.getAppointmentId(), queueEntry.getQueueId());
            notificationService.sendYourTurnEmail(request);
            log.info("Successfully sent 'your turn' notification to {} for appointment {}", patient.getEmail(),
                    appointment.getAppointmentId());

        } catch (IOException e) {
            log.error("Failed to send 'your turn' notification for queue entry {}: {}",
                    queueEntry.getQueueId(), e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending 'your turn' notification for queue entry {}: {}",
                    queueEntry.getQueueId(), e.getMessage());
        }
    }

    /**
     * Checks queue and sends automatic notifications:
     * - "three away" notification to patients at position 3 (automatic)
     *
     * Note: "your turn" notifications are sent only via explicit staff calls
     * (callNextQueueNumber() or callByAppointmentId()), not automatically
     */
    private void checkAndSendQueueNotifications(Long clinicId) {
        try {
            List<QueueLog> queueEntries = getClinicQueue(clinicId);
            log.debug("Checking queue notifications for clinic {}, queue size: {}", clinicId, queueEntries.size());

            for (int i = 0; i < queueEntries.size(); i++) {
                int position = i + 1;
                QueueLog queueEntry = queueEntries.get(i);

                // Send "three away" notification to patient at position 3
                if (position == 3) {
                    log.debug("Patient at position 3 found (appointment {}), sending 'three away' notification",
                            queueEntry.getAppointmentId());
                    sendThreeAwayNotification(queueEntry, position);
                }
            }
        } catch (Exception e) {
            log.error("Error checking and sending queue notifications for clinic {}: {}",
                    clinicId, e.getMessage(), e);
        }
    }

    /**
     * Sends "three away" notification to a patient
     */
    private void sendThreeAwayNotification(QueueLog queueEntry, int position) {
        try {
            Appointment appointment = appointmentRepository.findById(queueEntry.getAppointmentId()).orElse(null);
            if (appointment == null) {
                log.warn("Cannot send 'three away' notification: appointment not found for queue entry {}",
                        queueEntry.getQueueId());
                return;
            }

            Patient patient = patientRepository.findById(appointment.getPatientId()).orElse(null);
            Clinic clinic = clinicRepository.findById(appointment.getClinicId()).orElse(null);
            Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);

            if (patient == null || clinic == null || doctor == null || patient.getEmail() == null) {
                log.warn(
                        "Cannot send 'three away' notification: missing patient, clinic, doctor, or email for queue entry {}",
                        queueEntry.getQueueId());
                return;
            }

            // Build notification request
            String patientName = formatFullName(patient.getFname(), patient.getLname());
            String doctorName = formatFullName(doctor.getFname(), doctor.getLname());
            String appointmentDateTime = appointment.getDateTime().format(DATE_TIME_FORMATTER);

            NotificationRequest request = new NotificationRequest();
            request.setToEmail(patient.getEmail());
            request.setPatientName(patientName);
            request.setClinicName(clinic.getName());
            request.setDoctorName(doctorName);
            request.setAppointmentDateTime(appointmentDateTime);
            request.setQueueNumber(position);
            request.setRoomNumber(null); // Room number not applicable
            request.setAppointmentNumber(appointment.getAppointmentId());

            notificationService.sendThreePatientsAwayEmail(request);
            log.info("Sent 'three away' notification to {} for appointment {}", patient.getEmail(),
                    appointment.getAppointmentId());

        } catch (IOException e) {
            log.error("Failed to send 'three away' notification for queue entry {}: {}",
                    queueEntry.getQueueId(), e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending 'three away' notification for queue entry {}: {}",
                    queueEntry.getQueueId(), e.getMessage());
        }
    }
}
