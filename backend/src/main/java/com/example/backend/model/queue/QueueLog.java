package com.example.backend.model.queue;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity: QueueLog
 *
 * Purpose: Manages clinic queue entries for patient appointments
 *
 * Key Features:
 * - Tracks patient position in clinic queue
 * - Priority-based queue ordering (Emergency > Elderly > Normal)
 * - Status tracking (IN_QUEUE, DONE, MISSED)
 * - Audit trail for queue operations
 *
 * Dependencies:
 * - References Clinic entity via clinic_id
 * - References Appointment entity via appointment_id
 *
 * Version: 1.0
 */
@Entity
@Table(name = "queue_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QueueLog {

    // Status constants
    public static final String STATUS_IN_QUEUE = "IN_QUEUE";
    public static final String STATUS_DONE = "DONE";
    public static final String STATUS_MISSED = "MISSED";

    // Priority constants
    public static final int PRIORITY_NORMAL = 1;
    public static final int PRIORITY_ELDERLY = 2;
    public static final int PRIORITY_EMERGENCY = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "queue_id")
    private Long queueId;

    @Column(name = "clinic_id", nullable = false)
    private Long clinicId;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "priority", nullable = false)
    private Integer priority;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * Constructor for creating new queue entries
     */
    public QueueLog(Long clinicId, Long appointmentId, Integer priority) {
        this.clinicId = clinicId;
        this.appointmentId = appointmentId;
        this.status = STATUS_IN_QUEUE;
        this.priority = priority;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = STATUS_IN_QUEUE;
        }
        if (priority == null) {
            priority = PRIORITY_NORMAL;
        }
    }

    /**
     * Validate if status is valid
     */
    public static boolean isValidStatus(String status) {
        return STATUS_IN_QUEUE.equals(status) ||
               STATUS_DONE.equals(status) ||
               STATUS_MISSED.equals(status);
    }

    /**
     * Validate if priority is valid
     */
    public static boolean isValidPriority(Integer priority) {
        return priority != null &&
               priority >= PRIORITY_NORMAL &&
               priority <= PRIORITY_EMERGENCY;
    }

    /**
     * Check if status transition is valid
     */
    public static boolean isValidTransition(String currentStatus, String newStatus) {
        // Can only transition from IN_QUEUE to DONE or MISSED
        if (STATUS_IN_QUEUE.equals(currentStatus)) {
            return STATUS_DONE.equals(newStatus) || STATUS_MISSED.equals(newStatus);
        }
        // No transitions allowed from DONE or MISSED
        return false;
    }
}
