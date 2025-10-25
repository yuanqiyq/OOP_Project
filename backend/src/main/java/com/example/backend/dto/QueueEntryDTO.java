package com.example.backend.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: QueueEntryDTO
 *
 * Purpose: Data transfer object for queue entry display and API responses
 *
 * Key Features:
 * - Complete queue entry information for display
 * - Includes position and appointment details
 * - Used for GET /api/queue/clinic/{clinicId} endpoint
 * - Enriched with related entity data
 *
 * Version: 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueueEntryDTO {

    /**
     * Queue entry ID (primary key)
     */
    private Long queueId;

    /**
     * Clinic ID where patient is queuing
     */
    private Long clinicId;

    /**
     * Appointment ID for this queue entry
     */
    private Long appointmentId;

    /**
     * Patient ID (from appointment)
     */
    private Long patientId;

    /**
     * Doctor ID (from appointment)
     */
    private Long doctorId;

    /**
     * Appointment date and time
     */
    private LocalDateTime appointmentDateTime;

    /**
     * Current queue status
     * Values: IN_QUEUE, DONE, MISSED
     */
    private String status;

    /**
     * Priority level
     * 1 = Normal, 2 = Elderly, 3 = Emergency
     */
    private Integer priority;

    /**
     * Queue position (1-indexed)
     * Calculated dynamically
     */
    private Integer position;

    /**
     * When patient was added to queue
     */
    private LocalDateTime createdAt;

    /**
     * Total patients in queue for this clinic
     */
    private Integer totalInQueue;

    /**
     * Estimated wait time in minutes (can be calculated based on average service time)
     */
    private Integer estimatedWaitTimeMinutes;
}
